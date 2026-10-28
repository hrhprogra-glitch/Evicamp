-- Deshacer la FASE 4 (Clientes y empresas), de la última parte a la primera.
-- Uso (solo si el dueño pide volver atrás): psql -d <base> -f servidor/sql/deshacer-fase4.sql
-- OJO: borrar columnas borra lo que se escribió en ellas (teléfonos, direcciones…). Sacar respaldo antes.

-- 4.2: cliente en la venta
DROP INDEX IF EXISTS public.idx_sales_customer_id;
ALTER TABLE public.sales DROP COLUMN IF EXISTS customer_id;
ALTER TABLE public.sales DROP COLUMN IF EXISTS customer_name;

-- 4.1: grupos de clientes
ALTER TABLE public.customers DROP COLUMN IF EXISTS grupo_id;
DROP TABLE IF EXISTS public.grupos_clientes;

-- 4.1: ficha del cliente (el RUC vuelve a la columna dni como antes, si el cliente no tiene DNI)
UPDATE public.customers SET dni = ruc, tipo_doc = 'RUC' WHERE ruc IS NOT NULL AND (dni IS NULL OR dni = '');
ALTER TABLE public.customers DROP COLUMN IF EXISTS ruc;
ALTER TABLE public.customers DROP COLUMN IF EXISTS ubicacion;
ALTER TABLE public.customers DROP COLUMN IF EXISTS referencia;
ALTER TABLE public.customers DROP COLUMN IF EXISTS direccion;
ALTER TABLE public.customers DROP COLUMN IF EXISTS telefono;
ALTER TABLE public.customers DROP COLUMN IF EXISTS tipo_doc;

NOTIFY pgrst, 'reload schema';

-- 4.1 (lote en el conteo): fn_registrar_conteo con p_batch_id es compatible con la anterior (sin lote hace lo mismo);
-- no hace falta deshacerla. Si se quiere la versión vieja, volver a correr seguridad-sesion.sql de antes de la fase 4.
