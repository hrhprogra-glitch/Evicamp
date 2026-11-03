-- Script de reversión para Fase 8 (Producción, Recetas, Insumos, Combos y Kits)
DROP FUNCTION IF EXISTS public.fn_producir_receta(bigint, numeric, numeric, text);
DROP TABLE IF EXISTS public.product_recipes CASCADE;
ALTER TABLE public.products DROP COLUMN IF EXISTS tipo_compuesto;
ALTER TABLE public.products DROP COLUMN IF EXISTS costo_adicional_produccion;
NOTIFY pgrst, 'reload schema';
