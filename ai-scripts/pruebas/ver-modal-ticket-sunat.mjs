import { createRequire } from 'node:module';
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
  await page.waitForSelector('#sidebar-btn-finanzas', { timeout: 20000 });
  await pausa(2000);

  // 1. Navegar a Finanzas
  await page.focus('#sidebar-btn-finanzas');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#btn-ver-historial', { timeout: 15000 });
  await pausa(1000);

  // 2. Cambiar a Historial de Cajas
  await page.focus('#btn-ver-historial');
  await page.keyboard.press('Enter');
  await page.waitForSelector('tr[id^="caja-row-"]', { timeout: 15000 });
  await pausa(1000);

  // 3. Abrir la primera caja
  const cajaRows = await page.$$eval('tr[id^="caja-row-"]', (els) => els.map((e) => e.id));
  if (cajaRows.length > 0) {
    await page.focus(`#${cajaRows[0]}`);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#modal-detalle-caja-container', { timeout: 10000 });
    await pausa(1500);

    // 4. Click en el ticket 308406 de la captura del usuario
    await page.click('#btn-ver-ticket-1793807308406');
    await page.waitForSelector('#modal-detalle-ticket-container', { timeout: 10000 });
    await pausa(1500);

    const modalTicket = await page.$('#modal-detalle-ticket-container .ventana-sobria');
    if (modalTicket) {
      await modalTicket.screenshot({
        path: 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4/ticket_sunat_sobrio.png'
      });
      console.log('Captura guardada en ticket_sunat_sobrio.png');
    }
  }
} catch (err) {
  console.error('Error durante la prueba:', err);
} finally {
  await nav.close();
}
