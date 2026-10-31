// Prueba backend automatizada para Fase 8 (Producción, Recetas, Insumos, Combos y Kits)
// Valida por SQL en siumax:
// 1. Insumos con stock en lotes
// 2. Orden de producción (fn_producir_receta): validación de stock, descuento FIFO de insumos, creación de lote y stock para producto terminado
// 3. Venta de combo: descuento automático de componentes en Caja (trigger fn_reduce_stock_from_sales)
// 4. Limpieza de datos de prueba
// Uso: node ai-scripts/pruebas/prueba-fase8-backend.mjs

import { createRequire } from 'module';
import path from 'path';

const reqP = createRequire(import.meta.url);
const cwd = process.cwd();
const { NodeSSH } = reqP(path.resolve(cwd, 'node_modules/node-ssh'));
const { conexionVps } = reqP(path.resolve(cwd, 'ai-scripts/vps.cjs'));

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

const idPrueba = Date.now().toString().slice(-6);
const HARINA_NAME = `Harina Test P8 ${idPrueba}`;
const AZUCAR_NAME = `Azucar Test P8 ${idPrueba}`;
const PANETON_NAME = `Paneton Receta P8 ${idPrueba}`;
const COMBO_NAME = `Combo Desayuno P8 ${idPrueba}`;

