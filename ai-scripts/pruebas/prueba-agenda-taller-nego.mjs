// Prueba del 12/11/2026 (SiuMax Nego, paso 3f), con teclado: Agenda y Taller (de SiuMax Servic; adapta sus
// prueba-fase5 y prueba-fase12), con el negocio en "Comercio + Servicios". Revisa también que Enter deje el selector
// en su sitio (regla de Nego). Crea datos "PRUEBA AUTO ...", al final los borra y deja el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/prueba-agenda-taller-nego.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { tipoInicial, restaurarTipo, tipoActual } from './lib-tipo-negocio.mjs';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const tiposAntes = await tipoInicial(); // 17/11: devolver la elección del dueño al terminar
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message)); page.on('console', (m) => { if (['warning', 'error'].includes(m.type())) console.log('CONSOLA:', m.text()); });
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const hay = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const texto = () => page.evaluate(() => document.body.innerText.toUpperCase());
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const cerrarAviso = async () => { await pausa(400); if (await aviso()) { await tecla('Enter'); await pausa(500); } };
const esperarAviso = async (ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await aviso()) return true; await pausa(200); } return false; };
const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
const elegir = async (tipos) => {
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
  await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
  for (const t of ['servicios', 'comercio']) if (tipos.includes(t) && (await marcado(t)) !== 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  for (const t of ['comercio', 'servicios']) if (!tipos.includes(t) && (await marcado(t)) === 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  await page.focus('#btn-guardar-tipo-negocio'); await tecla('Enter'); await pausa(1500); await cerrarAviso();
};
const escribirEn = async (sel, t) => { await page.focus(sel); await page.$eval(sel, (e) => { e.value = ''; }); await page.keyboard.type(t); await pausa(150); };
const enterSeQueda = async (nombre, id) => { await page.focus('#' + id); await tecla('Enter'); await pausa(500); const f = await foco(); ok(`${nombre}: Enter en ${id} → el selector se queda`, f === id, f); };
const opcionCon = (sel, txt) => page.evaluate((s, t) => { const o = [...document.querySelector(s).options].find((x) => x.text.toUpperCase().includes(t)); return o ? o.value : ''; }, sel, txt);

const sello = String(Date.now()).slice(-6);
const CLI = `PRUEBA AUTO CLIENTE NEGO ${sello}`; const TRAB = `PRUEBA AUTO TECNICO NEGO ${sello}`;
const TITULO = `PRUEBA AUTO MANTENIMIENTO BOMBA ${sello}`; const EQUIPO = `PRUEBA AUTO LAPTOP ${sello}`;

try {
  await sql(`insert into customers (name, dni, direccion, telefono, activo) values ('${CLI}', '77${sello}', 'AV. LOS PINOS 456', '987654321', true);
             insert into trabajadores (nombre, cargo, estado) values ('${TRAB}', 'TECNICO', 'ACTIVO');`);
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  await elegir(['comercio']);
  ok('Solo Comercio: sin Agenda ni Taller en el menú', !(await hay('#sidebar-btn-agenda')) && !(await hay('#sidebar-btn-taller')));
  await elegir(['comercio', 'servicios']);
  ok('Con Servicios: Agenda y Taller en el menú', (await hay('#sidebar-btn-agenda')) && (await hay('#sidebar-btn-taller')));

  // ---------- AGENDA ----------
  await page.focus('#sidebar-btn-agenda'); await tecla('Enter'); await pausa(2000);
  ok('Agenda abre (ya no dice "Pronto")', (await hay('#buscador-agenda')) && !(await hay('#pronto-agenda')));
  ok('Vistas Día, Semana y Mes (Mi día se quitó en Servic: era lo mismo que Día)', (await hay('#btn-vista-dia')) && (await hay('#btn-vista-semana')) && (await hay('#btn-vista-mes')));
  await page.focus('#btn-nuevo-trabajo'); await tecla('Enter'); await pausa(1000);
  ok('Enter en "Nuevo trabajo" abre su ventana', await hay('#input-titulo-trabajo'));
  await escribirEn('#input-titulo-trabajo', TITULO);
  await enterSeQueda('Nuevo trabajo', 'input-titulo-trabajo');
  await tecla('ArrowDown'); ok('↓ desde Título baja a Cliente', (await foco()) === 'select-cliente-trabajo', await foco());
  await page.select('#select-cliente-trabajo', await opcionCon('#select-cliente-trabajo', CLI)); await pausa(400);
  await enterSeQueda('Nuevo trabajo', 'input-direccion-trabajo');
  ok('La ventana sigue abierta tras los Enter', await hay('#input-titulo-trabajo'));
  const chip = await page.evaluate((n) => { const b = [...document.querySelectorAll('button[id^="chip-trabajador-"]')].find((x) => x.textContent.toUpperCase().includes(n)); return b ? b.id : ''; }, TRAB);
  if (chip) { await page.focus('#' + chip); await tecla('Enter'); }
  ok('Enter en el chip asigna al técnico', !!chip && (await page.$eval('#' + chip, (b) => b.textContent.trim().startsWith('✓'))), chip && await page.$eval('#' + chip, (b) => b.textContent.trim()));
  // (al final: Enter en la hora abre su lista, que se cierra con Escape)
  await enterSeQueda('Nuevo trabajo', 'input-hora-inicio-trabajo'); await tecla('Escape'); await pausa(300);
  ok('Escape cierra la lista de la hora, no la ventana', await hay('#btn-guardar-trabajo'));
  await page.focus('#btn-guardar-trabajo'); await tecla('Enter'); await esperarAviso(); await cerrarAviso(); await pausa(800);
  const filaT = await sql(`select t.estado, count(a.*) from agenda_trabajos t left join agenda_trabajadores a on a.trabajo_id = t.id where t.titulo ilike '%${sello}%' group by t.estado`);
  ok('El trabajo se guarda en la base con su técnico', /\|1$/.test(filaT), filaT);
  for (const v of ['dia', 'semana', 'mes']) {
    await page.focus(`#btn-vista-${v}`); await tecla('Enter'); await pausa(1300);
    ok(`Sale en la vista ${v}`, (await texto()).includes(TITULO));
  }
  await page.focus('#btn-vista-dia'); await tecla('Enter'); await pausa(1300);
  const tarjeta = await page.evaluate((t) => { const c = [...document.querySelectorAll('[data-tarjeta-trabajo="true"]')].find((x) => x.innerText.toUpperCase().includes(t)); return c ? c.id : ''; }, TITULO);
  if (tarjeta) { await page.focus('#' + tarjeta); await tecla('Enter'); await pausa(1200); }
  ok('Enter en la tarjeta abre el detalle del trabajo', await hay('#btn-generar-salida'));
  await page.focus('#btn-generar-salida'); await tecla('Enter'); await pausa(1200);
  const cliSalida = await page.evaluate((c) => { const s = document.getElementById('select-cliente-salida'); return !!s && (s.options[s.selectedIndex]?.text || '').toUpperCase().includes(c); }, CLI);
  ok('"Generar salida" abre la salida con el cliente del trabajo', cliSalida);
  await tecla('Escape'); await pausa(800);
  await page.screenshot({ path: path.join(aqui, 'captura-agenda-nego.png') });
  // (Generar salida cierra el detalle: se vuelve a abrir con Enter en la tarjeta)
  for (let i = 0; i < 2 && (await page.evaluate(() => !!document.querySelector('.ventana-sobria, [role="dialog"]'))) && !(await hay('#btn-eliminar-trabajo')); i++) { await tecla('Escape'); await pausa(500); }
  if (!(await hay('#btn-eliminar-trabajo')) && tarjeta) { await page.focus('#' + tarjeta); await tecla('Enter'); await pausa(1200); }
  if (await hay('#btn-eliminar-trabajo')) {
    await page.focus('#btn-eliminar-trabajo'); await tecla('Enter'); await esperarAviso(3000); await tecla('Enter'); await pausa(1800); await cerrarAviso();
    ok('Eliminar el trabajo desde el detalle', (await sql(`select count(*) from agenda_trabajos where titulo ilike '%${sello}%'`)) === '0');
  } else ok('Se abre el detalle para eliminar', false);
  for (let i = 0; i < 3 && (await page.evaluate(() => !!document.querySelector('.ventana-sobria, [role="dialog"]'))); i++) { await tecla('Escape'); await pausa(400); }

  // ---------- TALLER ----------
  await page.evaluate(() => document.getElementById('sidebar-btn-taller')?.click()); await pausa(2000);
  ok('Taller abre (ya no dice "Pronto")', (await hay('#btn-nueva-orden-taller')) && !(await hay('#pronto-taller')));
  await page.focus('#btn-nueva-orden-taller'); await tecla('Enter'); await pausa(1000);
  ok('Enter en "Recibir equipo" abre su ventana', await hay('#orden-taller-cliente'));
  await page.select('#orden-taller-cliente', await opcionCon('#orden-taller-cliente', CLI)); await pausa(400);
  await escribirEn('#orden-taller-tipo', EQUIPO);
  await enterSeQueda('Recibir equipo', 'orden-taller-tipo');
  await escribirEn('#orden-taller-marca', 'ASUS'); await enterSeQueda('Recibir equipo', 'orden-taller-marca');
  await escribirEn('#orden-taller-serie', `SN-${sello}`);
  await escribirEn('#orden-taller-falla', 'NO ENCIENDE');
  await escribirEn('#orden-taller-mano-obra', '180'); await enterSeQueda('Recibir equipo', 'orden-taller-mano-obra');
  await escribirEn('#orden-taller-adelanto', '60');
  ok('La ventana sigue abierta tras los Enter (no se guardó sola)', (await hay('#orden-taller-cliente')) && (await sql(`select count(*) from taller_ordenes where tipo_equipo ilike '%${sello}%'`)) === '0');
  if (await page.$eval('#orden-taller-check-ticket', (e) => e.checked)) { await page.focus('#orden-taller-check-ticket'); await tecla('Enter'); }
  ok('Enter en "Imprimir ticket" lo desmarca', !(await page.$eval('#orden-taller-check-ticket', (e) => e.checked)));
  await page.focus('#btn-guardar-orden-taller'); await tecla('Enter'); await esperarAviso(15000); await cerrarAviso(); await pausa(1200);
  const orden = await sql(`select total, adelanto, saldo, estado from taller_ordenes where tipo_equipo ilike '%${sello}%'`);
  ok('La orden se guarda: total 180, adelanto 60, saldo 120', /^180(\.00)?\|60(\.00)?\|120(\.00)?\|/.test(orden), orden);
  const fila = await page.evaluate((s) => { const f = [...document.querySelectorAll('#tabla-ordenes-taller tbody tr')].find((x) => x.innerText.includes(s)); return f ? f.id : ''; }, sello);
  ok('La orden sale en la tabla', !!fila);
  if (fila) { await page.focus('#' + fila); await tecla('Enter'); await pausa(1500); }
  ok('Enter en la fila abre el detalle de la orden', await hay('#taller-select-estado'));
  await page.select('#taller-select-estado', 'DIAGNOSTICO'); await pausa(600); await cerrarAviso();
  await escribirEn('#taller-input-diagnostico', `CORTO EN BACKLIGHT ${sello}`);
  await page.focus('#btn-guardar-detalle-taller'); await tecla('Enter'); await esperarAviso(); await cerrarAviso();
  ok('Estado y diagnóstico se guardan', /^DIAGNOSTICO\|CORTO/.test(await sql(`select estado, diagnostico from taller_ordenes where tipo_equipo ilike '%${sello}%'`)));
  await page.focus('#btn-tab-taller-repuestos'); await tecla('Enter'); await pausa(700);
  await escribirEn('#taller-input-repuesto-desc', `FLEX EDP ${sello}`); await enterSeQueda('Repuestos', 'taller-input-repuesto-desc');
  await escribirEn('#taller-input-repuesto-cant', '1'); await escribirEn('#taller-input-repuesto-precio', '50');
  ok('Enter en los campos del repuesto no lo agrega solo', (await sql(`select count(*) from taller_repuestos r join taller_ordenes o on o.id = r.orden_id where o.tipo_equipo ilike '%${sello}%'`)) === '0');
  await page.focus('#btn-agregar-repuesto-taller'); await tecla('Enter'); await pausa(1200); await cerrarAviso();
  ok('Enter en "Agregar" agrega el repuesto y suma al total', /^230(\.00)?\|/.test(await sql(`select total, saldo from taller_ordenes where tipo_equipo ilike '%${sello}%'`)), await sql(`select total, saldo from taller_ordenes where tipo_equipo ilike '%${sello}%'`));
  // Repuesto DEL INVENTARIO (paso 3g, pedido del dueño): descuenta stock y, al quitarlo de la orden, vuelve
  const prod = await sql(`select p.id, p.quantity from products p where p.is_active = 1 and exists (select 1 from batches b where b.product_id = p.id and coalesce(b.quantity,0) >= 2 and coalesce(b.is_active,1) <> 0) order by p.id limit 1`);
  if (prod) {
    const [pid, cant] = prod.split('|'); const stock = () => sql(`select quantity, (select sum(quantity) from batches where product_id = ${pid}) from products where id = ${pid}`);
    const antes = await stock();
    await page.select('#taller-select-repuesto-prod', pid); await pausa(400);
    await escribirEn('#taller-input-repuesto-cant', '1');
    await page.focus('#btn-agregar-repuesto-taller'); await tecla('Enter'); await pausa(1200); await cerrarAviso();
    const tras = await stock();
    ok('Repuesto del inventario: el stock y los lotes bajan 1', tras.split('|').every((v, k) => Number(v) === Number(antes.split('|')[k]) - 1), `${antes} → ${tras}`);
    const quitar = await page.evaluate(() => { const b = [...document.querySelectorAll('button[id^="btn-eliminar-repuesto-"]')]; return b.length ? b[b.length - 1].id : ''; });
    ok('El repuesto del inventario se puede quitar con Enter', !!quitar, quitar);
    if (quitar) { await page.focus('#' + quitar); await tecla('Enter'); await esperarAviso(3000); await tecla('Enter'); await pausa(1300); await cerrarAviso(); }
    // 17/11/2026: comparar por número (10.00|10.000 y 10|10 son lo mismo) y esperar de verdad
    // a que termine la devolución del trigger antes de medir.
    const mismoStock = (a, b) => a.split('|').every((v, k) => Number(v) === Number(b.split('|')[k]));
    for (let i = 0; i < 40 && !mismoStock(await stock(), antes); i++) await pausa(250);
    const vuelto = await stock();
    ok('Al quitarlo de la orden, el stock vuelve', mismoStock(vuelto, antes), `${antes} → ${vuelto}`);
    ok('El total vuelve a 230', Number(await sql(`select total from taller_ordenes where tipo_equipo ilike '%${sello}%'`)) === 230);
    void cant;
  } else ok('Hay un producto con lotes para probar el repuesto del inventario', false);
  await page.focus('#btn-tab-taller-pagos'); await tecla('Enter'); await pausa(700);
  await page.focus('#btn-abrir-pago-taller'); await tecla('Enter'); await pausa(900);
  await escribirEn('#pago-taller-monto', '50'); await enterSeQueda('Cobro', 'pago-taller-monto');
  await escribirEn('#pago-taller-referencia', `OP-${sello}`);
  ok('Enter en el monto no guarda el cobro solo', (await sql(`select count(*) from taller_pagos p join taller_ordenes o on o.id = p.orden_id where o.tipo_equipo ilike '%${sello}%'`)) === '1');
  await page.focus('#btn-guardar-pago-taller'); await tecla('Enter'); await esperarAviso(); await cerrarAviso(); await pausa(800);
  ok('El cobro se guarda: adelanto 110, saldo 120', /^110(\.00)?\|120(\.00)?$/.test(await sql(`select adelanto, saldo from taller_ordenes where tipo_equipo ilike '%${sello}%'`)), await sql(`select adelanto, saldo from taller_ordenes where tipo_equipo ilike '%${sello}%'`));
  await page.screenshot({ path: path.join(aqui, 'captura-taller-nego.png') });
  for (let i = 0; i < 3 && (await page.evaluate(() => !!document.querySelector('.ventana-sobria, [role="dialog"]'))); i++) { await tecla('Escape'); await pausa(500); }
  await page.focus('#buscador-taller'); await page.keyboard.type(sello); await pausa(700);
  ok('El buscador encuentra la orden', (await page.$$eval('#tabla-ordenes-taller tbody tr', (t) => t.filter((x) => x.innerText.includes(x.ownerDocument.getElementById('buscador-taller').value)).length)) >= 1);
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  try { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await pausa(300); } await cerrarAviso(); await restaurarTipo(tiposAntes); ok('Tipo de negocio restaurado a como estaba', (await tipoActual()) === tiposAntes, tiposAntes); } catch { /* */ }
  await nav.close();
  try {
    await sql(`create temp table o as select codigo from taller_ordenes where tipo_equipo ilike '%${sello}%';
      delete from cash_movements where description ilike '%${sello}%';
      delete from taller_pagos where orden_id in (select id from taller_ordenes where tipo_equipo ilike '%${sello}%');
      delete from taller_repuestos where orden_id in (select id from taller_ordenes where tipo_equipo ilike '%${sello}%');
      delete from taller_ordenes where tipo_equipo ilike '%${sello}%';
      delete from inventory_movements where reason in (select 'Repuesto Taller ' || codigo from o union select 'Repuesto quitado Taller ' || codigo from o);
      delete from agenda_trabajadores where trabajo_id in (select id from agenda_trabajos where titulo ilike '%${sello}%');
      delete from agenda_trabajos where titulo ilike '%${sello}%';
      delete from trabajadores where nombre = '${TRAB}';
      delete from customers where name = '${CLI}';`);
  } catch (e) { res.push('MAL limpieza — ' + e.message); }
  console.log(res.join('\n'));
}
