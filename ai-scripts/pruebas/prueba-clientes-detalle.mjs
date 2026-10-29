// Prueba de la fase 4.1b (siumax), SOLO CON TECLADO: detalle del cliente (Enter en la lista) con resumen, lo que más
// lleva y sus créditos; Enter en un crédito abre su detalle; Editar y Estado de cuenta desde el detalle; UNIR un
// cliente repetido (sus créditos pasan, se completan los datos y el repetido se borra).
// Uso: node ai-scripts/pruebas/prueba-clientes-detalle.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const m = Date.now(); const corto = String(m).slice(-6);
const A = 995000 + (m % 4000), B = A + 1;                       // A queda, B es el repetido
const NA = `PRUEBA UNIR ${corto}`, NB = `PRUEBA UNIR ${corto} REPETIDO`;
await sql(`insert into customers (id, name, dni, tipo_doc, telefono, referencia, created_at, is_synced) values
  (${A}, '${NA}', null, null, '911222333', 'tienda de la esquina', now(), 1),
  (${B}, '${NB}', '4${corto}9', 'DNI', null, null, now(), 1);
  insert into fiados (id, customer_id, customer_name, amount, date_given, expected_pay_date, status, paid_amount, is_synced) values
  (${m}, ${B}, '${NB}', 20, now() - interval '10 day', to_char(now(), 'YYYY-MM-DD'), 'PENDIENTE', 0, 1),
  (${m + 1}, ${B}, '${NB}', 15, now() - interval '3 day', to_char(now(), 'YYYY-MM-DD'), 'PENDIENTE', 5, 1),
  (${m + 2}, ${B}, '${NB}', 10, now() - interval '17 day', to_char(now(), 'YYYY-MM-DD'), 'CANCELADO', 10, 1);
  insert into debt_payments (id, fiado_id, customer_id, amount, payment_type, created_at, is_synced) values
  (${m + 5}, ${m + 1}, ${B}, 5, 'EFECTIVO', now() - interval '2 day', 1),
  (${m + 6}, ${m + 2}, ${B}, 10, 'YAPE', now() - interval '16 day', 1);`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const foco = () => page.evaluate(() => { const a = document.activeElement; if (!a) return ''; if (a.getAttribute('data-credito-cliente')) return 'credito:' + [...document.querySelectorAll('[data-credito-cliente]')].indexOf(a); if (a.getAttribute('data-cliente-id')) return 'fila:' + a.getAttribute('data-cliente-id'); return a.id || a.tagName; });
const texto = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ') || '', sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const buscar = async (t) => { await page.focus('#buscador-clientes'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(t, { delay: 10 }); await pausa(500); };
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-clientes', { timeout: 20000 }); await pausa(2500);
  await page.evaluate(() => sessionStorage.removeItem('clientes_pestana'));
  await page.focus('#sidebar-btn-clientes'); await tecla('Enter'); await page.waitForSelector('#buscador-clientes'); await pausa(2000);

  // Detalle del repetido (tiene créditos)
  await buscar(NB); await tecla('ArrowDown'); await tecla('Enter'); await pausa(800);
  ok('Enter en un cliente abre su DETALLE con el selector en "Editar"', !!(await page.$('#titulo-detalle-cliente')) && (await foco()) === 'btn-detalle-cliente-editar', await foco());
  const resumen = await texto('#resumen-detalle-cliente');
  ok('Resumen: deuda S/ 30.00, 3 créditos, total fiado S/ 45.00 y viene cada 7 días', /DEUDA ACTUAL S\/ 30\.00/i.test(resumen) && /CR[EÉ]DITOS 3/i.test(resumen) && /TOTAL FIADO S\/ 45\.00/i.test(resumen) && /CADA 7 D[IÍ]AS/i.test(resumen), resumen);
  ok('Muestra sus datos (DNI)', (await texto('#datos-detalle-cliente')).includes(`4${corto}9`), await texto('#datos-detalle-cliente'));
  // HISTORIAL: pestañas Pendientes | Pagados, Enter despliega productos y abonos, buscador
  await tecla('ArrowDown');
  ok('↓ baja al historial: pestaña "Pendientes (2)" elegida (debe algo)', (await foco()) === 'tab-historial-cliente-pendientes' && /PENDIENTES \(2\)/i.test(await texto('#tab-historial-cliente-pendientes')) && (await page.evaluate(() => document.getElementById('tab-historial-cliente-pendientes')?.getAttribute('aria-selected'))) === 'true', await foco());
  await tecla('ArrowDown');
  ok('↓ baja a los créditos pendientes (el más nuevo primero)', (await foco()) === 'credito:0' && (await page.$$eval('[data-credito-cliente]', (x) => x.length)) === 2, await foco());
  await tecla('Enter'); await pausa(300);
  const abierto = await texto('[data-credito-abierto="true"]');
  ok('Enter despliega "Productos sacados" y "Abonos" (+ S/ 5.00 EFECTIVO)', /PRODUCTOS SACADOS/i.test(abierto) && /ABONOS/i.test(abierto) && /\+ S\/ 5\.00/.test(abierto) && /EFECTIVO/i.test(abierto), abierto.slice(0, 160));
  await tecla('Enter'); await pausa(300);
  ok('Enter otra vez lo oculta', !(await page.$('[data-credito-abierto="true"]')));
  await tecla('ArrowUp'); await tecla('ArrowRight');
  ok('↑ vuelve a la pestaña y → pasa a "Pagados (1)" sin cambiar todavía', (await foco()) === 'tab-historial-cliente-pagados' && (await page.$$eval('[data-credito-cliente]', (x) => x.length)) === 2, await foco());
  await tecla('Enter'); await pausa(300);
  ok('Enter muestra los pagados (1)', (await page.$$eval('[data-credito-cliente]', (x) => x.length)) === 1 && /PAGADO/i.test(await texto('[data-credito-cliente]')));
  await tecla('ArrowDown'); await tecla('Enter'); await pausa(300);
  ok('El pagado muestra su abono (+ S/ 10.00 YAPE)', /\+ S\/ 10\.00/.test(await texto('[data-credito-abierto="true"]')) && /YAPE/i.test(await texto('[data-credito-abierto="true"]')));
  await tecla('ArrowUp'); await tecla('ArrowLeft'); await tecla('Enter'); await tecla('ArrowRight', 2);
  ok('En Pendientes, → → llega al buscador del historial', (await foco()) === 'buscar-historial-cliente', await foco());
  await page.keyboard.type('15'); await pausa(400);
  ok('Buscar "15" deja solo el crédito de S/ 15.00', (await page.$$eval('[data-credito-cliente]', (x) => x.length)) === 1 && /15\.00/.test(await texto('[data-credito-cliente]')));
  await tecla('ArrowUp');
  ok('↑ desde el historial sube a los botones', (await foco()) === 'btn-detalle-cliente-editar', await foco());
  await tecla('Escape'); await pausa(800);
  ok('Esc cierra el detalle y el selector vuelve a la fila del cliente', !(await page.$('#titulo-detalle-cliente')) && (await foco()) === `fila:${B}`, await foco());

  // Detalle del que queda → Unir con el repetido
  await buscar(NA);
  const filas = await page.$$eval('[data-fila-cliente="true"]', (f) => f.length);
  await page.evaluate((id) => document.querySelector(`[data-cliente-id="${id}"]`)?.focus(), String(A)); await tecla('Enter'); await pausa(800);
  ok('Detalle del cliente sin créditos: deuda 0 y lista vacía', /DEUDA ACTUAL S\/ 0\.00/i.test(await texto('#resumen-detalle-cliente')) && /todav[ií]a no tiene cr[eé]ditos/i.test(await page.evaluate(() => document.body.innerText)), `${filas} filas`);
  await tecla('ArrowRight');
  ok('→ llega a "Estado de cuenta"', (await foco()) === 'btn-detalle-cliente-cuenta', await foco());
  await tecla('Enter'); await pausa(500);
  ok('Sin créditos, "Estado de cuenta" avisa', /no tiene cr[eé]ditos/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(400);
  await page.focus('#btn-detalle-cliente-cuenta'); await tecla('ArrowRight');
  ok('→ llega a "Unir con otro cliente"', (await foco()) === 'btn-detalle-cliente-unir', await foco());
  await tecla('Enter'); await pausa(600);
  ok('Abre "Unir" con el selector en su buscador', (await foco()) === 'buscar-unir-cliente', await foco());
  await page.keyboard.type(NB, { delay: 10 }); await pausa(300); await tecla('Enter');
  ok('Enter baja al cliente encontrado', (await foco()) === `unir-${B}`, await foco());
  await tecla('Enter'); await pausa(500);
  const pregunta = await aviso();
  ok('Pregunta antes de unir, diciendo qué pasa', /unir/i.test(pregunta) && pregunta.includes(NB) && /se borra/i.test(pregunta), pregunta.slice(0, 120));
  await tecla('Enter'); await pausa(3000);
  const listo = await aviso();
  ok('Avisa que pasaron los 3 créditos', /3 cr[eé]dito/i.test(listo), listo);
  await tecla('Enter'); await pausa(800);
  const srv = await sql(`select count(*) from fiados where customer_id=${A} and customer_name='${NA}'; select count(*) from customers where id=${B}; select coalesce(dni,'')||'|'||coalesce(tipo_doc,'')||'|'||coalesce(telefono,'') from customers where id=${A};`);
  ok('Servidor: los 3 créditos pasaron, el repetido se borró y el DNI se completó (teléfono se mantiene)', srv.replace(/\n/g, ' ; ') === `3 ; 0 ; 4${corto}9|DNI|911222333`, srv.replace(/\n/g, ' ; '));
  ok('El detalle ya muestra la deuda de S/ 30.00 y 3 créditos', /DEUDA ACTUAL S\/ 30\.00/i.test(await texto('#resumen-detalle-cliente')) && /CR[EÉ]DITOS 3/i.test(await texto('#resumen-detalle-cliente')), await texto('#resumen-detalle-cliente'));

  // Editar desde el detalle: la ficha se abre encima y al guardar el detalle se actualiza
  await page.focus('#btn-detalle-cliente-editar'); await tecla('Enter'); await pausa(600);
  ok('Editar abre la ficha encima del detalle', (await foco()) === 'ficha-nombre' && !!(await page.$('#titulo-detalle-cliente')), await foco());
  await page.focus('#ficha-referencia'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('bodega de la esquina'); await tecla('Enter'); await tecla('Enter'); await pausa(2000);
  ok('Al guardar, el detalle muestra la referencia nueva', /bodega de la esquina/i.test(await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '')));
  await tecla('Escape'); await pausa(600);
  ok('Esc cierra el detalle', !(await page.$('#titulo-detalle-cliente')));

  // Estado de cuenta → "Ver historial" abre el detalle nuevo (antes, la ventana vieja del directorio)
  await buscar(NA); await page.evaluate((id) => document.querySelector(`[data-cliente-id="${id}"]`)?.focus(), String(A)); await tecla('Enter'); await pausa(800);
  await page.focus('#btn-detalle-cliente-cuenta'); await tecla('Enter'); await pausa(1200);
  ok('Con créditos, "Estado de cuenta" abre el estado de cuenta (S/ 30.00)', !!(await page.$('#btn-ver-historial-modal')) && /S\/ 30\.00/.test(await page.evaluate(() => document.body.innerText)));
  await page.evaluate(() => document.getElementById('btn-ver-historial-modal')?.click()); await pausa(1200);
  ok('"Ver historial" del Estado de cuenta vuelve al detalle nuevo del cliente (ya no a la ventana vieja)', !(await page.$('#btn-ver-historial-modal')) && (await texto('#titulo-detalle-cliente')).includes(NA), await texto('#titulo-detalle-cliente'));
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`delete from debt_payments where id in (${m + 5}, ${m + 6}); delete from fiados where id in (${m}, ${m + 1}, ${m + 2}); delete from customers where id in (${A}, ${B});`).catch(() => {});
  console.log(res.join('\n'));
}
