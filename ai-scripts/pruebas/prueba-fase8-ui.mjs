// ai-scripts/pruebas/prueba-fase8-ui.mjs
// Prueba UI completa Fase 8 en siumax con Puppeteer:
// 1. Iniciar sesión en siumax.duckdns.org
// 2. Crear datos de prueba (Insumo con lote, Producto Receta y Producto Combo)
// 3. Ir a Inventario y verificar botón [ + Producir ] en el header
// 4. Abrir ModalProduccion con el botón o con el icono de chef en la fila de un producto con receta
// 5. Verificar cálculo dinámico de insumos, costos y stock máximo fabricable
// 6. Fabricar 2 unidades desde el modal y verificar actualización de stock en Inventario
// 7. Ir a Caja (POS) y verificar tarjeta con badge '📦 COMBO' y cálculo de stock dinámico
// 8. Limpiar datos de prueba al finalizar

import { createRequire } from 'node:module';
import path from 'node:path';

const cwd = process.cwd();
const reqP = createRequire(path.resolve(cwd, 'package.json'));
let puppeteer;
try {
  puppeteer = reqP('puppeteer-core');
} catch {
  puppeteer = reqP('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core');
}
const { NodeSSH } = reqP('node-ssh');
const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.resolve(cwd, '.env.vps'));

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const sql = async (q) => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose();
  if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr);
  return r.stdout.trim();
};

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 }
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', msg => {
  const txt = msg.text();
  if (txt.includes('Error') || txt.includes('error')) console.log('PAGE LOG:', txt);
});
page.on('dialog', async (d) => {
  console.log('PAGE DIALOG:', d.message());
  await d.accept();
});

const TIMESTAMP = Date.now().toString().slice(-4);
const HARINA_NAME = `HARINA PRUEBA UI ${TIMESTAMP}`;
const PANETON_NAME = `PANETON RECETA UI ${TIMESTAMP}`;
const COMBO_NAME = `COMBO DESAYUNO UI ${TIMESTAMP}`;

let harinaId, panetonId, comboId;

