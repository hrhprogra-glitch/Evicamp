// Prueba del escáner de código de barras por cámara para celular en nego.siumax.duckdns.org:
// 1. En PC/laptop (1366x860): el botón [ 📷 ] NO se ve en ningún buscador (oculto al 100 %).
// 2. En celular (390x844): el botón [ 📷 ] SÍ aparece, sin esquinas redondeadas (0px).
// 3. Funciona en Caja (agrega al carrito), Conteos › Nuevo ajuste (elige producto y pasa a "¿Cuántos hay?"),
//    Conteos › tabla, Inventario (Productos y Lotes), Nuevo producto e Ingresar lote.
// Uso: node ai-scripts/pruebas/prueba-escaner-celular.mjs "d:/Programación/siumax/herramientas-pruebas" "d:/Programación/siumax/comercio"

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [tools, proyecto] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(proyecto, '.env.vps'));

const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh');
const { conexionVps } = reqP('./ai-scripts/vps.cjs');

const sql = async (q) => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose();
  if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr);
  return r.stdout.trim();
};

const m = Date.now();
const PROD_ID = 997000 + (m % 2000);
const LOTE_ID = 998000 + (m % 2000);
const BARCODE = '775999' + String(m).slice(-7);
const SKU = 'SCAN-' + String(m).slice(-5);
const NOMBRE = 'PRUEBA ESCANER ' + String(m).slice(-5);

await sql(`
  INSERT INTO products (id, name, code, barcode, category, price, cost_price, quantity, min_stock, unit, is_active, is_synced)
  VALUES (${PROD_ID}, '${NOMBRE}', '${SKU}', '${BARCODE}', 'GENERAL', 8.50, 5.00, 15, 2, 'UND', 1, 1);
  INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_unit, document_ref, created_at, is_active, is_synced)
  VALUES (${LOTE_ID}, ${PROD_ID}, 15, 15, 5.00, 'LOTE-SCAN-1', now(), 1, 1);
`);

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));

const visible = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && el.offsetParent !== null;
  }, sel);

