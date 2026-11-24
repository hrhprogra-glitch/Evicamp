// Pasada 228: prueba REAL de stock del detalle de salida en Nego (solo siumax).
// Verifica: fecha y trabajador guardados en la devolución, que las llamadas con menos
// argumentos sigan funcionando, y que «Continuar salida» descuente el stock otra vez.
// Respaldo previo, sin Evicamp, sin push.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const SQL = `
DO \$\$
DECLARE
  v_prod bigint; v_stock0 numeric; v_stock numeric;
  v_trab bigint;
  v_salida bigint; v_salida2 bigint; v_salida3 bigint; v_salida4 bigint; v_salida5 bigint;
  v_item bigint; v_fecha timestamptz := '2026-11-20 12:00:00+00';
  v_n integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = 990002) THEN
    INSERT INTO public.customers (id,name,dni,activo,created_at,is_synced)
    VALUES (990002,'ZZZ CLIENTE STOCK 228','990002',true,now(),1);
  END IF;
  INSERT INTO public.trabajadores (nombre,cargo,estado)
  VALUES ('ZZZ 228 TECNICO STOCK','TECNICO','ACTIVO') RETURNING id INTO v_trab;

  SELECT id, coalesce(quantity, 0) INTO v_prod, v_stock0
  FROM public.products WHERE coalesce(is_active, 1) = 1 AND coalesce(quantity, 0) >= 12 ORDER BY id LIMIT 1;
  IF v_prod IS NULL THEN RAISE EXCEPTION 'No hay producto con stock suficiente para la prueba'; END IF;

  -- A) La fecha y el trabajador elegidos se guardan con la devolución.
  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo','SERVICIO','customer_id',990002,'usuario','PRUEBA 228',
    'observaciones','ZZZ FECHA TRAB 228',
    'items',jsonb_build_array(jsonb_build_object(
      'product_id',v_prod,'descripcion','ZZZ A 228','unidad','UNID',
      'cantidad',4,'costo_unitario',1,'es_externo',false))))->>'id')::bigint INTO v_salida;
  SELECT id INTO v_item FROM public.salida_items WHERE salida_id = v_salida;
  PERFORM public.fn_registrar_devolucion(v_salida, v_item, 4, 'ZZZ MOTIVO 228', 'PRUEBA 228', v_fecha, v_trab);
  SELECT count(*) INTO v_n FROM public.salida_devoluciones
  WHERE salida_id = v_salida AND fecha = v_fecha AND trabajador_id = v_trab AND cantidad = 4;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FALLA 1: fecha/trabajador no guardados (n=%)', v_n; END IF;
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 THEN RAISE EXCEPTION 'FALLA 2: tras devolver quedó % y esperaba %', v_stock, v_stock0; END IF;
  RAISE NOTICE 'OK 1: fecha y trabajador se guardan con la devolución';

  -- B) Las llamadas con menos argumentos (firmas viejas) siguen funcionando: trabajador en blanco.
  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo','SERVICIO','customer_id',990002,'usuario','PRUEBA 228',
    'observaciones','ZZZ 5 ARGS 228',
    'items',jsonb_build_array(jsonb_build_object(
      'product_id',v_prod,'descripcion','ZZZ B 228','unidad','UNID',
      'cantidad',2,'costo_unitario',1,'es_externo',false))))->>'id')::bigint INTO v_salida2;
  SELECT id INTO v_item FROM public.salida_items WHERE salida_id = v_salida2;
  PERFORM public.fn_registrar_devolucion(v_salida2, v_item, 2, 'ZZZ 5 ARGS 228', 'PRUEBA 228');
  SELECT count(*) INTO v_n FROM public.salida_devoluciones WHERE salida_id = v_salida2 AND trabajador_id IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FALLA 3: la llamada con 5 argumentos dejó de funcionar'; END IF;
  RAISE NOTICE 'OK 2: llamada con 5 argumentos sigue funcionando y deja el trabajador en blanco';

  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo','SERVICIO','customer_id',990002,'usuario','PRUEBA 228',
    'observaciones','ZZZ 4 ARGS 228',
    'items',jsonb_build_array(jsonb_build_object(
      'product_id',v_prod,'descripcion','ZZZ B2 228','unidad','UNID',
      'cantidad',1,'costo_unitario',1,'es_externo',false))))->>'id')::bigint INTO v_salida3;
  SELECT id INTO v_item FROM public.salida_items WHERE salida_id = v_salida3;
  PERFORM public.fn_registrar_devoluciones_lote(v_salida3,
    jsonb_build_array(jsonb_build_object('item_id', v_item, 'cantidad', 1)),
    'ZZZ 4 ARGS 228', 'PRUEBA 228');
  SELECT count(*) INTO v_n FROM public.salida_devoluciones WHERE salida_id = v_salida3 AND trabajador_id IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FALLA 4: la llamada al lote con 4 argumentos dejó de funcionar'; END IF;
  RAISE NOTICE 'OK 3: llamada al lote con 4 argumentos sigue funcionando';

  -- C) «Continuar salida»: salida nueva con los mismos materiales descuenta el stock otra vez.
  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo','SERVICIO','customer_id',990002,'usuario','PRUEBA 228',
    'observaciones','ZZZ RAIZ 228',
    'items',jsonb_build_array(jsonb_build_object(
      'product_id',v_prod,'descripcion','ZZZ C 228','unidad','UNID',
      'cantidad',3,'costo_unitario',1,'es_externo',false))))->>'id')::bigint INTO v_salida4;
  SELECT (public.fn_registrar_salida(jsonb_build_object(
    'tipo','SERVICIO','customer_id',990002,'usuario','PRUEBA 228',
    'observaciones','Continuación de 228','salida_raiz_id',v_salida4,
    'items',jsonb_build_array(jsonb_build_object(
      'product_id',v_prod,'descripcion','ZZZ C 228','unidad','UNID',
      'cantidad',3,'costo_unitario',1,'es_externo',false))))->>'id')::bigint INTO v_salida5;
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 - 6 THEN RAISE EXCEPTION 'FALLA 5: doble descuento quedó % y esperaba %', v_stock, v_stock0 - 6; END IF;
  SELECT count(*) INTO v_n FROM public.salida_items
  WHERE salida_id = v_salida4 AND cantidad = 3 AND coalesce(cantidad_devuelta, 0) = 0;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FALLA 6: la salida original cambió'; END IF;
  SELECT count(*) INTO v_n FROM public.salidas WHERE id = v_salida5 AND salida_raiz_id = v_salida4;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FALLA 7: la salida nueva no quedó ligada a su raíz'; END IF;
  RAISE NOTICE 'OK 4: continuar descontó otra vez y la salida original quedó igual';

  -- Limpieza con RPC: devuelve cualquier stock pendiente.
  PERFORM public.fn_eliminar_salida(s.id, 'LIMPIEZA PRUEBA 228') FROM public.salidas s WHERE s.customer_id = 990002;
  SELECT coalesce(quantity, 0) INTO v_stock FROM public.products WHERE id = v_prod;
  IF v_stock <> v_stock0 THEN RAISE EXCEPTION 'FALLA 8: tras borrar quedó % y esperaba %', v_stock, v_stock0; END IF;
  DELETE FROM public.inventory_movements WHERE "user" = 'PRUEBA 228';
  DELETE FROM public.salida_devoluciones WHERE usuario = 'PRUEBA 228';
  DELETE FROM public.trabajadores WHERE nombre = 'ZZZ 228 TECNICO STOCK';
  DELETE FROM public.customers WHERE id = 990002;
  RAISE NOTICE 'PRUEBA 228 TERMINADA: TODO OK';
END \$\$;
`;

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const ej = async (cmd) => {
    const r = await s.execCommand(cmd);
    if (r.code !== 0) throw new Error(`${cmd.slice(0, 60)}…: ${r.stderr || r.stdout}`);
    return r.stdout.trim();
  };
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    console.log('Respaldo:', await ej(`runuser -u postgres -- pg_dump -Fc -d siumax -f /var/lib/postgresql/respaldo-siumax-antes-prueba228-${marca}.dump && echo listo`));
    const r = await s.execCommand('runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d siumax', { stdin: SQL });
    console.log((r.stdout || '').trim() || '(sin salida)');
    console.log((r.stderr || '').trim());
    if (r.stderr && /ERROR|FATAL/i.test(r.stderr)) throw new Error(r.stderr);
    if (/FALLA|ERROR/i.test(r.stdout)) throw new Error('La prueba de stock 228 falló');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
