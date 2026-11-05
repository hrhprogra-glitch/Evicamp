import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1400, height: 860 }
});

const page = await nav.newPage();
await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario');
await page.type('#input-login-usuario', 'admin@siumax.com');
await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
await page.keyboard.press('Enter');

await page.waitForSelector('#sidebar-btn-clientes', { timeout: 20000 });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => sessionStorage.removeItem('clientes_pestana'));
await page.click('#sidebar-btn-clientes');
await page.waitForSelector('#btn-ver-grupos', { timeout: 10000 });
await new Promise(r => setTimeout(r, 1000));

const screenshotPath = 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4/clientes_cabecera_sobria.png';
await page.screenshot({ path: screenshotPath });
await nav.close();
console.log('Captura guardada en', screenshotPath);
