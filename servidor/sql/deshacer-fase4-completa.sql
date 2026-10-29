-- Deshacer cambios de la Fase 4 completa (4.4, 4.5, 4.6):
DROP TABLE IF EXISTS public.pedido_detalles CASCADE;
DROP TABLE IF EXISTS public.pedidos_clientes CASCADE;
DROP TABLE IF EXISTS public.cotizacion_detalles CASCADE;
DROP TABLE IF EXISTS public.cotizaciones CASCADE;
ALTER TABLE public.products DROP COLUMN IF EXISTS precio_mayorista;
ALTER TABLE public.customers DROP COLUMN IF EXISTS es_mayorista;
ALTER TABLE public.customers DROP COLUMN IF EXISTS descuento_porcentaje;
ALTER TABLE public.grupos_clientes DROP COLUMN IF EXISTS descuento_porcentaje;
NOTIFY pgrst, 'reload schema';
