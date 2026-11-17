-- Arreglo solo Nego (17/11/2026): contratos que empiezan a mitad de mes generan visitas.
-- Copia de fn_generar_visitas_contrato de servidor/sql/seguridad-sesion.sql. Repetible.

-- RPC: Generar visitas automáticas para un contrato en un mes/año
CREATE OR REPLACE FUNCTION public.fn_generar_visitas_contrato(
  p_contrato_id bigint,
  p_anio int,
  p_mes int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_con record;
  v_dias int[];
  v_fechas date[] := ARRAY[]::date[];
  v_inicio date;
  v_fin date;
  v_curr date;
  v_visitas_creadas int := 0;
  v_trabajo_id bigint;
  v_dow int;
  v_step int;
  v_titulo text;
  v_descripcion text;
BEGIN
  SELECT * INTO v_con FROM public.contratos WHERE id = p_contrato_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato no encontrado.'; END IF;

  v_inicio := make_date(p_anio, p_mes, 1);
  v_fin := (v_inicio + interval '1 month - 1 day')::date;

  IF v_con.fecha_inicio > v_inicio THEN
    v_inicio := v_con.fecha_inicio;
  END IF;

  IF v_con.fecha_fin IS NOT NULL AND v_con.fecha_fin < v_fin THEN
    v_fin := v_con.fecha_fin;
  END IF;

  IF v_inicio > v_fin THEN
    RETURN jsonb_build_object('ok', true, 'visitas_creadas', 0);
  END IF;

  -- 17/11/2026: si el contrato empieza a mitad de mes, los días fijos (1 y 15, o el día de cobro)
  -- ya pasaron. Antes eso devolvía 0 visitas y no aparecía el botón "Insumos". Ahora se toma
  -- la primera fecha válida desde el inicio del contrato, sin cambiar la frecuencia ni la Agenda.
  IF v_con.frecuencia = 'MENSUAL' THEN
    v_curr := make_date(p_anio, p_mes, least(coalesce(v_con.dia_cobro, 1), extract(day from v_fin)::int));
    IF v_curr < v_inicio THEN
      v_curr := v_inicio;
    END IF;
    IF v_curr <= v_fin THEN
      v_fechas := array_append(v_fechas, v_curr);
    END IF;
    v_titulo := v_con.titulo;
    v_descripcion := 'Visita mensual programada por contrato ' || v_con.codigo;
  ELSIF v_con.frecuencia = 'QUINCENAL' THEN
    FOREACH v_step IN ARRAY ARRAY[1, 15] LOOP
      v_curr := make_date(p_anio, p_mes, least(v_step, extract(day from v_fin)::int));
      IF v_curr >= v_inicio AND v_curr <= v_fin THEN
        v_fechas := array_append(v_fechas, v_curr);
      END IF;
    END LOOP;
    IF coalesce(array_length(v_fechas, 1), 0) = 0 THEN
      v_fechas := array_append(v_fechas, v_inicio);
    END IF;
    v_titulo := v_con.titulo || ' (Quincenal)';
    v_descripcion := 'Visita quincenal programada por contrato ' || v_con.codigo;
  ELSE -- SEMANAL o días específicos
    SELECT array_agg(value::int) INTO v_dias
    FROM jsonb_array_elements_text(coalesce(v_con.dias_semana, '[]'::jsonb));
    IF v_dias IS NULL OR array_length(v_dias, 1) = 0 THEN
      v_dias := ARRAY[1];
    END IF;

    v_curr := v_inicio;
    WHILE v_curr <= v_fin LOOP
      v_dow := extract(isodow from v_curr)::int;
      IF v_dow = ANY(v_dias) THEN
        v_fechas := array_append(v_fechas, v_curr);
      END IF;
      v_curr := v_curr + 1;
    END LOOP;
    v_titulo := v_con.titulo;
    v_descripcion := 'Visita semanal programada por contrato ' || v_con.codigo;
  END IF;

  FOREACH v_curr IN ARRAY v_fechas LOOP
    IF NOT EXISTS (SELECT 1 FROM public.contrato_visitas WHERE contrato_id = p_contrato_id AND fecha_programada = v_curr) THEN
      INSERT INTO public.agenda_trabajos (
        titulo, customer_id, bien_id, direccion, ubicacion, fecha, estado, prioridad, descripcion
      ) VALUES (
        v_titulo, v_con.customer_id, v_con.bien_id, v_con.direccion, v_con.ubicacion,
        v_curr, 'PENDIENTE', 'NORMAL', v_descripcion
      ) RETURNING id INTO v_trabajo_id;

      IF v_con.tecnico_principal_id IS NOT NULL THEN
        INSERT INTO public.agenda_trabajadores (trabajo_id, trabajador_id)
        VALUES (v_trabajo_id, v_con.tecnico_principal_id) ON CONFLICT DO NOTHING;
      END IF;

      INSERT INTO public.contrato_visitas (
        contrato_id, agenda_trabajo_id, fecha_programada, tecnico_id, estado
      ) VALUES (
        p_contrato_id, v_trabajo_id, v_curr, v_con.tecnico_principal_id, 'PENDIENTE'
      );
      v_visitas_creadas := v_visitas_creadas + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'visitas_creadas', v_visitas_creadas);
END;
$function$;
