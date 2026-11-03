// Prueba de la fase 11.1 en siumax, SOLO CON TECLADO: Ajustes > Facturación.
// Llena Datos de la empresa (RUC, razón social, ubigeo, régimen), activa Facturación en modo SIMULADO,
// guarda, prueba la conexión, guarda una clave falsa
// y revisa la seguridad (la clave no se puede leer por la API y un comprobante no se puede cambiar).
// Al final deja la facturación desactivada y sin datos (es la base de pruebas).
// Uso: node ai-scripts/pruebas/prueba-fase11-1-ui.mjs   (clave en .env.vps: SIUMAX_ADMIN_CLAVE)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
// puppeteer-core no está en el proyecto: se usa el del grabador de videos si hace falta
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');
import { fileURLToPath } from 'node:url';
process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env.vps'));

const SITIO = 'https://siumax.duckdns.org';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (txt, cond) => { console.log(`${cond ? '✅' : '❌'} ${txt}`); if (!cond) fallas++; };

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand(`runuser -u postgres -- psql -At -d siumax`, { stdin: q })).stdout.trim();

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(120); } };
const cerrarAviso = async () => { await page.waitForSelector('#dialogo-sistema-aceptar', { timeout: 8000 }); const t = await page.$eval('#dialogo-sistema-aceptar', (b) => b.closest('[role="dialog"], .fixed')?.innerText || ''); await tecla('Enter'); await pausa(300); return t; };

const empresaOriginal = await sql("SELECT row_to_json(e) FROM (SELECT id, nombre_empresa, ruc, direccion, telefono, razon_social, ubigeo, regimen FROM empresa_config ORDER BY id LIMIT 1) e");

