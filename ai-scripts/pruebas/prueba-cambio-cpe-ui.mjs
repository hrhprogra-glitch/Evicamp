// Prueba: cambiar y devolver productos de un ticket con BOLETA (nota de crédito + boleta nueva), con teclado.
//  1. Caja: vende 2 gaseosas con boleta → SUNAT (modo prueba) la acepta.
//  2. Finanzas > ticket > [C]: "Cambiar por otro producto" (1 gaseosa por 1 agua) → nota de crédito BC01 + boleta nueva B001.
//  3. "Solo devolver" la otra gaseosa → otra nota de crédito y egreso en la caja.
//  4. Ya no queda nada por devolver → aviso claro.
// Deja siumax como estaba (ventas, stock, lotes, caja y numeración). Uso: node ai-scripts/pruebas/prueba-cambio-cpe-ui.mjs
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
const stock = await sql(`SELECT json_build_object('p', (SELECT json_agg(json_build_object('id', id, 'q', quantity)) FROM products WHERE id IN ${PRODUCTOS}),
  'b', (SELECT json_agg(json_build_object('id', id, 'q', quantity)) FROM batches WHERE product_id IN ${PRODUCTOS}))`);
const facturacion = await sql("SELECT row_to_json(f) FROM (SELECT activo, modo, proveedor, comprobante_por_defecto FROM facturacion_config) f");
await sql("UPDATE facturacion_config SET activo = true, modo = 'PRUEBA', proveedor = 'SUNAT'");

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(170); } };
const esperar = async (consulta, meta, veces = 25) => { let v = ''; for (let i = 0; i < veces && v !== meta; i++) { await pausa(1500); v = await sql(consulta); } return v; };
const abrirCambio = async (venta) => {
  await page.click('#sidebar-btn-finanzas'); await page.waitForSelector('tr[data-row="true"]', { timeout: 15000 }); await pausa(1500);
  const fila = await page.evaluateHandle((t) => [...document.querySelectorAll('tr[data-row="true"]')].find((f) => f.innerText.includes(t) && !/devoluci|nota de cr/i.test(f.innerText)), venta.slice(-6));
  await fila.asElement().focus(); await tecla('Enter'); await pausa(1500);
  await tecla('c'); await page.waitForSelector('#modal-cambio-producto', { timeout: 8000 }); await pausa(2000);
};

