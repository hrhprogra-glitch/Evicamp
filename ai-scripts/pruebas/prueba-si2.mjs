// Prueba de la fase SI-2 (lo que calcula el servidor, sin internet) en siumax. Con el internet CORTADO:
// crear y editar un pedido, recibirlo, devolverlo, recibirlo otra vez, editar un lote, retirar un lote,
// borrar un producto y cambiar los datos de la empresa. Al volver: el servidor queda igual que la pantalla.
// Uso: node prueba-si2.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

// Datos de prueba (con internet, directo en la base de pruebas)
const m = Date.now();
const P = 990000 + (m % 9000), Q = P + 1, LOTE_P = m, LOTE_Q = m + 1;
await sql(`insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced) values
  (${P}, 'PRUEBA SI2 ${m}', 'GENERAL', 'SI2-${m}', 5, 10, 1, 'UND', 1, 1), (${Q}, 'PRUEBA SI2 BORRAR ${m}', 'GENERAL', 'SI2B-${m}', 5, 3, 1, 'UND', 1, 1);
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced) values
  (${LOTE_P}, ${P}, 10, 10, 10, 1, 'SI2-BASE', 1, 1), (${LOTE_Q}, ${Q}, 3, 3, 3, 1, 'SI2-BASE', 1, 1);`);
