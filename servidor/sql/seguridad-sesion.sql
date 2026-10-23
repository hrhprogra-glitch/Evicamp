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
    WHEN 'POST /rpc/fn_anular_venta' THEN ARRAY['reportes_anular_ventas']
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
    -- Toma de inventario (fase 2.2): contar a ciegas y dejar la merma o el sobrante (fn_registrar_conteo)
    WHEN 'POST /rpc/fn_registrar_conteo' THEN ARRAY['inventario_contar']
    -- Corregir el motivo o la justificación de un conteo (sin tocar la cantidad): quien revisa Mermas
    WHEN 'POST /rpc/fn_editar_conteo'    THEN ARRAY['almacen_registrar_mermas']
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
  IF v_compra.estado <> 'PENDIENTE' THEN
    -- Recepción hecha SIN INTERNET que se vuelve a mandar (se cortó justo después de llegar): sus lotes, con los
    -- números que puso la PC (lote_id), ya existen → ya está hecha, no es un error (src/utils/sinInternet.ts)
    IF v_compra.estado = 'RECIBIDO'
       AND EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) x WHERE x ? 'lote_id')
       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) x
                       WHERE x ? 'lote_id' AND NOT EXISTS (SELECT 1 FROM batches b WHERE b.id = (x ->> 'lote_id')::bigint)) THEN
      RETURN jsonb_build_object('lotes', 0, 'cambios', '[]'::jsonb, 'ya_recibido', true);
    END IF;
    RAISE EXCEPTION 'Este pedido ya no está pendiente (está %).', v_compra.estado;
  END IF;
  v_doc := coalesce(nullif(trim(p_documento), ''), 'COMPRA #' || right(v_compra.id::text, 6));

  FOR v_det IN SELECT * FROM compras_detalle WHERE compra_id = p_compra_id AND batch_id IS NULL ORDER BY id LOOP
    SELECT x INTO v_item FROM jsonb_array_elements(p_items) x WHERE (x ->> 'detalle_id')::bigint = v_det.id;
    v_cant := greatest(0, coalesce((v_item ->> 'cantidad')::numeric, 0));
    v_costo := CASE WHEN v_almacen AND v_item ? 'costo' THEN greatest(0, (v_item ->> 'costo')::numeric) ELSE v_det.costo_unit END;
    IF v_cant > 0 THEN
      -- Sin internet la PC ya le puso número al lote (lote_id): se usa ese, así coincide con lo que se vio
      v_lote := coalesce(nullif(v_item ->> 'lote_id', '')::bigint, v_lote + 1);
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

-- Al vender (cada línea de sale_details) se descuenta el stock del producto y de sus lotes, del más antiguo
-- al más nuevo, y queda un movimiento VENTA por cada lote tocado. Es la misma regla de siempre (antes solo
-- vivía en la base) con UNA protección nueva: si ese producto de ese ticket YA se descontó (por ejemplo,
-- si se vuelven a cargar ventas antiguas, como el reproceso del 01/04/2026 que descontó 726 ventas dos
-- veces), no se descuenta otra vez. Dos líneas legítimas del mismo producto en un ticket se descuentan las dos.
CREATE INDEX IF NOT EXISTS idx_movimientos_producto_tipo ON public.inventory_movements (product_id, operation_type);

CREATE OR REPLACE FUNCTION public.fn_reduce_stock_from_sales()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_qty_to_deduct numeric;
  v_current_stock numeric;
  v_batch_record record;
  v_deducted numeric;
  v_is_consumo boolean;
  v_costo_real numeric := 0;
  v_ya_descontado numeric;
  v_en_lineas numeric;
