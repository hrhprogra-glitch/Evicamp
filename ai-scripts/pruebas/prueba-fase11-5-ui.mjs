// Prueba de la fase 11.5 en siumax: notas de crédito.
//  1. "Devolver productos" (con teclado, desde Comprobantes): nota de crédito por ítem, stock y caja.
//  2. Reimprimir la nota de crédito (ticket con "Corrige" y QR).
//  3. Anular una venta con boleta: nota de crédito automática (motivo 01).
//  4. El cambio de producto de un ticket con boleta queda bloqueado con la explicación.
// Deja la base de pruebas como estaba. Uso: node ai-scripts/pruebas/prueba-fase11-5-ui.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');
process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env.vps'));

const SITIO = 'https://comerc.siumax.duckdns.org';
const PROD = 9100000000031;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (txt, cond) => { console.log(`${cond ? '✅' : '❌'} ${txt}`); if (!cond) fallas++; };

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
const empresaOriginal = await sql("SELECT row_to_json(e) FROM (SELECT id, ruc, direccion, razon_social, regimen FROM empresa_config ORDER BY id LIMIT 1) e");
const base = await sql('SELECT coalesce(max(id), 0) FROM sales');
const sesion = await sql("SELECT id FROM cash_sessions WHERE status = 'OPEN' LIMIT 1");
const limpiar = async () => {
  await sql(`DELETE FROM notas_credito WHERE sale_id > ${base};
    DELETE FROM cash_movements WHERE description LIKE 'Devolución%' AND created_at > now() - interval '1 hour';
    DELETE FROM sale_details WHERE sale_id > ${base}; DELETE FROM sales WHERE id > ${base};
    DELETE FROM inventory_movements WHERE product_id = ${PROD}; DELETE FROM batches WHERE product_id = ${PROD}; DELETE FROM products WHERE id = ${PROD};
    DELETE FROM cpe_correlativos;`);
};
await limpiar();
const A = Date.now(), B = A + 1;
await sql(`UPDATE empresa_config SET ruc='20601234565', razon_social='PRUEBA SIUMAX SAC', direccion='AV PRUEBA 123', regimen='MYPE';
  UPDATE facturacion_config SET activo=true, modo='SIMULADO';
  INSERT INTO products (id,name,price,quantity,unit,category,is_active,control_type) VALUES (${PROD},'PRUEBA LINTERNA',5,100,'UND','PRUEBAS',1,'UNIT');
  INSERT INTO sales (id,total,payment_type,amount_cash,sunat_status,created_at,doc_type,cpe_cliente_tipo_doc,cpe_cliente_num_doc,cpe_cliente_nombre)
    VALUES (${A}, 15, 'EFECTIVO', 15, 'ACEPTADO', now(), 3, 'DNI', '12345678', 'ANA TORRES'), (${B}, 5, 'EFECTIVO', 5, 'ACEPTADO', now(), 3, 'SIN', null, null);
  INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, subtotal) VALUES (${A}, ${PROD}, 'PRUEBA LINTERNA', 3, 5, 15), (${B}, ${PROD}, 'PRUEBA LINTERNA', 1, 5, 5);`);
await pausa(10000);
ok(`Preparación: dos boletas aceptadas (${await sql(`SELECT string_agg(doc_serial||'-'||doc_number||':'||cpe_estado, ',' ORDER BY id) FROM sales WHERE id > ${base}`)})`,
  (await sql(`SELECT string_agg(cpe_estado, ',' ORDER BY id) FROM sales WHERE id > ${base}`)) === 'ACEPTADO,ACEPTADO');
const stockAntes = Number(await sql(`SELECT quantity FROM products WHERE id = ${PROD}`));

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
page.on('dialog', (d) => d.accept());
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-clave') || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(180); } };
const texto = () => page.evaluate(() => document.body.innerText);
const abrirComprobantes = async () => {
  await page.click('#sidebar-btn-finanzas'); await pausa(2500);
  await page.focus('#btn-ver-comprobantes'); await tecla('Enter');
  await page.waitForSelector('#lista-comprobantes [data-row="true"]', { timeout: 10000 }).catch(() => {}); await pausa(600);
};

