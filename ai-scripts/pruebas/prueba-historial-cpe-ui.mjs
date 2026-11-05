// Prueba: la ventana "Comprobantes" se juntó con Finanzas (sin duplicados), con teclado.
//  1. Caja: boleta con 2 gaseosas y 1 agua → SUNAT (modo prueba) la acepta.
//  2. Finanzas: la tabla muestra BOLETA B001-… y su estado; ya no hay botón "Comprobantes"; sí "Reporte contador".
//  3. Ticket: bloque SUNAT; [D] Devolver abre "Solo devolver" con TODAS las líneas → una nota de crédito por 2 productos.
//  4. El ticket muestra la nota de crédito y la reimprime (Escape cierra solo la nota).
//  5. Reporte del contador: abre y Escape vuelve al botón.
//  6. Un comprobante RECHAZADO aparece en el aviso rojo de Finanzas y de la Caja.
// Deja siumax como estaba. Uso: node ai-scripts/pruebas/prueba-historial-cpe-ui.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');
process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env.vps'));

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (txt, cond) => { console.log(`${cond ? '✅' : '❌'} ${txt}`); if (!cond) fallas++; };

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
const PRODUCTOS = "(SELECT id FROM products WHERE name IN ('GASEOSA INCA KOLA 1L', 'AGUA SAN LUIS 625ML'))";
const base = await sql('SELECT coalesce(max(id), 0) FROM sales');
const baseCaja = await sql('SELECT coalesce(max(id), 0) FROM cash_movements');
const baseMov = await sql('SELECT coalesce(max(id), 0) FROM inventory_movements');
const numeracion = await sql("SELECT coalesce(json_agg(c), '[]') FROM cpe_correlativos c");
const stock = JSON.parse(await sql(`SELECT json_build_object('p', (SELECT json_agg(json_build_object('id', id, 'q', quantity)) FROM products WHERE id IN ${PRODUCTOS}),
  'b', (SELECT json_agg(json_build_object('id', id, 'q', quantity)) FROM batches WHERE product_id IN ${PRODUCTOS}))`));
const facturacion = await sql("SELECT row_to_json(f) FROM (SELECT activo, modo, proveedor, comprobante_por_defecto FROM facturacion_config) f");
await sql("UPDATE facturacion_config SET activo = true, modo = 'PRUEBA', proveedor = 'SUNAT'");

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(170); } };
const texto = (sel) => page.$eval(sel, (e) => e.innerText).catch(() => '');
const esperar = async (consulta, meta, veces = 25) => { let v = ''; for (let i = 0; i < veces && v !== meta; i++) { await pausa(1500); v = await sql(consulta); } return v; };
const irAFinanzas = async () => {
  await page.click('#sidebar-btn-pos'); await pausa(800);
  await page.click('#sidebar-btn-finanzas'); await page.waitForSelector('tr[data-row="true"]', { timeout: 15000 }); await pausa(1500);
};
const filaDe = (venta) => page.evaluateHandle((t) => [...document.querySelectorAll('tr[data-row="true"]')].find((f) => f.innerText.includes(t) && !/devoluci|nota de cr/i.test(f.innerText)), venta.slice(-6));
const abrirTicket = async (venta) => { const fila = await filaDe(venta); await fila.asElement().focus(); await tecla('Enter'); await page.waitForSelector('#modal-detalle-ticket-container', { timeout: 8000 }); await pausa(1500); };

