// Revisa si las tablas tienen scroll horizontal (scrollWidth > clientWidth)
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const SITIO = 'https://nego.siumax.duckdns.org';
const CLAVE = process.env.SIUMAX_ADMIN_CLAVE;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sesiones = ['clientes', 'encargos', 'salidas', 'contratos', 'taller', 'inventario', 'conteos'];

(async () => {
  const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1080, height: 768 } });
  const page = await nav.newPage();
  try {
    await page.goto(SITIO, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#input-login-usuario');
    await page.focus('#input-login-usuario'); await page.keyboard.type('admin'); await page.keyboard.press('Enter');
    await page.focus('#input-login-password'); await page.keyboard.type(CLAVE); await page.keyboard.press('Enter');
    await page.waitForSelector('#sidebar-btn-clientes', { timeout: 25000 });
    await pausa(2000);

    for (const id of sesiones) {
      const btn = `#sidebar-btn-${id}`;
      if (!(await page.$(btn))) continue;
      await page.focus(btn); await page.keyboard.press('Enter'); await pausa(1500);

      const res = await page.evaluate(() => {
        const contenedores = Array.from(document.querySelectorAll('.overflow-x-auto, [class*="overflow-x-auto"]'));
        return contenedores.map(c => ({
          tag: c.tagName,
          id: c.id,
          clientWidth: c.clientWidth,
          scrollWidth: c.scrollWidth,
          tieneScrollHorizontal: c.scrollWidth > c.clientWidth,
          diferencia: c.scrollWidth - c.clientWidth,
          tablaAncho: c.querySelector('table, [class*="min-w"]')?.scrollWidth || 0
        }));
      });
      console.log(`=== ${id.toUpperCase()} ===`);
      for (const r of res) {
        if (r.tieneScrollHorizontal) {
          console.log(`  -> TIENE SCROLL HORIZONTAL: visible=${r.clientWidth}px, total=${r.scrollWidth}px (sobran ${r.diferencia}px)`);
        } else {
          console.log(`  -> OK cabe completo: visible=${r.clientWidth}px`);
        }
      }
    }
  } finally {
    await nav.close();
  }
})().catch(console.error);
