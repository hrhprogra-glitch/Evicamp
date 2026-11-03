-- Deshace la Fase 11 (facturación electrónica). Solo si todavía NO se emitieron comprobantes reales:
-- borra la configuración, la clave del proveedor, la numeración y las columnas cpe_* de las ventas.
SET lock_timeout = '5s';
DROP TRIGGER IF EXISTS trg_asignar_comprobante ON public.sales;
DROP TRIGGER IF EXISTS trg_proteger_comprobante ON public.sales;
DROP FUNCTION IF EXISTS public.fn_asignar_comprobante();
DROP FUNCTION IF EXISTS public.fn_proteger_comprobante();
DROP FUNCTION IF EXISTS public.fn_guardar_credenciales_facturacion(text, text);
DROP FUNCTION IF EXISTS public.fn_estado_credenciales_facturacion();
DROP FUNCTION IF EXISTS public.fn_fijar_correlativo(text, bigint);
DROP FUNCTION IF EXISTS public.fn_siguiente_correlativo(text);
DROP INDEX IF EXISTS public.sales_cpe_pendientes;
DROP INDEX IF EXISTS public.sales_cpe_numero_unico;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_cpe_estado_valido;
ALTER TABLE public.sales
  DROP COLUMN IF EXISTS cpe_estado, DROP COLUMN IF EXISTS cpe_modo, DROP COLUMN IF EXISTS cpe_intentos,
  DROP COLUMN IF EXISTS cpe_proximo_intento, DROP COLUMN IF EXISTS cpe_mensaje, DROP COLUMN IF EXISTS cpe_enviado_at,
  DROP COLUMN IF EXISTS cpe_pdf, DROP COLUMN IF EXISTS cpe_xml, DROP COLUMN IF EXISTS cpe_cdr, DROP COLUMN IF EXISTS cpe_qr,
  DROP COLUMN IF EXISTS cpe_cliente_tipo_doc, DROP COLUMN IF EXISTS cpe_cliente_num_doc,
  DROP COLUMN IF EXISTS cpe_cliente_nombre, DROP COLUMN IF EXISTS cpe_cliente_direccion;
DROP TABLE IF EXISTS public.cpe_correlativos;
DROP TABLE IF EXISTS public.facturacion_config;
DROP TABLE IF EXISTS privado.facturacion_credenciales;
ALTER TABLE public.empresa_config DROP CONSTRAINT IF EXISTS empresa_config_regimen_valido;
ALTER TABLE public.empresa_config DROP COLUMN IF EXISTS razon_social, DROP COLUMN IF EXISTS ubigeo, DROP COLUMN IF EXISTS regimen;
-- 11.2
DROP TRIGGER IF EXISTS trg_impuesto_linea_venta ON public.sale_details;
DROP FUNCTION IF EXISTS public.fn_impuesto_linea_venta();
ALTER TABLE public.sale_details DROP COLUMN IF EXISTS tipo_igv, DROP COLUMN IF EXISTS es_bolsa;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_tipo_igv_valido;
ALTER TABLE public.products DROP COLUMN IF EXISTS tipo_igv, DROP COLUMN IF EXISTS es_bolsa;
NOTIFY pgrst, 'reload schema';
