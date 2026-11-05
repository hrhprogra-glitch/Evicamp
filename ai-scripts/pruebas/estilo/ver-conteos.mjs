import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');
const DIR = process.argv[2];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 940 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id);
const tecla = async (k) => { await page.keyboard.press(k); await pausa(250); };
await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario');
await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
await page.keyboard.press('Enter'); await page.waitForSelector('#sidebar-btn-conteos', { timeout: 20000 }); await pausa(1500);
await page.click('#sidebar-btn-conteos'); await pausa(2500);
await page.evaluate(() => document.activeElement?.blur()); await pausa(300);
await page.screenshot({ path: `${DIR}/conteos2.png` });
const p = [];
await page.focus('#btn-nuevo-ajuste'); await tecla('ArrowDown'); p.push('↓ desde Nuevo ajuste: ' + await foco());
for (let i = 0; i < 4; i++) { await tecla('ArrowRight'); p.push('→ ' + await foco()); }
await tecla('ArrowLeft'); p.push('← ' + await foco());
await tecla('ArrowUp'); p.push('↑ ' + await foco());
await page.focus('#buscador-global-conteos'); await page.keyboard.type('zz', { delay: 30 }); await pausa(300);
p.push('MATCH: ' + (await page.$eval('.buscador-sobrio__conteo', (e) => e.innerText).catch(() => 'no')));
await tecla('Escape'); p.push('Escape: "' + (await page.$eval('#buscador-global-conteos', (i) => i.value)) + '"');
console.log(p.join(' | '), '\nerrores JS:', errores.length, errores.slice(0, 2));
await nav.close();
