// Pasada 226: aplica SOLO en Nego (base siumax) las RPC nuevas del detalle de salida.
// Respaldo → SQL repetible con ON_ERROR_STOP y lock_timeout → verificación. Sin Evicamp, sin push.
// Uso: node ai-scripts/pruebas/aplicar-detalle-salida-nego.cjs
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
    const respaldo = `/var/lib/postgresql/respaldo-${BASE}-antes-detalle-salida-226-${marca}.dump`;
    console.log('1. Respaldo:', await ej(`runuser -u postgres -- pg_dump -Fc -d ${BASE} -f ${respaldo} && ls -lh ${respaldo} | awk '{print $5, $9}'`));

    console.log('2. Aplicando el SQL...');
    await s.putFile(SQL_LOCAL, '/tmp/detalle-salida-226.sql');
    const r = await s.execCommand(`chmod 644 /tmp/detalle-salida-226.sql && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${BASE} -c "SET lock_timeout = '5s'" -f /tmp/detalle-salida-226.sql 2>&1; rm -f /tmp/detalle-salida-226.sql`);
    if (r.code !== 0 || /ERROR|FATAL|lock timeout/i.test(r.stdout)) throw new Error('psql: ' + r.stdout.trim());
    console.log('   sin errores');
    await ej(`runuser -u postgres -- psql -d ${BASE} -c "NOTIFY pgrst, 'reload schema';"`);

    console.log('3. Verificando...');
    console.log(await ej(`runuser -u postgres -- psql -At -d ${BASE} -c "
      SELECT 'funciones: ' || string_agg(proname, ',' ORDER BY proname) FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace AND proname IN
        ('fn_editar_salida','fn_eliminar_salida','fn_registrar_devoluciones_lote','fn_descontar_stock_salida','fn_devolver_stock_salida');
      SELECT 'permiso editar: ' || fn_permisos_requeridos('POST','/rpc/fn_editar_salida')::text;
      SELECT 'permiso eliminar: ' || fn_permisos_requeridos('POST','/rpc/fn_eliminar_salida')::text;
      SELECT 'permiso lote: ' || fn_permisos_requeridos('POST','/rpc/fn_registrar_devoluciones_lote')::text;
      SELECT 'execute anon: ' || has_function_privilege('anon','public.fn_eliminar_salida(bigint,text)','EXECUTE');"`));
    console.log('Listo. Respaldo:', respaldo);
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
