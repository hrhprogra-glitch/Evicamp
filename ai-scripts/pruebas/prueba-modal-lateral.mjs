// ai-scripts/pruebas/prueba-modal-lateral.mjs
// Verifica que el modal de producto tenga un ÚNICO botón de opciones avanzadas
// y que al pulsarlo, las opciones se desplieguen HACIA ABAJO dentro del modal.

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

  // Verificar que NO existan los botones extras eliminados
  const botonesExtras = await page.evaluate(() => {
    return {
      lateral: !!document.getElementById('btn-toggle-avanzado-lateral'),
      cabecera: !!document.getElementById('btn-header-toggle-avanzado'),
      footer: !!document.getElementById('btn-footer-toggle-avanzado')
    };
  });
  ok('Botones innecesarios eliminados (lateral, cabecera, footer)', 
    !botonesExtras.lateral && !botonesExtras.cabecera && !botonesExtras.footer, 
    JSON.stringify(botonesExtras)
  );

  // Verificar que existe el ÚNICO botón de opciones avanzadas
  const botonUnico = await page.evaluate(() => {
    const btn = document.getElementById('btn-toggle-opciones-avanzadas');
    return {
      existe: !!btn,
      texto: btn ? btn.innerText.trim() : ''
    };
  });
  ok('Existe un ÚNICO botón de opciones avanzadas bajo datos básicos', botonUnico.existe, botonUnico.texto);

  // Tomar captura con opciones avanzadas cerradas
  const scratchDir = 'C:/Users/User/.gemini/antigravity-ide/brain/77d05cda-194d-4130-9efd-5320385d62f6/.tempmediaStorage';
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  await page.screenshot({ path: path.join(scratchDir, 'modal_opciones_abajo_cerrado.png') });

  console.log('4. Haciendo clic en el botón único para desplegar opciones hacia abajo...');
  await page.click('#btn-toggle-opciones-avanzadas');
  await pausa(500);

  // Verificar que se desplegó hacia abajo dentro del modal
  const opcionesDesplegadas = await page.evaluate(() => {
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
  ok('Opciones avanzadas desplegadas hacia abajo (Fases 3, 6, 1.3, 1.2, 7 y 8 completas)', 
    opcionesDesplegadas.marca && opcionesDesplegadas.garantia && opcionesDesplegadas.series && 
    opcionesDesplegadas.escalas && opcionesDesplegadas.presentaciones && opcionesDesplegadas.variantes && 
    opcionesDesplegadas.combos && opcionesDesplegadas.recetas,
    JSON.stringify(opcionesDesplegadas)
  );

  // Hacer scroll hacia abajo en el formulario para capturar las opciones avanzadas
  await page.evaluate(() => {
    const input = document.getElementById('input-marca-producto');
    if (input) input.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await pausa(300);

  // Tomar captura con opciones avanzadas desplegadas
  await page.screenshot({ path: path.join(scratchDir, 'modal_opciones_abajo_abierto.png') });

  // Scroll más abajo hasta variantes / recetas
  await page.evaluate(() => {
    const btn = document.getElementById('btn-tipo-receta');
    if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await pausa(300);
  await page.screenshot({ path: path.join(scratchDir, 'modal_opciones_abajo_scrolled.png') });

  console.log('5. Haciendo clic nuevamente para ocultar opciones avanzadas...');
  await page.click('#btn-toggle-opciones-avanzadas');
  await pausa(400);

  const opcionesOcultas = await page.evaluate(() => {
    return !document.getElementById('input-marca-producto');
  });
  ok('Opciones avanzadas se ocultan correctamente al volver a hacer clic', opcionesOcultas);

} catch (err) {
  console.error('Error durante la prueba:', err);
  res.push(`❌ Excepción: ${err.message}`);
} finally {
  await nav.close();
  console.log('\n--- RESULTADOS DE LA PRUEBA ---');
  res.forEach((r) => console.log(r));
  const fallos = res.filter((r) => r.startsWith('❌')).length;
  process.exit(fallos > 0 ? 1 : 0);
}
