-- DESHACER LA FASE 1 (por partes, de la última a la primera). Usar SOLO si el usuario no aprueba la fase 1.
-- Las pantallas se deshacen con git (rama fase-1). Respaldo de siuhub antes de la fase: /var/lib/postgresql/respaldo-siuhub-antes-fase1-*.dump

-- 1.3 Precios por cantidad: primero fn_proteger_precios como estaba (sin la columna), después se borra la columna
CREATE OR REPLACE FUNCTION public.fn_proteger_precios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $
DECLARE
  v_token text := current_setting('request.headers', true)::json ->> 'x-sesion';
  v_permisos jsonb;
BEGIN
  IF NEW.price IS NOT DISTINCT FROM OLD.price
     AND NEW.cost_price IS NOT DISTINCT FROM OLD.cost_price
     AND NEW.discount_percent IS NOT DISTINCT FROM OLD.discount_percent THEN
    RETURN NEW;
  END IF;
  IF v_token IS NULL OR v_token !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}: vuelven los códigos de antes
UPDATE public.products p SET sunat_unit_code = r.sunat_unit_code FROM public.respaldo_fase1_unidades r WHERE r.id = p.id;
DROP TABLE IF EXISTS public.respaldo_fase1_unidades;
-- (los productos creados con unidades nuevas —BOLSA, M, CAJA…— quedan con esa unidad; revisar a mano si hay alguno)

-- 1.4 Cambiar precio al cobrar
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS precio_cambiado_por;
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS precio_lista;

NOTIFY pgrst, 'reload schema';
 THEN
    RETURN NEW;
  END IF;
  SELECT e.permisos INTO v_permisos FROM sesiones s JOIN empleados e ON e.id = s.empleado_id WHERE s.token = v_token::uuid;
  IF NOT fn_tiene_permiso(v_permisos, ARRAY['almacen_modificar_precios']) THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE = 'No tienes permiso para cambiar precios',
      DETAIL = 'Pide al administrador el permiso "Modificar precios".';
  END IF;
  RETURN NEW;
END;
$;
ALTER TABLE public.products DROP COLUMN IF EXISTS precios_cantidad;

-- 1.1 Unidad de medida SUNAT: vuelven los códigos de antes
UPDATE public.products p SET sunat_unit_code = r.sunat_unit_code FROM public.respaldo_fase1_unidades r WHERE r.id = p.id;
DROP TABLE IF EXISTS public.respaldo_fase1_unidades;
-- (los productos creados con unidades nuevas —BOLSA, M, CAJA…— quedan con esa unidad; revisar a mano si hay alguno)

-- 1.4 Cambiar precio al cobrar
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS precio_cambiado_por;
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS precio_lista;

NOTIFY pgrst, 'reload schema';