try {
  console.log('Iniciando prueba backend Fase 8 en siumax (base siumax)...');

  // 1. Limpieza inicial
  await sql(`
    DELETE FROM inventory_movements WHERE product_name IN ('${HARINA_NAME}', '${AZUCAR_NAME}', '${PANETON_NAME}', '${COMBO_NAME}');
    DELETE FROM sale_details WHERE product_name = '${COMBO_NAME}';
    DELETE FROM batches WHERE product_id IN (SELECT id FROM products WHERE name IN ('${HARINA_NAME}', '${AZUCAR_NAME}', '${PANETON_NAME}', '${COMBO_NAME}'));
    DELETE FROM product_recipes WHERE parent_product_id IN (SELECT id FROM products WHERE name IN ('${PANETON_NAME}', '${COMBO_NAME}'));
    DELETE FROM products WHERE name IN ('${HARINA_NAME}', '${AZUCAR_NAME}', '${PANETON_NAME}', '${COMBO_NAME}');
  `);

  // 2. Crear insumos con stock inicial y lotes
  const harinaRaw = await sql(`
    INSERT INTO products (name, code, barcode, unit, price, cost_price, quantity, tipo_compuesto, is_active, is_synced)
    VALUES ('${HARINA_NAME}', 'HAR-${idPrueba}', 'BCHAR-${idPrueba}', 'KGM', 4.50, 3.00, 50, 'ESTANDAR', 1, 1)
    RETURNING id;
  `);
  const harinaId = harinaRaw.split('\n').map(s => s.trim()).filter(s => /^\d+$/.test(s)).pop();

  await sql(`
    INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_unit, cost_total, document_ref, is_active, is_synced)
    VALUES ((extract(epoch from clock_timestamp()) * 1000)::bigint, ${harinaId}, 50, 50, 3.00, 150.00, 'LOTE-HAR-${idPrueba}', 1, 1);
  `);

  const azucarRaw = await sql(`
    INSERT INTO products (name, code, barcode, unit, price, cost_price, quantity, tipo_compuesto, is_active, is_synced)
    VALUES ('${AZUCAR_NAME}', 'AZU-${idPrueba}', 'BCAZU-${idPrueba}', 'KGM', 3.80, 2.50, 20, 'ESTANDAR', 1, 1)
    RETURNING id;
  `);
  const azucarId = azucarRaw.split('\n').map(s => s.trim()).filter(s => /^\d+$/.test(s)).pop();

  await sql(`
    INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_unit, cost_total, document_ref, is_active, is_synced)
    VALUES ((extract(epoch from clock_timestamp()) * 1000)::bigint + 1, ${azucarId}, 20, 20, 2.50, 50.00, 'LOTE-AZU-${idPrueba}', 1, 1);
  `);

  ok('Insumos creados con sus lotes (Harina: 50kg a S/3, Azúcar: 20kg a S/2.50)', harinaId && azucarId);

  // 3. Crear Producto con Receta (Panetón) y asociar componentes
  const panetonRaw = await sql(`
    INSERT INTO products (name, code, barcode, unit, price, cost_price, quantity, tipo_compuesto, costo_adicional_produccion, is_active, is_synced)
    VALUES ('${PANETON_NAME}', 'PAN-${idPrueba}', 'BCPAN-${idPrueba}', 'NIU', 18.00, 0, 0, 'RECETA', 1.00, 1, 1)
    RETURNING id;
  `);
  const panetonId = panetonRaw.split('\n').map(s => s.trim()).filter(s => /^\d+$/.test(s)).pop();

  await sql(`
    INSERT INTO product_recipes (parent_product_id, component_product_id, quantity)
    VALUES
      (${panetonId}, ${harinaId}, 1.000),
      (${panetonId}, ${azucarId}, 0.500);
  `);
  ok('Producto con Receta configurado (Panetón: 1kg Harina + 0.5kg Azúcar)', panetonId);

  // 4. Producir 10 panetones con fn_producir_receta
  const prodRes = await sql(`
    SELECT fn_producir_receta(${panetonId}, 10, 10.00, 'AdminPruebas')::text;
  `);
  console.log('Resultado fn_producir_receta:', prodRes);

  const stockPaneton = await sql(`SELECT quantity FROM products WHERE id = ${panetonId};`);
  ok('Stock de Panetón tras producción es 10', Number(stockPaneton) === 10, `stock=${stockPaneton}`);

  const stockHarina = await sql(`SELECT quantity FROM products WHERE id = ${harinaId};`);
  ok('Stock de Harina descontado a 40 kg (50 - 10)', Number(stockHarina) === 40, `stock=${stockHarina}`);

  const stockAzucar = await sql(`SELECT quantity FROM products WHERE id = ${azucarId};`);
  ok('Stock de Azúcar descontado a 15 kg (20 - 5)', Number(stockAzucar) === 15, `stock=${stockAzucar}`);

  const lotePaneton = await sql(`
    SELECT quantity, cost_unit FROM batches WHERE product_id = ${panetonId} AND is_active = 1;
  `);
  console.log('Lote Panetón creado:', lotePaneton);
  // Costo esperado: (10kg Harina * 3.00 + 5kg Azucar * 2.50 + 10.00 adicional) / 10 = (30 + 12.50 + 10) / 10 = 52.50 / 10 = 5.25
  const [loteCant, loteCosto] = lotePaneton.split('|');
  ok('Lote de Panetón tiene 10 unidades con costo S/ 5.25', Number(loteCant) === 10 && Number(loteCosto) === 5.25, `cant=${loteCant}, costo=${loteCosto}`);

  // 5. Crear Producto Combo (Combo Desayuno: 2 kg harina + 1 kg azúcar)
  const comboRaw = await sql(`
    INSERT INTO products (name, code, barcode, unit, price, cost_price, quantity, tipo_compuesto, is_active, is_synced)
    VALUES ('${COMBO_NAME}', 'CMB-${idPrueba}', 'BCCMB-${idPrueba}', 'NIU', 15.00, 8.50, 0, 'COMBO', 1, 1)
    RETURNING id;
  `);
  const comboId = comboRaw.split('\n').map(s => s.trim()).filter(s => /^\d+$/.test(s)).pop();

  await sql(`
    INSERT INTO product_recipes (parent_product_id, component_product_id, quantity)
    VALUES
      (${comboId}, ${harinaId}, 2.000),
      (${comboId}, ${azucarId}, 1.000);
  `);
  ok('Producto Combo configurado (Combo: 2kg Harina + 1kg Azúcar)', comboId);

  // 6. Simular venta de 2 unidades del Combo en Caja (POS)
  // Harina: 40 - (2 * 2) = 36 kg
  // Azúcar: 15 - (2 * 1) = 13 kg
  const saleRaw = await sql(`
    INSERT INTO sales (total, payment_type, amount_cash, sunat_status, is_synced, created_at)
    VALUES (30.00, 'EFECTIVO', 30.00, 'EMITIDO', 1, now())
    RETURNING id;
  `);
  const saleId = saleRaw.match(/\d+/)?.[0];

  await sql(`
    INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, subtotal, is_synced)
    VALUES (${saleId}, ${comboId}, '${COMBO_NAME}', 2, 15.00, 30.00, 1);
  `);

  const harinaPostCombo = await sql(`SELECT quantity FROM products WHERE id = ${harinaId};`);
  ok('Venta de Combo descuenta insumo Harina automáticamente a 36 kg', Number(harinaPostCombo) === 36, `stock=${harinaPostCombo}`);

  const azucarPostCombo = await sql(`SELECT quantity FROM products WHERE id = ${azucarId};`);
  ok('Venta de Combo descuenta insumo Azúcar automáticamente a 13 kg', Number(azucarPostCombo) === 13, `stock=${azucarPostCombo}`);

  const movsKardex = await sql(`
    SELECT count(*) FROM inventory_movements WHERE notes = 'Ticket #' || '${saleId}';
  `);
  ok('Kardex registra movimientos individuales de insumos por venta de combo', Number(movsKardex) >= 2, `movs=${movsKardex}`);

  // 7. Limpieza
  console.log('Limpiando datos de prueba...');
  await sql(`
    DELETE FROM inventory_movements WHERE product_name IN ('${HARINA_NAME}', '${AZUCAR_NAME}', '${PANETON_NAME}', '${COMBO_NAME}');
    DELETE FROM sale_details WHERE sale_id = ${saleId};
    DELETE FROM sales WHERE id = ${saleId};
    DELETE FROM batches WHERE product_id IN (${harinaId}, ${azucarId}, ${panetonId}, ${comboId});
    DELETE FROM product_recipes WHERE parent_product_id IN (${panetonId}, ${comboId});
    DELETE FROM products WHERE id IN (${harinaId}, ${azucarId}, ${panetonId}, ${comboId});
  `);
  ok('Limpieza de datos de prueba completada', true);

  console.log('\n--- RESULTADOS PRUEBA BACKEND FASE 8 ---');
  res.forEach(r => console.log(r));
  const fallas = res.filter(r => r.startsWith('❌'));
  if (fallas.length > 0) {
    console.error(`\nHAY ${fallas.length} PRUEBAS FALLIDAS`);
    process.exit(1);
  } else {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS BACKEND DE FASE 8 PASARON AL 100%!');
  }
} catch (e) {
  console.error('ERROR EN PRUEBA:', e);
  process.exit(1);
}
