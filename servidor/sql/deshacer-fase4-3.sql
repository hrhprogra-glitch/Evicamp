-- Deshacer la FASE 4.3 (Días de plazo en clientes)
-- Uso: psql -d <base> -f servidor/sql/deshacer-fase4-3.sql
ALTER TABLE public.customers DROP COLUMN IF EXISTS dias_plazo;
NOTIFY pgrst, 'reload schema';
