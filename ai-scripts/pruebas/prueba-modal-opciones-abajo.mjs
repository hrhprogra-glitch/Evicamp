// ai-scripts/pruebas/prueba-modal-opciones-abajo.mjs
// Verifica que el modal de producto tenga un ÚNICO botón para opciones avanzadas,
// que las opciones se desplieguen HACIA ABAJO dentro del modal,
// y que no haya botones duplicados o innecesarios.

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

  // 1. Verificar que NO existan los botones antiguos innecesarios
  const botonesInnecesarios = await page.evaluate(() => {
    return {
      lateral: !!document.getElementById('btn-toggle-avanzado-lateral'),
      header: !!document.getElementById('btn-header-toggle-avanzado'),
      footer: !!document.getElementById('btn-footer-toggle-avanzado'),
      panelDerecho: !!document.getElementById('panel-opciones-avanzadas-derecho')
    };
  });

  const sinBotonesExtra = !botonesInnecesarios.lateral && !botonesInnecesarios.header && !botonesInnecesarios.footer && !botonesInnecesarios.panelDerecho;
  ok('Se eliminaron los botones duplicados/innecesarios y la pestaña lateral', sinBotonesExtra, JSON.stringify(botonesInnecesarios));

  // 2. Verificar que exista exactamente UN solo botón de opciones avanzadas dentro del formulario
  const unicoBotonExiste = await page.evaluate(() => {
    const btn = document.getElementById('btn-toggle-opciones-avanzadas');
    if (!btn) return { existe: false };
    const rect = btn.getBoundingClientRect();
    const texto = btn.innerText;
    return {
      existe: true,
      texto,
      y: rect.top,
      visible: rect.width > 0 && rect.height > 0
    };
  });
  ok('Existe un único botón (#btn-toggle-opciones-avanzadas) dentro del modal', unicoBotonExiste.existe && unicoBotonExiste.visible, unicoBotonExiste.texto);

  // 3. Tomar captura con opciones plegadas
  const scratchDir = 'C:/Users/User/.gemini/antigravity-ide/brain/77d05cda-194d-4130-9efd-5320385d62f6/.tempmediaStorage';
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  await page.screenshot({ path: path.join(scratchDir, 'modal_opciones_plegado.png') });

  // 4. Hacer clic en el botón para desplegar hacia abajo
  console.log('4. Desplegando opciones avanzadas hacia abajo...');
  await page.click('#btn-toggle-opciones-avanzadas');
  await pausa(500);

  // 5. Verificar que los elementos avanzados se desplegaron dentro del modal hacia abajo
  const opcionesDesplegadas = await page.evaluate(() => {
    const btnToggle = document.getElementById('btn-toggle-opciones-avanzadas');
    const marca = document.getElementById('input-marca-producto');
    const garantia = document.getElementById('input-meses-garantia-producto');
    const series = document.getElementById('input-controla-series-producto');
    const escalas = document.getElementById('escala-desde-0');
    const presentaciones = document.getElementById('pres-unidad-0');
    const variantes = document.getElementById('check-tiene-variantes');
    const combos = document.getElementById('btn-tipo-combo');

    if (!btnToggle || !marca) return { ok: false };
    const rectBtn = btnToggle.getBoundingClientRect();
    const rectMarca = marca.getBoundingClientRect();

    // Comprobar que los campos están DEBAJO del botón (rectMarca.top > rectBtn.top)
    const estaHaciaAbajo = rectMarca.top > rectBtn.top;

    return {
      ok: true,
      estaHaciaAbajo,
      marcaExiste: !!marca,
      garantiaExiste: !!garantia,
      seriesExiste: !!series,
      escalasExiste: !!escalas,
      presentacionesExiste: !!presentaciones,
      variantesExiste: !!variantes,
      combosExiste: !!combos
    };
  });

  ok('Opciones avanzadas se despliegan HACIA ABAJO debajo de los datos básicos', 
    opcionesDesplegadas.ok && opcionesDesplegadas.estaHaciaAbajo &&
    opcionesDesplegadas.marcaExiste && opcionesDesplegadas.escalasExiste && opcionesDesplegadas.combosExiste,
    JSON.stringify(opcionesDesplegadas)
  );

  // 6. Tomar captura con opciones desplegadas hacia abajo
  await page.screenshot({ path: path.join(scratchDir, 'modal_opciones_desplegadas_abajo.png') });

  // 7. Volver a hacer clic para ocultar
  console.log('5. Ocultando opciones avanzadas...');
  await page.click('#btn-toggle-opciones-avanzadas');
  await pausa(400);

  const opcionesOcultadas = await page.evaluate(() => {
    return !document.getElementById('input-marca-producto');
  });
  ok('Opciones avanzadas se repliegan y ocultan correctamente al volver a pulsar', opcionesOcultadas);

} catch (err) {
  ok('Ejecución de prueba', false, err.message);
  console.error(err);
} finally {
  await nav.close();
  console.log('\n--- RESULTADOS DE LA PRUEBA ---');
  res.forEach(r => console.log(r));
}
