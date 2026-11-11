// Prueba de la fase 11.2 en siumax, SOLO CON TECLADO: "Impuesto" y "Es bolsa plástica" en la ficha del producto,
// y que el facturador separe IGV, exonerado y el impuesto a la bolsa. Deja la base de pruebas como estaba.
// Uso: node ai-scripts/pruebas/prueba-fase11-2-ui.mjs   (clave en .env.vps: SIUMAX_ADMIN_CLAVE)
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
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ok = (txt, cond) => { console.log(`${cond ? '✅' : '❌'} ${txt}`); if (!cond) fallas++; };

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
const empresaOriginal = await sql("SELECT row_to_json(e) FROM (SELECT id, ruc, direccion, razon_social, regimen FROM empresa_config ORDER BY id LIMIT 1) e");

// Datos de prueba: 3 productos (con IGV, exonerado y bolsa) y facturación simulada
await sql(`UPDATE empresa_config SET ruc='20601234565', razon_social='PRUEBA SIUMAX SAC', direccion='AV PRUEBA 123', regimen='MYPE';
  UPDATE facturacion_config SET activo=true, modo='SIMULADO';
  DELETE FROM products WHERE id IN (9100000000001, 9100000000002, 9100000000003);
  INSERT INTO products (id,name,price,quantity,unit,category,is_active,tipo_igv,es_bolsa) VALUES
    (9100000000001,'PRUEBA INCA KOLA 1.5L',7,50,'UND','PRUEBAS',1,'GRAVADO',false),
    (9100000000002,'PRUEBA PAPA AMARILLA',2.5,50,'KG','PRUEBAS',1,'EXONERADO',false),
    (9100000000003,'PRUEBA BOLSA PLASTICA',0.6,50,'UND','PRUEBAS',1,'GRAVADO',true);`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const page = await nav.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
page.on('request', (r) => { if (process.env.DEPURAR && r.url().includes('/rest/v1/products') && r.method() !== 'GET') console.log('   API', r.method(), (r.postData() || '').match(/"tipo_igv":"w+"|"es_bolsa":w+/g)); });
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k, veces = 1) => { for (let i = 0; i < veces; i++) { await page.keyboard.press(k); await pausa(150); } };
const abrirProducto = async (nombre) => {
  await page.evaluate((n) => { const fila = [...document.querySelectorAll('#tabla-productos-inventario [data-row="true"]')].find((f) => f.innerText.includes(n)); fila?.focus(); }, nombre);
  await tecla('Enter'); await pausa(1200);
};

