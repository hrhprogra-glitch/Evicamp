// Prueba (14/11/2026, dueño: "que se parezca al de la caja en ver una imagen referencial o ver bien las letras"):
// en Nueva salida, la lista de materiales y la tabla de agregados muestran la foto del producto. Teclado: ↓ elige en la
// lista, Enter elige, Enter en la cantidad agrega y el selector se queda. No guarda la salida.
// Uso: node ai-scripts/pruebas/prueba-salida-fotos.mjs <carpeta tools con puppeteer-core> [carpeta para la captura]
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools, capturas] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);
  ok('La sección Salidas está (tipo servicios)', !!(await page.$('#sidebar-btn-salidas')));
  await page.evaluate(() => document.getElementById('sidebar-btn-salidas')?.click()); await pausa(2500);
  await page.focus('#btn-nueva-salida'); await page.keyboard.press('Enter'); await pausa(3000);

  await page.focus('#input-buscar-producto-salida'); await page.keyboard.type('coca'); await pausa(1500);
  const sug = await page.$$eval('[id^="sugerencia-salida-"]', (x) => x.map((d) => ({ img: !!d.querySelector('img[src^="data:"], img[src^="http"]'), txt: d.innerText.split('\n')[0] })));
  ok('Salen sugerencias al escribir', sug.length > 0, sug.map((s) => s.txt).join(' / '));
  ok('La sugerencia con foto muestra la imagen', sug.some((s) => s.img), `${sug.filter((s) => s.img).length} con foto`);
  const tam = await page.$eval('#sugerencia-salida-0 p', (p) => getComputedStyle(p).fontSize);
  ok('Nombre en letra grande (14px o más)', parseFloat(tam) >= 14, tam);
  if (capturas) await page.screenshot({ path: path.join(capturas, 'salida-lista-fotos.png') });

  // Elegir con ↓ el primero que tiene foto
  const conFoto = Math.max(0, sug.findIndex((x) => x.img));
  for (let i = 0; i < conFoto; i++) { await page.keyboard.press('ArrowDown'); await pausa(300); }
  ok('↓ con la lista abierta se queda en el buscador', (await foco()) === 'input-buscar-producto-salida', await foco());
  await page.keyboard.press('Enter'); await pausa(500);
  ok('Enter elige el producto (sale "Seleccionado" con foto)', await page.evaluate(() => /Seleccionado/.test(document.body.innerText)));
  await page.focus('#input-cant-item-salida'); await page.keyboard.press('Enter'); await pausa(600);
  const filas = await page.$$eval('table[data-tabla-campos] tbody tr', (x) => x.map((tr) => !!tr.querySelector('img')));
  ok('Enter en la cantidad agrega el material', filas.length === 1, `${filas.length} filas`);
  ok('La tabla de materiales muestra la foto', filas[0] === true);
  ok('Enter en la cantidad: el selector se queda (regla 7)', (await foco()) === 'input-cant-item-salida', await foco());
  const fUp = await (async () => { await page.focus('#input-buscar-producto-salida'); await page.keyboard.press('ArrowUp'); await pausa(300); return foco(); })();
  ok('↑ desde el buscador (sin lista) sube', fUp !== 'input-buscar-producto-salida' && fUp !== 'BODY', fUp);
  if (capturas) { await page.screenshot({ path: path.join(capturas, 'salida-tabla-fotos.png') }); }
  await page.keyboard.press('Escape'); await pausa(400); await page.keyboard.press('Escape'); await pausa(400);
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  await nav.close();
  console.log(res.join('\n'));
}
