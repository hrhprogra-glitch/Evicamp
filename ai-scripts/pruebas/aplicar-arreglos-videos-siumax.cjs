// Aplica en la base de PRUEBAS siumax los arreglos del 11/11/2026 (bitácora 130 y 131): costo al recibir compra,
// cambio de producto con lotes (fn_mover_stock_cambio), anular después de un cambio. Y corrige los costos viejos:
// cada producto toma el costo de su último lote (lo que ya muestra Inventario).
// Respaldo (pg_dump + CSV de los costos) → seguridad-sesion.sql completo (repetible) con lock_timeout → costos → verificación.
// Uso: node ai-scripts/pruebas/aplicar-arreglos-videos-siumax.cjs   (para Evicamp: copiar con BASE y aviso del dueño)
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const BASE = 'siumax';

// Último lote con costo de cada producto (sin tallas/colores); solo los que cambian
const COSTOS = `
WITH ultimo AS (
  SELECT DISTINCT ON (b.product_id) b.product_id, b.cost_unit
    FROM public.batches b
   WHERE b.variant_id IS NULL AND coalesce(b.cost_unit, 0) > 0 AND coalesce(b.is_active, 1) = 1
   ORDER BY b.product_id, b.created_at DESC, b.id DESC)
SELECT p.id, p.name, p.cost_price AS antes, u.cost_unit AS ahora
  FROM public.products p JOIN ultimo u ON u.product_id = p.id
 WHERE p.cost_price IS DISTINCT FROM u.cost_unit`;

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const ej = async (cmd) => {
    const r = await s.execCommand(cmd);
    if (r.code !== 0) throw new Error(`${cmd.slice(0, 60)}…: ${r.stderr || r.stdout}`);
    return r.stdout.trim();
  };
  const psql = async (sql) => {
    await s.execCommand(`cat > /tmp/arreglos-consulta.sql`, { stdin: sql });
    return ej(`chmod 644 /tmp/arreglos-consulta.sql && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ${BASE} -f /tmp/arreglos-consulta.sql; rm -f /tmp/arreglos-consulta.sql`);
  };
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-${BASE}-antes-arreglos-videos-${marca}.dump`;
    console.log('1. Respaldo:', await ej(`runuser -u postgres -- pg_dump -Fc -d ${BASE} -f ${respaldo} && ls -lh ${respaldo} | awk '{print $5, $9}'`));
    const csv = `/var/lib/postgresql/respaldo-costos-${BASE}-${marca}.csv`;
    await psql(`\\copy (SELECT id, name, cost_price FROM public.products) TO '${csv}' CSV HEADER`);
    console.log('   costos de antes:', csv);

    console.log('2. Aplicando servidor/sql/seguridad-sesion.sql...');
    await s.putFile(path.join(__dirname, '../../servidor/sql/seguridad-sesion.sql'), '/tmp/seguridad-arreglos.sql');
    const r = await s.execCommand(`chmod 644 /tmp/seguridad-arreglos.sql && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${BASE} -c "SET lock_timeout = '5s'" -f /tmp/seguridad-arreglos.sql 2>&1 | grep -E "ERROR|FATAL|lock timeout" ; rm -f /tmp/seguridad-arreglos.sql`);
    if (r.stdout.trim()) throw new Error('psql: ' + r.stdout.trim());
    console.log('   sin errores');

    console.log('3. Costos viejos → costo del último lote:');
    const lista = await psql(`SET lock_timeout = '5s';\n${COSTOS};`);
    console.log(lista ? lista.split('\n').filter((l) => l.includes('|')).map((l) => '   ' + l.replace(/\|/g, ' · ')).join('\n') : '   (ninguno)');
    // Sin sesión (x-sesion): es un cambio interno del servidor, fn_proteger_precios lo deja pasar
    console.log('  ', await psql(`SET lock_timeout = '5s';\nWITH c AS (${COSTOS}) UPDATE public.products p SET cost_price = c.ahora FROM c WHERE c.id = p.id RETURNING p.id;`).then((x) => (x ? x.split('\n').filter((l) => /^\d+$/.test(l)).length : 0) + ' producto(s) corregido(s)'));

    console.log('4. Verificando...');
    console.log(await psql(`
      SELECT 'fn_mover_stock_cambio: ' || count(*) FROM pg_proc WHERE proname = 'fn_mover_stock_cambio';
      SELECT 'recibir compra pone el costo: ' || (prosrc LIKE '%costo_de_compra%') FROM pg_proc WHERE proname = 'fn_recibir_compra';
      SELECT 'protección de precios lo deja pasar: ' || (prosrc LIKE '%costo_de_compra%') FROM pg_proc WHERE proname = 'fn_proteger_precios';
      SELECT 'anular después de un cambio: ' || (prosrc LIKE '%v_resta%') FROM pg_proc WHERE proname = 'fn_anular_venta';
      SELECT 'costos distintos al último lote: ' || count(*) FROM (${COSTOS}) x;`));
    console.log('Listo.');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
