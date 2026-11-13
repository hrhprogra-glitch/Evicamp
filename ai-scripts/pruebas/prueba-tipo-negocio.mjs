// Prueba del 12/11/2026 (SiuMax Nego, fase 2), SOLO CON TECLADO: Ajustes → Tipo de negocio. Los 7 tipos con lo que
// incluyen, marcar/desmarcar con Enter (el selector se queda), "Próximamente" no se marca, Guardar y que quede guardado.
// Uso: node ai-scripts/pruebas/prueba-tipo-negocio.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(200); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const cerrarAviso = async () => { if (await aviso()) { await tecla('Enter'); await pausa(400); } };
const abrir = async () => {
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
  await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
};

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);
  await abrir();
  ok('Ajustes tiene la pestaña "Tipo de negocio"', !!(await page.$('#tipo-negocio-comercio')));
  const n = await page.$$eval('[id^="tipo-negocio-"][role="checkbox"]', (x) => x.length);
  ok('Muestra los 7 tipos', n === 7, n);
  const texto = await page.$eval('#tipo-negocio-comercio', (b) => b.innerText.toUpperCase());
  ok('Cada tipo explica qué negocios incluye (Comercio: bodega, ferretería…)', /INCLUYE/.test(texto) && /BODEGA/.test(texto) && /FERRETER/.test(texto));
  ok('Comercio sale "Disponible" y elegido por defecto', /DISPONIBLE/.test(texto) && (await marcado('comercio')) === 'true');
  const prox = await page.$eval('#tipo-negocio-restaurantes', (b) => b.innerText.toUpperCase());
  ok('Restaurantes sale "Próximamente"', /PRÓXIMAMENTE/.test(prox));

  await tecla('ArrowDown'); ok('↓ desde la pestaña baja al primer tipo (Comercio)', (await foco()) === 'tipo-negocio-comercio', await foco());
  await tecla('ArrowDown'); ok('↓ pasa a Restaurantes', (await foco()) === 'tipo-negocio-restaurantes', await foco());
  await tecla('Enter'); await pausa(300);
  ok('Enter en un tipo "Próximamente" avisa y no lo marca', /todavía no está disponible/i.test(await aviso()) && (await marcado('restaurantes')) === 'false', await aviso());
  await cerrarAviso();
  await page.focus('#tipo-negocio-comercio'); await tecla('Enter'); await pausa(300);
  ok('No deja quitar el único tipo elegido', /al menos un tipo/i.test(await aviso()) && (await marcado('comercio')) === 'true', await aviso());
  await cerrarAviso();
  await page.focus('#tipo-negocio-comercio');
  await tecla('ArrowUp'); ok('↑ desde el primer tipo sube a la pestaña', (await foco()) === 'btn-tab-tipo_negocio', await foco());
  await page.focus('#tipo-negocio-hospedaje'); await tecla('ArrowDown');
  ok('↓ desde el último tipo va a Guardar', (await foco()) === 'btn-guardar-tipo-negocio', await foco());
  await tecla('Enter'); await pausa(1500);
  ok('Guardar avisa que quedó guardado', /guardado: Comercio/i.test(await aviso()), await aviso());
  await cerrarAviso();
  ok("Después del aviso el selector se queda en Guardar", (await foco()) === "btn-guardar-tipo-negocio", await foco());
  await page.screenshot({ path: path.join(aqui, 'captura-tipo-negocio.png') });
  await page.reload({ waitUntil: 'networkidle2' }); await pausa(2500);
  await abrir();
  ok('Después de recargar sigue elegido Comercio', (await marcado('comercio')) === 'true');
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  console.log(res.join('\n'));
  await nav.close();
}
