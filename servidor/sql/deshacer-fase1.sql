-- DESHACER LA FASE 1 (por partes, de la última a la primera). Usar SOLO si el usuario no aprueba la fase 1.
-- Las pantallas se deshacen con git (rama fase-1). Respaldo de siuhub antes de la fase: /var/lib/postgresql/respaldo-siuhub-antes-fase1-*.dump

-- 1.4 Cambiar precio al cobrar
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS precio_cambiado_por;
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS precio_lista;

NOTIFY pgrst, 'reload schema';