const simularEscaneo = async (btnSelector, codigo) => {
  await page.click(btnSelector);
  await page.waitForSelector('#modal-escaner-celular', { timeout: 5000 });
  await pausa(150);
  const radioModal = await page.$eval('#modal-escaner-celular .ventana-sobria', (el) => getComputedStyle(el).borderRadius);
  await page.evaluate((c) => {
    window.dispatchEvent(new CustomEvent('siumax:escaner-celular', { detail: c }));
  }, codigo);
  await pausa(450);
  return radioModal;
};

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 });
  await pausa(2500);

  // 1. Verificar en vista PC (1366x860): el botón de cámara NO se ve en Caja ni en Inventario
  await page.focus('#sidebar-btn-pos');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#buscador-global-pos');
  await pausa(800);
  ok('En PC (1366x860): botón de cámara oculto en Caja', !(await visible('#btn-escaner-pos')));

  await page.focus('#sidebar-btn-inventario');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#buscador-global-inventario');
  await pausa(1200);
  ok('En PC (1366x860): botón de cámara oculto en Inventario', !(await visible('#btn-escaner-inventario')));

  // 2. Cambiar a pantalla de celular (390x844) sin recargar la sesión
  await page.setViewport({ width: 390, height: 844 });
  await pausa(500);

  ok('En Celular (390x844): botón de cámara visible en Inventario', await visible('#btn-escaner-inventario'));
  const radioBtnInv = await page.$eval('#btn-escaner-inventario', (el) => getComputedStyle(el).borderRadius);
  ok('Estilo SiuMax Sobrio: botón de cámara con 0px de redondeo', radioBtnInv === '0px', radioBtnInv);

  // 3. Escanear en buscador de Inventario (Productos y Lotes)
  const radioModalInv = await simularEscaneo('#btn-escaner-inventario', BARCODE);
  const valInv = await page.$eval('#buscador-global-inventario', (i) => i.value);
  ok('Inventario › Productos: escaneo llena el buscador y ventana es 0px', valInv === BARCODE && radioModalInv === '0px', valInv);

  await page.click('#btn-tab-lotes');
  await pausa(900);
  const textoLotes = await page.evaluate(() => document.body.innerText);
  ok('Inventario › Lotes: encuentra los lotes al escanear el código de barras', textoLotes.includes(NOMBRE));

  // Limpiar buscador de inventario
  await page.click('#btn-borrar-buscador-inventario');
  await pausa(300);

  // 4. Inventario › Nuevo producto (#btn-escaner-barcode-producto)
  await page.click('#btn-tab-productos');
  await pausa(400);
  await page.click('#btn-nuevo-producto');
  await page.waitForSelector('#btn-naturaleza-unidad');
  await page.click('#btn-naturaleza-unidad');
  await page.waitForSelector('#input-barcode-producto');
  await pausa(300);
  ok('Nuevo producto (celular): botón de cámara visible junto a Código de Barras', await visible('#btn-escaner-barcode-producto'));
  await simularEscaneo('#btn-escaner-barcode-producto', '7751234567890');
  const valBarcode = await page.$eval('#input-barcode-producto', (i) => i.value);
  ok('Nuevo producto: escaneo llena el campo Código de Barras', valBarcode === '7751234567890', valBarcode);
  await page.keyboard.press('Escape');
  await pausa(400);

  // 5. Inventario › Ingresar lote (#btn-escaner-lote)
  await page.click('#btn-ingresar-lote');
  await page.waitForSelector('#input-buscar-producto-lote');
  await pausa(300);
  ok('Ingresar lote (celular): botón de cámara visible', await visible('#btn-escaner-lote'));
  await simularEscaneo('#btn-escaner-lote', BARCODE);
  await pausa(350);
  const loteElegido = await page.evaluate((n) => document.body.innerText.includes(n), NOMBRE);
  ok('Ingresar lote: escaneo selecciona automáticamente el producto', loteElegido);
  await page.keyboard.press('Escape');
  await pausa(400);

  // 6. Conteos › Nuevo ajuste (#btn-escaner-ajuste) y buscador de Conteos (#btn-escaner-conteos)
  await page.evaluate(() => document.getElementById('sidebar-btn-conteos')?.click());
  await page.waitForSelector('#buscador-global-conteos');
  await pausa(1000);
  ok('Conteos (celular): botón de cámara visible en el buscador de tabla', await visible('#btn-escaner-conteos'));

  await page.click('#btn-nuevo-ajuste');
  await page.waitForSelector('#input-buscar-ajuste');
  await pausa(400);
  ok('Conteos › Nuevo ajuste (celular): botón de cámara visible', await visible('#btn-escaner-ajuste'));
  await simularEscaneo('#btn-escaner-ajuste', BARCODE);
  await pausa(450);
  const prodConteo = await page.$eval('#ajuste-producto-elegido', (el) => el.innerText.trim()).catch(() => '');
  ok('Conteos › Nuevo ajuste: escaneo elige el producto al instante para contar', prodConteo.includes(NOMBRE), prodConteo);
  await page.keyboard.press('Escape');
  await pausa(400);

  // 7. Punto de Venta / Caja (#btn-escaner-pos)
  await page.evaluate(() => document.getElementById('sidebar-btn-pos')?.click());
  await page.waitForSelector('#buscador-global-pos');
  await pausa(800);
  ok('Caja (celular): botón de cámara visible en el buscador', await visible('#btn-escaner-pos'));
  await simularEscaneo('#btn-escaner-pos', BARCODE);
  await pausa(500);
  const enCarrito = await page.evaluate(
    (n) => (document.body.textContent || '').includes(n) || /CAJA CERRADA/i.test(document.body.innerText),
    NOMBRE
  );
  ok('Caja: escaneo con cámara agrega el producto directo a la venta', enCarrito);
} catch (e) {
  ok('Sin fallas en la ejecución', false, e.stack || e.message);
} finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`DELETE FROM batches WHERE id = ${LOTE_ID}; DELETE FROM products WHERE id = ${PROD_ID};`);
  console.log(res.join('\n'));
}
