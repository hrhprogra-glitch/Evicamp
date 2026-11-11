// Prueba de la fase 11.4 en siumax, SOLO CON TECLADO: pantalla "Comprobantes" (desde la Caja, Finanzas y Ajustes),
// reenviar uno con error, reimprimir con QR, y cobrar con boleta SIN INTERNET (se numera al volver la conexión).
// Deja la base de pruebas como estaba. Uso: node ai-scripts/pruebas/prueba-fase11-4-ui.mjs
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
const PROD = 9100000000021;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (txt, cond) => { console.log(`${cond ? '✅' : '❌'} ${txt}`); if (!cond) fallas++; };

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
const empresaOriginal = await sql("SELECT row_to_json(e) FROM (SELECT id, ruc, direccion, razon_social, regimen FROM empresa_config ORDER BY id LIMIT 1) e");
const base = await sql('SELECT coalesce(max(id), 0) FROM sales');
const limpiar = async () => {
  await sql(`DELETE FROM sale_details WHERE sale_id IN (SELECT id FROM sales WHERE id > ${base});
    DELETE FROM sales WHERE id > ${base};
    DELETE FROM inventory_movements WHERE product_id = ${PROD}; DELETE FROM batches WHERE product_id = ${PROD}; DELETE FROM products WHERE id = ${PROD};
    DELETE FROM cpe_correlativos;`);
};
await limpiar();
const ahora = Date.now();
await sql(`UPDATE empresa_config SET ruc='20601234565', razon_social='PRUEBA SIUMAX SAC', direccion='AV PRUEBA 123', regimen='MYPE';
  UPDATE facturacion_config SET activo=true, modo='SIMULADO', comprobante_por_defecto='BOLETA';
  INSERT INTO products (id,name,price,quantity,unit,category,is_active,control_type) VALUES (${PROD},'PRUEBA GALLETAS',5,500,'UND','PRUEBAS',1,'UNIT');
  -- Una boleta que sale bien
  INSERT INTO sales (id,total,payment_type,amount_cash,sunat_status,created_at,doc_type) VALUES (${ahora}, 10, 'EFECTIVO', 10, 'ACEPTADO', now(), 3);
  INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, subtotal) VALUES (${ahora}, ${PROD}, 'PRUEBA GALLETAS', 2, 5, 10);
  -- Una boleta sin productos (de hace 5 min): el facturador la deja con ERROR
  INSERT INTO sales (id,total,payment_type,amount_cash,sunat_status,created_at,doc_type) VALUES (${ahora + 1}, 5, 'EFECTIVO', 5, 'ACEPTADO', now() - interval '5 minutes', 3);`);
await pausa(12000);
ok(`Preparación: una aceptada y otra con error (${await sql(`SELECT string_agg(doc_number||':'||cpe_estado, ',' ORDER BY id) FROM sales WHERE id > ${base}`)})`,
  (await sql(`SELECT string_agg(cpe_estado, ',' ORDER BY id) FROM sales WHERE id > ${base}`)) === 'ACEPTADO,ERROR');

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
page.on('dialog', (d) => d.accept());
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-id') || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(180); } };
const texto = () => page.evaluate(() => document.body.innerText);

