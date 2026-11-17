// Aplica SOLO en Nego (base siumax) el arreglo de visitas de contratos que empiezan a mitad de mes.
// Respaldo → SQL repetible con ON_ERROR_STOP y lock_timeout → verificación. Sin Evicamp, sin API, sin push.
// Uso: node ai-scripts/pruebas/aplicar-arreglo-visitas-contratos.cjs
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const BASE = 'siumax';
const SQL_LOCAL = path.join(__dirname, '../../servidor/sql/arreglo-visitas-contrato-medio-mes.sql');

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const ej = async (cmd) => {
    const r = await s.execCommand(cmd);
    if (r.code !== 0) throw new Error(`${cmd.slice(0, 70)}…: ${r.stderr || r.stdout}`);
    return r.stdout.trim();
  };
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-${BASE}-antes-visitas-contratos-${marca}.dump`;
    console.log('1. Respaldo:', await ej(`runuser -u postgres -- pg_dump -Fc -d ${BASE} -f ${respaldo} && ls -lh ${respaldo} | awk '{print $5, $9}'`));

    console.log('2. Aplicando el SQL...');
    await s.putFile(SQL_LOCAL, '/tmp/arreglo-visitas.sql');
    const r = await s.execCommand(`chmod 644 /tmp/arreglo-visitas.sql && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${BASE} -c "SET lock_timeout = '5s'" -f /tmp/arreglo-visitas.sql 2>&1; rm -f /tmp/arreglo-visitas.sql`);
    if (r.code !== 0 || /ERROR|FATAL|lock timeout/i.test(r.stdout)) throw new Error('psql: ' + r.stdout.trim());
    console.log('   sin errores');

    console.log('3. Verificando...');
    console.log(await ej(`runuser -u postgres -- psql -At -d ${BASE} -c "
      SELECT 'funcion con arreglo: ' || (position('v_fechas' in prosrc) > 0) FROM pg_proc WHERE oid = 'public.fn_generar_visitas_contrato(bigint,integer,integer)'::regprocedure;
      SELECT 'permiso anon: ' || has_function_privilege('anon', 'public.fn_generar_visitas_contrato(bigint,integer,integer)', 'EXECUTE');"`));
    console.log('Listo. Respaldo:', respaldo);
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
