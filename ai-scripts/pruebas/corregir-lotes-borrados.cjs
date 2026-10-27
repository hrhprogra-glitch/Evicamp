// Pone en 0 lotes BORRADOS (is_active=0) que todavía tienen saldo, dejando el registro en el historial.
// No cambia el stock del producto (esos lotes ya no se contaban). Todo en una transacción.
// Uso: node corregir-lotes-borrados.cjs <carpeta del proyecto> <base> <ids separados por coma> [--prueba]
//   --prueba: antes crea en esa base un lote borrado de ejemplo con saldo (solo para siuhub) y lo corrige
const path = require('path');
const [proyecto, base, idsTexto, modo] = process.argv.slice(2);
const { NodeSSH } = require(path.join(proyecto, 'node_modules', 'node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts', 'vps.cjs'));

if (!/^[a-z_]+$/.test(base)) throw new Error('base inválida');
if (modo === '--prueba' && base !== 'siuhub') throw new Error('--prueba solo en siuhub');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const psql = (sql) => ssh.execCommand(`runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${base}`, { stdin: sql });
  try {
    let ids = (idsTexto || '').split(',').filter(Boolean).map(Number);
    if (modo === '--prueba') {
      const id = Date.now();
      const r = await psql(`INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced)
        VALUES (${id}, 1, 4, 4, 0, 0, 'PRUEBA-LOTE-BORRADO-CON-SALDO', 0, 1);`);
      if (r.code !== 0) throw new Error(r.stderr);
      ids = [id];
      console.log('Lote de prueba creado (borrado, con saldo 4):', id);
    }
    if (!ids.length || ids.some((n) => !Number.isSafeInteger(n))) throw new Error('ids inválidos');
    const lista = ids.join(',');
    const consulta = `SELECT b.id, p.name, b.is_active, b.quantity, p.quantity AS stock_producto FROM batches b JOIN products p ON p.id = b.product_id WHERE b.id IN (${lista}) ORDER BY b.id;`;
    console.log('ANTES:\n' + (await psql(consulta)).stdout);
    const r = await psql(`BEGIN;
INSERT INTO inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                 operation_type, reason, notes, "user", created_at, is_synced)
SELECT b.id, b.product_id, p.name, -b.quantity, b.quantity, 0, 'AJUSTE', 'Corrección de lote borrado con saldo',
       'El cliente confirmó que se vendió. Saldo anterior del lote: ' || b.quantity || ' (efecto del reproceso del 01/04/2026)',
       'SiuMax (corrección)', now(), 1
FROM batches b JOIN products p ON p.id = b.product_id
WHERE b.id IN (${lista}) AND b.is_active = 0 AND b.quantity > 0;
UPDATE batches SET quantity = 0 WHERE id IN (${lista}) AND is_active = 0 AND quantity > 0;
COMMIT;`);
    if (r.code !== 0) throw new Error(r.stderr);
    console.log(r.stdout.trim());
    console.log('DESPUÉS:\n' + (await psql(consulta)).stdout);
    console.log('HISTORIAL:\n' + (await psql(`SELECT batch_id, operation_type, reason, change_amount, previous_quantity, new_quantity, "user" FROM inventory_movements WHERE batch_id IN (${lista}) AND reason = 'Corrección de lote borrado con saldo' ORDER BY batch_id;`)).stdout);
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
