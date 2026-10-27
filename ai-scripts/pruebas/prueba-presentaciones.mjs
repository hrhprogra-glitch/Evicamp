// Prueba de la fase 1.2a (siumax): presentaciones. Crear "CAJA trae 6 a S/ 30" con código propio en el formulario
// (teclado); en Caja, escanear ese código agrega "(CAJA x6)" a S/ 30; vender 1 caja + 1 suelta descuenta 7 unidades;
// el detalle guarda la presentación; el stock se revisa sumando sueltas y cajas; el ticket dice "1 × CAJA x6 = 6".
// Uso: node prueba-presentaciones.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const PROD = 920003; const CODIGO = `CAJAGAS${Date.now() % 100000}`;
await sql(`update products set price = 6, presentaciones = null, quantity = 40 where id = ${PROD}; update batches set quantity = 40 where id = 920103;`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const page = await nav.newPage(); const errores = []; const avisos = [];
page.on('pageerror', (e) => errores.push(e.message)); page.on('dialog', (d) => { avisos.push(d.message()); d.accept(); });
const tecla = async (k) => { await page.keyboard.press(k); await pausa(180); };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(2500);

  // 1) Formulario
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-tab-productos'); await pausa(1500);
  await page.focus('#btn-tab-productos'); await tecla('Enter');
  await page.focus('#buscador-global-inventario'); await page.keyboard.type('DEMO GASEOSA'); await pausa(1000);
  await page.evaluate(() => [...document.querySelectorAll('[data-row="true"]')].find((f) => f.offsetParent && f.innerText.includes('DEMO GASEOSA'))?.focus());
  await tecla('Enter'); await page.waitForSelector('#pres-unidad-0'); await pausa(500);
  await page.focus('#escala-precio-2'); await tecla('ArrowDown');
  ok('↓ desde la última escala llega a la primera presentación', (await foco()) === 'pres-unidad-0', await foco());
  ok('La unidad por defecto es Caja', (await page.$eval('#pres-unidad-0', (s) => s.value)) === 'CAJA');
  await tecla('ArrowRight'); await page.keyboard.type('6'); await tecla('Enter');
  ok('Enter en "trae" pasa al precio', (await foco()) === 'pres-precio-0', await foco());
  await page.keyboard.type('30'); await tecla('Enter'); await page.keyboard.type(CODIGO); await tecla('Enter');
  ok('Enter en el código de barras pasa a la fila siguiente', (await foco()) === 'pres-unidad-1', await foco());
  await page.focus('#btn-guardar-producto'); await tecla('Enter'); await pausa(2500);
  const guardado = await sql(`select presentaciones::text from products where id = ${PROD};`);
  const g = JSON.parse(guardado || '[]');
  ok('Servidor: guardó CAJA que trae 6 a S/ 30 con su código', g.length === 1 && g[0].unidad === 'CAJA' && g[0].factor === 6 && g[0].precio === 30 && g[0].barcode === CODIGO, guardado);

  // 2) Caja
  await page.reload({ waitUntil: 'networkidle2' }); await page.waitForSelector('#sidebar-btn-pos'); await pausa(2000);
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await page.waitForSelector('#buscador-global-pos'); await pausa(1200);
  await page.focus('#buscador-global-pos'); await page.keyboard.type(CODIGO); await pausa(500); await tecla('Enter'); await pausa(700);
  const linea = await page.evaluate(() => ({ texto: document.body.innerText.match(/DEMO GASEOSA 1\.5L \(CAJA x6\)/i)?.[0] || '', precio: document.getElementById('edit-price-0')?.value }));
  ok('Escanear el código de la caja agrega "DEMO GASEOSA 1.5L (CAJA x6)" a S/ 30.00', !!linea.texto && linea.precio === '30.00', JSON.stringify(linea));
  await page.focus('#buscador-global-pos'); await page.keyboard.type('DEMO-CMP-3'); await pausa(500); await tecla('Enter'); await pausa(700);
  ok('La suelta entra aparte a S/ 6.00', (await page.$eval('#edit-price-0', (i) => i.value)) === '6.00');
  await page.keyboard.press('F2'); await page.waitForSelector('#btn-exacto-efectivo'); await pausa(400);
  await page.click('#btn-exacto-efectivo'); await pausa(300); await page.click('#cobro-btn-confirm'); await pausa(3500);
  const venta = await sql(`select d.sale_id||'|'||d.quantity||'|'||d.price_at_moment||'|'||coalesce(d.presentacion,'-')||'|'||coalesce(d.presentacion_cantidad::text,'-')||'|'||d.subtotal from sale_details d join sales s on s.id = d.sale_id where d.product_id = ${PROD} order by s.created_at desc, d.id limit 2;`);
  const lineas = venta.split('\n').map((x) => x.split('|'));
  const caja = lineas.find((x) => x[3] === 'CAJA x6'); const suelta = lineas.find((x) => x[3] === '-');
  ok('Servidor: la caja se guardó como 6 unidades a S/ 5 c/u, "CAJA x6", 1 caja, subtotal 30', !!caja && Number(caja[1]) === 6 && Number(caja[2]) === 5 && caja[4] === '1' && Number(caja[5]) === 30, venta.replace(/\n/g, ' ; '));
  ok('La suelta: 1 unidad a S/ 6', !!suelta && Number(suelta[1]) === 1 && Number(suelta[2]) === 6, venta.replace(/\n/g, ' ; '));
  ok('Stock: 40 − 6 − 1 = 33', (await sql(`select quantity from products where id = ${PROD};`)) === '33');

  // 3) Stock sumando sueltas y cajas: con 7 en stock, 1 caja (6) + 2 sueltas no se puede
  await sql(`update products set quantity = 7 where id = ${PROD};`);
  await page.reload({ waitUntil: 'networkidle2' }); await page.waitForSelector('#sidebar-btn-pos'); await pausa(2000);
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await page.waitForSelector('#buscador-global-pos'); await pausa(1200);
  avisos.length = 0;
  await page.focus('#buscador-global-pos'); await page.keyboard.type(CODIGO); await pausa(500); await tecla('Enter'); await pausa(500);
  await page.focus('#buscador-global-pos'); await page.keyboard.type('DEMO-CMP-3'); await pausa(500); await tecla('Enter'); await pausa(500);
  await page.focus('#buscador-global-pos'); await page.keyboard.type('DEMO-CMP-3'); await pausa(500); await tecla('Enter'); await pausa(800);
  const aviso = avisos.join(' | ') || (await page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || ''));
  ok('Con 7 en stock: 1 caja + 1 suelta sí; la 2.ª suelta avisa "stock insuficiente"', /STOCK INSUFICIENTE/i.test(aviso), aviso.slice(0, 100));

  // 4) Detalle del ticket
  const ventaId = lineas[0]?.[0];
  await page.reload({ waitUntil: 'networkidle2' }); await page.waitForSelector('#sidebar-btn-finanzas'); await pausa(2000);
  await page.focus('#sidebar-btn-finanzas'); await tecla('Enter'); await pausa(3500);
  const abierto = await page.evaluate((id) => { const f = [...document.querySelectorAll('[data-row="true"]')].find((x) => x.offsetParent && x.innerText.includes(`#${String(id).slice(-6)}`)); if (!f) return false; f.focus(); return true; }, ventaId);
  if (!abierto) console.log('FINANZAS FILAS:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[data-row="true"]')].filter((x) => x.offsetParent).slice(0, 4).map((x) => x.innerText.replace(/\s+/g, ' ').slice(0, 70)))), 'BUSCADO', ventaId);
  if (abierto) { await tecla('Enter'); await pausa(2000); }
  const det = await page.evaluate(() => document.querySelector('[data-presentacion]')?.innerText || '');
  ok('Detalle del ticket: "1 × CAJA x6 = 6 unidades"', /1 × CAJA x6 = 6 unidades/.test(det), `${abierto} ${det}`);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set quantity = 40 where id = ${PROD}; update batches set quantity = 40 where id = 920103;`).catch(() => {});
  console.log(res.join('\n'));
}
