// Revisión del 12/11/2026: ¿se ve el botón del escáner por cámara en el celular? Abre el sitio de pruebas con tamaño
// de celular (390 × 844, táctil) y mira el botón [📷] en Caja e Inventario. También a 1366 (PC: no debe verse).
// Uso: node ai-scripts/pruebas/revisar-escaner-celular.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const salida = [];
for (const vp of [{ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, { width: 1366, height: 860 }]) {
  const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: vp });
  const page = await nav.newPage();
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await pausa(800);
  // (en modo celular el campo de usuario se vaciaba al escribir con el teclado simulado: se llena como lo haría React)
  await page.evaluate((u, c) => {
    const poner = (id, v) => { const el = document.getElementById(id); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    poner('input-login-usuario', u); poner('input-login-password', c);
  }, 'admin@siumax.com', process.env.SIUMAX_ADMIN_CLAVE);
  await pausa(300);
  await page.evaluate(() => (document.querySelector('form'))?.requestSubmit?.() ?? document.querySelector('button[type=submit]')?.click());
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }).catch(() => salida.push(vp.width + ' NO ENTRÓ AL SISTEMA'));
  await pausa(3000);
  const mirar = async (donde) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.solo-celular-escaner, [class*="camara"]')].map((b) => {
      const cs = getComputedStyle(b); const rc = b.getBoundingClientRect();
      return `${b.id || b.className.slice(0, 40)} display=${cs.display} ${Math.round(rc.width)}x${Math.round(rc.height)}`;
    }));
    salida.push(`${vp.width} ${donde}: ${r.length ? r.join(' | ') : 'NINGÚN botón de cámara en la página'}`);
  };
  await mirar('Caja');
  await page.screenshot({ path: path.join(aqui, `captura-escaner-${vp.width}-caja.png`) });
  await page.evaluate(() => localStorage.setItem('evicamp_last_view', 'inventario'));
  await page.evaluate(() => document.getElementById('sidebar-btn-inventario')?.click()); await pausa(2500);
  await mirar('Inventario');
  await page.screenshot({ path: path.join(aqui, `captura-escaner-${vp.width}-inventario.png`) });
  salida.push(`${vp.width} versión servida: ${await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean).join(' '))}`);
  await nav.close();
}
console.log(salida.join('\n'));
