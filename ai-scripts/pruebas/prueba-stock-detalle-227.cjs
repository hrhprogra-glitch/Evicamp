// Pasada 227: prueba REAL de stock del detalle de salida, devolución múltiple y X que quita material.
// Solo en la base de pruebas siumax. Respaldo previo, sin Evicamp, sin push.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const SQL = `
DO $$
DECLARE
  v_prod bigint; v_stock0 numeric; v_stock numeric;
  v_salida bigint; v_item bigint; v_codigo text; v_n integer; v_sum numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = 990001) THEN
    INSERT INTO public.customers (id,name,dni,activo,created_at,is_synced)
    VALUES (990001,'ZZZ CLIENTE STOCK 227','990001',true,now(),1);
  END IF;

  SELECT id, coalesce(quantity, 0) INTO v_prod, v_stock0
  FROM public.products WHERE coalesce(is_active, 1) = 1 AND coalesce(quantity, 0) >= 5 ORDER BY id LIMIT 1;
  IF v_prod IS NULL THEN RAISE EXCEPTION 'No hay producto con stock suficiente para la prueba'; END IF;

  -- 1) Quitar un material sin devoluciones previas: vuelve todo lo pendiente.
  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo', 'SERVICIO', 'customer_id', 990001, 'usuario', 'PRUEBA 227',
    'observaciones', 'ZZZ PRUEBA QUITAR 227',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', v_prod, 'descripcion', 'ZZZ QUITAR 227', 'unidad', 'UNID',
      'cantidad', 2, 'costo_unitario', 1, 'es_externo', false))))->>'id')::bigint INTO v_salida;
  SELECT codigo INTO v_codigo FROM public.salidas WHERE id = v_salida;
  SELECT id INTO v_item FROM public.salida_items WHERE salida_id = v_salida;
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 - 2 THEN RAISE EXCEPTION 'FALLA 1: al registrar quedó % y esperaba %', v_stock, v_stock0 - 2; END IF;
  PERFORM public.fn_quitar_material_salida(v_salida, v_item, 'PRUEBA 227');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 THEN RAISE EXCEPTION 'FALLA 2: al quitar quedó % y esperaba %', v_stock, v_stock0; END IF;
  SELECT count(*) INTO v_n FROM public.salida_items WHERE id = v_item;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FALLA 3: el material quitado sigue en el detalle'; END IF;
  SELECT coalesce(sum(change_amount), 0) INTO v_sum FROM public.inventory_movements
  WHERE product_id = v_prod AND operation_type = 'DEVOLUCION' AND reason = 'Devolución de Salida ' || v_codigo;
  IF v_sum <> 2 THEN RAISE EXCEPTION 'FALLA 4: el movimiento de stock quedó en % y esperaba 2', v_sum; END IF;
  RAISE NOTICE 'OK 1: quitar devolvió las 2 unidades, borró el material y dejó el movimiento';

  -- 2) Devolución parcial y luego quitar: solo vuelve lo que faltaba.
  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo', 'SERVICIO', 'customer_id', 990001, 'usuario', 'PRUEBA 227',
    'observaciones', 'ZZZ PRUEBA PARCIAL 227',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', v_prod, 'descripcion', 'ZZZ PARCIAL 227', 'unidad', 'UNID',
      'cantidad', 4, 'costo_unitario', 1, 'es_externo', false))))->>'id')::bigint INTO v_salida;
  SELECT codigo INTO v_codigo FROM public.salidas WHERE id = v_salida;
  SELECT id INTO v_item FROM public.salida_items WHERE salida_id = v_salida;
  PERFORM public.fn_registrar_devoluciones_lote(v_salida, jsonb_build_array(
    jsonb_build_object('item_id', v_item, 'cantidad', 1)), 'ZZZ DEVOLUCION PARCIAL 227', 'PRUEBA 227');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 - 3 THEN RAISE EXCEPTION 'FALLA 5: tras devolver 1 quedó % y esperaba %', v_stock, v_stock0 - 3; END IF;
  PERFORM public.fn_quitar_material_salida(v_salida, v_item, 'PRUEBA 227');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 THEN RAISE EXCEPTION 'FALLA 6: al quitar lo pendiente quedó % y esperaba %', v_stock, v_stock0; END IF;
  SELECT coalesce(sum(change_amount), 0) INTO v_sum FROM public.inventory_movements
  WHERE product_id = v_prod AND operation_type = 'DEVOLUCION' AND reason = 'Devolución de Salida ' || v_codigo;
  IF v_sum <> 4 THEN RAISE EXCEPTION 'FALLA 7: devolvieron % en total y esperaba 4', v_sum; END IF;
  SELECT count(*) INTO v_n FROM public.salida_devoluciones WHERE salida_id = v_salida;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FALLA 8: quedaron % filas de devolución huérfanas', v_n; END IF;
  RAISE NOTICE 'OK 2: con 1 ya devuelto, quitar devolvió solo las 3 pendientes';

  -- 3) Editar cantidades y agregar material (lo que ya cubría la 226 sigue igual).
  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo', 'SERVICIO', 'customer_id', 990001, 'usuario', 'PRUEBA 227',
    'observaciones', 'ZZZ EDITADA 227',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', v_prod, 'descripcion', 'ZZZ EDITAR 227', 'unidad', 'UNID',
      'cantidad', 2, 'costo_unitario', 1, 'es_externo', false))))->>'id')::bigint INTO v_salida;
  SELECT id INTO v_item FROM public.salida_items WHERE salida_id = v_salida;
  PERFORM public.fn_editar_salida(v_salida, jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object(
      'id', v_item, 'descripcion', 'ZZZ EDITAR 227', 'unidad', 'UNID',
      'cantidad', 5, 'costo_unitario', 1, 'es_externo', false))), 'PRUEBA 227');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 - 5 THEN RAISE EXCEPTION 'FALLA 9: al editar quedó % y esperaba %', v_stock, v_stock0 - 5; END IF;
  RAISE NOTICE 'OK 3: editar cantidades sigue descontando y devolviendo stock';

  -- Limpieza: borrar con RPC devuelve lo que aún quedaba pendiente.
  PERFORM public.fn_eliminar_salida(v_salida, 'LIMPIEZA PRUEBA 227');
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 THEN RAISE EXCEPTION 'FALLA 10: tras borrar quedó % y esperaba %', v_stock, v_stock0; END IF;
  RAISE NOTICE 'PRUEBA 227 TERMINADA: TODO OK';
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
    console.log('Respaldo:', await ej(`runuser -u postgres -- pg_dump -Fc -d siumax -f /var/lib/postgresql/respaldo-siumax-antes-prueba227-${marca}.dump && echo listo`));
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
