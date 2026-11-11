import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 }
});
const page = await nav.newPage();

try {
  await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 15000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-clientes', { timeout: 20000 });
  await pausa(2000);

  // Navegar a Clientes
  await page.focus('#sidebar-btn-clientes');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#btn-ver-grupos', { timeout: 15000 });
  await pausa(1000);

  // Abrir lista de grupos
  await page.focus('#btn-ver-grupos');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#buscar-elegir', { timeout: 10000 });
  await pausa(1000);

  // Seleccionar el primer grupo existente
  const grupos = await page.$$('div[id^="elegir-"]:not(#elegir-extra)');
  console.log('Grupos encontrados en lista:', grupos.length);
  if (grupos.length > 0) {
    await grupos[0].click();
    await page.waitForSelector('#titulo-grupo', { timeout: 10000 });
    await pausa(1500);

    // Tomar captura
    await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4/grupo_cifras_sobrio.png' });
    console.log('Captura guardada en grupo_cifras_sobrio.png');
  } else {
    console.log('No se encontraron grupos existentes');
  }
} catch (e) {
  console.error('Error:', e);
} finally {
  await nav.close();
}
