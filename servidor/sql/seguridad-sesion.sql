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
    -- COMPRAS (Inventario > Compras: listas de pedido y "Recibir pedido", que crea los lotes)
    WHEN 'POST /compras'             THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'PATCH /compras'            THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'DELETE /compras'           THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'POST /compras_detalle'     THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'PATCH /compras_detalle'    THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'DELETE /compras_detalle'   THEN ARRAY['almacen_ingresar_lotes']
    -- Recibir / devolver un pedido: también el permiso "Recibir pedidos" (cajero, solo Compras). Las reglas
    -- finas (sin costos, solo devolver lo propio) están dentro de cada función.
    WHEN 'POST /rpc/fn_recibir_compra'  THEN ARRAY['almacen_ingresar_lotes', 'compras_recibir']
    WHEN 'POST /rpc/fn_devolver_compra' THEN ARRAY['almacen_ingresar_lotes', 'compras_recibir']
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

-- MODO SIN INTERNET: lo que se hace sin conexión (abonos, ingresos/egresos, mermas) lleva una referencia
-- única generada en la PC. Al subirlo, si el servidor ya la tiene (se cortó justo después de enviarlo),
-- no se registra dos veces.
ALTER TABLE public.debt_payments       ADD COLUMN IF NOT EXISTS ref_local text;
ALTER TABLE public.cash_movements      ADD COLUMN IF NOT EXISTS ref_local text;
ALTER TABLE public.waste               ADD COLUMN IF NOT EXISTS ref_local text;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS ref_local text;
CREATE UNIQUE INDEX IF NOT EXISTS debt_payments_ref_local       ON public.debt_payments (ref_local)       WHERE ref_local IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cash_movements_ref_local      ON public.cash_movements (ref_local)      WHERE ref_local IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS waste_ref_local               ON public.waste (ref_local)               WHERE ref_local IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_ref_local ON public.inventory_movements (ref_local) WHERE ref_local IS NOT NULL;

-- COMPRAS (Inventario > Compras): lista de lo que hay que pedir a cada proveedor. Al llegar la mercadería,
-- "Recibir pedido" crea los lotes (como "Ingresar lote") y la compra queda RECIBIDA.
CREATE TABLE IF NOT EXISTS public.compras (
  id            bigint PRIMARY KEY,                     -- lo genera la PC (como los lotes)
  provider_id   text,                                   -- providers.id (puede quedar vacío: "sin proveedor")
  proveedor     text,                                   -- nombre al momento de crearla
  estado        text NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'RECIBIDO', 'ANULADO')),
  notas         text,
  documento     text,                                   -- factura / boleta con que llegó
  autor         text,                                   -- quién la armó
  recibido_por  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  recibido_at   timestamptz
);
CREATE TABLE IF NOT EXISTS public.compras_detalle (
  id                bigserial PRIMARY KEY,
  compra_id         bigint NOT NULL REFERENCES public.compras (id) ON DELETE CASCADE,
  product_id        bigint NOT NULL,
  product_name      text NOT NULL,
  cantidad          numeric NOT NULL DEFAULT 0 CHECK (cantidad >= 0),   -- lo que se pide
  costo_unit        numeric NOT NULL DEFAULT 0 CHECK (costo_unit >= 0), -- costo esperado (último lote)
  cantidad_recibida numeric,                                            -- lo que llegó (al recibir)
  batch_id          bigint                                              -- lote creado al recibir
);
CREATE INDEX IF NOT EXISTS compras_detalle_compra ON public.compras_detalle (compra_id);
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'web_anon'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras, public.compras_detalle TO %I', r);
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.compras_detalle_id_seq TO %I', r);
    END IF;
  END LOOP;
END $$;

-- COMPRAS: recibir y devolver se hacen EN EL SERVIDOR, todo o nada (si se corta, no quedan lotes a medias).
-- Quién lo hizo lo pone el servidor con la sesión: la pantalla no puede mandar otro nombre.
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS recibido_por_id text;

