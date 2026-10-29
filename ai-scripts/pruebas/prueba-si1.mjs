// Prueba de la fase SI-1 (todo sin internet) en siumax: con el internet CORTADO se crea un producto y su
// lote desde la pantalla, se vende, se crean/editan cliente y proveedor, se crea/borra una categoría y se
// cierra y abre caja. Al volver el internet se verifica en la base: todo una sola vez, stock exacto, quién.
// Uso: node prueba-si1.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); return r.stdout.trim(); };

const marca = Date.now().toString().slice(-6);
const NOMBRE_PROD = `PRUEBA SIN INTERNET ${marca}`;
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1280, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
page.on('dialog', (d) => d.accept()); // ModalProducto todavía usa alert()
await page.evaluateOnNewDocument(() => localStorage.setItem('siumax_pruebas', '1'));
const tecla = async (k) => { await page.keyboard.press(k); await pausa(250); };
const db = (fn, ...a) => page.evaluate(fn, ...a);
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-nuevo-producto'); await pausa(16000); // precarga
  const cajaAbierta = await sql("select id from cash_sessions where status='OPEN' order by opened_at desc limit 1;");

  // ===================== SIN INTERNET =====================
  await page.setOfflineMode(true);
  await db(async () => { await window.__siumaxPruebas.from('products').select('id').limit(1); }); // la PC se entera del corte
  await pausa(800);
  ok('Se detecta el corte (barra SIN INTERNET)', await db(() => /SIN INTERNET/i.test(document.body.innerText)));

  // 1) Producto nuevo desde la pantalla
  await page.focus('#btn-nuevo-producto'); await tecla('Enter'); await pausa(1200); await tecla('Enter'); /* Paso 1: Por unidad */ await page.waitForSelector('#input-nombre-producto'); await pausa(500);
  await page.focus('#input-nombre-producto'); await page.keyboard.type(NOMBRE_PROD, { delay: 15 });
  await page.focus('#input-precio-producto'); await page.keyboard.type('4.5');
  await page.focus('#btn-guardar-producto'); await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-texto', { timeout: 15000 }); await pausa(300); await tecla('Enter'); await pausa(1200);
  const prod = await db(async (n) => (await window.__siumaxPruebas.from('products').select('*').eq('name', n)).data?.[0] || null, NOMBRE_PROD);
  ok('SIN internet: el producto nuevo se guarda y se ve', !!prod, prod ? `id ${prod.id}` : 'no aparece');
  if (!prod) throw new Error('sin producto no sigue la prueba');

  // 2) Lote desde la pantalla (Ingresar lote)
  await page.screenshot({ path: path.join(tools, '..', 'si1-tras-producto.png') });
  if (await page.$('#input-nombre-producto')) { await tecla('Escape'); await pausa(400); }
  await page.focus('#btn-ingresar-lote'); await tecla('Enter'); await page.waitForSelector('#input-buscar-producto-lote'); await pausa(500);
  await page.keyboard.type(NOMBRE_PROD, { delay: 10 }); await pausa(400); await tecla('Enter');
  await page.keyboard.type('5'); await tecla('Enter'); await page.keyboard.type('20');
  await page.focus('#input-vencimiento-lote'); await tecla('ArrowDown'); await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-texto', { timeout: 15000 });
  const avisoLote = await db(() => document.getElementById('dialogo-sistema-texto')?.textContent || '');
  ok('SIN internet: ingresar lote funciona', avisoLote.includes('Lote registrado'), avisoLote.replace(/\s+/g, ' '));
  await tecla('Enter'); await pausa(800);
  const stock1 = await db(async (id) => (await window.__siumaxPruebas.from('products').select('quantity').eq('id', id)).data?.[0]?.quantity, prod.id);
  ok('SIN internet: el stock sube a 5 en pantalla', Number(stock1) === 5, `${stock1}`);

  // 3) Venta de 2 unidades de ese producto (como la Caja)
  const ventaId = await db(async (p) => {
    const s = window.__siumaxPruebas; const id = Date.now();
    await s.from('sales').insert([{ id, total: 9, payment_type: 'EFECTIVO', amount_cash: 9, amount_yape: 0, amount_card: 0, amount_credit: 0, sunat_status: 'ACEPTADO', created_at: new Date().toISOString(), is_synced: 1 }]);
    await s.from('sale_details').insert([{ sale_id: id, product_id: p.id, product_name: p.name, quantity: 2, price_at_moment: 4.5, subtotal: 9, is_synced: 1 }]);
    return id;
  }, prod);
  const stock2 = await db(async (id) => (await window.__siumaxPruebas.from('products').select('quantity').eq('id', id)).data?.[0]?.quantity, prod.id);
  ok('SIN internet: vender ese producto baja el stock a 3', Number(stock2) === 3, `${stock2}`);

  // 4) Cliente nuevo y editado
  const cli = await db(async (m) => {
    const s = window.__siumaxPruebas;
    const { data } = await s.from('customers').insert([{ name: `CLIENTE SIN INTERNET ${m}`, dni: '11111111', created_at: new Date().toISOString(), is_synced: 1 }]).select().single();
    await s.from('customers').update({ dni: '22222222' }).eq('id', data.id);
    const leido = (await s.from('customers').select('*').eq('id', data.id)).data?.[0];
    return { id: data.id, dni: leido?.dni };
  }, marca);
  ok('SIN internet: cliente nuevo (con su número) y editado', !!cli.id && cli.dni === '22222222', JSON.stringify(cli));

  // 5) Proveedor nuevo y editado
  const prov = await db(async (m) => {
    const s = window.__siumaxPruebas;
    const { data } = await s.from('providers').insert([{ ruc: `9${m}`, razon_social: `PROV SIN INTERNET ${m}`, estado: 'ACTIVO' }]).select('id').single();
    await s.from('providers').update({ estado: 'INACTIVO' }).eq('id', data.id);
    const leido = (await s.from('providers').select('*').neq('estado', 'ELIMINADO').order('created_at', { ascending: false })).data?.find((p) => p.id === data.id);
    return { id: data.id, estado: leido?.estado };
  }, marca);
  ok('SIN internet: proveedor nuevo y editado (se ve en la lista)', !!prov.id && prov.estado === 'INACTIVO', JSON.stringify(prov));

  // 6) Categoría creada y borrada
  const catOk = await db(async (m) => {
    const s = window.__siumaxPruebas; const id = Date.now();
    await s.from('categories').insert([{ id, name: `CAT SIN INTERNET ${m}`, is_synced: 1 }]);
    const antes = (await s.from('categories').select('name')).data?.some((c) => c.name === `CAT SIN INTERNET ${m}`);
    await s.from('categories').delete().eq('id', id);
    const despues = (await s.from('categories').select('name')).data?.some((c) => c.name === `CAT SIN INTERNET ${m}`);
    return antes && !despues;
  }, marca);
  ok('SIN internet: categoría creada y borrada', catOk);

  // 7) Cerrar la caja abierta y abrir otra
  const caja = await db(async (abierta) => {
    const s = window.__siumaxPruebas;
    if (abierta) await s.from('cash_sessions').update({ status: 'CLOSED', closed_at: new Date().toISOString(), closing_balance: 0 }).eq('id', abierta);
    const sigueAbierta = (await s.from('cash_sessions').select('*').eq('status', 'OPEN').order('opened_at', { ascending: false }).limit(1)).data?.length;
    const nueva = Date.now().toString();
    await s.from('cash_sessions').insert([{ id: nueva, opening_balance: 50, status: 'OPEN', opened_at: new Date().toISOString(), is_synced: '1' }]);
    const abiertaAhora = (await s.from('cash_sessions').select('*').eq('status', 'OPEN').order('opened_at', { ascending: false }).limit(1)).data?.[0]?.id;
    return { sigueAbierta, nueva, abiertaAhora };
  }, cajaAbierta);
  ok('SIN internet: cerrar caja (deja de verse abierta)', !caja.sigueAbierta, JSON.stringify(caja));
  ok('SIN internet: abrir caja nueva (se ve abierta)', String(caja.abiertaAhora) === caja.nueva);
  const barra = await db(() => document.body.innerText.match(/[^\n]*pendiente[^\n]*/i)?.[0] || document.body.innerText.slice(0, 200));
  ok('La barra resume lo que espera subir', /producto nuevo/i.test(barra) || /lote/i.test(barra), barra.replace(/\s+/g, ' ').slice(0, 160));

  // ===================== VUELVE EL INTERNET =====================
  await page.setOfflineMode(false);
  await db(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  for (let i = 0; i < 20; i++) {
    await pausa(3000);
    const n = await sql(`select count(*) from cash_sessions where id='${caja.nueva}';`);
    if (n === '1') break;
  }
  await pausa(4000);
  const p = await sql(`select count(*), max(id), max(quantity) from products where name='${NOMBRE_PROD}';`);
  ok('Al volver: el producto está UNA vez, con el mismo número, y stock 3', p === `1|${prod.id}|3`, p);
  const l = await sql(`select count(*), max(initial_quantity), max(quantity) from batches where product_id=${prod.id};`);
  ok('Al volver: su lote está una vez (ingresó 5, queda 3)', l === '1|5|3', l);
  const m = await sql(`select string_agg(operation_type||':'||change_amount||':'||"user", ', ' order by created_at) from inventory_movements where product_id=${prod.id};`);
  ok('Kardex: ingreso +5 y venta -2, con el nombre de quien lo hizo', /COMPRA:5:Administrador SiuHub/.test(m) && /VENTA:-2:Administrador SiuHub/.test(m), m);
  ok('La venta está una vez', (await sql(`select count(*) from sales where id=${ventaId};`)) === '1');
  ok('Cliente: una vez, con su número y el DNI editado', (await sql(`select count(*)||'|'||max(dni) from customers where id=${cli.id};`)) === '1|22222222');
  ok('Proveedor: una vez, INACTIVO', (await sql(`select count(*)||'|'||max(estado) from providers where id='${prov.id}';`)) === '1|INACTIVO');
  ok('Categoría creada y borrada: no quedó', (await sql(`select count(*) from categories where name='CAT SIN INTERNET ${marca}';`)) === '0');
  if (cajaAbierta) ok('La caja anterior quedó CERRADA, con quién la cerró', /^CLOSED\|Administrador SiuHub$/.test(await sql(`select status||'|'||coalesce(cerrada_por,'') from cash_sessions where id='${cajaAbierta}';`)));
  ok('La caja nueva quedó ABIERTA, con quién la abrió', /^OPEN\|Administrador SiuHub$/.test(await sql(`select status||'|'||coalesce(abierta_por,'') from cash_sessions where id='${caja.nueva}';`)));
  const errCola = await db(async () => { const r = indexedDB.open('siumax-local'); return await new Promise((ok) => { r.onsuccess = () => { try { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.length); } catch { ok(-1); } }; r.onerror = () => ok(-1); }); });
  ok('No quedó nada esperando en la cola', errCola === 0, `${errCola}`);
} catch (e) { ok('Sin fallas', false, e.message); }
finally { ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300)); await nav.close(); console.log(`producto: ${NOMBRE_PROD}`); console.log(res.join('\n')); }
