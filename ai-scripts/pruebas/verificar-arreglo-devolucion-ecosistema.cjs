// 27/11/2026 — Prueba SOLO LECTURA del arreglo de devoluciones en ecosistema.
// Llama a las RPC reales dentro de una transacción y SIEMPRE hace ROLLBACK:
// no deja datos, no reinicia la API, no publica nada.
// Uso: node ai-scripts/pruebas/verificar-arreglo-devolucion-ecosistema.cjs
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const SQL = `
\\set ON_ERROR_STOP on
SET lock_timeout = '5s';
BEGIN;

SELECT 'ANTES: devuelto=' || i.cantidad_devuelta || ' historial=' || coalesce(d.total,0) ||
       ' producto=' || p.quantity || ' lote=' || b.quantity || ' movs=' ||
       (SELECT count(*) FROM public.inventory_movements WHERE product_id=100149)
FROM public.salida_items i
JOIN public.products p ON p.id=i.product_id
LEFT JOIN public.batches b ON b.id=i.batch_id
LEFT JOIN (SELECT salida_item_id, sum(cantidad) total FROM public.salida_devoluciones GROUP BY 1) d ON d.salida_item_id=i.id
WHERE i.id=2003006;

-- 1) Ajuste interno (lo que hace editar/quitar/eliminar salida): NO debe escribir historial.
SELECT public.fn_devolver_stock_salida(1000413, 2003006, 1, 'Prueba ajuste interno IA', 'Prueba IA');
DO $$
DECLARE v_hist bigint; v_dev numeric; v_prod numeric; v_movs bigint;
BEGIN
  SELECT count(*) INTO v_hist FROM public.salida_devoluciones WHERE salida_item_id=2003006;
  SELECT cantidad_devuelta INTO v_dev FROM public.salida_items WHERE id=2003006;
  SELECT quantity INTO v_prod FROM public.products WHERE id=100149;
  SELECT count(*) INTO v_movs FROM public.inventory_movements WHERE product_id=100149 AND notes ILIKE '%Prueba ajuste interno IA%';
  IF v_hist <> 1 THEN RAISE EXCEPTION 'MAL ajuste escribió en el historial: % filas', v_hist; END IF;
  IF v_dev <> 4 THEN RAISE EXCEPTION 'MAL ajuste cambió Devuelto: %', v_dev; END IF;
  IF coalesce(v_prod,0) <> -1 THEN RAISE EXCEPTION 'MAL ajuste no devolvió stock: %', v_prod; END IF;
  IF v_movs <> 1 THEN RAISE EXCEPTION 'MAL ajuste no dejó movimiento: %', v_movs; END IF;
  RAISE NOTICE 'OK 1) ajuste interno: historial sin filas nuevas, Devuelto intacto, stock +1 y movimiento';
END $$;
SELECT 'TRAS AJUSTE: devuelto=' || i.cantidad_devuelta || ' historial=' || coalesce(d.total,0) ||
       ' producto=' || p.quantity || ' lote=' || b.quantity
FROM public.salida_items i JOIN public.products p ON p.id=i.product_id
LEFT JOIN public.batches b ON b.id=i.batch_id
LEFT JOIN (SELECT salida_item_id, sum(cantidad) total FROM public.salida_devoluciones GROUP BY 1) d ON d.salida_item_id=i.id
WHERE i.id=2003006;

-- 2) Devolución real: SÍ debe sumar al Devuelto y dejar una fila en el historial.
SELECT public.fn_registrar_devolucion(1000413, 2003006, 1, 'Prueba devolución real IA', 'Prueba IA', NULL, NULL);
DO $$
DECLARE v_hist bigint; v_dev numeric; v_prod numeric; v_id bigint;
BEGIN
  SELECT count(*), max(id) INTO v_hist, v_id FROM public.salida_devoluciones
   WHERE salida_item_id=2003006 AND motivo='Prueba devolución real IA';
  SELECT cantidad_devuelta INTO v_dev FROM public.salida_items WHERE id=2003006;
  SELECT quantity INTO v_prod FROM public.products WHERE id=100149;
  IF v_hist <> 1 THEN RAISE EXCEPTION 'MAL devolución real no dejó historial: %', v_hist; END IF;
  IF v_dev <> 5 THEN RAISE EXCEPTION 'MAL devolución real no sumó Devuelto: %', v_dev; END IF;
  IF coalesce(v_prod,0) <> 0 THEN RAISE EXCEPTION 'MAL devolución real no devolvió stock: %', v_prod; END IF;
  RAISE NOTICE 'OK 2) devolución real: historial +1, Devuelto 4->5, stock +1 (fase %)', v_id;
END $$;
SELECT 'TRAS DEVOLVER: devuelto=' || i.cantidad_devuelta || ' historial=' || coalesce(d.total,0) ||
       ' producto=' || p.quantity || ' lote=' || b.quantity
FROM public.salida_items i JOIN public.products p ON p.id=i.product_id
LEFT JOIN public.batches b ON b.id=i.batch_id
LEFT JOIN (SELECT salida_item_id, sum(cantidad) total FROM public.salida_devoluciones GROUP BY 1) d ON d.salida_item_id=i.id
WHERE i.id=2003006;

-- 3) No debe permitir devolver más de lo pendiente.
DO $$
BEGIN
  BEGIN
    PERFORM public.fn_registrar_devolucion(1000413, 2003006, 999, 'Prueba exceso IA', 'Prueba IA', NULL, NULL);
    RAISE EXCEPTION 'MAL permitió devolver 999';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'MAL permitió%' THEN RAISE; END IF;
    RAISE NOTICE 'OK 3) rechazó exceso: %', SQLERRM;
  END;
END $$;

-- 4) La X de esa devolución SÍ resta el Devuelto y borra su fila del historial.
DO $$
DECLARE v_id bigint; v_dev numeric; v_hist bigint; v_prod numeric;
BEGIN
  SELECT id INTO v_id FROM public.salida_devoluciones
   WHERE salida_item_id=2003006 AND motivo='Prueba devolución real IA' ORDER BY id DESC LIMIT 1;
  PERFORM public.fn_eliminar_devolucion(v_id, 'Prueba IA');
  SELECT cantidad_devuelta INTO v_dev FROM public.salida_items WHERE id=2003006;
  SELECT count(*) INTO v_hist FROM public.salida_devoluciones WHERE salida_item_id=2003006;
  SELECT quantity INTO v_prod FROM public.products WHERE id=100149;
  IF v_dev <> 4 THEN RAISE EXCEPTION 'MAL la X no restó Devuelto: %', v_dev; END IF;
  IF v_hist <> 1 THEN RAISE EXCEPTION 'MAL la X no borró su fila: %', v_hist; END IF;
  IF coalesce(v_prod,0) <> -1 THEN RAISE EXCEPTION 'MAL la X no quitó stock: %', v_prod; END IF;
  RAISE NOTICE 'OK 4) X: Devuelto 5->4, historial sin la fila, stock -1';
END $$;
SELECT 'TRAS ELIMINAR: devuelto=' || i.cantidad_devuelta || ' historial=' || coalesce(d.total,0) ||
       ' producto=' || p.quantity || ' lote=' || b.quantity
FROM public.salida_items i JOIN public.products p ON p.id=i.product_id
LEFT JOIN public.batches b ON b.id=i.batch_id
LEFT JOIN (SELECT salida_item_id, sum(cantidad) total FROM public.salida_devoluciones GROUP BY 1) d ON d.salida_item_id=i.id
WHERE i.id=2003006;

ROLLBACK;
SELECT 'FINAL SIN CAMBIOS: devuelto=' || i.cantidad_devuelta || ' historial=' || coalesce(d.total,0) ||
       ' producto=' || p.quantity || ' lote=' || b.quantity
FROM public.salida_items i JOIN public.products p ON p.id=i.product_id
LEFT JOIN public.batches b ON b.id=i.batch_id
LEFT JOIN (SELECT salida_item_id, sum(cantidad) total FROM public.salida_devoluciones GROUP BY 1) d ON d.salida_item_id=i.id
WHERE i.id=2003006;
`;

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const r = await ssh.execCommand('runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ecosistema', { stdin: SQL });
    console.log((r.stdout || '').trim());
    if (r.stderr) console.error((r.stderr || '').trim());
    if (/ERROR|FATAL/i.test(r.stderr || '')) throw new Error('La prueba SQL falló');
    if (!/OK 1\)|OK 2\)|OK 3\)|OK 4\)/.test(r.stderr || '')) throw new Error('No se confirmaron las 4 comprobaciones');
    console.log('PRUEBA SQL: TODO BIEN (ROLLBACK aplicado)');
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
