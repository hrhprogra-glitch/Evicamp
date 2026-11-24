// Pasada 226: prueba REAL de stock de la edición, devolución múltiple y borrado de salidas.
// Solo en la base de pruebas siumax. Respaldo previo, sin Evicamp, sin push.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const SQL = `
DO $$
DECLARE
  v_prod1 bigint; v_prod2 bigint; v_stock0 numeric; v_stock0b numeric; v_stock numeric;
  v_salida bigint; v_item bigint; v_item2 bigint; v_codigo text; v_n integer;
BEGIN
  SELECT id, coalesce(quantity, 0) INTO v_prod1, v_stock0
  FROM public.products WHERE coalesce(is_active, 1) = 1 AND coalesce(quantity, 0) >= 5 ORDER BY id LIMIT 1;
  SELECT id, coalesce(quantity, 0) INTO v_prod2, v_stock0b
  FROM public.products WHERE coalesce(is_active, 1) = 1 AND coalesce(quantity, 0) >= 5 AND id <> v_prod1 ORDER BY id LIMIT 1;
  IF v_prod1 IS NULL OR v_prod2 IS NULL THEN RAISE EXCEPTION 'No hay dos productos con stock suficiente para la prueba'; END IF;

  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo', 'SERVICIO', 'customer_id', 990001, 'usuario', 'PRUEBA 226',
    'observaciones', 'ZZZ PRUEBA STOCK 226',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', v_prod1, 'descripcion', 'ZZZ MATERIAL 226', 'unidad', 'UNID',
      'cantidad', 2, 'costo_unitario', 1, 'es_externo', false))))->>'id')::bigint INTO v_salida;
  SELECT codigo INTO v_codigo FROM public.salidas WHERE id = v_salida;
  SELECT id INTO v_item FROM public.salida_items WHERE salida_id = v_salida;

  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod1;
  IF v_stock <> v_stock0 - 2 THEN RAISE EXCEPTION 'FALLA 1: al registrar salió % y esperaba %', v_stock, v_stock0 - 2; END IF;
  RAISE NOTICE 'OK 1: registrar salida descontó 2 (%), salida %', v_stock, v_codigo;

  -- Subir de 2 a 4: debe descontar 2 más.
  PERFORM public.fn_editar_salida(v_salida, jsonb_build_object(
    'observaciones', 'ZZZ EDITADA 226',
    'items', jsonb_build_array(jsonb_build_object(
      'id', v_item, 'descripcion', 'ZZZ MATERIAL 226', 'unidad', 'UNID',
      'cantidad', 4, 'costo_unitario', 1, 'es_externo', false))), 'PRUEBA 226');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod1;
  IF v_stock <> v_stock0 - 4 THEN RAISE EXCEPTION 'FALLA 2: al aumentar quedó % y esperaba %', v_stock, v_stock0 - 4; END IF;
  RAISE NOTICE 'OK 2: editar cantidad 2→4 descontó 2 más (%)', v_stock;

  -- Bajar de 4 a 1: debe devolver 3 al stock.
  PERFORM public.fn_editar_salida(v_salida, jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object(
      'id', v_item, 'descripcion', 'ZZZ MATERIAL 226', 'unidad', 'UNID',
      'cantidad', 1, 'costo_unitario', 1, 'es_externo', false))), 'PRUEBA 226');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod1;
  IF v_stock <> v_stock0 - 1 THEN RAISE EXCEPTION 'FALLA 3: al bajar quedó % y esperaba %', v_stock, v_stock0 - 1; END IF;
  RAISE NOTICE 'OK 3: editar cantidad 4→1 devolvió 3 (%)', v_stock;

  -- Agregar un material nuevo desde el detalle: descuenta del nuevo producto.
  PERFORM public.fn_editar_salida(v_salida, jsonb_build_object(
    'items', jsonb_build_array(
      jsonb_build_object('id', v_item, 'descripcion', 'ZZZ MATERIAL 226', 'unidad', 'UNID',
        'cantidad', 1, 'costo_unitario', 1, 'es_externo', false),
      jsonb_build_object('product_id', v_prod2, 'descripcion', 'ZZZ MATERIAL NUEVO 226', 'unidad', 'UNID',
        'cantidad', 1, 'costo_unitario', 1, 'es_externo', false))), 'PRUEBA 226');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod2;
  IF v_stock <> v_stock0b - 1 THEN RAISE EXCEPTION 'FALLA 4: material nuevo quedó % y esperaba %', v_stock, v_stock0b - 1; END IF;
  SELECT id INTO v_item2 FROM public.salida_items WHERE salida_id = v_salida AND descripcion = 'ZZZ MATERIAL NUEVO 226';
  RAISE NOTICE 'OK 4: agregar material descontó 1 del producto nuevo (%)', v_stock;

  -- Devolución múltiple en un solo paso: vuelven los dos productos.
  PERFORM public.fn_registrar_devoluciones_lote(v_salida, jsonb_build_array(
    jsonb_build_object('item_id', v_item, 'cantidad', 1),
    jsonb_build_object('item_id', v_item2, 'cantidad', 1)), 'ZZZ DEVOLUCION LOTE 226', 'PRUEBA 226');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod1;
  IF v_stock <> v_stock0 THEN RAISE EXCEPTION 'FALLA 5: producto 1 quedó % y esperaba %', v_stock, v_stock0; END IF;
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod2;
  IF v_stock <> v_stock0b THEN RAISE EXCEPTION 'FALLA 6: producto 2 quedó % y esperaba %', v_stock, v_stock0b; END IF;
  SELECT count(*) INTO v_n FROM public.salida_devoluciones WHERE salida_id = v_salida AND motivo = 'ZZZ DEVOLUCION LOTE 226';
  IF v_n <> 2 THEN RAISE EXCEPTION 'FALLA 7: se registraron % devoluciones del lote y esperaba 2', v_n; END IF;
  RAISE NOTICE 'OK 5: devolución múltiple devolvió el stock de los 2 productos y dejó 2 registros';

  -- Una nueva salida con material pendiente y borrado: el stock vuelve y la salida desaparece.
  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo', 'SERVICIO', 'customer_id', 990001, 'usuario', 'PRUEBA 226',
    'observaciones', 'ZZZ PRUEBA BORRADO 226',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', v_prod1, 'descripcion', 'ZZZ BORRAR 226', 'unidad', 'UNID',
      'cantidad', 3, 'costo_unitario', 1, 'es_externo', false))))->>'id')::bigint INTO v_salida;
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod1;
  IF v_stock <> v_stock0 - 3 THEN RAISE EXCEPTION 'FALLA 8: antes de borrar quedó % y esperaba %', v_stock, v_stock0 - 3; END IF;
  PERFORM public.fn_eliminar_salida(v_salida, 'PRUEBA 226');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod1;
  IF v_stock <> v_stock0 THEN RAISE EXCEPTION 'FALLA 9: tras borrar quedó % y esperaba %', v_stock, v_stock0; END IF;
  SELECT count(*) INTO v_n FROM public.salidas WHERE id = v_salida;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FALLA 10: la salida borrada sigue en la base'; END IF;
  RAISE NOTICE 'OK 6: eliminar devolvió las 3 unidades y borró la salida (%)', v_stock0;

  -- Limpieza de la primera salida de prueba (ya sin stock pendiente).
  PERFORM public.fn_eliminar_salida((SELECT id FROM public.salidas WHERE observaciones = 'ZZZ EDITADA 226' ORDER BY id DESC LIMIT 1), 'PRUEBA 226');
  RAISE NOTICE 'PRUEBA 226 TERMINADA: TODO OK';
END $$;
`;

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
    console.log('Respaldo:', await ej(`runuser -u postgres -- pg_dump -Fc -d siumax -f /var/lib/postgresql/respaldo-siumax-antes-prueba226-${marca}.dump && echo listo`));
    const r = await s.execCommand('runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d siumax', { stdin: SQL });
    console.log(r.stdout.trim() || '(sin salida)');
    console.log((r.stderr || '').trim());
    if (r.stderr && /ERROR|FATAL/i.test(r.stderr)) throw new Error(r.stderr);
    if (/FALLA|ERROR/i.test(r.stdout)) throw new Error('La prueba de stock falló');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
