// Pasada 228: aplica SOLO en Nego (base siumax) la fecha y el trabajador de las devoluciones.
// Respaldo → SQL repetible con ON_ERROR_STOP y lock_timeout → verificación. Sin Evicamp, sin push.
// Uso: node ai-scripts/pruebas/aplicar-devoluciones-228-nego.cjs
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const BASE = 'siumax';
const SQL_LOCAL = path.join(__dirname, '../../servidor/sql/detalle-salida-edicion.sql');

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
    const respaldo = `/var/lib/postgresql/respaldo-${BASE}-antes-devoluciones-228-${marca}.dump`;
    console.log('1. Respaldo:', await ej(`runuser -u postgres -- pg_dump -Fc -d ${BASE} -f ${respaldo} && ls -lh ${respaldo} | awk '{print $5, $9}'`));

    console.log('2. Aplicando el SQL...');
    await s.putFile(SQL_LOCAL, '/tmp/detalle-salida-228.sql');
    const r = await s.execCommand(`chmod 644 /tmp/detalle-salida-228.sql && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${BASE} -c "SET lock_timeout = '5s'" -f /tmp/detalle-salida-228.sql 2>&1; rm -f /tmp/detalle-salida-228.sql`);
    if (r.code !== 0 || /ERROR|FATAL|lock timeout/i.test(r.stdout)) throw new Error('psql: ' + r.stdout.trim());
    console.log('   sin errores');
    await ej(`runuser -u postgres -- psql -d ${BASE} -c "NOTIFY pgrst, 'reload schema';"`);

    console.log('3. Verificando...');
    console.log(await ej(`runuser -u postgres -- psql -At -d ${BASE} -c "
      SELECT 'columna trabajador_id: ' || coalesce((SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='salida_devoluciones' AND column_name='trabajador_id'), 'NO');
      SELECT 'firma registrar: ' || pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='fn_registrar_devolucion' AND pronamespace='public'::regnamespace;
      SELECT 'firma lote: ' || pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='fn_registrar_devoluciones_lote' AND pronamespace='public'::regnamespace;
      SELECT 'execute anon registrar: ' || has_function_privilege('anon','public.fn_registrar_devolucion(bigint,bigint,numeric,text,text,timestamptz,bigint)','EXECUTE');
      SELECT 'execute anon lote: ' || has_function_privilege('anon','public.fn_registrar_devoluciones_lote(bigint,jsonb,text,text,timestamptz,bigint)','EXECUTE');
      SELECT 'permiso lote: ' || fn_permisos_requeridos('POST','/rpc/fn_registrar_devoluciones_lote')::text;
      SELECT 'devoluciones con trabajador: ' || count(*) FROM public.salida_devoluciones WHERE trabajador_id IS NOT NULL;" `));
    console.log('Listo. Respaldo:', respaldo);
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
