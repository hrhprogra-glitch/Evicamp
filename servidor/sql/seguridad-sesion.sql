-- SiuMax: la API exige una sesión válida en CADA pedido (no solo la pantalla de login).
-- PostgREST llama a esta función antes de atender cualquier pedido (db-pre-request en su .conf).
-- El sistema manda el token de la sesión en la cabecera "x-sesion" (src/db/supabase.ts).
-- Se puede aplicar varias veces sin problema (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.fn_verificar_peticion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ruta   text := current_setting('request.path', true);
  v_metodo text := current_setting('request.method', true);
  v_token  text := current_setting('request.headers', true)::json ->> 'x-sesion';
BEGIN
  -- Sin sesión: iniciar, validar y cerrar sesión, y el aviso de Yape del celular (trae su propia clave)
  IF v_ruta IN ('/rpc/fn_login', '/rpc/fn_validar_sesion', '/rpc/fn_cerrar_sesion',
                '/rpc/fn_registrar_notificacion_yape') THEN
    RETURN;
  END IF;

  -- Sin sesión, solo lectura: nombre y logo del negocio para la pantalla de login
  IF v_ruta = '/empresa_config' AND v_metodo IN ('GET', 'HEAD') THEN
    RETURN;
  END IF;

  -- Todo lo demás: token de una sesión abierta (usada en los últimos 30 días) de un empleado ACTIVO
  IF v_token IS NULL
     OR v_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     OR NOT EXISTS (
       SELECT 1 FROM sesiones s JOIN empleados e ON e.id = s.empleado_id
       WHERE s.token = v_token::uuid AND e.estado = 'ACTIVO'
         AND s.ultimo_uso > now() - interval '30 days'
     ) THEN
    RAISE SQLSTATE 'PT401' USING MESSAGE = 'Sesión no válida', DETAIL = 'Inicia sesión de nuevo.';
  END IF;
END;
$$;

-- La usa PostgREST con el rol anon
GRANT EXECUTE ON FUNCTION public.fn_verificar_peticion() TO anon;

-- Las sesiones vencen tras 30 días SIN USO. El sistema llama a fn_validar_sesion al abrirse y cada hora,
-- así una caja que se usa a diario nunca vence. Las vencidas se borran.
CREATE OR REPLACE FUNCTION public.fn_validar_sesion(p_token uuid)
RETURNS TABLE(id uuid, nombre text, email text, rol text, permisos jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empleado record;
BEGIN
  DELETE FROM sesiones WHERE sesiones.ultimo_uso < now() - interval '30 days';

  SELECT e.id, e.nombre, e.email, e.rol, e.permisos, e.estado INTO v_empleado
  FROM sesiones s JOIN empleados e ON e.id = s.empleado_id
  WHERE s.token = p_token;

  IF v_empleado.id IS NULL OR v_empleado.estado <> 'ACTIVO' THEN
    DELETE FROM sesiones WHERE sesiones.token = p_token;
    RETURN;
  END IF;

  UPDATE sesiones SET ultimo_uso = now() WHERE sesiones.token = p_token;
  RETURN QUERY SELECT v_empleado.id, v_empleado.nombre, v_empleado.email, v_empleado.rol, v_empleado.permisos;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sesion_activa(p_token uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM sesiones s JOIN empleados e ON e.id = s.empleado_id
    WHERE s.token = p_token AND e.estado = 'ACTIVO' AND s.ultimo_uso > now() - interval '30 days'
  );
$$;
