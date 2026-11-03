// Aplica la Fase 11 (facturación electrónica) en la base de PRUEBAS siumax.
// Respaldo → servidor/sql/seguridad-sesion.sql completo (repetible) con lock_timeout → verificación.
// Uso: node ai-scripts/pruebas/aplicar-fase11-siumax.cjs
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const BASE = 'siumax';

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const ej = async (cmd) => {
    const r = await s.execCommand(cmd);
    if (r.code !== 0) throw new Error(`${cmd.slice(0, 60)}…: ${r.stderr || r.stdout}`);
    return r.stdout.trim();
  };
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-${BASE}-antes-fase11-${marca}.dump`;
    console.log('1. Respaldo:', await ej(`runuser -u postgres -- pg_dump -Fc -d ${BASE} -f ${respaldo} && ls -lh ${respaldo} | awk '{print $5, $9}'`));

    console.log('2. Aplicando servidor/sql/seguridad-sesion.sql...');
    await s.putFile(path.join(__dirname, '../../servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-fase11.sql');
    const r = await s.execCommand(`chmod 644 /tmp/seguridad-fase11.sql && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${BASE} -c "SET lock_timeout = '5s'" -f /tmp/seguridad-fase11.sql 2>&1 | grep -E "ERROR|FATAL|lock timeout" ; rm -f /tmp/seguridad-fase11.sql`);
    if (r.stdout.trim()) throw new Error('psql: ' + r.stdout.trim());
    console.log('   sin errores');

    console.log('3. Verificando...');
    console.log(await ej(`runuser -u postgres -- psql -At -d ${BASE} -c "
      SELECT 'facturacion_config: ' || count(*) FROM public.facturacion_config;
      SELECT 'columnas cpe_ en sales: ' || count(*) FROM information_schema.columns WHERE table_name = 'sales' AND column_name LIKE 'cpe_%';
      SELECT 'triggers: ' || string_agg(tgname, ', ') FROM pg_trigger WHERE tgname IN ('trg_asignar_comprobante', 'trg_proteger_comprobante');
      SELECT 'credenciales legibles por anon: ' || has_table_privilege('anon', 'privado.facturacion_credenciales', 'SELECT');
      SELECT 'anon puede pedir número: ' || has_function_privilege('anon', 'public.fn_siguiente_correlativo(text)', 'EXECUTE');"`));
    console.log('Listo.');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
