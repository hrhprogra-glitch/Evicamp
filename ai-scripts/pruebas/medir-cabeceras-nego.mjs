// Mide si la cabecera de cada sección (título, pestañas y botones) entra en UNA fila, a 1920 y 1366 de ancho, con el
// negocio en "Comercio + Servicios" (el caso con más pestañas). Al final deja el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/medir-cabeceras-nego.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { tipoInicial, restaurarTipo, tipoActual } from './lib-tipo-negocio.mjs';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const tiposAntes = await tipoInicial(); // 17/11: devolver la elección del dueño al terminar
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 950 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k) => { await page.keyboard.press(k); await pausa(200); };
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
const elegir = async (tipos) => {
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
  await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
  for (const t of ['servicios', 'comercio']) if (tipos.includes(t) && (await marcado(t)) !== 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  for (const t of ['comercio', 'servicios']) if (!tipos.includes(t) && (await marcado(t)) === 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  await page.focus('#btn-guardar-tipo-negocio'); await tecla('Enter'); await pausa(1500); if (await aviso()) await tecla('Enter');
};
// Filas de la cabecera: los botones visibles del primer bloque con borde de abajo dentro de <main>
const filasCabecera = () => page.evaluate(() => {
  const main = document.querySelector('main') || document.body;
  const cab = [...main.querySelectorAll('div')].find((d) => /border-b-2/.test(d.className) && d.querySelector('h1'));
  if (!cab) return { filas: -1, txt: 'sin cabecera' };
  const bots = [...cab.querySelectorAll('button, h1')].filter((b) => b.getClientRects().length && b.offsetParent !== null);
  // Una fila nueva empieza cuando un elemento queda entero debajo de otro (no por pequeñas diferencias de alto)
  const cajas = bots.map((b) => b.getBoundingClientRect()).sort((x, y) => x.top - y.top);
  let filas = cajas.length ? 1 : 0; let fondo = cajas[0]?.bottom ?? 0;
  for (const c of cajas.slice(1)) { if (c.top >= fondo - 2) { filas++; } fondo = Math.max(fondo, c.bottom); }
  const centros = { length: filas };
  return { filas: centros.length, txt: bots.map((b) => b.innerText.trim().split('\n')[0]).join(' | ').slice(0, 160) };
});

const salida = [];
try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);
  await elegir(['comercio', 'servicios']);
  const secciones = await page.$$eval('#evicamp-sidebar [id^="sidebar-btn-"]', (b) => b.map((x) => x.id.replace('sidebar-btn-', '')));
  for (const ancho of [1920, 1366]) {
    await page.setViewport({ width: ancho, height: ancho === 1920 ? 950 : 768 });
    for (const sec of secciones) {
      await page.evaluate((s) => document.getElementById(`sidebar-btn-${s}`)?.click(), sec); await pausa(1800);
      if (await page.evaluate(() => !!document.querySelector('[id^="pronto-"]'))) continue; // todavía "Pronto"
      const pestanas = await page.$$eval('main [role="tab"], main .pestanas-sobrias > button', (b) => b.map((x) => x.id).filter(Boolean));
      const lista = [null, ...pestanas.slice(0, 6)];
      for (const tab of lista) {
        if (tab) { await page.evaluate((t) => document.getElementById(t)?.click(), tab); await pausa(1000); }
        const r = await filasCabecera();
        salida.push(`${r.filas === 1 ? 'OK ' : 'MAL'} ${ancho} ${sec}${tab ? ' › ' + tab : ''}: ${r.filas} fila(s) — ${r.txt}`);
      }
    }
  }
} catch (e) { salida.push('FALLA ' + e.message); }
try { await page.setViewport({ width: 1920, height: 950 }); await restaurarTipo(tiposAntes); const tf = await tipoActual(); salida.push(`${tf === tiposAntes ? 'OK ' : 'MAL'} Tipo de negocio restaurado a como estaba — ${tf}`); } catch { /* */ }
salida.push(`errores de página: ${errores.length}`);
console.log(salida.join('\n'));
await nav.close();
