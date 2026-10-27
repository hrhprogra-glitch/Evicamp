// Prueba de la fase SI-3 (Finanzas sin internet) en siumax: anular venta con y sin internet (devuelve a su
// lote), anular un fiado, vender-anular-borrar sin internet, reglas de borrado (venta completada, solo admin),
// borrar un movimiento de caja y anular un abono hecho sin internet. Al volver: el servidor igual que la pantalla.
// Uso: node prueba-si3.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

// ---- Datos de prueba (directo en la base de pruebas, antes de entrar: así la precarga los guarda)
const m = Date.now();
const P = 980000 + (m % 9000), L = m;
const V1 = m + 11, V2 = m + 12, V3 = m + 13, V6 = m + 16, F3 = m + 23, F6 = m + 26, M1 = m + 31;
let S = await sql(`select id from cash_sessions where status='OPEN' order by opened_at desc limit 1;`);
let abrimosCaja = false;
if (!S) { S = String(m + 40); abrimosCaja = true; await sql(`insert into cash_sessions (id, opened_at, status, opening_balance) values ('${S}', now() - interval '1 minute', 'OPEN', 0);`); }
const ABIERTA = await sql(`select to_char(opened_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') from cash_sessions where id='${S}';`);
const venta = (id, cant, credito = false) => `insert into sales (id, total, payment_type, amount_cash, amount_yape, amount_card, amount_credit, sunat_status, created_at, is_synced)
  values (${id}, ${cant}, '${credito ? 'FIADO' : 'EFECTIVO'}', ${credito ? 0 : cant}, 0, 0, ${credito ? cant : 0}, 'ACEPTADO', now(), 1);
  insert into sale_details (id, sale_id, product_id, product_name, quantity, price_at_moment, subtotal, is_synced) values (${id}, ${id}, ${P}, 'PRUEBA SI3 ${m}', ${cant}, 1, ${cant}, 1);`;
await sql(`insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced) values (${P}, 'PRUEBA SI3 ${m}', 'GENERAL', 'SI3-${m}', 1, 10, 1, 'UND', 1, 1);
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced) values (${L}, ${P}, 10, 10, 10, 1, 'SI3-BASE', 1, 1);
  ${venta(V1, 2)} ${venta(V2, 3)} ${venta(V3, 1, true)} ${venta(V6, 1, true)}
  insert into fiados (id, sale_id, customer_name, amount, paid_amount, status, date_given, is_synced) values
    (${F3}, ${V3}, 'CLIENTE SI3', 1, 0, 'PENDIENTE', now(), 1), (${F6}, ${V6}, 'CLIENTE SI3', 1, 0, 'PENDIENTE', now(), 1);
  insert into cash_movements (id, session_id, type, amount, description, payment_type, flujo, created_at, is_synced) values (${M1}, '${S}', 'INGRESO', 7, 'PRUEBA SI3 BORRAR', 'EFECTIVO', 'INGRESO', now(), 1);`);
