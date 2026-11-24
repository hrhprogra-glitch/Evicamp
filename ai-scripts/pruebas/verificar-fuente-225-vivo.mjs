// Pasada 226: verificar en vivo que el CSS de la 225 (datos de filas a 15 px) sigue desplegado.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools || 'D:/Programación/siumax/herramientas-pruebas', 'x.js'));
const puppeteer = require('puppeteer-core');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 },
});
const page = await nav.newPage();
try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('#input-login-usuario', { timeout: 30000 });
  await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-utilidades', { timeout: 30000 }); await pausa(1500);

  const css = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((e) => e.href).filter((h) => h.includes('/assets/')));
  await page.evaluate(() => document.getElementById('sidebar-btn-utilidades')?.click());
  await pausa(1200);
  const pestanas = await page.evaluate(() => [...document.querySelectorAll('[role="tab"], button[id^="btn-tab-"]')].map((e) => `${e.id || e.textContent?.trim()}`).slice(0, 12));
  const tabSalidas = await page.evaluate(() => {
    const b = [...document.querySelectorAll('[role="tab"], button')]
      .find((e) => /salidas/i.test(e.textContent || '') && (e.id || '').includes('tab'));
    if (b) { b.click(); return b.id || b.textContent?.trim(); }
    return '';
  });
  await pausa(1800);
  const real = await page.evaluate(() => {
    const datos = [...document.querySelectorAll('#tabla-analisis-salidas [data-row="true"] p, #tabla-analisis-salidas [data-row="true"] span.font-mono')]
      .filter((e) => e.getBoundingClientRect().width > 0).slice(0, 4).map((e) => getComputedStyle(e).fontSize);
    const cabeceras = [...document.querySelectorAll('#tabla-analisis-salidas .tabla-cabecera > div')]
      .slice(0, 4).map((e) => getComputedStyle(e).fontSize);
    return { datos, cabeceras, filas: document.querySelectorAll('#tabla-analisis-salidas [data-row="true"]').length };
  });

  // Prueba sintética de la regla CSS desplegada, por si no hay filas en la BD de pruebas.
  const sintetico = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const fila = document.createElement('div');
    fila.setAttribute('data-row', 'true');
    const dato = document.createElement('p');
    dato.className = 'text-xs';
    dato.textContent = 'Medida 225';
    fila.appendChild(dato);
    main.appendChild(fila);
    const px = getComputedStyle(dato).fontSize;
    fila.remove();
    return px;
  });
  console.log(JSON.stringify({ css, pestanas, tabSalidas, real, sintetico }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ error: String(e?.message || e) }));
} finally {
  await nav.close();
}
