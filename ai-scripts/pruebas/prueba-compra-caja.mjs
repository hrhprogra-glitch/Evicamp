// Prueba de la fase 1.2b (siumax): pedir por caja en Compras. La gaseosa DEMO tiene "CAJA trae 6" (prueba-presentaciones).
// Pedir 5 cajas a S/ 27 la caja → se guardan 30 unidades a S/ 4.50; el detalle dice "5 CAJA x6 (30 UND)".
// Uso: node prueba-compra-caja.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const PROD = 920003; const NOTA = `CAJAS ${Date.now()}`;
await sql(`update products set presentaciones = '[{"unidad":"CAJA","factor":6,"precio":30,"barcode":null}]'::jsonb where id = ${PROD};`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k) => { await page.keyboard.press(k); await pausa(200); };
const fila = `[data-producto="${PROD}"]`;
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(2500);
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await pausa(2500);
  await page.focus('#btn-tab-compras'); await tecla('Enter'); await page.waitForSelector('#btn-nueva-compra'); await pausa(1000);
  await page.focus('#btn-nueva-compra'); await tecla('Enter'); await page.waitForSelector('#compra-buscar'); await pausa(500);
  await page.focus('#compra-notas'); await page.keyboard.type(NOTA);
  await page.focus('#compra-buscar'); await page.keyboard.type('DEMO GASEOSA'); await pausa(600); await tecla('Enter'); await pausa(600);
  ok('La línea de la gaseosa tiene el selector "en" con UND y CAJA x6', JSON.stringify(await page.$$eval(`${fila} select option`, (os) => os.map((o) => o.textContent))) === '["UND","CAJA x6"]',
    JSON.stringify(await page.$$eval(`${fila} select option`, (os) => os.map((o) => o.textContent)).catch(() => [])));
  await page.select(`${fila} select`, 'CAJA x6'); await pausa(300);
  const [cant, costo] = await page.$$(`${fila} input`);
  const escribir = async (el, v) => { await el.focus(); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(v); };
  await escribir(cant, '5'); await escribir(costo, '27'); await pausa(300);
  const vista = await page.$eval(fila, (tr) => tr.innerText.replace(/\s+/g, ' '));
  ok('En pantalla: "= 30 UND" debajo de las 5 cajas y subtotal S/ 135.00', /= 30 UND/.test(vista) && /135\.00/.test(vista), vista);
  await page.focus('#btn-guardar-compra'); await tecla('Enter'); await pausa(2500);
  const d = await sql(`select d.cantidad||'|'||d.costo_unit||'|'||coalesce(d.presentacion,'-')||'|'||coalesce(d.presentacion_factor::text,'-')||'|'||c.id from compras_detalle d join compras c on c.id = d.compra_id where c.notas = '${NOTA}';`);
  const [cantidad, costoU, pres, factor, compraId] = d.split('|');
  ok('Servidor: 30 unidades a S/ 4.50, pedido como "CAJA x6"', Number(cantidad) === 30 && Number(costoU) === 4.5 && pres === 'CAJA x6' && Number(factor) === 6, d);
  // Detalle del pedido
  await page.evaluate((id) => document.querySelector(`[data-compra="${id}"]`)?.focus(), compraId); await tecla('Enter'); await pausa(1200);
  const det = await page.evaluate(() => document.querySelector('[data-presentacion-pedido]')?.innerText || '');
  ok('El detalle del pedido dice "5 CAJA x6 (30 UND)"', /5 CAJA x6 \(30 UND\)/.test(det), det);
  await tecla('Escape'); await pausa(500);
  // Editar: vuelve a mostrar 5 cajas
  await page.evaluate((id) => document.querySelector(`[data-compra="${id}"]`)?.focus(), compraId); await tecla('Enter'); await pausa(1000);
  const editar = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => /^s*Editars*$/i.test(x.innerText)); b?.click(); return !!b; });
  await pausa(1200);
  console.log('VENTANAS:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map((d) => d.getAttribute('aria-label')))), 'EDITAR?', editar);
  const alEditar = await page.evaluate((f) => ({ en: document.querySelector(`${f} select`)?.value, cant: document.querySelectorAll(`${f} input`)[0]?.value, costo: document.querySelectorAll(`${f} input`)[1]?.value }), fila);
  ok('Al editar el pedido vuelve a mostrar CAJA x6, 5 y S/ 27', alEditar.en === 'CAJA x6' && alEditar.cant === '5' && alEditar.costo === '27', JSON.stringify(alEditar));
  await sql(`update compras set estado = 'ANULADO' where id = ${compraId};`);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  console.log(res.join('\n'));
}
