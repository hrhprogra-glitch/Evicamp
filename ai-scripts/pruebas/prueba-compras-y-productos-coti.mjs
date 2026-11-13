// Prueba del 13/11/2026 (pedidos del dueño), con teclado:
// 1) Inventario › Compras: sin el título "Listas de compras" ni su texto; en UNA fila buscador, filtro (Pendientes /
//    Recibidas / Todas, "Todas" de entrada) y "Nueva lista".
// 2) Encargos › Nueva cotización: seleccionar productos del inventario en las líneas (buscador + Enter).
// Borra la cotización de la prueba al final.
// Uso: node ai-scripts/pruebas/prueba-compras-y-productos-coti.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-compra') && `compra-${document.activeElement.getAttribute('data-compra')}` || document.activeElement?.tagName || '');
const hay = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const aceptar = async (ms = 6000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await aviso()) { await tecla('Enter'); await pausa(600); return true; } await pausa(200); } return false; };
const ir = async (sec) => { await page.evaluate((s) => document.getElementById(`sidebar-btn-${s}`)?.click(), sec); await pausa(2500); };
const filasCompras = () => page.$$eval('#panel-compras [data-compra]', (f) => f.length);
const sello = String(Date.now()).slice(-6);
const CLI = `PRUEBA AUTO COTI PRODUCTOS ${sello}`;

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  // ---------- 1) Compras ----------
  await ir('inventario');
  await page.focus('#btn-tab-compras'); await tecla('Enter'); await pausa(1500);
  const texto = await page.$eval('#panel-compras', (p) => p.innerText);
  ok('Ya no está el título "Listas de compras" ni su explicación', !/LISTAS DE COMPRAS/i.test(texto) && !/Arma el pedido/i.test(texto));
  ok('Buscador, filtro y "Nueva lista"', (await hay('#buscador-compras')) && (await hay('#filtro-compras')) && (await hay('#btn-nueva-compra')));
  ok('El filtro empieza en "Todas"', (await page.$eval('#filtro-compras', (s) => s.value)) === 'TODAS');
  ok('Opciones del filtro: Pendientes, Recibidas, Todas', (await page.$$eval('#filtro-compras option', (o) => o.map((x) => x.textContent).join(','))) === 'PENDIENTES,RECIBIDAS,TODAS');
  const tops = await page.evaluate(() => ['buscador-compras', 'filtro-compras', 'btn-nueva-compra'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return Math.round(r.top + r.height / 2); }));
  ok('Los tres en UNA fila', Math.max(...tops) - Math.min(...tops) <= 6, JSON.stringify(tops));
  await page.focus('#btn-tab-compras'); await tecla('ArrowDown');
  ok('↓ desde la pestaña Compras baja a esa fila', ['buscador-compras', 'filtro-compras', 'btn-nueva-compra'].includes(await foco()), await foco());
  await page.focus('#buscador-compras'); await tecla('ArrowRight');
  ok('→ desde el buscador vacío va al filtro', (await foco()) === 'filtro-compras', await foco());
  await tecla('ArrowRight'); ok('→ desde el filtro va a "Nueva lista"', (await foco()) === 'btn-nueva-compra', await foco());
  ok('Las flechas no cambiaron el filtro', (await page.$eval('#filtro-compras', (s) => s.value)) === 'TODAS');
  const todas = await filasCompras();
  const prov = await sql(`select proveedor from compras where estado <> 'ANULADO' and coalesce(proveedor,'') <> '' order by id desc limit 1`);
  if (prov) {
    await page.focus('#buscador-compras'); await page.keyboard.type(prov.slice(0, 6)); await pausa(600);
    const n = await filasCompras();
    ok('El buscador filtra por proveedor', n >= 1 && n <= todas, `${n} de ${todas}`);
    await tecla('ArrowDown'); ok('↓ desde el buscador baja a la primera lista', (await foco()).startsWith('compra-'), await foco());
    await page.focus('#buscador-compras'); await page.keyboard.type('zzzz'); await pausa(500);
    ok('Sin resultados: avisa que ninguna coincide', (await filasCompras()) === 0 && /Ninguna lista coincide/i.test(await page.$eval('#panel-compras', (p) => p.innerText)));
    await tecla('Escape'); await pausa(400);
    ok('Escape borra la búsqueda', (await page.$eval('#buscador-compras', (i) => i.value)) === '' && (await filasCompras()) === todas);
  } else ok('Hay una compra para probar el buscador', false);
  await page.select('#filtro-compras', 'PENDIENTE'); await pausa(500);
  const estados = await page.$$eval('#panel-compras [data-compra]', (f) => f.map((x) => /PENDIENTE/.test(x.innerText)));
  ok('El filtro "Pendientes" deja solo pendientes', estados.every(Boolean), `${estados.length} fila(s)`);
  await page.screenshot({ path: path.join(aqui, 'captura-compras-buscador.png') });

  // ---------- 2) Nueva cotización: seleccionar productos ----------
  const p1 = (await sql(`select id, name, price from products where is_active = 1 and length(name) > 4 order by id limit 1`)).split('|');
  const p2 = (await sql(`select id, name, price from products where is_active = 1 and length(name) > 4 and id <> ${p1[0]} order by id desc limit 1`)).split('|');
  await page.evaluate(() => sessionStorage.setItem('encargos_pestana', 'cotizaciones')); await ir('encargos');
  await page.focus('#btn-nueva-cotizacion'); await tecla('Enter'); await pausa(1200);
  ok('Nueva cotización: buscador "Seleccionar producto"', await hay('#buscador-producto-coti'));
  await page.focus('#input-cliente-nombre-coti'); await page.keyboard.type(CLI);
  await page.focus('#buscador-producto-coti'); await page.keyboard.type(p1[1].slice(0, 5)); await pausa(500);
  ok('Al escribir sale la lista de productos', (await page.$$eval('#lista-productos-coti [role="option"]', (o) => o.length)) >= 1);
  // Elegir exactamente p1: se escribe su nombre completo
  await page.$eval('#buscador-producto-coti', (i) => { i.value = ''; }); await page.focus('#buscador-producto-coti');
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace');
  await page.keyboard.type(p1[1]); await pausa(500);
  const marcadoAntes = await page.$eval('#lista-productos-coti [aria-selected="true"]', (o) => o.id).catch(() => '');
  const opciones = await page.$$eval('#lista-productos-coti [role="option"]', (o) => o.length);
  if (opciones > 1) { await tecla('ArrowDown'); await tecla('ArrowUp'); }
  ok('↓ ↑ mueven la marca en la lista sin salir del buscador', (await foco()) === 'buscador-producto-coti' && (await page.$eval('#lista-productos-coti [aria-selected="true"]', (o) => o.id).catch(() => '')) === marcadoAntes, await foco());
  await tecla('Enter'); await pausa(500);
  const linea1 = await page.evaluate(() => ({ desc: document.getElementById('input-desc-item-0')?.value, precio: document.getElementById('input-precio-item-0')?.value, lineas: document.querySelectorAll('[id^="input-desc-item-"]').length }));
  ok('Enter agrega el producto en la línea vacía, con su precio', linea1.desc === p1[1] && Number(linea1.precio) === Number(p1[2]) && linea1.lineas === 1, JSON.stringify(linea1));
  ok('El selector se queda en el buscador y se limpia', (await foco()) === 'buscador-producto-coti' && (await page.$eval('#buscador-producto-coti', (i) => i.value)) === '', await foco());
  await page.keyboard.type(p2[1]); await pausa(500); await tecla('Enter'); await pausa(500);
  ok('Otro producto se agrega como segunda línea', (await page.evaluate(() => document.getElementById('input-desc-item-1')?.value)) === p2[1]);
  await page.screenshot({ path: path.join(aqui, 'captura-coti-productos.png') });
  await page.focus('#btn-guardar-cotizacion'); await tecla('Enter'); await aceptar(); await pausa(1000);
  const det = await sql(`select string_agg(coalesce(product_id::text,'-'), ',' order by id) from cotizacion_detalles where cotizacion_id = (select id from cotizaciones where cliente_nombre = '${CLI}')`);
  ok('Se guardan las dos líneas con su producto (se puede vender en la Caja)', det === `${p1[0]},${p2[0]}`, det);
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  await nav.close();
  try { await sql(`delete from cotizaciones where cliente_nombre = '${CLI}';`); } catch (e) { res.push('MAL limpieza — ' + e.message); }
  console.log(res.join('\n'));
}
