// Fase A: dejar solo admin@siumax.com en la base de pruebas (Nego).
// Respaldar, borrar sesiones y empleados billy/harry, y verificar. Sin tocar claves.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

async function psql(ssh, sql) {
  const b64 = Buffer.from(sql, 'utf8').toString('base64');
  const res = await ssh.execCommand(`echo ${b64} | base64 -d | sudo -u postgres psql -tA -v ON_ERROR_STOP=1 -d siumax`);
  if (res.code !== 0) throw new Error(`Fallo SQL: ${res.stderr || res.stdout}`);
  return res.stdout;
}

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  try {
    const destino = `/root/backups/siumax-antes-quitar-admins-${fecha}.dump`;
    const resp = await ssh.execCommand(`sudo -u postgres pg_dump -Fc -d siumax > ${destino} && ls -lh ${destino}`);
    if (resp.code !== 0) throw new Error(`Fallo el respaldo: ${resp.stderr || resp.stdout}`);
    console.log(`RESPALDO: ${resp.stdout.trim()}`);

    const sql = `
BEGIN;
SET LOCAL lock_timeout = '5s';
DELETE FROM sesiones WHERE empleado_id IN (SELECT id FROM empleados WHERE email IN ('billy@siumax.com', 'harry@siumax.com'));
DELETE FROM empleados WHERE email IN ('billy@siumax.com', 'harry@siumax.com');
COMMIT;
`;
    console.log(`Limpieza: ${(await psql(ssh, sql)).split('\n').map((s) => s.trim()).filter(Boolean).slice(-3).join(' | ')}`);
    const quedan = await psql(ssh, "SELECT email || ' | ' || rol FROM empleados ORDER BY email;");
    console.log(`Empleados que quedan:\n${quedan.trim()}`);
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
