// ai-scripts/pruebas/prueba-fase7-variantes.mjs
// Prueba automatizada Fase 7 (siumax): Tallas y Colores (Variantes con stock propio)
// Verifica:
// 1. Inserción de variantes en product_variants con su propio stock y código de barras.
// 2. Venta en Caja (POS): escanear código de la variante descuenta SOLO esa variante.
// 3. Kardex (inventory_movements): guarda variant_id y variant_name.
// 4. Anular venta (fn_anular_venta): devuelve el stock a la variante correcta.

import { createRequire } from 'node:module';
import path from 'node:path';

const cwd = process.cwd();
const reqP = createRequire(path.resolve(cwd, 'package.json'));
const { NodeSSH } = reqP('node-ssh');
const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.resolve(cwd, '.env.vps'));

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const sql = async (q) => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose();
  if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr);
  return r.stdout.trim();
};

const CODE_M = `VAR-M-${Date.now() % 100000}`;
const CODE_L = `VAR-L-${Date.now() % 100000}`;

try {
  console.log('Iniciando prueba Fase 7 en siumax...');

  // 1. Limpiar o crear producto de prueba
  await sql(`
    DELETE FROM inventory_movements WHERE product_name LIKE 'POLO TEST FASE 7%';
    DELETE FROM sale_details WHERE product_name LIKE 'POLO TEST FASE 7%';
    DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE name = 'POLO TEST FASE 7');
    DELETE FROM products WHERE name = 'POLO TEST FASE 7';
  `);

  const prodRaw = await sql(`
    INSERT INTO products (name, category, code, barcode, price, quantity, min_stock, control_type, unit, tiene_variantes, is_active, is_synced)
    VALUES ('POLO TEST FASE 7', 'ROPA', 'SKU-F7-001', 'BAR-F7-PARENT', 45.00, 15, 2, 'UND', 'UND', true, 1, 1)
    RETURNING id;
  `);
  const prodId = prodRaw.match(/\d+/)?.[0];

  ok('Producto creado con tiene_variantes = true', !!prodId, `ID: ${prodId}`);

  // 2. Insertar 2 variantes con stock independiente
  const varIds = await sql(`
    INSERT INTO product_variants (product_id, nombre_variante, talla, color, barcode, price, quantity, min_stock, is_active, is_synced)
    VALUES 
      (${prodId}, 'TALLA M / NEGRO', 'M', 'NEGRO', '${CODE_M}', 45.00, 10, 2, 1, 1),
      (${prodId}, 'TALLA L / BLANCO', 'L', 'BLANCO', '${CODE_L}', 48.00, 5, 2, 1, 1)
    RETURNING id || ':' || nombre_variante;
  `);

  const lineasVar = varIds.split('\n').filter(l => l.includes(':'));
  const idVarM = lineasVar[0].split(':')[0].trim();
  const idVarL = lineasVar[1].split(':')[0].trim();

  ok('Variantes creadas en product_variants', !!idVarM && !!idVarL, `Var M: ${idVarM}, Var L: ${idVarL}`);

  // 3. Simular Venta de 2 unidades de Talla M en POS vía fn_reduce_stock_from_sales
  const saleRaw = await sql(`
    INSERT INTO sales (total, payment_type, amount_cash, sunat_status, is_synced, created_at)
    VALUES (90.00, 'EFECTIVO', 90.00, 'EMITIDO', 1, now())
    RETURNING id;
  `);
  const saleId = saleRaw.match(/\d+/)?.[0];

  await sql(`
    INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, variant_id, variant_name, subtotal, is_synced)
    VALUES (${saleId}, ${prodId}, 'POLO TEST FASE 7 (TALLA M / NEGRO)', 2, 45.00, ${idVarM}, 'TALLA M / NEGRO', 90.00, 1);
  `);

  // 4. Verificar descuento en BD
  const stockM = await sql(`SELECT quantity FROM product_variants WHERE id = ${idVarM};`);
  const stockL = await sql(`SELECT quantity FROM product_variants WHERE id = ${idVarL};`);
  const stockParent = await sql(`SELECT quantity FROM products WHERE id = ${prodId};`);

  ok('Trigger redujo el stock de Talla M de 10 a 8', Number(stockM) === 8, `Stock actual M: ${stockM}`);
  ok('Stock de Talla L intacto en 5', Number(stockL) === 5, `Stock actual L: ${stockL}`);
  ok('Stock del producto padre genérico intacto en 15 (stock propio/lote independiente)', Number(stockParent) === 15, `Stock actual padre: ${stockParent}`);

  // 5. Verificar Kardex de variante
  const kardex = await sql(`
    SELECT variant_id, variant_name, change_amount, operation_type 
    FROM inventory_movements 
    WHERE notes = 'Ticket #' || ${saleId}::text;
  `);
  ok('Kardex VENTA registró variant_id y variant_name', kardex.includes(idVarM) && kardex.includes('TALLA M / NEGRO'), kardex);

  // 6. Simular venta de 3 unidades del producto genérico (sin variante)
  const saleGenRaw = await sql(`
    INSERT INTO sales (total, payment_type, amount_cash, sunat_status, is_synced, created_at)
    VALUES (135.00, 'EFECTIVO', 135.00, 'EMITIDO', 1, now())
    RETURNING id;
  `);
  const saleGenId = saleGenRaw.match(/\d+/)?.[0];

  await sql(`
    INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, variant_id, variant_name, subtotal, is_synced)
    VALUES (${saleGenId}, ${prodId}, 'POLO TEST FASE 7', 3, 45.00, NULL, NULL, 135.00, 1);
  `);

  const stockParentDespGen = await sql(`SELECT quantity FROM products WHERE id = ${prodId};`);
  const stockMDespGen = await sql(`SELECT quantity FROM product_variants WHERE id = ${idVarM};`);
  ok('Venta genérica redujo el stock del padre de 15 a 12', Number(stockParentDespGen) === 12, `Stock Padre: ${stockParentDespGen}`);
  ok('Venta genérica dejó intacto el stock de variante M en 8', Number(stockMDespGen) === 8, `Stock M: ${stockMDespGen}`);

  // 7. Probar Anular Venta de Variante
  const anularRes = await sql(`
    SELECT set_config('request.headers', json_build_object('x-sesion', token::text)::text, false) FROM sesiones ORDER BY ultimo_uso DESC LIMIT 1;
    SELECT fn_anular_venta(${saleId});
  `);
  ok('fn_anular_venta de variante ejecutada sin error', !!anularRes, anularRes);

  const stockMRestaurado = await sql(`SELECT quantity FROM product_variants WHERE id = ${idVarM};`);
  const stockParentTrasAnulVar = await sql(`SELECT quantity FROM products WHERE id = ${prodId};`);

  ok('Stock de Talla M restaurado a 10 tras anulación', Number(stockMRestaurado) === 10, `Stock M: ${stockMRestaurado}`);
  ok('Stock del producto padre sigue en 12 (no se alteró por anular la variante)', Number(stockParentTrasAnulVar) === 12, `Stock Padre: ${stockParentTrasAnulVar}`);

  // 8. Probar Anular Venta Genérica
  await sql(`
    SELECT set_config('request.headers', json_build_object('x-sesion', token::text)::text, false) FROM sesiones ORDER BY ultimo_uso DESC LIMIT 1;
    SELECT fn_anular_venta(${saleGenId});
  `);
  const stockParentRestauradoTotal = await sql(`SELECT quantity FROM products WHERE id = ${prodId};`);
  ok('Stock del producto padre restaurado a 15 tras anular venta genérica', Number(stockParentRestauradoTotal) === 15, `Stock Padre: ${stockParentRestauradoTotal}`);

  const kardexAnulacion = await sql(`
    SELECT variant_id, variant_name, change_amount, operation_type 
    FROM inventory_movements 
    WHERE notes = 'Anulación Ticket #' || ${saleId}::text;
  `);
  ok('Kardex ANULACION registró variant_id y variant_name', kardexAnulacion.includes(idVarM) && kardexAnulacion.includes('TALLA M / NEGRO'), kardexAnulacion);

  // Limpieza de prueba
  await sql(`
    DELETE FROM inventory_movements WHERE notes LIKE '%Ticket #' || ${saleId}::text OR notes LIKE '%Ticket #' || ${saleGenId}::text;
    DELETE FROM sale_details WHERE sale_id IN (${saleId}, ${saleGenId});
    DELETE FROM sales WHERE id IN (${saleId}, ${saleGenId});
    DELETE FROM product_variants WHERE product_id = ${prodId};
    DELETE FROM products WHERE id = ${prodId};
  `);
  console.log('Limpieza completada.');

} catch (err) {
  ok('Error en la prueba', false, err.message);
}

console.log('\n--- RESULTADOS FASE 7 ---');
console.log(res.join('\n'));
if (res.some(r => r.startsWith('❌'))) {
  process.exit(1);
} else {
  process.exit(0);
}
