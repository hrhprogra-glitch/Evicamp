// Prueba (siumax), SOLO CON TECLADO: en la línea de la Caja, el botón "x6+" apaga y prende el precio por cantidad.
// → desde el precio llega al botón; Enter lo apaga (cobra el precio normal aunque pase la cantidad) y lo vuelve a prender.
// Un producto sin precios por cantidad no tiene el botón (→ desde el precio va a borrar).
// Uso: node prueba-escala-off.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const m = Date.now();
const E = 990000 + (m % 9000), N = E + 1;
await sql(`insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced, precios_cantidad) values
  (${E}, 'PRUEBA ESCALA ${m}', 'GENERAL', 'ESC${m}', 6, 100, 1, 'UND', 1, 1, '[{"desde":6,"precio":5.5}]'),
  (${N}, 'PRUEBA SIN ESCALA ${m}', 'GENERAL', 'NES${m}', 3, 100, 1, 'UND', 1, 1, null);
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced, created_at) values
  (${m}, ${E}, 100, 100, 100, 1, 'ESC-A', 1, 1, now()), (${m + 1}, ${N}, 100, 100, 100, 1, 'NES-A', 1, 1, now());`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const page = await nav.newPage(); const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(250); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const linea = (i = 0) => page.evaluate((i) => ({
  precio: document.getElementById(`edit-price-${i}`)?.value,
  boton: document.getElementById(`btn-escala-${i}`)?.innerText.replace(/\s+/g, ' ').trim() ?? null,
  apagado: document.getElementById(`btn-escala-${i}`)?.getAttribute('data-sin-escala') === 'true',
  total: document.body.innerText.match(/TOTAL A COBRAR\s*S\/\s*([\d.]+)/i)?.[1],
}), i);
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2500);
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await page.waitForSelector('#buscador-global-pos'); await pausa(1500);
  const escanear = async (c) => { await page.focus('#buscador-global-pos'); await page.keyboard.type(c); await pausa(500); await tecla('Enter'); await pausa(800); };
  const cantidad = async (n) => { await page.focus('#edit-input-0'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(String(n)); await tecla('Enter'); await pausa(600); };
  const alFinalDelPrecio = async () => { await page.focus('#edit-price-0'); await page.evaluate(() => { const i = document.getElementById('edit-price-0'); i.setSelectionRange(i.value.length, i.value.length); }); };

  await escanear(`ESC${m}`);
  let l = await linea();
  ok('1 unidad: precio S/ 6.00 y el botón "x6+" (todavía no llega)', l.precio === '6.00' && l.boton === 'x6+' && !l.apagado, JSON.stringify(l));
  await cantidad(6); l = await linea();
  ok('6 unidades: S/ 5.50 y el botón dice "x6+ ✓"', l.precio === '5.50' && l.boton === 'x6+ ✓', JSON.stringify(l));
  await alFinalDelPrecio(); await tecla('ArrowRight');
  ok('→ al final del precio llega al botón "x6+ ✓"', (await foco()) === 'btn-escala-0', await foco());
  await tecla('Enter'); await pausa(300); l = await linea();
  ok('Enter lo APAGA: vuelve a S/ 6.00, el botón dice "x6+ NO" y el total es 36.00', l.precio === '6.00' && l.apagado && /NO$/.test(l.boton) && l.total === '36.00', JSON.stringify(l));
  ok('El selector sigue en el botón', (await foco()) === 'btn-escala-0', await foco());
  await cantidad(12); l = await linea();
  ok('Apagado: con 12 unidades sigue en S/ 6.00 (72.00)', l.precio === '6.00' && l.apagado && l.total === '72.00', JSON.stringify(l));
  await alFinalDelPrecio(); await tecla('ArrowRight'); await tecla('Enter'); await pausa(300); l = await linea();
  ok('Enter otra vez lo PRENDE: S/ 5.50 con 12 (66.00)', l.precio === '5.50' && !l.apagado && l.boton === 'x6+ ✓' && l.total === '66.00', JSON.stringify(l));
  await tecla('ArrowLeft');
  ok('← desde el botón vuelve al precio', (await foco()) === 'edit-price-0', await foco());
  await alFinalDelPrecio(); await tecla('ArrowRight'); await tecla('ArrowRight'); await tecla('ArrowLeft');
  ok('→ → pasa a borrar y ← vuelve al botón', (await foco()) === 'btn-escala-0', await foco());

  // Otro producto SIN precios por cantidad: no tiene botón; ↓ desde el botón cae en su precio
  await escanear(`NES${m}`); // entra arriba: línea 0 = sin escala, línea 1 = con escala
  ok('Un producto sin precios por cantidad NO tiene el botón', (await page.$('#btn-escala-0')) === null && !!(await page.$('#btn-escala-1')));
  await page.focus('#edit-price-1'); await page.evaluate(() => { const i = document.getElementById('edit-price-1'); i.setSelectionRange(i.value.length, i.value.length); });
  await tecla('ArrowRight');
  ok('En la línea con escala, → llega a su botón', (await foco()) === 'btn-escala-1', await foco());
  await tecla('ArrowUp');
  ok('↑ a la línea sin escala cae en su precio', (await foco()) === 'edit-price-0', await foco());
  for (let i = 0; i < 2; i++) { await page.evaluate(() => document.querySelector('[title="Eliminar producto"]')?.click()); await pausa(500); }
  ok('El ticket queda vacío', !(await page.$('#edit-input-0')));
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set is_active=0 where id in (${E},${N}); update batches set is_active=0 where product_id in (${E},${N});`).catch(() => {});
  console.log(res.join('\n'));
}
