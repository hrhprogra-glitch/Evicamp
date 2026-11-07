// Prueba de la fase 11.3 en siumax, SOLO CON TECLADO: cobrar con Nota de venta, Boleta y Factura en la Caja.
// Revisa la ventana de pago, las reglas (factura con RUC válido, boleta > S/ 700 con DNI), el ticket
// (tipo, número, IGV, QR) y que el facturador las emita (modo SIMULADO). Deja la base de pruebas como estaba.
// Uso: node ai-scripts/pruebas/prueba-fase11-3-ui.mjs   (clave en .env.vps: SIUMAX_ADMIN_CLAVE)
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
const IDS = '9100000000011, 9100000000012';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (txt, cond) => { console.log(`${cond ? '✅' : '❌'} ${txt}`); if (!cond) fallas++; };

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
const empresaOriginal = await sql("SELECT row_to_json(e) FROM (SELECT id, ruc, direccion, razon_social, regimen FROM empresa_config ORDER BY id LIMIT 1) e");
const ultimaVentaAntes = await sql('SELECT coalesce(max(id), 0) FROM sales');
const limpiar = async () => {
  await sql(`DELETE FROM fiados WHERE sale_id IN (SELECT id FROM sales WHERE id > ${ultimaVentaAntes});
    DELETE FROM sale_details WHERE sale_id IN (SELECT id FROM sales WHERE id > ${ultimaVentaAntes});
    DELETE FROM cash_movements WHERE created_at > now() - interval '30 minutes' AND description ILIKE '%venta%' AND amount IN (7, 750, 14);
    DELETE FROM sales WHERE id > ${ultimaVentaAntes};
    DELETE FROM inventory_movements WHERE product_id IN (${IDS});
    DELETE FROM batches WHERE product_id IN (${IDS});
    DELETE FROM products WHERE id IN (${IDS});
    DELETE FROM cpe_correlativos;`);
};

await limpiar();
await sql(`UPDATE empresa_config SET ruc='20601234565', razon_social='PRUEBA SIUMAX SAC', direccion='AV PRUEBA 123', regimen='MYPE';
  UPDATE facturacion_config SET activo=true, modo='SIMULADO', comprobante_por_defecto='NOTA';
  INSERT INTO products (id,name,price,quantity,unit,category,is_active,control_type,tipo_igv) VALUES
    (9100000000011,'PRUEBA GASEOSA CAJA',7,500,'UND','PRUEBAS',1,'UNIT','GRAVADO'),
    (9100000000012,'PRUEBA TELEVISOR 32',750,20,'UND','PRUEBAS',1,'UNIT','GRAVADO');`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
page.on('dialog', (d) => d.accept());
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(160); } };
const texto = () => page.evaluate(() => document.body.innerText);
const agregar = async (nombre) => {
  await page.focus('#buscador-global-pos');
  await page.keyboard.type(nombre, { delay: 25 }); await pausa(500);
  await tecla('Enter'); await pausa(700);
};
const abrirCobro = async () => { await tecla('F4'); await page.waitForSelector('#pago-efectivo', { timeout: 8000 }); await pausa(700); };
const nuevaVenta = async () => { await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }); await pausa(500); await tecla('Enter'); await pausa(1200); };
const ventaNueva = async () => (await sql(`SELECT row_to_json(v) FROM (SELECT id, doc_type, doc_serial, doc_number, cpe_estado, cpe_cliente_tipo_doc, cpe_cliente_num_doc, cpe_cliente_nombre, total FROM sales WHERE id > ${ultimaVentaAntes} ORDER BY id DESC LIMIT 1) v`));