const base = await sql(`select quantity from products where id=${P}; select quantity from batches where id=${L}; select count(*) from inventory_movements where notes='Ticket #${V2}' and operation_type='VENTA' and batch_id=${L};`);
ok('Base: 4 ventas descontaron del lote (10-2-3-1-1 = 3) y V2 tiene su movimiento con lote', base === '3\n3\n1', base.replace(/\n/g, ' | '));

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1280, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message)); page.on('dialog', (d) => d.accept());
await page.evaluateOnNewDocument(() => localStorage.setItem('siumax_pruebas', '1'));
const db = (fn, ...a) => page.evaluate(fn, ...a);
const stock = () => db(async (p) => (await window.__siumaxPruebas.from('products').select('*').eq('is_active', 1).order('id')).data?.find((x) => x.id === p)?.quantity, P);
const lote = () => db(async (l) => (await window.__siumaxPruebas.from('batches').select('*').order('id').range(0, 999)).data?.find((x) => x.id === l)?.quantity, L);
const anular = (id) => db(async ([id, s]) => { const { data, error } = await window.__siumaxPruebas.rpc('fn_anular_venta', { p_sale_id: id, p_sesion_caja: s, p_pidio: null, p_cuando: new Date().toISOString() }); return { data, error: error?.message }; }, [id, S]);
const ventaLocal = (id) => db(async (i, a) => (await window.__siumaxPruebas.from('sales').select('*').gte('created_at', a).order('id')).data?.find((x) => String(x.id) === String(i)) || null, id, ABIERTA);
const caja = () => db(async (s) => (await window.__siumaxPruebas.from('cash_movements').select('*').eq('session_id', s).order('id')).data || [], S);
const cola = () => db(async () => { const r = indexedDB.open('siumax-local'); return await new Promise((ok) => { r.onsuccess = () => { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.map((p) => ({ accion: p.accion, error: p.error || null }))); }; }); });
let cuandoV2;
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(22000); // precarga (con la de Finanzas)

  // ===================== CON INTERNET: anular V1 lo hace el servidor =====================
  const r1 = await anular(V1);
  const s1 = await sql(`select quantity from products where id=${P}; select quantity from batches where id=${L}; select sunat_status from sales where id=${V1};
    select count(*) from inventory_movements where notes='Anulación Ticket #${V1}' and operation_type='ANULACION' and batch_id=${L};
    select count(*) from cash_movements where session_id='${S}' and flujo='DEVOLUCION' and description like 'Devolución (Anulación Ticket #${String(V1).slice(-6)})%· por %';`);
  ok('Con internet: anular devuelve al lote y al producto (3+2=5), venta ANULADO, movimiento con lote, egreso con autor', s1 === '5\n5\nANULADO\n1\n1' && !r1.error, `${s1.replace(/\n/g, ' | ')} ${JSON.stringify(r1)}`);
  const r1b = await anular(V1);
  ok('Con internet: anular otra vez no hace nada (ya_anulada)', r1b.data?.ya_anulada === true && (await sql(`select quantity from products where id=${P};`)) === '5', JSON.stringify(r1b));

  // ===================== SIN INTERNET =====================
  await page.setOfflineMode(true);
  await db(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await pausa(500);
  // la copia de productos se tomó antes de anular V1: la pantalla la refresca al volver a leer con internet; aquí se parte de lo que ve
  const stock0 = Number(await stock()), lote0 = Number(await lote());
  ok('Sin internet se ve el producto y su lote', !Number.isNaN(stock0) && !Number.isNaN(lote0), `${stock0} / ${lote0}`);

  // 1) Anular V2 (venta del servidor, 3 unidades, efectivo)
  const egresosAntes = (await caja()).filter((c) => c.flujo === 'DEVOLUCION').length;
  cuandoV2 = new Date().toISOString();
  const r2 = await anular(V2);
  ok('Sin internet: anular V2 responde como el servidor', r2.data?.ya_anulada === false && r2.data?.productos === 1, JSON.stringify(r2));
  ok('Stock +3 y su lote +3 en pantalla', Number(await stock()) === stock0 + 3 && Number(await lote()) === lote0 + 3, `${await stock()} / ${await lote()}`);
  ok('V2 se ve ANULADO', (await ventaLocal(V2))?.sunat_status === 'ANULADO');
  const egresos = (await caja()).filter((c) => c.flujo === 'DEVOLUCION');
  ok('El egreso de la devolución se ve en la caja (3, con autor)', egresos.length === egresosAntes + 1 && egresos.some((e) => Number(e.amount) === 3 && / · por /.test(e.description)), JSON.stringify(egresos.map((e) => [e.amount, e.description])));
  const r2b = await anular(V2);
  ok('Anular V2 otra vez sin internet: ya_anulada', r2b.data?.ya_anulada === true && Number(await stock()) === stock0 + 3, JSON.stringify(r2b));

  // 2) Anular V3 (fiado): fiado ANULADO y SIN egreso
  const r3 = await anular(V3);
  const fiado3 = await db(async (f) => (await window.__siumaxPruebas.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')).data?.find((x) => x.id === f) || { status: 'ANULADO (ya no está en la lista de deudas)' }, F3);
  const egresos3 = (await caja()).filter((c) => c.flujo === 'DEVOLUCION').length;
  ok('Anular un fiado sin internet: fiado ANULADO, sin egreso, stock +1', !r3.error && /^ANULADO/.test(fiado3?.status) && egresos3 === egresosAntes + 1 && Number(await stock()) === stock0 + 4, `${fiado3?.status} ${egresos3} ${await stock()} ${JSON.stringify(r3)}`);

  // 3) Venta hecha SIN internet (V4), anularla y borrarla (admin)
  const V4 = await db(async ([p, nombre]) => {
    const s = window.__siumaxPruebas; const id = Date.now();
    await s.from('sales').insert([{ id, total: 2, payment_type: 'EFECTIVO', amount_cash: 2, amount_yape: 0, amount_card: 0, amount_credit: 0, sunat_status: 'ACEPTADO', created_at: new Date().toISOString(), is_synced: 1 }]);
    await s.from('sale_details').insert([{ sale_id: id, product_id: p, product_name: nombre, quantity: 2, price_at_moment: 1, subtotal: 2, is_synced: 1 }]);
    return id;
  }, [P, `PRUEBA SI3 ${m}`]);
  ok('Venta sin internet baja el stock 2', Number(await stock()) === stock0 + 2, `${await stock()}`);
  const borrarSinAnular = await db(async (id) => (await window.__siumaxPruebas.from('sales').delete().eq('id', id)).error?.message || null, V4);
  ok('Borrar una venta COMPLETADA sin internet: rechazado como en el servidor', /Primero haz la devoluci/.test(borrarSinAnular || ''), String(borrarSinAnular));
  const r4 = await anular(V4);
  ok('Anular la venta hecha sin internet: el stock vuelve (por sus productos)', !r4.error && Number(await stock()) === stock0 + 4, `${await stock()} ${JSON.stringify(r4)}`);
  // un cajero (sin acceso total) no puede borrar una venta anulada
  const guardado = await db(() => localStorage.getItem('siumax_empleado_sin_internet'));
  await db(() => { const d = JSON.parse(localStorage.getItem('siumax_empleado_sin_internet')); d.empleado.permisos = { ...d.empleado.permisos, sistema_acceso_total: false }; localStorage.setItem('siumax_empleado_sin_internet', JSON.stringify(d)); });
  const borrarCajero = await db(async (id) => (await window.__siumaxPruebas.from('sales').delete().eq('id', id)).error?.message || null, V4);
  await db((g) => localStorage.setItem('siumax_empleado_sin_internet', g), guardado);
  ok('Sin acceso total no se borra una venta anulada', /Solo un administrador/.test(borrarCajero || ''), String(borrarCajero));
  const borrarAdmin = await db(async (id) => (await window.__siumaxPruebas.from('sales').delete().eq('id', id)).error?.message || null, V4);
  ok('El administrador borra la venta anulada y ya no se ve', borrarAdmin === null && (await ventaLocal(V4)) === null, String(borrarAdmin));

  // 4) Venta sin internet V5 que se queda (1 unidad)
  const V5 = await db(async ([p, nombre]) => {
    const s = window.__siumaxPruebas; const id = Date.now() + 5;
    await s.from('sales').insert([{ id, total: 1, payment_type: 'EFECTIVO', amount_cash: 1, amount_yape: 0, amount_card: 0, amount_credit: 0, sunat_status: 'ACEPTADO', created_at: new Date().toISOString(), is_synced: 1 }]);
    await s.from('sale_details').insert([{ sale_id: id, product_id: p, product_name: nombre, quantity: 1, price_at_moment: 1, subtotal: 1, is_synced: 1 }]);
    return id;
  }, [P, `PRUEBA SI3 ${m}`]);

  // 5) Borrar un movimiento de caja del servidor (M1)
  const bm = await db(async (id) => (await window.__siumaxPruebas.from('cash_movements').delete().eq('id', id)).error?.message || null, M1);
  ok('Borrar un movimiento de caja sin internet: ya no se ve', bm === null && !(await caja()).some((c) => c.id === M1), String(bm));

  // 6) Abono sin internet al fiado F6 y anularlo como Finanzas (busca el abono por monto y hora, lo borra y borra su ingreso)
  const creado = new Date().toISOString();
  const errAbono = await db(async ([f, s, c]) => { return (await window.__siumaxPruebas.from('debt_payments').insert([{ fiado_id: f, customer_id: null, amount: 0.5, amount_cash: 0.5, amount_yape: 0, amount_card: 0, amount_transfer: 0, payment_type: 'efectivo', session_id: Number(s), created_at: c, is_synced: 1 }])).error?.message || null; }, [F6, S, creado]);
  const ingreso = (await caja()).find((c) => c.flujo === 'INGRESO_FIADO' && c.created_at === creado);
  ok('El abono sin internet se ve como ingreso en la caja', !!ingreso, `${ingreso?.id} err=${errAbono} ${JSON.stringify((await caja()).filter((c) => c.flujo === 'INGRESO_FIADO').map((c) => [c.id, c.created_at]))} creado=${creado}`);
  if (!ingreso) {
    const dbg = await db(async ([f, s]) => {
      const sp = window.__siumaxPruebas;
      const pagos = (await sp.from('debt_payments').select('*').order('id').range(0, 999)).data?.filter((x) => String(x.fiado_id) === String(f)).map((x) => [x.id, x.created_at, x.session_id]);
      const r = indexedDB.open('siumax-local');
      const cola = await new Promise((ok) => { r.onsuccess = () => { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.map((p) => p.accion + (p.error ? ' ERR ' + p.error : ''))); }; });
      const claves = await new Promise((ok) => { const r2 = indexedDB.open('siumax-local'); r2.onsuccess = () => { const t = r2.result.transaction('respuestas').objectStore('respuestas').getAllKeys(); t.onsuccess = () => ok(t.result.filter((k) => String(k).includes('cash_movements')).map((k) => String(k).slice(String(k).indexOf('/rest'), String(k).indexOf('/rest') + 110))); }; });
      return { pagos, cola, claves, todos: (await sp.from('cash_movements').select('*').eq('session_id', s).order('id')).data?.length };
    }, [F6, S]);
    console.log('DEPURAR ABONO:', JSON.stringify(dbg, null, 1));
    throw new Error('sin ingreso del abono');
  }
  const anulAbono = await db(async ([mov]) => {
    const s = window.__siumaxPruebas;
    const { data: pagos } = await s.from('debt_payments').select('id').eq('amount', mov.amount).eq('created_at', mov.created_at);
    const e1 = pagos?.length ? (await s.from('debt_payments').delete().eq('id', pagos[0].id)).error : 'no encontró el abono';
    const e2 = (await s.from('cash_movements').delete().eq('id', mov.id)).error;
    return { pagos: pagos?.map((p) => p.id), e1: e1?.message || e1 || null, e2: e2?.message || null };
  }, [ingreso]);
  const fiado6 = await db(async (f) => (await window.__siumaxPruebas.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')).data?.find((x) => x.id === f), F6);
  ok('Anular el abono hecho sin internet: sale de la caja y la deuda vuelve a 0 pagado', !anulAbono.e1 && !anulAbono.e2 && !(await caja()).some((c) => c.created_at === creado && c.flujo === 'INGRESO_FIADO') && Number(fiado6?.paid_amount || 0) === 0, `${JSON.stringify(anulAbono)} pagado=${fiado6?.paid_amount}`);
  const enCola = await cola();
  ok('En la cola no quedó el abono anulado', !enCola.some((p) => p.accion === 'POST /debt_payments'), enCola.map((p) => p.accion).join(', '));
  const texto = await db(() => document.body.innerText);
  ok('La barra dice lo que espera subir', /venta anulada|ventas anuladas/i.test(texto), (texto.match(/SIN INTERNET[^\n]*/) || [texto.slice(0, 200)])[0]);

  // ===================== VUELVE EL INTERNET =====================
  await page.setOfflineMode(false);
  await db(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await pausa(30000);
  const final = await sql(`select quantity from products where id=${P}; select quantity from batches where id=${L};
    select string_agg(id::text||':'||sunat_status, ',' order by id) from sales where id in (${V2},${V3});
    select status from fiados where id=${F3}; select count(*) from sales where id=${V4}; select count(*) from sales where id=${V5};
    select count(*) from cash_movements where id=${M1}; select count(*) from debt_payments where fiado_id=${F6}; select paid_amount from fiados where id=${F6};
    select count(*) from cash_movements where session_id='${S}' and flujo='DEVOLUCION' and description like 'Devolución (Anulación Ticket #${String(V2).slice(-6)})%';
    select count(*) from cash_movements where session_id='${S}' and flujo='DEVOLUCION' and description like 'Devolución (Anulación Ticket #${String(V3).slice(-6)})%';
    select count(*) from inventory_movements where notes='Anulación Ticket #${V2}' and batch_id=${L};`);
  const [q, ql, ventas, f3, v4, v5, m1, abonos, pag6, eg2, eg3, movV2] = final.split('\n');
  // inicial 10 - V1(2)+2 - V2(3)+3 - V3(1)+1 - V6(1) - V4(2)+2 - V5(1) = 8
  ok('Al volver: stock exacto 8 y el lote también 8', q === '8' && ql === '8', `${q} / ${ql}`);
  ok('V2 y V3 ANULADO en el servidor, fiado de V3 ANULADO', ventas === `${V2}:ANULADO,${V3}:ANULADO` && f3 === 'ANULADO', `${ventas} ${f3}`);
  ok('V4 (vendida, anulada y borrada sin internet) ya no está; V5 sí', v4 === '0' && v5 === '1', `${v4} ${v5}`);
  ok('El movimiento borrado ya no está', m1 === '0');
  ok('El abono anulado nunca llegó y la deuda sigue en 0', abonos === '0' && Number(pag6) === 0, `${abonos} ${pag6}`);
  ok('Un egreso por V2 y ninguno por V3 (fiado)', eg2 === '1' && eg3 === '0', `${eg2} ${eg3}`);
  ok('La anulación de V2 devolvió a SU lote (movimiento con lote)', movV2 === '1', movV2);
  const hora = await sql(`select created_at from cash_movements where session_id='${S}' and flujo='DEVOLUCION' and description like 'Devolución (Anulación Ticket #${String(V2).slice(-6)})%';`);
  ok('El egreso queda con la hora en que se anuló (no la de subida)', Math.abs(Date.parse(hora.replace(' ', 'T').replace(/\+00$/, 'Z')) - Date.parse(cuandoV2)) < 5000, `${hora} vs ${cuandoV2}`);
  const quedan = await cola();
  ok('No quedó nada en la cola ni con error', quedan.length === 0, JSON.stringify(quedan));
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  // limpieza de los datos de prueba
  await sql(`update products set is_active=0 where id=${P}; update batches set is_active=0 where product_id=${P};${abrimosCaja ? ` update cash_sessions set status='CLOSED' where id='${S}';` : ''}`).catch(() => {});
  console.log(res.join('\n'));
}
