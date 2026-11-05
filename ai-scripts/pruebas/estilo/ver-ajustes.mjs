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
await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 });
await pausa(1500);

console.log('Entrando a Ajustes...');
await page.click('#sidebar-btn-configuracion');
await pausa(2000);

const p = [];

// 1. Probar cambio a pestaña Usuarios
await page.click('#btn-tab-usuarios');
await pausa(1500);
p.push('Pestaña activa: Usuarios');

// 2. Foco en buscador de usuarios
await page.focus('#buscador-usuarios-ajustes');
p.push('Foco buscador: ' + await foco());

// 3. Recorrer filtros a la derecha
await tecla('ArrowRight');
p.push('→ ' + await foco());
await tecla('ArrowRight');
p.push('→ ' + await foco());

// 4. Regresar a la izquierda
await tecla('ArrowLeft');
p.push('← ' + await foco());
await tecla('ArrowLeft');
p.push('← ' + await foco());

// 5. Bajar a primera fila
await tecla('ArrowDown');
p.push('↓ a fila: ' + await page.evaluate(() => {
  const el = document.activeElement;
  return el?.getAttribute('data-user-id') ? `usuario id=${el.getAttribute('data-user-id')}` : el?.id || el?.tagName;
}));

// 6. Búsqueda y conteo de MATCH
await page.focus('#buscador-usuarios-ajustes');
await page.keyboard.type('a', { delay: 30 });
await pausa(300);
const matchTxt = await page.$eval('.buscador-sobrio__conteo', (e) => e.innerText).catch(() => 'no');
p.push('MATCH con "a": ' + matchTxt);

// 7. Borrar con Escape
await tecla('Escape');
const valorDespuesEscape = await page.$eval('#buscador-usuarios-ajustes', (i) => i.value);
p.push('Escape limpia buscador: "' + valorDespuesEscape + '"');

// Captura de pantalla de Usuarios
await page.evaluate(() => document.activeElement?.blur());
await pausa(300);
await page.screenshot({ path: `${DIR}/ajustes_sobrio.png` });
console.log('Captura guardada en', `${DIR}/ajustes_sobrio.png`);

console.log(p.join(' | '));
console.log('Errores JS detectados:', errores.length, errores.slice(0, 2));

await nav.close();
