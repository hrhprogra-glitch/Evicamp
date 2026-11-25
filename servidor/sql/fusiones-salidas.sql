-- 25/11/2026 — Nego: guardar los GENERALes de «Fusionar salidas».
-- El GENERAL sigue siendo solo una vista: NO crea una salida nueva ni descuenta stock dos veces.
-- Aquí solo se guarda el GRUPO (qué salidas se ven juntas) para que aparezca en la tabla
-- (badge FUSIONADA + botón Ver general) y en el detalle (Fusionada con...).
-- Repetible. Aplicar SOLO en la base siumax, con respaldo previo y lock_timeout.
\set ON_ERROR_STOP on
SET lock_timeout = '5s';

BEGIN;

CREATE TABLE IF NOT EXISTS public.salida_fusiones (
  id bigserial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  usuario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salida_fusion_items (
  id bigserial PRIMARY KEY,
  fusion_id bigint NOT NULL REFERENCES public.salida_fusiones (id) ON DELETE CASCADE,
  salida_id bigint NOT NULL REFERENCES public.salidas (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fusion_id, salida_id)
);

CREATE INDEX IF NOT EXISTS idx_salida_fusion_items_salida ON public.salida_fusion_items (salida_id);
CREATE INDEX IF NOT EXISTS idx_salida_fusion_items_fusion ON public.salida_fusion_items (fusion_id);

CREATE SEQUENCE IF NOT EXISTS public.seq_fusiones_codigo START 1;

-- Si el script se aplica de nuevo, el correlativo sigue después del último código usado.
DO $do$
DECLARE
  v_max integer;
BEGIN
  SELECT coalesce(max(nullif(regexp_replace(codigo, '[^0-9]', '', 'g'), '')::integer), 0)
    INTO v_max
    FROM public.salida_fusiones;
  IF v_max = 0 THEN
    -- Recién creada: el primer código debe ser FUS-0001.
    PERFORM setval('public.seq_fusiones_codigo', 1, false);
  ELSE
    PERFORM setval('public.seq_fusiones_codigo', v_max, true);
  END IF;
END
$do$;

-- Guardar (o reutilizar) el grupo. Una salida solo puede pertenecer a un GENERAL.
CREATE OR REPLACE FUNCTION public.fn_guardar_fusion_salidas(
  p_salida_ids bigint[],
  p_usuario text DEFAULT 'Sistema'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_ids bigint[];
  v_fusion_id bigint;
  v_codigo text;
  v_actual bigint;
BEGIN
  SELECT ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_salida_ids, '{}'::bigint[])) AS x WHERE x IS NOT NULL)
    INTO v_ids;

  IF cardinality(v_ids) < 2 THEN
    RAISE EXCEPTION 'Elige al menos dos salidas para guardar el general.';
  END IF;

  IF (SELECT count(*) FROM public.salidas WHERE id = ANY(v_ids)) <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Una de las salidas ya no existe; vuelve a cargar la pantalla.';
  END IF;

  -- ¿Ya existe exactamente este mismo grupo? No duplicar: solo se refresca su fecha.
  SELECT f.id INTO v_actual
  FROM public.salida_fusiones f
  JOIN public.salida_fusion_items i ON i.fusion_id = f.id
  GROUP BY f.id
  HAVING array_agg(i.salida_id ORDER BY i.salida_id) = (SELECT array_agg(x ORDER BY x) FROM unnest(v_ids) AS x)
  LIMIT 1;

  IF v_actual IS NOT NULL THEN
    UPDATE public.salida_fusiones SET updated_at = now(), usuario = coalesce(p_usuario, 'Sistema') WHERE id = v_actual;
    RETURN jsonb_build_object(
      'success', true, 'fusion_id', v_actual,
      'codigo', (SELECT codigo FROM public.salida_fusiones WHERE id = v_actual),
      'salida_ids', to_jsonb(v_ids)
    );
  END IF;

  -- Quitar estas salidas de cualquier general anterior y borrar generales que se quedaron con una sola.
  DELETE FROM public.salida_fusion_items WHERE salida_id = ANY(v_ids);
  DELETE FROM public.salida_fusiones f
   WHERE (SELECT count(*) FROM public.salida_fusion_items i WHERE i.fusion_id = f.id) < 2;

  INSERT INTO public.salida_fusiones (codigo, usuario)
  VALUES ('FUS-' || lpad(nextval('public.seq_fusiones_codigo')::text, 4, '0'), coalesce(p_usuario, 'Sistema'))
  RETURNING id, codigo INTO v_fusion_id, v_codigo;

  INSERT INTO public.salida_fusion_items (fusion_id, salida_id)
  SELECT v_fusion_id, x FROM unnest(v_ids) AS x;

  RETURN jsonb_build_object('success', true, 'fusion_id', v_fusion_id, 'codigo', v_codigo, 'salida_ids', to_jsonb(v_ids));
