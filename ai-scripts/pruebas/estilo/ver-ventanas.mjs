// Capturas de las ventanas flotantes (para revisar su estilo a ojo). Abre una caja y un producto de prueba por SQL
// (no vende nada) y al final los borra. Uso: node ai-scripts/pruebas/estilo/ver-ventanas.mjs <carpeta> [filtro]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../../vps.cjs');
process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../.env.vps'));
const DIR = process.argv[2];
const FILTRO = process.argv[3] || '';
const PROD = 9100000000077, CAJA = 9100000000077;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
// [nombre, sección, pestaña, botón(es) a pulsar en orden]
const VENTANAS = [
  ['cobro', 'pos', null, ['btn-proceder-pago']],
  ['cliente-pos', 'pos', null, ['btn-pos-header-cliente']],
  ['espera', 'pos', null, ['btn-pausar-ticket']],
  ['cotizacion-pos', 'pos', null, ['btn-pos-cotizacion']],
  ['pedido-pos', 'pos', null, ['btn-pos-pedido']],
  ['caja-del-dia', 'pos', null, ['btn-caja-actual-pos']],
  ['nuevo-cliente', 'clientes', null, ['btn-nuevo-cliente']],
  ['grupos', 'clientes', null, ['btn-ver-grupos']],
  ['nuevo-producto', 'inventario', null, ['btn-nuevo-producto']],
  ['ingresar-lote', 'inventario', null, ['btn-ingresar-lote']],
  ['producir', 'inventario', null, ['btn-header-producir']],
  ['traspasos', 'inventario', null, ['btn-traspasos']],
  ['proveedores', 'inventario', null, ['btn-proveedores']],
  ['nuevo-ajuste', 'conteos', null, ['btn-nuevo-ajuste']],
  ['nuevo-movimiento', 'finanzas', null, ['btn-nuevo-movimiento']],
  ['reporte-contador', 'finanzas', null, ['btn-reporte-contador']],
  ['cierre-caja', 'finanzas', null, ['btn-cerrar-caja']],
  ['nuevo-usuario', 'configuracion', 'btn-tab-usuarios', ['btn-nuevo-usuario-ajustes']],
  ['nueva-tienda', 'configuracion', 'btn-tab-tiendas', ['btn-nueva-tienda']],
].filter((v) => v[0].includes(FILTRO));

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
if (await sql("SELECT count(*) FROM cash_sessions WHERE status = 'OPEN' AND id <> " + CAJA) !== '0') { console.log('Hay una caja abierta de verdad en siumax: no hago nada.'); process.exit(1); }
const ventasAntes = await sql('SELECT count(*) FROM sales');
const limpiar = () => sql(`DELETE FROM inventory_movements WHERE product_id = ${PROD}; DELETE FROM sales WHERE id IN (SELECT sale_id FROM sale_details WHERE product_id = ${PROD}); DELETE FROM sale_details WHERE product_id = ${PROD}; DELETE FROM products WHERE id = ${PROD}; DELETE FROM cash_sessions WHERE id = ${CAJA};`);
await limpiar();
await sql(`INSERT INTO cash_sessions (id, opening_balance, status, opened_at, is_synced) VALUES (${CAJA}, 0, 'OPEN', now(), 1);
  INSERT INTO products (id, name, price, quantity, unit, category, is_active, control_type) VALUES (${PROD}, 'PRUEBA VENTANAS', 5, 50, 'UND', 'PRUEBAS', 1, 'UNIT');`);
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const hechas = [];
try {
  const page = await nav.newPage();
  await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter'); await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2500);
  await page.evaluate(() => document.getElementById('sidebar-btn-pos')?.click()); await pausa(1500);
  await page.focus('#buscador-global-pos'); await page.keyboard.type('PRUEBA VENTANAS', { delay: 20 }); await pausa(1000);
  await page.keyboard.press('Enter'); await pausa(1000);
  for (const [nombre, seccion, pestana, botones] of VENTANAS) {
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await pausa(200); }
    await page.evaluate((id) => document.getElementById('sidebar-btn-' + id)?.click(), seccion); await pausa(2000);
    if (pestana) { await page.evaluate((id) => document.getElementById(id)?.click(), pestana); await pausa(1200); }
    let ok = true;
    for (const b of botones) { ok = await page.evaluate((id) => { const el = document.getElementById(id); if (!el) return false; el.click(); return true; }, b); await pausa(1500); if (!ok) break; }
    if (!ok) { hechas.push(`·  ${nombre}: botón no está`); continue; }
    await page.screenshot({ path: `${DIR}/ven-${nombre}.png` });
    hechas.push(`📷 ${nombre}`);
    if (Number(await sql('SELECT count(*) FROM sales')) !== Number(ventasAntes)) { hechas.push('🛑 se creó una venta: me detengo'); break; }
  }
} finally {
  await nav.close();
  await limpiar();
  console.log(hechas.join('\n'));
  console.log('ventas', ventasAntes, '→', await sql('SELECT count(*) FROM sales'));
  ssh.dispose();
}
