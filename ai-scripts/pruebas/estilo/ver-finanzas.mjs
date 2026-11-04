import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');
const DIR = process.argv[2];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 940 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || (document.activeElement?.tagName + (document.activeElement?.getAttribute('data-row') ? '-fila' : '')));
const tecla = async (k) => { await page.keyboard.press(k); await pausa(300); };
await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario');
await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
await page.keyboard.press('Enter'); await page.waitForSelector('#sidebar-btn-finanzas', { timeout: 20000 }); await pausa(1500);
await page.click('#sidebar-btn-finanzas'); await pausa(3500);
await page.evaluate(() => document.activeElement?.blur()); await pausa(300);
await page.screenshot({ path: `${DIR}/finanzas1.png` });
await page.evaluate(() => document.getElementById('buscador-finanzas')?.scrollIntoView({ block: 'start' })); await pausa(400);
await page.screenshot({ path: `${DIR}/finanzas2.png` });
const p = [];
const hay = await page.$('#buscador-finanzas');
if (hay) {
  await page.focus('#buscador-finanzas');
  for (let i = 0; i < 4; i++) { await tecla('ArrowRight'); p.push('→ ' + await foco()); }
  await tecla('ArrowDown'); p.push('↓ ' + await foco());
  await tecla('ArrowDown'); p.push('↓ ' + await foco());
  await tecla('ArrowUp'); p.push('↑ ' + await foco());
  await tecla('ArrowUp'); p.push('↑ ' + await foco());
  await page.focus('#buscador-finanzas'); await page.keyboard.type('zzqq', { delay: 30 }); await pausa(400);
  p.push('vacío: ' + (await page.$eval('.vacio-sobrio', (e) => e.innerText).catch(() => 'no')));
  p.push('pag sin filas: ' + !!(await page.$('#btn-pag-ant-mov-arriba')));
  await page.screenshot({ path: `${DIR}/finanzas-vacio.png` });
  await tecla('Escape'); p.push('Escape: "' + (await page.$eval('#buscador-finanzas', (i) => i.value)) + '"');
} else p.push('sin caja abierta');
console.log('ACTUAL:', p.join(' | '));
// Historial
const h = [];
await page.click('#btn-ver-historial'); await pausa(3000);
await page.evaluate(() => document.activeElement?.blur()); await pausa(300);
await page.screenshot({ path: `${DIR}/historial1.png` });
await page.focus('#buscador-historial-cajas');
for (let i = 0; i < 3; i++) { await tecla('ArrowRight'); h.push('→ ' + await foco()); }
await tecla('ArrowDown'); h.push('↓ ' + await foco());
await tecla('ArrowRight'); h.push('→ ' + await foco());
await tecla('ArrowDown'); h.push('↓ ' + await foco());
await tecla('ArrowUp'); h.push('↑ ' + await foco());
await tecla('ArrowUp'); h.push('↑ ' + await foco());
await page.focus('#buscador-historial-cajas'); await page.keyboard.type('2026', { delay: 30 }); await pausa(400);
h.push('MATCH: ' + (await page.$eval('.buscador-sobrio__conteo', (e) => e.innerText).catch(() => 'no')));
await tecla('Escape'); h.push('Escape: "' + (await page.$eval('#buscador-historial-cajas', (i) => i.value)) + '"');
console.log('HISTORIAL:', h.join(' | '), '\nerrores JS:', errores.length, errores.slice(0, 2));
await nav.close();