BEGIN
  BEGIN
    SELECT (coalesce(unit, '') = 'CONSUMO' OR coalesce(control_type, '') = 'CONSUMPTION')
    INTO v_is_consumo
    FROM public.products WHERE id = NEW.product_id;

    IF v_is_consumo = TRUE THEN
      RETURN NEW;
    END IF;

    v_qty_to_deduct := abs(coalesce(NEW.quantity, 0));
    IF v_qty_to_deduct = 0 THEN
      RETURN NEW;
    END IF;

    -- ¿Ya se descontó? Lo descontado de este producto en este ticket ("Ticket #N", o "Doc: B001-000N" de las
    -- ventas del sistema anterior) contra lo que suman sus líneas ya guardadas más esta.
    SELECT coalesce(sum(-change_amount), 0) INTO v_ya_descontado
    FROM public.inventory_movements
    WHERE product_id = NEW.product_id AND operation_type = 'VENTA'
      AND (notes = 'Ticket #' || NEW.sale_id::text OR notes ~ ('^Doc: B001-0*' || NEW.sale_id::text || '$'));
    IF v_ya_descontado > 0 THEN
      SELECT coalesce(sum(abs(quantity)), 0) INTO v_en_lineas
      FROM public.sale_details WHERE sale_id = NEW.sale_id AND product_id = NEW.product_id;
      IF v_ya_descontado >= v_en_lineas + v_qty_to_deduct THEN
        RAISE WARNING 'Venta % producto %: ya estaba descontada, no se descuenta otra vez', NEW.sale_id, NEW.product_id;
        RETURN NEW;
      END IF;
    END IF;

    UPDATE public.products
    SET quantity = coalesce(quantity, 0) - v_qty_to_deduct
    WHERE id = NEW.product_id
    RETURNING coalesce(quantity, 0) INTO v_current_stock;

    FOR v_batch_record IN
      SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost
      FROM public.batches
      WHERE product_id = NEW.product_id AND coalesce(quantity, 0) > 0
      ORDER BY created_at ASC, id ASC
      FOR UPDATE
    LOOP
      IF v_qty_to_deduct <= 0 THEN EXIT; END IF;

      IF v_batch_record.qty >= v_qty_to_deduct THEN
        UPDATE public.batches SET quantity = (v_batch_record.qty - v_qty_to_deduct) WHERE id = v_batch_record.id;
        v_deducted := v_qty_to_deduct;
        v_qty_to_deduct := 0;
      ELSE
        UPDATE public.batches SET quantity = 0 WHERE id = v_batch_record.id;
        v_deducted := v_batch_record.qty;
        v_qty_to_deduct := v_qty_to_deduct - v_batch_record.qty;
      END IF;

      -- Costo real del lote: Utilidades lo usa sin tener que adivinar
      v_costo_real := v_batch_record.cost;

      INSERT INTO public.inventory_movements (
        batch_id, product_id, product_name, change_amount,
        previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
      ) VALUES (
        v_batch_record.id, NEW.product_id, NEW.product_name, -v_deducted,
        (v_current_stock + v_deducted), v_current_stock,
        'VENTA', 'Venta POS', 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
      );
    END LOOP;

    -- Lo que no salió de ningún lote (producto con stock pero sin lotes) también queda en el kardex; así
    -- anular la venta (Finanzas) también devuelve ese stock
    IF v_qty_to_deduct > 0 THEN
      INSERT INTO public.inventory_movements (
        batch_id, product_id, product_name, change_amount,
        previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
      ) VALUES (
        NULL, NEW.product_id, NEW.product_name, -v_qty_to_deduct,
        (v_current_stock + v_qty_to_deduct), v_current_stock,
        'VENTA', 'Venta POS (sin lote)', 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
      );
    END IF;

    IF v_costo_real > 0 THEN
      NEW.cost_at_moment := v_costo_real;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- La venta se guarda igual, pero el error queda en el kardex (antes pasaba en silencio)
    RAISE WARNING 'Error interno al reducir stock: %', SQLERRM;
    BEGIN
      INSERT INTO public.inventory_movements (
        product_id, product_name, change_amount, previous_quantity, new_quantity,
        operation_type, reason, notes, created_at, "user", is_synced
      ) VALUES (
        NEW.product_id, NEW.product_name, 0, 0, 0, 'ERROR', 'Error al descontar stock',
        'Ticket #' || NEW.sale_id::text || ': ' || left(SQLERRM, 200), now(), 'Sistema', 1
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  RETURN NEW;
END;
$$;

-- Kardex y mermas: cada movimiento guarda QUIÉN lo hizo, tomado de la sesión (antes la pantalla mandaba
-- "Sistema" y quedaba "postgres"). Sin sesión (servidor, scripts) se respeta el nombre que traiga.
CREATE OR REPLACE FUNCTION public.fn_registrar_autor_inventario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nombre text := (SELECT nombre FROM public.fn_empleado_de_sesion());
BEGIN
  IF v_nombre IS NOT NULL THEN
    NEW."user" := v_nombre;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autor_movimiento ON public.inventory_movements;
CREATE TRIGGER trg_autor_movimiento BEFORE INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_autor_inventario();
DROP TRIGGER IF EXISTS trg_autor_merma ON public.waste;
CREATE TRIGGER trg_autor_merma BEFORE INSERT ON public.waste
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_autor_inventario();

-- Turnos: cada caja guarda quién la abrió y quién la cerró (para saber quién trabajaba cuando hubo una
-- merma o una diferencia de inventario)
ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS abierta_por text;
ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS cerrada_por text;

CREATE OR REPLACE FUNCTION public.fn_registrar_turno_caja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nombre text := (SELECT nombre FROM public.fn_empleado_de_sesion());
BEGIN
  IF v_nombre IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.abierta_por := v_nombre;
  ELSIF NEW.status = 'CLOSED' AND coalesce(OLD.status, '') <> 'CLOSED' THEN
    NEW.cerrada_por := v_nombre;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turno_caja ON public.cash_sessions;
CREATE TRIGGER trg_turno_caja BEFORE INSERT OR UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_turno_caja();

-- Anular una venta (Finanzas): devuelve a cada lote y al producto lo que se descontó (según sus movimientos
-- VENTA), deja el movimiento ANULACION, marca la venta y su fiado como ANULADO y, si hay caja abierta y no
-- era fiado, registra el egreso de la devolución. Todo junto en el servidor (antes eran pasos sueltos desde
-- la pantalla: un corte a la mitad dejaba la anulación a medias, y sin internet no se sabía de qué lotes
-- devolver una venta hecha sin internet). Si ya estaba anulada no hace nada (reintento sin internet).
CREATE OR REPLACE FUNCTION public.fn_anular_venta(p_sale_id bigint, p_sesion_caja text DEFAULT NULL, p_pidio text DEFAULT NULL,
                                                  p_cuando timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp record;
  v_venta sales%ROWTYPE;
  v_mov record;
  v_cant numeric;
  v_nuevo numeric;
  v_fiados int;
  v_productos int := 0;
  v_cuando timestamptz := coalesce(p_cuando, now());   -- sin internet: la hora en que se anuló en la caja
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF NOT fn_tiene_permiso(v_emp.permisos, ARRAY['reportes_anular_ventas']) THEN
    RAISE EXCEPTION 'No tienes permiso para anular ventas.';
  END IF;

  SELECT * INTO v_venta FROM sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la venta.'; END IF;
  IF v_venta.sunat_status = 'ANULADO' THEN RETURN jsonb_build_object('ya_anulada', true); END IF;

  FOR v_mov IN SELECT * FROM inventory_movements
               WHERE operation_type = 'VENTA' AND notes = 'Ticket #' || p_sale_id::text ORDER BY id LOOP
    v_cant := abs(coalesce(v_mov.change_amount, 0));
    IF v_cant <= 0 THEN CONTINUE; END IF;
    IF v_mov.batch_id IS NOT NULL THEN
      UPDATE batches SET quantity = coalesce(quantity, 0) + v_cant WHERE id = v_mov.batch_id;
    END IF;
    UPDATE products SET quantity = coalesce(quantity, 0) + v_cant WHERE id = v_mov.product_id
    RETURNING quantity INTO v_nuevo;
    INSERT INTO inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                     operation_type, reason, notes, created_at, "user", is_synced)
    VALUES (v_mov.batch_id, v_mov.product_id, v_mov.product_name, v_cant, coalesce(v_nuevo, 0) - v_cant, coalesce(v_nuevo, 0),
            'ANULACION', 'Anulación de venta', 'Anulación Ticket #' || p_sale_id::text, v_cuando, v_emp.nombre, 1);
    v_productos := v_productos + 1;
  END LOOP;

  UPDATE sales SET sunat_status = 'ANULADO' WHERE id = p_sale_id;
  UPDATE fiados SET status = 'ANULADO' WHERE sale_id = p_sale_id;
  GET DIAGNOSTICS v_fiados = ROW_COUNT;

  IF p_sesion_caja IS NOT NULL AND v_fiados = 0 THEN
    -- El autor (quien autorizó) lo agrega trg_registrar_autor_caja ("· por ..."); aquí también quién lo pidió
    INSERT INTO cash_movements (id, session_id, type, amount, description, payment_type, flujo, created_at, is_synced)
    VALUES ((extract(epoch FROM clock_timestamp()) * 1000)::bigint, p_sesion_caja, 'EGRESO',
            coalesce(v_venta.amount_cash, 0) + coalesce(v_venta.amount_yape, 0) + coalesce(v_venta.amount_card, 0),
            'Devolución (Anulación Ticket #' || right(p_sale_id::text, 6) || ')' || coalesce(' · pidió ' || p_pidio, ''),
            'EFECTIVO', 'DEVOLUCION', v_cuando, 1);
  END IF;
  RETURN jsonb_build_object('ya_anulada', false, 'productos', v_productos);
END;
$$;

-- Borrar un producto SIEMPRE queda en el kardex, aunque su stock ya fuera 0 (antes solo si tenía stock,
-- y no se sabía cuándo se borró). Igual que antes en todo lo demás.
CREATE OR REPLACE FUNCTION public.fn_soft_delete_product(p_product_id text, p_user_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_name text;
  v_total_qty numeric;
BEGIN
  SELECT name, quantity INTO v_product_name, v_total_qty
  FROM public.products
  WHERE id = p_product_id::bigint;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto ID % no encontrado.', p_product_id;
  END IF;

  UPDATE public.products
  SET is_active = '0', quantity = 0
  WHERE id = p_product_id::bigint;

  UPDATE public.batches
  SET is_active = 0, quantity = 0
  WHERE product_id = p_product_id::bigint;

  INSERT INTO public.inventory_movements (
    product_id, product_name, change_amount, previous_quantity, new_quantity,
    operation_type, reason, "user", created_at, is_synced
  ) VALUES (
    p_product_id::bigint, v_product_name, -coalesce(v_total_qty, 0), coalesce(v_total_qty, 0), 0,
    'AJUSTE', 'Eliminación del sistema (Soft Delete)', p_user_name, now(), '1'
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- TOMA DE INVENTARIO (fase 2.2): el empleado cuenta A CIEGAS y la diferencia se aplica al instante, sin
-- límite y sin aprobación. El control es que el motivo y la justificación son obligatorios y queda quién,
-- cuándo y en qué turno (trg_autor_merma y cash_sessions.abierta_por / cerrada_por): el admin lo revisa en
-- Mermas. Lo que FALTA es una merma (sale de los lotes más antiguos, igual que la venta); lo que SOBRA es un
-- sobrante: la misma tabla con la cantidad en positivo (entra al último lote).
ALTER TABLE public.waste ADD COLUMN IF NOT EXISTS origen text;              -- 'CONTEO' (vacío = merma a mano)
ALTER TABLE public.waste ADD COLUMN IF NOT EXISTS conteo_sistema numeric;   -- lo que decía el sistema
ALTER TABLE public.waste ADD COLUMN IF NOT EXISTS conteo_contado numeric;   -- lo que contó el empleado

-- Después de contar, la suma de los lotes queda IGUAL al stock del producto (Inventario muestra la suma de los
-- lotes y la venta usa el stock del producto: si no coincidían, como pasó con CERVILLETA, el conteo los cuadra).
-- Si faltan unidades en los lotes entran al último; si sobran salen de los más antiguos. El stock no cambia.
CREATE OR REPLACE FUNCTION public.fn_cuadrar_lotes_conteo(p_product_id bigint, p_quien text, p_cuando timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stock numeric;
  v_suma numeric;
  v_resto numeric;
  v_toma numeric;
  v_lote record;
  v_nombre text;
BEGIN
  SELECT coalesce(quantity, 0), name INTO v_stock, v_nombre FROM products WHERE id = p_product_id;
  SELECT coalesce(sum(coalesce(quantity, 0)), 0) INTO v_suma FROM batches WHERE product_id = p_product_id AND coalesce(is_active, 1) <> 0;
  IF v_suma = v_stock OR NOT EXISTS (SELECT 1 FROM batches WHERE product_id = p_product_id AND coalesce(is_active, 1) <> 0) THEN
    RETURN;
  END IF;
  IF v_suma < v_stock THEN
    SELECT id INTO v_lote FROM batches WHERE product_id = p_product_id AND coalesce(is_active, 1) <> 0
    ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE;
    UPDATE batches SET quantity = coalesce(quantity, 0) + (v_stock - v_suma) WHERE id = v_lote.id;
    INSERT INTO inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                     operation_type, reason, notes, created_at, "user", is_synced)
    VALUES (v_lote.id, p_product_id, v_nombre, 0, v_stock, v_stock, 'AJUSTE', 'Cuadre de lotes (conteo)',
            'Lote +' || (v_stock - v_suma)::text || ': los lotes no sumaban el stock', p_cuando, p_quien, 1);
  ELSE
    v_resto := v_suma - v_stock;
    FOR v_lote IN SELECT id, coalesce(quantity, 0) AS qty FROM batches
                  WHERE product_id = p_product_id AND coalesce(is_active, 1) <> 0 AND coalesce(quantity, 0) > 0
                  ORDER BY created_at ASC, id ASC FOR UPDATE LOOP
      EXIT WHEN v_resto <= 0;
      v_toma := least(v_lote.qty, v_resto);
      UPDATE batches SET quantity = v_lote.qty - v_toma WHERE id = v_lote.id;
      INSERT INTO inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                       operation_type, reason, notes, created_at, "user", is_synced)
      VALUES (v_lote.id, p_product_id, v_nombre, 0, v_stock, v_stock, 'AJUSTE', 'Cuadre de lotes (conteo)',
              'Lote -' || v_toma::text || ': los lotes sumaban más que el stock', p_cuando, p_quien, 1);
      v_resto := v_resto - v_toma;
    END LOOP;
  END IF;
END;
$$;

-- p_diferencia: la que el empleado VIO al contar y justificó (ModalTomaInventario); sin internet viaja así hasta
-- que se sube, y las ventas hechas entre el conteo y la subida no se pierden. Si va NULL se calcula aquí.
CREATE OR REPLACE FUNCTION public.fn_registrar_conteo(p_product_id bigint, p_contado numeric, p_motivo text DEFAULT NULL,
                                                      p_justificacion text DEFAULT NULL, p_diferencia numeric DEFAULT NULL,
                                                      p_cuando timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp record;
  v_prod record;
  v_lote record;
  v_dif numeric;
  v_falta numeric;
  v_toma numeric;
  v_stock numeric;
  v_cuando timestamptz := coalesce(p_cuando, now());
  v_motivo text := upper(trim(coalesce(p_motivo, '')));
  v_just text := trim(coalesce(p_justificacion, ''));
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF NOT fn_tiene_permiso(v_emp.permisos, ARRAY['inventario_contar']) THEN
    RAISE EXCEPTION 'No tienes permiso para contar inventario.';
  END IF;
  IF p_contado IS NULL OR p_contado < 0 THEN RAISE EXCEPTION 'Escribe cuánto contaste (0 o más).'; END IF;

  SELECT id, name, coalesce(quantity, 0) AS quantity INTO v_prod FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró el producto.'; END IF;
  v_dif := coalesce(p_diferencia, p_contado - v_prod.quantity);
  v_dif := greatest(v_dif, -v_prod.quantity);   -- el stock nunca queda negativo

  -- Cuadra: solo queda en el kardex que se contó (sin motivo)
  IF v_dif = 0 THEN
    INSERT INTO inventory_movements (product_id, product_name, change_amount, previous_quantity, new_quantity,
                                     operation_type, reason, notes, created_at, "user", is_synced)
    VALUES (v_prod.id, v_prod.name, 0, v_prod.quantity, v_prod.quantity, 'CONTEO', 'Conteo sin diferencia',
            'Contó ' || p_contado::text, v_cuando, v_emp.nombre, 1);
    PERFORM fn_cuadrar_lotes_conteo(p_product_id, v_emp.nombre, v_cuando);
    RETURN jsonb_build_object('diferencia', 0, 'sistema', v_prod.quantity, 'contado', p_contado);
  END IF;

  IF v_motivo = '' THEN RAISE EXCEPTION 'Elige el motivo de la diferencia.'; END IF;
  IF length(v_just) < 3 THEN RAISE EXCEPTION 'Escribe la justificación de la diferencia.'; END IF;

  IF v_dif < 0 THEN
    -- FALTA: merma, sacada de los lotes más antiguos con stock (como la venta); lo que no está en ningún lote
    -- (producto con stock pero sin lotes) queda en una merma sin lote
    v_falta := -v_dif;
    v_stock := v_prod.quantity;
    FOR v_lote IN SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost FROM batches
                  WHERE product_id = p_product_id AND coalesce(quantity, 0) > 0 AND coalesce(is_active, 1) <> 0
                  ORDER BY created_at ASC, id ASC FOR UPDATE LOOP
      EXIT WHEN v_falta <= 0;
      v_toma := least(v_lote.qty, v_falta);
      UPDATE batches SET quantity = v_lote.qty - v_toma WHERE id = v_lote.id;
      -- El stock del producto lo baja el trigger tr_waste_reduce (quantity en negativo)
      INSERT INTO waste (batch_id, product_id, product_name, quantity, cost_unit, total_loss, reason, notes, created_at,
                         is_synced, previous_quantity, new_quantity, origen, conteo_sistema, conteo_contado)
      VALUES (v_lote.id, v_prod.id, v_prod.name, -v_toma, v_lote.cost, round(v_toma * v_lote.cost, 2), v_motivo, v_just,
              v_cuando, 1, v_stock, v_stock - v_toma, 'CONTEO', v_prod.quantity, p_contado);
      INSERT INTO inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                       operation_type, reason, notes, created_at, "user", is_synced)
      VALUES (v_lote.id, v_prod.id, v_prod.name, -v_toma, v_stock, v_stock - v_toma, 'MERMA', 'Conteo: ' || v_motivo,
              v_just, v_cuando, v_emp.nombre, 1);
      v_stock := v_stock - v_toma;
      v_falta := v_falta - v_toma;
    END LOOP;
    IF v_falta > 0 THEN
      INSERT INTO waste (product_id, product_name, quantity, cost_unit, total_loss, reason, notes, created_at,
                         is_synced, previous_quantity, new_quantity, origen, conteo_sistema, conteo_contado)
      VALUES (v_prod.id, v_prod.name, -v_falta, 0, 0, v_motivo, v_just, v_cuando, 1, v_stock, v_stock - v_falta,
              'CONTEO', v_prod.quantity, p_contado);
      INSERT INTO inventory_movements (product_id, product_name, change_amount, previous_quantity, new_quantity,
                                       operation_type, reason, notes, created_at, "user", is_synced)
      VALUES (v_prod.id, v_prod.name, -v_falta, v_stock, v_stock - v_falta, 'MERMA', 'Conteo: ' || v_motivo,
              v_just, v_cuando, v_emp.nombre, 1);
    END IF;
  ELSE
    -- SOBRA: entra al último lote activo; si el producto no tiene lotes, se crea uno ("SOBRANTE CONTEO")
    SELECT id, coalesce(cost_unit, 0) AS cost INTO v_lote FROM batches
    WHERE product_id = p_product_id AND coalesce(is_active, 1) <> 0 ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced, created_at)
      VALUES ((extract(epoch FROM clock_timestamp()) * 1000)::bigint, p_product_id, 0, 0, 0, 0, 'SOBRANTE CONTEO', 1, 1, v_cuando)
      RETURNING id, coalesce(cost_unit, 0) AS cost INTO v_lote;
    END IF;
    UPDATE batches SET quantity = coalesce(quantity, 0) + v_dif WHERE id = v_lote.id;
    -- total_loss en negativo: un sobrante resta de lo perdido en Mermas
    INSERT INTO waste (batch_id, product_id, product_name, quantity, cost_unit, total_loss, reason, notes, created_at,
                       is_synced, previous_quantity, new_quantity, origen, conteo_sistema, conteo_contado)
    VALUES (v_lote.id, v_prod.id, v_prod.name, v_dif, v_lote.cost, -round(v_dif * v_lote.cost, 2), v_motivo, v_just,
            v_cuando, 1, v_prod.quantity, v_prod.quantity + v_dif, 'CONTEO', v_prod.quantity, p_contado);
    INSERT INTO inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                     operation_type, reason, notes, created_at, "user", is_synced)
    VALUES (v_lote.id, v_prod.id, v_prod.name, v_dif, v_prod.quantity, v_prod.quantity + v_dif, 'SOBRANTE',
            'Conteo: ' || v_motivo, v_just, v_cuando, v_emp.nombre, 1);
  END IF;
  PERFORM fn_cuadrar_lotes_conteo(p_product_id, v_emp.nombre, v_cuando);
  RETURN jsonb_build_object('diferencia', v_dif, 'sistema', v_prod.quantity, 'contado', p_contado);
