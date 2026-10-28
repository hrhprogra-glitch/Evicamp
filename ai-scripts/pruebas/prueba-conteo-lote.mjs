// Prueba (siumax), SOLO CON TECLADO: en CONTEO, quien tiene Conteos completo (admin) ve el desplegable de lotes con
// "Automático" primero y puede elegir a qué lote va la diferencia; si el lote no alcanza para lo que falta, avisa.
// Nombres nuevos de "¿Qué pasó?": MERMA y CONTEO.
// Uso: node ai-scripts/pruebas/prueba-conteo-lote.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const m = Date.now();
const P = 985000 + (m % 9000);
await sql(`insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced) values
  (${P}, 'PRUEBA LOTE CONTEO ${m}', 'GENERAL', 'LCO${m}', 5, 10, 1, 'UND', 1, 1);
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced, created_at) values
  (${m}, ${P}, 5, 5, 5, 1, 'LCO-A', 1, 1, now() - interval '5 day'), (${m + 1}, ${P}, 5, 5, 10, 2, 'LCO-B', 1, 1, now() - interval '1 day');`);
const estado = () => sql(`select quantity from products where id=${P}; select string_agg(document_ref||'='||quantity, ',' order by created_at) from batches where product_id=${P} and is_active<>0;`).then((r) => r.replace(/\n/g, ' | '));

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const page = await nav.newPage(); const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const texto = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ') || '', sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const elegirProductoEnConteo = async () => {
  await page.focus('#input-buscar-ajuste'); await page.keyboard.type(`LCO${m}`, { delay: 10 }); await pausa(300); await tecla('Enter'); await pausa(500);
  if ((await foco()) === 'modo-ajuste-SALIDA') await tecla('ArrowRight');
  await tecla('Enter'); await pausa(400);
};
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-conteos', { timeout: 20000 }); await pausa(2500);
  await page.focus('#sidebar-btn-conteos'); await tecla('Enter'); await page.waitForSelector('#btn-nuevo-ajuste'); await pausa(1500);
  await page.focus('#btn-nuevo-ajuste'); await tecla('Enter'); await pausa(600);

  await page.focus('#input-buscar-ajuste'); await page.keyboard.type(`LCO${m}`, { delay: 10 }); await pausa(300); await tecla('Enter'); await pausa(500);
  const nombres = await page.evaluate(() => [document.getElementById('modo-ajuste-SALIDA')?.innerText, document.getElementById('modo-ajuste-CONTEO')?.innerText].map((t) => (t || '').replace(/\s+/g, ' ')));
  ok('Las opciones dicen MERMA y CONTEO (con su explicación corta)', /MERMA/i.test(nombres[0]) && /se dañó, venció, se perdió o se usó/i.test(nombres[0]) && /CONTEO/i.test(nombres[1]) && /cuento lo que hay/i.test(nombres[1]), JSON.stringify(nombres));
  await tecla('ArrowRight'); await tecla('Enter'); await pausa(400);
  ok('Admin en CONTEO: Enter pasa al desplegable de lotes, que empieza en "Automático"', (await foco()) === 'lote-ajuste-elegido' && /AUTOM[AÁ]TICO/i.test(await texto('#lote-ajuste-elegido')), `${await foco()} / ${await texto('#lote-ajuste-elegido')}`);
  await tecla('Enter'); await pausa(300);
  const opciones = await page.$$eval('[data-lote-ajuste]', (b) => b.map((x) => x.innerText.replace(/\s+/g, ' ')));
  ok('Enter abre: "Automático" + los 2 lotes con stock', opciones.length === 3 && /AUTOM/i.test(opciones[0]), JSON.stringify(opciones).slice(0, 160));
  await tecla('ArrowDown', 2); await tecla('Enter'); await pausa(300);
  ok('↓ ↓ Enter elige el lote más nuevo y pasa a "¿Cuántos hay?"', (await foco()) === 'input-contado' && /QUEDAN 5 UND/i.test(await texto('#lote-ajuste-elegido')) && /2\.00/.test(await texto('#lote-ajuste-elegido')), `${await foco()} / ${await texto('#lote-ajuste-elegido')}`);
  await page.keyboard.type('8'); await tecla('Enter'); await pausa(1200);
  ok('Faltan 2 y dice que salen DE ESE lote (no del más antiguo)', /FALTAN 2 UND/i.test(await texto('#ajuste-diferencia')) && /sale del lote del/i.test(await texto('#ajuste-diferencia')), await texto('#ajuste-diferencia'));
  await tecla('Enter'); await page.keyboard.type('conteo por lote', { delay: 10 }); await tecla('Enter'); await tecla('Enter'); await pausa(2500);
  ok('Servidor: stock 8 y los 2 salieron del lote elegido (B 5→3, A sigue 5)', (await estado()) === '8 | LCO-A=5,LCO-B=3', await estado());

  // El lote no alcanza: contar 0 eligiendo A (5) → faltan 8 → avisa
  await elegirProductoEnConteo();
  await tecla('Enter'); await pausa(300); await tecla('ArrowDown'); await tecla('Enter'); await pausa(300);
  await page.keyboard.type('0'); await tecla('Enter'); await pausa(1200);
  await tecla('Enter'); await page.keyboard.type('no alcanza el lote', { delay: 10 }); await tecla('Enter'); await tecla('Enter'); await pausa(2000);
  ok('Si el lote elegido no alcanza, el servidor avisa "Ese lote solo tiene 5"', /solo tiene 5/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(400);
  ok('No cambió nada', (await estado()) === '8 | LCO-A=5,LCO-B=3', await estado());
  await tecla('Escape'); await pausa(500);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set is_active=0 where id=${P}; update batches set is_active=0 where product_id=${P};`).catch(() => {});
  console.log(res.join('\n'));
}