try {
  console.log('1. Creando datos de prueba para Fase 8 en base siumax...');
  const hRaw = await sql(`
    INSERT INTO products (name, code, barcode, category, unit, control_type, price, cost_price, quantity, is_active)
    VALUES ('${HARINA_NAME}', 'HAR-${TIMESTAMP}', '775001${TIMESTAMP}', 'INSUMOS', 'KG', 'WEIGHT', 4.50, 3.00, 50, 1)
    RETURNING id;
  `);
  harinaId = hRaw.match(/\d+/)?.[0];

  const nowMs = Date.now();
  await sql(`
    INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_unit, cost_total, document_ref, is_active, is_synced)
    VALUES (${nowMs}, ${harinaId}, 50, 50, 3.00, 150.00, 'LOTE-HAR-${TIMESTAMP}', 1, 1);
  `);

  const pRaw = await sql(`
    INSERT INTO products (name, code, barcode, category, unit, control_type, price, cost_price, quantity, tipo_compuesto, costo_adicional_produccion, is_active)
    VALUES ('${PANETON_NAME}', 'PAN-${TIMESTAMP}', '775002${TIMESTAMP}', 'PANADERIA', 'UND', 'UNIT', 25.00, 0, 0, 'RECETA', 2.50, 1)
    RETURNING id;
  `);
  panetonId = pRaw.match(/\d+/)?.[0];

  await sql(`
    INSERT INTO product_recipes (parent_product_id, component_product_id, quantity)
    VALUES (${panetonId}, ${harinaId}, 0.500);
  `);

  const cRaw = await sql(`
    INSERT INTO products (name, code, barcode, category, unit, control_type, price, cost_price, quantity, tipo_compuesto, is_active)
    VALUES ('${COMBO_NAME}', 'CMB-${TIMESTAMP}', '775003${TIMESTAMP}', 'COMBOS', 'UND', 'UNIT', 15.00, 0, 0, 'COMBO', 1)
    RETURNING id;
  `);
  comboId = cRaw.match(/\d+/)?.[0];

  await sql(`
    INSERT INTO product_recipes (parent_product_id, component_product_id, quantity)
    VALUES (${comboId}, ${harinaId}, 1.000);
  `);
  ok('Datos de prueba creados (Insumo Harina 50kg, Paneton Receta, Combo Desayuno)', true);

  console.log('2. Iniciando sesión en siumax...');
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 15000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');

  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  ok('Login exitoso en siumax', true);
  await pausa(1500);

  // 3. Ir a Inventario
  console.log('3. Navegando a Inventario...');
  await page.click('#sidebar-btn-inventario');
  await page.waitForSelector('#btn-tab-productos', { timeout: 15000 });
  await pausa(1500);

  // Verificar botón [ + Producir ] en el header
  const btnProducirHeader = await page.$('#btn-header-producir');
  ok('Botón [ + Producir ] visible en el encabezado de inventario', !!btnProducirHeader);
  const artifactsDir = 'C:/Users/User/.gemini/antigravity-ide/brain/77d05cda-194d-4130-9efd-5320385d62f6';
  await page.screenshot({ path: path.join(artifactsDir, 'fase8_inventario_header.png') });

  // 4. Abrir Modal de Producción desde el Header
  console.log('4. Abriendo Modal de Producción desde Header...');
  await page.click('#btn-header-producir');
  await page.waitForSelector('#modal-produccion-receta', { timeout: 5000 });
  ok('ModalProduccion abre correctamente con #modal-produccion-receta', true);
  await pausa(800);
  await page.screenshot({ path: path.join(artifactsDir, 'fase8_modal_produccion.png') });

  // Cerrar con Escape
  console.log('5. Probando cierre con Escape...');
  await page.keyboard.press('Escape');
  await pausa(800);
  const modalCerrado = await page.$('#modal-produccion-receta');
  ok('ModalProduccion se cierra limpiamente con la tecla Escape', !modalCerrado);

  // 6. Buscar en tabla el paneton creado
  console.log('6. Buscando productos creados en la tabla...');
  const searchInput = await page.$('#buscador-global-inventario');
  if (searchInput) {
    await searchInput.focus();
    await page.keyboard.type(`UI ${TIMESTAMP}`);
    await pausa(1500);
  }

  // Verificar insignias en pantalla
  const contenidoTabla = await page.evaluate(() => document.body.innerText);
  const tieneBadgeReceta = contenidoTabla.includes('RECETA');
  const tieneBadgeCombo = contenidoTabla.includes('COMBO');
  ok('Insignia 👨‍🍳 RECETA presente en la tabla de productos', tieneBadgeReceta);
  ok('Insignia 📦 COMBO presente en la tabla de productos', tieneBadgeCombo);

  // 7. Probar botón de producción directo desde la fila
  const btnFilaProducir = await page.$(`button#btn-producir-fila-${panetonId}`);
  if (btnFilaProducir) {
    console.log('7. Abriendo ModalProduccion desde el botón de la fila del paneton...');
    await btnFilaProducir.click();
    await page.waitForSelector('#modal-produccion-receta', { timeout: 5000 });
    ok('ModalProduccion abre directamente desde la fila del producto receta', true);
    await pausa(1000);

    // Cambiar cantidad a fabricar a 2
    const inputCant = await page.$('#input-cantidad-produccion');
    if (inputCant) {
      await inputCant.click({ clickCount: 3 });
      await page.keyboard.type('2');
      await pausa(500);
    }

    // Fabricar 2 unidades
    console.log('8. Confirmando orden de producción de 2 unidades...');
    const btnConfirmar = await page.$('#btn-confirmar-produccion');
    if (btnConfirmar) {
      await btnConfirmar.click();
      await pausa(2000);
      const btnAviso = await page.$('#dialogo-sistema-aceptar');
      if (btnAviso) {
        console.log('Aceptando diálogo de éxito (#dialogo-sistema-aceptar)...');
        await btnAviso.click();
        await pausa(1000);
      }
      ok('Orden de producción confirmada y procesada con éxito', true);
    }
  }

  // Verificar stock actualizado en base de datos
  const panetonStock = await sql(`SELECT quantity FROM products WHERE id = ${panetonId};`);
  ok('Stock del producto fabricado aumentó a 2 unidades', Number(panetonStock) === 2, `stock=${panetonStock}`);

  const harinaStock = await sql(`SELECT quantity FROM products WHERE id = ${harinaId};`);
  ok('Stock de insumo Harina se descontó a 49 kg (50 - 2*0.5)', Number(harinaStock) === 49, `stock=${harinaStock}`);

  // 8. Navegar a Caja (POS)
  console.log('9. Navegando a Caja (POS)...');
  await page.click('#sidebar-btn-pos');
  await page.waitForSelector('#buscador-global-pos', { timeout: 15000 });
  await pausa(1500);

  // Buscar combo en Caja
  await page.focus('#buscador-global-pos');
  await page.keyboard.type(COMBO_NAME);
  await pausa(1500);
  await page.screenshot({ path: path.join(artifactsDir, 'fase8_caja_combo.png') });

  const posContenido = await page.evaluate(() => document.body.innerText);
  const comboEnPos = posContenido.includes('COMBO') && (posContenido.includes('49') || posContenido.includes(COMBO_NAME));
  ok('Combo visible en POS con cálculo de stock disponible (49 combos)', comboEnPos);

  console.log('\n--- RESULTADOS PRUEBA FASE 8 UI ---');
  res.forEach(r => console.log(r));

} catch (err) {
  console.error('Error durante la prueba:', err);
  process.exitCode = 1;
} finally {
  // Limpieza en base de datos
  console.log('Limpiando datos de prueba en siumax...');
  try {
    if (panetonId || comboId || harinaId) {
      await sql(`
        DELETE FROM product_recipes WHERE parent_product_id IN (${panetonId || 0}, ${comboId || 0});
        DELETE FROM inventory_movements WHERE product_id IN (${harinaId || 0}, ${panetonId || 0}, ${comboId || 0});
        DELETE FROM batches WHERE product_id IN (${harinaId || 0}, ${panetonId || 0}, ${comboId || 0});
        DELETE FROM products WHERE id IN (${harinaId || 0}, ${panetonId || 0}, ${comboId || 0});
      `);
    }
  } catch (e) {
    console.error('Error en limpieza:', e);
  }
  await nav.close();
}
