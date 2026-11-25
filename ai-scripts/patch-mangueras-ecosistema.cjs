// 24/11/2026 — Dejar las mangueras bien ingresadas SOLO en la base de ecosistema.
// Pedido del dueño: unidad base Metro (M / SUNAT MTR), sin «1 UND = 500 M», y el rollo
// como presentación en Opciones avanzadas. No se inventan precios (S/ 0.00 confirmado)
// y NO se tocan cantidades, stock ni historial.
//   node ai-scripts/patch-mangueras-ecosistema.cjs backup   → solo respalda
//   node ai-scripts/patch-mangueras-ecosistema.cjs apply    → respalda y aplica el PATCH
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const modo = process.argv[2] || 'backup';
if (!['backup', 'apply'].includes(modo)) {
  console.error('Uso: node ai-scripts/patch-mangueras-ecosistema.cjs backup|apply');
  process.exit(1);
}

// Según el NOMBRE del producto, que es lo que confirmó el dueño (no ref_qty=500 genérico).
const ROLLOS = [
  { id: 100282, factor: 100 }, // MANGUERA CIEGA DE 20MM (100MT)
  { id: 100298, factor: 100 }, // HDPE 32MM ... ROLLO 100MT
  { id: 100313, factor: 400 }, // CON GOTERO 35MM ... 400MT
  { id: 100315, factor: 400 }, // CON GOTERO 25MM ... 400 M
  { id: 100322, factor: 500 }, // MANGUERA DE 16 MM (500MT)
  { id: 100432, factor: 100 }, // PEBD 25MM ... ROLLO 100MT
];
const ids = ROLLOS.map((r) => r.id).join(',');
const destino = path.join(__dirname, '..', '..', `respaldo-productos-mangueras-ecosistema-2026-11-24${modo === 'apply' ? '-antes' : ''}.json`);
const destinoCompleto = path.join(__dirname, '..', '..', 'respaldo-productos-completo-ecosistema-2026-11-24.ndjson');
const psql = 'runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ecosistema';

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    // 1) Respaldo legible de las 6 filas y de TODA la tabla products.
    const qRows = `select jsonb_pretty(jsonb_agg(row_to_json(p) order by p.id)) from products p where p.id in (${ids});`;
    const rRows = await ssh.execCommand(psql, { stdin: qRows });
    if (rRows.code !== 0) throw new Error('Respaldo de filas: ' + (rRows.stderr || '').slice(0, 400));
    fs.writeFileSync(destino, rRows.stdout, 'utf8');
    console.log(`Respaldo de las 6 filas: ${destino}`);

    const qAll = `select row_to_json(p) from products p order by p.id;`;
    const rAll = await ssh.execCommand(psql, { stdin: qAll });
    if (rAll.code !== 0) throw new Error('Respaldo completo: ' + (rAll.stderr || '').slice(0, 400));
    fs.writeFileSync(destinoCompleto, rAll.stdout, 'utf8');
    console.log(`Respaldo completo de products: ${destinoCompleto} (${rAll.stdout.split('\n').length - 1} filas)`);

    if (modo === 'backup') {
      console.log('MODO BACKUP: no se escribió en la base.');
      return;
    }

    // 2) PATCH en una sola transacción, con lock_timeout para no bloquear al dueño.
    const updates = ROLLOS.map(({ id, factor }) => `
      UPDATE products
         SET unit = 'M',
             sunat_unit_code = 'MTR',
             ref_unit = NULL,
             ref_qty = NULL,
             unit_weight = NULL,
             presentaciones = jsonb_build_array(jsonb_build_object('unidad', 'ROLLO', 'factor', ${factor}, 'precio', 0))
       WHERE id = ${id};`).join('\n');

    const sql = `
      SET lock_timeout = '5s';
      BEGIN;
      ${updates}
      COMMIT;
      SELECT id, left(name,45) AS producto, unit, sunat_unit_code, quantity, price,
             coalesce(presentaciones::text,'-') AS presentaciones
        FROM products WHERE id IN (${ids}) ORDER BY id;
    `;
    const r = await ssh.execCommand(psql, { stdin: sql });
    console.log((r.stdout || '').trim());
    if (r.code !== 0) throw new Error('PATCH falló: ' + (r.stderr || '').slice(0, 500));
    console.log('PATCH aplicado solo en ecosistema. Cantidades, stock e historial intactos.');
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