END;
$function$;

-- La X del GENERAL quita UNA salida del grupo guardado (no borra ni edita la salida real).
CREATE OR REPLACE FUNCTION public.fn_desvincular_salida_fusion(
  p_fusion_id bigint,
  p_salida_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_codigo text;
  v_quedan integer;
  v_borrada boolean := false;
BEGIN
  SELECT codigo INTO v_codigo FROM public.salida_fusiones WHERE id = p_fusion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ese general ya no existe.';
  END IF;

  DELETE FROM public.salida_fusion_items
   WHERE fusion_id = p_fusion_id AND salida_id = p_salida_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa salida ya no está en el general.';
  END IF;

  SELECT count(*) INTO v_quedan FROM public.salida_fusion_items WHERE fusion_id = p_fusion_id;
  -- Una fusión necesita al menos dos salidas: si al quitar esta queda una sola, se borra el grupo.
  IF v_quedan < 2 THEN
    DELETE FROM public.salida_fusiones WHERE id = p_fusion_id;
    v_borrada := true;
  ELSE
    UPDATE public.salida_fusiones SET updated_at = now() WHERE id = p_fusion_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'fusion_id', p_fusion_id, 'codigo', v_codigo,
    'quedan', v_quedan, 'general_borrado', v_borrada
  );
END;
$function$;

-- Borrar un general completo sin tocar las salidas.
CREATE OR REPLACE FUNCTION public.fn_eliminar_fusion_salida(p_fusion_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_codigo text;
BEGIN
  SELECT codigo INTO v_codigo FROM public.salida_fusiones WHERE id = p_fusion_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ese general ya no existe.';
  END IF;
  DELETE FROM public.salida_fusiones WHERE id = p_fusion_id;
  RETURN jsonb_build_object('success', true, 'fusion_id', p_fusion_id, 'codigo', v_codigo);
END;
$function$;

-- Misma definición que está en vivo, con las rutas nuevas añadidas (no se pierde ninguna).
CREATE OR REPLACE FUNCTION public.fn_permisos_servicios(p_metodo text, p_ruta text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_ruta = '/bienes_cliente' THEN ARRAY['clientes_editar', 'caja_ver_fiados']
    WHEN p_ruta = '/trabajadores' THEN ARRAY['trabajadores_editar']
    WHEN p_ruta IN ('/salidas', '/salida_trabajadores', '/salida_items', '/salida_devoluciones',
                    '/salida_fusiones', '/salida_fusion_items') THEN ARRAY['salidas_ver']
    WHEN p_ruta IN ('/rpc/fn_registrar_salida', '/rpc/fn_registrar_devolucion', '/rpc/fn_cambiar_estado_salida',
                    '/rpc/fn_editar_salida', '/rpc/fn_eliminar_salida', '/rpc/fn_registrar_devoluciones_lote',
                    '/rpc/fn_quitar_material_salida', '/rpc/fn_eliminar_devolucion',
                    '/rpc/fn_guardar_fusion_salida', '/rpc/fn_desvincular_salida_fusion',
                    '/rpc/fn_eliminar_fusion_salida') THEN ARRAY['salidas_crear']
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

-- En Nego no existe el rol authenticated: los permisos van solo a anon ( igual que salidas ).
GRANT ALL ON public.salida_fusiones TO anon;
GRANT ALL ON public.salida_fusion_items TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.seq_fusiones_codigo TO anon;
GRANT EXECUTE ON FUNCTION public.fn_guardar_fusion_salidas(bigint[], text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_desvincular_salida_fusion(bigint, bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_eliminar_fusion_salida(bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_permisos_servicios(text, text) TO anon;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT 'TABLAS: ' || string_agg(tablename, ', ' ORDER BY tablename)
  FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'salida_fusion%';
SELECT 'PERMISO LECTURA: ' || coalesce(array_to_string(public.fn_permisos_servicios('GET', '/salida_fusiones'), ','), 'NO');
SELECT 'PERMISO GUARDAR: ' || coalesce(array_to_string(public.fn_permisos_servicios('POST', '/rpc/fn_guardar_fusion_salida'), ','), 'NO');
