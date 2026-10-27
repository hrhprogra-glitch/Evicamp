// Prueba de la fase 1.1 (siumax): unidades SUNAT. Crear productos por BOLSA (entero) y por METRO (decimal) desde
// el formulario, que guarden su código SUNAT; venderlos en Caja (el metro pregunta "¿Cuántos metros?" y acepta
// decimales; la bolsa va entera); editar un producto antiguo de KG abre con "Kilogramo" y SUNAT KGM.
// Uso: node prueba-unidades.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const m = Date.now(); const BOLSA = `DEMO BOLSA ${m}`, CABLE = `DEMO CABLE ${m}`;

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message)); page.on('dialog', (d) => d.accept());
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k) => { await page.keyboard.press(k); await pausa(200); };
const crear = async (tipo, nombre, unidadCorta, precio) => {
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-tab-productos'); await pausa(1500);
  await page.focus('#btn-nuevo-producto'); await tecla('Enter'); await page.waitForSelector(`#btn-naturaleza-${tipo}`); await pausa(400);
  await page.focus(`#btn-naturaleza-${tipo}`); await tecla('Enter'); await page.waitForSelector('#input-nombre-producto'); await pausa(400);
  await page.focus('#input-nombre-producto'); await page.keyboard.type(nombre);
  await page.focus('#input-precio-producto'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(precio);
  // "Se vende por": con → hasta la unidad pedida
  await page.focus('#select-unidad-peso-producto');
  for (let i = 0; i < 30 && (await page.$eval('#select-unidad-peso-producto', (s) => s.value)) !== unidadCorta; i++) await tecla('ArrowRight');
  const sunat = await page.$eval('#codigo-sunat-producto', (e) => e.innerText);
  await page.focus('#btn-guardar-producto'); await tecla('Enter'); await pausa(2500);
  return { valor: await page.evaluate(() => document.getElementById('select-unidad-peso-producto')?.value), sunat };
};
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(3000);

  // 1) Productos nuevos
  const b = await crear('unidad', BOLSA, 'BOLSA', '2.50');
  ok('Por unidad: "Se vende por" Bolsa muestra SUNAT: BG', /BG/.test(b.sunat), b.sunat);
  const c = await crear('peso', CABLE, 'M', '3.20');
  ok('Por medida: "Se vende por" Metro muestra SUNAT: MTR', /MTR/.test(c.sunat), c.sunat);
  const filas = await sql(`select name||'|'||unit||'|'||control_type||'|'||sunat_unit_code from products where name in ('${BOLSA}','${CABLE}') order by name;`);
  ok('Servidor: BOLSA entera con BG y CABLE por metro (con decimales) con MTR', filas === `${BOLSA}|BOLSA|UND|BG\n${CABLE}|M|WEIGHT|MTR`, filas.replace(/\n/g, ' ; '));
  await sql(`update products set quantity = 50 where name in ('${BOLSA}','${CABLE}'); insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced) select ${m} + row_number() over (), id, 50, 50, 50, 1, 'DEMO-UNID', 1, 1 from products where name in ('${BOLSA}','${CABLE}');`);

  // 2) Caja: metro con decimales
  await page.reload({ waitUntil: 'networkidle2' }); await page.waitForSelector('#sidebar-btn-pos'); await pausa(2000);
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await page.waitForSelector('#buscador-global-pos'); await pausa(1200);
  await page.focus('#buscador-global-pos'); await page.keyboard.type(CABLE); await pausa(600); await tecla('Enter'); await pausa(800);
  const ventana = await page.evaluate(() => document.querySelector('#balanza-input-peso')?.closest('[class*="fixed"]')?.innerText || '');
  ok('Caja · metro: pregunta "¿Cuántos metros? (M)" y "Precio x M"', /¿Cuántos metros\? \(M\)/i.test(ventana) && /Precio x M/i.test(ventana), ventana.replace(/\s+/g, ' ').slice(0, 160));
  await page.focus('#balanza-input-peso'); await page.keyboard.type('2.5'); await pausa(300);
  await page.click('#balanza-btn-confirm'); await pausa(900);
  const linea = await page.evaluate(() => document.querySelector('#edit-input-0, [id^="edit-input-"]')?.value || document.body.innerText.match(/2\.5/)?.[0] || '');
  ok('El carrito tiene 2.5 metros (con decimales)', /2\.5/.test(linea), linea);
  ok('El stock dice "M" (no "UN")', /STK: 50 M/.test(await page.evaluate(() => document.body.innerText)));
  // 3) Caja: bolsa entera
  await page.focus('#buscador-global-pos'); await page.keyboard.type(BOLSA); await pausa(600); await tecla('Enter'); await pausa(800);
  ok('Caja · bolsa: entra directo (sin preguntar medida) y su stock dice "BOLSA"', !(await page.$('#balanza-input-peso')) && /STK: 50 BOLSA/.test(await page.evaluate(() => document.body.innerText)));

  // 4) Editar un producto antiguo de KG
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#buscador-global-inventario'); await pausa(1500);
  await page.focus('#btn-tab-productos'); await tecla('Enter');
  await page.focus('#buscador-global-inventario'); await page.keyboard.type('ARROZ COSTEÑO A GRANEL'); await pausa(1000);
  await page.evaluate(() => [...document.querySelectorAll('[data-row="true"]')].find((f) => f.offsetParent && f.innerText.includes('ARROZ COSTEÑO A GRANEL'))?.focus());
  await tecla('Enter'); await page.waitForSelector('#select-unidad-peso-producto'); await pausa(500);
  const kg = { valor: await page.$eval('#select-unidad-peso-producto', (s) => s.value), sunat: await page.$eval('#codigo-sunat-producto', (e) => e.innerText) };
  ok('Editar un producto antiguo de KG: abre con Kilogramo y SUNAT: KGM', kg.valor === 'KG' && /KGM/.test(kg.sunat), JSON.stringify(kg));
  await tecla('Escape'); await pausa(500);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set is_active = 0 where name in ('${BOLSA}','${CABLE}'); update batches set is_active = 0 where document_ref = 'DEMO-UNID';`).catch(() => {});
  console.log(res.join('\n'));
}
