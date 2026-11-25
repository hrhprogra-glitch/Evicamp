// Prueba GENERAL de devoluciones y stock. Solo lectura + una transacción que SIEMPRE se revierte:
// no escribe en ninguna base. Uso: node ai-scripts/pruebas/verificar-generales-devoluciones.cjs <siumax|ecosistema>
// Detecta, entre otras cosas, que el default de store_id apunte a una tienda que exista
// (causa del 409 de ecosistema el 24/11/2026: default=2 y solo existía la tienda 1).
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const bd = process.argv[2];
if (!['siumax', 'ecosistema'].includes(bd)) throw new Error('Uso: ... <siumax|ecosistema>');

const SQL = `
\\set ON_ERROR_STOP off
SELECT CASE WHEN count(*)=0 THEN 'OK  defaults store_id apuntan a tiendas existentes'
            ELSE 'MAL defaults store_id rotos: ' || string_agg(table_name || '=' || column_default, ', ') END
FROM information_schema.columns c
WHERE c.table_schema='public' AND c.column_name='store_id' AND c.column_default IS NOT NULL
  AND c.table_name IN ('inventory_movements','batches','sales','cash_sessions')
  AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = regexp_replace(c.column_default, '[^0-9-]', '', 'g'));

SELECT CASE WHEN count(*)>=1 THEN 'OK  hay tiendas activas'
            ELSE 'MAL no hay tiendas activas' END FROM public.stores WHERE coalesce(activo,true);

SELECT CASE WHEN count(*)>=1 THEN 'OK  hay trabajadores activos para el selector'
            ELSE 'MAL no hay trabajadores activos' END FROM public.trabajadores WHERE estado='ACTIVO';

SELECT CASE WHEN count(*)=1 THEN 'OK  firma de fn_registrar_devoluciones_lote tiene 6 argumentos'
            ELSE 'MAL firma incorrecta de fn_registrar_devoluciones_lote' END
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='fn_registrar_devoluciones_lote' AND p.pronargs=6;

SELECT CASE WHEN has_function_privilege('anon', 'public.fn_registrar_devoluciones_lote(bigint,jsonb,text,text,timestamptz,bigint)', 'EXECUTE')
            THEN 'OK  anon puede ejecutar el lote de devoluciones'
            ELSE 'MAL anon NO puede ejecutar el lote' END;

BEGIN;
DO \$\$
DECLARE
  v_salida bigint; v_item bigint; v_trab bigint; v_stock0 numeric; v_stock1 numeric; v_res jsonb;
BEGIN
  SELECT s.id INTO v_salida FROM public.salidas s
  WHERE EXISTS (SELECT 1 FROM public.salida_items i WHERE i.salida_id=s.id AND i.cantidad - coalesce(i.cantidad_devuelta,0) >= 3)
  ORDER BY s.id DESC LIMIT 1;
  SELECT i.id INTO v_item FROM public.salida_items i
  WHERE i.salida_id=v_salida AND i.cantidad - coalesce(i.cantidad_devuelta,0) >= 3 LIMIT 1;
  SELECT id INTO v_trab FROM public.trabajadores WHERE estado='ACTIVO' ORDER BY id LIMIT 1;
  IF v_salida IS NULL OR v_item IS NULL THEN
    RAISE NOTICE 'MAL  no hay salida con material pendiente para probar';
    RETURN;
  END IF;
  SELECT p.quantity INTO v_stock0 FROM public.products p
  JOIN public.salida_items i ON i.product_id=p.id WHERE i.id=v_item;

  BEGIN
    SELECT public.fn_registrar_devoluciones_lote(v_salida,
      jsonb_build_array(jsonb_build_object('item_id',v_item,'cantidad',1)),
      'PRUEBA GENERAL', 'PRUEBA GENERAL', '2026-11-20 12:00:00+00', v_trab) INTO v_res;
    RAISE NOTICE 'OK  fn_registrar_devoluciones_lote con fecha y trabajador: %', v_res;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'MAL  fn_registrar_devoluciones_lote falló: SQLSTATE=% MENSAJE=%', SQLSTATE, SQLERRM;
    RETURN;
  END;

  SELECT p.quantity INTO v_stock1 FROM public.products p
  JOIN public.salida_items i ON i.product_id=p.id WHERE i.id=v_item;
  IF v_stock1 IS NOT DISTINCT FROM v_stock0 + 1 THEN
    RAISE NOTICE 'OK  el stock volvió al almacén (% -> %)', v_stock0, v_stock1;
  ELSE
    RAISE NOTICE 'MAL  stock esperado % pero quedó %', v_stock0+1, v_stock1;
  END IF;

  BEGIN
    SELECT public.fn_registrar_devoluciones_lote(v_salida,
      jsonb_build_array(jsonb_build_object('item_id',v_item,'cantidad',1)),
      'PRUEBA GENERAL 2', 'PRUEBA GENERAL', NULL, v_trab) INTO v_res;
    SELECT p.quantity INTO v_stock1 FROM public.products p
    JOIN public.salida_items i ON i.product_id=p.id WHERE i.id=v_item;
    IF v_stock1 IS NOT DISTINCT FROM v_stock0 + 2 THEN
      RAISE NOTICE 'OK  dos devoluciones seguidas suman el stock (% -> %)', v_stock0, v_stock1;
    ELSE
      RAISE NOTICE 'MAL  segunda devolución: esperado % pero quedó %', v_stock0+2, v_stock1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'MAL  segunda devolución falló: SQLSTATE=% MENSAJE=%', SQLSTATE, SQLERRM;
  END;

  BEGIN
    SELECT public.fn_registrar_devoluciones_lote(v_salida,
      jsonb_build_array(jsonb_build_object('item_id',v_item,'cantidad', -1))) INTO v_res;
    IF coalesce((v_res->>'devoluciones')::integer, -1) = 0 THEN
      RAISE NOTICE 'OK  cantidad negativa ignorada sin tocar el stock';
    ELSE
      RAISE NOTICE 'MAL  cantidad negativa no fue ignorada: %', v_res;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK  cantidad negativa rechazada (%)', SQLERRM;
  END;
END \$\$;
ROLLBACK;
`;

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    console.log(`===== PRUEBA GENERAL EN ${bd.toUpperCase()} (nada se guarda) =====`);
    const r = await s.execCommand(`runuser -u postgres -- psql -At -d ${bd}`, { stdin: SQL });
    console.log((r.stdout || '').trim());
    if (r.stderr) console.log(r.stderr.trim());
    const errores = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).filter((l) => /^MAL|SQLSTATE=|ERROR:/i.test(l));
    if (errores.length) {
      console.log('RESULTADO: FALLÓ');
      process.exitCode = 1;
    } else {
      console.log('RESULTADO: TODO OK');
    }
  } finally { s.dispose(); }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