try {
  await page.goto(SITIO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2000);
  await page.click('#sidebar-btn-configuracion'); await pausa(1500);

  // ---- 1. Datos de la empresa (aquí van RUC, razón social, dirección, ubigeo y régimen)
  ok('Ajustes abre en Datos de la empresa con el selector en el nombre', (await foco()) === 'input-empresa-nombre');
  await tecla('ArrowDown'); ok('↓ del nombre baja a Razón social', (await foco()) === 'input-empresa-razon');
  await page.keyboard.type('Prueba SiuMax SAC'); await tecla('Enter');
  ok('Enter en Razón social pasa al RUC', (await foco()) === 'input-empresa-ruc');
  await page.keyboard.type('20601234561'); await tecla('Enter'); // RUC con el último número mal
  ok('Enter en el RUC pasa al teléfono', (await foco()) === 'input-empresa-telefono');
  await tecla('Enter'); ok('Enter baja a la dirección fiscal', (await foco()) === 'input-empresa-direccion');
  await page.keyboard.type('Av. Prueba 123, Lima'); await tecla('Enter');
  ok('Enter en la dirección baja al Ubigeo', (await foco()) === 'input-empresa-ubigeo');
  await page.keyboard.type('15a0101'); // la letra no entra
  ok('El ubigeo solo acepta números', (await page.$eval('#input-empresa-ubigeo', (i) => i.value)) === '150101');
  await tecla('Enter'); ok('Enter en el ubigeo pasa al Régimen', (await foco()) === 'btn-regimen-NRUS');
  await tecla('ArrowRight', 2); ok('→ recorre los regímenes', (await foco()) === 'btn-regimen-MYPE');
  await tecla('Enter');
  ok('Enter marca el régimen', (await page.$eval('#btn-regimen-MYPE', (b) => b.getAttribute('aria-pressed'))) === 'true');
  await tecla('ArrowUp'); ok('↑ del régimen vuelve al ubigeo', (await foco()) === 'input-empresa-ubigeo');
  await tecla('Enter'); await tecla('ArrowDown'); ok('↓ del régimen llega a Guardar', (await foco()) === 'btn-guardar-empresa');
  await tecla('Enter');
  const avisoRuc = await cerrarAviso();
  ok(`Un RUC mal escrito no se guarda (${avisoRuc.replace(/\s+/g, ' ').slice(0, 80)})`, /RUC no es válido/.test(avisoRuc));
  await page.focus('#input-empresa-ruc'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('20601234565'); // RUC con dígito verificador correcto
  await tecla('Enter'); await tecla('ArrowUp'); ok('↑ del teléfono llega a Guardar', (await foco()) === 'btn-guardar-empresa');
  await tecla('Enter');
  const avisoEmpresa = await cerrarAviso();
  ok('Datos de la empresa guardados', /Datos guardados/.test(avisoEmpresa));
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2000); // se recarga sola
  const empresaGuardada = await sql("SELECT ruc||'|'||razon_social||'|'||direccion||'|'||ubigeo||'|'||regimen FROM empresa_config ORDER BY id LIMIT 1");
  ok(`Quedó en la base (${empresaGuardada})`, empresaGuardada === '20601234565|PRUEBA SIUMAX SAC|AV. PRUEBA 123, LIMA|150101|MYPE' || empresaGuardada === '20601234565|PRUEBA SIUMAX SAC|Av. Prueba 123, Lima|150101|MYPE');

  // ---- 2. Facturación: toma esos datos (no los vuelve a pedir)
  await page.click('#sidebar-btn-configuracion'); await pausa(1500);
  await page.focus('#btn-tab-empresa');
  for (let i = 0; i < 8 && (await foco()) !== 'btn-tab-facturacion'; i++) await tecla('ArrowRight');
  ok('La pestaña Facturación se alcanza con flechas', (await foco()) === 'btn-tab-facturacion');
  await tecla('Enter'); await pausa(1500);
  const textoFact = await page.evaluate(() => document.body.innerText);
  ok('Facturación muestra los datos de la empresa (RUC y razón social)', textoFact.includes('20601234565') && textoFact.includes('PRUEBA SIUMAX SAC') && !/\bFalta\b/.test(textoFact));
  ok('Facturación ya no tiene campos propios de RUC/razón social', !(await page.$('#fact-ruc')) && !(await page.$('#fact-razon')));
  ok('Muestra el facturador del servidor funcionando', /Facturador del servidor: funcionando/i.test(textoFact));
  await tecla('ArrowDown');
  ok('↓ desde la pestaña entra al primer control (Activar)', (await foco()) === 'fact-activo');
  await tecla('Enter');
  ok('Enter activa la facturación', (await page.$eval('#fact-activo', (b) => b.getAttribute('aria-checked'))) === 'true');
  await tecla('ArrowDown'); ok('↓ va a "Cambiar en Datos de la empresa"', (await foco()) === 'fact-btn-ir-empresa');
  await tecla('ArrowDown'); ok('↓ baja a las series', (await foco()) === 'fact-serie-boleta');
  await tecla('ArrowRight'); ok('→ al final del texto pasa a la serie de facturas', (await foco()) === 'fact-serie-factura');
  await tecla('Enter'); ok('Enter pasa a la serie de N. crédito', (await foco()) === 'fact-serie-nc-boleta');
  await tecla('ArrowLeft'); await tecla('ArrowLeft'); ok('← vuelve a la serie de boletas', (await foco()) === 'fact-serie-boleta');
  await tecla('ArrowUp'); ok('↑ vuelve a "Cambiar en Datos de la empresa"', (await foco()) === 'fact-btn-ir-empresa');
  // Bajar hasta Guardar
  for (let i = 0; i < 15 && (await foco()) !== 'fact-btn-guardar'; i++) await tecla('ArrowDown');
  ok('↓ llega hasta Guardar cambios', (await foco()) === 'fact-btn-guardar');
  await tecla('Enter');
  const aviso = await cerrarAviso();
  ok(`Guarda y avisa ACTIVA modo simulado (${aviso.replace(/\s+/g, ' ').slice(0, 120)})`, /ACTIVA/i.test(aviso) && /simulado/i.test(aviso));
  ok('Después del aviso el selector sigue en Guardar', (await foco()) === 'fact-btn-guardar');
  const guardado = await sql("SELECT activo||'|'||modo FROM facturacion_config");
  ok(`Quedó en la base (${guardado})`, guardado === 'true|SIMULADO');

  // Probar conexión
  for (let i = 0; i < 6 && (await foco()) !== 'fact-btn-probar'; i++) { await tecla('ArrowUp'); if ((await foco()) === 'fact-btn-guardar-clave') await tecla('ArrowRight'); }
  ok('↑ llega a Probar conexión', (await foco()) === 'fact-btn-probar');
  await tecla('Enter');
  await page.waitForFunction(() => /Modo simulado listo/.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
  ok('La prueba responde "Modo simulado listo"', /Modo simulado listo/.test(await page.evaluate(() => document.body.innerText)));

  // Clave falsa del proveedor: se guarda, se muestra enmascarada y NO se puede leer por la API
  await tecla('ArrowLeft'); await tecla('ArrowUp');
  ok('↑ desde los botones sube a la Ruta', (await foco()) === 'fact-ruta');
  await page.keyboard.type('https://api.nubefact.com/api/v1/prueba-falsa-1234'); await tecla('ArrowRight');
  await page.focus('#fact-token'); await page.keyboard.type('TOKENFALSO-0000-9F3C');
  await tecla('Enter'); ok('Enter en el token baja a Guardar clave', (await foco()) === 'fact-btn-guardar-clave');
  await tecla('Enter');
  const avisoClave = await cerrarAviso();
  ok('Avisa clave guardada', /Clave del proveedor guardada/.test(avisoClave));
  const textoClave = await page.evaluate(() => document.body.innerText);
  ok('Muestra solo el final del token (…9F3C)', textoClave.includes('…9F3C') && !textoClave.includes('TOKENFALSO'));
  const lectura = await page.evaluate(async () => {
    const t = localStorage.getItem('gestorpro_sesion');
    const r1 = await fetch('/rest/v1/facturacion_credenciales?select=*', { headers: { 'x-sesion': t } });
    const r2 = await fetch('/rest/v1/rpc/fn_siguiente_correlativo', { method: 'POST', headers: { 'x-sesion': t, 'Content-Type': 'application/json' }, body: '{"p_serie":"B001"}' });
    return { credenciales: r1.status, numero: r2.status, texto: (await r1.text()).slice(0, 80) };
  });
  ok(`La API no deja leer la clave (HTTP ${lectura.credenciales}) ni pedir números (HTTP ${lectura.numero})`, lectura.credenciales >= 400 && lectura.numero >= 400 && !lectura.texto.includes('TOKENFALSO'));

  // Un comprobante emitido no se puede cambiar ni anular desde la pantalla (API)
  await sql("UPDATE facturacion_config SET modo='SIMULADO'; INSERT INTO sales (id,total,payment_type,amount_cash,sunat_status,created_at,doc_type) VALUES (9000000000011,10,'EFECTIVO',10,'ACEPTADO',now(),3); INSERT INTO sale_details (sale_id,product_name,quantity,price_at_moment,subtotal) VALUES (9000000000011,'PRUEBA',1,10,10);");
  await pausa(9000);
  const emitida = await sql("SELECT doc_serial||'-'||doc_number||'|'||cpe_estado FROM sales WHERE id=9000000000011");
  ok(`El facturador emitió la boleta de prueba (${emitida})`, /^B001-\d+\|ACEPTADO$/.test(emitida));
  const cambio = await page.evaluate(async () => {
    const t = localStorage.getItem('gestorpro_sesion');
    const h = { 'x-sesion': t, 'Content-Type': 'application/json' };
    const a = await fetch('/rest/v1/sales?id=eq.9000000000011', { method: 'PATCH', headers: h, body: '{"total":1}' });
    const b = await fetch('/rest/v1/sales?id=eq.9000000000011', { method: 'PATCH', headers: h, body: '{"sunat_status":"ANULADO"}' });
    return [a.status, (await a.text()).slice(0, 400), b.status, (await b.text()).slice(0, 400)];
  });
  ok(`No deja cambiar el total (HTTP ${cambio[0]})`, cambio[0] >= 400 && /no se pueden cambiar/.test(cambio[1]));
  ok(`No deja anular sin nota de crédito (HTTP ${cambio[2]})`, cambio[2] >= 400 && /nota de cr/.test(cambio[3]));
  await page.focus('#fact-btn-ir-empresa'); await tecla('Enter'); await pausa(800);
  ok('"Cambiar en Datos de la empresa" abre esa pestaña con el selector listo para escribir', ['btn-tab-empresa', 'input-empresa-nombre'].includes(await foco()) && !!(await page.$('#input-empresa-razon')));
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-fase11-1-error.png' });
} finally {
  // Dejar la base de pruebas como estaba
  await sql(`DELETE FROM sale_details WHERE sale_id = 9000000000011; DELETE FROM sales WHERE id = 9000000000011; DELETE FROM cpe_correlativos;
    DELETE FROM privado.facturacion_credenciales;
    UPDATE empresa_config e SET nombre_empresa = o.nombre_empresa, ruc = o.ruc, direccion = o.direccion, telefono = o.telefono,
      razon_social = o.razon_social, ubigeo = o.ubigeo, regimen = o.regimen
      FROM json_populate_record(NULL::empresa_config, '${empresaOriginal.replace(/'/g, "''")}'::json) o WHERE e.id = o.id;
    UPDATE facturacion_config SET activo=false, modo='SIMULADO',
      prueba_pedida_at=NULL, prueba_at=NULL, prueba_ok=NULL, prueba_mensaje=NULL;`);
  await ssh.execCommand('rm -rf /var/lib/siumax-cpe/siumax');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
