// Prueba del 12/11/2026 (SiuMax Nego, paso 3h, parte 2), con teclado: Utilidades con las pestañas de Talleres y
// servicios (Rentabilidad, Técnicos, Materiales, Cobranzas). Crea datos de ejemplo con valores conocidos y revisa los
// números de cada pestaña; también que solo Comercio quede igual que siempre y que solo Servicios no vea Productos.
// Al final borra lo creado y deja el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/prueba-utilidades-servicios-nego.mjs <carpeta tools con puppeteer-core>
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
const aceptar = async () => { await pausa(400); if (await aviso()) { await tecla('Enter'); await pausa(500); } };
const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
const elegir = async (tipos) => {
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
  await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
  for (const t of ['servicios', 'comercio']) if (tipos.includes(t) && (await marcado(t)) !== 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  for (const t of ['comercio', 'servicios']) if (!tipos.includes(t) && (await marcado(t)) === 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  await page.focus('#btn-guardar-tipo-negocio'); await tecla('Enter'); await pausa(1500); await aceptar();
};
const ir = async (sec) => { await page.evaluate((s) => document.getElementById(`sidebar-btn-${s}`)?.click(), sec); await pausa(2500); };
const tabs = () => page.$$eval('[id^="btn-tab-util-"]', (b) => b.map((x) => x.id.replace('btn-tab-util-', '')).join(','));
// Fila de la tabla que contiene un texto → sus celdas
const fila = (txt) => page.evaluate((t) => {
  const tr = [...document.querySelectorAll('tbody tr')].find((x) => x.innerText.toUpperCase().includes(t.toUpperCase()));
  return tr ? [...tr.querySelectorAll('td')].map((td) => td.innerText.trim().replace(/\s+/g, ' ')) : null;
}, txt);
const tiene = (celdas, ...valores) => !!celdas && valores.every((v) => celdas.some((c) => c.replace(/,/g, '').includes(v)));

const sello = String(Date.now()).slice(-6);
const CLI = `PRUEBA AUTO CLIENTE UTIL ${sello}`; const TEC = `PRUEBA AUTO TECNICO UTIL ${sello}`;
const ids = {};

try {
  // Datos de ejemplo (este mes): cotización aprobada 500 (pagado 200), orden del taller 300 (pagada) con repuesto de 40,
  // contrato con cuota 320 (pagado 150) y una visita hecha con consumo de 25, salida sin cotización con material de 2 × 10
  const r = await sql(`
    insert into customers (name, activo) values ('${CLI}', true) returning id;
    insert into trabajadores (nombre, cargo, estado) values ('${TEC}', 'TECNICO', 'ACTIVO') returning id;`);
  [ids.cli, ids.tec] = r.split('\n').filter((l) => /^\d+$/.test(l));
  const r2 = await sql(`
    insert into cotizaciones (numero, cliente_nombre, cliente_id, fecha_emision, estado, total, adelanto, moneda, observaciones) values ('COT-U${sello}', '${CLI}', '${ids.cli}', now(), 'APROBADA', 500, 200, 'PEN', 'PRUEBA AUTO PINTURA ${sello}') returning id;
    insert into taller_ordenes (codigo, customer_id, tipo_equipo, falla_reportada, estado, total, adelanto, costo_mano_obra, costo_repuestos, tecnico_id, fecha_ingreso, fecha_entrega) values ('ORD-U${sello}', ${ids.cli}, 'PRUEBA AUTO LAPTOP', 'X', 'ENTREGADO', 300, 300, 260, 40, ${ids.tec}, now(), now()) returning id;
    insert into contratos (codigo, customer_id, titulo, fecha_inicio, frecuencia, precio_periodo, estado) values ('CON-U${sello}', ${ids.cli}, 'PRUEBA AUTO PISCINA ${sello}', current_date, 'MENSUAL', 320, 'ACTIVO') returning id;
    insert into salidas (codigo, customer_id, tipo, estado, observaciones) values ('SAL-U${sello}', ${ids.cli}, 'OBRA', 'FINALIZADO', 'PRUEBA AUTO OBRA ${sello}') returning id;`);
  [ids.coti, ids.orden, ids.con, ids.sal] = r2.split('\n').filter((l) => /^\d+$/.test(l));
  const r3 = await sql(`
    insert into taller_repuestos (orden_id, product_id, descripcion, cantidad, costo_unitario, precio_unitario, subtotal, es_externo) values (${ids.orden}, null, 'PRUEBA AUTO PANTALLA ${sello}', 1, 40, 60, 60, true);
    insert into contrato_cobros (contrato_id, customer_id, periodo, monto, monto_pagado, estado, fecha_emision, fecha_vencimiento) values (${ids.con}, ${ids.cli}, 'PRUEBA', 320, 150, 'PARCIAL', current_date, current_date + 10);
    insert into contrato_visitas (contrato_id, tecnico_id, estado, fecha_programada, fecha_ejecutada) values (${ids.con}, ${ids.tec}, 'REALIZADO', current_date, current_date) returning id;`);
  ids.visita = r3.split('\n').filter((l) => /^\d+$/.test(l))[0];
  await sql(`
    insert into contrato_consumos (visita_id, product_id, descripcion, cantidad, unidad, costo_unitario, subtotal_costo) values (${ids.visita}, null, 'PRUEBA AUTO CLORO ${sello}', 5, 'KG', 5, 25);
    insert into salida_items (salida_id, descripcion, unidad, cantidad, cantidad_devuelta, costo_unitario, es_externo) values (${ids.sal}, 'PRUEBA AUTO CEMENTO ${sello}', 'BOL', 2, 0, 10, true);
    insert into salida_trabajadores (salida_id, trabajador_id) values (${ids.sal}, ${ids.tec});`);

  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  // Solo Comercio: igual que siempre
  await elegir(['comercio']); await ir('utilidades');
  ok('Solo Comercio: Utilidades sin pestañas nuevas (igual que siempre)', (await tabs()) === '' && (await hay('#buscador-global-utilidades')), await tabs());

  // Comercio + Servicios
  await elegir(['comercio', 'servicios']); await ir('utilidades');
  ok('Con Servicios: pestañas Productos, Rentabilidad, Técnicos, Materiales y Cobranzas', (await tabs()) === 'productos,rentabilidad,tecnicos,materiales,cobranzas', await tabs());
  await page.focus('#btn-tab-util-productos'); await tecla('ArrowRight');
  ok('→ desde Productos va a Rentabilidad', (await foco()) === 'btn-tab-util-rentabilidad', await foco());
  await tecla('Enter'); await pausa(3000);
  ok('Enter abre Rentabilidad y el selector se queda en su pestaña', (await hay('#buscador-reporte-rentabilidad')) && (await foco()) === 'btn-tab-util-rentabilidad', await foco());
  const c = await fila(`COT-U${sello}`); ok('Rentabilidad: la cotización aprobada (ingreso 500, sin costo)', tiene(c, '500.00', 'SERVICIO'), JSON.stringify(c));
  const o = await fila(`ORD-U${sello}`); ok('Rentabilidad: la orden del taller (300, repuesto 40, utilidad 260)', tiene(o, 'TALLER', '300.00', '40.00', '260.00'), JSON.stringify(o));
  const k = await fila(`CON-U${sello}`); ok('Rentabilidad: el contrato (cuota 320, consumo 25)', tiene(k, 'CONTRATO', '320.00', '25.00', '295.00'), JSON.stringify(k));
  const sa = await fila(`SAL-U${sello}`); ok('Rentabilidad: la salida sin cotización (costo 20)', tiene(sa, 'OBRA', '20.00'), JSON.stringify(sa));
  await page.focus('#buscador-reporte-rentabilidad'); await tecla('ArrowDown');
  ok('↓ desde el buscador baja a la primera fila', await page.evaluate(() => document.activeElement?.getAttribute('data-fila-grafico') === 'true'));
  await tecla('ArrowUp'); ok('↑ desde la primera fila vuelve al buscador', (await foco()) === 'buscador-reporte-rentabilidad', await foco());
  await page.select('#filtro-tipo-graficos', 'TALLER'); await pausa(500);
  ok('Filtro TALLER: solo órdenes del taller', (await page.$$eval('tbody tr', (t) => t.every((x) => /TALLER/.test(x.innerText)))) && !!(await fila(`ORD-U${sello}`)));

  await page.focus('#btn-tab-util-tecnicos'); await tecla('Enter'); await pausa(800);
  const t = await fila(TEC); ok('Técnicos: el técnico con su orden del taller, su salida y su visita', !!t, JSON.stringify(t));
  await page.focus('#btn-tab-util-materiales'); await tecla('Enter'); await pausa(800);
  ok('Materiales: repuesto del taller (40), material de la salida (20) y consumo del contrato (25)',
    tiene(await fila(`PANTALLA ${sello}`), '40.00') && tiene(await fila(`CEMENTO ${sello}`), '20.00') && tiene(await fila(`CLORO ${sello}`), '25.00'),
    JSON.stringify([await fila(`PANTALLA ${sello}`), await fila(`CEMENTO ${sello}`), await fila(`CLORO ${sello}`)]));
  await page.focus('#btn-tab-util-cobranzas'); await tecla('Enter'); await pausa(800);
  ok('Cobranzas: la cotización debe 300', tiene(await fila(`COT-U${sello}`), '300.00'), JSON.stringify(await fila(`COT-U${sello}`)));
  ok('Cobranzas: la cuota del contrato debe 170', tiene(await fila(`CON-U${sello}`), '170.00'), JSON.stringify(await fila(`CON-U${sello}`)));
  ok('Cobranzas: la orden pagada no aparece', !(await fila(`ORD-U${sello}`)));
  await page.screenshot({ path: path.join(aqui, 'captura-utilidades-servicios.png') });
  await page.focus('#btn-tab-util-productos'); await tecla('Enter'); await pausa(2500);
  ok('Productos vuelve a la vista de siempre (con sus pestañas al lado)', (await hay('#buscador-global-utilidades')) && (await tabs()).startsWith('productos'));

  // Solo Servicios: sin Productos
  await elegir(['servicios']); await ir('utilidades');
  ok('Solo Servicios: sin la pestaña Productos y abre Rentabilidad', (await tabs()) === 'rentabilidad,tecnicos,materiales,cobranzas' && (await hay('#buscador-reporte-rentabilidad')), await tabs());
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  try { await elegir(['comercio']); } catch { /* */ }
  await nav.close();
  try {
    await sql(`
      delete from salida_trabajadores where salida_id = ${ids.sal || 0}; delete from salida_items where salida_id = ${ids.sal || 0}; delete from salidas where id = ${ids.sal || 0};
      delete from contrato_consumos where visita_id = ${ids.visita || 0}; delete from contrato_visitas where contrato_id = ${ids.con || 0};
      delete from contrato_cobros where contrato_id = ${ids.con || 0}; delete from contratos where id = ${ids.con || 0};
      delete from taller_repuestos where orden_id = ${ids.orden || 0}; delete from taller_ordenes where id = ${ids.orden || 0};
      delete from cotizaciones where id = ${ids.coti || 0};
      delete from trabajadores where nombre = '${TEC}'; delete from customers where name = '${CLI}';`);
  } catch (e) { res.push('MAL limpieza — ' + e.message); }
  console.log(res.join('\n'));
}
