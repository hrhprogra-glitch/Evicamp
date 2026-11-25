-- 25/11/2026 — La pantalla "Gestión de Usuarios" lee la vista pública `empleados_publico`.
-- En ecosistema faltaba esa vista, así que la API respondía 404 y NO aparecía ningún usuario,
-- aunque la tabla `empleados` tenía los usuarios. Esta vista oculta password/password_hash.
-- Repetible: crear/reemplazar y dar solo SELECT a los roles de la API. Sin reiniciar PostgREST.
\set ON_ERROR_STOP on
SET lock_timeout = '5s';

CREATE OR REPLACE VIEW public.empleados_publico AS
SELECT id, nombre, email, rol, estado, permisos, created_at
FROM public.empleados;

GRANT SELECT ON public.empleados_publico TO anon;
GRANT SELECT ON public.empleados_publico TO web_anon;

NOTIFY pgrst, 'reload schema';

SELECT 'VISTA LISTA: ' || count(*)
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'empleados_publico';
SELECT 'USUARIOS QUE VERÁ LA PANTALLA: ' || count(*) FROM public.empleados_publico;