try {
  await page.goto(SITIO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(2000);
  await page.click('#sidebar-btn-inventario'); await pausa(3000);

  // 1. Producto con IGV: el panel avanzado está cerrado; se abre y se llega a la fila del impuesto
  await abrirProducto('PRUEBA INCA KOLA');
  ok('Enter en la fila abre la ficha del producto', !!(await page.$('#input-nombre-producto')));
  await page.focus('#btn-toggle-opciones-avanzadas'); await tecla('Enter'); await pausa(500);
  ok('La ficha tiene la fila "Impuesto" con "Con IGV" marcado', (await page.$eval('#btn-igv-GRAVADO', (b) => b.getAttribute('aria-pressed')).catch(() => null)) === 'true');
  await page.focus('#input-controla-series-producto');
  await tecla('ArrowDown'); ok('↓ desde Series/IMEI baja a "Con IGV"', (await foco()) === 'btn-igv-GRAVADO');
  await tecla('ArrowRight'); ok('→ pasa a Exonerado', (await foco()) === 'btn-igv-EXONERADO');
  await tecla('Enter'); ok('Enter marca Exonerado', (await page.$eval('#btn-igv-EXONERADO', (b) => b.getAttribute('aria-pressed'))) === 'true');
  await tecla('ArrowRight'); await tecla('ArrowRight'); ok('→ → llega a "Es bolsa plástica"', (await foco()) === 'btn-es-bolsa-producto');
  await tecla('Enter'); ok('Enter marca "Es bolsa plástica"', (await page.$eval('#btn-es-bolsa-producto', (b) => b.getAttribute('aria-checked'))) === 'true');
  await tecla('ArrowLeft'); ok('← vuelve a Inafecto', (await foco()) === 'btn-igv-INAFECTO');
  await tecla('ArrowUp'); ok('↑ vuelve a Series/IMEI', (await foco()) === 'input-controla-series-producto');
  await tecla('ArrowDown'); ok('↓ baja al impuesto marcado (Exonerado)', (await foco()) === 'btn-igv-EXONERADO');
  await tecla('ArrowDown');
  const abajo = await foco();
  ok(`↓ desde el impuesto baja a la siguiente sección (${abajo})`, ['escala-desde-0', 'pres-unidad-0', 'check-tiene-variantes', 'btn-guardar-producto'].includes(abajo));
  if (abajo === 'escala-desde-0') { await tecla('ArrowUp'); ok('↑ desde las escalas sube a la fila del impuesto', (await foco()) === 'btn-es-bolsa-producto'); }
  await page.focus('#input-controla-series-producto'); await tecla('Tab');
  ok('Tab desde Series/IMEI también entra a la fila del impuesto', (await foco()) === 'btn-igv-GRAVADO');
  await page.focus('#btn-guardar-producto'); await tecla('Enter');
  let guardado = '';
  for (let i = 0; i < 20 && guardado !== 'EXONERADO|true'; i++) { await pausa(500); guardado = await sql("SELECT tipo_igv||'|'||es_bolsa FROM products WHERE id=9100000000001"); }
  if (guardado !== 'EXONERADO|true') {
    await page.screenshot({ path: 'prueba-fase11-2-guardar.png' });
    console.log('   ficha:', await page.evaluate(() => ({ nombre: document.getElementById('input-nombre-producto')?.value, codigo: document.getElementById('input-codigo-producto')?.value, barras: document.getElementById('input-barcode-producto')?.value, aviso: [...document.querySelectorAll('p,div,span')].map((e) => e.innerText).find((t) => /obligatorio|ya existe|error|permiso/i.test(t || '') && t.length < 600) || '' })).then((x) => JSON.stringify(x)));
  }
  ok(`Se guardó en la base (${guardado})`, guardado === 'EXONERADO|true');
  const avisoAbierto = await page.$('#dialogo-sistema-aceptar');
  if (avisoAbierto) { console.log('   (aviso al guardar:', (await page.evaluate(() => document.querySelector('[data-dialogo-sistema]')?.innerText || '')).replace(/\s+/g, ' '), ')'); await tecla('Enter'); }

  // 2. Al reabrirlo, el panel avanzado se abre solo y muestra lo guardado
  await page.waitForFunction(() => !document.getElementById('input-nombre-producto'), { timeout: 8000 }).catch(() => {});
  await pausa(800);
  await abrirProducto('PRUEBA INCA KOLA');
  ok('Al reabrir, muestra Exonerado y bolsa marcados', (await page.$eval('#btn-igv-EXONERADO', (b) => b.getAttribute('aria-pressed')).catch(() => null)) === 'true'
    && (await page.$eval('#btn-es-bolsa-producto', (b) => b.getAttribute('aria-checked')).catch(() => null)) === 'true');
  // Volver a dejarlo con IGV y sin bolsa (con clic, como el mouse)
  await page.click('#btn-igv-GRAVADO'); await page.click('#btn-es-bolsa-producto');
  await page.focus('#btn-guardar-producto'); await tecla('Enter'); await pausa(2500);
  ok('Con el mouse también se cambia y se guarda', (await sql("SELECT tipo_igv||'|'||es_bolsa FROM products WHERE id=9100000000001")) === 'GRAVADO|false');

  // 3. El facturador separa con IGV, exonerado y el impuesto a la bolsa
  await sql(`INSERT INTO sales (id,total,payment_type,amount_cash,sunat_status,created_at,doc_type) VALUES (9000000000021, 20.2, 'EFECTIVO', 20.2, 'ACEPTADO', now(), 3);
    INSERT INTO sale_details (sale_id, product_id, product_name, quantity, price_at_moment, subtotal) VALUES
      (9000000000021,9100000000001,'PRUEBA INCA KOLA 1.5L',2,7,14),(9000000000021,9100000000002,'PRUEBA PAPA AMARILLA',2,2.5,5),(9000000000021,9100000000003,'PRUEBA BOLSA PLASTICA',2,0.6,1.2);`);
  ok('Cada línea copia el impuesto del producto al vender', (await sql("SELECT string_agg(tipo_igv||'/'||es_bolsa, ',' ORDER BY id) FROM sale_details WHERE sale_id=9000000000021")) === 'GRAVADO/false,EXONERADO/false,GRAVADO/true');
  await pausa(10000);
  const r = await ssh.execCommand(`f=$(grep -l '"numero": '"$(runuser -u postgres -- psql -At -d siumax -c 'SELECT doc_number FROM sales WHERE id=9000000000021')"',' /var/lib/siumax-cpe/siumax/*/*B001*.json | tail -1); /opt/node22/bin/node -e 'console.log(JSON.stringify(JSON.parse(require("fs").readFileSync(process.argv[1])).doc.totales))' "$f"`);
  const tot = JSON.parse(r.stdout || '{}');
  ok(`Totales del comprobante ${r.stdout.trim()}`, tot.total === 20.2 && tot.exonerada === 5 && tot.icbper === 1 && tot.igv === 2.17 && tot.gravada === 12.03);
  ok('Sin errores de JavaScript', errores.length === 0);
  if (errores.length) console.log(errores);
} catch (e) {
  console.log('❌ FALLÓ:', e.message); fallas++;
  await page.screenshot({ path: 'prueba-fase11-2-error.png' });
} finally {
  await sql(`DELETE FROM sale_details WHERE sale_id = 9000000000021; DELETE FROM sales WHERE id = 9000000000021;
    DELETE FROM inventory_movements WHERE product_id IN (9100000000001, 9100000000002, 9100000000003);
    DELETE FROM batches WHERE product_id IN (9100000000001, 9100000000002, 9100000000003);
    DELETE FROM products WHERE id IN (9100000000001, 9100000000002, 9100000000003);
    DELETE FROM cpe_correlativos;
    UPDATE facturacion_config SET activo=false, modo='SIMULADO';
    UPDATE empresa_config e SET ruc = o.ruc, direccion = o.direccion, razon_social = o.razon_social, regimen = o.regimen
      FROM json_populate_record(NULL::empresa_config, '${empresaOriginal.replace(/'/g, "''")}'::json) o WHERE e.id = o.id;`);
  await ssh.execCommand('rm -rf /var/lib/siumax-cpe/siumax');
  await nav.close(); ssh.dispose();
  console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
}
