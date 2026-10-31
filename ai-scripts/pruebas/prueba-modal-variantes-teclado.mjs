// ai-scripts/pruebas/prueba-modal-variantes-teclado.mjs
// Verifica que la navegación 100% por teclado (selector) funcione en el bloque de variantes de ModalProducto
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
const { rutaEdge } = reqP('./ai-scripts/vps.cjs');

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise(r => setTimeout(r, ms));

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await nav.newPage();
await page.setViewport({ width: 1366, height: 768 });

try {
  console.log('1. Iniciando sesión en siumax...');
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 10000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await pausa(1000);

  console.log('2. Navegando a Inventario y abriendo Nuevo Producto...');
  await page.click('#sidebar-btn-inventario');
  await page.waitForSelector('#btn-tab-productos', { timeout: 15000 });
  await pausa(1000);
  await page.click('#btn-nuevo-producto');
  await page.waitForSelector('#btn-naturaleza-unidad', { timeout: 10000 });

  console.log('3. Eligiendo Por Unidad con teclado (Enter)...');
  await page.focus('#btn-naturaleza-unidad');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#input-nombre-producto', { timeout: 10000 });
  await pausa(500);

  console.log('4. Navegando desde Presentaciones hacia Variantes...');
  // Enfocar la última casilla de presentaciones
  await page.focus('#pres-barcode-2');
  await pausa(200);

  // Flecha Abajo debe llevar a check-tiene-variantes
  await page.keyboard.press('ArrowDown');
  await pausa(200);

  const idTrasPres = await page.evaluate(() => document.activeElement?.id);
  console.log('Foco tras ArrowDown en presentaciones:', idTrasPres);
  ok('Flecha Abajo desde Presentaciones baja a check-tiene-variantes', idTrasPres === 'check-tiene-variantes', `Foco actual: ${idTrasPres}`);

  // Activar variantes con Enter
  console.log('5. Activando variantes con teclado (Enter)...');
  await page.keyboard.press('Enter');
  await pausa(400);

  const tieneVarsChecked = await page.evaluate(() => document.getElementById('check-tiene-variantes')?.checked);
  ok('Enter en check-tiene-variantes activa las variantes', tieneVarsChecked === true);

  // Flecha Abajo debe ir a btn-preset-ropa
  await page.keyboard.press('ArrowDown');
  await pausa(200);
  const idEnPresets = await page.evaluate(() => document.activeElement?.id);
  console.log('Foco tras ArrowDown en checkbox:', idEnPresets);
  ok('Flecha Abajo entra a plantillas rápidas (btn-preset-ropa)', idEnPresets === 'btn-preset-ropa', `Foco actual: ${idEnPresets}`);

  // Flecha Derecha va a btn-preset-calzado
  await page.keyboard.press('ArrowRight');
  await pausa(200);
  const idPresetCalzado = await page.evaluate(() => document.activeElement?.id);
  ok('Flecha Derecha mueve a btn-preset-calzado', idPresetCalzado === 'btn-preset-calzado');

  // Flecha Izquierda vuelve a btn-preset-ropa
  await page.keyboard.press('ArrowLeft');
  await pausa(200);
  const idPresetRopa = await page.evaluate(() => document.activeElement?.id);
  ok('Flecha Izquierda regresa a btn-preset-ropa', idPresetRopa === 'btn-preset-ropa');

  // Presionar Enter en btn-preset-ropa aplica las tallas y enfoca la primera variante
  console.log('6. Aplicando plantilla ropa con Enter...');
  await page.keyboard.press('Enter');
  await pausa(500);

  const filasCreadas = await page.evaluate(() => document.querySelectorAll('[id^="var-talla-"]').length);
  console.log('Filas creadas por preset:', filasCreadas);
  ok('Preset Ropa crea 4 tallas (S, M, L, XL)', filasCreadas === 4);

  // Verificar navegación dentro de la grilla de variantes
  await page.focus('#var-talla-0');
  await pausa(200);

  // Flecha Derecha pasa de Talla a Color
  await page.keyboard.press('ArrowRight');
  await pausa(200);
  const idColor0 = await page.evaluate(() => document.activeElement?.id);
  ok('Flecha Derecha pasa de Talla a Color en fila 0', idColor0 === 'var-color-0', `Foco actual: ${idColor0}`);

  // Flecha Abajo baja a var-color-1
  await page.keyboard.press('ArrowDown');
  await pausa(200);
  const idColor1 = await page.evaluate(() => document.activeElement?.id);
  ok('Flecha Abajo baja a Color en fila 1', idColor1 === 'var-color-1', `Foco actual: ${idColor1}`);

  // Flecha Abajo hasta la última fila y luego a botón Agregar Manual
  await page.focus('#var-price-3');
  await pausa(200);
  await page.keyboard.press('ArrowDown');
  await pausa(200);
  const idBtnManual = await page.evaluate(() => document.activeElement?.id);
  ok('Flecha Abajo desde la última fila baja a btn-agregar-variante-manual', idBtnManual === 'btn-agregar-variante-manual', `Foco actual: ${idBtnManual}`);

  // Flecha Abajo desde Agregar Manual baja a Guardar Producto
  await page.keyboard.press('ArrowDown');
  await pausa(200);
  const idBtnGuardar = await page.evaluate(() => document.activeElement?.id);
  ok('Flecha Abajo desde Agregar Manual baja a btn-guardar-producto', idBtnGuardar === 'btn-guardar-producto', `Foco actual: ${idBtnGuardar}`);

  // Flecha Arriba desde Guardar Producto regresa a las variantes
  await page.keyboard.press('ArrowUp');
  await pausa(200);
  const idRetorno = await page.evaluate(() => document.activeElement?.id);
  ok('Flecha Arriba desde btn-guardar-producto regresa al bloque de variantes', idRetorno === 'btn-agregar-variante-manual' || idRetorno === 'var-price-3', `Foco actual: ${idRetorno}`);

} catch (err) {
  ok('Error en prueba de selector de variantes', false, err.message);
} finally {
  await nav.close();
  console.log('\n--- RESULTADOS PRUEBA SELECTOR VARIANTES ---');
  res.forEach(r => console.log(r));
  const fallos = res.filter(r => r.startsWith('❌'));
  if (fallos.length > 0) {
    console.error(`\n${fallos.length} prueba(s) fallaron.`);
    process.exit(1);
  } else {
    console.log('\nTodas las pruebas de navegación por teclado pasaron al 100%.');
    process.exit(0);
  }
}
