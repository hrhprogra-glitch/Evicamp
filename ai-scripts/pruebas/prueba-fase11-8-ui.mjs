// Prueba de la fase 11.8 en siumax: DIRECTO A SUNAT (ambiente de pruebas de SUNAT, sin proveedor).
//  1. Ajustes > Facturación con teclado: "Directo a SUNAT", modo Prueba, activar; Real sin certificado no deja.
//  2. Caja: boleta y factura → el facturador las firma y SUNAT (beta) las acepta. Devolución → nota de crédito aceptada.
//  3. Copias propias: XML firmado y constancia (CDR) en el servidor.
//  4. Guardar usuario SOL + certificado .pfx y "Probar conexión" (el certificado abre con su contraseña).
// Uso: node ai-scripts/pruebas/prueba-fase11-8-ui.mjs <archivo.pfx de prueba (clave clave123)>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');
process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env.vps'));

const PFX = process.argv[2];
const SITIO = 'https://siumax.duckdns.org';
const PROD = 9100000000051;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (txt, cond) => { console.log(`${cond ? '✅' : '❌'} ${txt}`); if (!cond) fallas++; };

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
const empresaOriginal = await sql("SELECT row_to_json(e) FROM (SELECT id, ruc, direccion, razon_social, regimen FROM empresa_config ORDER BY id LIMIT 1) e");
const base = await sql('SELECT coalesce(max(id), 0) FROM sales');
const limpiar = async () => {
  await sql(`DELETE FROM notas_credito WHERE sale_id > ${base};
    DELETE FROM cash_movements WHERE description LIKE 'Devolución%' AND created_at > now() - interval '1 hour';
    DELETE FROM sale_details WHERE sale_id > ${base}; DELETE FROM sales WHERE id > ${base};
    DELETE FROM inventory_movements WHERE product_id = ${PROD}; DELETE FROM batches WHERE product_id = ${PROD}; DELETE FROM products WHERE id = ${PROD};
    DELETE FROM cpe_correlativos; DELETE FROM privado.facturacion_credenciales;`);
};
await limpiar();
await sql(`UPDATE empresa_config SET ruc='20601234565', razon_social='PRUEBA SIUMAX SAC', direccion='AV PRUEBA 123', regimen='MYPE';
  UPDATE facturacion_config SET activo=false, modo='SIMULADO', proveedor='NUBEFACT', comprobante_por_defecto='BOLETA';
  INSERT INTO products (id,name,price,quantity,unit,category,is_active,control_type) VALUES (${PROD},'PRUEBA TALADRO',59,50,'UND','PRUEBAS',1,'UNIT');`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
page.on('dialog', (d) => d.accept());
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(170); } };
const texto = () => page.evaluate(() => document.body.innerText);
const cerrarAviso = async () => { await page.waitForSelector('#dialogo-sistema-aceptar', { timeout: 8000 }); const t = await page.$eval('[data-dialogo-sistema]', (d) => d.innerText).catch(() => ''); await tecla('Enter'); await pausa(300); return t.replace(/\s+/g, ' '); };
const esperarEstado = async (consulta, meta = 'ACEPTADO', veces = 20) => { let v = ''; for (let i = 0; i < veces && v !== meta && !/RECHAZADO|ERROR/.test(v); i++) { await pausa(1500); v = await sql(consulta); } return v; };

