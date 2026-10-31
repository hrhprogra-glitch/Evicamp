-- Script de reversión para Fase 7 (Tallas y Colores - Variantes)
DROP TABLE IF EXISTS public.product_variants CASCADE;
ALTER TABLE public.products DROP COLUMN IF EXISTS tiene_variantes;
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS variant_id;
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS variant_name;
ALTER TABLE public.inventory_movements DROP COLUMN IF EXISTS variant_id;
ALTER TABLE public.inventory_movements DROP COLUMN IF EXISTS variant_name;
NOTIFY pgrst, 'reload schema';