END;
$$;

-- Borrar una merma devuelve lo que se sacó; borrar un SOBRANTE (cantidad en positivo) quita lo que entró.
-- Antes usaba el valor absoluto: borrar un sobrante habría SUMADO otra vez. Las mermas (en negativo) siguen igual.
CREATE OR REPLACE FUNCTION public.fn_restore_stock_on_waste_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock numeric;
  v_cambio numeric := -coalesce(OLD.quantity, 0);
BEGIN
  UPDATE public.products SET quantity = coalesce(quantity, 0) + v_cambio
  WHERE id = OLD.product_id
  RETURNING quantity INTO v_current_stock;

  INSERT INTO public.inventory_movements (
    batch_id, product_id, product_name, change_amount,
    previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
  ) VALUES (
    OLD.batch_id, OLD.product_id, OLD.product_name, v_cambio,
    (v_current_stock - v_cambio), v_current_stock,
    CASE WHEN v_cambio >= 0 THEN 'ENTRADA' ELSE 'SALIDA' END,
    CASE WHEN v_cambio >= 0 THEN 'Anulación Gasto/Merma' ELSE 'Anulación Sobrante' END,
    'Sistema BD: Restauración automática.', now(), 'Sistema', 0
  );

  IF OLD.batch_id IS NOT NULL THEN
    UPDATE public.batches SET quantity = greatest(coalesce(quantity, 0) + v_cambio, 0) WHERE id = OLD.batch_id;
  END IF;
  RETURN OLD;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- Corregir un conteo (pedido del usuario 23/10): SOLO el motivo y la justificación, nunca la cantidad ni el stock.
