import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');
const DIR = process.argv[2] || 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 940 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));

console.log('Navegando a siumax...');
await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario');
await page.type('#input-login-usuario', 'admin@siumax.com');
await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
await page.keyboard.press('Enter');
await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 });
await pausa(2000);

console.log('En Punto de Venta (POS)...');
await page.evaluate(() => document.activeElement?.blur());
await pausa(500);

await page.screenshot({ path: `${DIR}/pos_limpio.png` });
console.log('Captura guardada en', `${DIR}/pos_limpio.png`);
console.log('Errores JS detectados:', errores.length, errores.slice(0, 2));

await nav.close();
