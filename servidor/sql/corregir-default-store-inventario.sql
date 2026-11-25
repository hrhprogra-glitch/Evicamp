-- 24/11/2026 — Corrección urgente del 409 al registrar devoluciones en ecosistema.
-- Causa: inventory_movements.store_id tenía DEFAULT 2, pero en ecosistema solo existe la tienda 1.
-- Todo INSERT que no escribiera store_id (por ejemplo fn_registrar_devolucion) violaba
-- inventory_movements_store_id_fkey (SQLSTATE 23503) y PostgREST lo devolvía como 409 Conflict.
-- En Nego (base siumax) el default ya era 1, por eso las pruebas generales pasaban allí.
-- Además, las filas antiguas quedaron con store_id=2 (tienda borrada). Eso no rompía la PRIMERA
-- actualización de un lote por transacción, pero sí la segunda (otro material del mismo lote o
-- otra devolución), porque PostgreSQL vuelve a validar la FK. Se reparan también esas filas.
-- Ejecutar con respaldo previo y psql con lock_timeout.
\set ON_ERROR_STOP on
SET lock_timeout = '5s';

DO $$
DECLARE
  v_store bigint;
  v_n bigint;
BEGIN
  SELECT id INTO v_store FROM public.stores WHERE coalesce(activo, true) ORDER BY id LIMIT 1;
  IF v_store IS NULL THEN
    RAISE EXCEPTION 'No hay tiendas activas: no se puede corregir store_id';
  END IF;

  EXECUTE format('ALTER TABLE public.inventory_movements ALTER COLUMN store_id SET DEFAULT %s', v_store);
  RAISE NOTICE 'Default de inventory_movements.store_id corregido a la tienda %', v_store;

  UPDATE public.batches SET store_id = v_store
  WHERE store_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Lotes reparados: %', v_n;

  UPDATE public.inventory_movements SET store_id = v_store
  WHERE store_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Movimientos reparados: %', v_n;

  UPDATE public.sales SET store_id = v_store
  WHERE store_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Ventas reparadas: %', v_n;

  UPDATE public.cash_sessions SET store_id = v_store
  WHERE store_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'Cajas reparadas: %', v_n;
END $$;

-- Comprobación: no debe quedar ninguna referencia a una tienda inexistente.
SELECT 'DEFAULT AHORA: ' || coalesce(column_default, 'NINGUNO')
FROM information_schema.columns
WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='store_id';
SELECT 'MOVS HUERFANOS: ' || count(*) FROM public.inventory_movements m
LEFT JOIN public.stores s ON s.id=m.store_id WHERE m.store_id IS NOT NULL AND s.id IS NULL;
SELECT 'LOTES HUERFANOS: ' || count(*) FROM public.batches b
LEFT JOIN public.stores s ON s.id=b.store_id WHERE b.store_id IS NOT NULL AND s.id IS NULL;
