import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 940 } });
const page = await nav.newPage();
await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario');
await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
await page.keyboard.press('Enter'); await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(1500);
await page.click('#sidebar-btn-inventario'); await pausa(3000);
await page.screenshot({ path: process.argv[2] });
await nav.close(); console.log('ok');