let venta = '';
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2000);

  // 1. Boleta: 2 gaseosas + 1 agua (S/ 11.50)
  await page.click('#sidebar-btn-pos'); await page.waitForSelector('#buscador-global-pos', { timeout: 15000 }); await pausa(2500);
  for (const nombre of ['GASEOSA INCA KOLA', 'GASEOSA INCA KOLA', 'AGUA SAN LUIS']) {
    await page.focus('#buscador-global-pos'); await page.keyboard.type(nombre, { delay: 25 }); await pausa(700);
    await tecla('Enter'); await pausa(800);
  }
  await tecla('F4'); await page.waitForSelector('#cobro-comp-BOLETA', { timeout: 8000 }); await pausa(600);
  await page.focus('#cobro-comp-BOLETA'); await tecla('Enter'); await pausa(200);
  await tecla('Enter'); await tecla('Enter');
  await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }); await pausa(500); await tecla('Enter'); await pausa(1000);
  venta = await sql(`SELECT id FROM sales WHERE id > ${base} AND doc_type = 3 ORDER BY id LIMIT 1`);
  ok(`Boleta de S/ ${Number(await sql(`SELECT total FROM sales WHERE id = ${venta}`)).toFixed(2)}`, Number(await sql(`SELECT total FROM sales WHERE id = ${venta}`)) === 11.5);
  ok('SUNAT (prueba) la aceptó', (await esperar(`SELECT cpe_estado FROM sales WHERE id = ${venta}`, 'ACEPTADO')) === 'ACEPTADO');
  const numero = await sql(`SELECT doc_serial || '-' || lpad(doc_number, 8, '0') FROM sales WHERE id = ${venta}`);

  // 2. Finanzas: sin botón "Comprobantes"; la tabla muestra la boleta y su estado
  await irAFinanzas();
  ok('Finanzas ya no tiene el botón "Comprobantes"', !(await page.$('#btn-ver-comprobantes')));
  ok('Finanzas tiene "Reporte contador"', !!(await page.$('#btn-reporte-contador')));
  const fila = await filaDe(venta);
  const enFila = await page.evaluate((f) => ({ t: f.querySelector('[data-comprobante-fila]')?.innerText || '', e: f.querySelector('[data-estado-cpe]')?.getAttribute('data-estado-cpe') }), fila);
  ok(`La fila muestra "${enFila.t.replace(/\s+/g, ' ')}"`, enFila.t.includes(`BOLETA ${numero}`) && enFila.e === 'ACEPTADO');

  // 3. Ticket: bloque SUNAT y [D] Devolver (varias líneas en una nota de crédito)
  await abrirTicket(venta);
  ok('El ticket muestra el bloque SUNAT (boleta y Aceptado)', /BOLETA DE VENTA ELECTR[ÓO]NICA/i.test(await texto('#bloque-sunat')) && (await texto('#bloque-sunat')).includes(numero)
    && /aceptado/i.test(await texto('#bloque-sunat')));
  ok('Enfoca "Reimprimir" al abrir', (await foco()) === 'btn-reimprimir-ticket');
  await tecla('ArrowRight'); ok('→ Cambiar producto', (await foco()) === 'btn-cambiar-producto-ticket');
  await tecla('ArrowRight'); ok('→ [D] Devolver', (await foco()) === 'btn-devolver-ticket');
  await tecla('ArrowUp'); ok('↑ sube a la cabecera (no hay acciones SUNAT todavía)', (await foco()) === 'btn-tab-ticket');
  await tecla('ArrowDown'); ok('↓ vuelve al pie (Reimprimir)', (await foco()) === 'btn-reimprimir-ticket');
  await tecla('d'); await page.waitForSelector('#modal-cambio-producto', { timeout: 8000 }); await pausa(2000);
  ok('"D" abre la ventana en "Solo devolver"', (await page.$eval('#btn-modo-devolver', (b) => b.getAttribute('aria-pressed'))) === 'true');
  ok('Muestra las 2 líneas de la boleta con cantidad', (await page.$$('[data-dev-cant]')).length === 2);
  ok('El selector queda en la primera cantidad', (await foco()) === 'dev-cant-0');
  await page.keyboard.type('1'); await tecla('Enter');
  ok('Enter pasa a la segunda cantidad', (await foco()) === 'dev-cant-1');
  await page.keyboard.type('1'); await tecla('Enter');
  ok('Enter baja al motivo', (await foco()) === 'input-motivo-cambio');
  await tecla('ArrowUp'); ok('↑ desde el motivo vuelve a la última cantidad', (await foco()) === 'dev-cant-1');
  await tecla('ArrowUp'); await tecla('ArrowUp'); ok('↑ ↑ llega a "Solo devolver"', (await foco()) === 'btn-modo-devolver');
  const boton = await page.$eval('#btn-confirmar-cambio', (b) => b.innerText);
  ok(`Botón: "${boton.trim()}"`, /devolver S\/ 6\.50/i.test(boton));
  await page.focus('#btn-confirmar-cambio'); await tecla('Enter');
  await page.waitForSelector('#resultado-cambio-cpe', { timeout: 15000 });
  const nc = await sql(`SELECT id || '|' || total::numeric(12,2) || '|' || jsonb_array_length(items) FROM notas_credito WHERE sale_id = ${venta}`);
  ok(`Una nota de crédito por las 2 líneas (${nc})`, /\|6\.50\|2$/.test(nc));
  const vale = (await page.evaluate(() => document.getElementById('modal-cambio-producto').innerText)).replace(/\s+/g, ' ');
  const okVale = /VALE DE DEVOLUCI[ÓO]N/i.test(vale) && /1 × GASEOSA INCA KOLA 1L/i.test(vale) && /1 × AGUA SAN LUIS 625ML/i.test(vale) && /Valor: S\/ 6\.50/.test(vale);
  ok('El vale dice "VALE DE DEVOLUCIÓN" con los 2 productos', okVale);
  if (!okVale) console.log('   VALE:', vale.slice(0, 600));
  await tecla('Escape'); await pausa(800);
  ok('Escape cierra la ventana', !(await page.$('#modal-cambio-producto')));

  // 4. El ticket muestra la nota de crédito y la reimprime
  const idNc = nc.split('|')[0];
  await esperar(`SELECT cpe_estado FROM notas_credito WHERE id = ${idNc}`, 'ACEPTADO');
  await abrirTicket(venta);
  ok('El ticket lista la nota de crédito', /Notas de crédito:\s*[A-Z0-9]{4}-\d{8}/i.test(await texto('#bloque-sunat')));
  ok('Ya no ofrece [D] (en esta prueba aún queda 1 gaseosa: sí lo ofrece)', !!(await page.$('#btn-devolver-ticket')));
  await page.focus('#btn-reimprimir-ticket'); await tecla('ArrowUp');
  ok('↑ desde el pie llega a la nota de crédito', (await foco()) === `btn-sunat-nc-${idNc}`);
  await tecla('Enter'); await page.waitForSelector('#btn-imprimir-nota', { timeout: 8000 }); await pausa(800);
  ok('Abre el ticket de la nota de crédito', /NOTA DE CR[ÉE]DITO ELECTR[ÓO]NICA/i.test(await page.evaluate(() => document.querySelector('[aria-label="Nota de crédito"]')?.innerText || '')));
  await tecla('Escape'); await pausa(500);
  ok('Escape cierra SOLO la nota (el ticket sigue abierto, selector en la nota)', !(await page.$('#btn-imprimir-nota')) && !!(await page.$('#modal-detalle-ticket-container')) && (await foco()) === `btn-sunat-nc-${idNc}`);
  await tecla('Escape'); await pausa(500);
  ok('Escape cierra el ticket', !(await page.$('#modal-detalle-ticket-container')));

  // 5. Reporte del contador
  await page.focus('#btn-reporte-contador'); await tecla('Enter'); await pausa(1200);
  ok('Abre el reporte con el selector en el mes', (await foco()) === 'rep-mes');
  await tecla('Escape'); await pausa(500);
  ok('Escape lo cierra y vuelve al botón', !(await page.$('#titulo-reporte-contador')) && (await foco()) === 'btn-reporte-contador');

  // 6. Un comprobante rechazado aparece en los avisos
  await sql(`UPDATE sales SET cpe_estado = 'RECHAZADO', cpe_mensaje = 'PRUEBA: RECHAZO SIMULADO' WHERE id = ${venta}`);
  await irAFinanzas();
  await page.waitForSelector('#btn-cpe-problemas', { timeout: 10000 }).catch(() => {});
  ok(`Finanzas muestra el aviso "${(await texto('#btn-cpe-problemas')).trim()}"`, /con problema/i.test(await texto('#btn-cpe-problemas')));
  await page.focus('#btn-cpe-problemas'); await tecla('Enter'); await pausa(1500);
  ok('Abre solo los que tienen problema, con el selector en el primero', (await page.evaluate(() => document.activeElement?.getAttribute('data-clave'))) === `v-${venta}`);
  await tecla('Enter'); await page.waitForSelector('#modal-detalle-ticket-container', { timeout: 8000 }); await pausa(1500);
  ok('Enter abre el ticket con el mensaje de SUNAT', /RECHAZO SIMULADO/.test(await texto('#bloque-sunat')) && /rechazado por sunat/i.test(await texto('#bloque-sunat')));
  ok('Rechazado: ya no ofrece [D] Devolver', !(await page.$('#btn-devolver-ticket')));
  await tecla('Escape'); await pausa(600);
  ok('Escape vuelve a la lista con el selector en la fila', (await page.evaluate(() => document.activeElement?.getAttribute('data-clave'))) === `v-${venta}`);
  await tecla('Escape'); await pausa(500);
  ok('Escape cierra la lista', !(await page.$('#titulo-problemas')));
  await page.click('#sidebar-btn-pos'); await page.waitForSelector('#btn-aviso-comprobantes', { timeout: 10000 }).catch(() => {});
  await page.click('#btn-aviso-comprobantes').catch(() => {}); await pausa(1200);
  ok('La Caja también abre la lista de problemas', !!(await page.$('#titulo-problemas')) && !!(await page.$(`[data-clave="v-${venta}"]`)));
  await tecla('Escape'); await pausa(400);
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-historial-cpe-error.png' });
} finally {
  await sql(`DELETE FROM cambios_productos WHERE sale_id > ${base};
    DELETE FROM notas_credito WHERE sale_id > ${base};
    DELETE FROM cash_movements WHERE id > ${baseCaja} AND (flujo = 'DEVOLUCION' OR description LIKE '%nota de crédito%');
    DELETE FROM inventory_movements WHERE id > ${baseMov};
    DELETE FROM sale_details WHERE sale_id > ${base}; DELETE FROM sales WHERE id > ${base};
    ${stock.p.map((p) => `UPDATE products SET quantity = ${p.q} WHERE id = ${p.id};`).join('\n')}
    ${(stock.b || []).map((b) => `UPDATE batches SET quantity = ${b.q} WHERE id = ${b.id};`).join('\n')}
    DELETE FROM cpe_correlativos;
    INSERT INTO cpe_correlativos SELECT * FROM json_populate_recordset(NULL::cpe_correlativos, '${numeracion}'::json);
    UPDATE facturacion_config f SET activo = o.activo, modo = o.modo, proveedor = o.proveedor, comprobante_por_defecto = o.comprobante_por_defecto
      FROM json_populate_record(NULL::facturacion_config, '${facturacion}'::json) o;`);
  ok('siumax quedó como estaba', (await sql("SELECT string_agg(serie || '=' || ultimo, ',' ORDER BY serie) FROM cpe_correlativos")) === JSON.parse(numeracion).map((c) => c.serie + '=' + c.ultimo).sort().join(',')
    && (await sql(`SELECT count(*) FROM sales WHERE id > ${base}`)) === '0');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
