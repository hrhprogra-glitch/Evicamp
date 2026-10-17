-- SiuMax: la API exige una sesión válida en CADA pedido (no solo la pantalla de login), y para
-- crear / cambiar / borrar datos, que el empleado tenga el PERMISO de esa acción (no basta con que la
-- pantalla esconda el botón). Leer sigue permitido a cualquiera con sesión.
-- PostgREST llama a fn_verificar_peticion antes de atender cualquier pedido (db-pre-request en su .conf).
-- El sistema manda el token de la sesión en la cabecera "x-sesion" (src/db/supabase.ts).
-- Se puede aplicar varias veces sin problema (CREATE OR REPLACE).

-- ¿Tiene alguno de estos permisos? (acceso total los incluye todos; lista vacía = basta la sesión)
CREATE OR REPLACE FUNCTION public.fn_tiene_permiso(p_permisos jsonb, p_claves text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT cardinality(p_claves) = 0
      OR coalesce(p_permisos ->> 'sistema_acceso_total', '') = 'true'
      OR EXISTS (SELECT 1 FROM unnest(p_claves) c WHERE coalesce(p_permisos ->> c, '') = 'true');
$$;

-- Qué permiso pide cada acción que cambia datos (una de la lista basta).
-- NULL = acción desconocida: solo un administrador con acceso total.
CREATE OR REPLACE FUNCTION public.fn_permisos_requeridos(p_metodo text, p_ruta text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_metodo || ' ' || p_ruta
    -- CAJA
    WHEN 'POST /sales'               THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'POST /sale_details'        THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'POST /fiados'              THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'PATCH /fiados'             THEN ARRAY['caja_realizar_ventas', 'caja_cobrar_deudas']
    WHEN 'POST /customers'           THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'PATCH /customers'          THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados', 'caja_cobrar_deudas']
    WHEN 'DELETE /customers'         THEN ARRAY['caja_ver_fiados']
    WHEN 'POST /debt_payments'       THEN ARRAY['caja_cobrar_deudas']
    WHEN 'POST /cash_sessions'       THEN ARRAY['caja_abrir_cerrar_turno']
    WHEN 'PATCH /cash_sessions'      THEN ARRAY['caja_abrir_cerrar_turno']
    WHEN 'POST /cash_movements'      THEN ARRAY['caja_ingresos_egresos', 'caja_abrir_cerrar_turno', 'reportes_anular_ventas']
    WHEN 'DELETE /cash_movements'    THEN ARRAY['caja_ingresos_egresos', 'caja_cobrar_deudas', 'reportes_anular_ventas']
    -- ANULAR VENTAS (devuelve el stock: toca productos, lotes y movimientos)
    WHEN 'PATCH /sales'              THEN ARRAY['reportes_anular_ventas']
    WHEN 'DELETE /sales'             THEN ARRAY['reportes_anular_ventas']
    -- ALMACÉN
    WHEN 'POST /products'            THEN ARRAY['almacen_crear_editar_productos']
    WHEN 'PATCH /products'           THEN ARRAY['almacen_crear_editar_productos', 'almacen_modificar_precios', 'reportes_anular_ventas']
    WHEN 'POST /categories'          THEN ARRAY['almacen_crear_editar_productos']
    WHEN 'DELETE /categories'        THEN ARRAY['almacen_crear_editar_productos']
    WHEN 'POST /batches'             THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'PATCH /batches'            THEN ARRAY['almacen_ingresar_lotes', 'almacen_registrar_mermas', 'reportes_anular_ventas']
    WHEN 'POST /inventory_movements' THEN ARRAY['almacen_ingresar_lotes', 'almacen_registrar_mermas', 'reportes_anular_ventas']
    WHEN 'POST /waste'               THEN ARRAY['almacen_registrar_mermas']
    WHEN 'PATCH /waste'              THEN ARRAY['almacen_registrar_mermas']
    WHEN 'DELETE /waste'             THEN ARRAY['almacen_registrar_mermas']
    WHEN 'POST /providers'           THEN ARRAY['almacen_gestionar_proveedores', 'almacen_crear_editar_productos', 'almacen_ingresar_lotes']
    WHEN 'PATCH /providers'          THEN ARRAY['almacen_gestionar_proveedores', 'almacen_crear_editar_productos']
    WHEN 'DELETE /providers'         THEN ARRAY['almacen_gestionar_proveedores']
    WHEN 'POST /rpc/fn_edit_batch'          THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'POST /rpc/fn_soft_delete_batch'   THEN ARRAY['almacen_ingresar_lotes', 'almacen_eliminar_productos']
    WHEN 'POST /rpc/fn_soft_delete_product' THEN ARRAY['almacen_eliminar_productos']
    -- GERENCIA
    WHEN 'PATCH /empresa_config'     THEN ARRAY['gerencia_configuracion_sistema']
    WHEN 'POST /empresa_config'      THEN ARRAY['gerencia_configuracion_sistema']
    WHEN 'POST /rpc/fn_crear_empleado'    THEN ARRAY['gerencia_gestionar_usuarios']
    WHEN 'POST /rpc/fn_editar_empleado'   THEN ARRAY['gerencia_gestionar_usuarios']
    WHEN 'POST /rpc/fn_eliminar_empleado' THEN ARRAY['gerencia_gestionar_usuarios']
    -- Basta con la sesión
    WHEN 'PATCH /yape_notifications' THEN ARRAY[]::text[]
    WHEN 'POST /rpc/fn_sesion_activa' THEN ARRAY[]::text[]
    ELSE NULL
  END;
$$;

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
  v_permisos   jsonb;
  v_requeridos text[];
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
  IF v_token IS NOT NULL
     AND v_token ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    SELECT e.permisos INTO v_permisos
    FROM sesiones s JOIN empleados e ON e.id = s.empleado_id
    WHERE s.token = v_token::uuid AND e.estado = 'ACTIVO'
      AND s.ultimo_uso > now() - interval '30 days';
  END IF;
  IF v_permisos IS NULL THEN
    RAISE SQLSTATE 'PT401' USING MESSAGE = 'Sesión no válida', DETAIL = 'Inicia sesión de nuevo.';
  END IF;

  -- Leer: basta la sesión
  IF v_metodo IN ('GET', 'HEAD') THEN
    RETURN;
  END IF;

  -- Crear / cambiar / borrar: el permiso de esa acción
  v_requeridos := fn_permisos_requeridos(v_metodo, v_ruta);
  IF NOT fn_tiene_permiso(v_permisos, coalesce(v_requeridos, ARRAY['sistema_acceso_total'])) THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE = 'No tienes permiso para esta acción',
      DETAIL = 'Pide al administrador que te dé el permiso en Ajustes > Gestión de usuarios.';
  END IF;
END;
$$;

-- Cambiar precios (venta, costo o descuento) pide el permiso "modificar precios", aunque se haga desde
-- el formulario de editar producto. Solo revisa cambios que llegan por la API (con sesión).
CREATE OR REPLACE FUNCTION public.fn_proteger_precios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text := current_setting('request.headers', true)::json ->> 'x-sesion';
  v_permisos jsonb;
BEGIN
  IF NEW.price IS NOT DISTINCT FROM OLD.price
     AND NEW.cost_price IS NOT DISTINCT FROM OLD.cost_price
     AND NEW.discount_percent IS NOT DISTINCT FROM OLD.discount_percent THEN
    RETURN NEW;
  END IF;
  IF v_token IS NULL OR v_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN NEW;   -- cambio interno del servidor (no viene del sistema)
  END IF;
  SELECT e.permisos INTO v_permisos FROM sesiones s JOIN empleados e ON e.id = s.empleado_id WHERE s.token = v_token::uuid;
  IF NOT fn_tiene_permiso(v_permisos, ARRAY['almacen_modificar_precios']) THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE = 'No tienes permiso para cambiar precios',
      DETAIL = 'Pide al administrador el permiso "Modificar precios".';
  END IF;
  RETURN NEW;
END;
$$;

-- Cada movimiento de caja (devoluciones, ingresos, egresos, abonos) guarda QUIÉN lo hizo, tomado de la
-- sesión en el servidor (no se puede falsear desde la pantalla). Se ve en Finanzas: "... · por Juan Pérez".
CREATE OR REPLACE FUNCTION public.fn_registrar_autor_caja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text := current_setting('request.headers', true)::json ->> 'x-sesion';
  v_nombre text;
BEGIN
  IF v_token IS NULL OR v_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN NEW;   -- movimiento interno del servidor
  END IF;
  SELECT e.nombre INTO v_nombre FROM sesiones s JOIN empleados e ON e.id = s.empleado_id WHERE s.token = v_token::uuid;
  IF v_nombre IS NOT NULL AND coalesce(NEW.description, '') NOT LIKE '% · por %' THEN
    NEW.description := concat_ws(' · por ', nullif(NEW.description, ''), v_nombre);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_autor_caja ON public.cash_movements;
CREATE TRIGGER trg_registrar_autor_caja BEFORE INSERT ON public.cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_autor_caja();

-- Cada venta guarda QUIÉN la hizo (sale en el ticket y en el registro de ventas). Lo pone el servidor con
-- la sesión: aunque la pantalla mande otro nombre, se reemplaza por el del empleado que tiene la sesión.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vendedor text;

CREATE OR REPLACE FUNCTION public.fn_registrar_vendedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text := current_setting('request.headers', true)::json ->> 'x-sesion';
BEGIN
  IF v_token IS NOT NULL AND v_token ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    SELECT e.nombre INTO NEW.vendedor FROM sesiones s JOIN empleados e ON e.id = s.empleado_id WHERE s.token = v_token::uuid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_vendedor ON public.sales;
CREATE TRIGGER trg_registrar_vendedor BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_vendedor();

-- Borrar ventas y devoluciones borra la evidencia: una venta COMPLETADA no se borra (primero se anula con la
-- devolución), y una venta anulada o un movimiento de devolución solo los borra un administrador (acceso total).
CREATE OR REPLACE FUNCTION public.fn_proteger_borrados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text := current_setting('request.headers', true)::json ->> 'x-sesion';
  v_permisos jsonb;
  v_fila jsonb := to_jsonb(OLD);   -- sirve para las dos tablas (cada una tiene columnas distintas)
BEGIN
  IF v_token IS NULL OR v_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN OLD;   -- borrado interno del servidor
  END IF;
  IF TG_TABLE_NAME = 'sales' AND coalesce(v_fila ->> 'sunat_status', '') <> 'ANULADO' THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE = 'Primero haz la devolución de esta venta',
      DETAIL = 'Una venta completada no se borra: se anula (devolución) para que el stock y la caja cuadren.';
  END IF;
  IF TG_TABLE_NAME = 'sales' OR coalesce(v_fila ->> 'flujo', '') = 'DEVOLUCION' THEN
    SELECT e.permisos INTO v_permisos FROM sesiones s JOIN empleados e ON e.id = s.empleado_id WHERE s.token = v_token::uuid;
    IF NOT fn_tiene_permiso(v_permisos, ARRAY['sistema_acceso_total']) THEN
      RAISE SQLSTATE 'PT403' USING MESSAGE = 'Solo un administrador puede borrar ventas o devoluciones',
        DETAIL = 'Borrarlas elimina el registro de lo que pasó en la caja.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_borrado_ventas ON public.sales;
CREATE TRIGGER trg_proteger_borrado_ventas BEFORE DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_borrados();
DROP TRIGGER IF EXISTS trg_proteger_borrado_caja ON public.cash_movements;
CREATE TRIGGER trg_proteger_borrado_caja BEFORE DELETE ON public.cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_borrados();

-- PostgREST: que vea la columna nueva sin reiniciar
NOTIFY pgrst, 'reload schema';

DROP TRIGGER IF EXISTS trg_proteger_precios ON public.products;
CREATE TRIGGER trg_proteger_precios BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_precios();

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
