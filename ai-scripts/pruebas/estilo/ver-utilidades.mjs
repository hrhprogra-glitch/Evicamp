import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');
const DIR = process.argv[2] || 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 940 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k) => { await page.keyboard.press(k); await pausa(250); };

console.log('Navegando a siumax...');
await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario');
await page.type('#input-login-usuario', 'admin@siumax.com');
await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
await page.keyboard.press('Enter');
await page.waitForSelector('#sidebar-btn-utilidades', { timeout: 20000 });
await pausa(1500);

console.log('Entrando a Utilidades...');
await page.click('#sidebar-btn-utilidades');
await pausa(2500);
await page.evaluate(() => document.activeElement?.blur());
await pausa(300);

await page.screenshot({ path: `${DIR}/utilidades_sobrio.png` });
console.log('Captura guardada en', `${DIR}/utilidades_sobrio.png`);

const p = [];
// 1. Probar foco en botón cabecera
await page.focus('#btn-tops-utilidades');
p.push('Inicio en cabecera: ' + await foco());

// 2. Bajar al buscador
await tecla('ArrowDown');
p.push('↓ desde cabecera: ' + await foco());

// 3. Recorrer filtros a la derecha
await tecla('ArrowRight'); p.push('→ ' + await foco());
await tecla('ArrowRight'); p.push('→ ' + await foco());
await tecla('ArrowRight'); p.push('→ ' + await foco());
await tecla('ArrowRight'); p.push('→ ' + await foco());
await tecla('ArrowRight'); p.push('→ ' + await foco());

// 4. Regresar a la izquierda
await tecla('ArrowLeft'); p.push('← ' + await foco());

// 5. Bajar a paginación superior
await tecla('ArrowDown'); p.push('↓ a paginación: ' + await foco());

// 6. Bajar a primera fila
await tecla('ArrowDown'); p.push('↓ a primera fila: ' + await page.evaluate(() => {
  const el = document.activeElement;
  return el?.getAttribute('data-prod-id') ? `fila prod-${el.getAttribute('data-prod-id')}` : el?.id || el?.tagName;
}));

// 7. Subir a paginación superior
await tecla('ArrowUp'); p.push('↑ vuelve a: ' + await foco());

// 8. Búsqueda y conteo de MATCH
await page.focus('#buscador-global-utilidades');
await page.keyboard.type('a', { delay: 30 });
await pausa(300);
const matchTxt = await page.$eval('.buscador-sobrio__conteo', (e) => e.innerText).catch(() => 'no');
p.push('MATCH con "a": ' + matchTxt);

// 9. Borrar con Escape
await tecla('Escape');
const valorDespuesEscape = await page.$eval('#buscador-global-utilidades', (i) => i.value);
p.push('Escape limpia buscador: "' + valorDespuesEscape + '"');

console.log(p.join(' | '));
console.log('Errores JS detectados:', errores.length, errores.slice(0, 2));

await nav.close();
