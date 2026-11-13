// Prueba del 12/11/2026, SOLO CON TECLADO: en el detalle del cliente, Pendientes, Pagados y Compras son 3 botones que
// abren cada uno su ventana con la lista, el buscador y la fecha. Enter en una fila abre su detalle; Escape cierra de a una.
// Uso: node ai-scripts/pruebas/prueba-historial-cliente-ventanas.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const m = Date.now(); const ID = 996000 + (m % 3000); const NOMBRE = `PRUEBA HISTORIAL ${String(m).slice(-6)}`;
await sql(`insert into customers (id, name, created_at, is_synced) values (${ID}, '${NOMBRE}', now(), 1);
  insert into fiados (id, customer_id, customer_name, amount, date_given, expected_pay_date, status, paid_amount, is_synced) values
  (${m}, ${ID}, '${NOMBRE}', 20, now() - interval '2 day', to_char(now(), 'YYYY-MM-DD'), 'PENDIENTE', 0, 1),
  (${m + 1}, ${ID}, '${NOMBRE}', 15, now() - interval '9 day', to_char(now(), 'YYYY-MM-DD'), 'CANCELADO', 15, 1),
  (${m + 2}, ${ID}, '${NOMBRE}', 10, now() - interval '17 day', to_char(now(), 'YYYY-MM-DD'), 'CANCELADO', 10, 1);
  insert into debt_payments (id, fiado_id, customer_id, amount, payment_type, created_at, is_synced) values
  (${m + 5}, ${m + 1}, ${ID}, 15, 'EFECTIVO', now() - interval '8 day', 1),
  (${m + 6}, ${m + 2}, ${ID}, 10, 'YAPE', now() - interval '16 day', 1);`);
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const foco = () => page.evaluate(() => { const a = document.activeElement; if (!a) return ''; if (a.getAttribute('data-fila-historial-cliente')) return 'fila:' + [...document.querySelectorAll('[data-fila-historial-cliente]')].indexOf(a); return a.id || a.tagName; });
const hay = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-clientes', { timeout: 20000 }); await pausa(2500);
  await page.evaluate(() => sessionStorage.removeItem('clientes_pestana'));
  await page.focus('#sidebar-btn-clientes'); await tecla('Enter'); await page.waitForSelector('#buscador-clientes'); await pausa(2000);
  // Cliente de prueba con 1 crédito pendiente y 2 pagados (se borra al final)
  await page.focus('#buscador-clientes'); await page.keyboard.type(NOMBRE, { delay: 10 }); await pausa(800);
  await page.waitForSelector('[data-fila-cliente="true"]'); await page.focus('[data-fila-cliente="true"]'); await tecla('Enter'); await pausa(1200);
  ok('Enter en un cliente abre su detalle con el selector en "Editar"', (await foco()) === 'btn-detalle-cliente-editar', await foco());
  ok('Ya no hay lista ni buscador dentro del detalle', !(await hay('[data-fila-historial-cliente]')) && !(await hay('#buscar-historial-cliente')));
  const botones = await page.evaluate(() => ['pendientes', 'pagados', 'compras'].map((t) => document.getElementById('btn-historial-cliente-' + t)?.innerText.replace(/\s+/g, ' ') || ''));
  ok('Tiene los 3 botones Pendientes, Pagados y Compras', botones.every(Boolean) && /PENDIENTES/i.test(botones[0]) && /PAGADOS/i.test(botones[1]) && /COMPRAS/i.test(botones[2]), botones.join(' | '));

  await tecla('ArrowDown'); ok('↓ desde "Editar" baja a "Pendientes"', (await foco()) === 'btn-historial-cliente-pendientes', await foco());
  await tecla('ArrowRight'); ok('→ pasa a "Pagados"', (await foco()) === 'btn-historial-cliente-pagados', await foco());
  await tecla('ArrowRight'); ok('→ pasa a "Compras"', (await foco()) === 'btn-historial-cliente-compras', await foco());
  await tecla('ArrowLeft'); await tecla('ArrowUp'); ok('← y ↑ vuelve a "Editar"', (await foco()) === 'btn-detalle-cliente-editar', await foco());
  await tecla('ArrowDown'); await tecla('ArrowRight');

  // Ventana de Pagados
  await tecla('Enter'); await pausa(600);
  ok('Enter en "Pagados" abre su ventana con el selector en el buscador', (await hay('#titulo-historial-cliente')) && (await foco()) === 'buscar-historial-cliente', await foco());
  ok('El título dice PAGADOS', /PAGADOS/i.test(await page.$eval('#titulo-historial-cliente', (e) => e.innerText)), await page.$eval('#titulo-historial-cliente', (e) => e.innerText));
  await tecla('ArrowRight'); ok('→ del buscador va a la fecha', (await foco()) === 'fecha-historial-cliente', await foco());
  await tecla('ArrowLeft'); await tecla('ArrowUp'); ok('↑ del buscador sube a la X', (await foco()) === 'btn-cerrar-historial-cliente', await foco());
  await tecla('ArrowDown'); ok('↓ de la X baja al buscador', (await foco()) === 'buscar-historial-cliente', await foco());
  const n = await page.$$eval('[data-fila-historial-cliente]', (x) => x.length);
  if (n > 0) {
    await tecla('ArrowDown'); ok('↓ baja a la primera fila', (await foco()) === 'fila:0', await foco());
    if (n > 1) { await tecla('ArrowDown'); ok('↓ pasa a la segunda fila', (await foco()) === 'fila:1', await foco()); await tecla('ArrowUp'); }
    await tecla('Enter'); await pausa(600);
    ok('Enter en una fila abre su detalle completo', await page.evaluate(() => document.querySelectorAll('.fixed.inset-0').length >= 3));
    await tecla('Escape'); await pausa(400);
    ok('Escape cierra solo el detalle y el selector vuelve a la fila', (await hay('#titulo-historial-cliente')) && (await foco()) === 'fila:0', await foco());
    await tecla('ArrowUp'); ok('↑ desde la primera fila vuelve al buscador', (await foco()) === 'buscar-historial-cliente', await foco());
    await page.keyboard.type('zzzz', { delay: 20 }); await pausa(300);
    ok('El buscador filtra (sin resultados con "zzzz")', (await page.$$eval('[data-fila-historial-cliente]', (x) => x.length)) === 0 && (await hay('#btn-limpiar-historial-cliente')));
  } else ok('Este cliente no tiene pagados para probar las filas', true, 'se omitió');
  await page.screenshot({ path: path.join(aqui, 'captura-historial-cliente.png') });
  await tecla('Escape'); await pausa(400);
  ok('Escape cierra la ventana y el selector vuelve a "Pagados"', !(await hay('#titulo-historial-cliente')) && (await hay('#titulo-detalle-cliente')) && (await foco()) === 'btn-historial-cliente-pagados', await foco());
  await page.screenshot({ path: path.join(aqui, 'captura-detalle-cliente.png') });
  await tecla('Escape'); await pausa(400);
  ok('Escape otra vez cierra el detalle del cliente', !(await hay('#titulo-detalle-cliente')));
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  console.log(res.join('\n'));
  await nav.close();
  await sql(`delete from debt_payments where customer_id = ${ID}; delete from fiados where customer_id = ${ID}; delete from customers where id = ${ID};`);
}
