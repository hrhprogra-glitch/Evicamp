// Prueba del 12/11/2026 (SiuMax Nego, paso 3g), con teclado: Contratos (de SiuMax Servic; adapta su prueba-fase6), con
// el negocio en "Comercio + Servicios". Crea un contrato, genera las visitas del mes, registra un consumo DEL
// INVENTARIO (descuenta stock por lotes) y uno externo, emite el período y registra un abono. Revisa que Enter deje el
// selector en su sitio. Al final borra lo creado, deja el stock como estaba y el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/prueba-contratos-nego.mjs <carpeta tools con puppeteer-core>
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
const texto = () => page.evaluate(() => document.body.innerText.toUpperCase());
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
const escribirEn = async (sel, t) => { await page.focus(sel); await page.$eval(sel, (e) => { e.value = ''; }); await page.keyboard.type(t); await pausa(150); };
const enterSeQueda = async (nombre, id) => { await page.focus('#' + id); await tecla('Enter'); await pausa(500); const f = await foco(); ok(`${nombre}: Enter en ${id} → el selector se queda`, f === id, f); };
const opcionCon = (sel, txt) => page.evaluate((s, t) => { const o = [...document.querySelector(s).options].find((x) => x.text.toUpperCase().includes(t)); return o ? o.value : ''; }, sel, txt);

const sello = String(Date.now()).slice(-6);
const CLI = `PRUEBA AUTO CLIENTE CONTRATO ${sello}`; const TRAB = `PRUEBA AUTO TECNICO CONTRATO ${sello}`;
const TITULO = `PRUEBA AUTO MANTENIMIENTO MENSUAL ${sello}`;
let prod = null; let lotes = '';

