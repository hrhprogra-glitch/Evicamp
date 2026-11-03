// Prueba de la fase 11.6 en siumax: "Reporte del mes" para el contador (resumen y registro de ventas en Excel/CSV).
// Crea un mes con boletas, una factura (exonerado + bolsa), una nota de crédito y una nota de venta. Deja la base como estaba.
// Uso: node ai-scripts/pruebas/prueba-fase11-6-ui.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');
process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env.vps'));

const SITIO = 'https://siumax.duckdns.org';
const P = [9100000000041, 9100000000042, 9100000000043];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (txt, cond) => { console.log(`${cond ? '✅' : '❌'} ${txt}`); if (!cond) fallas++; };

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
const empresaOriginal = await sql("SELECT row_to_json(e) FROM (SELECT id, ruc, direccion, razon_social, regimen FROM empresa_config ORDER BY id LIMIT 1) e");
const base = await sql('SELECT coalesce(max(id), 0) FROM sales');
const ventasDelMesAntes = await sql("SELECT count(*) FROM sales WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'America/Lima') AT TIME ZONE 'America/Lima'");
const limpiar = async () => {
  await sql(`DELETE FROM notas_credito WHERE sale_id > ${base};
    DELETE FROM sale_details WHERE sale_id > ${base}; DELETE FROM sales WHERE id > ${base};
    DELETE FROM inventory_movements WHERE product_id IN (${P}); DELETE FROM batches WHERE product_id IN (${P}); DELETE FROM products WHERE id IN (${P});
    DELETE FROM cpe_correlativos;`);
};
await limpiar();
const t0 = Date.now();
const [A, F, C, N] = [t0, t0 + 1, t0 + 2, t0 + 3];
await sql(`UPDATE empresa_config SET ruc='20601234565', razon_social='PRUEBA SIUMAX SAC', direccion='AV PRUEBA 123', regimen='MYPE';
  UPDATE facturacion_config SET activo=true, modo='SIMULADO';
  INSERT INTO products (id,name,price,quantity,unit,category,is_active,control_type,tipo_igv,es_bolsa) VALUES
    (${P[0]},'PRUEBA GALLETA',5,100,'UND','PRUEBAS',1,'UNIT','GRAVADO',false),
    (${P[1]},'PRUEBA PAPA',2.5,100,'KG','PRUEBAS',1,'WEIGHT','EXONERADO',false),
    (${P[2]},'PRUEBA BOLSA',0.6,100,'UND','PRUEBAS',1,'UNIT','GRAVADO',true);
  INSERT INTO sales (id,total,payment_type,amount_cash,sunat_status,created_at,doc_type,cpe_cliente_tipo_doc,cpe_cliente_num_doc,cpe_cliente_nombre) VALUES
    (${A}, 10, 'EFECTIVO', 10, 'ACEPTADO', now(), 3, 'SIN', null, null),
    (${F}, 6.2, 'EFECTIVO', 6.2, 'ACEPTADO', now(), 1, 'RUC', '20512345671', 'COMERCIAL SAN MARTIN EIRL'),
    (${C}, 15, 'EFECTIVO', 15, 'ACEPTADO', now(), 3, 'DNI', '12345678', 'ANA TORRES');
  INSERT INTO sales (id,total,payment_type,amount_cash,sunat_status,created_at) VALUES (${N}, 7, 'EFECTIVO', 7, 'ACEPTADO', now());
  INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, subtotal) VALUES
    (${A}, ${P[0]}, 'PRUEBA GALLETA', 2, 5, 10),
    (${F}, ${P[1]}, 'PRUEBA PAPA', 2, 2.5, 5), (${F}, ${P[2]}, 'PRUEBA BOLSA', 2, 0.6, 1.2),
    (${C}, ${P[0]}, 'PRUEBA GALLETA', 3, 5, 15),
    (${N}, ${P[0]}, 'PRUEBA GALLETA', 1, 7, 7);`);
await pausa(9000);
const det = await sql(`SELECT id FROM sale_details WHERE sale_id = ${C}`);
await sql(`INSERT INTO notas_credito (sale_id, motivo, descripcion, total, items) VALUES (${C}, '07', 'PRUEBA', 5,
  '[{"detail_id": ${det}, "product_id": ${P[0]}, "product_name": "PRUEBA GALLETA", "quantity": 1, "subtotal": 5, "tipo_igv": "GRAVADO", "es_bolsa": false}]');`);
await pausa(8000);
ok(`Preparación (${await sql(`SELECT string_agg(doc_serial||'-'||doc_number||':'||cpe_estado, ',' ORDER BY id) FROM sales WHERE id > ${base} AND doc_type IS NOT NULL`)}; NC ${await sql(`SELECT cpe_estado FROM notas_credito WHERE sale_id = ${C}`)})`,
  (await sql(`SELECT count(*) FROM sales WHERE id > ${base} AND cpe_estado = 'ACEPTADO'`)) === '3');

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'reporte-'));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: carpeta });
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(180); } };
const texto = () => page.evaluate(() => document.body.innerText);

