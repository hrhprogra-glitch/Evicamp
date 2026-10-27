// Cuadra los lotes de productos cuyo stock (correcto) es MAYOR que la suma de sus lotes activos:
// crea un lote de ajuste por la diferencia (con el costo del último lote) y deja el movimiento en el historial.
// El stock del producto NO cambia. Todo en una transacción.
// Uso: node cuadrar-lotes.cjs <carpeta del proyecto> <base> <ids de producto separados por coma> [--prueba]
//   --prueba (solo siuhub): sube el stock del producto 1 en 2 para simular la diferencia, cuadra y DESHACE todo
const path = require('path');
const [proyecto, base, idsTexto, modo] = process.argv.slice(2);
const { NodeSSH } = require(path.join(proyecto, 'node_modules', 'node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts', 'vps.cjs'));

if (!/^[a-z_]+$/.test(base)) throw new Error('base inválida');
const prueba = modo === '--prueba';
if (prueba && base !== 'siuhub') throw new Error('--prueba solo en siuhub');
const ids = prueba ? [1] : (idsTexto || '').split(',').filter(Boolean).map(Number);
if (!ids.length || ids.some((n) => !Number.isSafeInteger(n))) throw new Error('ids inválidos');
const lista = ids.join(',');

const estado = `SELECT p.id, p.name, p.quantity AS stock,
  coalesce((SELECT sum(quantity) FROM batches b WHERE b.product_id = p.id AND b.is_active = 1), 0) AS suma_lotes
  FROM products p WHERE p.id IN (${lista}) ORDER BY p.id;`;

const sql = `\\set ON_ERROR_STOP 1
BEGIN;
${prueba ? 'UPDATE products SET quantity = quantity + 2 WHERE id = 1;' : ''}
\\echo ANTES
${estado}
CREATE TEMP TABLE dif ON COMMIT DROP AS
SELECT p.id AS product_id, p.name, p.quantity - coalesce((SELECT sum(quantity) FROM batches b WHERE b.product_id = p.id AND b.is_active = 1), 0) AS falta,
       coalesce((SELECT b.cost_unit FROM batches b WHERE b.product_id = p.id AND b.is_active = 1 ORDER BY b.created_at DESC, b.id DESC LIMIT 1), 0) AS costo,
       coalesce((SELECT sum(quantity) FROM batches b WHERE b.product_id = p.id AND b.is_active = 1), 0) AS suma_antes,
       (extract(epoch FROM clock_timestamp()) * 1000)::bigint + row_number() OVER (ORDER BY p.id) AS lote_id
FROM products p WHERE p.id IN (${lista});
INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced, created_at)
SELECT lote_id, product_id, falta, falta, round(falta * costo, 2), costo, 'AJUSTE-CUADRE-STOCK', 1, 1, now() FROM dif WHERE falta > 0;
INSERT INTO inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                 operation_type, reason, notes, "user", created_at, is_synced)
SELECT lote_id, product_id, name, falta, suma_antes, suma_antes + falta, 'AJUSTE', 'Cuadre de lotes con el stock',
       'El stock del producto (corregido por el cliente) era mayor que la suma de sus lotes: se agrega un lote de ajuste. El stock no cambia.',
       'SiuMax (corrección)', now(), 1
FROM dif WHERE falta > 0;
\\echo DESPUES
${estado}
${prueba ? 'ROLLBACK;' : 'COMMIT;'}
`;

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const r = await ssh.execCommand(`runuser -u postgres -- psql -d ${base}`, { stdin: sql });
    console.log(r.stdout);
    if (r.code !== 0) throw new Error(r.stderr);
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