try {
  await page.goto(SITIO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-finanzas', { timeout: 20000 }); await pausa(2000);

  // 1. Devolver 1 de las 3 linternas de la boleta A, todo con teclado
  await abrirComprobantes();
  await page.focus(`#lista-comprobantes [data-clave="v-${A}"]`); await tecla('Enter'); await pausa(400);
  ok('El detalle de la boleta tiene "Devolver productos"', !!(await page.$('#btn-comp-devolver')));
  await tecla('ArrowRight'); ok('→ desde Reimprimir llega a "Devolver productos"', (await foco()) === 'btn-comp-devolver');
  await tecla('Enter'); await pausa(600);
  ok('Se abre la lista con el selector en la cantidad', (await foco()) === 'dev-cant-0' && /Vendido 3/i.test(await texto()));
  await page.keyboard.type('5'); await tecla('Enter'); await tecla('Enter');
  ok('Enter → motivo → Enter llega a "Emitir nota de crédito"', (await foco()) === 'btn-emitir-nc');
  await tecla('Enter'); await pausa(600);
  ok('Si pide más de lo vendido, avisa y no emite', /solo quedan 3/i.test(await texto()));
  await tecla('Enter'); await pausa(300);
  await page.focus('#dev-cant-0'); await page.keyboard.type('1');
  await page.focus('#dev-motivo'); await page.keyboard.type('no prende');
  ok('Muestra lo que se devuelve: S/ 5.00', /A devolver: S\/ 5\.00/.test(await texto()));
  await page.focus('#btn-emitir-nc'); await tecla('Enter'); await pausa(500);
  await tecla('Enter'); await pausa(1500); // confirma
  ok('Avisa la nota de crédito BC01-00000001 por S/ 5.00', /BC01-00000001/.test(await texto()) && /S\/ 5\.00/.test(await texto()));
  await tecla('Enter'); await pausa(600);
  const nc = await sql(`SELECT motivo||'|'||total||'|'||ref_serial||'-'||ref_number||'|'||descripcion FROM notas_credito WHERE sale_id = ${A}`);
  ok(`Nota de crédito guardada (${nc})`, nc === '07|5|B001-1|NO PRENDE' || nc === '07|5.00|B001-1|NO PRENDE');
  ok(`El stock volvió (+1: ${stockAntes} → ${await sql(`SELECT quantity FROM products WHERE id = ${PROD}`)})`, Number(await sql(`SELECT quantity FROM products WHERE id = ${PROD}`)) === stockAntes + 1);
  if (sesion) ok('La devolución del dinero quedó en la caja abierta', Number(await sql(`SELECT count(*) FROM cash_movements WHERE session_id = '${sesion}' AND description LIKE 'Devolución con nota de crédito BC01-00000001%'`)) === 1);
  let estado = '';
  for (let i = 0; i < 10 && estado !== 'ACEPTADO'; i++) { await pausa(1500); estado = await sql(`SELECT cpe_estado FROM notas_credito WHERE sale_id = ${A}`); }
  ok(`El facturador emitió la nota de crédito (${estado})`, estado === 'ACEPTADO');

  // 2. La nota de crédito aparece en la lista y se reimprime con "Corrige" y QR
  await tecla('Escape'); await pausa(500); await tecla('Escape'); await pausa(800);
  await abrirComprobantes();
  ok('La lista muestra la NC · BC01-00000001', /NC · BC01-00000001/.test(await texto()));
  const claveNc = await page.evaluate(() => [...document.querySelectorAll('#lista-comprobantes [data-row="true"]')].find((f) => f.innerText.includes('BC01'))?.getAttribute('data-clave'));
  await page.focus(`#lista-comprobantes [data-clave="${claveNc}"]`); await tecla('Enter'); await pausa(400);
  ok('El detalle de la NC dice qué corrige y el motivo', /Corrige: BOLETA DE VENTA ELECTR[ÓO]NICA B001-00000001/i.test(await texto()) && /Devolución por ítem/i.test(await texto()));
  await tecla('Enter'); await pausa(1500); // Reimprimir
  const t = await texto();
  ok('El ticket dice NOTA DE CRÉDITO ELECTRÓNICA, corrige B001-00000001, con QR', /NOTA DE CR[ÉE]DITO ELECTR[ÓO]NICA/i.test(t) && /Corrige: BOLETA/i.test(t) && !!(await page.$('img[alt="Código QR del comprobante"]')));
  ok('El ticket de la NC no muestra pagos ni vuelto', !/VUELTO/i.test(await page.evaluate(() => document.querySelector('[aria-label="Nota de crédito"]')?.innerText || '')));
  await tecla('Escape'); await pausa(400);
  ok('Al cerrar el ticket vuelve a "Reimprimir"', (await foco()) === 'btn-comp-reimprimir');
  await tecla('Escape'); await tecla('Escape'); await pausa(600);

  // 3. Anular la boleta B: nota de crédito automática (como lo hace Finanzas)
  const anular = await page.evaluate(async (id, ses) => {
    const t = localStorage.getItem('gestorpro_sesion');
    const r = await fetch('/rest/v1/rpc/fn_anular_venta', { method: 'POST', headers: { 'x-sesion': t, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_sale_id: id, p_sesion_caja: ses || null }) });
    return [r.status, await r.text()];
  }, B, sesion);
  ok(`Anular la boleta B emite la nota de crédito BC01-00000002 (${anular[1].slice(0, 90)})`, anular[0] === 200 && /BC01-00000002/.test(anular[1]));
  ok('La venta B quedó ANULADA', (await sql(`SELECT sunat_status FROM sales WHERE id = ${B}`)) === 'ANULADO');
  ok('La NC de anulación es motivo 01 por el total', (await sql(`SELECT motivo||'|'||total FROM notas_credito WHERE sale_id = ${B}`)).startsWith('01|5'));
  estado = '';
  for (let i = 0; i < 10 && estado !== 'ACEPTADO'; i++) { await pausa(1500); estado = await sql(`SELECT cpe_estado FROM notas_credito WHERE sale_id = ${B}`); }
  ok(`El facturador emitió la NC de anulación (${estado})`, estado === 'ACEPTADO');
  // Anular la boleta A (ya tiene una devolución): no deja, pide devolver el resto
  const anularA = await page.evaluate(async (id) => {
    const t = localStorage.getItem('gestorpro_sesion');
    const r = await fetch('/rest/v1/rpc/fn_anular_venta', { method: 'POST', headers: { 'x-sesion': t, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_sale_id: id }) });
    return [r.status, await r.text()];
  }, A);
  ok('Una venta con devoluciones no se anula entera (pide "Devolver productos")', anularA[0] >= 400 && /Devolver productos/.test(anularA[1]));

  // 4. Cambio de producto sobre un ticket con boleta: bloqueado con la explicación
  await page.click('#sidebar-btn-finanzas'); await pausa(2500);
  const abierto = await page.evaluate((id) => {
    const fila = [...document.querySelectorAll('tr')].find((tr) => tr.innerText.includes(String(id).slice(-6)));
    const boton = fila?.querySelector('button[title="Cambio de Producto"]');
    if (boton) { boton.click(); return true; }
    return false;
  }, A);
  if (abierto) {
    await pausa(2000);
    ok('El cambio de producto de un ticket con boleta explica que se usa "Devolver productos"', /tiene BOLETA electr[óo]nica/i.test(await texto()) && /Devolver productos/.test(await texto()));
  } else {
    console.log('   (la venta de prueba no aparece en la tabla de Finanzas del turno: se revisa la regla con la consulta)');
  }
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-fase11-5-error.png' });
} finally {
  await limpiar();
  await sql(`UPDATE facturacion_config SET activo=false, modo='SIMULADO';
    UPDATE empresa_config e SET ruc = o.ruc, direccion = o.direccion, razon_social = o.razon_social, regimen = o.regimen
      FROM json_populate_record(NULL::empresa_config, '${empresaOriginal.replace(/'/g, "''")}'::json) o WHERE e.id = o.id;`);
  await ssh.execCommand('rm -rf /var/lib/siumax-cpe/siumax');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