try {
  await page.goto(SITIO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2000);

  // 1. Ajustes > Facturación: Directo a SUNAT en modo Prueba
  await page.click('#sidebar-btn-configuracion'); await pausa(1500);
  await page.focus('#btn-tab-empresa');
  for (let i = 0; i < 8 && (await foco()) !== 'btn-tab-facturacion'; i++) await tecla('ArrowRight');
  await tecla('Enter'); await pausa(1500);
  await page.focus('#fact-prov-NUBEFACT'); await tecla('ArrowRight');
  ok('→ desde Nubefact llega a "Directo a SUNAT"', (await foco()) === 'fact-prov-SUNAT');
  await tecla('Enter'); await pausa(300);
  ok('Muestra los campos de usuario SOL y certificado', !!(await page.$('#fact-sol-usuario')) && !!(await page.$('#fact-cert')) && !(await page.$('#fact-ruta')));
  await tecla('ArrowDown'); ok('↓ baja a los modos', (await foco()) === 'fact-modo-SIMULADO');
  await tecla('ArrowRight', 2); ok('→ → llega a Real', (await foco()) === 'fact-modo-REAL');
  await tecla('Enter');
  await page.focus('#fact-activo'); await tecla('Enter');
  await page.focus('#fact-btn-guardar'); await tecla('Enter');
  let aviso = await cerrarAviso();
  ok(`Real sin usuario SOL ni certificado: no deja activar (${aviso.slice(6, 90)})`, /usuario SOL secundario y el certificado/i.test(aviso));
  await page.focus('#fact-modo-PRUEBA'); await tecla('Enter');
  await page.focus('#fact-btn-guardar'); await tecla('Enter');
  aviso = await cerrarAviso();
  ok('Prueba (ambiente de pruebas de SUNAT) sí se activa sin certificado', /ACTIVA \(modo prueba\)/i.test(aviso));
  ok('Quedó en la base: SUNAT · PRUEBA · activo', (await sql("SELECT proveedor||'|'||modo||'|'||activo FROM facturacion_config")) === 'SUNAT|PRUEBA|true');
  await page.focus('#fact-btn-probar'); await tecla('Enter');
  await page.waitForFunction(() => /ambiente de PRUEBA de SUNAT correcta/.test(document.body.innerText), { timeout: 40000 }).catch(() => {});
  ok('Probar conexión: "ambiente de PRUEBA de SUNAT correcta"', /ambiente de PRUEBA de SUNAT correcta/.test(await texto()));

  // 2. Caja: boleta y factura reales del ambiente de pruebas
  await page.click('#sidebar-btn-pos'); await page.waitForSelector('#buscador-global-pos', { timeout: 15000 }); await pausa(3000);
  const vender = async (tipo, ruc) => {
    await page.focus('#buscador-global-pos'); await page.keyboard.type('PRUEBA TALADRO', { delay: 25 }); await pausa(600);
    await tecla('Enter'); await pausa(800);
    await tecla('F4'); await page.waitForSelector('#pago-efectivo', { timeout: 8000 }); await pausa(700);
    if (tipo === 'FACTURA') {
      await page.focus('#cobro-comp-FACTURA'); await tecla('Enter'); await pausa(200);
      await page.keyboard.type(ruc); await tecla('Enter'); await page.keyboard.type('ferreteria el martillo sac'); await tecla('Enter'); await tecla('Enter');
    } else {
      await page.focus('#pago-efectivo'); await tecla('Enter');
    }
    await page.waitForSelector('#vista-btn-nueva', { timeout: 10000 }); await pausa(500); await tecla('Enter'); await pausa(1200);
  };
  await vender('BOLETA');
  await vender('FACTURA', '20512345671');
  const estadoB = await esperarEstado(`SELECT cpe_estado FROM sales WHERE id > ${base} AND doc_type = 3`);
  const estadoF = await esperarEstado(`SELECT cpe_estado FROM sales WHERE id > ${base} AND doc_type = 1`);
  ok(`SUNAT aceptó la boleta (${estadoB}: ${await sql(`SELECT cpe_mensaje FROM sales WHERE id > ${base} AND doc_type = 3`)})`, estadoB === 'ACEPTADO');
  ok(`SUNAT aceptó la factura (${estadoF}: ${await sql(`SELECT cpe_mensaje FROM sales WHERE id > ${base} AND doc_type = 1`)})`, estadoF === 'ACEPTADO');
  ok('Guardó el resumen (hash de la firma) en la venta', (await sql(`SELECT count(*) FROM sales WHERE id > ${base} AND sunat_hash IS NOT NULL`)) === '2');

  // Nota de crédito por devolución de la factura (como "Devolver productos")
  const ventaF = await sql(`SELECT id FROM sales WHERE id > ${base} AND doc_type = 1`);
  const detalleF = await sql(`SELECT id FROM sale_details WHERE sale_id = ${ventaF}`);
  const dev = await page.evaluate(async (id, det) => {
    const t = localStorage.getItem('gestorpro_sesion');
    const r = await fetch('/rest/v1/rpc/fn_devolver_con_nota_credito', { method: 'POST', headers: { 'x-sesion': t, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_sale_id: Number(id), p_items: [{ detail_id: Number(det), cantidad: 1 }] }) });
    return [r.status, await r.text()];
  }, ventaF, detalleF);
  ok(`Devolución: nota de crédito FC01 (${dev[1].slice(0, 60)})`, dev[0] === 200 && /FC01-00000001/.test(dev[1]));
  const estadoN = await esperarEstado(`SELECT cpe_estado FROM notas_credito WHERE sale_id = ${ventaF}`);
  ok(`SUNAT aceptó la nota de crédito (${estadoN}: ${await sql(`SELECT cpe_mensaje FROM notas_credito WHERE sale_id = ${ventaF}`)})`, estadoN === 'ACEPTADO');

  // 3. Copias propias en el servidor: XML firmado y constancia
  const copias = (await ssh.execCommand("ls /var/lib/siumax-cpe/siumax/*/ 2>/dev/null")).stdout;
  ok(`Copias: XML firmado y constancia (CDR) de los 3 (${copias.split('\n').filter((l) => /\.(xml|zip)$/.test(l)).length} archivos)`,
    /20601234565-03-B001-1\.xml/.test(copias) && /R-20601234565-01-F001-1\.zip/.test(copias) && /R-20601234565-07-FC01-1\.zip/.test(copias));
  const firmado = (await ssh.execCommand("cat /var/lib/siumax-cpe/siumax/*/20601234565-01-F001-1.xml")).stdout;
  ok('El XML guardado está firmado (ds:Signature) y lleva la leyenda en letras', /<ds:Signature Id="SignatureSP"/.test(firmado) && /SON CINCUENTA Y NUEVE CON 00\/100 SOLES/.test(firmado));

  // 4. Guardar usuario SOL + certificado y probar que abre
  if (PFX) {
    await page.click('#sidebar-btn-configuracion'); await pausa(1500);
    await page.focus('#btn-tab-empresa');
    for (let i = 0; i < 8 && (await foco()) !== 'btn-tab-facturacion'; i++) await tecla('ArrowRight');
    await tecla('Enter'); await pausa(1500);
    await page.focus('#fact-sol-usuario'); await page.keyboard.type('factura1');
    await tecla('Enter'); await page.keyboard.type('claveSOL1');
    const archivo = await page.$('#fact-cert'); await archivo.uploadFile(PFX); await pausa(500);
    await page.focus('#fact-cert-clave'); await page.keyboard.type('clave123');
    await page.focus('#fact-btn-guardar-sunat'); await tecla('Enter');
    aviso = await cerrarAviso();
    ok('Guarda el usuario SOL y el certificado', /Usuario SOL y certificado guardados/.test(aviso));
    ok('Muestra el usuario guardado (FACTURA1) sin mostrar claves', /usuario SOL secundario FACTURA1/i.test(await texto()) && !/claveSOL1|clave123/.test(await texto()));
    ok('La API no deja leer la clave SOL ni el certificado', (await page.evaluate(async () => (await fetch('/rest/v1/facturacion_credenciales?select=*', { headers: { 'x-sesion': localStorage.getItem('gestorpro_sesion') } })).status)) >= 400);
    await page.focus('#fact-btn-probar'); await tecla('Enter');
    await page.waitForFunction(() => /SUNAT correcta|certificado/i.test(document.querySelector('#fact-btn-probar')?.closest('div.space-y-3')?.innerText || ''), { timeout: 40000 }).catch(() => {});
    ok('Probar conexión con el certificado guardado: abre bien', /ambiente de PRUEBA de SUNAT correcta/.test(await texto()));
  }
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-fase11-8-error.png' });
} finally {
  await limpiar();
  await sql(`UPDATE facturacion_config SET activo=false, modo='SIMULADO', proveedor='NUBEFACT', comprobante_por_defecto='NOTA', prueba_pedida_at=NULL, prueba_at=NULL, prueba_ok=NULL, prueba_mensaje=NULL;
    UPDATE empresa_config e SET ruc = o.ruc, direccion = o.direccion, razon_social = o.razon_social, regimen = o.regimen
      FROM json_populate_record(NULL::empresa_config, '${empresaOriginal.replace(/'/g, "''")}'::json) o WHERE e.id = o.id;`);
  await ssh.execCommand('rm -rf /var/lib/siumax-cpe/siumax');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
