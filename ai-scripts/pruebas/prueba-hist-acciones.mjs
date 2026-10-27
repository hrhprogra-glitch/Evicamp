// Prueba (siumax), SOLO CON TECLADO:
//  A) Historial del producto (reloj): cada lote tiene Editar y Eliminar; ← → entre la fila y sus botones; editar abre la
//     ventana de lote encima y al cerrarla el selector vuelve al lote; eliminar pregunta, retira el lote y baja el stock.
//  B) Caja: paquetes + sueltas del mismo producto no pasan del stock (antes cada línea se miraba sola).
// Uso: node prueba-hist-acciones.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const m = Date.now();
const H = 980000 + (m % 9000), Q = H + 1;
const L1 = m, L2 = m + 1;
await sql(`insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced) values
  (${H}, 'PRUEBA HISTACC ${m}', 'GENERAL', 'HAC${m}', 5, 5, 1, 'UND', 1, 1);
  insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced, presentaciones) values
  (${Q}, 'PRUEBA PAQUETE ${m}', 'GENERAL', 'PQS${m}', 2.5, 200, 1, 'UND', 1, 1, '[{"unidad":"PAQ","factor":25,"precio":55,"barcode":"PQB${m}"}]');
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, supplier, is_active, is_synced, created_at) values
  (${L1}, ${H}, 5, 5, 5, 1, 'HAC-A', 'PROV A', 1, 1, now() - interval '1 day'), (${L2}, ${H}, 0, 10, 20, 2, 'HAC-B', 'PROV B', 1, 1, now() - interval '3 day'),
  (${m + 2}, ${Q}, 200, 200, 200, 1, 'PQ-A', '', 1, 1, now());`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const page = await nav.newPage(); const errores = []; const avisos = [];
page.on('pageerror', (e) => errores.push(e.message)); page.on('dialog', (d) => { avisos.push(d.message()); d.accept(); });
await page.evaluateOnNewDocument(() => { if (window.top === window) localStorage.setItem('siumax_pruebas', '1'); });
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(200); } };
const foco = () => page.evaluate(() => {
  const a = document.activeElement; if (!a) return '';
  if (a.getAttribute('data-hist-lote') === 'true') return 'fila:' + a.getAttribute('data-hist-lote-id');
  return a.id || a.tagName;
});
const filasHist = () => page.$$eval('[data-hist-lote="true"]', (f) => f.map((x) => x.getAttribute('data-hist-lote-id')));
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(2500);

  // ===== A) HISTORIAL =====
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-tab-productos'); await pausa(1500);
  await page.focus('#btn-tab-productos'); await tecla('Enter');
  await page.focus('#buscador-global-inventario'); await page.keyboard.type(`PRUEBA HISTACC ${m}`); await pausa(1500);
  await page.evaluate((n) => {
    const fila = [...document.querySelectorAll('tr, [data-row="true"]')].find((f) => f.offsetParent && f.textContent.includes(n));
    fila?.querySelector('[title="Historial de Lotes / Movimientos"]')?.focus();
  }, `PRUEBA HISTACC ${m}`);
  await tecla('Enter'); await page.waitForSelector('#titulo-historial-lotes'); await pausa(1500);
  ok('El historial abre con el selector en el lote con stock', (await foco()) === `fila:${L1}`, await foco());
  ok('Cada lote tiene Editar y Eliminar (con stock y agotado)', !!(await page.$(`#hist-editar-${L1}`)) && !!(await page.$(`#hist-retirar-${L1}`)) && !!(await page.$(`#hist-editar-${L2}`)) && !!(await page.$(`#hist-retirar-${L2}`)));
  await tecla('ArrowRight');
  ok('→ desde la fila llega a Editar', (await foco()) === `hist-editar-${L1}`, await foco());
  await tecla('ArrowRight');
  ok('→ otra vez llega a Eliminar', (await foco()) === `hist-retirar-${L1}`, await foco());
  await tecla('ArrowRight');
  ok('→ en Eliminar se queda ahí', (await foco()) === `hist-retirar-${L1}`, await foco());
  await tecla('ArrowLeft', 2);
  ok('← ← vuelve a la fila', (await foco()) === `fila:${L1}`, await foco());
  await tecla('ArrowRight'); await tecla('ArrowDown');
  ok('↓ desde un botón baja a la fila siguiente (el agotado)', (await foco()) === `fila:${L2}`, await foco());

  // Editar: se abre la ventana de lote encima; el teclado es de ella; al cerrarla vuelve al lote
  await tecla('ArrowUp'); await tecla('ArrowRight'); await tecla('Enter'); await pausa(1500);
  const titulo = await page.evaluate(() => [...document.querySelectorAll('h2')].map((h) => h.innerText).find((t) => /lote de stock/i.test(t)) || '');
  ok('Enter en Editar abre "Editar lote de stock" encima del historial', /EDITAR LOTE DE STOCK/i.test(titulo) && !!(await page.$('#titulo-historial-lotes')), titulo);
  const antes = await foco(); await tecla('ArrowDown'); const despues = await foco();
  ok('Con la ventana de lote abierta, las flechas no se van al historial', !/^fila:|^hist-|tab-hist|btn-cerrar-historial/.test(despues), `${antes} → ${despues}`);
  const cargado = await page.evaluate(() => ({ cambiar: !!document.getElementById('btn-cambiar-producto-lote'), texto: document.querySelector('[role="dialog"]:last-of-type, .fixed.inset-0:last-of-type')?.innerText || '', buscador: !!document.getElementById('input-buscar-producto-lote') }));
  ok('La ventana de lote abre CON el producto ya elegido (sin el buscador desplegado)', cargado.cambiar && !cargado.buscador && cargado.texto.includes(`PRUEBA HISTACC ${m}`), JSON.stringify({ cambiar: cargado.cambiar, buscador: cargado.buscador }));
  await tecla('Escape'); await pausa(1500);
  ok('Esc cierra solo la ventana de lote: el historial sigue y el selector vuelve a ese lote', !!(await page.$('#titulo-historial-lotes')) && (await foco()) === `fila:${L1}`, await foco());

  // Guardar una edición desde el historial: cambiar el documento
  await tecla('ArrowRight'); await tecla('Enter'); await page.waitForSelector('#input-sustento-lote'); await pausa(1200);
  await page.focus('#input-sustento-lote'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type('HAC-EDITADO');
  await page.focus('#btn-guardar-lote'); await tecla('Enter'); await pausa(2500);
  const aviso = await page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
  if (aviso) { await tecla('Enter'); await pausa(1500); }
  ok('Servidor: la edición se guardó (documento HAC-EDITADO, cantidad igual)', (await sql(`select document_ref||':'||quantity from batches where id=${L1};`)) === 'HAC-EDITADO:5', await sql(`select document_ref||':'||quantity from batches where id=${L1};`));
  const filaEditada = await page.evaluate((id) => document.querySelector(`[data-hist-lote-id="${id}"]`)?.innerText || '', String(L1));
  ok('Al guardar: se cierra, el historial muestra el documento nuevo y el selector vuelve a ese lote', !(await page.$('#input-sustento-lote')) && /HAC-EDITADO/.test(filaEditada) && (await foco()) === `fila:${L1}`, `${await foco()} / ${filaEditada.replace(/\s+/g, ' ').slice(0, 80)}`);

  // Eliminar el agotado
  await tecla('ArrowDown'); await tecla('ArrowRight', 2);
  ok('En el agotado: → → llega a Eliminar', (await foco()) === `hist-retirar-${L2}`, await foco());
  await tecla('Enter'); await pausa(600);
  const pregunta = await page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
  ok('Pregunta antes de eliminar (lote agotado)', /eliminar el lote agotado/i.test(pregunta), pregunta.slice(0, 90));
  await tecla('Enter'); await pausa(2000);
  ok('Eliminado: queda 1 lote y el selector pasa al que quedó', JSON.stringify(await filasHist()) === JSON.stringify([String(L1)]) && (await foco()) === `fila:${L1}`, `${JSON.stringify(await filasHist())} / ${await foco()}`);
  ok('Servidor: el lote agotado quedó retirado', (await sql(`select is_active from batches where id=${L2};`)) === '0');

  // Eliminar el que tiene stock: baja el stock del producto
  await tecla('ArrowRight', 2); await tecla('Enter'); await pausa(600);
  const pregunta2 = await page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
  ok('Con stock: la pregunta dice cuánto se descarga (5 UND)', /5 UND/i.test(pregunta2), pregunta2.slice(0, 120));
  await tecla('Enter'); await pausa(2000);
  ok('Sin lotes: el historial lo dice y el selector va a la X', /todavía no tiene lotes/i.test(await page.evaluate(() => document.body.innerText)) && (await foco()) === 'btn-cerrar-historial-lotes', await foco());
  ok('Servidor: lote retirado y stock del producto 0', (await sql(`select is_active from batches where id=${L1}; select quantity from products where id=${H};`)).replace(/\n/g, '|') === '0|0', await sql(`select quantity from products where id=${H};`));
  await tecla('Escape'); await pausa(800);
  const filaProd = await page.evaluate((n) => [...document.querySelectorAll('tr, [data-row="true"]')].find((f) => f.offsetParent && f.textContent.includes(n))?.innerText.replace(/\s+/g, ' ') || '', `PRUEBA HISTACC ${m}`);
  ok('En la lista de productos el stock ya dice 0', /\b0\b/.test(filaProd), filaProd.slice(0, 120));

  // ===== B) CAJA: PAQUETES + SUELTAS =====
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await page.waitForSelector('#buscador-global-pos'); await pausa(1500);
  // Los avisos del sistema son propios (dialogos.tsx): se leen y se aceptan con Enter, como haría el cajero
  const leerAviso = async () => { const t = await page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || ''); if (t) { avisos.push(t); await tecla('Enter'); await pausa(400); } };
  const escribirCant = async (i, n) => { await page.focus(`#edit-input-${i}`); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(String(n)); await tecla('Enter'); await pausa(600); await leerAviso(); };
  const cant = (i) => page.$eval(`#edit-input-${i}`, (x) => x.value).catch(() => null);
  const escanear = async (c) => { await page.focus('#buscador-global-pos'); await page.keyboard.type(c); await pausa(500); await tecla('Enter'); await pausa(800); await leerAviso(); };
  await escanear(`PQS${m}`);
  await escribirCant(0, 100);
  ok('Sueltas: 100 de 200 entra sin aviso', Number(await cant(0)) === 100 && avisos.length === 0, `${await cant(0)} / ${avisos.join(' | ')}`);
  await escanear(`PQB${m}`);
  // (lo nuevo entra ARRIBA del ticket: el paquete es la línea 0 y las sueltas pasan a la 1)
  ok('Se agrega 1 PAQUETE x25 en otra línea (arriba)', Number(await cant(0)) === 1 && Number(await cant(1)) === 100, `${await cant(0)} / ${await cant(1)}`);
  avisos.length = 0;
  await escribirCant(0, 8);
  ok('8 paquetes (200) + 100 sueltas NO pasa: avisa y deja 4 paquetes', Number(await cant(0)) === 4 && /ya hay 100 en otras líneas/i.test(avisos.join(' ')) && /entran 4/i.test(avisos.join(' ')), `${await cant(0)} / ${avisos.join(' | ')}`);
  avisos.length = 0;
  await escribirCant(1, 200);
  ok('Con 4 paquetes (100), 200 sueltas NO pasa: deja 100', Number(await cant(1)) === 100 && /entran 100/i.test(avisos.join(' ')), `${await cant(1)} / ${avisos.join(' | ')}`);
  avisos.length = 0;
  await escanear(`PQS${m}`);
  ok('Con el stock completo (100 + 4x25), escanear 1 suelta más avisa', /STOCK INSUFICIENTE/i.test(avisos.join(' ')) && Number(await cant(1)) === 100, `${await cant(1)} / ${avisos.join(' | ')}`);
  for (let i = 0; i < 2; i++) { await page.evaluate(() => document.querySelector('[title="Eliminar producto"]')?.click()); await pausa(500); await leerAviso(); }
  ok('El ticket queda vacío', !(await page.$('#edit-input-0')));
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set is_active=0 where id in (${H},${Q}); update batches set is_active=0 where product_id in (${H},${Q});`).catch(() => {});
  console.log(res.join('\n'));
}
