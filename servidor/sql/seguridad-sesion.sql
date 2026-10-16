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

  -- Todo lo demás: token de una sesión abierta de un empleado ACTIVO
  IF v_token IS NULL
     OR v_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     OR NOT EXISTS (
       SELECT 1 FROM sesiones s JOIN empleados e ON e.id = s.empleado_id
       WHERE s.token = v_token::uuid AND e.estado = 'ACTIVO'
     ) THEN
    RAISE SQLSTATE 'PT401' USING MESSAGE = 'Sesión no válida', DETAIL = 'Inicia sesión de nuevo.';
  END IF;
END;
$$;

-- La usa PostgREST con el rol anon
GRANT EXECUTE ON FUNCTION public.fn_verificar_peticion() TO anon;
