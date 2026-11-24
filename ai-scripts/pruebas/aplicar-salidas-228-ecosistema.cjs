// Pasada 228 a ECOSISTEMA (base "ecosistema"), SIN reiniciar la API (no corta ventas).
// ecosistema ya tiene las tablas de Salidas, así que solo necesita detalle-salida-edicion.sql.
// NO se aplica seguridad-sesion.sql completo: ecosistema tiene una tabla notas_credito
// de Compras (uuid/entrada_id) distinta de la de SUNAT y ese SQL se detiene ahí. Nada que ver con la 228.
// 1) prueba el SQL en una COPIA; 2) respaldo; 3) aplica con ON_ERROR_STOP y lock_timeout;
// 4) comprueba que no se perdieron clientes/productos/salidas y que las RPC nuevas quedaron.
// Uso: node ai-scripts/pruebas/aplicar-salidas-228-ecosistema.cjs
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const SQL_LOCALES = [
  path.join(__dirname, '../../servidor/sql/detalle-salida-edicion.sql'),
];
const CONTEOS = `SELECT 'clientes: ' || count(*) FROM public.customers;
  SELECT 'productos: ' || count(*) FROM public.products;
  SELECT 'salidas: ' || count(*) FROM public.salidas;
  SELECT 'empleados: ' || count(*) FROM public.empleados;`;

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const ej = async (cmd, opciones) => {
    const r = await s.execCommand(cmd, opciones);
    if (r.code !== 0) throw new Error(`${cmd.slice(0, 90)}…: ${r.stderr || r.stdout}`);
    return r.stdout.trim();
  };
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const temporal = `/tmp/ecosistema-copia-228-${marca}.dump`;
  const pruebaDb = `ecosistema_prueba_228_${Date.now()}`;
  const sqlRemotos = SQL_LOCALES.map((f, i) => `/tmp/salidas-228-eco-${i}-${marca}.sql`);
  try {
    console.log('0. Estado antes en ecosistema:');
    console.log(await ej(`runuser -u postgres -- psql -At -d ecosistema -c "${CONTEOS.replace(/\n\s*/g, ' ')}"`));

    console.log('1. Copiando ecosistema para probar el SQL…');
    await ej(`runuser -u postgres -- pg_dump -Fc -d ecosistema -f ${temporal} && ls -lh ${temporal} | awk '{print $5, $9}'`);
    // ecosistema tiene filas históricas que apuntan a la tienda id 2, pero la tabla stores está vacía:
    // pg_restore no puede recrear 3 FK al final. Se permiten SOLO esos 3 errores conocidos; la copia
    // queda igual que producción para probar los SQL. Cualquier otro error aborta.
    const rCopia = await s.execCommand(
      `runuser -u postgres -- createdb ${pruebaDb} && runuser -u postgres -- pg_restore -d ${pruebaDb} ${temporal} 2>&1; echo CODIGO=$?`,
    );
    const salidaCopia = rCopia.stdout || '';
    const permitidas = ['batches_store_id_fkey', 'inventory_movements_store_id_fkey', 'sales_store_id_fkey'];
    const erroresCopia = salidaCopia.split('\n').filter((l) => /ERROR:|FATAL:/.test(l));
    if (erroresCopia.some((l) => !permitidas.some((p) => l.includes(p)))) {
      throw new Error('La copia de ecosistema dio errores desconocidos:\n' + salidaCopia.slice(-3000));
    }
    if (erroresCopia.length && !/errors ignored on restore/.test(salidaCopia)) {
      throw new Error('La copia terminó con errores y no se pudo confirmar que fueran solo las 3 FK conocidas:\n' + salidaCopia.slice(-3000));
    }
    console.log('   Copia lista' + (erroresCopia.length ? ' (3 FK históricas omitidas, igual que en producción)' : ''));
    for (let i = 0; i < SQL_LOCALES.length; i++) await s.putFile(SQL_LOCALES[i], sqlRemotos[i]);
    await ej(`chmod 644 ${sqlRemotos.join(' ')}`);

    const aplicar = (base) => s.execCommand(
      `for f in ${sqlRemotos.join(' ')}; do runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${base} -c "SET lock_timeout = '5s'" -f "$f" 2>&1 | tail -8; test \${PIPESTATUS[0]} -eq 0 || exit 1; done; echo CODIGO=0`,
    );
    const rPrueba = await aplicar(pruebaDb);
    if (rPrueba.code !== 0 || /ERROR|FATAL|CODIGO=[^0]/.test(rPrueba.stdout)) {
      throw new Error('Los SQL fallaron en la copia; ecosistema NO fue tocado:\n' + rPrueba.stdout);
    }
    console.log('   El SQL se aplicó a la copia sin errores.');
    console.log(await ej(`runuser -u postgres -- psql -At -d ${pruebaDb} -c "${CONTEOS.replace(/\n\s*/g, ' ')}"`));
    await ej(`runuser -u postgres -- dropdb ${pruebaDb} && echo copia-retirada`);

    console.log('2. Respaldo de producción:', await ej(`runuser -u postgres -- pg_dump -Fc -d ecosistema -f /var/lib/postgresql/respaldo-ecosistema-antes-salidas-228-${marca}.dump && echo listo`));
    console.log('3. Aplicando a ecosistema…');
    const rReal = await aplicar('ecosistema');
    if (rReal.code !== 0 || /ERROR|FATAL|CODIGO=[^0]/.test(rReal.stdout)) {
      throw new Error('Fallo al aplicar en ecosistema:\n' + rReal.stdout);
    }
    // Lo mismo que tienen Nego y Evicamp: almacén principal para los movimientos de stock y
    // cliente interno invisible para las Salidas guardadas solo como nota (fase 224).
    await ej(`runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ecosistema -c "SET lock_timeout = '5s'" -c "INSERT INTO public.stores (id,nombre,codigo,es_almacen_principal,activo) OVERRIDING SYSTEM VALUE SELECT 1,'Tienda Principal','T01',true,true WHERE NOT EXISTS (SELECT 1 FROM public.stores WHERE id=1)" -c "INSERT INTO public.customers (id,name,activo) VALUES (990001,'CLIENTE NO REGISTRADO (NOTA)',false) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, activo=false" && echo extras-listo`);
    await ej(`runuser -u postgres -- psql -d ecosistema -c "NOTIFY pgrst, 'reload schema';" && echo esquema-recargado`);

    console.log('4. Verificación en ecosistema:');
    console.log(await ej(`runuser -u postgres -- psql -At -d ecosistema -c "
      SELECT 'clientes: ' || count(*) FROM public.customers;
      SELECT 'productos: ' || count(*) FROM public.products;
      SELECT 'salidas: ' || count(*) FROM public.salidas;
      SELECT 'empleados: ' || count(*) FROM public.empleados;
      SELECT 'salidas tabla: ' || coalesce(to_regclass('public.salidas')::text,'NO');
      SELECT 'trabajador_id: ' || coalesce((SELECT column_name FROM information_schema.columns WHERE table_name='salida_devoluciones' AND column_name='trabajador_id'),'NO');
      SELECT 'cliente nota 990001: ' || count(*) FROM public.customers WHERE id=990001;
      SELECT 'tienda principal 1: ' || count(*) FROM public.stores WHERE id=1;
      SELECT 'firma registrar: ' || pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='fn_registrar_devolucion' AND pronamespace='public'::regnamespace;
      SELECT 'firma lote: ' || pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='fn_registrar_devoluciones_lote' AND pronamespace='public'::regnamespace;
      SELECT 'funcion ' || proname FROM pg_proc WHERE proname IN ('fn_eliminar_salida','fn_quitar_material_salida','fn_editar_salida','fn_descontar_stock_salida','fn_devolver_stock_salida') AND pronamespace='public'::regnamespace ORDER BY proname;
      SELECT 'execute anon eliminar: ' || has_function_privilege('anon','public.fn_eliminar_salida(bigint,text)','EXECUTE');
      SELECT 'permiso eliminar: ' || fn_permisos_requeridos('POST','/rpc/fn_eliminar_salida')::text;"`));
    console.log('LISTO. Respaldo: /var/lib/postgresql/respaldo-ecosistema-antes-salidas-228-' + marca + '.dump');
  } finally {
    await s.execCommand(`runuser -u postgres -- dropdb --if-exists ${pruebaDb}`);
    await s.execCommand(`rm -f ${temporal} ${sqlRemotos.join(' ')}`);
    s.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
