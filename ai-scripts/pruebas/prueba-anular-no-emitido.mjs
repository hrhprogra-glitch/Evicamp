// Prueba con Nubefact (cuenta demo) en siumax:
//  1. Boleta con una serie que Nubefact NO permite → ERROR → anular → NO_EMITIDO sin nota de crédito, sin aviso.
//  2. Boleta con la serie buena (BBB1) → Nubefact la acepta → anular → SÍ nota de crédito (BBB1) y Nubefact la acepta.
// Deja la configuración como estaba (series BBB1/FFF1). Las ventas de prueba quedan anuladas en siumax.
// Uso: node ai-scripts/pruebas/prueba-anular-no-emitido.mjs
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
const esperar = async (consulta, metas, veces = 30) => { let v = ''; for (let i = 0; i < veces && !metas.includes(v); i++) { await pausa(1500); v = await sql(consulta); } return v; };
const series = await sql("SELECT serie_boleta || '|' || serie_nc_boleta FROM facturacion_config");
ok(`Config: Nubefact · Prueba · series ${series}`, (await sql("SELECT proveedor || ' ' || modo || ' ' || activo FROM facturacion_config")) === 'NUBEFACT PRUEBA true');

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(170); } };
const venderBoleta = async () => {
  const antes = await sql('SELECT coalesce(max(id), 0) FROM sales');
  await page.click('#sidebar-btn-pos'); await page.waitForSelector('#buscador-global-pos', { timeout: 15000 }); await pausa(2500);
  await page.focus('#buscador-global-pos'); await page.keyboard.type('AGUA SAN LUIS', { delay: 25 }); await pausa(700);
  await tecla('Enter'); await pausa(800);
  await tecla('F4'); await page.waitForSelector('#cobro-comp-BOLETA', { timeout: 8000 }); await pausa(600);
  await page.focus('#cobro-comp-BOLETA'); await tecla('Enter'); await pausa(200); await tecla('Enter'); await tecla('Enter');
  await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }); await pausa(500); await tecla('Enter'); await pausa(800);
  return sql(`SELECT id FROM sales WHERE id > ${antes} AND doc_type = 3 ORDER BY id LIMIT 1`);
};
const anular = (id) => page.evaluate(async (venta) => {
  const r = await fetch('/rest/v1/rpc/fn_anular_venta', { method: 'POST', headers: { 'x-sesion': localStorage.getItem('gestorpro_sesion'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_sale_id: Number(venta) }) });
  return [r.status, await r.text()];
}, id);
const fila = (id) => sql(`SELECT doc_serial || '-' || doc_number || ' | ' || coalesce(sunat_status, '-') || ' | ' || cpe_estado || ' | ' || coalesce(cpe_mensaje, '') FROM sales WHERE id = ${id}`);

