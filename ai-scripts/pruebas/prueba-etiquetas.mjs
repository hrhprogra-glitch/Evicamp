// Prueba de la fase 2.5 (siumax), solo con teclado: ícono de etiqueta en la fila del producto, ventana con tipo,
// cantidad y papel, vista previa con código de barras, imprimir, y que la Caja encuentre el producto al escanear.
// Uso: node prueba-etiquetas.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
// La ventana de impresión del navegador no se puede usar en la prueba: se cuenta
await page.evaluateOnNewDocument(() => {
  if (window.top !== window) return; // solo la ventana principal (no el marco que arma la impresión)
  localStorage.removeItem('siumax_etiqueta_tipo'); localStorage.removeItem('siumax_etiqueta_papel');
  window.__impresiones = 0;
  new MutationObserver(() => document.querySelectorAll('iframe').forEach((f) => { try { if (f.contentWindow && !f.contentWindow.__contado) { f.contentWindow.__contado = 1; f.contentWindow.print = () => { window.__impresiones++; }; } } catch {} }))
    .observe(document, { childList: true, subtree: true });
});
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-accion') || document.activeElement?.getAttribute('data-row') || document.activeElement?.tagName);
const tecla = async (k) => { await page.keyboard.press(k); await pausa(200); };
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(3000);
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-tab-productos'); await pausa(2000);
  await page.focus('#btn-tab-productos'); await tecla('Enter'); await page.waitForSelector('#buscador-global-inventario');
  await page.focus('#buscador-global-inventario'); await page.keyboard.type('DEMO ARROZ 1KG'); await pausa(1000);
  await page.evaluate(() => [...document.querySelectorAll('[data-row="true"]')].find((f) => f.offsetParent && f.innerText.includes('DEMO ARROZ 1KG'))?.focus());
  await tecla('ArrowRight'); await tecla('ArrowRight');
  ok('→ → desde la fila llega al ícono de etiqueta (después del reloj)', (await foco()) === 'etiqueta', await foco());
  await tecla('Enter'); await pausa(700);
  ok('Enter abre "Imprimir etiquetas" con el selector en el tipo', (await foco()) === 'etiqueta-tipo-PRECIO', await foco());
  const previa = await page.evaluate(() => { const v = document.getElementById('vista-previa-etiqueta'); return { texto: v?.innerText || '', barras: v?.querySelectorAll('svg rect').length || 0 }; });
  ok('Vista previa del precio: nombre, S/ 4.50 y código de barras dibujado', /DEMO ARROZ 1KG/.test(previa.texto) && /S\/ 4\.50/.test(previa.texto) && previa.barras > 10 && /DEMO-CMP-1/.test(previa.texto), JSON.stringify(previa).slice(0, 120));
  await tecla('ArrowRight'); await tecla('Enter'); await pausa(300);
  ok('→ y Enter eligen "Sticker para el producto"', await page.$eval('#etiqueta-tipo-STICKER', (b) => b.getAttribute('aria-selected') === 'true'));
  await tecla('ArrowDown');
  ok('↓ pasa a "Cuántas"', (await foco()) === 'etiqueta-cantidad', await foco());
  await page.keyboard.type('3'); await tecla('Enter');
  ok('Enter en "Cuántas" pasa al papel', (await foco()) === 'etiqueta-papel-80', await foco());
  await tecla('ArrowRight'); await tecla('Enter'); await pausa(300);
  ok('→ y Enter eligen "Ticketera 58 mm"', await page.$eval('#etiqueta-papel-58', (b) => b.getAttribute('aria-selected') === 'true'));
  await tecla('ArrowDown');
  ok('↓ llega a "Imprimir 3 etiquetas"', (await foco()) === 'btn-imprimir-etiqueta' && /Imprimir 3 etiquetas/i.test(await page.$eval('#btn-imprimir-etiqueta', (b) => b.innerText)), await foco());
  const area = await page.evaluate(() => { const a = document.getElementById('area-impresion-etiquetas'); return { n: a?.querySelectorAll('[data-etiqueta]').length, ancho: a?.style.width }; });
  ok('Lo que se imprime: 3 stickers de 48 mm', area.n === 3 && area.ancho === '48mm', JSON.stringify(area));
  await tecla('Enter'); await pausa(2500);
  console.log('IMPRESIONES', await page.evaluate(() => window.__impresiones), 'DIALOGOS', await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map((d) => d.getAttribute('aria-label') + ':' + (d.innerText || '').slice(0, 40).replace(/s+/g, ' '))), 'JUNTO', await page.evaluate(() => document.getElementById('btn-imprimir-etiqueta')?.parentElement?.innerText));
  ok('Imprimir manda a imprimir y lo avisa', /Enviado a imprimir: 3 etiqueta/i.test(await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '')));
  await tecla('Escape'); await pausa(800);
  ok('Esc cierra y el selector vuelve al ícono de etiqueta de esa fila', (await foco()) === 'etiqueta', await foco());
  // Se recuerda lo elegido en esta PC
  await tecla('Enter'); await pausa(600);
  ok('Al volver a abrir recuerda Sticker y 58 mm', (await foco()) === 'etiqueta-tipo-STICKER' && await page.$eval('#etiqueta-papel-58', (b) => b.getAttribute('aria-selected') === 'true'), await foco());
  await tecla('Escape'); await pausa(500);

  // Caja: escanear el código del sticker agrega ESE producto (el exacto primero)
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await page.waitForSelector('#buscador-global-pos'); await pausa(1500);
  await page.focus('#buscador-global-pos'); await page.keyboard.type('DEMO-CMP-1'); await pausa(500);
  const primero = await page.evaluate(() => document.getElementById('producto-pos-0')?.innerText.replace(/\s+/g, ' ') || '');
  ok('Caja: al escanear DEMO-CMP-1 el primero es DEMO ARROZ 1KG (código exacto)', /DEMO ARROZ 1KG/.test(primero), primero.slice(0, 80));
  await page.evaluate(() => { const i = document.getElementById('buscador-global-pos'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  console.log(res.join('\n'));
}
