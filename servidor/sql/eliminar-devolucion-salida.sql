-- 25/11/2026 — Nego: borrar una devolución registrada por equivocación.
-- La X del historial llama a fn_eliminar_devolucion: deshace el «Devuelto» del material,
-- descuenta el stock del producto y del lote, borra la fila del historial y deja un
-- movimiento ANULACION como constancia para que se pueda volver a registrar bien.
-- Repetible. Aplicar SOLO en la base siumax, con respaldo previo y lock_timeout.
\set ON_ERROR_STOP on
SET lock_timeout = '5s';

-- La ruta nueva usa el mismo permiso que registrar salidas/devoluciones.
CREATE OR REPLACE FUNCTION public.fn_permisos_servicios(p_metodo text, p_ruta text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_ruta = '/bienes_cliente' THEN ARRAY['clientes_editar', 'caja_ver_fiados']
    WHEN p_ruta = '/trabajadores' THEN ARRAY['trabajadores_editar']
    WHEN p_ruta IN ('/salidas', '/salida_trabajadores', '/salida_items', '/salida_devoluciones') THEN ARRAY['salidas_ver']
    WHEN p_ruta IN ('/rpc/fn_registrar_salida', '/rpc/fn_registrar_devolucion', '/rpc/fn_cambiar_estado_salida',
                    '/rpc/fn_editar_salida', '/rpc/fn_eliminar_salida', '/rpc/fn_registrar_devoluciones_lote',
                    '/rpc/fn_quitar_material_salida', '/rpc/fn_eliminar_devolucion') THEN ARRAY['salidas_crear']
    WHEN p_ruta IN ('/herramientas', '/herramientas_prestamos', '/vehiculos', '/vehiculos_mantenimientos') THEN ARRAY['herramientas_ver']
    WHEN p_ruta IN ('/rpc/fn_prestar_herramienta', '/rpc/fn_devolver_herramienta') THEN ARRAY['herramientas_crear']
    WHEN p_ruta IN ('/agenda_trabajos', '/agenda_trabajadores') THEN ARRAY['agenda_ver']
    WHEN p_ruta IN ('/contratos', '/contrato_visitas', '/contrato_consumos', '/contrato_cobros') THEN ARRAY['contratos_ver']
    WHEN p_ruta IN ('/rpc/fn_generar_visitas_contrato', '/rpc/fn_registrar_consumo_visita', '/rpc/fn_registrar_pago_contrato') THEN ARRAY['contratos_editar']
    WHEN p_ruta = '/cotizacion_pagos' THEN ARRAY['cobros_ver', 'caja_realizar_ventas', 'caja_ver_fiados']
    WHEN p_ruta = '/rpc/fn_convertir_cotizacion_a_trabajo' THEN ARRAY['cobros_editar']
    WHEN p_ruta = '/rpc/fn_registrar_pago_cotizacion' THEN ARRAY['cobros_editar', 'caja_realizar_ventas', 'caja_ver_fiados']
    WHEN p_ruta IN ('/taller_ordenes', '/taller_repuestos', '/taller_pagos') THEN ARRAY['taller_ver']
    WHEN p_ruta IN ('/rpc/fn_cambiar_estado_taller', '/rpc/fn_registrar_pago_taller') THEN ARRAY['taller_editar']
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_eliminar_devolucion(
  p_devolucion_id bigint,
  p_usuario text DEFAULT 'Sistema'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dev record;
  v_item record;
  v_salida record;
  v_stock numeric;
  v_lote_id bigint;
BEGIN
  SELECT * INTO v_dev FROM public.salida_devoluciones WHERE id = p_devolucion_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La devolución ya no existe.';
  END IF;

  SELECT * INTO v_item FROM public.salida_items
  WHERE id = v_dev.salida_item_id AND salida_id = v_dev.salida_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El material de esa devolución ya no existe.';
  END IF;

  IF coalesce(v_item.cantidad_devuelta, 0) < v_dev.cantidad THEN
    RAISE EXCEPTION 'No se puede eliminar: el material ya tiene menos devuelto que esta devolución.';
  END IF;

  SELECT * INTO v_salida FROM public.salidas WHERE id = v_dev.salida_id;

  UPDATE public.salida_items
  SET cantidad_devuelta = coalesce(cantidad_devuelta, 0) - v_dev.cantidad
  WHERE id = v_item.id;

  -- Quitar del producto y del lote lo mismo que añadió la devolución.
  IF NOT coalesce(v_item.es_externo, false) AND v_item.product_id IS NOT NULL THEN
    SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_item.product_id FOR UPDATE;

    v_lote_id := coalesce(v_dev.batch_id, v_item.batch_id);
    IF v_lote_id IS NULL THEN
      SELECT id INTO v_lote_id FROM public.batches
      WHERE product_id = v_item.product_id AND coalesce(is_active, 1) <> 0
      ORDER BY created_at DESC, id DESC LIMIT 1;
    END IF;
    IF v_lote_id IS NOT NULL THEN
      UPDATE public.batches
      SET quantity = coalesce(quantity, 0) - v_dev.cantidad
      WHERE id = v_lote_id;
    END IF;

    UPDATE public.products
    SET quantity = v_stock - v_dev.cantidad
    WHERE id = v_item.product_id;

    -- Constancia: movimiento en negativo, sin borrar el historial de inventario.
    INSERT INTO public.inventory_movements (
      batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
      operation_type, reason, notes, created_at, "user", is_synced
    ) VALUES (
      v_lote_id, v_item.product_id, v_item.descripcion, -v_dev.cantidad, v_stock, v_stock - v_dev.cantidad,
      'ANULACION', 'Eliminación de devolución de Salida ' || coalesce(v_salida.codigo, v_salida.id::text),
      'Devolución #' || v_dev.id || ' eliminada; vuelve a registrar si fue un error', now(), p_usuario, 1
    );
  END IF;

  DELETE FROM public.salida_devoluciones WHERE id = v_dev.id;

  RETURN jsonb_build_object(
    'success', true,
    'devolucion_id', v_dev.id,
    'cantidad', v_dev.cantidad,
    'stock_final', v_stock,
    'mensaje', 'Devolución eliminada. Ya puedes registrar-la de nuevo.'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_eliminar_devolucion(bigint, text) TO anon;

NOTIFY pgrst, 'reload schema';

SELECT 'FUNCION LISTA: ' || count(*)
FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'fn_eliminar_devolucion';
SELECT 'PERMISO LISTO: ' || coalesce(array_to_string(public.fn_permisos_servicios('POST', '/rpc/fn_eliminar_devolucion'), ','), 'NO');