try {
  await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter'); await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(1500);

  // 1. Serie que Nubefact no permite
  await sql("UPDATE facturacion_config SET serie_boleta = 'B001'");
  const mala = await venderBoleta();
  const e1 = await esperar(`SELECT cpe_estado FROM sales WHERE id = ${mala}`, ['ERROR', 'ACEPTADO', 'RECHAZADO']);
  ok(`Boleta con serie B001: ${await fila(mala)}`, e1 === 'ERROR' && /serie/i.test(await fila(mala)));
  ok('Aparece en "con problema"', Number(await sql("SELECT count(*) FROM sales WHERE cpe_estado IN ('ERROR','RECHAZADO')")) >= 1);
  const [st1, r1] = await anular(mala);
  ok(`Anular responde sin nota de crédito y "sin_emitir" (${r1})`, st1 === 200 && /"nota_credito": null/.test(r1) && /"sin_emitir": true/.test(r1));
  const e2 = await esperar(`SELECT cpe_estado FROM sales WHERE id = ${mala}`, ['NO_EMITIDO']);
  ok(`Queda NO_EMITIDO: ${await fila(mala)}`, e2 === 'NO_EMITIDO');
  ok('Sin nota de crédito colgada', (await sql(`SELECT count(*) FROM notas_credito WHERE sale_id = ${mala}`)) === '0');
  ok('Ya no hay comprobantes con problema', (await sql("SELECT count(*) FROM sales WHERE cpe_estado IN ('ERROR','RECHAZADO')")) === '0');
  await page.click('#sidebar-btn-finanzas'); await page.waitForSelector('tr[data-row="true"]', { timeout: 15000 }); await pausa(1500);
  ok('Finanzas ya no muestra el aviso rojo', !(await page.$('#btn-cpe-problemas')));
  const f = await page.evaluateHandle((t) => [...document.querySelectorAll('tr[data-row="true"]')].find((x) => x.innerText.includes(t) && !/devoluci|nota de cr/i.test(x.innerText)), String(mala).slice(-6));
  await f.asElement().focus(); await tecla('Enter'); await page.waitForSelector('#bloque-sunat', { timeout: 8000 }); await pausa(1000);
  const bloque = await page.$eval('#bloque-sunat', (b) => b.innerText);
  ok('El ticket explica "no se emitió y no necesita nota de crédito" (sin Reenviar)', /no necesita nota de cr[ée]dito/i.test(bloque) && !(await page.$('#btn-sunat-reenviar')));
  await tecla('Escape'); await pausa(500);

  // 2. Serie buena: primera boleta real por Nubefact
  await sql("UPDATE facturacion_config SET serie_boleta = 'BBB1'");
  const buena = await venderBoleta();
  // Nubefact genera la boleta al instante (PDF) y la manda a SUNAT en su resumen diario: PENDIENTE con PDF = emitida
  const emitido = (tabla, filtro) => `SELECT CASE WHEN cpe_estado = 'PENDIENTE' AND cpe_pdf IS NOT NULL THEN 'GENERADO' ELSE cpe_estado END FROM ${tabla} WHERE ${filtro}`;
  const e3 = await esperar(emitido('sales', `id = ${buena}`), ['ACEPTADO', 'OBSERVADO', 'GENERADO', 'RECHAZADO', 'ERROR'], 40);
  ok(`Boleta BBB1 por Nubefact (${e3}): ${await fila(buena)}`, ['ACEPTADO', 'OBSERVADO', 'GENERADO'].includes(e3));
  ok('Nubefact devolvió el PDF', (await sql(`SELECT cpe_pdf IS NOT NULL FROM sales WHERE id = ${buena}`)) === 't');
  ok('Generada esperando el resumen: NO cuenta como problema', (await sql("SELECT count(*) FROM sales WHERE cpe_estado IN ('ERROR','RECHAZADO')")) === '0');

  // 3. Anular la emitida: SÍ nota de crédito, al momento
  const [st2, r2] = await anular(buena);
  ok(`Anular la emitida saca la nota de crédito al momento (${r2})`, st2 === 200 && /"nota_credito": "BBB1-\d{8}"/.test(r2) && /"sin_emitir": false/.test(r2));
  const e4 = await esperar(emitido('notas_credito', `sale_id = ${buena}`), ['ACEPTADO', 'OBSERVADO', 'GENERADO', 'RECHAZADO', 'ERROR'], 40);
  ok(`Nota de crédito por Nubefact (${e4}): ${await sql(`SELECT doc_serial || '-' || doc_number || ' | ' || cpe_estado || ' | ' || coalesce(cpe_mensaje,'') FROM notas_credito WHERE sale_id = ${buena}`)}`,
    ['ACEPTADO', 'OBSERVADO', 'GENERADO'].includes(e4));
  ok('Sin errores de JavaScript', errores.length === 0);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-anular-error.png' });
} finally {
  await sql("UPDATE facturacion_config SET serie_boleta = 'BBB1'");
  ok('Series de vuelta en BBB1', (await sql('SELECT serie_boleta FROM facturacion_config')) === 'BBB1');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
