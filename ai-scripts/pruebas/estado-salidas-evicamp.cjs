// Diagnóstico SOLO DE LECTURA del estado de Salidas en Evicamp (base postgres).
// No modifica nada. Uso: node ai-scripts/pruebas/estado-salidas-evicamp.cjs
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const q = `
      SELECT 'tabla salidas: ' || coalesce(to_regclass('public.salidas')::text, 'NO');
      SELECT 'tabla salida_items: ' || coalesce(to_regclass('public.salida_items')::text, 'NO');
      SELECT 'tabla salida_devoluciones: ' || coalesce(to_regclass('public.salida_devoluciones')::text, 'NO');
      SELECT 'columna trabajador_id: ' || coalesce((SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='salida_devoluciones' AND column_name='trabajador_id'), 'NO');
      SELECT 'cliente nota 990001: ' || count(*) FROM public.customers WHERE id = 990001;
      SELECT 'tablas publicas: ' || count(*) FROM information_schema.tables WHERE table_schema='public';
      SELECT 'clientes: ' || count(*) FROM public.customers;
      SELECT 'productos: ' || count(*) FROM public.products;
      SELECT 'funciones de salida: ' || count(*) FROM pg_proc WHERE proname LIKE 'fn_%salida%' AND pronamespace='public'::regnamespace;
      SELECT 'firma ' || proname || ': ' || pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname IN ('fn_registrar_devolucion','fn_registrar_devoluciones_lote','fn_eliminar_salida','fn_quitar_material_salida','fn_editar_salida') AND pronamespace='public'::regnamespace ORDER BY proname;
      SELECT 'seguridad activa: ' || coalesce((SELECT proname FROM pg_proc WHERE proname='fn_verificar_peticion' AND pronamespace='public'::regnamespace), 'NO');
    `;
    const r = await s.execCommand('runuser -u postgres -- psql -At -d postgres', { stdin: q });
    console.log((r.stdout || '').trim());
    if (r.stderr && /ERROR|FATAL/i.test(r.stderr)) throw new Error(r.stderr);
  } finally {
    s.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
