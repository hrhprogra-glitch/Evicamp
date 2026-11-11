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
    -- Grupos de clientes (familia o empresa, fase 4.1): quien entra a Clientes los maneja
    WHEN 'POST /grupos_clientes'     THEN ARRAY['caja_ver_fiados']
    WHEN 'PATCH /grupos_clientes'    THEN ARRAY['caja_ver_fiados']
    WHEN 'POST /debt_payments'       THEN ARRAY['caja_cobrar_deudas']
    -- Cotizaciones (proformas, fase 4.5): quien hace ventas o ve clientes puede cotizar
    WHEN 'POST /cotizaciones'        THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'PATCH /cotizaciones'       THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'DELETE /cotizaciones'      THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'POST /cotizacion_detalles' THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'PATCH /cotizacion_detalles' THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'DELETE /cotizacion_detalles' THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    -- Pedidos por encargo (fase 4.6): quien hace ventas o ve clientes maneja pedidos
    WHEN 'POST /pedidos_clientes'    THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'PATCH /pedidos_clientes'   THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'DELETE /pedidos_clientes'  THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'POST /pedido_detalles'     THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'PATCH /pedido_detalles'    THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
    WHEN 'DELETE /pedido_detalles'   THEN ARRAY['caja_realizar_ventas', 'caja_ver_fiados']
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
    -- TIENDAS Y TRASPASOS (Fase 9)
    WHEN 'POST /stores'                 THEN ARRAY['almacen_crear_editar_productos', 'gerencia_configuracion_sistema']
    WHEN 'PATCH /stores'                THEN ARRAY['almacen_crear_editar_productos', 'gerencia_configuracion_sistema']
    WHEN 'DELETE /stores'               THEN ARRAY['almacen_crear_editar_productos', 'gerencia_configuracion_sistema']
    WHEN 'POST /store_transfers'        THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'PATCH /store_transfers'       THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'POST /store_transfer_items'   THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'POST /rpc/fn_crear_traspaso'   THEN ARRAY['almacen_ingresar_lotes']
    WHEN 'POST /rpc/fn_recibir_traspaso' THEN ARRAY['almacen_ingresar_lotes']
    -- GERENCIA
    WHEN 'PATCH /empresa_config'     THEN ARRAY['gerencia_configuracion_sistema']
    WHEN 'POST /empresa_config'      THEN ARRAY['gerencia_configuracion_sistema']
    WHEN 'POST /rpc/fn_crear_empleado'    THEN ARRAY['gerencia_gestionar_usuarios']
    WHEN 'POST /rpc/fn_editar_empleado'   THEN ARRAY['gerencia_gestionar_usuarios']
    WHEN 'POST /rpc/fn_eliminar_empleado' THEN ARRAY['gerencia_gestionar_usuarios']
    -- FACTURACIÓN ELECTRÓNICA (fase 11): datos del emisor, clave del proveedor y numeración
    WHEN 'PATCH /facturacion_config' THEN ARRAY['gerencia_configuracion_sistema']
    WHEN 'POST /facturacion_config'  THEN ARRAY['gerencia_configuracion_sistema']
    WHEN 'POST /rpc/fn_guardar_credenciales_facturacion' THEN ARRAY['gerencia_configuracion_sistema']
    WHEN 'POST /rpc/fn_estado_credenciales_facturacion'  THEN ARRAY['gerencia_configuracion_sistema']
    WHEN 'POST /rpc/fn_fijar_correlativo'                THEN ARRAY['gerencia_configuracion_sistema']
    -- Volver a enviar un comprobante que quedó con error (pantalla "Comprobantes", fase 11.4)
    WHEN 'POST /rpc/fn_reenviar_comprobante'             THEN ARRAY['caja_abrir_cerrar_turno', 'reportes_ver_globales', 'gerencia_configuracion_sistema']
    WHEN 'POST /rpc/fn_reenviar_nota_credito'            THEN ARRAY['caja_abrir_cerrar_turno', 'reportes_ver_globales', 'gerencia_configuracion_sistema']
    WHEN 'POST /rpc/fn_guardar_credenciales_sunat'       THEN ARRAY['gerencia_configuracion_sistema']
    -- Devolver parte de una venta con boleta/factura (nota de crédito, fase 11.5): como anular
    WHEN 'POST /rpc/fn_devolver_con_nota_credito'        THEN ARRAY['reportes_anular_ventas']
    WHEN 'POST /rpc/fn_cambiar_con_nota_credito'         THEN ARRAY['reportes_anular_ventas']
    WHEN 'POST /rpc/fn_mover_stock_cambio'               THEN ARRAY['reportes_anular_ventas']
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
  -- Sin sesión: iniciar, validar y cerrar sesión, aviso de Yape y catálogo público web
  IF v_ruta IN ('/rpc/fn_login', '/rpc/fn_validar_sesion', '/rpc/fn_cerrar_sesion',
                '/rpc/fn_registrar_notificacion_yape',
                '/rpc/fn_catalogo_publico', '/rpc/fn_crear_pedido_web') THEN
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
      -- El costo del producto pasa a ser el de esta compra (11/11/2026: se quedaba con el viejo). Lo usan las recetas,
      -- los combos, las ventas sin lote y el formulario del producto
      IF v_costo > 0 THEN
        PERFORM set_config('siumax.costo_de_compra', '1', true);
        UPDATE products SET cost_price = v_costo WHERE id = v_det.product_id AND cost_price IS DISTINCT FROM v_costo;
        PERFORM set_config('siumax.costo_de_compra', '', true);
      END IF;
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

-- Edición y retiro de lotes (usados por Almacén y por la devolución de Compras):
-- Al editar o retirar un lote que pertenece a una variante (variant_id IS NOT NULL),
-- se mantiene sincronizado tanto el stock de la variante como el stock global del producto.
CREATE OR REPLACE FUNCTION public.fn_edit_batch(p_batch_id text, p_new_qty numeric, p_new_cost numeric, p_user_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id bigint;
    v_variant_id bigint;
    v_product_name text;
    v_old_qty numeric;
    v_diff numeric;
BEGIN
    SELECT product_id, variant_id, quantity INTO v_product_id, v_variant_id, v_old_qty 
    FROM public.batches 
    WHERE id = p_batch_id::bigint AND is_active = 1;
    
    IF NOT FOUND THEN RETURN; END IF;
    
    SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;
    
    v_diff := p_new_qty - v_old_qty;

    UPDATE public.batches 
    SET quantity = p_new_qty, cost_unit = p_new_cost 
    WHERE id = p_batch_id::bigint;

    IF v_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET quantity = GREATEST(0, coalesce(quantity, 0) + v_diff)
        WHERE id = v_variant_id;
    END IF;

    UPDATE public.products SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.batches 
        WHERE product_id = v_product_id AND is_active = 1
    ) WHERE id = v_product_id;

    IF v_diff <> 0 THEN
        INSERT INTO public.inventory_movements (
            batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity, 
            operation_type, reason, "user", created_at, is_synced
        ) VALUES (
            p_batch_id::bigint, v_product_id, v_product_name, v_diff, v_old_qty, p_new_qty, 
            'AJUSTE', 'Edición manual de lote', p_user_name, NOW(), '1'
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_soft_delete_batch(p_batch_id text, p_user_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id bigint;
    v_variant_id bigint;
    v_product_name text;
    v_quantity numeric;
BEGIN
    SELECT product_id, variant_id, quantity INTO v_product_id, v_variant_id, v_quantity 
    FROM public.batches WHERE id = p_batch_id::bigint;
    
    IF NOT FOUND THEN RETURN; END IF;
    SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;

    UPDATE public.batches SET is_active = 0, quantity = 0 WHERE id = p_batch_id::bigint;
    
    IF v_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET quantity = GREATEST(0, coalesce(quantity, 0) - v_quantity)
        WHERE id = v_variant_id;
    END IF;

    UPDATE public.products SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) FROM public.batches WHERE product_id = v_product_id AND is_active = 1
    ) WHERE id = v_product_id;

    INSERT INTO public.inventory_movements (
        batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity, 
        operation_type, reason, "user", created_at, is_synced
    ) VALUES (
        p_batch_id::bigint, v_product_id, v_product_name, -v_quantity, v_quantity, 0, 
        'AJUSTE', 'Retiro de Lote (Soft Delete)', p_user_name, NOW(), '1'
    );
