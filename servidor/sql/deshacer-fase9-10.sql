-- servidor/sql/deshacer-fase9-10.sql
-- Deshace las tablas y funciones de la Fase 9 (Múltiples Almacenes y Traspasos) y Fase 10 (Catálogo Web)

DROP FUNCTION IF EXISTS public.fn_crear_pedido_web(text, text, text, text, bigint, jsonb, text);
DROP FUNCTION IF EXISTS public.fn_catalogo_publico(bigint);
DROP FUNCTION IF EXISTS public.fn_recibir_traspaso(bigint, text);
DROP FUNCTION IF EXISTS public.fn_crear_traspaso(bigint, bigint, jsonb, text, text, boolean);

DROP TABLE IF EXISTS public.store_transfer_items;
DROP TABLE IF EXISTS public.store_transfers;

ALTER TABLE public.batches DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.inventory_movements DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.sales DROP COLUMN IF EXISTS store_id;
ALTER TABLE public.cash_sessions DROP COLUMN IF EXISTS store_id;

ALTER TABLE public.products DROP COLUMN IF EXISTS mostrar_en_catalogo;
ALTER TABLE public.products DROP COLUMN IF EXISTS destacado_catalogo;

ALTER TABLE public.empresa_config DROP COLUMN IF EXISTS catalogo_activo;
ALTER TABLE public.empresa_config DROP COLUMN IF EXISTS catalogo_whatsapp;
ALTER TABLE public.empresa_config DROP COLUMN IF EXISTS catalogo_ocultar_precios;
ALTER TABLE public.empresa_config DROP COLUMN IF EXISTS catalogo_mensaje_bienvenida;

DROP TABLE IF EXISTS public.stores;

NOTIFY pgrst, 'reload schema';
