// FASE 1: respaldar y limpiar las bases siumax (Nego) y ecosistema (sitio oficial).
// NO carga datos reales. Conserva: empresa_config, facturacion_config, cpe_correlativos,
// los empleados con rol Administrador y sus sesiones. Todo lo demás se trunca.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const BASES = ['siumax', 'ecosistema'];
const CONSERVAR = new Set([
  'empleados',
  'empresa_config',
  'facturacion_config',
  'cpe_correlativos',
  'sesiones',
]);

async function psql(ssh, db, sql) {
  const b64 = Buffer.from(sql, 'utf8').toString('base64');
  const comando = `echo ${b64} | base64 -d | sudo -u postgres psql -tA -v ON_ERROR_STOP=1 -d ${db}`;
  const res = await ssh.execCommand(comando);
  if (res.code !== 0) throw new Error(`Fallo SQL en ${db}: ${res.stderr || res.stdout}`);
  return res.stdout;
}

async function tablas(ssh, db) {
  const out = await psql(
    ssh,
    db,
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
  );
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

async function conteos(ssh, db, tabs) {
  const partes = tabs.map((t) => `SELECT '${t}' AS tabla, count(*)::text AS n FROM "${t}"`);
  const out = await psql(ssh, db, `${partes.join(' UNION ALL ')} ORDER BY tabla;`);
  return out.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => s.split('|'));
}

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  try {
    for (const db of BASES) {
      console.log(`\n===== ${db} =====`);

      const destino = `/root/backups/${db}-antes-limpieza-${fecha}.dump`;
      const resp = await ssh.execCommand(
        `sudo -u postgres pg_dump -Fc -d ${db} > ${destino} && ls -lh ${destino}`
      );
      if (resp.code !== 0) throw new Error(`Fallo el respaldo de ${db}: ${resp.stderr || resp.stdout}`);
      console.log(`RESPALDO: ${resp.stdout.trim()}`);

      const tabs = await tablas(ssh, db);
      const antes = await conteos(ssh, db, tabs);
      const aBorrar = tabs.filter((t) => !CONSERVAR.has(t));
      console.log(`Tablas a limpiar: ${aBorrar.length} de ${tabs.length}`);

      const sql = `
BEGIN;
SET LOCAL lock_timeout = '5s';
DELETE FROM sesiones WHERE empleado_id IN (SELECT id FROM empleados WHERE rol IS DISTINCT FROM 'Administrador');
TRUNCATE TABLE ${aBorrar.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY;
DELETE FROM empleados WHERE rol IS DISTINCT FROM 'Administrador';
COMMIT;
`;
      const salida = await psql(ssh, db, sql);
      console.log(`Limpieza: ${salida.split('\n').map((s) => s.trim()).filter(Boolean).slice(-3).join(' | ')}`);

      const despues = await conteos(ssh, db, tabs);
      const mapaAntes = Object.fromEntries(antes);
      const cambiadas = despues.filter(([t, n]) => mapaAntes[t] !== n);
      console.log(`Tablas con cambios: ${cambiadas.length}`);
      cambiadas.forEach(([t, n]) => console.log(`  ${t}: ${mapaAntes[t]} -> ${n}`));
      console.log(`Sin cambios: ${despues.filter(([t, n]) => mapaAntes[t] === n).map(([t]) => t).join(', ')}`);

      const admins = await psql(
        ssh,
        db,
        "SELECT email || ' (' || rol || ')' FROM empleados ORDER BY email;"
      );
      console.log(`Empleados que quedaron:\n${admins.trim()}`);
      const cfg = await psql(ssh, db, 'SELECT count(*) FROM empresa_config;');
      console.log(`empresa_config: ${cfg.trim()} fila(s)`);
    }
    console.log('\nFASE 1 TERMINADA. No se cargaron datos reales.');
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
