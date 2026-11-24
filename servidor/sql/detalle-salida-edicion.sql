-- SiuMax Nego (24/11/2026, pasada 226): edición total del detalle de salida,
-- borrado que devuelve el stock y devolución de varios materiales a la vez.
-- Repetible. Aplicar SOLO en la base de pruebas siumax, con respaldo y lock_timeout.

-- Permisos de las RPC nuevas (mismo permiso que registrar salidas).
CREATE OR REPLACE FUNCTION public.fn_permisos_servicios(p_metodo text, p_ruta text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_ruta = '/bienes_cliente' THEN ARRAY['clientes_editar', 'caja_ver_fiados']
    WHEN p_ruta = '/trabajadores' THEN ARRAY['trabajadores_editar']
    WHEN p_ruta IN ('/salidas', '/salida_trabajadores', '/salida_items', '/salida_devoluciones') THEN ARRAY['salidas_ver']
    WHEN p_ruta IN ('/rpc/fn_registrar_salida', '/rpc/fn_registrar_devolucion', '/rpc/fn_cambiar_estado_salida',
                    '/rpc/fn_editar_salida', '/rpc/fn_eliminar_salida', '/rpc/fn_registrar_devoluciones_lote') THEN ARRAY['salidas_crear']
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
$$;

-- Descontar stock de un producto (FIFO o lote elegido). Igual que fn_registrar_salida.
CREATE OR REPLACE FUNCTION public.fn_descontar_stock_salida(
  p_product_id bigint,
  p_batch_id bigint,
  p_cantidad numeric,
  p_descripcion text,
  p_codigo text,
  p_usuario text DEFAULT 'Sistema'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lote record;
  v_toma numeric;
  v_falta numeric;
  v_stock numeric;
BEGIN
  IF p_cantidad <= 0 OR p_product_id IS NULL THEN RETURN; END IF;

  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_batch_id IS NOT NULL THEN
    UPDATE public.batches SET quantity = greatest(0, coalesce(quantity, 0) - p_cantidad) WHERE id = p_batch_id;
    UPDATE public.products SET quantity = coalesce(quantity, 0) - p_cantidad WHERE id = p_product_id;
    INSERT INTO public.inventory_movements (
      batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
      operation_type, reason, notes, created_at, "user", is_synced
    ) VALUES (
      p_batch_id, p_product_id, p_descripcion, -p_cantidad, v_stock, v_stock - p_cantidad,
      'SALIDA', 'Salida ' || p_codigo, 'Edición de salida', now(), p_usuario, 1
    );
    RETURN;
  END IF;

  v_falta := p_cantidad;
  FOR v_lote IN
    SELECT id, coalesce(quantity, 0) AS qty
    FROM public.batches
    WHERE product_id = p_product_id AND coalesce(quantity, 0) > 0 AND coalesce(is_active, 1) <> 0
    ORDER BY created_at ASC, id ASC FOR UPDATE
  LOOP
    EXIT WHEN v_falta <= 0;
    v_toma := least(v_lote.qty, v_falta);
    UPDATE public.batches SET quantity = v_lote.qty - v_toma WHERE id = v_lote.id;
    INSERT INTO public.inventory_movements (
      batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
      operation_type, reason, notes, created_at, "user", is_synced
    ) VALUES (
      v_lote.id, p_product_id, p_descripcion, -v_toma, v_stock, v_stock - v_toma,
      'SALIDA', 'Salida ' || p_codigo, 'Edición de salida', now(), p_usuario, 1
    );
    v_stock := v_stock - v_toma;
    v_falta := v_falta - v_toma;
  END LOOP;

  IF v_falta > 0 THEN
    INSERT INTO public.inventory_movements (
      product_id, product_name, change_amount, previous_quantity, new_quantity,
      operation_type, reason, notes, created_at, "user", is_synced
    ) VALUES (
      p_product_id, p_descripcion, -v_falta, v_stock, v_stock - v_falta,
      'SALIDA', 'Salida ' || p_codigo, 'Edición de salida sin lote suficiente', now(), p_usuario, 1
    );
    v_stock := v_stock - v_falta;
  END IF;
  UPDATE public.products SET quantity = v_stock WHERE id = p_product_id;
END;
$function$;

-- Devolver stock al producto/último lote, dejando constancia en salida_devoluciones.
CREATE OR REPLACE FUNCTION public.fn_devolver_stock_salida(
  p_salida_id bigint,
  p_item_id bigint,
  p_cantidad numeric,
  p_motivo text,
  p_usuario text DEFAULT 'Sistema'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_salida record;
  v_item record;
  v_stock numeric;
  v_lote_id bigint;
BEGIN
  IF p_cantidad <= 0 THEN RETURN; END IF;

  SELECT * INTO v_salida FROM public.salidas WHERE id = p_salida_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_item FROM public.salida_items WHERE id = p_item_id AND salida_id = p_salida_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF NOT v_item.es_externo AND v_item.product_id IS NOT NULL THEN
    SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_item.product_id FOR UPDATE;
    v_lote_id := v_item.batch_id;
    IF v_lote_id IS NULL THEN
      SELECT id INTO v_lote_id FROM public.batches
      WHERE product_id = v_item.product_id AND coalesce(is_active, 1) <> 0
      ORDER BY created_at DESC, id DESC LIMIT 1;
    END IF;
    IF v_lote_id IS NOT NULL THEN
      UPDATE public.batches SET quantity = coalesce(quantity, 0) + p_cantidad WHERE id = v_lote_id;
    END IF;
    UPDATE public.products SET quantity = coalesce(quantity, 0) + p_cantidad WHERE id = v_item.product_id;
    INSERT INTO public.inventory_movements (
      batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
      operation_type, reason, notes, created_at, "user", is_synced
    ) VALUES (
      v_lote_id, v_item.product_id, v_item.descripcion, p_cantidad, v_stock, v_stock + p_cantidad,
      'DEVOLUCION', 'Devolución de Salida ' || v_salida.codigo, coalesce(p_motivo, 'Material no utilizado'), now(), p_usuario, 1
    );
  END IF;

  INSERT INTO public.salida_devoluciones (
    salida_id, salida_item_id, product_id, batch_id, cantidad, motivo, usuario
  ) VALUES (
    p_salida_id, p_item_id, v_item.product_id, v_item.batch_id, p_cantidad, p_motivo, p_usuario
  );
END;
$function$;

-- Editar TODO el detalle de una salida: cabecera, trabajadores y materiales.
-- p_datos = { tipo, customer_id, bien_id, direccion, ubicacion, fecha, observaciones, usuario,
--             trabajadores: [{trabajador_id, rol}],
--             items: [{id (opcional), product_id, batch_id, descripcion, unidad, cantidad,
--                      costo_unitario, es_externo}] }
CREATE OR REPLACE FUNCTION public.fn_editar_salida(
  p_salida_id bigint,
  p_datos jsonb,
  p_usuario text DEFAULT 'Sistema'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_salida record;
  v_item record;
  v_elem jsonb;
  v_item_id bigint;
  v_nueva numeric;
  v_delta numeric;
  v_prod bigint;
  v_batch bigint;
  v_externo boolean;
  v_desc text;
  v_unidad text;
  v_costo numeric;
BEGIN
  SELECT * INTO v_salida FROM public.salidas WHERE id = p_salida_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Salida no encontrada.'; END IF;
  IF v_salida.estado = 'CANCELADO' THEN
    RAISE EXCEPTION 'No se puede editar una salida cancelada.';
  END IF;

  UPDATE public.salidas SET
    tipo = CASE WHEN p_datos ? 'tipo' THEN upper(coalesce(NULLIF(p_datos->>'tipo', ''), v_salida.tipo)) ELSE v_salida.tipo END,
    customer_id = CASE WHEN p_datos ? 'customer_id' THEN coalesce((p_datos->>'customer_id')::bigint, v_salida.customer_id) ELSE v_salida.customer_id END,
    bien_id = CASE WHEN p_datos ? 'bien_id' THEN NULLIF(p_datos->>'bien_id', '')::bigint ELSE v_salida.bien_id END,
    direccion = CASE WHEN p_datos ? 'direccion' THEN p_datos->>'direccion' ELSE v_salida.direccion END,
    ubicacion = CASE WHEN p_datos ? 'ubicacion' THEN p_datos->>'ubicacion' ELSE v_salida.ubicacion END,
    fecha = CASE WHEN p_datos ? 'fecha' THEN coalesce((p_datos->>'fecha')::date, v_salida.fecha) ELSE v_salida.fecha END,
    observaciones = CASE WHEN p_datos ? 'observaciones' THEN p_datos->>'observaciones' ELSE v_salida.observaciones END,
    usuario = CASE WHEN p_datos ? 'usuario' THEN coalesce(NULLIF(trim(p_datos->>'usuario'), ''), v_salida.usuario) ELSE v_salida.usuario END
  WHERE id = p_salida_id;

  IF p_datos ? 'trabajadores' THEN
    DELETE FROM public.salida_trabajadores WHERE salida_id = p_salida_id;
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_datos->'trabajadores') LOOP
      IF NULLIF(v_elem->>'trabajador_id', '') IS NOT NULL THEN
        INSERT INTO public.salida_trabajadores (salida_id, trabajador_id, rol)
        VALUES (p_salida_id, (v_elem->>'trabajador_id')::bigint, coalesce(NULLIF(v_elem->>'rol', ''), 'RESPONSABLE'));
      END IF;
    END LOOP;
  END IF;

  IF p_datos ? 'items' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_datos->'items') LOOP
      v_item_id := NULLIF(v_elem->>'id', '')::bigint;
      v_desc := trim(coalesce(NULLIF(v_elem->>'descripcion', ''), 'Material'));
      v_unidad := coalesce(NULLIF(v_elem->>'unidad', ''), 'UNID');
      v_nueva := coalesce((v_elem->>'cantidad')::numeric, 0);
      v_costo := coalesce((v_elem->>'costo_unitario')::numeric, 0);

      IF v_item_id IS NOT NULL THEN
        SELECT * INTO v_item FROM public.salida_items WHERE id = v_item_id AND salida_id = p_salida_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'El material % no pertenece a esta salida.', v_item_id; END IF;
        IF v_nueva < v_item.cantidad_devuelta THEN
          RAISE EXCEPTION 'La cantidad no puede ser menor a lo ya devuelto (%) en %.', v_item.cantidad_devuelta, v_item.descripcion;
        END IF;
        v_delta := v_nueva - v_item.cantidad;
        IF v_delta > 0 THEN
          PERFORM public.fn_descontar_stock_salida(v_item.product_id, v_item.batch_id, v_delta, v_desc, v_salida.codigo, p_usuario);
        ELSIF v_delta < 0 THEN
          PERFORM public.fn_devolver_stock_salida(p_salida_id, v_item_id, -v_delta, 'Ajuste al editar salida', p_usuario);
        END IF;
        UPDATE public.salida_items
        SET descripcion = v_desc, unidad = v_unidad, cantidad = v_nueva, costo_unitario = v_costo
        WHERE id = v_item_id;
      ELSE
        IF v_nueva <= 0 THEN CONTINUE; END IF;
        v_prod := NULLIF(v_elem->>'product_id', '')::bigint;
        v_batch := NULLIF(v_elem->>'batch_id', '')::bigint;
        v_externo := coalesce((v_elem->>'es_externo')::boolean, false);
        INSERT INTO public.salida_items (
          salida_id, product_id, batch_id, descripcion, unidad, cantidad, cantidad_devuelta, costo_unitario, es_externo
        ) VALUES (
          p_salida_id, v_prod, v_batch, v_desc, v_unidad, v_nueva, 0, v_costo, v_externo
        ) RETURNING id INTO v_item_id;
        IF NOT v_externo AND v_prod IS NOT NULL THEN
          PERFORM public.fn_descontar_stock_salida(v_prod, v_batch, v_nueva, v_desc, v_salida.codigo, p_usuario);
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', p_salida_id, 'codigo', v_salida.codigo);
END;
$function$;

-- Borrar la salida devolviendo TODO el material pendiente al stock (y luego ON DELETE CASCADE).
CREATE OR REPLACE FUNCTION public.fn_eliminar_salida(
  p_salida_id bigint,
  p_usuario text DEFAULT 'Sistema'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_salida record;
  v_item record;
  v_restante numeric;
BEGIN
  SELECT * INTO v_salida FROM public.salidas WHERE id = p_salida_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Salida no encontrada.'; END IF;

  FOR v_item IN SELECT * FROM public.salida_items WHERE salida_id = p_salida_id LOOP
    v_restante := v_item.cantidad - v_item.cantidad_devuelta;
    IF v_restante > 0 THEN
      PERFORM public.fn_devolver_stock_salida(p_salida_id, v_item.id, v_restante, 'Eliminación de Salida', p_usuario);
    END IF;
  END LOOP;

  DELETE FROM public.salidas WHERE id = p_salida_id;
  RETURN jsonb_build_object('success', true, 'codigo', v_salida.codigo);
END;
$function$;

-- Confirmar varias devoluciones de una sola vez en la misma transacción.
CREATE OR REPLACE FUNCTION public.fn_registrar_devoluciones_lote(
  p_salida_id bigint,
  p_devoluciones jsonb,
  p_motivo text DEFAULT 'Sobrante de trabajo no utilizado',
  p_usuario text DEFAULT 'Sistema'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_elem jsonb;
  v_item_id bigint;
  v_cant numeric;
  v_total integer := 0;
BEGIN
  FOR v_elem IN SELECT * FROM jsonb_array_elements(coalesce(p_devoluciones, '[]'::jsonb)) LOOP
    v_item_id := NULLIF(v_elem->>'item_id', '')::bigint;
    v_cant := coalesce((v_elem->>'cantidad')::numeric, 0);
    IF v_item_id IS NOT NULL AND v_cant > 0 THEN
      PERFORM public.fn_registrar_devolucion(
        p_salida_id, v_item_id, v_cant,
        coalesce(NULLIF(v_elem->>'motivo', ''), p_motivo), p_usuario
      );
      v_total := v_total + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'devoluciones', v_total);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_editar_salida(bigint, jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_eliminar_salida(bigint, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_registrar_devoluciones_lote(bigint, jsonb, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_descontar_stock_salida(bigint, bigint, numeric, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_devolver_stock_salida(bigint, bigint, numeric, text, text) TO anon;
