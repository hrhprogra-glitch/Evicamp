-- 27/11/2026 — Ecosistema: "Devuelto 3" pero el historial mostraba 4 (SAL-0018).
-- Causa: fn_devolver_stock_salida escribía en salida_devoluciones los ajustes
-- internos (editar cantidad, quitar material, borrar salida) SIN sumarlos a
-- salida_items.cantidad_devuelta. Después, fn_eliminar_devolucion sí restaba
-- esa fila al usar la X, aunque nunca se había sumado: quedó 3 en vez de 4.
-- Este arreglo: (1) corrige el dato de esa salida y (2) quita el INSERT de
-- salida_devoluciones de la función, para que esos ajustes solo queden en
-- inventory_movements. NO toca stock ni lotes. Repetible.
\set ON_ERROR_STOP on
SET lock_timeout = '5s';

BEGIN;

-- 1) El "Devuelto" debe ser la suma real del historial de devoluciones de ese ítem.
UPDATE public.salida_items i
SET cantidad_devuelta = s.total
FROM (
  SELECT 2003006::bigint AS item_id,
         coalesce(sum(d.cantidad), 0) AS total
  FROM public.salida_devoluciones d
  WHERE d.salida_item_id = 2003006
) s
WHERE i.id = s.item_id
  AND i.salida_id = 1000413
  AND i.cantidad_devuelta IS DISTINCT FROM s.total;

-- 2) Los ajustes internos NO son devoluciones registradas: solo movimientos de inventario.
CREATE OR REPLACE FUNCTION public.fn_devolver_stock_salida(
  p_salida_id bigint,
  p_item_id bigint,
  p_cantidad numeric,
  p_motivo text,
  p_usuario text DEFAULT 'Sistema'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_salida record;
  v_item record;
  v_stock numeric;
  v_lote_id bigint;
BEGIN
  IF p_cantidad <= 0 THEN RETURN; END IF;

  SELECT * INTO v_salida FROM public.salidas WHERE id = p_salida_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_item FROM public.salida_items WHERE id = p_item_id AND salida_id = p_salida_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF NOT v_item.es_externo AND v_item.product_id IS NOT NULL THEN
    SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_item.product_id FOR UPDATE;
    v_lote_id := v_item.batch_id;
    IF v_lote_id IS NULL THEN
      SELECT id INTO v_lote_id FROM public.batches
      WHERE product_id = v_item.product_id AND coalesce(is_active, 1) <> 0
      ORDER BY created_at DESC, id DESC LIMIT 1;
    END IF;
    IF v_lote_id IS NOT NULL THEN
      UPDATE public.batches SET quantity = coalesce(quantity, 0) + p_cantidad WHERE id = v_lote_id;
    END IF;
    UPDATE public.products SET quantity = coalesce(quantity, 0) + p_cantidad WHERE id = v_item.product_id;
    INSERT INTO public.inventory_movements (
      batch_id, product_id, product_name, change_amount, previous_quantity, new_quantity,
      operation_type, reason, notes, created_at, "user", is_synced
    ) VALUES (
      v_lote_id, v_item.product_id, v_item.descripcion, p_cantidad, v_stock, v_stock + p_cantidad,
      'DEVOLUCION', 'Devolución de Salida ' || v_salida.codigo, coalesce(p_motivo, 'Material no utilizado'), now(), p_usuario, 1
    );
  END IF;

  -- Sin INSERT en salida_devoluciones: la X ya no puede restar lo que no se sumó.
END;
$function$;

COMMIT;

SELECT 'CASO SAL-0018: cantidad=' || i.cantidad || ' devuelto=' || i.cantidad_devuelta ||
       ' historial=' || coalesce(d.total, 0)
FROM public.salida_items i
LEFT JOIN (SELECT salida_item_id, sum(cantidad) AS total FROM public.salida_devoluciones GROUP BY 1) d ON d.salida_item_id = i.id
WHERE i.id = 2003006;
SELECT 'DESINCRONIZADOS: ' || count(*) FROM public.salida_items i
LEFT JOIN (SELECT salida_item_id, sum(cantidad) AS total FROM public.salida_devoluciones GROUP BY 1) d ON d.salida_item_id = i.id
WHERE i.cantidad_devuelta IS DISTINCT FROM coalesce(d.total, 0);