try {
  await page.goto(SITIO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-finanzas', { timeout: 20000 }); await pausa(2000);
  await page.click('#sidebar-btn-finanzas'); await pausa(2500);
  await page.focus('#btn-ver-comprobantes'); await tecla('Enter'); await pausa(1200);
  await tecla('ArrowRight', 4);
  ok('→ desde los filtros llega a "Reporte del mes"', (await foco()) === 'btn-comp-reporte');
  await tecla('Enter'); await pausa(500);
  ok('Abre el reporte con el selector en el mes', (await foco()) === 'rep-mes');
  await page.waitForFunction(() => /Resumen de/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
  const t = await texto();
  // Línea del resumen: "Boletas (2)" seguida de su monto (se salta el subtítulo de la ventana)
  const lineas = t.split('\n');
  const linea = (nombre) => {
    const j = lineas.findIndex((l) => l.toUpperCase().startsWith(nombre.toUpperCase()) && !l.includes(','));
    return j < 0 ? '' : `${lineas[j]} ${lineas[j + 1] || ''}`;
  };
  const soloEstas = ventasDelMesAntes === '0';
  if (!soloEstas) console.log(`   (había ${ventasDelMesAntes} ventas de este mes antes de la prueba: el resumen incluye esas)`);
  ok(`Boletas (2) S/ 25.00 — ${linea('Boletas').trim()}`, !soloEstas || /\(2\)\s*S\/ 25\.00/.test(linea('Boletas')));
  ok(`Facturas (1) S/ 6.20 — ${linea('Facturas').trim()}`, !soloEstas || /\(1\)\s*S\/ 6\.20/.test(linea('Facturas')));
  ok(`Notas de crédito (1) S/ -5.00 — ${linea('Notas de crédito').trim()}`, !soloEstas || /\(1\)\s*S\/ -5\.00/.test(linea('Notas de crédito')));
  ok(`Total neto S/ 26.20 — ${linea('Total de comprobantes').trim()}`, !soloEstas || /S\/ 26\.20/.test(linea('Total de comprobantes')));
  ok(`IGV neto S/ 3.09 — ${linea('IGV del mes').trim()}`, !soloEstas || /S\/ 3\.09/.test(linea('IGV del mes')));
  ok(`Notas de venta aparte (1) S/ 7.00 — ${linea('Ventas con nota de venta').trim()}`, !soloEstas || /\(1\)\s*S\/ 7\.00/.test(linea('Ventas con nota de venta')));

  // Descargar con teclado
  await tecla('ArrowDown'); ok('↓ desde el mes llega a "Descargar"', (await foco()) === 'btn-rep-descargar');
  await tecla('Enter');
  let archivo = '';
  for (let i = 0; i < 20 && !archivo; i++) { await pausa(500); archivo = fs.readdirSync(carpeta).find((a) => a.endsWith('.csv')) || ''; }
  ok(`Se descargó el archivo (${archivo})`, /^registro-ventas-20601234565-\d{4}-\d{2}\.csv$/.test(archivo));
  if (archivo) {
    const contenido = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
    const filas = contenido.replace(/^\uFEFF/, '').split('\r\n').map((l) => l.split('","').map((c) => c.replace(/^"|"$/g, '')));
    ok('Empieza con BOM (Excel muestra bien las tildes) y trae el encabezado', contenido.startsWith('\uFEFF') && filas[0][0] === 'Fecha' && filas[0].includes('IGV') && filas[0].includes('ICBPER'));
    const fila = (serieNum) => filas.find((f) => `${f[3]}-${f[4]}` === serieNum) || [];
    const fa = fila('F001-00000001');
    ok(`Factura: exonerado 5.00, ICBPER 1.00, IGV 0.03, total 6.20, RUC (${fa.slice(8, 14).join(' | ')})`, fa[1] === '01' && fa[6] === '20512345671' && fa[9] === '5.00' && fa[12] === '1.00' && fa[11] === '0.03' && fa[13] === '6.20');
    const nc = fila('BC01-00000001');
    ok(`Nota de crédito en negativo y con lo que modifica (${nc.slice(8, 18).join(' | ')})`, nc[1] === '07' && nc[13] === '-5.00' && nc[11] === '-0.76' && /03 B001-0000000\d/.test(nc[16]) && /^07 Devolución por ítem/.test(nc[17]));
    ok('No incluye la nota de venta (va en el resumen aparte)', !filas.some((f) => f[2] === 'NOTA DE VENTA'));
  }
  await tecla('Escape'); await pausa(400);
  ok('Escape vuelve a la lista con el selector en "Reporte del mes"', (await foco()) === 'btn-comp-reporte');
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-fase11-6-error.png' });
} finally {
  await limpiar();
  await sql(`UPDATE facturacion_config SET activo=false, modo='SIMULADO';
    UPDATE empresa_config e SET ruc = o.ruc, direccion = o.direccion, razon_social = o.razon_social, regimen = o.regimen
      FROM json_populate_record(NULL::empresa_config, '${empresaOriginal.replace(/'/g, "''")}'::json) o WHERE e.id = o.id;`);
  await ssh.execCommand('rm -rf /var/lib/siumax-cpe/siumax');
  fs.rmSync(carpeta, { recursive: true, force: true });
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
