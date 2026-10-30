-- Script de reversión para Fase 6 (Cambios y Garantías / Series)
DROP TABLE IF EXISTS public.cambios_productos CASCADE;
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS numero_serie;
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS garantia_hasta;
ALTER TABLE public.products DROP COLUMN IF EXISTS controla_series;
ALTER TABLE public.products DROP COLUMN IF EXISTS meses_garantia;
NOTIFY pgrst, 'reload schema';
