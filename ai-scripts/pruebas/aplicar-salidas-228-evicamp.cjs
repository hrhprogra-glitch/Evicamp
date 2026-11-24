// Pasada 228 a EVICAMP (base "postgres"), SIN reiniciar la API (no corta ventas).
// 1) prueba el SQL completo en una COPIA de la base; 2) respaldo; 3) aplica con ON_ERROR_STOP y
// lock_timeout; 4) NOTIFY pgrst y verificación. Si la copia falla, NO se toca producción.
// Uso: node ai-scripts/pruebas/aplicar-salidas-228-evicamp.cjs
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const SQL_LOCALES = [
  path.join(__dirname, '../../servidor/sql/seguridad-sesion.sql'),
  path.join(__dirname, '../../servidor/sql/detalle-salida-edicion.sql'),
];

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const ej = async (cmd, opciones) => {
    const r = await s.execCommand(cmd, opciones);
    if (r.code !== 0) throw new Error(`${cmd.slice(0, 90)}…: ${r.stderr || r.stdout}`);
    return r.stdout.trim();
  };
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const temporal = `/tmp/evicamp-copia-228-${marca}.dump`;
  const pruebaDb = `evicamp_prueba_228_${Date.now()}`;
  const sqlRemotos = SQL_LOCALES.map((f, i) => `/tmp/salidas-228-${i}-${marca}.sql`);
  try {
    console.log('1. Copiando Evicamp para probar el SQL…');
    await ej(`runuser -u postgres -- pg_dump -Fc -d postgres -f ${temporal} && ls -lh ${temporal} | awk '{print $5, $9}'`);
    await ej(`runuser -u postgres -- createdb ${pruebaDb} && runuser -u postgres -- pg_restore -d ${pruebaDb} ${temporal} && echo copia-listo`);
    for (let i = 0; i < SQL_LOCALES.length; i++) await s.putFile(SQL_LOCALES[i], sqlRemotos[i]);
    await ej(`chmod 644 ${sqlRemotos.join(' ')}`);

    const aplicar = (base) => s.execCommand(
      `for f in ${sqlRemotos.join(' ')}; do runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${base} -c "SET lock_timeout = '5s'" -f "$f" 2>&1 | tail -8; test \${PIPESTATUS[0]} -eq 0 || exit 1; done; echo CODIGO=0`,
    );
    const rPrueba = await aplicar(pruebaDb);
    if (rPrueba.code !== 0 || /ERROR|FATAL|CODIGO=[^0]/.test(rPrueba.stdout)) {
      throw new Error('El SQL falló en la copia; Evicamp NO fue tocado:\n' + rPrueba.stdout);
    }
    console.log('   Los 2 SQL se aplicaron a la copia sin errores');
    const vPrueba = await ej(`runuser -u postgres -- psql -At -d ${pruebaDb} -c "
      SELECT 'salidas: ' || coalesce(to_regclass('public.salidas')::text,'NO');
      SELECT 'trabajador_id: ' || coalesce((SELECT column_name FROM information_schema.columns WHERE table_name='salida_devoluciones' AND column_name='trabajador_id'),'NO');
      SELECT 'cliente nota: ' || count(*) FROM public.customers WHERE id=990001;
      SELECT 'clientes: ' || count(*) FROM public.customers;"`);
    console.log(vPrueba);
    await ej(`runuser -u postgres -- dropdb ${pruebaDb} && echo copia-retirada`);

    console.log('2. Respaldo de producción:', await ej(`runuser -u postgres -- pg_dump -Fc -d postgres -f /var/lib/postgresql/respaldo-evicamp-antes-salidas-228-${marca}.dump && echo listo`));
    console.log('3. Aplicando a Evicamp…');
    const rReal = await aplicar('postgres');
    if (rReal.code !== 0 || /ERROR|FATAL|CODIGO=[^0]/.test(rReal.stdout)) {
      throw new Error('Fallo al aplicar en Evicamp:\n' + rReal.stdout);
    }
    await ej(`runuser -u postgres -- psql -d postgres -c "NOTIFY pgrst, 'reload schema';" && echo esquema-recargado`);

    console.log('4. Verificación en Evicamp:');
    console.log(await ej(`runuser -u postgres -- psql -At -d postgres -c "
      SELECT 'salidas: ' || coalesce(to_regclass('public.salidas')::text,'NO');
      SELECT 'salida_items: ' || coalesce(to_regclass('public.salida_items')::text,'NO');
      SELECT 'salida_devoluciones: ' || coalesce(to_regclass('public.salida_devoluciones')::text,'NO');
      SELECT 'trabajador_id: ' || coalesce((SELECT column_name FROM information_schema.columns WHERE table_name='salida_devoluciones' AND column_name='trabajador_id'),'NO');
      SELECT 'cliente nota 990001: ' || count(*) FROM public.customers WHERE id=990001;
      SELECT 'clientes: ' || count(*) FROM public.customers;
      SELECT 'productos: ' || count(*) FROM public.products;
      SELECT 'firma registrar: ' || pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='fn_registrar_devolucion' AND pronamespace='public'::regnamespace;
      SELECT 'firma lote: ' || pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='fn_registrar_devoluciones_lote' AND pronamespace='public'::regnamespace;
      SELECT 'funcion ' || proname FROM pg_proc WHERE proname IN ('fn_eliminar_salida','fn_quitar_material_salida','fn_editar_salida','fn_descontar_stock_salida','fn_devolver_stock_salida') AND pronamespace='public'::regnamespace ORDER BY proname;
      SELECT 'execute anon registrar: ' || has_function_privilege('anon','public.fn_registrar_devolucion(bigint,bigint,numeric,text,text,timestamptz,bigint)','EXECUTE');
      SELECT 'execute anon eliminar: ' || has_function_privilege('anon','public.fn_eliminar_salida(bigint,text)','EXECUTE');
      SELECT 'permiso registrar: ' || fn_permisos_requeridos('POST','/rpc/fn_registrar_devolucion')::text;
      SELECT 'permiso lote: ' || fn_permisos_requeridos('POST','/rpc/fn_registrar_devoluciones_lote')::text;
      SELECT 'permiso eliminar: ' || fn_permisos_requeridos('POST','/rpc/fn_eliminar_salida')::text;"`));
    console.log('LISTO. Respaldo: /var/lib/postgresql/respaldo-evicamp-antes-salidas-228-' + marca + '.dump');
  } finally {
    await s.execCommand(`rm -f ${temporal} ${sqlRemotos.join(' ')}`);
    s.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