const telAntes = await sql(`select coalesce(telefono,'') from empresa_config order by id limit 1;`);
const TEL = `9${String(m).slice(-8)}`;

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1280, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message)); page.on('dialog', (d) => d.accept());
await page.evaluateOnNewDocument(() => localStorage.setItem('siumax_pruebas', '1'));
const db = (fn, ...a) => page.evaluate(fn, ...a);
const stock = (id) => db(async (i) => (await window.__siumaxPruebas.from('products').select('quantity').eq('id', i)).data?.[0]?.quantity, id);
const compraLocal = (id) => db(async (i) => (await window.__siumaxPruebas.from('compras').select('*, compras_detalle(*)').order('created_at', { ascending: false }).limit(200)).data?.find((c) => String(c.id) === String(i)) || null, id);
let compraId, loteRecibido;
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(20000); // precarga

  // ===================== SIN INTERNET =====================
  await page.setOfflineMode(true);
  await db(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  ok('Stock inicial del producto de prueba (10) se ve sin internet', Number(await stock(P)) === 10, `${await stock(P)}`);

  // 1) Crear pedido (como PanelCompras.guardar)
  compraId = await db(async ([p, nombre]) => {
    const s = window.__siumaxPruebas; const id = Date.now();
    await s.from('compras').insert([{ id, provider_id: null, proveedor: null, notas: 'pedido sin internet', estado: 'PENDIENTE', autor: 'prueba' }]);
    await s.from('compras_detalle').insert([{ compra_id: id, product_id: p, product_name: nombre, cantidad: 5, costo_unit: 2 }]);
    return id;
  }, [P, `PRUEBA SI2 ${m}`]);
  let c = await compraLocal(compraId);
  ok('Pedido nuevo se ve en Compras CON su producto', c?.compras_detalle?.length === 1 && Number(c.compras_detalle[0].cantidad) === 5, JSON.stringify(c?.compras_detalle?.map((d) => d.cantidad)));

  // 2) Editar pedido: borrar sus productos y volver a ponerlos (como PanelCompras al guardar cambios)
  await db(async ([id, p, nombre]) => {
    const s = window.__siumaxPruebas;
    await s.from('compras').update({ notas: 'pedido editado' }).eq('id', id);
    await s.from('compras_detalle').delete().eq('compra_id', id);
    await s.from('compras_detalle').insert([{ compra_id: id, product_id: p, product_name: nombre, cantidad: 6, costo_unit: 2 }]);
  }, [compraId, P, `PRUEBA SI2 ${m}`]);
  c = await compraLocal(compraId);
  ok('Pedido editado: notas nuevas y su producto con 6', c?.notas === 'pedido editado' && c?.compras_detalle?.length === 1 && Number(c.compras_detalle[0].cantidad) === 6, `${c?.notas} | ${JSON.stringify(c?.compras_detalle?.map((d) => d.cantidad))}`);

  // 3) Recibir pedido
  const r1 = await db(async (id) => {
    const s = window.__siumaxPruebas;
    const c = (await s.from('compras').select('*, compras_detalle(*)').order('created_at', { ascending: false }).limit(200)).data.find((x) => String(x.id) === String(id));
    const { data, error } = await s.rpc('fn_recibir_compra', { p_compra_id: id, p_items: c.compras_detalle.map((d) => ({ detalle_id: d.id, cantidad: 6, costo: 2 })), p_documento: 'F-SI2' });
    return { data, error: error?.message };
  }, compraId);
  ok('Recibir sin internet: 1 lote y el stock dice 16', r1.data?.lotes === 1 && Number(r1.data?.cambios?.[0]?.quantity) === 16, JSON.stringify(r1));
  ok('Stock en pantalla 16', Number(await stock(P)) === 16, `${await stock(P)}`);
  c = await compraLocal(compraId);
  ok('El pedido queda RECIBIDO y su producto con su lote', c?.estado === 'RECIBIDO' && c?.compras_detalle?.[0]?.batch_id != null, `${c?.estado}`);
  const lotesTabla = await db(async (p) => (await window.__siumaxPruebas.from('batches').select('*, products!batches_product_id_fkey (*)').neq('is_active', 0).order('created_at', { ascending: false })).data?.filter((l) => String(l.product_id) === String(p)).map((l) => `${l.quantity}:${l.products?.name ? 'con-nombre' : 'SIN-NOMBRE'}`), P);
  ok('La pestaña Lotes muestra el lote recibido CON el nombre del producto', lotesTabla?.some((x) => x === '6:con-nombre'), JSON.stringify(lotesTabla));

  // 4) Devolver
  const r2 = await db(async (id) => { const { data, error } = await window.__siumaxPruebas.rpc('fn_devolver_compra', { p_compra_id: id }); return { data, error: error?.message }; }, compraId);
  ok('Devolver sin internet: stock vuelve a 10 y el pedido a PENDIENTE', Number(await stock(P)) === 10 && (await compraLocal(compraId))?.estado === 'PENDIENTE', JSON.stringify(r2));

  // 5) Recibir otra vez (4)
  const r3 = await db(async (id) => {
    const s = window.__siumaxPruebas;
    const c = (await s.from('compras').select('*, compras_detalle(*)').order('created_at', { ascending: false }).limit(200)).data.find((x) => String(x.id) === String(id));
    const { data, error } = await s.rpc('fn_recibir_compra', { p_compra_id: id, p_items: c.compras_detalle.map((d) => ({ detalle_id: d.id, cantidad: 4, costo: 2 })), p_documento: 'F-SI2-B' });
    return { data, error: error?.message };
  }, compraId);
  c = await compraLocal(compraId);
  loteRecibido = c?.compras_detalle?.[0]?.batch_id;
  ok('Recibir otra vez (4): stock 14', Number(await stock(P)) === 14 && r3.data?.lotes === 1, `${await stock(P)} | ${JSON.stringify(r3)}`);

  // 6) Editar el lote base de 10 → 8 (como ModalLote en modo edición)
  await db(async (lote) => {
    const s = window.__siumaxPruebas;
    await s.from('batches').update({ initial_quantity: 8, cost_total: 8, document_ref: 'SI2-EDITADO', is_active: 1 }).eq('id', lote);
    await s.rpc('fn_edit_batch', { p_batch_id: String(lote), p_new_qty: 8, p_new_cost: 1, p_user_name: 'x' });
  }, LOTE_P);
  ok('Editar lote (10 → 8): stock 12', Number(await stock(P)) === 12, `${await stock(P)}`);

  // 7) Retirar el lote recibido (4)
  await db(async (lote) => { await window.__siumaxPruebas.rpc('fn_soft_delete_batch', { p_batch_id: String(lote), p_user_name: 'x' }); }, loteRecibido);
  ok('Retirar el lote recibido: stock 8', Number(await stock(P)) === 8, `${await stock(P)}`);

  // 8) Borrar el producto Q
  await db(async (q) => { await window.__siumaxPruebas.rpc('fn_soft_delete_product', { p_product_id: String(q), p_user_name: 'x' }); }, Q);
  const qVisible = await db(async (q) => (await window.__siumaxPruebas.from('products').select('*').eq('is_active', 1).order('id')).data?.some((p) => String(p.id) === String(q)), Q);
  ok('Borrar producto sin internet: deja de verse en Inventario', qVisible === false, String(qVisible));

  // 9) Datos de la empresa
  const tel = await db(async (t) => {
    const s = window.__siumaxPruebas;
    const { data: emp } = await s.from('empresa_config').select('*').limit(1).single();
    await s.from('empresa_config').update({ telefono: t }).eq('id', emp.id);
    return (await s.from('empresa_config').select('*').limit(1).single()).data?.telefono;
  }, TEL);
  ok('Datos de la empresa: el teléfono nuevo se ve sin internet', tel === TEL, String(tel));

  // ===================== VUELVE EL INTERNET =====================
  await page.setOfflineMode(false);
  await db(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  for (let i = 0; i < 30; i++) {
    await pausa(3000);
    const n = await db(async () => { const r = indexedDB.open('siumax-local'); return await new Promise((ok) => { r.onsuccess = () => { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.length); }; }); });
    if (n === 0) break;
  }
  await pausa(2000);
  const cola = await db(async () => { const r = indexedDB.open('siumax-local'); return await new Promise((ok) => { r.onsuccess = () => { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.map((p) => `${p.accion}${p.error ? ' ERROR ' + p.error : ''}`)); }; }); });
  ok('Al volver: la cola quedó vacía (sin errores)', cola.length === 0, JSON.stringify(cola).slice(0, 400));
  ok('Servidor: stock del producto = 8 y suma de lotes activos = 8',
    (await sql(`select quantity||'|'||(select coalesce(sum(quantity),0) from batches where product_id=${P} and is_active=1) from products where id=${P};`)) === '8|8',
    await sql(`select quantity||'|'||(select coalesce(sum(quantity),0) from batches where product_id=${P} and is_active=1) from products where id=${P};`));
  ok('Servidor: el pedido está UNA vez, RECIBIDO, con su producto y su lote (el mismo número que en la PC)',
    (await sql(`select count(*)||'|'||max(estado) from compras where id=${compraId};`)) === '1|RECIBIDO'
    && (await sql(`select count(*)||'|'||max(batch_id) from compras_detalle where compra_id=${compraId};`)) === `1|${loteRecibido}`,
    `${await sql(`select estado from compras where id=${compraId};`)} | ${await sql(`select batch_id from compras_detalle where compra_id=${compraId};`)} vs ${loteRecibido}`);
  ok('Servidor: el lote recibido existe y quedó retirado', (await sql(`select is_active||'|'||quantity from batches where id=${loteRecibido};`)) === '0|0');
  ok('Servidor: el lote base quedó en 8', (await sql(`select quantity||'|'||document_ref from batches where id=${LOTE_P};`)) === '8|SI2-EDITADO');
  ok('Servidor: el producto borrado quedó inactivo', (await sql(`select is_active::text from products where id=${Q};`)) === '0');
  ok('Servidor: el teléfono de la empresa se guardó', (await sql(`select telefono from empresa_config order by id limit 1;`)) === TEL);
  const hist = await sql(`select string_agg(accion, ',' order by id) from compras_historial where compra_id=${compraId};`);
  ok('Historial del pedido: creada, editada, recibida, devuelta, recibida', /CREADA/.test(hist) && /RECIBIDA,DEVUELTA,RECIBIDA/.test(hist), hist);
  const kardex = await sql(`select string_agg(operation_type||':'||change_amount||':'||"user", ', ' order by id) from inventory_movements where product_id=${P};`);
  ok('Kardex con nombre en cada movimiento', !/postgres/.test(kardex) && /Administrador SiuHub/.test(kardex), kardex.slice(0, 300));
} catch (e) { ok('Sin fallas', false, e.message); }
finally {
  if (telAntes !== undefined) { try { await sql(`update empresa_config set telefono=${telAntes ? `'${telAntes}'` : 'null'} where id=(select id from empresa_config order by id limit 1);`); } catch {} }
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300)); await nav.close(); console.log(res.join('\n'));
}