let venta = '';
try {
  await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2000);

  // 1. Venta con boleta: 2 gaseosas (S/ 10.00)
  await page.click('#sidebar-btn-pos'); await page.waitForSelector('#buscador-global-pos', { timeout: 15000 }); await pausa(2500);
  for (let i = 0; i < 2; i++) {
    await page.focus('#buscador-global-pos'); await page.keyboard.type('GASEOSA INCA KOLA', { delay: 25 }); await pausa(700);
    await tecla('Enter'); await pausa(800);
  }
  await tecla('F4'); await page.waitForSelector('#cobro-comp-BOLETA', { timeout: 8000 }); await pausa(600);
  await page.focus('#cobro-comp-BOLETA'); await tecla('Enter'); await pausa(200);
  await page.keyboard.type('76086769'); await tecla('Enter'); await page.keyboard.type('HARRY PRUEBA'); await tecla('Enter');
  await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }); await pausa(500); await tecla('Enter'); await pausa(1000);
  venta = await sql(`SELECT id FROM sales WHERE id > ${base} AND doc_type = 3 ORDER BY id LIMIT 1`);
  ok(`Venta con boleta de 2 gaseosas (S/ ${await sql(`SELECT total FROM sales WHERE id = ${venta}`)})`, Number(await sql(`SELECT total FROM sales WHERE id = ${venta}`)) === 10);
  ok('SUNAT (prueba) aceptó la boleta', (await esperar(`SELECT cpe_estado FROM sales WHERE id = ${venta}`, 'ACEPTADO')) === 'ACEPTADO');

  // 2. Cambio: 1 gaseosa por 1 agua
  await abrirCambio(venta);
  ok('Abre el cambio sin bloquear la boleta', !(await page.evaluate(() => /no se puede cambiar/i.test(document.getElementById('modal-cambio-producto')?.innerText || ''))));
  ok('Avisa que sale con nota de crédito y boleta nueva', await page.evaluate(() => /nota de crédito.*boleta nueva/i.test(document.getElementById('modal-cambio-producto').innerText)));
  await page.focus('#btn-cerrar-modal-cambio'); await tecla('ArrowDown');
  ok('↓ desde la X llega a "Cambiar por otro producto"', (await foco()) === 'btn-modo-cambio');
  await tecla('ArrowDown'); ok('↓ baja al producto devuelto', (await foco()) === 'select-producto-devuelto');
  await tecla('ArrowUp'); ok('↑ vuelve a los modos', (await foco()) === 'btn-modo-cambio');
  await page.focus('#input-buscar-nuevo'); await page.keyboard.type('AGUA SAN LUIS', { delay: 25 }); await pausa(1200);
  await tecla('Enter'); await pausa(500);
  ok('Elige el producto nuevo (agua)', (await foco()) === 'input-cantidad-nueva');
  const etiqueta = await page.$eval('#btn-confirmar-cambio', (b) => b.innerText);
  ok(`Botón: "${etiqueta.trim()}"`, /nota de crédito y boleta nueva/i.test(etiqueta));
  await page.focus('#btn-confirmar-cambio'); await tecla('Enter');
  await page.waitForSelector('#resultado-cambio-cpe', { timeout: 15000 });
  const resultado = await page.$eval('#resultado-cambio-cpe', (p) => p.innerText);
  ok(`Resultado: ${resultado.split('\n')[0]}`, /Nota de crédito BC01-\d{8}/.test(resultado) && /BOLETA nueva B001-\d{8}/.test(resultado));
  const nueva = await sql(`SELECT id FROM sales WHERE id > ${venta} AND doc_type = 3 ORDER BY id LIMIT 1`);
  const filaNueva = await sql(`SELECT total::numeric(12,2) || '|' || cpe_cliente_num_doc || '|' || cpe_cliente_nombre FROM sales WHERE id = ${nueva}`);
  ok(`Boleta nueva con el mismo cliente (${filaNueva})`, filaNueva === '1.50|76086769|HARRY PRUEBA');
  ok('Nota de crédito por 1 gaseosa (S/ 5.00, motivo 07)', (await sql(`SELECT total || '|' || motivo FROM notas_credito WHERE sale_id = ${venta}`)) === '5.00|07');
  const egreso = await sql(`SELECT amount::numeric(12,2) || '|' || type FROM cash_movements WHERE id > ${baseCaja} AND flujo = 'DEVOLUCION' ORDER BY id LIMIT 1`);
  ok(`Caja: egreso por la nota de crédito (${egreso})`, egreso === '5.00|EGRESO');
  const pagoNueva = await sql(`SELECT amount_cash::numeric(12,2) || '|' || payment_type FROM sales WHERE id = ${nueva}`);
  ok(`Boleta nueva pagada con lo devuelto (${pagoNueva})`, pagoNueva === '1.50|EFECTIVO');
  ok('Quedó en el historial de cambios (diferencia -3.50)', (await sql(`SELECT diferencia FROM cambios_productos WHERE sale_id = ${venta}`)) === '-3.50');
  const st = JSON.parse(stock);
  const ahora = JSON.parse(await sql(`SELECT json_agg(json_build_object('id', id, 'q', quantity)) FROM products WHERE id IN ${PRODUCTOS}`));
  const dif = (id) => Number(ahora.find((p) => p.id === id).q) - Number(st.p.find((p) => p.id === id).q);
  const [gaseosa, agua] = (await sql("SELECT id FROM products WHERE name IN ('GASEOSA INCA KOLA 1L', 'AGUA SAN LUIS 625ML') ORDER BY name DESC")).split('\n').map(Number);
  ok(`Stock: gaseosa ${dif(gaseosa)} (vendió 2, volvió 1), agua ${dif(agua)}`, dif(gaseosa) === -1 && dif(agua) === -1);
  ok('SUNAT (prueba) aceptó la nota de crédito', (await esperar(`SELECT cpe_estado FROM notas_credito WHERE sale_id = ${venta}`, 'ACEPTADO')) === 'ACEPTADO');
  ok('SUNAT (prueba) aceptó la boleta nueva', (await esperar(`SELECT cpe_estado FROM sales WHERE id = ${nueva}`, 'ACEPTADO')) === 'ACEPTADO');
  await tecla('Escape'); await pausa(800);
  ok('Escape cierra la ventana del cambio', !(await page.$('#modal-cambio-producto')));

  // 3. Solo devolver la otra gaseosa
  await abrirCambio(venta);
  await page.focus('#btn-cerrar-modal-cambio'); await tecla('ArrowDown'); await tecla('ArrowRight');
  ok('→ llega a "Solo devolver"', (await foco()) === 'btn-modo-devolver');
  await tecla('Enter'); await pausa(400);
  ok('Solo devolver no pide producto nuevo', !(await page.$('#input-buscar-nuevo')));
  ok('Muestra lo que queda: vendido 2, ya devuelto 1', /Vendido 2 · ya devuelto 1/i.test(await page.$eval('#modal-cambio-producto', (m) => m.innerText)));
  await tecla('ArrowDown'); ok('↓ desde "Solo devolver" llega a la cantidad', (await foco()) === 'dev-cant-0');
  await page.keyboard.type('1');
  const etiqueta2 = await page.$eval('#btn-confirmar-cambio', (b) => b.innerText);
  ok(`Botón: "${etiqueta2.trim()}"`, /nota de crédito y devolver S\/ 5\.00/i.test(etiqueta2));
  await tecla('Enter');
  ok('Enter en la cantidad baja al motivo (no hay producto nuevo)', (await foco()) === 'input-motivo-cambio');
  await tecla('ArrowDown'); await tecla('Enter');
  await page.waitForSelector('#resultado-cambio-cpe', { timeout: 15000 });
  ok('Muestra "Devolución realizada" con la nota de crédito', await page.evaluate(() => /Devolución realizada/i.test(document.getElementById('modal-cambio-producto').innerText)
    && /Nota de crédito BC01-/.test(document.getElementById('resultado-cambio-cpe').innerText)));
  ok('Segunda nota de crédito (S/ 5.00) y su egreso', (await sql(`SELECT count(*) || '|' || sum(total)::numeric(12,2) FROM notas_credito WHERE sale_id = ${venta}`)) === '2|10.00'
    && (await sql(`SELECT count(*) FROM cash_movements WHERE id > ${baseCaja} AND flujo = 'DEVOLUCION'`)) === '2');
  await tecla('Escape'); await pausa(800);

  // 4. Ya no queda nada
  await abrirCambio(venta);
  await page.focus('#btn-modo-devolver'); await tecla('Enter'); await pausa(300);
  ok('Sin nada por devolver: la cantidad queda bloqueada (máx. 0)', await page.$eval('#dev-cant-0', (i) => i.disabled) && /máx\. 0/i.test(await page.$eval('#modal-cambio-producto', (m) => m.innerText)));
  ok('Y no deja emitir la nota de crédito', await page.$eval('#btn-confirmar-cambio', (b) => b.disabled));
  await page.focus('#btn-confirmar-cambio'); await tecla('Enter'); await pausa(800);
  ok('No se creó una tercera nota', (await sql(`SELECT count(*) FROM notas_credito WHERE sale_id = ${venta}`)) === '2');
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-cambio-cpe-error.png' });
} finally {
  // Dejar siumax como estaba
  const st = JSON.parse(stock);
  await sql(`DELETE FROM cambios_productos WHERE sale_id > ${base};
    DELETE FROM notas_credito WHERE sale_id > ${base};
    DELETE FROM cash_movements WHERE id > ${baseCaja} AND (flujo = 'DEVOLUCION' OR description LIKE '%nota de crédito%');
    DELETE FROM inventory_movements WHERE id > ${baseMov};
    DELETE FROM sale_details WHERE sale_id > ${base}; DELETE FROM sales WHERE id > ${base};
    ${st.p.map((p) => `UPDATE products SET quantity = ${p.q} WHERE id = ${p.id};`).join('\n')}
    ${(st.b || []).map((b) => `UPDATE batches SET quantity = ${b.q} WHERE id = ${b.id};`).join('\n')}
    DELETE FROM cpe_correlativos;
    INSERT INTO cpe_correlativos SELECT * FROM json_populate_recordset(NULL::cpe_correlativos, '${numeracion}'::json);
    UPDATE facturacion_config f SET activo = o.activo, modo = o.modo, proveedor = o.proveedor, comprobante_por_defecto = o.comprobante_por_defecto
      FROM json_populate_record(NULL::facturacion_config, '${facturacion}'::json) o;`);
  ok('siumax quedó como estaba (numeración y stock)', (await sql("SELECT string_agg(serie || '=' || ultimo, ',' ORDER BY serie) FROM cpe_correlativos")) === 'B001=2,F001=1'
    && (await sql(`SELECT count(*) FROM sales WHERE id > ${base}`)) === '0');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
