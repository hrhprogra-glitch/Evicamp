// Prueba del 12/11/2026 (SiuMax Nego, paso 3h), con teclado: UNA sola pantalla de Cotizaciones (Comercio + Servicios).
// - Solo Comercio: Cotizaciones en el menú, sin la pestaña en Clientes, y los atajos Alt de siempre.
// - Una cotización "de la Caja" (con productos) se convierte en venta: la Caja recibe sus líneas.
// - Nueva cotización (borrador) → enviada → abono → convertir en trabajo → abono final (sigue CONVERTIDA).
// - Editar una de la Caja conserva sus productos. Eliminar un borrador. Enter deja el selector en su sitio.
// Al final borra lo creado y deja el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/prueba-cotizaciones-nego.mjs <carpeta tools con puppeteer-core>
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
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLA:', m.text()); });
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const hay = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const esperarAviso = async (ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { const a = await aviso(); if (a) return a; await pausa(200); } return ''; };
const aceptar = async (ms = 8000) => { const a = await esperarAviso(ms); if (a) { await tecla('Enter'); await pausa(700); } return a; };
const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
const elegir = async (tipos) => {
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
  await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
  for (const t of ['servicios', 'comercio']) if (tipos.includes(t) && (await marcado(t)) !== 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  for (const t of ['comercio', 'servicios']) if (!tipos.includes(t) && (await marcado(t)) === 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  await page.focus('#btn-guardar-tipo-negocio'); await tecla('Enter'); await pausa(1500); await aceptar(1000);
};
const ir = async (sec) => { await page.evaluate((s) => document.getElementById(`sidebar-btn-${s}`)?.click(), sec); await pausa(2000); };
const escribirEn = async (sel, t) => { await page.focus(sel); await page.$eval(sel, (e) => { e.value = ''; }); await page.keyboard.type(t); await pausa(150); };
const enterSeQueda = async (nombre, id) => { await page.focus('#' + id); await tecla('Enter'); await pausa(500); const f = await foco(); ok(`${nombre}: Enter en ${id} → el selector se queda`, f === id, f); };
const vista = () => page.evaluate(() => localStorage.getItem('evicamp_last_view'));
const alt = async (n) => { await page.keyboard.down('Alt'); await page.keyboard.press(String(n)); await page.keyboard.up('Alt'); await pausa(1500); };
const coti = (where) => sql(`select numero, estado, total, adelanto from cotizaciones where ${where} order by id desc limit 1`);
const abrirFila = async (id) => { await page.focus(`#fila-coti-${id}`); await tecla('Enter'); await pausa(1200); };

const sello = String(Date.now()).slice(-6);
const CLI = `PRUEBA AUTO CLIENTE COTI ${sello}`;
let idCaja = null; let prodId = null;

try {
  // Una cotización "de la Caja": VIGENTE, con un producto del inventario
  const p = await sql(`select id, name, price from products where is_active = 1 and coalesce(quantity,0) > 0 order by id limit 1`);
  const [pid, pname, pprecio] = p.split('|'); prodId = pid;
  idCaja = await sql(`insert into cotizaciones (numero, cliente_nombre, cliente_telefono, fecha_emision, fecha_vencimiento, estado, total, vendedor, observaciones)
    values ('COT-PRUEBA-${sello}', '${CLI} CAJA', '987654321', now(), now() + interval '7 days', 'VIGENTE', ${Number(pprecio) * 2}, 'Caja', 'PRUEBA AUTO DESDE CAJA ${sello}') returning id`).then((r) => r.split('\n')[0]);
  await sql(`insert into cotizacion_detalles (cotizacion_id, product_id, product_name, quantity, price, subtotal, es_mayorista) values (${idCaja}, ${pid}, '${pname.replace(/'/g, "''")}', 2, ${pprecio}, ${Number(pprecio) * 2}, false)`);

  await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  // ---------- Solo Comercio ----------
  await elegir(['comercio']);
  ok('Solo Comercio: Cotizaciones en el menú', await hay('#sidebar-btn-cotizaciones'));
  await ir('clientes');
  const tabs = await page.$$eval('main [role="tab"], main .pestanas-sobrias > button', (b) => b.map((x) => x.innerText.trim().toUpperCase()).join(','));
  ok('Clientes ya no tiene la pestaña Cotizaciones', !/COTIZACIONES/.test(tabs), tabs);
  await page.focus('#sidebar-btn-clientes');
  await alt(3); ok('Alt + 3 sigue siendo Inventario', (await vista()) === 'inventario', await vista());
  await alt(7); ok('Alt + 7 sigue siendo Ajustes', (await vista()) === 'configuracion', await vista());
  await alt(8); ok('Alt + 8 abre Cotizaciones (al final de los atajos)', (await vista()) === 'cotizaciones', await vista());
  ok('El selector entra al buscador de Cotizaciones', (await foco()) === 'buscador-cotizaciones', await foco());
  ok('La de la Caja sale en la lista', await hay(`#fila-coti-${idCaja}`));
  ok('Sin columna "Lo que se atiende" (solo Comercio)', !(await page.evaluate(() => /LO QUE SE ATIENDE/i.test(document.querySelector('#tabla-cotizaciones thead')?.innerText || ''))));

  // Editar la de la Caja: conserva su producto
  await abrirFila(idCaja);
  ok('Enter en la fila abre el detalle', await hay('#modal-titulo-detalle-coti'));
  ok('Solo Comercio: "Convertir en venta" sí, "Convertir en trabajo" no', (await hay('#btn-convertir-venta')) && !(await hay('#btn-convertir-trabajo')));
  await page.focus('#btn-editar-coti'); await tecla('Enter'); await pausa(1200);
  ok('"Editar" abre la ventana con sus líneas', (await page.$eval('#input-desc-item-0', (e) => e.value)) === pname);
  await escribirEn('#input-cant-item-0', '3'); await enterSeQueda('Editar', 'input-cant-item-0');
  await page.focus('#btn-guardar-cotizacion'); await tecla('Enter'); await aceptar(); await pausa(800);
  const det = await sql(`select product_id, quantity from cotizacion_detalles where cotizacion_id = ${idCaja}`);
  ok('Al editar conserva el producto (para venderla) y cambia la cantidad', det === `${pid}|3.000` || det === `${pid}|3`, det);

  // Convertir en venta → la Caja recibe la línea
  await abrirFila(idCaja);
  await page.focus('#btn-convertir-venta'); await tecla('Enter'); await pausa(2500);
  const carrito = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('evicamp_cart') || '[]'); } catch { return []; } });
  ok('"Convertir en venta" lleva a la Caja con su producto', (await vista()) === 'pos' && carrito.some((c) => String(c.id) === String(pid) && Number(c.cartQuantity) === 3), `${await vista()} · ${JSON.stringify(carrito.map((c) => [c.id, c.cartQuantity]))}`);
  await page.evaluate(() => { localStorage.removeItem('evicamp_cart'); localStorage.removeItem('evicamp_cliente_pos'); sessionStorage.removeItem('evicamp_coti_activa'); });
  await page.reload({ waitUntil: 'networkidle2' }); await pausa(2500);

  // ---------- Comercio + Servicios ----------
  await elegir(['comercio', 'servicios']);
  await ir('cotizaciones');
  ok('Con Servicios: columna "Lo que se atiende"', await page.evaluate(() => /LO QUE SE ATIENDE/i.test(document.querySelector('#tabla-cotizaciones thead')?.innerText || '')));
  await page.focus('#btn-nueva-cotizacion'); await tecla('Enter'); await pausa(1200);
  ok('Enter en "Nueva cotización" abre la ventana con el selector en Asunto', (await foco()) === 'input-asunto-cotizacion', await foco());
  await page.keyboard.type(`PRUEBA AUTO MANTENIMIENTO ${sello}`); await enterSeQueda('Nueva', 'input-asunto-cotizacion');
  await escribirEn('#input-cliente-nombre-coti', CLI); await enterSeQueda('Nueva', 'input-cliente-nombre-coti');
  ok('Con Servicios: campo "Lo que se atiende"', await hay('#select-bien-cotizacion'));
  await escribirEn('#input-desc-item-0', 'MANO DE OBRA'); await enterSeQueda('Nueva', 'input-desc-item-0');
  await escribirEn('#input-cant-item-0', '2'); await escribirEn('#input-precio-item-0', '50'); await enterSeQueda('Nueva', 'input-precio-item-0');
  ok('Enter no agrega líneas ni guarda solo', (await page.$$eval('[id^="input-desc-item-"]', (x) => x.length)) === 1 && (await sql(`select count(*) from cotizaciones where cliente_nombre = '${CLI}'`)) === '0');
  await page.focus('#btn-agregar-item-coti'); await tecla('Enter'); await pausa(400);
  ok('Enter en "Agregar línea" agrega una y pone el selector en ella', (await foco()) === 'input-desc-item-1', await foco());
  await page.keyboard.type('MATERIALES'); await escribirEn('#input-precio-item-1', '20');
  ok('Total 120 en pantalla', /120\.00/.test(await page.$eval('#total-nueva-cotizacion', (e) => e.innerText)), await page.$eval('#total-nueva-cotizacion', (e) => e.innerText));
  await page.focus('#btn-guardar-cotizacion'); await tecla('Enter'); await aceptar(); await pausa(1000);
  const nueva = await coti(`cliente_nombre = '${CLI}'`);
  ok('Se guarda como BORRADOR con número correlativo y total 120', /^COT-\d{4}\|BORRADOR\|120(\.00)?\|/.test(nueva), nueva);
  const idNueva = await sql(`select id from cotizaciones where cliente_nombre = '${CLI}' order by id desc limit 1`);
  ok('El selector vuelve a su fila', (await foco()) === `fila-coti-${idNueva}`, await foco());

  await abrirFila(idNueva);
  ok('Con Servicios: "Convertir en trabajo" y "Convertir en venta"', (await hay('#btn-convertir-trabajo')) && (await hay('#btn-convertir-venta')));
  await page.focus('#btn-enviada-coti'); await tecla('Enter'); await aceptar(); await pausa(500);
  ok('"Marcar enviada" → VIGENTE', (await coti(`id = ${idNueva}`)).split('|')[1] === 'VIGENTE');
  await page.focus('#btn-abono-cotizacion'); await tecla('Enter'); await pausa(800);
  ok('"Registrar abono" abre con el selector en el monto', (await foco()) === 'input-monto-abono-coti', await foco());
  await escribirEn('#input-monto-abono-coti', '40'); await enterSeQueda('Abono', 'input-monto-abono-coti');
  await page.focus('#btn-guardar-abono-coti'); await tecla('Enter'); await aceptar(); await pausa(900);
  ok('Abono de 40: pagado 40', /\|40(\.00)?$/.test(await coti(`id = ${idNueva}`)), await coti(`id = ${idNueva}`));
  await page.focus('#btn-convertir-venta'); await tecla('Enter'); const av = await aceptar(3000);
  ok('Con abonos no se lleva a la Caja (avisa)', /abonos/i.test(av) && (await vista()) === 'cotizaciones', av);
  await page.focus('#btn-convertir-trabajo'); await tecla('Enter'); await aceptar(3000); await aceptar(); await pausa(900);
  const trab = await sql(`select estado, trabajo_id is not null from cotizaciones where id = ${idNueva}`);
  ok('"Convertir en trabajo" → CONVERTIDA con su trabajo en la Agenda', trab === 'CONVERTIDA|t', trab);
  await page.focus('#btn-abono-cotizacion'); await tecla('Enter'); await pausa(800);
  await page.focus('#btn-guardar-abono-coti'); await tecla('Enter'); await aceptar(); await pausa(900);
  ok('Abono del saldo (80): pagada y sigue CONVERTIDA', /\|CONVERTIDA\|120(\.00)?\|120(\.00)?$/.test(await coti(`id = ${idNueva}`)), await coti(`id = ${idNueva}`));
  await page.screenshot({ path: path.join(aqui, 'captura-cotizacion-nego.png') });
  await page.focus('#btn-cerrar-detalle-coti'); await tecla('Enter'); await pausa(700);

  // Borrador eliminado
  await page.focus('#btn-nueva-cotizacion'); await tecla('Enter'); await pausa(1000);
  await escribirEn('#input-cliente-nombre-coti', `${CLI} BORRAR`); await escribirEn('#input-desc-item-0', 'X'); await escribirEn('#input-precio-item-0', '5');
  await page.focus('#btn-guardar-cotizacion'); await tecla('Enter'); await aceptar(); await pausa(900);
  const idBorrar = await sql(`select id from cotizaciones where cliente_nombre = '${CLI} BORRAR'`);
  await abrirFila(idBorrar);
  await page.focus('#btn-eliminar-coti'); await tecla('Enter'); await aceptar(3000); await aceptar(); await pausa(900);
  ok('Eliminar un borrador', (await sql(`select count(*) from cotizaciones where cliente_nombre = '${CLI} BORRAR'`)) === '0');

  // Buscador y filtro
  await page.focus('#buscador-cotizaciones'); await page.keyboard.type(sello); await pausa(700);
  ok('El buscador encuentra las 2 de la prueba', (await page.$$eval('[data-fila-coti="true"]', (f) => f.length)) === 2);
  await page.select('#filtro-estado-coti', 'CONVERTIDA'); await pausa(500);
  ok('El filtro CONVERTIDA deja solo la convertida', (await page.$$eval('[data-fila-coti="true"]', (f) => f.map((x) => x.id))).join() === `fila-coti-${idNueva}`);
  await page.focus('#buscador-cotizaciones'); await tecla('ArrowDown');
  ok('↓ desde el buscador baja a la primera fila', (await foco()) === `fila-coti-${idNueva}`, await foco());
  await tecla('ArrowUp'); ok('↑ desde la primera fila vuelve al buscador', (await foco()) === 'buscador-cotizaciones', await foco());
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  try { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await pausa(300); } await aceptar(500); await elegir(['comercio']); } catch { /* */ }
  await nav.close();
  try {
    await sql(`create temp table c as select id, numero, trabajo_id from cotizaciones where cliente_nombre like '${CLI}%' or numero = 'COT-PRUEBA-${sello}';
      delete from cash_movements where ref_local in (select 'COTIPAGO-' || p.id from cotizacion_pagos p where p.cotizacion_id in (select id from c));
      delete from agenda_trabajadores where trabajo_id in (select trabajo_id from c);
      update cotizaciones set trabajo_id = null where id in (select id from c);
      delete from agenda_trabajos where id in (select trabajo_id from c);
      delete from cotizaciones where id in (select id from c);`);
  } catch (e) { res.push('MAL limpieza — ' + e.message); }
  console.log(res.join('\n'));
}
