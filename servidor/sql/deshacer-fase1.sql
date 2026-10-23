-- DESHACER LA FASE 1 (por partes, de la última a la primera). Usar SOLO si el usuario no aprueba la fase 1.
-- Las pantallas se deshacen con git (rama fase-1). Respaldo de siuhub antes de la fase: /var/lib/postgresql/respaldo-siuhub-antes-fase1-*.dump

-- 1.1 Unidad de medida SUNAT: vuelven los códigos de antes
UPDATE public.products p SET sunat_unit_code = r.sunat_unit_code FROM public.respaldo_fase1_unidades r WHERE r.id = p.id;
DROP TABLE IF EXISTS public.respaldo_fase1_unidades;
-- (los productos creados con unidades nuevas —BOLSA, M, CAJA…— quedan con esa unidad; revisar a mano si hay alguno)

-- 1.4 Cambiar precio al cobrar
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS precio_cambiado_por;
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS precio_lista;

NOTIFY pgrst, 'reload schema';
