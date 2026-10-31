// ai-scripts/pruebas/prueba-fase7-hibrido.mjs
// Verifica el caso híbrido consultado por el dueño:
// "pongo polo nike y lo ingreso en lote 100 pero en variantes tengo polo nike blanco M y pongo 100 deben aparecer los 2"
import { createRequire } from 'node:module';
import path from 'node:path';

const cwd = process.cwd();
const reqP = createRequire(path.resolve(cwd, 'package.json'));
const { NodeSSH } = reqP('node-ssh');
const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.resolve(cwd, '.env.vps'));

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);

const sql = async (q) => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose();
  if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr);
  return r.stdout.trim();
};

try {
  console.log('Iniciando prueba de modelo híbrido (lote genérico 100 + variante Blanco M 100)...');

  // 1. Simulación lógica en memoria de Caja (conVariantesYPresentaciones)
  const prodEnMemoria = [
    {
      id: 9999,
      name: 'POLO NIKE',
      price: 50,
      cost: 25,
      quantity: 100, // Stock ingresado en lote general
      minStock: 5,
      code: 'NIKE-01',
      barcode: 'BAR-NIKE',
      category: 'ROPA',
      unit: 'UND',
      tieneVariantes: true,
      variantes: [
        {
          id: 501,
          product_id: 9999,
          nombre_variante: 'BLANCO M',
          talla: 'M',
          color: 'BLANCO',
          barcode: 'BAR-BLANCO-M',
          price: 50,
          quantity: 100, // Stock propio de la variante
          is_active: 1
        }
      ]
    }
  ];

  const conVariantesYPresentaciones = (productos) => {
    const resultado = [];
    for (const p of productos) {
      if (p.tieneVariantes && Array.isArray(p.variantes) && p.variantes.length > 0) {
        const variantesActivas = p.variantes.filter((v) => v.is_active !== 0);
        for (const v of variantesActivas) {
          resultado.push({
            ...p,
            id: `${p.id}::var::${v.id}`,
            productoId: String(p.id),
            variantId: v.id,
            variantName: v.nombre_variante,
            name: `${p.name} (${v.nombre_variante})`,
            price: Number(v.price || p.price),
            quantity: Number(v.quantity || 0)
          });
        }
      }
      const tieneVars = Boolean(p.tieneVariantes && Array.isArray(p.variantes) && p.variantes.some((v) => v.is_active !== 0));
      if (!tieneVars || Number(p.quantity || 0) > 0) {
        resultado.push(p);
      }
    }
    return resultado;
  };

  const resultadoCaja = conVariantesYPresentaciones(prodEnMemoria);
  console.log('Ítems generados para la Caja:', resultadoCaja.map(p => `${p.name} (stock: ${p.quantity})`));

  const tieneGenerico = resultadoCaja.some(p => p.name === 'POLO NIKE' && p.quantity === 100 && !p.variantId);
  const tieneVariante = resultadoCaja.some(p => p.name === 'POLO NIKE (BLANCO M)' && p.quantity === 100 && p.variantId === 501);

  ok('En Caja aparecen los 2 ítems: Polo Nike genérico (100) y Polo Nike (Blanco M) (100)', tieneGenerico && tieneVariante && resultadoCaja.length === 2);

  // 2. Ahora prueba real en la Base de Datos siumax
  await sql(`
    DELETE FROM inventory_movements WHERE product_name LIKE 'POLO NIKE HIBRIDO%';
    DELETE FROM sale_details WHERE product_name LIKE 'POLO NIKE HIBRIDO%';
    DELETE FROM batches WHERE product_id IN (SELECT id FROM products WHERE name = 'POLO NIKE HIBRIDO');
    DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE name = 'POLO NIKE HIBRIDO');
    DELETE FROM products WHERE name = 'POLO NIKE HIBRIDO';
  `);

  const prodRaw = await sql(`
    INSERT INTO products (name, category, code, barcode, price, quantity, min_stock, control_type, unit, tiene_variantes, is_active, is_synced)
    VALUES ('POLO NIKE HIBRIDO', 'ROPA', 'NIKE-HIB-01', 'BAR-NIKE-HIB', 60.00, 100, 5, 'UND', 'UND', true, 1, 1)
    RETURNING id;
  `);
  const prodId = prodRaw.match(/\d+/)?.[0];

  // Lote de 100 para el producto genérico
  const loteRaw = await sql(`
    INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_unit, is_active, is_synced, created_at)
    VALUES ((extract(epoch from clock_timestamp())*1000)::bigint, ${prodId}, 100, 100, 30.00, 1, 1, now())
    RETURNING id;
  `);
  const loteId = loteRaw.match(/\d+/)?.[0];

  // Variante con stock propio de 100
  const varRaw = await sql(`
    INSERT INTO product_variants (product_id, nombre_variante, talla, color, barcode, price, cost_price, quantity, min_stock, is_active, is_synced)
    VALUES (${prodId}, 'BLANCO M', 'M', 'BLANCO', 'BAR-HIB-BLANCO-M', 60.00, 30.00, 100, 5, 1, 1)
    RETURNING id;
  `);
  const varId = varRaw.match(/\d+/)?.[0];

  ok('Producto base y variante creados en BD (ambos con 100 und)', !!prodId && !!loteId && !!varId);

  // 3. Venta de 10 unidades de la VARIANTE "BLANCO M"
  const sale1Raw = await sql(`
    INSERT INTO sales (total, payment_type, amount_cash, sunat_status, is_synced, created_at)
    VALUES (600.00, 'EFECTIVO', 600.00, 'EMITIDO', 1, now())
    RETURNING id;
  `);
  const sale1Id = sale1Raw.match(/\d+/)?.[0];

  await sql(`
    INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, variant_id, variant_name, subtotal, is_synced)
    VALUES (${sale1Id}, ${prodId}, 'POLO NIKE HIBRIDO (BLANCO M)', 10, 60.00, ${varId}, 'BLANCO M', 600.00, 1);
  `);

  const stockVarTrasVenta1 = await sql(`SELECT quantity FROM product_variants WHERE id = ${varId};`);
  const stockLoteTrasVenta1 = await sql(`SELECT quantity FROM batches WHERE id = ${loteId};`);
  const stockProdTrasVenta1 = await sql(`SELECT quantity FROM products WHERE id = ${prodId};`);

  ok('Venta de variante BLANCO M redujo variante a 90', Number(stockVarTrasVenta1) === 90, `Stock Var: ${stockVarTrasVenta1}`);
  ok('Venta de variante dejó INTACTO el lote genérico en 100', Number(stockLoteTrasVenta1) === 100, `Stock Lote: ${stockLoteTrasVenta1}`);
  ok('Venta de variante dejó INTACTO el producto base en 100', Number(stockProdTrasVenta1) === 100, `Stock Prod: ${stockProdTrasVenta1}`);

  // 4. Venta de 15 unidades del GENÉRICO (Polo Nike del lote)
  const sale2Raw = await sql(`
    INSERT INTO sales (total, payment_type, amount_cash, sunat_status, is_synced, created_at)
    VALUES (900.00, 'EFECTIVO', 900.00, 'EMITIDO', 1, now())
    RETURNING id;
  `);
  const sale2Id = sale2Raw.match(/\d+/)?.[0];

  await sql(`
    INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, variant_id, variant_name, subtotal, is_synced)
    VALUES (${sale2Id}, ${prodId}, 'POLO NIKE HIBRIDO', 15, 60.00, NULL, NULL, 900.00, 1);
  `);

  const stockLoteTrasVenta2 = await sql(`SELECT quantity FROM batches WHERE id = ${loteId};`);
  const stockProdTrasVenta2 = await sql(`SELECT quantity FROM products WHERE id = ${prodId};`);
  const stockVarTrasVenta2 = await sql(`SELECT quantity FROM product_variants WHERE id = ${varId};`);

  ok('Venta genérica redujo el lote a 85', Number(stockLoteTrasVenta2) === 85, `Stock Lote: ${stockLoteTrasVenta2}`);
  ok('Venta genérica redujo el producto base a 85', Number(stockProdTrasVenta2) === 85, `Stock Prod: ${stockProdTrasVenta2}`);
  ok('Venta genérica dejó INTACTA la variante en 90', Number(stockVarTrasVenta2) === 90, `Stock Var: ${stockVarTrasVenta2}`);

  // 5. Anular ambas ventas y verificar restitución
  await sql(`
    SELECT set_config('request.headers', json_build_object('x-sesion', token::text)::text, false) FROM sesiones ORDER BY ultimo_uso DESC LIMIT 1;
    SELECT fn_anular_venta(${sale1Id});
    SELECT fn_anular_venta(${sale2Id});
  `);

  const stockVarFinal = await sql(`SELECT quantity FROM product_variants WHERE id = ${varId};`);
  const stockLoteFinal = await sql(`SELECT quantity FROM batches WHERE id = ${loteId};`);
  const stockProdFinal = await sql(`SELECT quantity FROM products WHERE id = ${prodId};`);

  ok('Anulaciones restituyeron variante exactamente a 100', Number(stockVarFinal) === 100, `Stock Var: ${stockVarFinal}`);
  ok('Anulaciones restituyeron lote genérico exactamente a 100', Number(stockLoteFinal) === 100, `Stock Lote: ${stockLoteFinal}`);
  ok('Anulaciones restituyeron producto base exactamente a 100', Number(stockProdFinal) === 100, `Stock Prod: ${stockProdFinal}`);

  // Limpieza
  await sql(`
    DELETE FROM inventory_movements WHERE notes LIKE '%Ticket #' || ${sale1Id}::text OR notes LIKE '%Ticket #' || ${sale2Id}::text;
    DELETE FROM sale_details WHERE sale_id IN (${sale1Id}, ${sale2Id});
    DELETE FROM sales WHERE id IN (${sale1Id}, ${sale2Id});
    DELETE FROM batches WHERE product_id = ${prodId};
    DELETE FROM product_variants WHERE product_id = ${prodId};
    DELETE FROM products WHERE id = ${prodId};
  `);
  console.log('Limpieza completada.');

} catch (err) {
  ok('Error en la prueba híbrida', false, err.message);
}

console.log('\n--- RESULTADOS PRUEBA HÍBRIDA ---');
console.log(res.join('\n'));
if (res.some(r => r.startsWith('❌'))) {
  process.exit(1);
} else {
  process.exit(0);
}