try {
  await page.goto(SITIO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2000);
  await page.click('#sidebar-btn-pos'); await page.waitForSelector('#buscador-global-pos', { timeout: 15000 }); await pausa(2500);

  // 1. BOLETA con DNI, todo con teclado
  await agregar('PRUEBA GASEOSA');
  await abrirCobro();
  ok('La ventana de pago muestra "Comprobante" con Nota de venta marcada', (await page.$eval('#cobro-comp-NOTA', (b) => b.getAttribute('aria-pressed')).catch(() => null)) === 'true');
  ok('Avisa que está en modo simulado', /modo simulado: sin valor ante SUNAT/i.test(await texto()));
  await tecla('ArrowDown', 2); ok('↓ ↓ desde efectivo llega a Tarjeta', (await foco()) === 'pago-tarjeta');
  await tecla('ArrowDown'); ok('↓ desde Tarjeta baja al comprobante', (await foco()) === 'cobro-comp-NOTA');
  await tecla('ArrowRight'); ok('→ pasa a Boleta', (await foco()) === 'cobro-comp-BOLETA');
  await tecla('Enter'); await pausa(200);
  ok('Enter elige Boleta y el selector va al DNI', (await foco()) === 'cobro-doc-num');
  await page.keyboard.type('12345678'); await tecla('Enter');
  ok('Enter en el DNI pasa al nombre', (await foco()) === 'cobro-doc-nombre');
  await page.keyboard.type('juan perez');
  if (process.env.FOTOS) await page.screenshot({ path: process.env.FOTOS + '/cobro-boleta.png' });
  ok('El botón dice "CONFIRMAR Y EMITIR BOLETA"', /CONFIRMAR Y EMITIR BOLETA/.test(await texto()));
  await tecla('Enter'); // último campo: confirma
  await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }).catch(() => {});
  await pausa(800);
  if (process.env.FOTOS) await page.screenshot({ path: process.env.FOTOS + '/ticket-boleta.png' });
  let t = await texto();
  ok('El ticket dice BOLETA DE VENTA ELECTRÓNICA B001-00000001', /BOLETA DE VENTA ELECTR[ÓO]NICA/i.test(t) && /B001-00000001/.test(t));
  ok('El ticket muestra DNI, cliente, Op. gravada e IGV', /DNI:\s*12345678/i.test(t) && /JUAN PEREZ/i.test(t) && /Op\. gravada/i.test(t) && /IGV \(18%\)/i.test(t));
  ok('El ticket tiene el código QR y la leyenda de SUNAT', !!(await page.$('img[alt="Código QR del comprobante"]')) && /Representación impresa/i.test(t));
  ok('El ticket dice "sin valor tributario" (simulado)', /sin valor tributario/i.test(t));
  let v = JSON.parse(await ventaNueva() || '{}');
  ok(`Se guardó como boleta B001-1 con el DNI (${v.doc_serial}-${v.doc_number}, ${v.cpe_cliente_num_doc})`, v.doc_type === 3 && v.doc_serial === 'B001' && v.doc_number === '1' && v.cpe_cliente_num_doc === '12345678' && v.cpe_cliente_nombre === 'JUAN PEREZ');
  await nuevaVenta();

  // 2. FACTURA: RUC mal escrito no deja confirmar; con RUC válido sí
  await agregar('PRUEBA GASEOSA');
  await abrirCobro();
  await page.focus('#cobro-comp-FACTURA'); await tecla('Enter'); await pausa(200);
  ok('Factura lleva el selector al RUC', (await foco()) === 'cobro-doc-num');
  await page.keyboard.type('20512345672'); // dígito verificador incorrecto
  t = await texto();
  ok('Con RUC inválido avisa y el botón queda bloqueado', /RUC válido/i.test(t) && (await page.$eval('#cobro-btn-confirm', (b) => b.disabled)));
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('20512345671'); await tecla('Enter');
  await page.keyboard.type('comercial san martin eirl'); await tecla('Enter');
  ok('Enter pasa a la dirección (solo en factura)', (await foco()) === 'cobro-doc-direccion');
  await page.keyboard.type('jr lima 456'); await tecla('Enter');
  await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }).catch(() => {});
  await pausa(800);
  t = await texto();
  ok('El ticket dice FACTURA ELECTRÓNICA F001-00000001 con RUC y razón social', /FACTURA ELECTR[ÓO]NICA/i.test(t) && /F001-00000001/.test(t) && /RUC:\s*20512345671/i.test(t) && /COMERCIAL SAN MARTIN EIRL/i.test(t));
  v = JSON.parse(await ventaNueva() || '{}');
  ok(`Se guardó como factura F001-1 (${v.doc_serial}-${v.doc_number})`, v.doc_type === 1 && v.doc_serial === 'F001' && v.doc_number === '1' && v.cpe_cliente_tipo_doc === 'RUC');
  await nuevaVenta();

  // 3. Boleta de más de S/ 700 sin DNI: no deja confirmar
  await agregar('PRUEBA TELEVISOR');
  await abrirCobro();
  await page.focus('#cobro-comp-BOLETA'); await tecla('Enter'); await pausa(300);
  t = await texto();
  ok('Boleta de S/ 750 sin DNI: avisa y bloquea', /más de S\/ 700/i.test(t) && (await page.$eval('#cobro-btn-confirm', (b) => b.disabled)));
  // Volver a Nota de venta: la venta se puede cobrar normal
  await page.focus('#cobro-comp-NOTA'); await tecla('Enter'); await pausa(200);
  ok('Con Nota de venta el botón vuelve a "CONFIRMAR PAGO"', /CONFIRMAR PAGO/.test(await texto()) && !(await page.$eval('#cobro-btn-confirm', (b) => b.disabled)));
  await page.focus('#pago-efectivo'); await tecla('Enter');
  await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }).catch(() => {});
  await pausa(800);
  t = await texto();
  ok('Nota de venta: el ticket es el de siempre (sin QR ni IGV)', /Nota de Venta/i.test(t) && !(await page.$('img[alt="Código QR del comprobante"]')) && !/IGV \(18%\)/.test(t));
  v = JSON.parse(await ventaNueva() || '{}');
  ok('La nota de venta se guardó sin comprobante (doc_type vacío)', v.doc_type === null && v.cpe_estado === null && Number(v.total) === 750);
  await nuevaVenta();

  // 4. El facturador emitió las dos (simulado)
  await pausa(8000);
  const estados = await sql(`SELECT string_agg(doc_serial||'-'||doc_number||':'||cpe_estado, ',' ORDER BY doc_type) FROM sales WHERE id > ${ultimaVentaAntes} AND doc_type IS NOT NULL`);
  ok(`El facturador emitió la factura y la boleta (${estados})`, estados === 'F001-1:ACEPTADO,B001-1:ACEPTADO');

  // 5. Con la facturación apagada, la ventana de pago queda como antes (sin la fila del comprobante)
  await sql("UPDATE facturacion_config SET activo=false");
  await agregar('PRUEBA GASEOSA');
  await abrirCobro(); await page.click('#cobro-btn-close'); await pausa(1500); // al cerrar se vuelve a leer Ajustes
  await abrirCobro();
  ok('Facturación apagada: no aparece la fila del comprobante', !(await page.$('#cobro-comp-NOTA')));
  await tecla('ArrowDown', 3); ok('↓ desde Tarjeta va directo a "Imprimir" como antes', (await foco()) === 'cobro-btn-imprimir');
  await page.click('#cobro-btn-close');
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-fase11-3-error.png' });
} finally {
  await limpiar();
  await sql(`UPDATE facturacion_config SET activo=false, modo='SIMULADO', comprobante_por_defecto='NOTA';
    UPDATE empresa_config e SET ruc = o.ruc, direccion = o.direccion, razon_social = o.razon_social, regimen = o.regimen
      FROM json_populate_record(NULL::empresa_config, '${empresaOriginal.replace(/'/g, "''")}'::json) o WHERE e.id = o.id;`);
  await ssh.execCommand('rm -rf /var/lib/siumax-cpe/siumax');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
