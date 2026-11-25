// 25/11/2026 — Prueba de la X del historial de devoluciones.
// Registra una devolución, la elimina con fn_eliminar_devolucion y la vuelve a registrar.
// Todo dentro de BEGIN; … ROLLBACK;: NO escribe nada. Uso:
//   node ai-scripts/pruebas/verificar-eliminar-devolucion.cjs [siumax|ecosistema|postgres]
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');
const BASE = process.argv[2] || 'siumax';

const SQL = `
\\set ON_ERROR_STOP off
SELECT CASE WHEN count(*)=1 THEN 'OK  fn_eliminar_devolucion existe'
            ELSE 'MAL falta fn_eliminar_devolucion' END
FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='fn_eliminar_devolucion';
SELECT CASE WHEN has_function_privilege('anon', 'public.fn_eliminar_devolucion(bigint,text)', 'EXECUTE')
            THEN 'OK  anon puede eliminar devoluciones'
            ELSE 'MAL anon NO puede eliminar devoluciones' END;
SELECT CASE WHEN public.fn_permisos_servicios('POST','/rpc/fn_eliminar_devolucion') = ARRAY['salidas_crear']::text[]
            THEN 'OK  permiso salidas_crear en la ruta'
            ELSE ' MAL permiso incorrecto en la ruta' END;

BEGIN;
DO $$
DECLARE
  v_salida bigint; v_item bigint; v_prod bigint; v_batch bigint;
  v_stock0 numeric; v_stock1 numeric; v_stock2 numeric; v_stock3 numeric;
  v_dev0 numeric; v_dev1 numeric; v_dev2 numeric;
  v_batch0 numeric; v_batch1 numeric; v_batch2 numeric;
  v_id bigint; v_movs integer;
BEGIN
  SELECT i.salida_id, i.id, i.product_id, i.batch_id INTO v_salida, v_item, v_prod, v_batch
  FROM public.salida_items i
  JOIN public.salidas s ON s.id=i.salida_id
  WHERE coalesce(i.product_id,0) <> 0 AND NOT coalesce(i.es_externo,false)
    AND i.cantidad - coalesce(i.cantidad_devuelta,0) >= 2
  ORDER BY i.id DESC LIMIT 1;
  IF v_item IS NULL THEN
    RAISE NOTICE 'SIN DATOS no hay material con stock para probar; solo se verificaron funcion y permiso'; RETURN;
  END IF;

  SELECT coalesce(p.quantity,0), coalesce(i.cantidad_devuelta,0) INTO v_stock0, v_dev0
  FROM public.products p JOIN public.salida_items i ON i.id=v_item WHERE p.id=v_prod;
  SELECT coalesce(quantity,0) INTO v_batch0 FROM public.batches WHERE id=v_batch;

  PERFORM public.fn_registrar_devolucion(v_salida, v_item, 1, 'PRUEBA X', 'PRUEBA X');
  SELECT id INTO v_id FROM public.salida_devoluciones WHERE salida_item_id=v_item ORDER BY id DESC LIMIT 1;
  SELECT coalesce(p.quantity,0), coalesce(i.cantidad_devuelta,0) INTO v_stock1, v_dev1
  FROM public.products p JOIN public.salida_items i ON i.id=v_item WHERE p.id=v_prod;
  SELECT coalesce(quantity,0) INTO v_batch1 FROM public.batches WHERE id=v_batch;
  IF v_stock1 IS NOT DISTINCT FROM v_stock0+1 AND v_dev1 IS NOT DISTINCT FROM v_dev0+1
     AND (v_batch IS NULL OR v_batch1 IS NOT DISTINCT FROM v_batch0+1) THEN
    RAISE NOTICE 'OK  registrar sube stock, Devuelto y lote (% -> %)', v_stock0, v_stock1;
  ELSE
    RAISE NOTICE 'MAL registrar: stock % -> %, devuelto % -> %, lote % -> %', v_stock0, v_stock1, v_dev0, v_dev1, v_batch0, v_batch1;
  END IF;

  PERFORM public.fn_eliminar_devolucion(v_id, 'PRUEBA X');
  SELECT coalesce(p.quantity,0), coalesce(i.cantidad_devuelta,0) INTO v_stock2, v_dev2
  FROM public.products p JOIN public.salida_items i ON i.id=v_item WHERE p.id=v_prod;
  SELECT coalesce(quantity,0) INTO v_batch2 FROM public.batches WHERE id=v_batch;
  IF v_stock2 IS NOT DISTINCT FROM v_stock0 AND v_dev2 IS NOT DISTINCT FROM v_dev0
     AND (v_batch IS NULL OR v_batch2 IS NOT DISTINCT FROM v_batch0) THEN
    RAISE NOTICE 'OK  la X devuelve stock, Devuelto y lote a como estaban (% -> %)', v_stock1, v_stock2;
  ELSE
    RAISE NOTICE 'MAL la X: stock % -> %, devuelto % -> %, lote % -> %', v_stock1, v_stock2, v_dev1, v_dev2, v_batch1, v_batch2;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.salida_devoluciones WHERE id=v_id) THEN
    RAISE NOTICE 'OK  la fila desaparece del historial (id %)', v_id;
  ELSE
    RAISE NOTICE 'MAL la fila sigue en el historial';
  END IF;

  SELECT count(*) INTO v_movs FROM public.inventory_movements
  WHERE operation_type='ANULACION' AND reason LIKE 'Eliminación de devolución%'
    AND notes LIKE 'Devolución #' || v_id || '%' AND change_amount = -1;
  IF v_movs=1 THEN
    RAISE NOTICE 'OK  queda un movimiento ANULACION en negativo como constancia';
  ELSE
    RAISE NOTICE 'MAL movimiento de constancia: %', v_movs;
  END IF;

  BEGIN
    PERFORM public.fn_eliminar_devolucion(v_id, 'PRUEBA X');
    RAISE NOTICE 'MAL eliminar dos veces no dio error';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK  eliminar dos veces da error claro (%)', SQLERRM;
  END;

  PERFORM public.fn_registrar_devolucion(v_salida, v_item, 1, 'PRUEBA X DE NUEVO', 'PRUEBA X');
  SELECT coalesce(p.quantity,0) INTO v_stock3 FROM public.products p WHERE p.id=v_prod;
  IF v_stock3 IS NOT DISTINCT FROM v_stock0+1 THEN
    RAISE NOTICE 'OK  se puede volver a registrar después de la X (% -> %)', v_stock2, v_stock3;
  ELSE
    RAISE NOTICE 'MAL al registrar de nuevo: esperado % pero quedó %', v_stock0+1, v_stock3;
  END IF;
END $$;
ROLLBACK;
`;

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    console.log(`===== PRUEBA DE LA X EN ${BASE.toUpperCase()} (nada se guarda) =====`);
    const r = await s.execCommand(`runuser -u postgres -- psql -At -d ${BASE}`, { stdin: SQL });
    console.log((r.stdout || '').trim());
    if (r.stderr) console.log(r.stderr.trim());
    const lineas = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).filter((l) => /\bMAL\b|ERROR:/i.test(l.replace(/^NOTICE:\s*/, '')));
    if (lineas.length) {
      console.log('RESULTADO: FALLÓ');
      process.exitCode = 1;
    } else {
      console.log('RESULTADO: TODO OK');
    }
  } finally { s.dispose(); }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