try {
  await sql(`insert into customers (name, dni, direccion, telefono, activo) values ('${CLI}', '78${sello}', 'AV. LOS LAURELES 999', '987112233', true);
             insert into trabajadores (nombre, cargo, estado) values ('${TRAB}', 'TECNICO', 'ACTIVO');`);
  // Producto con lotes para el consumo del inventario (se guarda su stock para dejarlo igual al final)
  const p = await sql(`select p.id, p.name, p.quantity from products p where p.is_active = 1 and exists (select 1 from batches b where b.product_id = p.id and coalesce(b.quantity,0) >= 2 and coalesce(b.is_active,1) <> 0) order by p.id limit 1`);
  if (p) { const [id, name, quantity] = p.split('|'); prod = { id, name, quantity }; lotes = await sql(`select id, quantity from batches where product_id = ${id}`); }
  ok('Hay un producto con lotes para probar el consumo', !!prod, prod ? `${prod.name} (stock ${prod.quantity})` : '');

  await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);
  await elegir(['comercio', 'servicios']);

  await page.focus('#sidebar-btn-contratos'); await tecla('Enter'); await pausa(2000);
  ok('Contratos abre (ya no dice "Pronto")', (await hay('#buscador-contratos')) && !(await hay('#pronto-contratos')));
  ok('Filtro de vista: Contratos, Visitas y Cobros', (await page.$$eval('#filtro-vista-contratos option', (o) => o.map((x) => x.value).join(','))) === 'contratos,visitas,cobros', await page.$$eval('#filtro-vista-contratos option', (o) => o.map((x) => x.value).join(',')));

  // Nuevo contrato
  await page.focus('#btn-nuevo-contrato'); await tecla('Enter'); await pausa(1000);
  ok('Enter en "Nuevo contrato" abre su ventana', await hay('#input-titulo-contrato'));
  await escribirEn('#input-titulo-contrato', TITULO); await enterSeQueda('Nuevo contrato', 'input-titulo-contrato');
  await page.select('#select-cliente-contrato', await opcionCon('#select-cliente-contrato', CLI)); await pausa(400);
  await page.select('#select-frecuencia-contrato', 'QUINCENAL');
  await escribirEn('#input-precio-contrato', '320'); await enterSeQueda('Nuevo contrato', 'input-precio-contrato');
  await page.select('#select-tecnico-contrato', await opcionCon('#select-tecnico-contrato', TRAB));
  ok('La ventana sigue abierta tras los Enter (no se guardó sola)', (await hay('#input-titulo-contrato')) && (await sql(`select count(*) from contratos where titulo ilike '%${sello}%'`)) === '0');
  await page.focus('#btn-guardar-contrato'); await tecla('Enter'); await aceptar(); await pausa(800);
  const con = await sql(`select frecuencia, precio_periodo, estado from contratos where titulo ilike '%${sello}%'`);
  ok('El contrato se guarda (quincenal, S/ 320)', /^QUINCENAL\|320/.test(con), con);
  await page.focus('#buscador-contratos'); await page.keyboard.type(sello); await pausa(900);
  ok('El buscador lo encuentra', (await texto()).includes(TITULO));

  // Detalle: visitas, consumos, cobro
  const ver = await page.evaluate(() => document.querySelector('button[id^="btn-ver-contrato-"]')?.id || '');
  if (ver) { await page.focus('#' + ver); await tecla('Enter'); await pausa(1300); }
  ok('Enter en "Ver" abre el detalle del contrato', await hay('#modal-titulo-detalle-contrato'));
  await page.focus('#btn-generar-visitas-mes'); await tecla('Enter'); await aceptar(); await aceptar(); await pausa(1000);
  const visitas = Number(await sql(`select count(*) from contrato_visitas v join contratos c on c.id = v.contrato_id where c.titulo ilike '%${sello}%'`));
  ok('Genera las visitas del mes', visitas >= 1, `${visitas} visita(s)`);

  if (prod) {
    let b = await page.evaluate(() => document.querySelector('button[id^="btn-consumo-visita-"]')?.id || '');
    if (b) { await page.focus('#' + b); await tecla('Enter'); await pausa(1200); }
    ok('Enter en "Insumos" abre el consumo', await hay('#modal-titulo-consumo'));
    await page.select('#select-producto-consumo', prod.id); await pausa(500);
    await enterSeQueda('Consumo', 'input-cantidad-consumo');
    await escribirEn('#input-cantidad-consumo', '1');
    await page.focus('#btn-guardar-consumo'); await tecla('Enter'); const a1 = await aceptar(); await pausa(800);
    ok('Consumo del inventario registrado', /correctamente/i.test(a1), a1);
    const despues = await sql(`select quantity from products where id = ${prod.id}`);
    ok('El stock del producto baja 1', Number(despues) === Number(prod.quantity) - 1, `${prod.quantity} → ${despues}`);
    const sumaLotes = await sql(`select sum(quantity) from batches where product_id = ${prod.id}`);
    ok('Y también sus lotes', Number(sumaLotes) === Number(despues), `lotes ${sumaLotes}`);
    ok('El consumo guarda su costo', Number(await sql(`select coalesce(max(costo_unitario), -1) from contrato_consumos where product_id = ${prod.id} and created_at > now() - interval '5 minutes'`)) >= 0);

    b = await page.evaluate(() => document.querySelector('button[id^="btn-consumo-visita-"]')?.id || '');
    if (b) { await page.focus('#' + b); await tecla('Enter'); await pausa(1200); }
    await page.focus('#check-es-externo'); await tecla('Enter'); await pausa(300);
    ok('Enter en "Fuera de inventario" lo marca', await hay('#input-nombre-externo'));
    await escribirEn('#input-nombre-externo', `PRUEBA AUTO CLORO ${sello}`); await enterSeQueda('Consumo', 'input-nombre-externo');
    await escribirEn('#input-cantidad-consumo', '2.5');
    await page.focus('#btn-guardar-consumo'); await tecla('Enter'); const a2 = await aceptar(); await pausa(800);
    ok('Consumo externo registrado (sin tocar stock)', /correctamente/i.test(a2) && Number(await sql(`select quantity from products where id = ${prod.id}`)) === Number(prod.quantity) - 1, a2);
  }

  await page.focus('#tab-modal-cobros'); await tecla('Enter'); await pausa(600);
  await page.focus('#btn-emitir-periodo'); await tecla('Enter'); await aceptar(); await pausa(900);
  ok('Emite el período de cobro', Number(await sql(`select count(*) from contrato_cobros k join contratos c on c.id = k.contrato_id where c.titulo ilike '%${sello}%'`)) === 1);
  const pagar = await page.evaluate(() => document.querySelector('button[id^="btn-pagar-cobro-"]')?.id || '');
  if (pagar) { await page.focus('#' + pagar); await tecla('Enter'); await pausa(1000); }
  ok('Enter en "Cobrar" abre el pago', await hay('#modal-titulo-pago-contrato'));
  await escribirEn('#input-monto-pago', '150'); await enterSeQueda('Pago', 'input-monto-pago');
  await escribirEn('#input-referencia-pago', `OPE-${sello}`); await enterSeQueda('Pago', 'input-referencia-pago');
  ok('Enter no guarda el pago solo', /^0/.test(await sql(`select k.monto_pagado from contrato_cobros k join contratos c on c.id = k.contrato_id where c.titulo ilike '%${sello}%'`)));
  await page.focus('#btn-guardar-pago'); await tecla('Enter'); await aceptar(); await pausa(900);
  const cobro = await sql(`select k.monto_pagado, k.estado from contrato_cobros k join contratos c on c.id = k.contrato_id where c.titulo ilike '%${sello}%'`);
  ok('Abono de 150 → PARCIAL', /^150(\.00)?\|PARCIAL$/.test(cobro), cobro);
  await page.screenshot({ path: path.join(aqui, 'captura-contratos-nego.png') });
  await page.focus('#btn-cerrar-detalle-contrato'); await tecla('Enter'); await pausa(600);

  await page.select('#filtro-vista-contratos', 'visitas'); await pausa(1000);
  ok('Pestaña Visitas muestra las visitas', (await texto()).includes(sello) || (await texto()).includes('PENDIENTE'));
  await page.select('#filtro-vista-contratos', 'cobros'); await pausa(1000);
  ok('Pestaña Cobros muestra el período PARCIAL', (await texto()).includes('PARCIAL'));
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  try { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await pausa(300); } await aceptar(500); await elegir(['comercio']); } catch { /* */ }
  await nav.close();
  try {
    await sql(`create temp table c as select id, codigo from contratos where titulo ilike '%${sello}%';
      create temp table ag as select agenda_trabajo_id as id from contrato_visitas where contrato_id in (select id from c) and agenda_trabajo_id is not null;
      delete from inventory_movements where reason in (select 'Consumo Contrato ' || codigo from c);
      delete from contrato_consumos where visita_id in (select id from contrato_visitas where contrato_id in (select id from c));
      delete from contrato_cobros where contrato_id in (select id from c);
      delete from contrato_visitas where contrato_id in (select id from c);
      delete from agenda_trabajadores where trabajo_id in (select id from ag);
      delete from agenda_trabajos where id in (select id from ag) or titulo ilike '%${sello}%';
      delete from contratos where id in (select id from c);
      delete from trabajadores where nombre = '${TRAB}';
      delete from customers where name = '${CLI}';`);
    if (prod) {
      const upd = lotes.split('\n').filter(Boolean).map((l) => { const [id, q] = l.split('|'); return `update batches set quantity = ${q === '' ? 'null' : q} where id = ${id};`; }).join('\n');
      await sql(`update products set quantity = ${prod.quantity} where id = ${prod.id};\n${upd}`);
      ok('Stock y lotes quedan como estaban', (await sql(`select quantity from products where id = ${prod.id}`)) === prod.quantity && (await sql(`select id, quantity from batches where product_id = ${prod.id}`)) === lotes);
    }
  } catch (e) { res.push('MAL limpieza — ' + e.message); }
  console.log(res.join('\n'));
}
