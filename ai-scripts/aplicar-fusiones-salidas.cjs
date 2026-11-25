// 25/11/2026 — Nego: aplicar servidor/sql/fusiones-salidas.sql SOLO en la base siumax.
// Respaldar primero, aplicar con ON_ERROR_STOP y mostrar la verificación. Sin tocar otras bases.
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  try {
    const destino = `/root/backups/siumax-antes-fusiones-${fecha}.dump`;
    const resp = await ssh.execCommand(`sudo -u postgres pg_dump -Fc -d siumax > ${destino} && ls -lh ${destino}`);
    if (resp.code !== 0) throw new Error(`Fallo el respaldo: ${resp.stderr || resp.stdout}`);
    console.log(`RESPALDO: ${resp.stdout.trim()}`);

    const sql = fs.readFileSync(path.join(__dirname, '..', 'servidor', 'sql', 'fusiones-salidas.sql'), 'utf8').replace(/\r\n/g, '\n');
    const b64 = Buffer.from(sql, 'utf8').toString('base64');
    const r = await ssh.execCommand(`echo ${b64} | base64 -d | sudo -u postgres psql -tA -v ON_ERROR_STOP=1 -d siumax`, {
      onStdout: (c) => process.stdout.write(c),
      onStderr: (c) => process.stderr.write(c),
    });
    if (r.code !== 0) throw new Error('Falló la aplicación del SQL');
    console.log('SQL APLICADO EN siumax');
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