END;
$$;
-- 05/11/2026: en siumax les faltaba este permiso → al guardar un lote la API respondía 401 y el sistema sacaba al usuario
GRANT EXECUTE ON FUNCTION public.fn_edit_batch(text, numeric, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_soft_delete_batch(text, text) TO anon;

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
  v_tipo_compuesto text;
  v_receta_record record;
  v_comp_qty_to_deduct numeric;
  v_comp_current_stock numeric;
  v_comp_batch_record record;
  v_comp_deducted numeric;
  v_comp_costo_real numeric;
  v_costo_total_combo numeric := 0;
BEGIN
  BEGIN
    SELECT coalesce(tipo_compuesto, 'ESTANDAR'), (coalesce(unit, '') = 'CONSUMO' OR coalesce(control_type, '') = 'CONSUMPTION')
    INTO v_tipo_compuesto, v_is_consumo
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
      AND (notes = 'Ticket #' || NEW.sale_id::text OR notes ~ ('^Doc: B001-0*' || NEW.sale_id::text || '$'))
      AND (variant_id IS NOT DISTINCT FROM NEW.variant_id);
    IF v_ya_descontado > 0 THEN
      SELECT coalesce(sum(abs(quantity)), 0) INTO v_en_lineas
      FROM public.sale_details WHERE sale_id = NEW.sale_id AND product_id = NEW.product_id
        AND (variant_id IS NOT DISTINCT FROM NEW.variant_id);
      IF v_ya_descontado >= v_en_lineas + v_qty_to_deduct THEN
        RAISE WARNING 'Venta % producto % (variante %): ya estaba descontada, no se descuenta otra vez', NEW.sale_id, NEW.product_id, NEW.variant_id;
        RETURN NEW;
      END IF;
    END IF;

    -- FASE 8: Si es un COMBO / KIT, descontar de cada insumo que lo compone
    IF v_tipo_compuesto = 'COMBO' THEN
      FOR v_receta_record IN
        SELECT pr.component_product_id, pr.component_variant_id, pr.quantity AS factor,
               p.name AS comp_product_name, pv.nombre_variante AS comp_variant_name
        FROM public.product_recipes pr
        JOIN public.products p ON p.id = pr.component_product_id
        LEFT JOIN public.product_variants pv ON pv.id = pr.component_variant_id
        WHERE pr.parent_product_id = NEW.product_id
      LOOP
        v_comp_qty_to_deduct := v_qty_to_deduct * v_receta_record.factor;
        v_comp_costo_real := 0;

        IF v_receta_record.component_variant_id IS NOT NULL THEN
          UPDATE public.product_variants
          SET quantity = GREATEST(0, coalesce(quantity, 0) - v_comp_qty_to_deduct)
          WHERE id = v_receta_record.component_variant_id
          RETURNING coalesce(quantity, 0), coalesce(cost_price, 0) INTO v_comp_current_stock, v_comp_costo_real;

          FOR v_comp_batch_record IN
            SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost
            FROM public.batches
            WHERE product_id = v_receta_record.component_product_id AND variant_id = v_receta_record.component_variant_id AND coalesce(quantity, 0) > 0
            ORDER BY created_at ASC, id ASC
            FOR UPDATE
          LOOP
            IF v_comp_qty_to_deduct <= 0 THEN EXIT; END IF;
            IF v_comp_batch_record.qty >= v_comp_qty_to_deduct THEN
              UPDATE public.batches SET quantity = (v_comp_batch_record.qty - v_comp_qty_to_deduct) WHERE id = v_comp_batch_record.id;
              v_comp_deducted := v_comp_qty_to_deduct;
              v_comp_qty_to_deduct := 0;
            ELSE
              UPDATE public.batches SET quantity = 0 WHERE id = v_comp_batch_record.id;
              v_comp_deducted := v_comp_batch_record.qty;
              v_comp_qty_to_deduct := v_comp_qty_to_deduct - v_comp_batch_record.qty;
            END IF;

            IF v_comp_batch_record.cost > 0 THEN v_comp_costo_real := v_comp_batch_record.cost; END IF;
            v_costo_total_combo := v_costo_total_combo + (v_comp_deducted * v_comp_costo_real);

            INSERT INTO public.inventory_movements (
              batch_id, variant_id, variant_name, product_id, product_name, change_amount,
              previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
            ) VALUES (
              v_comp_batch_record.id, v_receta_record.component_variant_id, v_receta_record.comp_variant_name,
              v_receta_record.component_product_id, v_receta_record.comp_product_name, -v_comp_deducted,
              (v_comp_current_stock + v_comp_deducted), v_comp_current_stock,
              'VENTA', 'Venta Combo: ' || NEW.product_name, 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
            );
          END LOOP;

          IF v_comp_qty_to_deduct > 0 THEN
            v_costo_total_combo := v_costo_total_combo + (v_comp_qty_to_deduct * v_comp_costo_real);
            INSERT INTO public.inventory_movements (
              batch_id, variant_id, variant_name, product_id, product_name, change_amount,
              previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
            ) VALUES (
              NULL, v_receta_record.component_variant_id, v_receta_record.comp_variant_name,
              v_receta_record.component_product_id, v_receta_record.comp_product_name, -v_comp_qty_to_deduct,
              (v_comp_current_stock + v_comp_qty_to_deduct), v_comp_current_stock,
              'VENTA', 'Venta Combo: ' || NEW.product_name, 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
            );
          END IF;

        ELSE
          UPDATE public.products
          SET quantity = coalesce(quantity, 0) - v_comp_qty_to_deduct
          WHERE id = v_receta_record.component_product_id
          RETURNING coalesce(quantity, 0), coalesce(cost_price, 0) INTO v_comp_current_stock, v_comp_costo_real;

          FOR v_comp_batch_record IN
            SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost
            FROM public.batches
            WHERE product_id = v_receta_record.component_product_id AND variant_id IS NULL AND coalesce(quantity, 0) > 0
            ORDER BY created_at ASC, id ASC
            FOR UPDATE
          LOOP
            IF v_comp_qty_to_deduct <= 0 THEN EXIT; END IF;
            IF v_comp_batch_record.qty >= v_comp_qty_to_deduct THEN
              UPDATE public.batches SET quantity = (v_comp_batch_record.qty - v_comp_qty_to_deduct) WHERE id = v_comp_batch_record.id;
              v_comp_deducted := v_comp_qty_to_deduct;
              v_comp_qty_to_deduct := 0;
            ELSE
              UPDATE public.batches SET quantity = 0 WHERE id = v_comp_batch_record.id;
              v_comp_deducted := v_comp_batch_record.qty;
              v_comp_qty_to_deduct := v_comp_qty_to_deduct - v_comp_batch_record.qty;
            END IF;

            IF v_comp_batch_record.cost > 0 THEN v_comp_costo_real := v_comp_batch_record.cost; END IF;
            v_costo_total_combo := v_costo_total_combo + (v_comp_deducted * v_comp_costo_real);

            INSERT INTO public.inventory_movements (
              batch_id, variant_id, variant_name, product_id, product_name, change_amount,
              previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
            ) VALUES (
              v_comp_batch_record.id, NULL, NULL,
              v_receta_record.component_product_id, v_receta_record.comp_product_name, -v_comp_deducted,
              (v_comp_current_stock + v_comp_deducted), v_comp_current_stock,
              'VENTA', 'Venta Combo: ' || NEW.product_name, 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
            );
          END LOOP;

          IF v_comp_qty_to_deduct > 0 THEN
            v_costo_total_combo := v_costo_total_combo + (v_comp_qty_to_deduct * v_comp_costo_real);
            INSERT INTO public.inventory_movements (
              batch_id, variant_id, variant_name, product_id, product_name, change_amount,
              previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
            ) VALUES (
              NULL, NULL, NULL,
              v_receta_record.component_product_id, v_receta_record.comp_product_name, -v_comp_qty_to_deduct,
              (v_comp_current_stock + v_comp_qty_to_deduct), v_comp_current_stock,
              'VENTA', 'Venta Combo: ' || NEW.product_name, 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
            );
          END IF;
        END IF;
      END LOOP;

      IF v_costo_total_combo > 0 AND v_qty_to_deduct > 0 THEN
        NEW.cost_at_moment := round(v_costo_total_combo / v_qty_to_deduct, 2);
      END IF;

      RETURN NEW;
    END IF;

    -- FASE 7: Si es venta de variante específica, se descuenta de product_variants y de sus lotes si los tiene
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
      SET quantity = GREATEST(0, coalesce(quantity, 0) - v_qty_to_deduct)
      WHERE id = NEW.variant_id
      RETURNING coalesce(quantity, 0), coalesce(cost_price, 0) INTO v_current_stock, v_costo_real;

      FOR v_batch_record IN
        SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost
        FROM public.batches
        WHERE product_id = NEW.product_id AND variant_id = NEW.variant_id AND coalesce(quantity, 0) > 0
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

        IF v_batch_record.cost > 0 THEN
          v_costo_real := v_batch_record.cost;
        END IF;

        INSERT INTO public.inventory_movements (
          batch_id, variant_id, variant_name, product_id, product_name, change_amount,
          previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
        ) VALUES (
          v_batch_record.id, NEW.variant_id, NEW.variant_name, NEW.product_id, NEW.product_name, -v_deducted,
          (v_current_stock + v_deducted), v_current_stock,
          'VENTA', 'Venta POS (Variante)', 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
        );
      END LOOP;

      IF v_qty_to_deduct > 0 THEN
        INSERT INTO public.inventory_movements (
          batch_id, variant_id, variant_name, product_id, product_name, change_amount,
          previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
        ) VALUES (
          NULL, NEW.variant_id, NEW.variant_name, NEW.product_id, NEW.product_name, -v_qty_to_deduct,
          (v_current_stock + v_qty_to_deduct), v_current_stock,
          'VENTA', 'Venta POS (Variante)', 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
        );
      END IF;

      IF v_costo_real > 0 THEN
        NEW.cost_at_moment := v_costo_real;
      END IF;

      RETURN NEW;
    END IF;

    -- Venta de producto genérico / lotes:
    UPDATE public.products
    SET quantity = coalesce(quantity, 0) - v_qty_to_deduct
    WHERE id = NEW.product_id
    RETURNING coalesce(quantity, 0) INTO v_current_stock;

    FOR v_batch_record IN
      SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost
      FROM public.batches
      WHERE product_id = NEW.product_id AND variant_id IS NULL AND coalesce(quantity, 0) > 0
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
        batch_id, variant_id, variant_name, product_id, product_name, change_amount,
        previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
      ) VALUES (
        v_batch_record.id, NULL, NULL, NEW.product_id, NEW.product_name, -v_deducted,
        (v_current_stock + v_deducted), v_current_stock,
        'VENTA', 'Venta POS', 'Ticket #' || NEW.sale_id::text, now(), 'Sistema', 1
      );
    END LOOP;

    -- Lo que no salió de ningún lote (producto con stock pero sin lotes) también queda en el kardex; así
    -- anular la venta (Finanzas) también devuelve ese stock
    IF v_qty_to_deduct > 0 THEN
      INSERT INTO public.inventory_movements (
        batch_id, variant_id, variant_name, product_id, product_name, change_amount,
        previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
      ) VALUES (
        NULL, NULL, NULL, NEW.product_id, NEW.product_name, -v_qty_to_deduct,
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
  v_nc text;
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF NOT fn_tiene_permiso(v_emp.permisos, ARRAY['reportes_anular_ventas']) THEN
    RAISE EXCEPTION 'No tienes permiso para anular ventas.';
  END IF;

  SELECT * INTO v_venta FROM sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la venta.'; END IF;
  IF v_venta.sunat_status = 'ANULADO' THEN RETURN jsonb_build_object('ya_anulada', true); END IF;

  -- (03/11/2026) Boleta/factura que SUNAT todavía NO aceptó (pendiente o con error): NO lleva nota de crédito
  -- (no hay nada que corregir). Queda 'ANULANDO' y el facturador confirma con el proveedor si llegó a emitirse:
  -- si no existe → 'NO_EMITIDO'; si existe → recién ahí emite la nota de crédito (fn_confirmar_anulacion).
  -- Si el proveedor YA lo generó (tiene PDF o constancia: Nubefact manda las boletas en el resumen diario), sí
  -- está emitido: va por la nota de crédito de abajo.
  IF v_venta.doc_type IS NOT NULL AND v_venta.cpe_estado IN ('PENDIENTE', 'ENVIANDO', 'ERROR')
     AND v_venta.cpe_pdf IS NULL AND v_venta.cpe_cdr IS NULL THEN
    PERFORM set_config('siumax.cpe_interno', '1', true);   -- deja marcar la venta como ANULADO
    UPDATE sales SET cpe_estado = 'ANULANDO', cpe_proximo_intento = now(),
           cpe_mensaje = 'Venta anulada antes de que SUNAT la aceptara: se confirma con el proveedor que no se emitió.'
     WHERE id = p_sale_id;
  -- Fase 11.5: con boleta/factura electrónica ya aceptada, anular emite la NOTA DE CRÉDITO por todo
  ELSIF v_venta.doc_type IS NOT NULL AND coalesce(v_venta.cpe_estado, '') NOT IN ('RECHAZADO', 'NO_EMITIDO', 'ANULANDO') THEN
    IF EXISTS (SELECT 1 FROM notas_credito WHERE sale_id = p_sale_id) THEN
      RAISE EXCEPTION 'Esta venta ya tiene devoluciones con nota de crédito: devuelve el resto con "Devolver productos" (Comprobantes).';
    END IF;
    INSERT INTO notas_credito (sale_id, motivo, descripcion, total, items, creado_por)
    SELECT p_sale_id, '01', 'ANULACIÓN DE LA OPERACIÓN', v_venta.total,
           coalesce(jsonb_agg(jsonb_build_object('detail_id', d.id, 'product_id', d.product_id, 'product_name', d.product_name,
             'variant_id', d.variant_id, 'variant_name', d.variant_name, 'quantity', d.quantity, 'subtotal', d.subtotal,
             'tipo_igv', coalesce(d.tipo_igv, 'GRAVADO'), 'es_bolsa', coalesce(d.es_bolsa, false)) ORDER BY d.id), '[]'::jsonb),
           v_emp.nombre
      FROM sale_details d WHERE d.sale_id = p_sale_id
    RETURNING doc_serial || '-' || lpad(doc_number, 8, '0') INTO v_nc;
    PERFORM set_config('siumax.cpe_interno', '1', true);   -- deja marcar la venta como ANULADO
  END IF;

  FOR v_mov IN SELECT * FROM inventory_movements
               WHERE operation_type = 'VENTA' AND notes = 'Ticket #' || p_sale_id::text ORDER BY id LOOP
    v_cant := abs(coalesce(v_mov.change_amount, 0));
    IF v_cant <= 0 THEN CONTINUE; END IF;
    IF v_mov.variant_id IS NOT NULL THEN
      -- Restaurar stock a la variante específica
      UPDATE product_variants SET quantity = coalesce(quantity, 0) + v_cant WHERE id = v_mov.variant_id
      RETURNING quantity INTO v_nuevo;

      IF v_mov.batch_id IS NOT NULL THEN
        UPDATE batches SET quantity = coalesce(quantity, 0) + v_cant WHERE id = v_mov.batch_id;
      END IF;

      INSERT INTO inventory_movements (batch_id, variant_id, variant_name, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                       operation_type, reason, notes, created_at, "user", is_synced)
      VALUES (v_mov.batch_id, v_mov.variant_id, v_mov.variant_name, v_mov.product_id, v_mov.product_name, v_cant, coalesce(v_nuevo, 0) - v_cant, coalesce(v_nuevo, 0),
              'ANULACION', 'Anulación de venta (Variante)', 'Anulación Ticket #' || p_sale_id::text, v_cuando, v_emp.nombre, 1);
    ELSE
      -- Restaurar stock a lotes / producto genérico
      IF v_mov.batch_id IS NOT NULL THEN
        UPDATE batches SET quantity = coalesce(quantity, 0) + v_cant WHERE id = v_mov.batch_id;
      END IF;
      UPDATE products SET quantity = coalesce(quantity, 0) + v_cant WHERE id = v_mov.product_id
      RETURNING quantity INTO v_nuevo;

      INSERT INTO inventory_movements (batch_id, variant_id, variant_name, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                       operation_type, reason, notes, created_at, "user", is_synced)
      VALUES (v_mov.batch_id, NULL, NULL, v_mov.product_id, v_mov.product_name, v_cant, coalesce(v_nuevo, 0) - v_cant, coalesce(v_nuevo, 0),
              'ANULACION', 'Anulación de venta', 'Anulación Ticket #' || p_sale_id::text, v_cuando, v_emp.nombre, 1);
    END IF;
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
  RETURN jsonb_build_object('ya_anulada', false, 'productos', v_productos, 'nota_credito', v_nc,
    'sin_emitir', v_venta.doc_type IS NOT NULL AND v_venta.cpe_estado IN ('PENDIENTE', 'ENVIANDO', 'ERROR')
                  AND v_venta.cpe_pdf IS NULL AND v_venta.cpe_cdr IS NULL);
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
-- Fase 4.1 (pedido del dueño 28/10/2026): quien tiene "Conteos completo" (almacen_registrar_mermas) puede elegir a qué
-- lote va la diferencia (p_batch_id); sin lote se hace como siempre (falta → lotes más antiguos, sobra → último).
-- Se borra la versión sin p_batch_id para que PostgREST no tenga dos funciones con el mismo nombre.
DROP FUNCTION IF EXISTS public.fn_registrar_conteo(bigint, numeric, text, text, numeric, timestamptz);
CREATE OR REPLACE FUNCTION public.fn_registrar_conteo(p_product_id bigint, p_contado numeric, p_motivo text DEFAULT NULL,
                                                      p_justificacion text DEFAULT NULL, p_diferencia numeric DEFAULT NULL,
                                                      p_cuando timestamptz DEFAULT NULL, p_batch_id bigint DEFAULT NULL)
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
  -- Elegir el lote es de quien tiene Conteos completo (el cajero cuenta a ciegas, sin ver lotes)
  IF p_batch_id IS NOT NULL THEN
    IF NOT fn_tiene_permiso(v_emp.permisos, ARRAY['almacen_registrar_mermas']) THEN
      RAISE EXCEPTION 'Solo quien tiene Conteos completo puede elegir el lote.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM batches WHERE id = p_batch_id AND product_id = p_product_id AND coalesce(is_active, 1) <> 0) THEN
      RAISE EXCEPTION 'Ese lote no es de este producto.';
    END IF;
  END IF;

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
    -- Con lote elegido, todo sale de ese lote (si no alcanza, se avisa)
    IF p_batch_id IS NOT NULL AND (SELECT coalesce(quantity, 0) FROM batches WHERE id = p_batch_id) < v_falta THEN
      RAISE EXCEPTION 'Ese lote solo tiene %; faltan %. Elige otro lote o "Automático".',
        (SELECT coalesce(quantity, 0) FROM batches WHERE id = p_batch_id), v_falta;
    END IF;
    FOR v_lote IN SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost FROM batches
                  WHERE product_id = p_product_id AND coalesce(quantity, 0) > 0 AND coalesce(is_active, 1) <> 0
                    AND (p_batch_id IS NULL OR id = p_batch_id)
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
    WHERE product_id = p_product_id AND coalesce(is_active, 1) <> 0 AND (p_batch_id IS NULL OR id = p_batch_id)
    ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE;
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

-- ===================================================================================================
-- FASE 1.1: unidad de medida SUNAT (Catálogo 03; la lista está en src/utils/unidades.ts). Los productos que ya
-- existen reciben el código de su unidad de siempre: UND → NIU, KG → KGM, GR → GRM, LT → LTR, ML → MLT, consumo → ZZ
-- (el sistema anterior le puso NIU a todo, también a los de kilo). Antes se guarda una copia de los códigos
-- anteriores para poder deshacerlo (servidor/sql/deshacer-fase1.sql). Solo toca las unidades antiguas: las nuevas
-- (BOLSA, M, CAJA…) ya las guarda la pantalla con su código. Repetible.
CREATE TABLE IF NOT EXISTS public.respaldo_fase1_unidades (id bigint PRIMARY KEY, sunat_unit_code text);
INSERT INTO public.respaldo_fase1_unidades (id, sunat_unit_code)
SELECT id, sunat_unit_code FROM public.products ON CONFLICT (id) DO NOTHING;
UPDATE public.products SET sunat_unit_code = CASE
    WHEN control_type = 'CONSUMPTION' OR upper(coalesce(unit, '')) = 'CONSUMO' THEN 'ZZ'
    WHEN upper(coalesce(nullif(unit, ''), weight_unit, '')) = 'GR' THEN 'GRM'
    WHEN upper(coalesce(nullif(unit, ''), weight_unit, '')) = 'LT' THEN 'LTR'
    WHEN upper(coalesce(nullif(unit, ''), weight_unit, '')) = 'ML' THEN 'MLT'
    WHEN upper(coalesce(nullif(unit, ''), weight_unit, '')) = 'KG' OR control_type = 'WEIGHT' THEN 'KGM'
    ELSE 'NIU' END
WHERE upper(coalesce(unit, '')) IN ('', 'UND', 'UN', 'UNIDAD', 'KG', 'GR', 'LT', 'ML', 'CONSUMO');

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- FASE 1.3: precios por cantidad. products.precios_cantidad = [{"desde": 6, "precio": 1.8}, ...] (la Caja usa la escala
-- más alta que alcance la cantidad). Cambiarlos es cambiar precios: fn_proteger_precios pide "Modificar precios".
-- Deshacer: servidor/sql/deshacer-fase1.sql (devuelve fn_proteger_precios como estaba ANTES de borrar la columna).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS precios_cantidad jsonb;

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
     AND NEW.discount_percent IS NOT DISTINCT FROM OLD.discount_percent
     AND NEW.precios_cantidad IS NOT DISTINCT FROM OLD.precios_cantidad THEN
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

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- FASE 1.2: presentaciones. products.presentaciones = [{"unidad": "CAJA", "factor": 12, "precio": 60, "barcode": "..."}]
-- (el stock siempre en unidades: la Caja guarda la venta de 1 CAJA x12 como 12 unidades). En el detalle de la venta
-- quedan la presentación y cuántas se vendieron. Sus precios se protegen como el precio (fn_proteger_precios).
-- Deshacer: servidor/sql/deshacer-fase1.sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS presentaciones jsonb;
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS presentacion text;
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS presentacion_cantidad numeric;

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
     AND NEW.discount_percent IS NOT DISTINCT FROM OLD.discount_percent
     AND NEW.precios_cantidad IS NOT DISTINCT FROM OLD.precios_cantidad
     AND NEW.presentaciones IS NOT DISTINCT FROM OLD.presentaciones THEN
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

NOTIFY pgrst, 'reload schema';

-- FASE 1.2b: comprar por caja. La línea del pedido sigue en UNIDADES (cantidad, costo_unit: así se recibe y se crean
-- los lotes); presentacion / presentacion_factor solo dicen cómo se pidió ("5 CAJA x12" = 60). Deshacer: deshacer-fase1.sql
ALTER TABLE public.compras_detalle ADD COLUMN IF NOT EXISTS presentacion text;
ALTER TABLE public.compras_detalle ADD COLUMN IF NOT EXISTS presentacion_factor numeric;

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- FASE 4.1: ficha del cliente (sección Clientes, antes Créditos). Solo el nombre es obligatorio; lo demás es opcional
-- para no complicar a la vecina que fía. El número de documento sigue en la columna "dni" (la usan la Caja y los
-- fiados); tipo_doc dice si es DNI o RUC (vacío = sin documento). Antes el teléfono se pedía pero NO se guardaba.
-- Deshacer: servidor/sql/deshacer-fase4.sql
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tipo_doc text;     -- 'DNI' | 'RUC' | null (sin documento)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS referencia text;   -- para distinguir: "Sra. Rosa – vecina 2do piso"

NOTIFY pgrst, 'reload schema';

-- FASE 4.1 (cambio pedido por el dueño 28/10/2026): la ficha muestra DNI y RUC a la vez, los dos opcionales, sin elegir
-- un tipo (una persona con negocio puede tener los dos). El RUC va en su propia columna; "dni" queda solo para el DNI.
-- Los que tenían el RUC guardado como documento (tipo_doc = 'RUC') pasan a la columna nueva. Repetible.
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS ruc text;
-- Link de ubicación (ej. Google Maps) para repartos y para ubicar al cliente (pedido del dueño 28/10/2026)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS ubicacion text;
UPDATE public.customers SET ruc = dni, dni = NULL, tipo_doc = NULL
WHERE tipo_doc = 'RUC' AND ruc IS NULL AND dni IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- FASE 4.1: GRUPOS DE CLIENTES (familia o empresa; pedido del dueño 28/10/2026, reemplaza a "Unir clientes").
-- Cada cliente sigue con su propia cuenta y sus créditos; el grupo los junta para ver y cobrar la deuda de todos
-- (ej. la empresa paga lo que sacaron sus técnicos). Un cliente está en UN solo grupo (customers.grupo_id) y se
-- puede sacar. El id lo pone la PC (como customers), así se puede crear sin internet.
-- Deshacer: servidor/sql/deshacer-fase4.sql
CREATE TABLE IF NOT EXISTS public.grupos_clientes (
  id          bigint PRIMARY KEY,
  nombre      text NOT NULL,
  tipo        text NOT NULL DEFAULT 'FAMILIA' CHECK (tipo IN ('FAMILIA', 'EMPRESA')),
  ruc         text,                                   -- opcional (empresa)
  created_at  timestamptz NOT NULL DEFAULT now(),
  is_synced   bigint
);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS grupo_id bigint REFERENCES public.grupos_clientes (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS customers_grupo ON public.customers (grupo_id);
-- Con internet el número lo pone el servidor (la hora en milisegundos); sin internet, la PC (sinInternet.ts)
ALTER TABLE public.grupos_clientes ALTER COLUMN id SET DEFAULT (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'web_anon'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_clientes TO %I', r);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- FASE 4.2: Cliente opcional en la Caja (POS). Permite asociar una venta a un cliente (por nombre, DNI o RUC)
-- y reflejarlo en el historial de compras y el ticket impreso.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id bigint REFERENCES public.customers (id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name text;
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id);

NOTIFY pgrst, 'reload schema';

-- ===================================================================================================
-- FASE 4.3: Días de plazo acordados con el cliente para pagar créditos/fiados (opcional; ej. 7, 15, 30 días).
-- Permite que al fiarle en caja, la fecha límite de pago se autocalcule automáticamente a partir de hoy.
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS dias_plazo integer;

-- ===================================================================================================
-- FASE 4.4: Precio mayorista y descuento especial en clientes y empresas
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS es_mayorista boolean DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric(5,2) DEFAULT 0;
ALTER TABLE public.grupos_clientes ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric(5,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS precio_mayorista numeric(12,2);

-- Redefinir fn_proteger_precios para proteger también precio_mayorista
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
     AND NEW.discount_percent IS NOT DISTINCT FROM OLD.discount_percent
     AND NEW.precios_cantidad IS NOT DISTINCT FROM OLD.precios_cantidad
     AND NEW.presentaciones IS NOT DISTINCT FROM OLD.presentaciones
     AND NEW.precio_mayorista IS NOT DISTINCT FROM OLD.precio_mayorista THEN
    RETURN NEW;
  END IF;
  -- Solo el costo, puesto por fn_recibir_compra (el costo de lo que llegó, 11/11/2026): no es "cambiar precios"
  IF current_setting('siumax.costo_de_compra', true) = '1'
     AND NEW.price IS NOT DISTINCT FROM OLD.price
     AND NEW.discount_percent IS NOT DISTINCT FROM OLD.discount_percent
     AND NEW.precios_cantidad IS NOT DISTINCT FROM OLD.precios_cantidad
     AND NEW.presentaciones IS NOT DISTINCT FROM OLD.presentaciones
     AND NEW.precio_mayorista IS NOT DISTINCT FROM OLD.precio_mayorista THEN
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

-- ===================================================================================================
-- FASE 4.5: Cotizaciones (proformas que NO descuentan stock)
CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id serial PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  cliente_id text,
  cliente_nombre text NOT NULL,
  cliente_documento text,
  cliente_telefono text,
  fecha_emision timestamptz DEFAULT now(),
  fecha_vencimiento timestamptz,
  estado text DEFAULT 'VIGENTE', -- VIGENTE, CONVERTIDA, VENCIDA, ANULADA
  total numeric(12,2) NOT NULL DEFAULT 0,
  observaciones text,
  sale_id bigint,
  vendedor text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON public.cotizaciones (estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON public.cotizaciones (cliente_nombre);

CREATE TABLE IF NOT EXISTS public.cotizacion_detalles (
  id serial PRIMARY KEY,
  cotizacion_id integer NOT NULL REFERENCES public.cotizaciones (id) ON DELETE CASCADE,
  product_id bigint,
  product_name text NOT NULL,
  quantity numeric(12,3) NOT NULL,
  price numeric(12,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  es_mayorista boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_cotizacion_detalles_coti ON public.cotizacion_detalles (cotizacion_id);

-- ===================================================================================================
-- FASE 4.6: Pedidos de clientes (reserva de mercadería con fecha de entrega y adelanto)
CREATE TABLE IF NOT EXISTS public.pedidos_clientes (
  id serial PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  cliente_id text,
  cliente_nombre text NOT NULL,
  cliente_documento text,
  cliente_telefono text,
  fecha_entrega timestamptz NOT NULL,
  estado text DEFAULT 'PENDIENTE', -- PENDIENTE, ENTREGADO, CANCELADO
  total numeric(12,2) NOT NULL DEFAULT 0,
  adelanto numeric(12,2) NOT NULL DEFAULT 0,
  saldo_pendiente numeric(12,2) NOT NULL DEFAULT 0,
  metodo_adelanto text,
  sale_id bigint,
  observaciones text,
  vendedor text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_clientes_estado ON public.pedidos_clientes (estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_clientes_fecha ON public.pedidos_clientes (fecha_entrega);

CREATE TABLE IF NOT EXISTS public.pedido_detalles (
  id serial PRIMARY KEY,
  pedido_id integer NOT NULL REFERENCES public.pedidos_clientes (id) ON DELETE CASCADE,
  product_id bigint,
  product_name text NOT NULL,
  quantity numeric(12,3) NOT NULL,
  price numeric(12,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  es_mayorista boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_pedido_detalles_pedido ON public.pedido_detalles (pedido_id);

-- Permisos y secuencias para PostgREST (solo rol anon en VPS)
GRANT ALL ON public.cotizaciones TO anon;
GRANT ALL ON public.cotizacion_detalles TO anon;
GRANT ALL ON public.pedidos_clientes TO anon;
GRANT ALL ON public.pedido_detalles TO anon;
-- ===================================================================================================
-- FASE 3: Búsquedas especializadas (marca, modelo, medida, laboratorio, ubicación)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS modelo text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS medida text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS laboratorio text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ubicacion text;
CREATE INDEX IF NOT EXISTS idx_products_marca ON public.products (marca);
CREATE INDEX IF NOT EXISTS idx_products_modelo ON public.products (modelo);
CREATE INDEX IF NOT EXISTS idx_products_medida ON public.products (medida);

-- ===================================================================================================
-- FASE 6: Cambios de producto y control de garantías con series / IMEI
-- 1. Soporte de garantías y series en productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS controla_series boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meses_garantia integer DEFAULT 0;

-- 2. Registro de serie y vigencia de garantía en el detalle de cada venta
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS numero_serie text;
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS garantia_hasta date;
CREATE INDEX IF NOT EXISTS idx_sale_details_numero_serie ON public.sale_details (numero_serie);

-- 3. Tabla de Cambios de Producto (registrados en Finanzas)
CREATE TABLE IF NOT EXISTS public.cambios_productos (
  id bigint PRIMARY KEY,
  sale_id bigint REFERENCES public.sales (id) ON DELETE CASCADE,
  fecha timestamptz DEFAULT now(),
  session_id text,
  usuario text,
  customer_id bigint REFERENCES public.customers (id) ON DELETE SET NULL,
  customer_name text,
  producto_devuelto_id bigint REFERENCES public.products (id) ON DELETE SET NULL,
  producto_devuelto_nombre text,
  cantidad_devuelta numeric(12,3) NOT NULL DEFAULT 1,
  precio_devuelto numeric(12,2) NOT NULL DEFAULT 0,
  serie_devuelta text,
  producto_nuevo_id bigint REFERENCES public.products (id) ON DELETE SET NULL,
  producto_nuevo_nombre text,
  cantidad_nueva numeric(12,3) NOT NULL DEFAULT 1,
  precio_nuevo numeric(12,2) NOT NULL DEFAULT 0,
  serie_nueva text,
  diferencia numeric(12,2) NOT NULL DEFAULT 0,
  payment_type text DEFAULT 'EFECTIVO',
  motivo text,
  created_at timestamptz DEFAULT now(),
  is_synced integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_cambios_sale_id ON public.cambios_productos (sale_id);
CREATE INDEX IF NOT EXISTS idx_cambios_serie_devuelta ON public.cambios_productos (serie_devuelta);
CREATE INDEX IF NOT EXISTS idx_cambios_serie_nueva ON public.cambios_productos (serie_nueva);

-- Permisos PostgREST
GRANT ALL ON public.cambios_productos TO anon;

-- ===================================================================================================
-- FASE 7: Tallas y Colores (Variantes con stock propio)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tiene_variantes boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.product_variants (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  nombre_variante text NOT NULL,
  talla text,
  color text,
  barcode text,
  code text,
  price numeric(12,2),
  precio_mayorista numeric(12,2),
  cost_price numeric(12,2),
  quantity numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) DEFAULT 2,
  is_active integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  is_synced integer DEFAULT 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute WHERE attrelid = 'public.product_variants'::regclass AND attname = 'id' AND attidentity != ''
  ) THEN
    ALTER TABLE public.product_variants ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_variants_prod ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON public.product_variants (barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_code ON public.product_variants (code);

-- Líneas de venta con variante
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS variant_id bigint;
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS variant_name text;

-- Movimientos de inventario con variante
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS variant_id bigint;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS variant_name text;

-- Lotes con variante específica (fase 7)
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS variant_id bigint;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS variant_name text;
CREATE INDEX IF NOT EXISTS idx_batches_variant_id ON public.batches (variant_id);

-- Permisos PostgREST
GRANT ALL ON public.product_variants TO anon;

-- ===================================================================================================
-- FASE 8: Producción, Recetas, Insumos, Combos y Kits
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tipo_compuesto text DEFAULT 'ESTANDAR'; -- 'ESTANDAR', 'COMBO', 'RECETA'
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS costo_adicional_produccion numeric(12,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.product_recipes (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  parent_product_id bigint NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  component_product_id bigint NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  component_variant_id bigint REFERENCES public.product_variants (id) ON DELETE RESTRICT,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute WHERE attrelid = 'public.product_recipes'::regclass AND attname = 'id' AND attidentity != ''
  ) THEN
    ALTER TABLE public.product_recipes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recipes_parent ON public.product_recipes (parent_product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_component ON public.product_recipes (component_product_id);

GRANT ALL ON public.product_recipes TO anon;

-- Función atómica para registrar una orden de producción / elaboración
CREATE OR REPLACE FUNCTION public.fn_producir_receta(
  p_product_id bigint,
  p_cantidad numeric,
  p_costo_adicional numeric,
  p_usuario text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_record record;
  v_receta_record record;
  v_costo_insumos_total numeric := 0;
  v_costo_unitario_final numeric := 0;
  v_nuevo_lote_id bigint;
  v_comp_qty_to_deduct numeric;
  v_comp_current_stock numeric;
  v_comp_batch_record record;
  v_comp_deducted numeric;
  v_comp_costo_unit numeric;
  v_codigo_lote text;
BEGIN
  IF coalesce(p_cantidad, 0) <= 0 THEN
    RAISE EXCEPTION 'La cantidad a producir debe ser mayor a 0';
  END IF;

  SELECT id, name, coalesce(tipo_compuesto, 'ESTANDAR') AS tipo, coalesce(quantity, 0) AS stock_actual
  INTO v_parent_record
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.product_recipes WHERE parent_product_id = p_product_id) THEN
    RAISE EXCEPTION 'El producto % no tiene insumos configurados en su receta', v_parent_record.name;
  END IF;

  -- 1. Validar que haya stock suficiente de todos los componentes antes de descontar nada
  FOR v_receta_record IN
    SELECT pr.component_product_id, pr.component_variant_id, pr.quantity AS factor,
           p.name AS comp_product_name,
           CASE 
             WHEN pr.component_variant_id IS NOT NULL THEN
               coalesce(pv.quantity, 0)
             WHEN EXISTS (SELECT 1 FROM public.batches b WHERE b.product_id = pr.component_product_id AND b.is_active = 1) THEN
               coalesce((SELECT sum(b.quantity) FROM public.batches b WHERE b.product_id = pr.component_product_id AND b.is_active = 1 AND b.variant_id IS NULL AND b.quantity > 0), 0)
             ELSE
               GREATEST(0, coalesce(p.quantity, 0))
           END AS comp_stock_disponible
    FROM public.product_recipes pr
    JOIN public.products p ON p.id = pr.component_product_id
    LEFT JOIN public.product_variants pv ON pv.id = pr.component_variant_id
    WHERE pr.parent_product_id = p_product_id
  LOOP
    IF v_receta_record.comp_stock_disponible < (p_cantidad * v_receta_record.factor) THEN
      RAISE EXCEPTION 'Stock insuficiente del insumo %: requiere %, disponible %',
        v_receta_record.comp_product_name, (p_cantidad * v_receta_record.factor), v_receta_record.comp_stock_disponible;
    END IF;
  END LOOP;

  -- 2. Descontar cada insumo por FIFO de sus lotes respectivos
  FOR v_receta_record IN
    SELECT pr.component_product_id, pr.component_variant_id, pr.quantity AS factor,
           p.name AS comp_product_name, pv.nombre_variante AS comp_variant_name
    FROM public.product_recipes pr
    JOIN public.products p ON p.id = pr.component_product_id
    LEFT JOIN public.product_variants pv ON pv.id = pr.component_variant_id
    WHERE pr.parent_product_id = p_product_id
  LOOP
    v_comp_qty_to_deduct := p_cantidad * v_receta_record.factor;

    IF v_receta_record.component_variant_id IS NOT NULL THEN
      FOR v_comp_batch_record IN
        SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost
        FROM public.batches
        WHERE product_id = v_receta_record.component_product_id AND variant_id = v_receta_record.component_variant_id AND coalesce(quantity, 0) > 0
        ORDER BY created_at ASC, id ASC
        FOR UPDATE
      LOOP
        IF v_comp_qty_to_deduct <= 0 THEN EXIT; END IF;
        IF v_comp_batch_record.qty >= v_comp_qty_to_deduct THEN
          UPDATE public.batches SET quantity = (v_comp_batch_record.qty - v_comp_qty_to_deduct) WHERE id = v_comp_batch_record.id;
          v_comp_deducted := v_comp_qty_to_deduct;
          v_comp_qty_to_deduct := 0;
        ELSE
          UPDATE public.batches SET quantity = 0 WHERE id = v_comp_batch_record.id;
          v_comp_deducted := v_comp_batch_record.qty;
          v_comp_qty_to_deduct := v_comp_qty_to_deduct - v_comp_batch_record.qty;
        END IF;

        v_costo_insumos_total := v_costo_insumos_total + (v_comp_deducted * coalesce(v_comp_batch_record.cost, 0));

        INSERT INTO public.inventory_movements (
          batch_id, variant_id, variant_name, product_id, product_name, change_amount,
          previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
        ) VALUES (
          v_comp_batch_record.id, v_receta_record.component_variant_id, v_receta_record.comp_variant_name,
          v_receta_record.component_product_id, v_receta_record.comp_product_name, -v_comp_deducted,
          v_comp_batch_record.qty, (v_comp_batch_record.qty - v_comp_deducted),
          'PRODUCCION', 'Insumo para producción de ' || v_parent_record.name, 'Lote producido ' || p_cantidad::text || ' und', now(), coalesce(p_usuario, 'Sistema'), 1
        );
      END LOOP;

      -- Sincronizar stock de la variante
      IF EXISTS (SELECT 1 FROM public.batches b WHERE b.product_id = v_receta_record.component_product_id AND b.variant_id = v_receta_record.component_variant_id AND b.is_active = 1) THEN
        UPDATE public.product_variants
        SET quantity = (
          SELECT coalesce(sum(b.quantity), 0)
          FROM public.batches b
          WHERE b.product_id = v_receta_record.component_product_id AND b.variant_id = v_receta_record.component_variant_id AND b.is_active = 1
        )
        WHERE id = v_receta_record.component_variant_id
        RETURNING coalesce(quantity, 0) INTO v_comp_current_stock;
      ELSE
        UPDATE public.product_variants
        SET quantity = GREATEST(0, coalesce(quantity, 0) - (p_cantidad * v_receta_record.factor))
        WHERE id = v_receta_record.component_variant_id
        RETURNING coalesce(quantity, 0) INTO v_comp_current_stock;
      END IF;

      IF v_comp_qty_to_deduct > 0 THEN
        SELECT coalesce(cost_price, 0) INTO v_comp_costo_unit FROM public.products WHERE id = v_receta_record.component_product_id;
        v_costo_insumos_total := v_costo_insumos_total + (v_comp_qty_to_deduct * v_comp_costo_unit);

        INSERT INTO public.inventory_movements (
          batch_id, variant_id, variant_name, product_id, product_name, change_amount,
          previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
        ) VALUES (
          NULL, v_receta_record.component_variant_id, v_receta_record.comp_variant_name,
          v_receta_record.component_product_id, v_receta_record.comp_product_name, -v_comp_qty_to_deduct,
          (v_comp_current_stock + v_comp_qty_to_deduct), v_comp_current_stock,
          'PRODUCCION', 'Insumo para producción de ' || v_parent_record.name, 'Lote producido ' || p_cantidad::text || ' und', now(), coalesce(p_usuario, 'Sistema'), 1
        );
      END IF;

    ELSE
      FOR v_comp_batch_record IN
        SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost
        FROM public.batches
        WHERE product_id = v_receta_record.component_product_id AND variant_id IS NULL AND coalesce(quantity, 0) > 0
        ORDER BY created_at ASC, id ASC
        FOR UPDATE
      LOOP
        IF v_comp_qty_to_deduct <= 0 THEN EXIT; END IF;
        IF v_comp_batch_record.qty >= v_comp_qty_to_deduct THEN
          UPDATE public.batches SET quantity = (v_comp_batch_record.qty - v_comp_qty_to_deduct) WHERE id = v_comp_batch_record.id;
          v_comp_deducted := v_comp_qty_to_deduct;
          v_comp_qty_to_deduct := 0;
        ELSE
          UPDATE public.batches SET quantity = 0 WHERE id = v_comp_batch_record.id;
          v_comp_deducted := v_comp_batch_record.qty;
          v_comp_qty_to_deduct := v_comp_qty_to_deduct - v_comp_batch_record.qty;
        END IF;

        v_costo_insumos_total := v_costo_insumos_total + (v_comp_deducted * coalesce(v_comp_batch_record.cost, 0));

        INSERT INTO public.inventory_movements (
          batch_id, variant_id, variant_name, product_id, product_name, change_amount,
          previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
        ) VALUES (
          v_comp_batch_record.id, NULL, NULL,
          v_receta_record.component_product_id, v_receta_record.comp_product_name, -v_comp_deducted,
          v_comp_batch_record.qty, (v_comp_batch_record.qty - v_comp_deducted),
          'PRODUCCION', 'Insumo para producción de ' || v_parent_record.name, 'Lote producido ' || p_cantidad::text || ' und', now(), coalesce(p_usuario, 'Sistema'), 1
        );
      END LOOP;

      -- Sincronizar stock del producto con batches
      IF EXISTS (SELECT 1 FROM public.batches b WHERE b.product_id = v_receta_record.component_product_id AND b.is_active = 1) THEN
        UPDATE public.products
        SET quantity = (
          SELECT coalesce(sum(b.quantity), 0)
          FROM public.batches b
          WHERE b.product_id = v_receta_record.component_product_id AND b.is_active = 1
        )
        WHERE id = v_receta_record.component_product_id
        RETURNING coalesce(quantity, 0) INTO v_comp_current_stock;
      ELSE
        UPDATE public.products
        SET quantity = GREATEST(0, coalesce(quantity, 0) - (p_cantidad * v_receta_record.factor))
        WHERE id = v_receta_record.component_product_id
        RETURNING coalesce(quantity, 0) INTO v_comp_current_stock;
      END IF;

      IF v_comp_qty_to_deduct > 0 THEN
        SELECT coalesce(cost_price, 0) INTO v_comp_costo_unit FROM public.products WHERE id = v_receta_record.component_product_id;
        v_costo_insumos_total := v_costo_insumos_total + (v_comp_qty_to_deduct * v_comp_costo_unit);

        INSERT INTO public.inventory_movements (
          batch_id, variant_id, variant_name, product_id, product_name, change_amount,
          previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
        ) VALUES (
          NULL, NULL, NULL,
          v_receta_record.component_product_id, v_receta_record.comp_product_name, -v_comp_qty_to_deduct,
          (v_comp_current_stock + v_comp_qty_to_deduct), v_comp_current_stock,
          'PRODUCCION', 'Insumo para producción de ' || v_parent_record.name, 'Lote producido ' || p_cantidad::text || ' und', now(), coalesce(p_usuario, 'Sistema'), 1
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. Calcular costo unitario
  v_costo_unitario_final := round((v_costo_insumos_total + coalesce(p_costo_adicional, 0)) / p_cantidad, 2);

  -- 4. Crear lote para producto terminado
  v_codigo_lote := 'PROD-' || to_char(now(), 'YYYYMMDD-HH24MI');
  v_nuevo_lote_id := (extract(epoch from clock_timestamp()) * 1000)::bigint;

  INSERT INTO public.batches (
    id, product_id, quantity, initial_quantity, cost_unit, cost_total, document_ref, is_active, created_at, is_synced
  ) VALUES (
    v_nuevo_lote_id, p_product_id, p_cantidad, p_cantidad, v_costo_unitario_final,
    round(v_costo_unitario_final * p_cantidad, 2), v_codigo_lote, 1, now(), 1
  );

  -- 5. Actualizar stock y costo de producto terminado
  UPDATE public.products
  SET quantity = coalesce(quantity, 0) + p_cantidad,
      cost_price = v_costo_unitario_final
  WHERE id = p_product_id;

  -- 6. Movimiento Kardex entrada de producto elaborado
  INSERT INTO public.inventory_movements (
    batch_id, variant_id, variant_name, product_id, product_name, change_amount,
    previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced
  ) VALUES (
    v_nuevo_lote_id, NULL, NULL,
    p_product_id, v_parent_record.name, p_cantidad,
    v_parent_record.stock_actual, (v_parent_record.stock_actual + p_cantidad),
    'PRODUCCION', 'Elaboración / Fabricación de lote', 'Lote ' || v_codigo_lote, now(), coalesce(p_usuario, 'Sistema'), 1
  );

  RETURN jsonb_build_object(
    'ok', true,
    'batch_id', v_nuevo_lote_id,
    'batch_code', v_codigo_lote,
    'quantity_produced', p_cantidad,
    'cost_unit', v_costo_unitario_final,
    'total_cost', (v_costo_insumos_total + coalesce(p_costo_adicional, 0))
  );
END;
$$;

-- ============================================================================
-- FASE 9: MÚLTIPLES TIENDAS, ALMACENES Y TRASPASOS
-- FASE 10: CATÁLOGO WEB PARA PEDIDOS POR WHATSAPP
-- ============================================================================

-- 1. Tabla de tiendas / sucursales / almacenes
CREATE TABLE IF NOT EXISTS public.stores (
  id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  nombre text NOT NULL,
  codigo text,
  direccion text,
  telefono text,
  whatsapp text,
  es_almacen_principal boolean DEFAULT false,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Asegurar al menos la tienda principal por defecto (id 1)
INSERT INTO public.stores (id, nombre, codigo, es_almacen_principal, activo)
OVERRIDING SYSTEM VALUE
SELECT 1, 'Tienda Principal', 'T01', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.stores WHERE id = 1);

SELECT setval(pg_get_serial_sequence('public.stores', 'id'), coalesce(max(id), 1)) FROM public.stores;

GRANT ALL ON public.stores TO anon;

-- 2. Asociar lotes, movimientos y ventas a la tienda
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS store_id bigint DEFAULT 1 REFERENCES public.stores(id);
UPDATE public.batches SET store_id = 1 WHERE store_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_batches_store ON public.batches (store_id);

ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS store_id bigint DEFAULT 1 REFERENCES public.stores(id);
UPDATE public.inventory_movements SET store_id = 1 WHERE store_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_inv_movements_store ON public.inventory_movements (store_id);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS store_id bigint DEFAULT 1 REFERENCES public.stores(id);
UPDATE public.sales SET store_id = 1 WHERE store_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_store ON public.sales (store_id);

ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS store_id bigint DEFAULT 1 REFERENCES public.stores(id);
UPDATE public.cash_sessions SET store_id = 1 WHERE store_id IS NULL;

-- 3. Tablas de Traspasos / Traslados entre tiendas
CREATE TABLE IF NOT EXISTS public.store_transfers (
  id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  codigo text NOT NULL,
  origen_store_id bigint NOT NULL REFERENCES public.stores(id),
  destino_store_id bigint NOT NULL REFERENCES public.stores(id),
  estado text NOT NULL DEFAULT 'EN_TRANSITO',
  creado_por text,
  recibido_por text,
  fecha_envio timestamptz DEFAULT now(),
  fecha_recepcion timestamptz,
  notas text
);

CREATE TABLE IF NOT EXISTS public.store_transfer_items (
  id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  transfer_id bigint NOT NULL REFERENCES public.store_transfers(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  variant_id bigint REFERENCES public.product_variants(id),
  variant_name text,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  cost_price numeric DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transfers_origen ON public.store_transfers(origen_store_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destino ON public.store_transfers(destino_store_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON public.store_transfer_items(transfer_id);

GRANT ALL ON public.store_transfers TO anon;
GRANT ALL ON public.store_transfer_items TO anon;

-- 4. Columnas para Catálogo Web (Fase 10)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mostrar_en_catalogo boolean DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS destacado_catalogo boolean DEFAULT false;

ALTER TABLE public.empresa_config ADD COLUMN IF NOT EXISTS catalogo_activo boolean DEFAULT true;
ALTER TABLE public.empresa_config ADD COLUMN IF NOT EXISTS catalogo_whatsapp text;
ALTER TABLE public.empresa_config ADD COLUMN IF NOT EXISTS catalogo_ocultar_precios boolean DEFAULT false;
ALTER TABLE public.empresa_config ADD COLUMN IF NOT EXISTS catalogo_mensaje_bienvenida text;

-- 5. Función atómica para registrar un traspaso
CREATE OR REPLACE FUNCTION public.fn_crear_traspaso(
  p_origen_id bigint,
  p_destino_id bigint,
  p_items jsonb,
  p_notas text,
  p_usuario text,
  p_recibir_inmediato boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer_id bigint;
  v_codigo_traspaso text;
  v_num integer;
  v_item record;
  v_prod_record record;
  v_qty_needed numeric;
  v_batch record;
  v_deduct numeric;
  v_nuevo_lote_id bigint;
  v_costo_promedio numeric;
BEGIN
  IF p_origen_id = p_destino_id THEN
    RAISE EXCEPTION 'El almacén de origen y destino no pueden ser el mismo';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un producto en el traspaso';
  END IF;

  -- Generar correlativo TR-00001
  SELECT coalesce(max(id), 0) + 1 INTO v_num FROM public.store_transfers;
  v_codigo_traspaso := 'TR-' || lpad(v_num::text, 5, '0');

  -- Crear cabecera de traspaso
  INSERT INTO public.store_transfers (
    codigo, origen_store_id, destino_store_id, estado, creado_por, recibido_por,
    fecha_envio, fecha_recepcion, notas
  ) VALUES (
    v_codigo_traspaso, p_origen_id, p_destino_id,
    CASE WHEN p_recibir_inmediato THEN 'RECIBIDO' ELSE 'EN_TRANSITO' END,
    coalesce(p_usuario, 'Sistema'),
    CASE WHEN p_recibir_inmediato THEN coalesce(p_usuario, 'Sistema') ELSE NULL END,
    now(),
    CASE WHEN p_recibir_inmediato THEN now() ELSE NULL END,
    p_notas
  ) RETURNING id INTO v_transfer_id;

  -- Procesar cada item
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id bigint, variant_id bigint, cantidad numeric, cost_price numeric
  ) LOOP
    IF coalesce(v_item.cantidad, 0) <= 0 THEN
      RAISE EXCEPTION 'La cantidad del producto % debe ser mayor a 0', v_item.product_id;
    END IF;

    SELECT id, name, coalesce(quantity, 0) as stock_total INTO v_prod_record
    FROM public.products WHERE id = v_item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no encontrado', v_item.product_id;
    END IF;

    -- Insertar item en detalle
    INSERT INTO public.store_transfer_items (
      transfer_id, product_id, product_name, variant_id, variant_name, cantidad, cost_price
    ) VALUES (
      v_transfer_id, v_item.product_id, v_prod_record.name,
      v_item.variant_id,
      (SELECT name FROM public.product_variants WHERE id = v_item.variant_id),
      v_item.cantidad,
      coalesce(v_item.cost_price, 0)
    );

    -- Descontar lotes del origen
    v_qty_needed := v_item.cantidad;
    v_costo_promedio := 0;

    FOR v_batch IN
      SELECT id, batch_code, coalesce(quantity_remaining, 0) AS rem, cost_price
      FROM public.batches
      WHERE product_id = v_item.product_id
        AND store_id = p_origen_id
        AND coalesce(quantity_remaining, 0) > 0
        AND (v_item.variant_id IS NULL OR variant_id = v_item.variant_id)
      ORDER BY id ASC
    LOOP
      EXIT WHEN v_qty_needed <= 0;
      v_deduct := least(v_batch.rem, v_qty_needed);
      
      UPDATE public.batches
      SET quantity_remaining = quantity_remaining - v_deduct
      WHERE id = v_batch.id;

      v_costo_promedio := coalesce(v_batch.cost_price, 0);

      -- Kardex salida del origen
      INSERT INTO public.inventory_movements (
        batch_id, variant_id, product_id, product_name, change_amount,
        previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced, store_id
      ) VALUES (
        v_batch.id, v_item.variant_id, v_item.product_id, v_prod_record.name,
        -v_deduct, v_batch.rem, (v_batch.rem - v_deduct),
        'TRASPASO_SALIDA', 'Envío a otra tienda', v_codigo_traspaso || ' hacia almacén ' || p_destino_id,
        now(), coalesce(p_usuario, 'Sistema'), 1, p_origen_id
      );

      v_qty_needed := v_qty_needed - v_deduct;
    END LOOP;

    IF v_qty_needed > 0 THEN
      v_costo_promedio := coalesce(v_item.cost_price, 0);
    END IF;

    -- Si es recibir de inmediato, crear los lotes en el almacén destino
    IF p_recibir_inmediato THEN
      INSERT INTO public.batches (
        product_id, variant_id, batch_code, initial_quantity, quantity_remaining,
        cost_price, purchase_date, store_id, is_active
      ) VALUES (
        v_item.product_id, v_item.variant_id, 'TR-' || v_transfer_id || '-' || v_item.product_id,
        v_item.cantidad, v_item.cantidad,
        coalesce(v_item.cost_price, v_costo_promedio), now(), p_destino_id, true
      ) RETURNING id INTO v_nuevo_lote_id;

      -- Kardex entrada en el destino
      INSERT INTO public.inventory_movements (
        batch_id, variant_id, product_id, product_name, change_amount,
        previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced, store_id
      ) VALUES (
        v_nuevo_lote_id, v_item.variant_id, v_item.product_id, v_prod_record.name,
        v_item.cantidad, 0, v_item.cantidad,
        'TRASPASO_ENTRADA', 'Ingreso por traspaso desde tienda ' || p_origen_id,
        v_codigo_traspaso, now(), coalesce(p_usuario, 'Sistema'), 1, p_destino_id
      );
    END IF;

  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'transfer_id', v_transfer_id,
    'codigo', v_codigo_traspaso,
    'estado', CASE WHEN p_recibir_inmediato THEN 'RECIBIDO' ELSE 'EN_TRANSITO' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_crear_traspaso(bigint, bigint, jsonb, text, text, boolean) TO anon;

-- 6. Función para recibir un traspaso que estaba en tránsito
CREATE OR REPLACE FUNCTION public.fn_recibir_traspaso(
  p_transfer_id bigint,
  p_usuario text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trans record;
  v_item record;
  v_nuevo_lote_id bigint;
BEGIN
  SELECT * INTO v_trans FROM public.store_transfers WHERE id = p_transfer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Traspaso % no encontrado', p_transfer_id;
  END IF;

  IF v_trans.estado = 'RECIBIDO' THEN
    RETURN jsonb_build_object('ok', true, 'mensaje', 'El traspaso ya había sido recibido');
  END IF;

  IF v_trans.estado = 'ANULADO' THEN
    RAISE EXCEPTION 'No se puede recibir un traspaso anulado';
  END IF;

  -- Ingresar cada item al almacén destino
  FOR v_item IN SELECT * FROM public.store_transfer_items WHERE transfer_id = p_transfer_id LOOP
    INSERT INTO public.batches (
      product_id, variant_id, batch_code, initial_quantity, quantity_remaining,
      cost_price, purchase_date, store_id, is_active
    ) VALUES (
      v_item.product_id, v_item.variant_id, 'TR-' || p_transfer_id || '-' || v_item.product_id,
      v_item.cantidad, v_item.cantidad,
      coalesce(v_item.cost_price, 0), now(), v_trans.destino_store_id, true
    ) RETURNING id INTO v_nuevo_lote_id;

    -- Kardex entrada en el destino
    INSERT INTO public.inventory_movements (
      batch_id, variant_id, product_id, product_name, change_amount,
      previous_quantity, new_quantity, operation_type, reason, notes, created_at, "user", is_synced, store_id
    ) VALUES (
      v_nuevo_lote_id, v_item.variant_id, v_item.product_id, v_item.product_name,
      v_item.cantidad, 0, v_item.cantidad,
      'TRASPASO_ENTRADA', 'Recepción de traspaso ' || v_trans.codigo,
      'Desde tienda ' || v_trans.origen_store_id, now(), coalesce(p_usuario, 'Sistema'), 1, v_trans.destino_store_id
    );
  END LOOP;

  UPDATE public.store_transfers
  SET estado = 'RECIBIDO',
      recibido_por = coalesce(p_usuario, 'Sistema'),
      fecha_recepcion = now()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('ok', true, 'mensaje', 'Traspaso recibido correctamente');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_recibir_traspaso(bigint, text) TO anon;

-- 7. Función RPC pública para el Catálogo Web (sin sesión)
CREATE OR REPLACE FUNCTION public.fn_catalogo_publico(p_store_id bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa jsonb;
  v_tiendas jsonb;
  v_productos jsonb;
  v_categorias jsonb;
BEGIN
  -- Datos de la empresa para el catálogo
  SELECT jsonb_build_object(
    'nombre_empresa', coalesce(nombre_empresa, 'Mi Tienda'),
    'ruc', ruc,
    'telefono', telefono,
    'direccion', direccion,
    'logo_url', logo_url,
    'catalogo_activo', coalesce(catalogo_activo, true),
    'catalogo_whatsapp', coalesce(catalogo_whatsapp, telefono),
    'catalogo_ocultar_precios', coalesce(catalogo_ocultar_precios, false),
    'catalogo_mensaje_bienvenida', coalesce(catalogo_mensaje_bienvenida, '¡Hola! Te comparto nuestro catálogo.')
  ) INTO v_empresa
  FROM public.empresa_config
  LIMIT 1;

  -- Lista de tiendas activas
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'nombre', nombre, 'codigo', codigo, 'direccion', direccion, 'telefono', telefono, 'whatsapp', whatsapp
  ) ORDER BY id ASC), '[]'::jsonb) INTO v_tiendas
  FROM public.stores
  WHERE activo = true;

  -- Categorías que tienen productos visibles
  SELECT coalesce(jsonb_agg(DISTINCT jsonb_build_object('name', p.category)), '[]'::jsonb)
  INTO v_categorias
  FROM public.products p
  WHERE coalesce(p.mostrar_en_catalogo, true) = true
    AND p.category IS NOT NULL AND trim(p.category) != '';

  -- Productos visibles en el catálogo
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'code', p.code,
    'barcode', p.barcode,
    'marca', p.marca,
    'modelo', p.modelo,
    'category', coalesce(p.category, 'GENERAL'),
    'image_url', p.image_url,
    'price', p.price,
    'precio_mayorista', p.precio_mayorista,
    'unit', p.unit,
    'destacado', coalesce(p.destacado_catalogo, false),
    'stock_disponible', (
      CASE 
        WHEN EXISTS (SELECT 1 FROM public.batches b WHERE b.product_id = p.id AND (p_store_id IS NULL OR b.store_id = p_store_id)) THEN
          (SELECT coalesce(sum(b.quantity), 0) FROM public.batches b WHERE b.product_id = p.id AND (p_store_id IS NULL OR b.store_id = p_store_id) AND b.quantity > 0)
        ELSE
          coalesce(p.quantity, 0)
      END
    ),
    'variantes', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', pv.id,
        'nombre_variante', pv.nombre_variante,
        'talla', pv.talla,
        'color', pv.color,
        'barcode', pv.barcode,
        'price', coalesce(pv.price, p.price),
        'stock', (
          CASE 
            WHEN EXISTS (SELECT 1 FROM public.batches b WHERE b.product_id = p.id AND b.variant_id = pv.id AND (p_store_id IS NULL OR b.store_id = p_store_id)) THEN
              (SELECT coalesce(sum(b.quantity), 0) FROM public.batches b WHERE b.product_id = p.id AND b.variant_id = pv.id AND (p_store_id IS NULL OR b.store_id = p_store_id) AND b.quantity > 0)
            ELSE
              coalesce(pv.quantity, 0)
          END
        )
      )), '[]'::jsonb)
      FROM public.product_variants pv
      WHERE pv.product_id = p.id
    )
  ) ORDER BY p.name ASC), '[]'::jsonb) INTO v_productos
  FROM public.products p
  WHERE coalesce(p.mostrar_en_catalogo, true) = true;

  RETURN jsonb_build_object(
    'empresa', coalesce(v_empresa, '{}'::jsonb),
    'tiendas', v_tiendas,
    'categorias', v_categorias,
    'productos', v_productos
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_catalogo_publico(bigint) TO anon;

-- 8. Función RPC pública para registrar un pedido desde la web (Fase 10)
CREATE OR REPLACE FUNCTION public.fn_crear_pedido_web(
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_tipo_entrega text,
  p_direccion text,
  p_store_id bigint,
  p_items jsonb,
  p_notas text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido_id bigint;
  v_numero_pedido text;
  v_correlativo integer;
  v_total numeric := 0;
  v_item record;
  v_store_id_final bigint := coalesce(p_store_id, 1);
BEGIN
  IF trim(coalesce(p_cliente_nombre, '')) = '' THEN
    RAISE EXCEPTION 'El nombre del cliente es obligatorio';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito no tiene productos';
  END IF;

  -- Calcular total
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    cantidad numeric, precio numeric
  ) LOOP
    v_total := v_total + (coalesce(v_item.cantidad, 0) * coalesce(v_item.precio, 0));
  END LOOP;

  -- Generar número correlativo de pedido PED-0001
  SELECT coalesce(max(id), 0) + 1 INTO v_correlativo FROM public.pedidos_clientes;
  v_numero_pedido := 'PED-' || lpad(v_correlativo::text, 4, '0');

  -- Insertar en pedidos_clientes (Fase 4.6)
  INSERT INTO public.pedidos_clientes (
    numero,
    customer_name,
    customer_phone,
    tipo_entrega,
    direccion_entrega,
    total,
    adelanto,
    saldo,
    estado,
    notas,
    created_at
  ) VALUES (
    v_numero_pedido,
    trim(p_cliente_nombre),
    trim(coalesce(p_cliente_telefono, '')),
    coalesce(p_tipo_entrega, 'RECOJO'),
    trim(coalesce(p_direccion, '')),
    v_total,
    0,
    v_total,
    'POR_PREPARAR',
    'Pedido desde Catálogo Web. ' || coalesce(p_notas, ''),
    now()
  ) RETURNING id INTO v_pedido_id;

  -- Insertar detalles
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id bigint, product_name text, variant_id bigint, variant_name text,
    cantidad numeric, precio numeric, subtotal numeric
  ) LOOP
    INSERT INTO public.pedido_detalles (
      pedido_id,
      product_id,
      product_name,
      variant_id,
      variant_name,
      quantity,
      unit_price,
      subtotal
    ) VALUES (
      v_pedido_id,
      v_item.product_id,
      v_item.product_name,
      v_item.variant_id,
      v_item.variant_name,
      v_item.cantidad,
      v_item.precio,
      coalesce(v_item.subtotal, (v_item.cantidad * v_item.precio))
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'pedido_id', v_pedido_id,
    'numero', v_numero_pedido,
    'total', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_crear_pedido_web(text, text, text, text, bigint, jsonb, text) TO anon;

-- =====================================================================================
-- FASE 11.1: FACTURACIÓN ELECTRÓNICA SUNAT (boletas y facturas)
-- La Caja marca la venta como Boleta (doc_type 3) o Factura (doc_type 1); aquí se le pone la serie
-- y el número correlativo y queda "PENDIENTE". El facturador del servidor (servidor/facturador,
-- servicio siumax-facturador) la envía al proveedor (Nubefact) o la simula, y guarda la respuesta.
-- OJO: sales.sunat_status NO es de SUNAT (es el estado interno ACEPTADO/ANULADO que filtran todos
-- los reportes). El estado real del comprobante va en las columnas cpe_*.
-- =====================================================================================

-- Los datos del negocio para SUNAT van en Ajustes > Datos de la empresa (empresa_config), junto al nombre,
-- el RUC y la dirección que ya estaban ahí: así hay un solo lugar (pedido del dueño, 02/11/2026).
ALTER TABLE public.empresa_config ADD COLUMN IF NOT EXISTS razon_social text;  -- como figura en SUNAT
ALTER TABLE public.empresa_config ADD COLUMN IF NOT EXISTS ubigeo text;        -- 6 números (opcional)
ALTER TABLE public.empresa_config ADD COLUMN IF NOT EXISTS regimen text;       -- GENERAL, MYPE, RER o NRUS
-- (05/11/2026) Utilidades › Gráficos y detalles: gastos fijos del mes (alquiler, sueldos, luz…) para el punto de
-- equilibrio. Lo cambia quien tiene 'gerencia_configuracion_sistema' (mismo permiso que PATCH /empresa_config).
ALTER TABLE public.empresa_config ADD COLUMN IF NOT EXISTS gastos_fijos_mes numeric NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresa_config_regimen_valido') THEN
    ALTER TABLE public.empresa_config ADD CONSTRAINT empresa_config_regimen_valido
      CHECK (regimen IS NULL OR regimen IN ('GENERAL', 'MYPE', 'RER', 'NRUS'));
  END IF;
END $$;

-- Configuración de la facturación (una sola fila): series, modo y proveedor. Se lee con la sesión;
-- la cambia quien tiene "Configuración del sistema" (fn_permisos_requeridos).
CREATE TABLE IF NOT EXISTS public.facturacion_config (
  id                      integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  activo                  boolean NOT NULL DEFAULT false,
  modo                    text NOT NULL DEFAULT 'SIMULADO' CHECK (modo IN ('SIMULADO', 'PRUEBA', 'REAL')),
  proveedor               text NOT NULL DEFAULT 'NUBEFACT' CHECK (proveedor IN ('NUBEFACT')),
  serie_boleta            text NOT NULL DEFAULT 'B001' CHECK (serie_boleta ~ '^B[A-Z0-9]{3}$'),
  serie_factura           text NOT NULL DEFAULT 'F001' CHECK (serie_factura ~ '^F[A-Z0-9]{3}$'),
  serie_nc_boleta         text NOT NULL DEFAULT 'BC01' CHECK (serie_nc_boleta ~ '^B[A-Z0-9]{3}$'),
  serie_nc_factura        text NOT NULL DEFAULT 'FC01' CHECK (serie_nc_factura ~ '^F[A-Z0-9]{3}$'),
  igv_porcentaje          numeric(5,2) NOT NULL DEFAULT 18 CHECK (igv_porcentaje >= 0 AND igv_porcentaje < 100),
  comprobante_por_defecto text NOT NULL DEFAULT 'NOTA' CHECK (comprobante_por_defecto IN ('NOTA', 'BOLETA', 'FACTURA')),
  -- "Probar conexión": la pantalla pide (prueba_pedida_at) y el facturador responde (prueba_*)
  prueba_pedida_at        timestamptz,
  prueba_at               timestamptz,
  prueba_ok               boolean,
  prueba_mensaje          text,
  -- El facturador escribe aquí cada pocos segundos: así la pantalla sabe si está funcionando
  facturador_visto_at     timestamptz,
  facturador_version      text,
  updated_at              timestamptz DEFAULT now()
);
INSERT INTO public.facturacion_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
-- (la primera versión de la 11.1 tenía aquí los datos del negocio; ahora están en empresa_config)
ALTER TABLE public.facturacion_config DROP COLUMN IF EXISTS ruc, DROP COLUMN IF EXISTS razon_social,
  DROP COLUMN IF EXISTS nombre_comercial, DROP COLUMN IF EXISTS direccion_fiscal,
  DROP COLUMN IF EXISTS ubigeo, DROP COLUMN IF EXISTS regimen;

-- La clave del proveedor: en un esquema que la API NO publica ni puede leer. Solo la usa el facturador
-- (que entra a la base como postgres) y se escribe con fn_guardar_credenciales_facturacion.
CREATE SCHEMA IF NOT EXISTS privado;
REVOKE ALL ON SCHEMA privado FROM PUBLIC;
CREATE TABLE IF NOT EXISTS privado.facturacion_credenciales (
  id              integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ruta            text NOT NULL,
  token           text NOT NULL,
  actualizado_por text,
  updated_at      timestamptz DEFAULT now()
);
REVOKE ALL ON privado.facturacion_credenciales FROM PUBLIC;

-- Último número usado de cada serie (B001, F001...). Solo lo cambian las funciones de abajo.
CREATE TABLE IF NOT EXISTS public.cpe_correlativos (
  serie      text PRIMARY KEY,
  ultimo     bigint NOT NULL DEFAULT 0 CHECK (ultimo >= 0),
  updated_at timestamptz DEFAULT now()
);

-- Comprobante electrónico de la venta (doc_type: 1 factura, 3 boleta; NULL = nota de venta)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_estado text;          -- PENDIENTE, ENVIANDO, ACEPTADO, OBSERVADO, RECHAZADO, ERROR
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_modo text;            -- SIMULADO / PRUEBA / REAL al emitir
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_intentos integer NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_proximo_intento timestamptz;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_mensaje text;         -- respuesta de SUNAT o del proveedor
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_enviado_at timestamptz;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_pdf text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_xml text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_cdr text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_qr text;              -- texto del código QR del ticket
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_cliente_tipo_doc text; -- DNI, RUC, CE o SIN
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_cliente_num_doc text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_cliente_nombre text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cpe_cliente_direccion text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_cpe_estado_valido') THEN
    ALTER TABLE public.sales ADD CONSTRAINT sales_cpe_estado_valido
      CHECK (cpe_estado IS NULL OR cpe_estado IN ('PENDIENTE', 'ENVIANDO', 'ACEPTADO', 'OBSERVADO', 'RECHAZADO', 'ERROR'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS sales_cpe_pendientes ON public.sales (cpe_proximo_intento)
  WHERE cpe_estado IN ('PENDIENTE', 'ENVIANDO', 'ERROR');
-- Nunca dos comprobantes con la misma serie y número
CREATE UNIQUE INDEX IF NOT EXISTS sales_cpe_numero_unico ON public.sales (doc_serial, doc_number)
  WHERE doc_serial IS NOT NULL AND doc_number IS NOT NULL;

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'web_anon'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.facturacion_config TO %I', r);
      EXECUTE format('GRANT SELECT ON public.cpe_correlativos TO %I', r);
    END IF;
  END LOOP;
END $$;

-- Siguiente número de una serie, sin saltos ni repetidos aunque vendan dos cajas a la vez.
CREATE OR REPLACE FUNCTION public.fn_siguiente_correlativo(p_serie text)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.cpe_correlativos (serie, ultimo) VALUES (p_serie, 1)
  ON CONFLICT (serie) DO UPDATE SET ultimo = cpe_correlativos.ultimo + 1, updated_at = now()
  RETURNING ultimo;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_siguiente_correlativo(text) FROM PUBLIC;

-- Al crear la venta: si es Boleta o Factura, revisa las reglas de SUNAT y le pone serie y número.
CREATE OR REPLACE FUNCTION public.fn_asignar_comprobante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cfg public.facturacion_config%ROWTYPE;
  v_regimen text := (SELECT regimen FROM public.empresa_config ORDER BY id LIMIT 1);
  v_doc text := upper(coalesce(trim(NEW.cpe_cliente_tipo_doc), 'SIN'));
  v_num text := nullif(trim(coalesce(NEW.cpe_cliente_num_doc, '')), '');
BEGIN
  IF NEW.doc_type IS NULL OR NEW.doc_type NOT IN (1, 3) THEN
    -- Nota de venta: nunca lleva datos de comprobante electrónico
    NEW.doc_type := NULL; NEW.doc_serial := NULL; NEW.doc_number := NULL;
    NEW.cpe_estado := NULL; NEW.cpe_modo := NULL;
    RETURN NEW;
  END IF;

  SELECT * INTO cfg FROM public.facturacion_config WHERE id = 1;
  IF NOT coalesce(cfg.activo, false) THEN
    RAISE EXCEPTION 'La facturación electrónica no está activada'
      USING HINT = 'Actívala en Ajustes > Facturación o cobra con Nota de venta.';
  END IF;

  IF NEW.doc_type = 1 THEN
    IF v_regimen = 'NRUS' THEN
      RAISE EXCEPTION 'En el Nuevo RUS solo se emiten boletas, no facturas';
    END IF;
    IF v_doc <> 'RUC' OR v_num IS NULL OR v_num !~ '^(10|15|16|17|20)\d{9}$' THEN
      RAISE EXCEPTION 'La factura necesita el RUC del cliente (11 números)';
    END IF;
    IF nullif(trim(coalesce(NEW.cpe_cliente_nombre, '')), '') IS NULL THEN
      RAISE EXCEPTION 'La factura necesita la razón social del cliente';
    END IF;
  ELSE
    -- Boleta de más de S/ 700: SUNAT pide identificar al comprador
    IF coalesce(NEW.total, 0) > 700 AND (v_doc = 'SIN' OR v_num IS NULL) THEN
      RAISE EXCEPTION 'Una boleta de más de S/ 700 necesita el DNI (o documento) del cliente';
    END IF;
    IF v_doc = 'DNI' AND v_num IS NOT NULL AND v_num !~ '^\d{8}$' THEN
      RAISE EXCEPTION 'El DNI tiene 8 números';
    END IF;
  END IF;

  NEW.cpe_cliente_tipo_doc := CASE WHEN v_num IS NULL THEN 'SIN' ELSE v_doc END;
  NEW.cpe_cliente_num_doc := v_num;
  NEW.doc_serial := CASE WHEN NEW.doc_type = 1 THEN cfg.serie_factura ELSE cfg.serie_boleta END;
  NEW.doc_number := public.fn_siguiente_correlativo(NEW.doc_serial)::text;
  NEW.cpe_estado := 'PENDIENTE';
  NEW.cpe_modo := cfg.modo;
  NEW.cpe_intentos := 0;
  NEW.cpe_mensaje := NULL; NEW.cpe_enviado_at := NULL;
  NEW.cpe_pdf := NULL; NEW.cpe_xml := NULL; NEW.cpe_cdr := NULL; NEW.cpe_qr := NULL; NEW.sunat_hash := NULL;
  -- La Caja guarda primero la venta y después sus productos: se espera un momento antes de enviarla
  NEW.cpe_proximo_intento := now() + interval '4 seconds';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_asignar_comprobante ON public.sales;
CREATE TRIGGER trg_asignar_comprobante BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_asignar_comprobante();

-- Desde la pantalla (API) no se puede tocar un comprobante ya emitido: solo el facturador (postgres).
-- Una boleta/factura ACEPTADA no se anula ni se borra: se corrige con nota de crédito (fase 11.5).
CREATE OR REPLACE FUNCTION public.fn_proteger_comprobante()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Sin pedido de la API (facturador, psql) o desde una función interna que lo permite (fn_reenviar_comprobante)
  IF current_setting('request.method', true) IS NULL OR OLD.doc_type IS NULL
     OR current_setting('siumax.cpe_interno', true) = '1' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Esta venta tiene boleta o factura electrónica: no se puede borrar';
  END IF;
  IF NEW.doc_type IS DISTINCT FROM OLD.doc_type OR NEW.doc_serial IS DISTINCT FROM OLD.doc_serial
     OR NEW.doc_number IS DISTINCT FROM OLD.doc_number OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.cpe_estado IS DISTINCT FROM OLD.cpe_estado OR NEW.cpe_cliente_num_doc IS DISTINCT FROM OLD.cpe_cliente_num_doc
     OR NEW.cpe_cliente_nombre IS DISTINCT FROM OLD.cpe_cliente_nombre THEN
    RAISE EXCEPTION 'Los datos de una boleta o factura electrónica no se pueden cambiar';
  END IF;
  IF NEW.sunat_status = 'ANULADO' AND OLD.sunat_status IS DISTINCT FROM 'ANULADO' AND OLD.cpe_estado IS DISTINCT FROM 'RECHAZADO' THEN
    -- (una RECHAZADA no tiene valor ante SUNAT: esa sí se puede anular como una nota de venta)
    RAISE EXCEPTION 'Esta venta tiene boleta o factura electrónica: se anula con una nota de crédito'
      USING HINT = 'La nota de crédito llega en la fase 11.5.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_proteger_comprobante ON public.sales;
CREATE TRIGGER trg_proteger_comprobante BEFORE UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_comprobante();

-- Guardar la ruta y la clave del proveedor (se escriben, nunca se vuelven a leer desde la pantalla)
CREATE OR REPLACE FUNCTION public.fn_estado_credenciales_facturacion()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce((
    SELECT jsonb_build_object(
      'tiene', true,
      'ruta', regexp_replace(c.ruta, '^(https?://[^/]+/).*(.{4})$', '\1…\2'),
      'token_final', '…' || right(c.token, 4),
      'actualizado_por', c.actualizado_por,
      'updated_at', c.updated_at)
    FROM privado.facturacion_credenciales c WHERE c.id = 1
  ), jsonb_build_object('tiene', false));
$$;

CREATE OR REPLACE FUNCTION public.fn_guardar_credenciales_facturacion(p_ruta text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quien text := (SELECT nombre FROM public.fn_empleado_de_sesion());
BEGIN
  IF coalesce(trim(p_ruta), '') !~ '^https://[^ ]+$' THEN
    RAISE EXCEPTION 'La ruta del proveedor debe empezar con https://';
  END IF;
  IF length(coalesce(trim(p_token), '')) < 10 THEN
    RAISE EXCEPTION 'La clave (token) del proveedor parece incompleta';
  END IF;
  INSERT INTO privado.facturacion_credenciales (id, ruta, token, actualizado_por, updated_at)
  VALUES (1, trim(p_ruta), trim(p_token), v_quien, now())
  ON CONFLICT (id) DO UPDATE SET ruta = EXCLUDED.ruta, token = EXCLUDED.token,
    actualizado_por = EXCLUDED.actualizado_por, updated_at = now();
  -- Con clave nueva, la prueba anterior ya no vale
  UPDATE public.facturacion_config SET prueba_at = NULL, prueba_ok = NULL, prueba_mensaje = NULL WHERE id = 1;
  RETURN public.fn_estado_credenciales_facturacion();
END;
$$;

-- Empezar la numeración desde un número (si ya emitía boletas en otro sistema con la misma serie).
-- Solo hacia arriba y nunca por debajo de lo ya emitido en SiuMax.
CREATE OR REPLACE FUNCTION public.fn_fijar_correlativo(p_serie text, p_ultimo bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usado bigint;
BEGIN
  IF p_serie !~ '^[BF][A-Z0-9]{3}$' THEN RAISE EXCEPTION 'Serie no válida: %', p_serie; END IF;
  IF p_ultimo IS NULL OR p_ultimo < 0 OR p_ultimo > 99999999 THEN RAISE EXCEPTION 'Número no válido'; END IF;
  SELECT coalesce(max(doc_number::bigint), 0) INTO v_usado FROM public.sales WHERE doc_serial = p_serie AND doc_number ~ '^\d+$';
  IF p_ultimo < v_usado THEN
    RAISE EXCEPTION 'SiuMax ya emitió hasta el % con la serie %: no se puede volver atrás', v_usado, p_serie;
  END IF;
  INSERT INTO public.cpe_correlativos (serie, ultimo) VALUES (p_serie, p_ultimo)
  ON CONFLICT (serie) DO UPDATE SET ultimo = EXCLUDED.ultimo, updated_at = now();
  RETURN p_ultimo;
END;
$$;

-- -------------------------------------------------------------------------------------
-- FASE 11.2: tipo de IGV por producto y bolsas plásticas (ICBPER)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tipo_igv text NOT NULL DEFAULT 'GRAVADO';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS es_bolsa boolean NOT NULL DEFAULT false;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_tipo_igv_valido') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_tipo_igv_valido CHECK (tipo_igv IN ('GRAVADO', 'EXONERADO', 'INAFECTO'));
  END IF;
END $$;
-- Cada línea guarda el impuesto que tenía el producto AL VENDER (cambiar el producto después no cambia ventas pasadas)
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS tipo_igv text;
ALTER TABLE public.sale_details ADD COLUMN IF NOT EXISTS es_bolsa boolean;
-- Impuesto a las bolsas plásticas por unidad (S/ 0.50 desde 2023); editable por si la ley cambia
ALTER TABLE public.facturacion_config ADD COLUMN IF NOT EXISTS icbper_monto numeric(6,2) NOT NULL DEFAULT 0.50;

CREATE OR REPLACE FUNCTION public.fn_impuesto_linea_venta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tipo_igv IS NULL OR NEW.es_bolsa IS NULL THEN
    SELECT coalesce(NEW.tipo_igv, p.tipo_igv, 'GRAVADO'), coalesce(NEW.es_bolsa, p.es_bolsa, false)
      INTO NEW.tipo_igv, NEW.es_bolsa
      FROM public.products p WHERE p.id = NEW.product_id;
    NEW.tipo_igv := coalesce(NEW.tipo_igv, 'GRAVADO');
    NEW.es_bolsa := coalesce(NEW.es_bolsa, false);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_impuesto_linea_venta ON public.sale_details;
CREATE TRIGGER trg_impuesto_linea_venta BEFORE INSERT ON public.sale_details
  FOR EACH ROW EXECUTE FUNCTION public.fn_impuesto_linea_venta();

-- -------------------------------------------------------------------------------------
-- FASE 11.4: volver a enviar un comprobante que quedó con ERROR (o atascado en PENDIENTE)
-- Una RECHAZADA por SUNAT no se reenvía igual: hay que corregir y emitir otra (con nota de crédito).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_reenviar_comprobante(p_sale_id bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_estado text;
BEGIN
  SELECT cpe_estado INTO v_estado FROM public.sales WHERE id = p_sale_id AND doc_type IS NOT NULL;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'Esa venta no tiene boleta ni factura electrónica'; END IF;
  IF v_estado NOT IN ('ERROR', 'PENDIENTE') THEN
    RAISE EXCEPTION 'Solo se reenvía un comprobante con error o pendiente (este está %)', lower(v_estado);
  END IF;
  PERFORM set_config('siumax.cpe_interno', '1', true);   -- deja pasar el cambio (solo en esta transacción)
  UPDATE public.sales SET cpe_estado = 'PENDIENTE', cpe_intentos = 0, cpe_proximo_intento = now(), cpe_mensaje = 'Reenvío pedido desde la pantalla'
   WHERE id = p_sale_id;
  RETURN 'PENDIENTE';
END;
$$;

-- -------------------------------------------------------------------------------------
-- FASE 11.5: NOTAS DE CRÉDITO (anular o devolver una venta con boleta/factura electrónica)
-- La boleta/factura enviada a SUNAT no se cambia ni se borra: se corrige con una nota de crédito
-- (serie BC01 para boletas, FC01 para facturas) que el facturador envía igual que los comprobantes.
-- Motivos SUNAT usados: 01 anulación de la operación (anular la venta completa), 07 devolución por ítem.
-- Se guarda aparte (no en sales) para no tocar los reportes de ventas.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notas_credito (
  id                  bigint PRIMARY KEY DEFAULT (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
  sale_id             bigint NOT NULL REFERENCES public.sales (id),
  motivo              text NOT NULL CHECK (motivo IN ('01', '06', '07')),
  descripcion         text,
  total               numeric NOT NULL CHECK (total > 0),
  items               jsonb NOT NULL,               -- [{detail_id, product_id, product_name, quantity, subtotal, tipo_igv, es_bolsa, ...}]
  doc_type            integer NOT NULL DEFAULT 7,
  doc_serial          text,
  doc_number          text,
  ref_doc_type        integer,                      -- comprobante que modifica: 1 factura, 3 boleta
  ref_serial          text,
  ref_number          text,
  cpe_estado          text NOT NULL DEFAULT 'PENDIENTE'
                      CHECK (cpe_estado IN ('PENDIENTE', 'ENVIANDO', 'ACEPTADO', 'OBSERVADO', 'RECHAZADO', 'ERROR')),
  cpe_modo            text,
  cpe_intentos        integer NOT NULL DEFAULT 0,
  cpe_proximo_intento timestamptz,
  cpe_mensaje         text,
  cpe_enviado_at      timestamptz,
  cpe_pdf             text,
  cpe_xml             text,
  cpe_cdr             text,
  cpe_qr              text,
  sunat_hash          text,
  creado_por          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notas_credito_venta ON public.notas_credito (sale_id);
CREATE INDEX IF NOT EXISTS notas_credito_pendientes ON public.notas_credito (cpe_proximo_intento)
  WHERE cpe_estado IN ('PENDIENTE', 'ENVIANDO', 'ERROR');
CREATE UNIQUE INDEX IF NOT EXISTS notas_credito_numero_unico ON public.notas_credito (doc_serial, doc_number)
  WHERE doc_serial IS NOT NULL;
-- La pantalla solo LEE; se crean con fn_anular_venta y fn_devolver_con_nota_credito
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'web_anon'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT SELECT ON public.notas_credito TO %I', r);
    END IF;
  END LOOP;
END $$;

-- Al crear la nota: comprobante que modifica, serie (BC01/FC01), número y modo
CREATE OR REPLACE FUNCTION public.fn_asignar_nota_credito()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_venta public.sales%ROWTYPE;
  cfg public.facturacion_config%ROWTYPE;
BEGIN
  SELECT * INTO v_venta FROM public.sales WHERE id = NEW.sale_id;
  IF v_venta.doc_type IS NULL OR v_venta.doc_type NOT IN (1, 3) THEN
    RAISE EXCEPTION 'La nota de crédito solo corrige una boleta o una factura electrónica';
  END IF;
  IF v_venta.cpe_estado = 'RECHAZADO' THEN
    RAISE EXCEPTION 'Esa boleta/factura fue rechazada por SUNAT: no necesita nota de crédito';
  END IF;
  SELECT * INTO cfg FROM public.facturacion_config WHERE id = 1;
  NEW.doc_type := 7;
  NEW.ref_doc_type := v_venta.doc_type;
  NEW.ref_serial := v_venta.doc_serial;
  NEW.ref_number := v_venta.doc_number;
  NEW.doc_serial := CASE WHEN v_venta.doc_type = 1 THEN cfg.serie_nc_factura ELSE cfg.serie_nc_boleta END;
  NEW.doc_number := public.fn_siguiente_correlativo(NEW.doc_serial)::text;
  NEW.cpe_estado := 'PENDIENTE';
  NEW.cpe_modo := coalesce(v_venta.cpe_modo, cfg.modo);
  NEW.cpe_intentos := 0;
  NEW.cpe_proximo_intento := now() + interval '2 seconds';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_asignar_nota_credito ON public.notas_credito;
CREATE TRIGGER trg_asignar_nota_credito BEFORE INSERT ON public.notas_credito
  FOR EACH ROW EXECUTE FUNCTION public.fn_asignar_nota_credito();

-- Devolver PARTE de una venta con boleta/factura: nota de crédito por lo devuelto (motivo 07), el stock
-- vuelve y, si se indica el turno de caja, se registra la devolución del dinero. Todo o nada.
-- p_items: [{"detail_id": 123, "cantidad": 1}, ...]
CREATE OR REPLACE FUNCTION public.fn_devolver_con_nota_credito(p_sale_id bigint, p_items jsonb, p_sesion_caja text DEFAULT NULL,
                                                               p_motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp record;
  v_venta public.sales%ROWTYPE;
  v_item record;
  d public.sale_details%ROWTYPE;
  v_devuelto numeric;
  v_sub numeric;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  v_mov record;
  v_nuevo numeric;
  v_nc public.notas_credito%ROWTYPE;
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF NOT fn_tiene_permiso(v_emp.permisos, ARRAY['reportes_anular_ventas']) THEN
    RAISE EXCEPTION 'No tienes permiso para devoluciones.';
  END IF;

  SELECT * INTO v_venta FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la venta.'; END IF;
  IF v_venta.sunat_status = 'ANULADO' THEN RAISE EXCEPTION 'Esa venta ya está anulada.'; END IF;
  IF v_venta.doc_type IS NULL THEN RAISE EXCEPTION 'Esa venta no tiene boleta ni factura: usa el cambio de producto de siempre.'; END IF;
  IF coalesce(v_venta.amount_credit, 0) > 0 THEN
    RAISE EXCEPTION 'Venta al crédito (fiado): para devolver, anúlala completa.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Elige qué productos se devuelven.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(detail_id bigint, cantidad numeric) LOOP
    IF coalesce(v_item.cantidad, 0) <= 0 THEN CONTINUE; END IF;
    SELECT * INTO d FROM public.sale_details WHERE id = v_item.detail_id AND sale_id = p_sale_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ese producto no es de esta venta.'; END IF;
    SELECT coalesce(sum((it ->> 'quantity')::numeric), 0) INTO v_devuelto
      FROM public.notas_credito nc, jsonb_array_elements(nc.items) it
     WHERE nc.sale_id = p_sale_id AND (it ->> 'detail_id')::bigint = d.id;
    IF v_item.cantidad > coalesce(d.quantity, 0) - v_devuelto THEN
      RAISE EXCEPTION 'De "%" solo quedan % por devolver.', d.product_name, coalesce(d.quantity, 0) - v_devuelto;
    END IF;
    v_sub := round(coalesce(d.subtotal, 0) * v_item.cantidad / nullif(d.quantity, 0), 2);
    v_total := v_total + v_sub;
    v_items := v_items || jsonb_build_object(
      'detail_id', d.id, 'product_id', d.product_id, 'product_name', d.product_name, 'variant_id', d.variant_id,
      'variant_name', d.variant_name, 'quantity', v_item.cantidad, 'subtotal', v_sub,
      'tipo_igv', coalesce(d.tipo_igv, 'GRAVADO'), 'es_bolsa', coalesce(d.es_bolsa, false));

    -- El stock vuelve (al lote de donde salió, si se sabe)
    SELECT * INTO v_mov FROM public.inventory_movements
     WHERE operation_type = 'VENTA' AND notes = 'Ticket #' || p_sale_id::text AND product_id = d.product_id
       AND variant_id IS NOT DISTINCT FROM d.variant_id
     ORDER BY id LIMIT 1;
    IF d.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET quantity = coalesce(quantity, 0) + v_item.cantidad WHERE id = d.variant_id RETURNING quantity INTO v_nuevo;
    ELSE
      UPDATE public.products SET quantity = coalesce(quantity, 0) + v_item.cantidad WHERE id = d.product_id RETURNING quantity INTO v_nuevo;
    END IF;
    IF v_mov.batch_id IS NOT NULL THEN
      UPDATE public.batches SET quantity = coalesce(quantity, 0) + v_item.cantidad WHERE id = v_mov.batch_id;
    END IF;
    INSERT INTO public.inventory_movements (batch_id, variant_id, variant_name, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                            operation_type, reason, notes, created_at, "user", is_synced)
    VALUES (v_mov.batch_id, d.variant_id, d.variant_name, d.product_id, d.product_name, v_item.cantidad, coalesce(v_nuevo, 0) - v_item.cantidad, coalesce(v_nuevo, 0),
            'DEVOLUCION', 'Devolución con nota de crédito', 'Devolución Ticket #' || p_sale_id::text, now(), v_emp.nombre, 1);
  END LOOP;

  IF v_total <= 0 THEN RAISE EXCEPTION 'Elige qué productos se devuelven.'; END IF;

  INSERT INTO public.notas_credito (sale_id, motivo, descripcion, total, items, creado_por)
  VALUES (p_sale_id, '07', coalesce(nullif(trim(p_motivo), ''), 'DEVOLUCIÓN DE PRODUCTOS'), v_total, v_items, v_emp.nombre)
  RETURNING * INTO v_nc;

  IF p_sesion_caja IS NOT NULL THEN
    INSERT INTO public.cash_movements (id, session_id, type, amount, description, payment_type, flujo, created_at, is_synced)
    VALUES ((extract(epoch FROM clock_timestamp()) * 1000)::bigint, p_sesion_caja, 'EGRESO', v_total,
            'Devolución con nota de crédito ' || v_nc.doc_serial || '-' || lpad(v_nc.doc_number, 8, '0') || ' (Ticket #' || right(p_sale_id::text, 6) || ')',
            'EFECTIVO', 'DEVOLUCION', now(), 1);
  END IF;
  RETURN jsonb_build_object('nota_credito', v_nc.doc_serial || '-' || lpad(v_nc.doc_number, 8, '0'), 'total', v_total, 'id', v_nc.id);
END;
$$;

-- Volver a enviar una nota de crédito que quedó con error (como fn_reenviar_comprobante)
CREATE OR REPLACE FUNCTION public.fn_reenviar_nota_credito(p_id bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.notas_credito SET cpe_estado = 'PENDIENTE', cpe_intentos = 0, cpe_proximo_intento = now(), cpe_mensaje = 'Reenvío pedido desde la pantalla'
   WHERE id = p_id AND cpe_estado IN ('ERROR', 'PENDIENTE');
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo se reenvía una nota de crédito con error o pendiente'; END IF;
  RETURN 'PENDIENTE';
END;
$$;

-- -------------------------------------------------------------------------------------
-- FASE 11.8: ENVÍO DIRECTO A SUNAT (sin proveedor)
-- proveedor = 'SUNAT': el facturador arma, firma y envía el XML a SUNAT (servidor/facturador/sunat.mjs).
-- Necesita el usuario SOL SECUNDARIO y el certificado digital (.pfx) del negocio; se guardan en el
-- esquema privado (la API no los puede leer). En modo PRUEBA usa el ambiente beta de SUNAT y no los pide.
-- -------------------------------------------------------------------------------------
ALTER TABLE public.facturacion_config DROP CONSTRAINT IF EXISTS facturacion_config_proveedor_check;
ALTER TABLE public.facturacion_config ADD CONSTRAINT facturacion_config_proveedor_check CHECK (proveedor IN ('NUBEFACT', 'SUNAT'));
ALTER TABLE privado.facturacion_credenciales ALTER COLUMN ruta DROP NOT NULL;
ALTER TABLE privado.facturacion_credenciales ALTER COLUMN token DROP NOT NULL;
ALTER TABLE privado.facturacion_credenciales ADD COLUMN IF NOT EXISTS sol_usuario text;
ALTER TABLE privado.facturacion_credenciales ADD COLUMN IF NOT EXISTS sol_clave text;
ALTER TABLE privado.facturacion_credenciales ADD COLUMN IF NOT EXISTS cert_pfx text;     -- archivo .pfx en base64
ALTER TABLE privado.facturacion_credenciales ADD COLUMN IF NOT EXISTS cert_clave text;

CREATE OR REPLACE FUNCTION public.fn_estado_credenciales_facturacion()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce((
    SELECT jsonb_build_object(
      'tiene', c.ruta IS NOT NULL AND c.token IS NOT NULL,
      'ruta', CASE WHEN c.ruta IS NULL THEN NULL ELSE regexp_replace(c.ruta, '^(https?://[^/]+/).*(.{4})$', '\1…\2') END,
      'token_final', CASE WHEN c.token IS NULL THEN NULL ELSE '…' || right(c.token, 4) END,
      'sunat_usuario', c.sol_usuario,
      'sunat_certificado', c.cert_pfx IS NOT NULL,
      'actualizado_por', c.actualizado_por,
      'updated_at', c.updated_at)
    FROM privado.facturacion_credenciales c WHERE c.id = 1
  ), jsonb_build_object('tiene', false, 'sunat_certificado', false));
$$;

-- Guardar el usuario SOL secundario y el certificado (.pfx en base64) para enviar directo a SUNAT
CREATE OR REPLACE FUNCTION public.fn_guardar_credenciales_sunat(p_usuario text, p_clave text, p_pfx text, p_pfx_clave text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quien text := (SELECT nombre FROM public.fn_empleado_de_sesion());
BEGIN
  IF coalesce(trim(p_usuario), '') !~ '^[A-Za-z0-9]{3,20}$' THEN
    RAISE EXCEPTION 'El usuario SOL secundario tiene letras y números (sin el RUC delante)';
  END IF;
  IF length(coalesce(p_clave, '')) < 4 THEN RAISE EXCEPTION 'Escribe la clave SOL del usuario secundario'; END IF;
  IF coalesce(p_pfx, '') = '' OR length(p_pfx) > 200000 OR p_pfx !~ '^[A-Za-z0-9+/=]+$' THEN
    RAISE EXCEPTION 'Elige el archivo del certificado digital (.pfx o .p12)';
  END IF;
  INSERT INTO privado.facturacion_credenciales (id, sol_usuario, sol_clave, cert_pfx, cert_clave, actualizado_por, updated_at)
  VALUES (1, upper(trim(p_usuario)), p_clave, p_pfx, coalesce(p_pfx_clave, ''), v_quien, now())
  ON CONFLICT (id) DO UPDATE SET sol_usuario = EXCLUDED.sol_usuario, sol_clave = EXCLUDED.sol_clave,
    cert_pfx = EXCLUDED.cert_pfx, cert_clave = EXCLUDED.cert_clave, actualizado_por = EXCLUDED.actualizado_por, updated_at = now();
  UPDATE public.facturacion_config SET prueba_at = NULL, prueba_ok = NULL, prueba_mensaje = NULL WHERE id = 1;
  RETURN public.fn_estado_credenciales_facturacion();
END;
$$;

-- -------------------------------------------------------------------------------------
-- CAMBIO DE PRODUCTO CON BOLETA/FACTURA (03/11/2026, pedido del dueño)
-- Una boleta/factura aceptada no se modifica: en UNA transacción se emite la nota de crédito por lo
-- devuelto (fn_devolver_con_nota_credito: stock de vuelta + egreso en la caja) y una venta nueva con el
-- MISMO tipo de comprobante y cliente por lo que se lleva (los triggers numeran y descuentan el stock).
-- Pagos de la venta nueva: lo devuelto cuenta como efectivo (el egreso de la nota lo compensa) + la diferencia.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cambiar_con_nota_credito(p_sale_id bigint, p_detail_id bigint, p_cantidad numeric,
                                                              p_producto_nuevo bigint, p_cantidad_nueva numeric,
                                                              p_pago_efectivo numeric DEFAULT 0, p_pago_yape numeric DEFAULT 0,
                                                              p_pago_tarjeta numeric DEFAULT 0, p_sesion_caja text DEFAULT NULL,
                                                              p_motivo text DEFAULT NULL, p_serie_devuelta text DEFAULT NULL,
                                                              p_serie_nueva text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp record;
  v_venta public.sales%ROWTYPE;
  v_det public.sale_details%ROWTYPE;
  v_prod public.products%ROWTYPE;
  v_nueva public.sales%ROWTYPE;
  v_nc jsonb;
  v_devuelto numeric;
  v_total numeric;
  v_dif numeric;
  v_ef numeric := round(coalesce(p_pago_efectivo, 0), 2);
  v_yape numeric := round(coalesce(p_pago_yape, 0), 2);
  v_tarjeta numeric := round(coalesce(p_pago_tarjeta, 0), 2);
  v_cash numeric;
  v_metodos text[];
  v_id bigint := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF NOT fn_tiene_permiso(v_emp.permisos, ARRAY['reportes_anular_ventas']) THEN
    RAISE EXCEPTION 'No tienes permiso para cambios ni devoluciones.';
  END IF;
  IF p_sesion_caja IS NULL THEN RAISE EXCEPTION 'Abre la caja para hacer el cambio (el dinero entra y sale de la caja).'; END IF;

  SELECT * INTO v_venta FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la venta.'; END IF;
  SELECT * INTO v_det FROM public.sale_details WHERE id = p_detail_id AND sale_id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ese producto no es de esta venta.'; END IF;
  SELECT * INTO v_prod FROM public.products WHERE id = p_producto_nuevo AND is_active = 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Elige el producto nuevo que se lleva el cliente.'; END IF;
  IF coalesce(p_cantidad_nueva, 0) <= 0 THEN RAISE EXCEPTION 'La cantidad nueva debe ser mayor a cero.'; END IF;

  -- 1. Nota de crédito por lo devuelto (valida cantidades, fiado, anulada, permiso; devuelve stock; egreso en caja)
  v_nc := public.fn_devolver_con_nota_credito(p_sale_id,
            jsonb_build_array(jsonb_build_object('detail_id', p_detail_id, 'cantidad', p_cantidad)),
            p_sesion_caja, coalesce(nullif(trim(p_motivo), ''), 'CAMBIO DE PRODUCTO'));
  v_devuelto := (v_nc ->> 'total')::numeric;

  -- 2. Pagos de la venta nueva
  v_total := round(coalesce(v_prod.price, 0) * p_cantidad_nueva, 2);
  v_dif := v_total - v_devuelto;
  IF v_dif > 0 THEN
    IF v_ef < 0 OR v_yape < 0 OR v_tarjeta < 0 OR abs(v_ef + v_yape + v_tarjeta - v_dif) >= 0.01 THEN
      RAISE EXCEPTION 'El pago de la diferencia (S/ %) no cuadra.', to_char(v_dif, 'FM999990.00');
    END IF;
    v_cash := v_devuelto + v_ef;
  ELSE
    v_cash := v_total; v_yape := 0; v_tarjeta := 0;   -- la tienda devuelve |diferencia| (ya salió todo en el egreso)
  END IF;
  v_metodos := array_remove(ARRAY[CASE WHEN v_cash > 0 THEN 'EFECTIVO' END, CASE WHEN v_yape > 0 THEN 'YAPE' END,
                                  CASE WHEN v_tarjeta > 0 THEN 'TARJETA' END], NULL);

  -- 3. Venta nueva con el mismo comprobante y cliente (trg_asignar_comprobante pone serie y número)
  INSERT INTO public.sales (id, total, payment_type, amount_cash, amount_yape, amount_card, amount_credit, customer_id, customer_name,
                            sunat_status, created_at, is_synced, doc_type, cpe_cliente_tipo_doc, cpe_cliente_num_doc,
                            cpe_cliente_nombre, cpe_cliente_direccion)
  VALUES (v_id, v_total, CASE WHEN cardinality(v_metodos) = 1 THEN v_metodos[1] WHEN cardinality(v_metodos) > 1 THEN 'MIXTO' ELSE 'EFECTIVO' END,
          v_cash, v_yape, v_tarjeta, 0, v_venta.customer_id, v_venta.customer_name, 'ACEPTADO', now(), 1, v_venta.doc_type,
          v_venta.cpe_cliente_tipo_doc, v_venta.cpe_cliente_num_doc, v_venta.cpe_cliente_nombre, v_venta.cpe_cliente_direccion)
  RETURNING * INTO v_nueva;

  -- El trigger de la venta descuenta el stock (lotes y kardex) como en la Caja
  INSERT INTO public.sale_details (sale_id, product_id, product_name, quantity, price_at_moment, subtotal, numero_serie, garantia_hasta, is_synced)
  VALUES (v_id, v_prod.id, v_prod.name, p_cantidad_nueva, v_prod.price, v_total, nullif(trim(p_serie_nueva), ''),
          CASE WHEN coalesce(v_prod.meses_garantia, 0) > 0 THEN (current_date + make_interval(months => v_prod.meses_garantia))::date END, 1);

  -- 4. Registro del cambio (historial de cambios)
  INSERT INTO public.cambios_productos (id, sale_id, session_id, usuario, customer_id, customer_name, producto_devuelto_id,
                                        producto_devuelto_nombre, cantidad_devuelta, precio_devuelto, serie_devuelta,
                                        producto_nuevo_id, producto_nuevo_nombre, cantidad_nueva, precio_nuevo, serie_nueva,
                                        diferencia, payment_type, motivo)
  VALUES (v_id + 1, p_sale_id, p_sesion_caja, v_emp.nombre, v_venta.customer_id, v_venta.customer_name, v_det.product_id,
          v_det.product_name, p_cantidad, round(v_devuelto / nullif(p_cantidad, 0), 2), nullif(trim(p_serie_devuelta), ''),
          v_prod.id, v_prod.name, p_cantidad_nueva, v_prod.price, nullif(trim(p_serie_nueva), ''), v_dif,
          CASE WHEN v_dif > 0 THEN (CASE WHEN cardinality(array_remove(ARRAY[CASE WHEN v_ef > 0 THEN 'EFECTIVO' END,
            CASE WHEN v_yape > 0 THEN 'YAPE' END, CASE WHEN v_tarjeta > 0 THEN 'TARJETA' END], NULL)) > 1 THEN 'MIXTO'
            WHEN v_yape > 0 THEN 'YAPE' WHEN v_tarjeta > 0 THEN 'TARJETA' ELSE 'EFECTIVO' END) ELSE 'EFECTIVO' END,
          coalesce(nullif(trim(p_motivo), ''), 'CAMBIO DE PRODUCTO'));

  RETURN jsonb_build_object('nota_credito', v_nc ->> 'nota_credito', 'devuelto', v_devuelto,
    'comprobante', v_nueva.doc_serial || '-' || lpad(v_nueva.doc_number, 8, '0'), 'doc_type', v_nueva.doc_type,
    'venta_nueva', v_id, 'total_nuevo', v_total, 'diferencia', v_dif, 'cambio_id', v_id + 1);
END;
$$;

-- -------------------------------------------------------------------------------------
-- CAMBIO DE PRODUCTO EN UN TICKET SIMPLE: el stock (11/11/2026). Antes la pantalla sumaba y restaba
-- products.quantity a mano: los LOTES no se movían, la línea se quedaba con el costo del producto viejo
-- (Utilidades mal) y en un cambio parcial (1 de 2) el producto nuevo se descontaba dos veces (la pantalla y
-- el trigger de sale_details). Ahora: lo devuelto vuelve al lote de donde salió (como la nota de crédito) y lo
-- nuevo sale de sus lotes, el más antiguo primero (como la Caja). El movimiento de salida lleva la nota
-- 'Ticket #N' como una venta: así el trigger no lo descuenta otra vez y anular la venta lo devuelve.
-- Devuelve el costo unitario de lo que se entregó (para cost_at_moment de la línea). La pantalla hace lo demás
-- (cambios_productos, la línea y el total del ticket) en ModalCambioProducto.tsx.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mover_stock_cambio(p_sale_id bigint, p_detail_id bigint, p_cantidad numeric,
                                                        p_producto_nuevo bigint, p_cantidad_nueva numeric,
                                                        p_serie_devuelta text DEFAULT NULL, p_serie_nueva text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp record;
  d public.sale_details%ROWTYPE;
  v_prod public.products%ROWTYPE;
  v_mov record;
  v_lote record;
  v_ultimo bigint;
  v_falta numeric;
  v_pone numeric;
  v_saca numeric;
  v_nuevo numeric;
  v_nota text;
  v_costo_total numeric := 0;
  v_con_costo numeric := 0;
  v_consumo boolean;
BEGIN
  SELECT * INTO v_emp FROM fn_empleado_de_sesion();
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
  IF NOT fn_tiene_permiso(v_emp.permisos, ARRAY['reportes_anular_ventas']) THEN
    RAISE EXCEPTION 'No tienes permiso para cambios ni devoluciones.';
  END IF;
  SELECT * INTO d FROM public.sale_details WHERE id = p_detail_id AND sale_id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ese producto no es de esta venta.'; END IF;
  IF coalesce(p_cantidad, 0) <= 0 OR p_cantidad > abs(coalesce(d.quantity, 0)) THEN
    RAISE EXCEPTION 'La cantidad que se devuelve no cuadra con la venta.';
  END IF;
  SELECT * INTO v_prod FROM public.products WHERE id = p_producto_nuevo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Elige el producto nuevo que se lleva el cliente.'; END IF;
  IF coalesce(p_cantidad_nueva, 0) <= 0 THEN RAISE EXCEPTION 'La cantidad nueva debe ser mayor a cero.'; END IF;

  -- 1. Lo devuelto vuelve a los lotes de donde salió (el último primero); lo que no se sepa, al último lote
  v_nota := 'Ingreso por cambio de producto (Ticket #' || right(p_sale_id::text, 6) || ')'
            || coalesce(' · Serie: ' || nullif(trim(p_serie_devuelta), ''), '');
  IF d.variant_id IS NOT NULL THEN
    UPDATE public.product_variants SET quantity = coalesce(quantity, 0) + p_cantidad WHERE id = d.variant_id;
  END IF;
  UPDATE public.products SET quantity = coalesce(quantity, 0) + p_cantidad WHERE id = d.product_id RETURNING quantity INTO v_nuevo;
  v_nuevo := coalesce(v_nuevo, 0);
  v_falta := p_cantidad;
  FOR v_mov IN SELECT batch_id, sum(-change_amount) AS salio FROM public.inventory_movements
                WHERE operation_type = 'VENTA' AND notes = 'Ticket #' || p_sale_id::text AND product_id = d.product_id
                  AND variant_id IS NOT DISTINCT FROM d.variant_id AND batch_id IS NOT NULL
                GROUP BY batch_id ORDER BY max(id) DESC LOOP
    EXIT WHEN v_falta <= 0;
    v_pone := least(v_falta, greatest(v_mov.salio, 0));
    CONTINUE WHEN v_pone <= 0;
    UPDATE public.batches SET quantity = coalesce(quantity, 0) + v_pone WHERE id = v_mov.batch_id;
    INSERT INTO public.inventory_movements (batch_id, variant_id, variant_name, product_id, product_name, change_amount,
                                            previous_quantity, new_quantity, operation_type, reason, notes, "user", is_synced)
    VALUES (v_mov.batch_id, d.variant_id, d.variant_name, d.product_id, d.product_name, v_pone,
            v_nuevo - v_falta, v_nuevo - v_falta + v_pone, 'DEVOLUCION', 'CAMBIO_PRODUCTO', v_nota, v_emp.nombre, 1);
    v_falta := v_falta - v_pone;
  END LOOP;
  IF v_falta > 0 THEN
    SELECT id INTO v_ultimo FROM public.batches WHERE product_id = d.product_id AND variant_id IS NOT DISTINCT FROM d.variant_id
     ORDER BY created_at DESC, id DESC LIMIT 1;
    IF v_ultimo IS NOT NULL THEN
      UPDATE public.batches SET quantity = coalesce(quantity, 0) + v_falta WHERE id = v_ultimo;
    END IF;
    INSERT INTO public.inventory_movements (batch_id, variant_id, variant_name, product_id, product_name, change_amount,
                                            previous_quantity, new_quantity, operation_type, reason, notes, "user", is_synced)
    VALUES (v_ultimo, d.variant_id, d.variant_name, d.product_id, d.product_name, v_falta, v_nuevo - v_falta, v_nuevo,
            'DEVOLUCION', 'CAMBIO_PRODUCTO', v_nota, v_emp.nombre, 1);
  END IF;

  -- 2. Lo nuevo sale de sus lotes, el más antiguo primero (un producto de CONSUMO no lleva stock, como en la Caja)
  v_consumo := coalesce(v_prod.unit, '') = 'CONSUMO' OR coalesce(v_prod.control_type, '') = 'CONSUMPTION';
  IF NOT v_consumo THEN
    UPDATE public.products SET quantity = coalesce(quantity, 0) - p_cantidad_nueva WHERE id = v_prod.id RETURNING quantity INTO v_nuevo;
    v_nuevo := coalesce(v_nuevo, 0);
    v_falta := p_cantidad_nueva;
    FOR v_lote IN SELECT id, coalesce(quantity, 0) AS qty, coalesce(cost_unit, 0) AS cost FROM public.batches
                   WHERE product_id = v_prod.id AND variant_id IS NULL AND coalesce(quantity, 0) > 0
                   ORDER BY created_at ASC, id ASC FOR UPDATE LOOP
      EXIT WHEN v_falta <= 0;
      v_saca := least(v_falta, v_lote.qty);
      UPDATE public.batches SET quantity = v_lote.qty - v_saca WHERE id = v_lote.id;
      INSERT INTO public.inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                              operation_type, reason, notes, "user", is_synced)
      VALUES (v_lote.id, v_prod.id, v_prod.name, -v_saca, v_nuevo + v_falta, v_nuevo + v_falta - v_saca,
              'VENTA', 'CAMBIO_PRODUCTO', 'Ticket #' || p_sale_id::text, v_emp.nombre, 1);
      IF v_lote.cost > 0 THEN v_costo_total := v_costo_total + v_saca * v_lote.cost; v_con_costo := v_con_costo + v_saca; END IF;
      v_falta := v_falta - v_saca;
    END LOOP;
    IF v_falta > 0 THEN
      INSERT INTO public.inventory_movements (batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
                                              operation_type, reason, notes, "user", is_synced)
      VALUES (NULL, v_prod.id, v_prod.name, -v_falta, v_nuevo + v_falta, v_nuevo,
              'VENTA', 'CAMBIO_PRODUCTO', 'Ticket #' || p_sale_id::text, v_emp.nombre, 1);
    END IF;
  END IF;

  -- 3. Costo de lo entregado: el de sus lotes; si no tienen costo, el del producto
  RETURN CASE WHEN v_con_costo > 0 THEN round(v_costo_total / v_con_costo, 4) ELSE coalesce(v_prod.cost_price, 0) END;
END;
$$;

-- -------------------------------------------------------------------------------------
-- ANULAR UN COMPROBANTE QUE SUNAT TODAVÍA NO ACEPTÓ (03/11/2026, caso real del dueño:
-- boleta con una serie que Nubefact no permite → al anularla quedaba una nota de crédito colgada)
-- Estados nuevos: ANULANDO (se confirma con el proveedor) y NO_EMITIDO (nunca existió para SUNAT: sin nota de crédito).
-- -------------------------------------------------------------------------------------
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_cpe_estado_valido;
ALTER TABLE public.sales ADD CONSTRAINT sales_cpe_estado_valido
  CHECK (cpe_estado IS NULL OR cpe_estado IN ('PENDIENTE', 'ENVIANDO', 'ACEPTADO', 'OBSERVADO', 'RECHAZADO', 'ERROR', 'ANULANDO', 'NO_EMITIDO'));

-- Lo llama SOLO el facturador del servidor (sin permiso para la API): p_estado = 'NO_EMITIDO' o el estado real
-- que dio el proveedor (ACEPTADO / OBSERVADO / PENDIENTE). Si se emitió, hace la nota de crédito por todo.
CREATE OR REPLACE FUNCTION public.fn_confirmar_anulacion(p_sale_id bigint, p_estado text, p_mensaje text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_venta public.sales%ROWTYPE;
  v_nc text;
BEGIN
  SELECT * INTO v_venta FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND OR v_venta.cpe_estado IS DISTINCT FROM 'ANULANDO' THEN RETURN 'SIN_CAMBIOS'; END IF;
  PERFORM set_config('siumax.cpe_interno', '1', true);
  IF p_estado = 'NO_EMITIDO' THEN
    UPDATE public.sales SET cpe_estado = 'NO_EMITIDO', cpe_proximo_intento = NULL,
           cpe_mensaje = coalesce(p_mensaje, 'No se emitió: la venta se anuló antes de que SUNAT la aceptara (no necesita nota de crédito).')
     WHERE id = p_sale_id;
    RETURN 'NO_EMITIDO';
  END IF;
  IF p_estado NOT IN ('ACEPTADO', 'OBSERVADO', 'PENDIENTE') THEN RAISE EXCEPTION 'Estado no válido: %', p_estado; END IF;
  -- Sí llegó a emitirse: queda con su estado real y la anulación se hace con nota de crédito (motivo 01)
  UPDATE public.sales SET cpe_estado = p_estado, cpe_proximo_intento = CASE WHEN p_estado = 'PENDIENTE' THEN now() + interval '10 minutes' END,
         cpe_mensaje = p_mensaje WHERE id = p_sale_id;
  INSERT INTO public.notas_credito (sale_id, motivo, descripcion, total, items, creado_por)
  SELECT p_sale_id, '01', 'ANULACIÓN DE LA OPERACIÓN', v_venta.total,
         coalesce(jsonb_agg(jsonb_build_object('detail_id', d.id, 'product_id', d.product_id, 'product_name', d.product_name,
           'variant_id', d.variant_id, 'variant_name', d.variant_name, 'quantity', d.quantity, 'subtotal', d.subtotal,
           'tipo_igv', coalesce(d.tipo_igv, 'GRAVADO'), 'es_bolsa', coalesce(d.es_bolsa, false)) ORDER BY d.id), '[]'::jsonb),
         'SiuMax (anulación)'
    FROM public.sale_details d WHERE d.sale_id = p_sale_id
  RETURNING doc_serial || '-' || lpad(doc_number, 8, '0') INTO v_nc;
  RETURN v_nc;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_confirmar_anulacion(bigint, text, text) FROM PUBLIC;

NOTIFY pgrst, 'reload schema';




