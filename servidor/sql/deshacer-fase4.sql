-- Deshacer la FASE 4 (Clientes y empresas), de la última parte a la primera.
-- Uso (solo si el dueño pide volver atrás): psql -d <base> -f servidor/sql/deshacer-fase4.sql
-- OJO: borrar columnas borra lo que se escribió en ellas (teléfonos, direcciones…). Sacar respaldo antes.

-- 4.1: ficha del cliente
ALTER TABLE public.customers DROP COLUMN IF EXISTS referencia;
ALTER TABLE public.customers DROP COLUMN IF EXISTS direccion;
ALTER TABLE public.customers DROP COLUMN IF EXISTS telefono;
ALTER TABLE public.customers DROP COLUMN IF EXISTS tipo_doc;

NOTIFY pgrst, 'reload schema';