try {
  await page.goto(SITIO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2000);
  await page.click('#sidebar-btn-pos'); await page.waitForSelector('#buscador-global-pos', { timeout: 15000 }); await pausa(3500);

  // 1. Aviso en la Caja → pantalla "Comprobantes" con los que tienen problema
  ok('La Caja avisa "1 comprobante con problema"', /1 comprobante con problema/i.test(await texto()));
  await page.click('#btn-aviso-comprobantes'); await pausa(1500);
  ok('Abre "Comprobantes" en "Con problema" con el selector en ese filtro', (await foco()) === 'comp-filtro-PROBLEMAS');
  ok('Lista la boleta con error', /Error \(se reintenta\)/i.test(await texto()) && /B001-00000002/.test(await texto()));
  await tecla('ArrowDown'); ok('↓ baja a la fila', (await foco()) === String(ahora + 1));
  await tecla('Enter'); await pausa(400);
  ok('Enter abre el detalle con el mensaje del error', /no tiene productos/i.test(await texto()) && (await foco()) === 'btn-comp-reimprimir');
  await tecla('ArrowRight'); ok('→ pasa a "Reenviar"', (await foco()) === 'btn-comp-reenviar');
  // Se corrige la causa (se le agregan sus productos) y se reenvía
  await sql(`INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, subtotal) VALUES (${ahora + 1}, ${PROD}, 'PRUEBA GALLETAS', 1, 5, 5);`);
  await tecla('Enter'); await pausa(600);
  ok('Avisa que se volverá a enviar', /se volverá a enviar/i.test(await texto()));
  await tecla('Enter'); await pausa(300); // cierra el aviso
  let estado = '';
  for (let i = 0; i < 12 && estado !== 'ACEPTADO'; i++) { await pausa(1500); estado = await sql(`SELECT cpe_estado FROM sales WHERE id = ${ahora + 1}`); }
  ok(`Después de reenviar, el facturador la aceptó (${estado})`, estado === 'ACEPTADO');
  await tecla('Escape'); await pausa(400);
  ok('Escape en el detalle vuelve a la lista', !!(await page.$('#comp-filtro-PROBLEMAS')));
  await tecla('Escape'); await pausa(600);
  ok('Escape en la lista cierra la ventana', !(await page.$('#comp-filtro-PROBLEMAS')));

  // 2. Finanzas: botón "Comprobantes" a la izquierda de Historial; reimprimir con QR y resumen (hash)
  await page.click('#sidebar-btn-finanzas'); await pausa(2500);
  ok('Finanzas tiene el botón "Comprobantes"', !!(await page.$('#btn-ver-comprobantes')));
  await page.focus('#btn-ver-historial'); await tecla('ArrowLeft');
  ok('← desde "Ver Historial" llega a "Comprobantes"', (await foco()) === 'btn-ver-comprobantes');
  await tecla('Enter'); await page.waitForSelector('#lista-comprobantes [data-row="true"]', { timeout: 10000 }).catch(() => {}); await pausa(800);
  const filasHoy = await page.$$eval('#lista-comprobantes [data-row="true"]', (fs) => fs.map((f) => f.innerText.replace(/s+/g, ' ')));
  if (process.env.DEPURAR) console.log('   filas:', filasHoy);
  ok(`Abre en "Hoy" con las dos boletas aceptadas (${filasHoy.length} filas)`, (await foco()) === 'comp-filtro-HOY' && filasHoy.filter((f) => /ACEPTADO/i.test(f)).length >= 2);
  await tecla('ArrowDown'); await tecla('Enter'); await pausa(400);
  await tecla('Enter'); await pausa(2500); // Reimprimir
  const t = await texto();
  ok('Reimprimir muestra la BOLETA ELECTRÓNICA con número, QR y resumen (hash)',
    /BOLETA DE VENTA ELECTR[ÓO]NICA/i.test(t) && /B001-0000000[12]/.test(t) && !!(await page.$('img[alt="Código QR del comprobante"]')) && /Resumen:/i.test(t));
  await tecla('Escape'); await pausa(500);
  ok('Al cerrar el ticket, el selector vuelve a "Reimprimir"', (await foco()) === 'btn-comp-reimprimir');
  await tecla('Escape'); await tecla('Escape'); await pausa(500);

  // 3. Comprobantes está SOLO en Finanzas (el dueño pidió no duplicarlo en Ajustes > Facturación)
  await page.click('#sidebar-btn-configuracion'); await pausa(1500);
  await page.focus('#btn-tab-empresa');
  for (let i = 0; i < 8 && (await foco()) !== 'btn-tab-facturacion'; i++) await tecla('ArrowRight');
  await tecla('Enter'); await pausa(1500);
  ok('Ajustes > Facturación ya no tiene "Ver comprobantes emitidos"', !(await page.$('#fact-btn-comprobantes')) && !/Ver comprobantes emitidos/i.test(await texto()));
  await page.focus('#fact-btn-probar'); await tecla('ArrowDown');
  ok('↓ desde "Probar conexión" llega directo a "Guardar cambios"', (await foco()) === 'fact-btn-guardar');

  // 4. SIN INTERNET: la Caja recuerda la facturación, cobra con boleta "por numerar" y se numera al volver
  await page.click('#sidebar-btn-pos'); await page.waitForSelector('#buscador-global-pos'); await pausa(2500);
  await page.setOfflineMode(true); await pausa(1500);
  await page.focus('#buscador-global-pos'); await page.keyboard.type('PRUEBA GALLETAS', { delay: 25 }); await pausa(600);
  await tecla('Enter'); await pausa(800);
  await tecla('F4'); await page.waitForSelector('#pago-efectivo', { timeout: 8000 }); await pausa(700);
  ok('Sin internet la ventana de pago sigue ofreciendo Boleta (marcada por defecto)', (await page.$eval('#cobro-comp-BOLETA', (b) => b.getAttribute('aria-pressed')).catch(() => null)) === 'true');
  await page.focus('#pago-efectivo'); await tecla('Enter');
  await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }).catch(() => {});
  await pausa(800);
  const t2 = await texto();
  ok('El ticket sin internet dice "POR NUMERAR" y "se emite al conectarse"', /POR NUMERAR/.test(t2) && /se emite al conectarse/i.test(t2));
  await tecla('Enter'); await pausa(800);
  await page.setOfflineMode(false);
  let fila = '';
  for (let i = 0; i < 30 && !/ACEPTADO$/.test(fila); i++) { await pausa(2000); fila = await sql(`SELECT doc_serial||'-'||doc_number||':'||coalesce(cpe_estado,'') FROM sales WHERE id > ${ahora + 1} AND doc_type = 3 ORDER BY id DESC LIMIT 1`); }
  ok(`Al volver internet se subió, se numeró y se emitió (${fila})`, /^B001-3:ACEPTADO$/.test(fila));
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-fase11-4-error.png' });
} finally {
  await page.setOfflineMode(false).catch(() => {});
  await limpiar();
  await sql(`UPDATE facturacion_config SET activo=false, modo='SIMULADO', comprobante_por_defecto='NOTA';
    UPDATE empresa_config e SET ruc = o.ruc, direccion = o.direccion, razon_social = o.razon_social, regimen = o.regimen
      FROM json_populate_record(NULL::empresa_config, '${empresaOriginal.replace(/'/g, "''")}'::json) o WHERE e.id = o.id;`);
  await ssh.execCommand('rm -rf /var/lib/siumax-cpe/siumax');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
