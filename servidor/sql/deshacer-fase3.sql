-- Deshacer cambios de la Fase 3 (Búsqueda especializada: marca, modelo, medida, laboratorio, ubicación)
ALTER TABLE public.products DROP COLUMN IF EXISTS marca;
ALTER TABLE public.products DROP COLUMN IF EXISTS modelo;
ALTER TABLE public.products DROP COLUMN IF EXISTS medida;
ALTER TABLE public.products DROP COLUMN IF EXISTS laboratorio;
ALTER TABLE public.products DROP COLUMN IF EXISTS ubicacion;
DROP INDEX IF EXISTS idx_products_marca;
DROP INDEX IF EXISTS idx_products_modelo;
DROP INDEX IF EXISTS idx_products_medida;
NOTIFY pgrst, 'reload schema';
