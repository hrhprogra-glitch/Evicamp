// Prueba de SiuMax Nego, paso 3e (12/11/2026): una salida con un producto DEL INVENTARIO descuenta su stock (y el de su
// lote) en la base de Nego. Al final deja el stock, los lotes y el tipo de negocio como estaban.
// Uso: node ai-scripts/pruebas/prueba-salida-stock-nego.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sello = String(Date.now()).slice(-6); const CLI = `PRUEBA AUTO STOCK ${sello}`; const TRAB = `PRUEBA AUTO TEC ${sello}`;
const prod = (await sql(`SELECT id, name, quantity FROM products WHERE is_active = 1 AND coalesce(quantity,0) >= 2 ORDER BY id LIMIT 1`)).split('|');
const [pid, pnombre, qAntes] = [prod[0], prod[1], Number(prod[2])];
const lotesAntes = await sql(`SELECT id, quantity FROM batches WHERE product_id = ${pid} ORDER BY id`);
await sql(`INSERT INTO customers (id, name, activo, created_at, is_synced) VALUES (${980000 + Number(sello) % 9000}, '${CLI}', true, now(), 1); INSERT INTO trabajadores (nombre, cargo, estado) VALUES ('${TRAB}', 'TECNICO', 'ACTIVO'); UPDATE empresa_config SET tipos_negocio = '{comercio,servicios}';`);
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.type('#input-login-usuario', 'admin@siumax.com');
  await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 20000 }); await pausa(2000);
  await page.evaluate(() => document.getElementById('sidebar-btn-salidas').click()); await pausa(2000);
  await page.focus('#btn-nueva-salida'); await page.keyboard.press('Enter'); await pausa(1200);
  await page.evaluate((nom) => { const sel = document.getElementById('select-cliente-salida'); const o = [...sel.options].find((x) => x.text.includes(nom)); sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }, CLI);
  await pausa(400);
  await page.evaluate((nom) => { [...document.querySelectorAll('button')].find((b) => b.textContent.includes(nom))?.click(); }, TRAB); await pausa(300);
  await page.focus('#input-buscar-producto-salida'); await page.keyboard.type(pnombre, { delay: 20 }); await pausa(600);
  await page.keyboard.press('Enter'); await pausa(500);
  await page.focus('#input-cant-item-salida'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type('1');
  await page.focus('#btn-agregar-material-salida'); await page.keyboard.press('Enter'); await pausa(600);
  ok(`El producto del inventario (${pnombre}) entra a la salida`, await page.evaluate((n) => (document.querySelector('#modal-nueva-salida-container table')?.textContent || '').toUpperCase().includes(n.toUpperCase()), pnombre));
  await page.focus('#btn-guardar-salida'); await page.keyboard.press('Enter'); await pausa(2500);
  const msg = await page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
  ok('Se registra la salida', /registrada con éxito/i.test(msg), msg.slice(0, 120));
  const qDespues = Number(await sql(`SELECT quantity FROM products WHERE id = ${pid}`));
  ok(`El stock baja en 1 (${qAntes} → ${qDespues})`, Math.abs(qAntes - 1 - qDespues) < 0.001);
} catch (e) { ok('Sin fallas', false, e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  // Dejar todo como estaba
  const restaurarLotes = lotesAntes ? lotesAntes.split('\n').map((l) => { const [id, q] = l.split('|'); return `UPDATE batches SET quantity = ${q} WHERE id = ${id};`; }).join(' ') : '';
  await sql(`DELETE FROM salidas WHERE customer_id IN (SELECT id FROM customers WHERE name = '${CLI}'); DELETE FROM customers WHERE name = '${CLI}'; DELETE FROM trabajadores WHERE nombre = '${TRAB}';
    UPDATE products SET quantity = ${qAntes} WHERE id = ${pid}; ${restaurarLotes} UPDATE empresa_config SET tipos_negocio = '{comercio}';`);
  ok('Stock y lotes devueltos a como estaban', Number(await sql(`SELECT quantity FROM products WHERE id = ${pid}`)) === qAntes && (await sql(`SELECT id, quantity FROM batches WHERE product_id = ${pid} ORDER BY id`)) === lotesAntes);
  console.log(res.join('\n'));
}
