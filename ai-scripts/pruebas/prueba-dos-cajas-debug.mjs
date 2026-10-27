// Prueba: DOS cajas sin internet a la vez sobre el mismo producto (siumax). A: lote +4 y venta 1.
// B: venta 2 y cambia el precio. Al volver: stock = inicial + 4 - 1 - 2, sin duplicados.
// Uso: node prueba-dos-cajas.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); return r.stdout.trim(); };
const PROD = 1; // PRODUCTO AUTOTEST
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1280, height: 860 } });
const errores = [];
const abrirCaja = async () => {
  const ctx = await nav.createBrowserContext(); const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(e.message)); page.on('dialog', (d) => d.accept());
  await page.evaluateOnNewDocument(() => localStorage.setItem('siumax_pruebas', '1'));
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  return page;
};
const vender = (page, cant) => page.evaluate(async (p, c) => {
  const s = window.__siumaxPruebas; const id = Date.now() + Math.floor(Math.random() * 1000);
  await s.from('sales').insert([{ id, total: c, payment_type: 'EFECTIVO', amount_cash: c, amount_yape: 0, amount_card: 0, amount_credit: 0, sunat_status: 'ACEPTADO', created_at: new Date().toISOString(), is_synced: 1 }]);
  await s.from('sale_details').insert([{ sale_id: id, product_id: p, product_name: 'PRODUCTO AUTOTEST', quantity: c, price_at_moment: 1, subtotal: c, is_synced: 1 }]);
  return id;
}, PROD, cant);
const stockEn = (page) => page.evaluate(async (p) => (await window.__siumaxPruebas.from('products').select('quantity').eq('id', p)).data?.[0]?.quantity, PROD);
try {
  const inicial = Number(await sql(`select quantity from products where id=${PROD};`));
  const a = await abrirCaja(); const b = await abrirCaja();
  await pausa(18000); // precarga en las dos
  await a.setOfflineMode(true); await b.setOfflineMode(true);
  for (const pg of [a, b]) await pg.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });

  // Caja A: PRIMERO vende 1 y DESPUÉS ingresa un lote de 4 desde la pantalla (el caso que antes descuadraba)
  await vender(a, 1);
  await a.focus('#sidebar-btn-inventario'); await a.keyboard.press('Enter'); await a.waitForSelector('#btn-ingresar-lote'); await pausa(1200);
  await a.focus('#btn-ingresar-lote'); await a.keyboard.press('Enter'); await a.waitForSelector('#input-buscar-producto-lote'); await pausa(500);
  await a.keyboard.type('AUTOTEST', { delay: 20 }); await pausa(400); await a.keyboard.press('Enter'); await pausa(250);
  await a.keyboard.type('4'); await a.keyboard.press('Enter'); await pausa(250); await a.keyboard.type('4');
  await a.focus('#input-sustento-lote'); await a.keyboard.type('DOS-CAJAS');
  await a.focus('#input-vencimiento-lote'); await a.keyboard.press('ArrowDown'); await pausa(250); await a.keyboard.press('Enter');
  await a.waitForSelector('#dialogo-sistema-texto', { timeout: 15000 }); await a.keyboard.press('Enter'); await pausa(800);
  const loteId = await a.evaluate(async () => (await window.__siumaxPruebas.from('batches').select('*').eq('document_ref', 'DOS-CAJAS')).data?.slice(-1)[0]?.id);
  // Caja B: venta de 2 y cambio de precio
  await vender(b, 2);
  await b.evaluate(async (p) => { await window.__siumaxPruebas.from('products').update({ price: 9.99 }).eq('id', p); }, PROD);
  ok('Caja A (sin internet) ve su stock con su lote y su venta', Number(await stockEn(a)) === inicial + 4 - 1, `${await stockEn(a)} (esperado ${inicial + 3})`);
  ok('Caja B (sin internet) ve su stock con su venta', Number(await stockEn(b)) === inicial - 2, `${await stockEn(b)} (esperado ${inicial - 2})`);

  for (const [n, pg] of [['A', a], ['B', b]]) {
    const cola = await pg.evaluate(async () => { const r = indexedDB.open('siumax-local'); return await new Promise((ok) => { r.onsuccess = () => { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.map((p) => p.accion + (p.diferencia !== undefined ? ' dif=' + p.diferencia : '') + ' ' + p.cuerpo.slice(0, 70))); }; }); });
    console.log(`COLA ${n}:`); for (const linea of cola) console.log('  ' + linea);
  }
  console.log('stock en servidor antes de reconectar:', await sql(`select quantity from products where id=${PROD};`));
  // Vuelve el internet: primero A, luego B
  await a.setOfflineMode(false); await a.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await pausa(25000);
  await b.setOfflineMode(false); await b.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await pausa(25000);
  const final = await sql(`select quantity||'|'||price from products where id=${PROD};`);
  ok('Al volver: stock exacto = inicial + 4 - 1 - 2 (no se pisaron)', final.split('|')[0] === String(inicial + 1), `${final} (inicial ${inicial})`);
  ok('Al volver: el precio de la caja B quedó', Number(final.split('|')[1]) === 9.99, final);
  ok('El lote de A está una sola vez', (await sql(`select count(*) from batches where document_ref='DOS-CAJAS' and id=${loteId};`)) === '1');
  const lotes = await sql(`select coalesce(sum(quantity),0) from batches where product_id=${PROD} and is_active=1;`);
  ok('La suma de los lotes coincide con el stock', Number(lotes) === inicial + 1, `${lotes}`);
  for (const [n, pg] of [['A', a], ['B', b]]) {
    const cola = await pg.evaluate(async () => { const r = indexedDB.open('siumax-local'); return await new Promise((ok) => { r.onsuccess = () => { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.length); }; }); });
    ok(`Caja ${n}: no quedó nada en la cola`, cola === 0, `${cola}`);
  }
} catch (e) { ok('Sin fallas', false, e.message); }
finally { ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300)); await nav.close(); console.log(res.join('\n')); }