-- Queda quién lo corrigió, cuándo y lo que decía antes (la primera versión no se pierde aunque se corrija varias veces).
ALTER TABLE public.waste ADD COLUMN IF NOT EXISTS conteo_editado_por text;
ALTER TABLE public.waste ADD COLUMN IF NOT EXISTS conteo_editado_at timestamptz;
ALTER TABLE public.waste ADD COLUMN IF NOT EXISTS conteo_motivo_original text;
ALTER TABLE public.waste ADD COLUMN IF NOT EXISTS conteo_justificacion_original text;

CREATE OR REPLACE FUNCTION public.fn_editar_conteo(p_waste_id bigint, p_motivo text, p_justificacion text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp record;
  v_fila waste%ROWTYPE;
  v_motivo text := upper(trim(coalesce(p_motivo, '')));
  v_just text := trim(coalesce(p_justificacion, ''));
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF NOT fn_tiene_permiso(v_emp.permisos, ARRAY['almacen_registrar_mermas']) THEN
    RAISE EXCEPTION 'No tienes permiso para corregir conteos.';
  END IF;
  SELECT * INTO v_fila FROM waste WHERE id = p_waste_id;
  IF NOT FOUND OR coalesce(v_fila.origen, '') <> 'CONTEO' THEN RAISE EXCEPTION 'No se encontró ese conteo.'; END IF;
  IF v_motivo = '' THEN RAISE EXCEPTION 'Elige el motivo.'; END IF;
  IF length(v_just) < 3 THEN RAISE EXCEPTION 'Escribe la justificación.'; END IF;

  -- Un faltante que salió de varios lotes son varias filas del mismo conteo (mismo producto y misma hora): todas
  UPDATE waste SET
    conteo_motivo_original = coalesce(conteo_motivo_original, reason),
    conteo_justificacion_original = coalesce(conteo_justificacion_original, notes),
    reason = v_motivo, notes = v_just,
    conteo_editado_por = v_emp.nombre, conteo_editado_at = now()
  WHERE origen = 'CONTEO' AND product_id = v_fila.product_id AND created_at = v_fila.created_at;
  -- El kardex dice lo mismo que Mermas
  UPDATE inventory_movements SET reason = 'Conteo: ' || v_motivo, notes = v_just
  WHERE product_id = v_fila.product_id AND created_at = v_fila.created_at
    AND operation_type IN ('MERMA', 'SOBRANTE') AND reason LIKE 'Conteo: %';
  RETURN jsonb_build_object('motivo', v_motivo, 'editado_por', v_emp.nombre);
END;
$$;

-- La cantidad de un conteo no se cambia por ningún lado (ni editando la merma a mano): se borra y se vuelve a contar
CREATE OR REPLACE FUNCTION public.fn_proteger_conteo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(OLD.origen, '') = 'CONTEO' AND (NEW.quantity IS DISTINCT FROM OLD.quantity
      OR NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.batch_id IS DISTINCT FROM OLD.batch_id
      OR NEW.origen IS DISTINCT FROM OLD.origen) THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE = 'La cantidad de un conteo no se cambia',
      DETAIL = 'Si hubo un error, bórralo y vuelve a contar. El motivo y la justificación sí se pueden corregir.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_proteger_conteo ON public.waste;
CREATE TRIGGER trg_proteger_conteo BEFORE UPDATE ON public.waste
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_conteo();

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- FASE 2.4: cuánto se vendió de cada producto en los últimos N días y cuándo fue su última venta (sin contar
-- ventas anuladas). Lo usan el filtro "Sin ventas (30 días)" de Inventario y "Sugerir pedido" de Compras.
-- Solo lectura (STABLE): la pantalla la pide por GET, así sin internet sirve la copia guardada.
CREATE OR REPLACE FUNCTION public.fn_ventas_por_producto(p_dias integer DEFAULT 30)
RETURNS TABLE (product_id bigint, vendido numeric, ultima_venta timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT d.product_id,
         coalesce(sum(abs(coalesce(d.quantity, 0))) FILTER (WHERE s.created_at >= now() - make_interval(days => greatest(p_dias, 1))), 0),
         max(s.created_at)
  FROM sale_details d
  JOIN sales s ON s.id = d.sale_id
  WHERE coalesce(s.sunat_status, '') <> 'ANULADO' AND d.product_id IS NOT NULL
  GROUP BY d.product_id;
$$;

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- FASE 1.4: cambiar el precio al cobrar (Caja). Cada línea de la venta guarda el precio de lista y quién lo cambió
-- (o el administrador que autorizó con su clave). Deshacer: servidor/sql/deshacer-fase1.sql
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS precio_lista numeric;
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS precio_cambiado_por text;

NOTIFY pgrst, 'reload schema';
