// ai-scripts/pruebas/prueba-modal-lateral.mjs
// Verifica que el modal de producto tenga la ventana principal fija en el centro
// y que la flechita lateral derecha despliegue el panel de opciones avanzadas sin mover el modal central.

import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const cwd = process.cwd();
const reqP = createRequire(path.resolve(cwd, 'package.json'));
let puppeteer;
try {
  puppeteer = reqP('puppeteer-core');
} catch {
  puppeteer = reqP('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core');
}
process.loadEnvFile(path.resolve(cwd, '.env.vps'));

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1440, height: 900 }
});

const page = await nav.newPage();

try {
  console.log('1. Abriendo siumax.duckdns.org...');
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 10000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await pausa(1000);

  console.log('2. Yendo a Inventario...');
  await page.click('#sidebar-btn-inventario');
  await page.waitForSelector('#btn-tab-productos', { timeout: 15000 });
  await pausa(800);

  console.log('3. Abriendo modal de Nuevo Producto...');
  await page.click('#btn-nuevo-producto');
  await page.waitForSelector('#btn-naturaleza-unidad', { timeout: 10000 });
  await page.click('#btn-naturaleza-unidad');
  await page.waitForSelector('#input-nombre-producto', { timeout: 10000 });
  await pausa(500);

  // Posición inicial del contenedor del modal central
  const modalBoxInicial = await page.evaluate(() => {
    const input = document.getElementById('input-nombre-producto');
    const container = input ? input.closest('.border-2.border-\\[var\\(--color-ink\\)\\]') : null;
    if (!container) return null;
    const r = container.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });

  ok('Modal central inicial encontrado', !!modalBoxInicial, JSON.stringify(modalBoxInicial));

  // Verificar etiqueta de PVP en Caja y su placeholder
  const inputPrecio = await page.evaluate(() => {
    const inp = document.getElementById('input-precio-producto');
    const label = inp?.closest('div')?.querySelector('label');
    return {
      existe: !!inp,
      placeholder: inp?.getAttribute('placeholder') || '',
      textoLabel: label?.innerText.trim() || ''
    };
  });
  ok('Etiqueta y campo de PVP (Precio en Caja) presentes', 
    inputPrecio.existe && inputPrecio.textoLabel.includes('PRECIO EN CAJA') && inputPrecio.textoLabel.includes('PVP'),
    JSON.stringify(inputPrecio)
  );

  // Verificar botón lateral
  const btnLateralExiste = await page.evaluate(() => {
    const btn = document.getElementById('btn-toggle-avanzado-lateral');
    return !!btn;
  });
  ok('Botón / Flechita lateral derecha visible en el modal', btnLateralExiste);

  // Tomar captura con panel cerrado
  const scratchDir = 'C:/Users/User/.gemini/antigravity-ide/brain/77d05cda-194d-4130-9efd-5320385d62f6/.tempmediaStorage';
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  await page.screenshot({ path: path.join(scratchDir, 'modal_cerrado.png') });

  console.log('4. Haciendo clic en la flechita lateral derecha para abrir panel de opciones avanzadas...');
  await page.click('#btn-toggle-avanzado-lateral');
  await pausa(500);

  // Verificar que apareció el panel lateral
  const panelDerechoVisible = await page.evaluate(() => {
    const p = document.getElementById('panel-opciones-avanzadas-derecho');
    return !!p;
  });
  ok('Panel lateral derecho de opciones avanzadas abierto', panelDerechoVisible);

  // Comprobar que la ventana principal NO se movió (posición X e Y idénticas)
  const modalBoxDespues = await page.evaluate(() => {
    const input = document.getElementById('input-nombre-producto');
    const container = input ? input.closest('.border-2.border-\\[var\\(--color-ink\\)\\]') : null;
    if (!container) return null;
    const r = container.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });

  const seMantuvoPosicion = modalBoxInicial && modalBoxDespues &&
    modalBoxInicial.x === modalBoxDespues.x &&
    modalBoxInicial.y === modalBoxDespues.y &&
    modalBoxInicial.width === modalBoxDespues.width;

  ok('Ventana principal se mantuvo en su posición exacta sin moverse', seMantuvoPosicion, 
    `Inicial: ${JSON.stringify(modalBoxInicial)} vs Después: ${JSON.stringify(modalBoxDespues)}`
  );

  // Verificar contenido del panel derecho
  const opcionesEnPanel = await page.evaluate(() => {
    return {
      marca: !!document.getElementById('input-marca-producto'),
      garantia: !!document.getElementById('input-meses-garantia-producto'),
      series: !!document.getElementById('input-controla-series-producto'),
      escalas: !!document.getElementById('escala-desde-0'),
      presentaciones: !!document.getElementById('pres-unidad-0'),
      variantes: !!document.getElementById('check-tiene-variantes'),
      combos: !!document.getElementById('btn-tipo-combo'),
      recetas: !!document.getElementById('btn-tipo-receta')
    };
  });
  ok('Panel derecho contiene Fases 3, 6, 1.3, 1.2, 7 y 8 completas', 
    opcionesEnPanel.marca && opcionesEnPanel.garantia && opcionesEnPanel.series && 
    opcionesEnPanel.escalas && opcionesEnPanel.presentaciones && opcionesEnPanel.variantes && 
    opcionesEnPanel.combos && opcionesEnPanel.recetas,
    JSON.stringify(opcionesEnPanel)
  );

  // Tomar captura con panel abierto
  await page.screenshot({ path: path.join(scratchDir, 'modal_panel_derecho_abierto.png') });

  console.log('5. Cerrando panel lateral...');
  await page.click('#btn-cerrar-panel-avanzado');
  await pausa(300);

  const panelCerrado = await page.evaluate(() => {
    return !document.getElementById('panel-opciones-avanzadas-derecho');
  });
  ok('Panel lateral se cierra correctamente', panelCerrado);

} catch (err) {
  ok('Ejecución de prueba', false, err.message);
  console.error(err);
} finally {
  await nav.close();
  console.log('\n--- RESULTADOS DE LA PRUEBA ---');
  res.forEach(r => console.log(r));
}
