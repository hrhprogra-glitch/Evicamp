// SOLO LECTURA: ver productos con "tubo" y cómo tienen guardada la presentación.
// lock_timeout=3s. No escribe nada.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

async function consultar(ssh, db, sql) {
  const sqlUnaLinea = 'SET lock_timeout = \'3s\'; ' + sql.replace(/\s+/g, ' ');
  const res = await ssh.execCommand(`sudo -u postgres psql -d ${db} -tAc ${JSON.stringify(sqlUnaLinea)}`);
  if (res.code !== 0) throw new Error(`Fallo en ${db}: ${res.stderr || res.stdout}`);
  return res.stdout.split('\n').map((s) => s.trim()).filter((s) => s && s !== 'SET');
}

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    for (const db of ['siumax', 'ecosistema', 'postgres']) {
      console.log(`\n===== ${db} =====`);
      const filas = await consultar(ssh, db, `
        SELECT id || ' | ' || left(name, 55) || ' | unit=' || coalesce(unit,'') ||
               ' | control=' || coalesce(control_type,'') ||
               ' | sunat=' || coalesce(sunat_unit_code,'') ||
               ' | qty=' || coalesce(quantity::text,'') ||
               ' | pres=' || coalesce(presentaciones::text,'')
        FROM public.products
        WHERE name ILIKE '%tubo%'
        ORDER BY id LIMIT 30;`);
      filas.forEach((f) => console.log(f));
      if (!filas.length) console.log('(ninguno)');
    }
  } finally { ssh.dispose(); }
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