-- Registro de modificaciones de cada pedido (solo lectura para la pantalla: lo escriben el trigger y las funciones)
CREATE TABLE IF NOT EXISTS public.compras_historial (
  id         bigserial PRIMARY KEY,
  compra_id  bigint NOT NULL REFERENCES public.compras (id) ON DELETE CASCADE,
  accion     text NOT NULL,          -- CREADA / EDITADA / ANULADA / RECIBIDA / DEVUELTA
  empleado   text,
  detalle    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compras_historial_compra ON public.compras_historial (compra_id);
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'web_anon'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT SELECT ON public.compras_historial TO %I', r);
    END IF;
  END LOOP;
END $$;

-- Empleado de la sesión del pedido actual (NULL si no hay sesión válida)
CREATE OR REPLACE FUNCTION public.fn_empleado_de_sesion(OUT id text, OUT nombre text, OUT permisos jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text := current_setting('request.headers', true)::json ->> 'x-sesion';
BEGIN
  IF v_token IS NULL OR v_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN;
  END IF;
  SELECT e.id::text, e.nombre, coalesce(e.permisos, '{}'::jsonb) INTO id, nombre, permisos
  FROM sesiones s JOIN empleados e ON e.id = s.empleado_id
  WHERE s.token = v_token::uuid AND e.estado = 'ACTIVO';
END;
$$;

-- Historial automático: creada, editada (lista pendiente que se guarda de nuevo) y anulada.
-- RECIBIDA y DEVUELTA las anotan fn_recibir_compra / fn_devolver_compra con su detalle.
CREATE OR REPLACE FUNCTION public.fn_historial_compras()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nombre text := (SELECT nombre FROM public.fn_empleado_de_sesion());
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO compras_historial (compra_id, accion, empleado, detalle) VALUES (NEW.id, 'CREADA', v_nombre, NEW.proveedor);
  ELSIF NEW.estado = 'ANULADO' AND OLD.estado <> 'ANULADO' THEN
    INSERT INTO compras_historial (compra_id, accion, empleado) VALUES (NEW.id, 'ANULADA', v_nombre);
  ELSIF NEW.estado = 'PENDIENTE' AND OLD.estado = 'PENDIENTE' THEN
    INSERT INTO compras_historial (compra_id, accion, empleado, detalle) VALUES (NEW.id, 'EDITADA', v_nombre, NEW.proveedor);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_historial_compras ON public.compras;
CREATE TRIGGER trg_historial_compras AFTER INSERT OR UPDATE ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.fn_historial_compras();

-- Recibir un pedido: crea un lote por producto que llegó (como "Ingresar lote"), recalcula el stock y deja
-- la compra RECIBIDA. p_items: [{"detalle_id": 1, "cantidad": 10, "costo": 2.5, "vence": "2026-12-31"}].
-- Sin el permiso de almacén (cajero con "Recibir pedidos") el COSTO no se puede cambiar: se usa el de la lista.
CREATE OR REPLACE FUNCTION public.fn_recibir_compra(p_compra_id bigint, p_items jsonb, p_documento text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp record;
  v_almacen boolean;
  v_compra compras%ROWTYPE;
  v_det record;
  v_item jsonb;
  v_cant numeric;
  v_costo numeric;
  v_doc text;
  v_lote bigint := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_stock numeric;
  v_lotes int := 0;
  v_cambios jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  v_almacen := fn_tiene_permiso(v_emp.permisos, ARRAY['almacen_ingresar_lotes']);
  IF NOT v_almacen AND NOT fn_tiene_permiso(v_emp.permisos, ARRAY['compras_recibir']) THEN
    RAISE EXCEPTION 'No tienes permiso para recibir pedidos.';
  END IF;

  SELECT * INTO v_compra FROM compras WHERE id = p_compra_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ese pedido no existe.'; END IF;
  IF v_compra.estado <> 'PENDIENTE' THEN RAISE EXCEPTION 'Este pedido ya no está pendiente (está %).', v_compra.estado; END IF;
  v_doc := coalesce(nullif(trim(p_documento), ''), 'COMPRA #' || right(v_compra.id::text, 6));

  FOR v_det IN SELECT * FROM compras_detalle WHERE compra_id = p_compra_id AND batch_id IS NULL ORDER BY id LOOP
    SELECT x INTO v_item FROM jsonb_array_elements(p_items) x WHERE (x ->> 'detalle_id')::bigint = v_det.id;
    v_cant := greatest(0, coalesce((v_item ->> 'cantidad')::numeric, 0));
    v_costo := CASE WHEN v_almacen AND v_item ? 'costo' THEN greatest(0, (v_item ->> 'costo')::numeric) ELSE v_det.costo_unit END;
    IF v_cant > 0 THEN
      v_lote := v_lote + 1;
      INSERT INTO batches (id, product_id, quantity, initial_quantity, expiration_date, cost_total, cost_unit,
                           document_ref, supplier, provider_id, is_synced, is_active)
      VALUES (v_lote, v_det.product_id, v_cant, v_cant, nullif(v_item ->> 'vence', ''), round(v_cant * v_costo, 2), v_costo,
              v_doc, v_compra.proveedor, v_compra.provider_id, 1, 1);
      INSERT INTO inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                       operation_type, reason, notes, "user", is_synced)
      VALUES (v_lote, v_det.product_id, v_det.product_name, v_cant, 0, v_cant, 'COMPRA', 'Ingreso Lote',
              'Doc: ' || v_doc || ' · Pedido #' || right(v_compra.id::text, 6), v_emp.nombre, 1);
      SELECT coalesce(sum(quantity), 0) INTO v_stock FROM batches WHERE product_id = v_det.product_id AND is_active = 1;
      UPDATE products SET quantity = v_stock WHERE id = v_det.product_id;
      UPDATE compras_detalle SET cantidad_recibida = v_cant, costo_unit = v_costo, batch_id = v_lote WHERE id = v_det.id;
      v_lotes := v_lotes + 1;
      v_cambios := v_cambios || jsonb_build_object('id', v_det.product_id::text, 'quantity', v_stock);
    ELSE
      UPDATE compras_detalle SET cantidad_recibida = 0 WHERE id = v_det.id;
    END IF;
  END LOOP;

  UPDATE compras SET estado = 'RECIBIDO', documento = v_doc, recibido_por = v_emp.nombre, recibido_por_id = v_emp.id,
                     recibido_at = now()
  WHERE id = p_compra_id;
  INSERT INTO compras_historial (compra_id, accion, empleado, detalle)
  VALUES (p_compra_id, 'RECIBIDA', v_emp.nombre, v_lotes || ' lote(s) · ' || v_doc);
  RETURN jsonb_build_object('lotes', v_lotes, 'cambios', v_cambios);
END;
$$;

-- Devolver lo ingresado: retira los lotes de la recepción (fn_soft_delete_batch) y la compra vuelve a PENDIENTE
-- (NO se borra). Solo si esa mercadería no se vendió ni se mermó. Con "Recibir pedidos" (sin permiso de
-- almacén) solo se puede devolver lo que uno mismo recibió.
CREATE OR REPLACE FUNCTION public.fn_devolver_compra(p_compra_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp record;
  v_almacen boolean;
  v_compra compras%ROWTYPE;
  v_det record;
  v_movidos text;
  v_stock numeric;
  v_lotes int := 0;
  v_cambios jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  v_almacen := fn_tiene_permiso(v_emp.permisos, ARRAY['almacen_ingresar_lotes']);
  IF NOT v_almacen AND NOT fn_tiene_permiso(v_emp.permisos, ARRAY['compras_recibir']) THEN
    RAISE EXCEPTION 'No tienes permiso para devolver pedidos.';
  END IF;

  SELECT * INTO v_compra FROM compras WHERE id = p_compra_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ese pedido no existe.'; END IF;
  IF v_compra.estado <> 'RECIBIDO' THEN RAISE EXCEPTION 'Solo se puede devolver un pedido RECIBIDO.'; END IF;
  IF NOT v_almacen AND coalesce(v_compra.recibido_por_id, '') <> v_emp.id THEN
    RAISE EXCEPTION 'Solo puedes devolver los pedidos que tú recibiste. Pide ayuda al administrador.';
  END IF;

  SELECT string_agg('• ' || d.product_name, E'\n') INTO v_movidos
  FROM compras_detalle d LEFT JOIN batches b ON b.id = d.batch_id
  WHERE d.compra_id = p_compra_id AND d.batch_id IS NOT NULL
    AND (b.id IS NULL OR b.is_active <> 1 OR b.quantity < coalesce(d.cantidad_recibida, 0));
  IF v_movidos IS NOT NULL THEN
    RAISE EXCEPTION E'No se puede devolver: estos productos ya se vendieron, se mermaron o su lote se retiró:\n%', v_movidos;
  END IF;

  FOR v_det IN SELECT * FROM compras_detalle WHERE compra_id = p_compra_id AND batch_id IS NOT NULL LOOP
    PERFORM fn_soft_delete_batch(v_det.batch_id::text, v_emp.nombre || ' (devolución pedido #' || right(p_compra_id::text, 6) || ')');
    SELECT coalesce(sum(quantity), 0) INTO v_stock FROM batches WHERE product_id = v_det.product_id AND is_active = 1;
    v_cambios := v_cambios || jsonb_build_object('id', v_det.product_id::text, 'quantity', v_stock);
    v_lotes := v_lotes + 1;
  END LOOP;
  UPDATE compras_detalle SET cantidad_recibida = NULL, batch_id = NULL WHERE compra_id = p_compra_id;
  UPDATE compras SET estado = 'PENDIENTE', documento = NULL, recibido_por = NULL, recibido_por_id = NULL, recibido_at = NULL
  WHERE id = p_compra_id;
  INSERT INTO compras_historial (compra_id, accion, empleado, detalle)
  VALUES (p_compra_id, 'DEVUELTA', v_emp.nombre, v_lotes || ' lote(s) retirado(s); vuelve a PENDIENTES');
  RETURN jsonb_build_object('lotes', v_lotes, 'cambios', v_cambios);
END;
$$;
NOTIFY pgrst, 'reload schema';
