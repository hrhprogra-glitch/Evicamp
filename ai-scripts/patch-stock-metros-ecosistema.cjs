// 24/11/2026 — Pasar a METROS el stock y todo el historial de las 6 mangueras, SOLO en ecosistema.
// Pedido del dueño: «3» significaba 3 rollos; ahora debe significar 327 M (según el nombre).
// Factores ya decididos por el NOMBRE, no inventados. Los costos unitarios se dividen para no
// cambiar ningún total monetario. Una sola transacción con lock_timeout y verificación incluida.
//   node ai-scripts/patch-stock-metros-ecosistema.cjs backup → solo respalda
//   node ai-scripts/patch-stock-metros-ecosistema.cjs apply  → respalda y convierte
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const modo = process.argv[2] || 'backup';
if (!['backup', 'apply'].includes(modo)) {
  console.error('Uso: node ai-scripts/patch-stock-metros-ecosistema.cjs backup|apply');
  process.exit(1);
}

// id | factor del rollo según el nombre | stock actual en rollos | stock objetivo en metros
const ROLLOS = [
  { id: 100282, factor: 100, antes: 3.27,    despues: 327,  nombre: 'MANGUERA CIEGA DE 20MM (100MT)' },
  { id: 100298, factor: 100, antes: 0.5,     despues: 50,   nombre: 'HDPE 32MM ... ROLLO 100MT' },
  { id: 100313, factor: 400, antes: 2.7025,  despues: 1081, nombre: 'CON GOTERO 35MM ... 400MT' },
  { id: 100315, factor: 400, antes: 2.4625,  despues: 985,  nombre: 'CON GOTERO 25MM ... 400 M' },
  { id: 100322, factor: 500, antes: 2.86,    despues: 1430, nombre: 'MANGUERA DE 16 MM (500MT)' },
  { id: 100432, factor: 100, antes: 3.0,     despues: 300,  nombre: 'PEBD 25MM ... ROLLO 100MT' },
];
const ids = ROLLOS.map((r) => r.id).join(',');
const valuesFactor = ROLLOS.map((r) => `(${r.id},${r.factor})`).join(',');
const valuesStock = ROLLOS.map((r) => `(${r.id},${r.factor},${r.despues}.000000)`).join(',');
const prefijo = path.join(__dirname, '..', '..', 'respaldo-conversion-metros-ecosistema-2026-11-24');
const psql = 'runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -F " | " -d ecosistema';

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    // 1) Respaldo de TODAS las tablas que guardan cantidades de estos productos.
    const tablas = ['products', 'batches', 'salida_items', 'salida_devoluciones', 'inventory_movements'];
    for (const tabla of tablas) {
      const columna = tabla === 'products' ? 'id' : 'product_id';
      const q = `select row_to_json(t)::text from ${tabla} t where t.${columna} in (${ids}) order by t.id;`;
      const r = await ssh.execCommand(psql, { stdin: q });
      if (r.code !== 0) throw new Error(`Respaldo ${tabla}: ${(r.stderr || '').slice(0, 400)}`);
      const archivo = `${prefijo}-${tabla}.ndjson`;
      fs.writeFileSync(archivo, r.stdout, 'utf8');
      console.log(`Respaldo ${tabla}: ${archivo} (${r.stdout.split('\n').filter(Boolean).length} filas)`);
    }

    // 2) Totales monetarios ANTES, para comprobar que no cambian.
    const qAntes = `
      select 'total_items', coalesce(sum(cantidad * costo_unitario),0) from salida_items where product_id in (${ids});
      select 'total_batches', coalesce(sum(quantity * cost_unit),0) from batches where product_id in (${ids});
      select 'cost_total_batches', coalesce(sum(cost_total),0) from batches where product_id in (${ids});
    `;
    const rAntes = await ssh.execCommand(psql, { stdin: qAntes });
    if (rAntes.code !== 0) throw new Error('Totales antes: ' + (rAntes.stderr || '').slice(0, 400));
    fs.writeFileSync(`${prefijo}-totales-antes.txt`, rAntes.stdout, 'utf8');
    console.log('Totales antes:\n' + rAntes.stdout.trim());

    if (modo === 'backup') {
      console.log('MODO BACKUP: no se escribió en la base.');
      return;
    }

    // 3) Precheck: nombre correcto y estado esperado (rollos → metros; si ya está convertido, no repetir).
    const qEstado = `select id, name, quantity from products where id in (${ids}) order by id;`;
    const rEstado = await ssh.execCommand(psql, { stdin: qEstado });
    if (rEstado.code !== 0) throw new Error('Precheck: ' + (rEstado.stderr || '').slice(0, 400));
    const filas = rEstado.stdout.trim().split('\n').filter(Boolean).map((l) => {
      const [id, name, qty] = l.split(' | ');
      return { id: Number(id), name, qty: Number(qty) };
    });
    if (filas.length !== ROLLOS.length) throw new Error(`Precheck: se encontraron ${filas.length} productos, se esperaban ${ROLLOS.length}`);

    let convertir = false;
    for (const rollo of ROLLOS) {
      const fila = filas.find((f) => f.id === rollo.id);
      if (!fila) throw new Error(`Precheck: falta el producto ${rollo.id}`);
      const patron = new RegExp(String(rollo.factor) + '\\s*M', 'i');
      if (!patron.test(fila.name)) throw new Error(`Precheck: el nombre de ${rollo.id} no dice ${rollo.factor} M: ${fila.name}`);
      const esAntes = Math.abs(fila.qty - rollo.antes) < 0.000001;
      const esDespues = Math.abs(fila.qty - rollo.despues) < 0.000001;
      if (!esAntes && !esDespues) throw new Error(`Precheck: stock inesperado en ${rollo.id} (${fila.qty}); ni ${rollo.antes} ni ${rollo.despues}`);
      if (esAntes) convertir = true;
      if (esAntes && ROLLOS.some((o) => o.id !== rollo.id && Math.abs((filas.find((f) => f.id === o.id)?.qty ?? -1) - o.despues) < 0.000001)) {
        throw new Error('Precheck: hay productos ya convertidos y otros no; estado mixto. Revisa antes de seguir.');
      }
    }
    if (!convertir) {
      console.log('Los 6 productos YA están en metros. No se escribió nada.');
      return;
    }

    // 4) PATCH en UNA transacción. La verificación va dentro: si falla, hace ROLLBACK.
    const qEsperado = ROLLOS.map((r) => `when ${r.id} then ${r.despues}.000000`).join(' ');
    const sql = `
      SET lock_timeout = '5s';
      BEGIN;

      WITH v(id, factor, qty) AS (VALUES ${valuesStock})
      UPDATE products p
         SET quantity = v.qty,
             min_stock = p.min_stock * v.factor,
             cost_price = p.cost_price / v.factor
        FROM v WHERE p.id = v.id;

      WITH v(id, factor) AS (VALUES ${valuesFactor})
      UPDATE batches b
         SET quantity = b.quantity * v.factor,
             initial_quantity = b.initial_quantity * v.factor,
             cost_unit = b.cost_unit / v.factor
        FROM v WHERE b.product_id = v.id;

      WITH v(id, factor) AS (VALUES ${valuesFactor})
      UPDATE salida_items i
         SET cantidad = i.cantidad * v.factor,
             cantidad_devuelta = i.cantidad_devuelta * v.factor,
             costo_unitario = i.costo_unitario / v.factor,
             unidad = 'M'
        FROM v WHERE i.product_id = v.id;

      WITH v(id, factor) AS (VALUES ${valuesFactor})
      UPDATE salida_devoluciones d
         SET cantidad = d.cantidad * v.factor
        FROM v WHERE d.product_id = v.id;

      WITH v(id, factor) AS (VALUES ${valuesFactor})
      UPDATE inventory_movements m
         SET change_amount = m.change_amount * v.factor,
             previous_quantity = m.previous_quantity * v.factor,
             new_quantity = m.new_quantity * v.factor
        FROM v WHERE m.product_id = v.id;

      DO $$
      DECLARE mensaje text := '';
      BEGIN
        IF EXISTS (
          SELECT 1 FROM products WHERE id IN (${ids})
           AND (abs(quantity - CASE id ${qEsperado} END) > 0.000001
                OR unit <> 'M' OR sunat_unit_code <> 'MTR')
        ) THEN mensaje := mensaje || 'products; '; END IF;

        IF EXISTS (SELECT 1 FROM salida_items WHERE product_id IN (${ids}) AND unidad <> 'M')
          THEN mensaje := mensaje || 'salida_items.unidad; '; END IF;

        IF (SELECT coalesce(sum(cantidad * costo_unitario),0) FROM salida_items WHERE product_id IN (${ids})) <> 0
          THEN mensaje := mensaje || 'total salida_items cambió; '; END IF;
        IF (SELECT coalesce(sum(quantity * cost_unit),0) FROM batches WHERE product_id IN (${ids})) <> 0
          THEN mensaje := mensaje || 'total batches cambió; '; END IF;
        IF (SELECT coalesce(sum(cost_total),0) FROM batches WHERE product_id IN (${ids})) <> 0
          THEN mensaje := mensaje || 'cost_total batches cambió; '; END IF;

        IF mensaje <> '' THEN RAISE EXCEPTION 'Verificación falló: %', mensaje; END IF;
      END $$;

      COMMIT;

      SELECT 'STOCK_METROS', id, left(name,40), quantity, unit, sunat_unit_code
        FROM products WHERE id IN (${ids}) ORDER BY id;
      SELECT 'TOTALES', 'items', coalesce(sum(cantidad*costo_unitario),0) FROM salida_items WHERE product_id IN (${ids});
      SELECT 'TOTALES', 'batches', coalesce(sum(quantity*cost_unit),0) FROM batches WHERE product_id IN (${ids});
      SELECT 'UNIDADES', coalesce(unidad,'NULL'), count(*) FROM salida_items WHERE product_id IN (${ids}) GROUP BY 2 ORDER BY 2;
    `;
    const r = await ssh.execCommand(psql, { stdin: sql });
    console.log((r.stdout || '').trim());
    if (r.code !== 0) throw new Error('PATCH falló (se hizo ROLLBACK): ' + (r.stderr || '').slice(0, 800));
    console.log('CONVERSIÓN A METROS APLICADA solo en ecosistema. Totales monetarios intactos.');
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('ERROR: ' + e.message); process.exit(1); });
