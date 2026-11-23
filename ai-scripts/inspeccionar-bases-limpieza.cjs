// Inspección SOLO DE LECTURA de las bases siumax (Nego) y ecosistema (sitio oficial)
// antes de la limpieza de la Fase 1. No modifica nada ni muestra claves.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const BASES = ['siumax', 'ecosistema'];

async function consultar(ssh, db, sql) {
  const comando = `sudo -u postgres psql -d ${db} -tAc ${JSON.stringify(sql)}`;
  const res = await ssh.execCommand(comando);
  if (res.code !== 0) throw new Error(`Fallo en ${db}: ${res.stderr || res.stdout}`);
  return res.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    for (const db of BASES) {
      console.log(`\n===== BASE ${db} =====`);
      const tablas = await consultar(
        ssh,
        db,
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;"
      );
      console.log(`Tablas (${tablas.length}): ${tablas.join(', ')}`);

      const columnasEmpleados = await consultar(
        ssh,
        db,
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='empleados' ORDER BY ordinal_position;"
      );
      console.log(`Columnas de empleados: ${columnasEmpleados.join(', ')}`);

      const seguras = columnasEmpleados.filter(
        (c) => !/password|clave|hash|token/i.test(c)
      );
      const filas = await consultar(
        ssh,
        db,
        `SELECT ${seguras.map((c) => `"${c}"`).join(', ')} FROM empleados ORDER BY 1;`
      );
      console.log(`Empleados (${filas.length}):`);
      filas.forEach((f) => console.log(`  ${f}`));

      const conteos = [];
      for (const t of tablas) {
        const n = await consultar(ssh, db, `SELECT count(*) FROM "${t}";`);
        conteos.push(`${t}=${n[0] || '0'}`);
      }
      console.log(`Filas por tabla: ${conteos.join(' | ')}`);
    }
  } finally {
    ssh.dispose();
  }
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
