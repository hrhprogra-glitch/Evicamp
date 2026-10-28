// Prueba (siumax), SOLO CON TECLADO: "Nuevo ajuste" → "MERMA" (antes "Salió del stock") en la sección Conteos.
// Lote (el más antiguo por defecto, ↓ cambia), cantidad que no pasa del lote, motivo y justificación obligatorios,
// stock/lote/kardex/autor en el servidor, la lista con "Salida", corregir una salida, gasto de consumo y sin internet.
// Uso: node prueba-salida.mjs <carpeta tools> <carpeta del proyecto>
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
const P = 970000 + (m % 9000), C = P + 1;
await sql(`insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced) values
  (${P}, 'PRUEBA SALIDA ${m}', 'GENERAL', 'SAL${m}', 5, 10, 1, 'UND', 1, 1), (${C}, 'PRUEBA BOLSA ${m}', 'GENERAL', 'BOL${m}', 0, 0, 0, 'CONSUMO', 1, 1);
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced, created_at) values
  (${m}, ${P}, 4, 4, 4, 1, 'SAL-A', 1, 1, now() - interval '2 day'), (${m + 1}, ${P}, 6, 6, 12, 2, 'SAL-B', 1, 1, now() - interval '1 day');`);
const estado = async (id) => sql(`select quantity from products where id=${id}; select string_agg(document_ref||'='||quantity, ',' order by created_at) from batches where product_id=${id} and is_active<>0;`).then((r) => r.replace(/\n/g, ' | '));

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
await page.evaluateOnNewDocument(() => { if (window.top === window) localStorage.setItem('siumax_pruebas', '1'); });
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(180); } };
const texto = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const buscar = async (codigo) => { await page.waitForSelector('#input-buscar-ajuste'); await page.focus('#input-buscar-ajuste'); await page.keyboard.type(codigo, { delay: 15 }); await pausa(300); await tecla('Enter'); await pausa(900); };
const borrarYEscribir = async (t) => { await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(t); };
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-conteos', { timeout: 20000 }); await pausa(20000); // precarga
  await page.focus('#sidebar-btn-conteos'); await tecla('Enter'); await page.waitForSelector('#btn-nuevo-ajuste'); await pausa(1500);
  await page.focus('#btn-nuevo-ajuste'); await tecla('Enter'); await pausa(600);

  // 1) SALIÓ DEL STOCK
  await buscar(`SAL${m}`);
  ok('Al elegir el producto pregunta "¿Qué pasó?" con "MERMA" marcado', (await foco()) === 'modo-ajuste-SALIDA' && (await page.evaluate(() => document.getElementById('modo-ajuste-SALIDA')?.getAttribute('aria-checked'))) === 'true', await foco());
  await tecla('Enter'); await pausa(300);
  ok('Enter pasa al lote: desplegable cerrado con el más antiguo (4 en stock) y la HORA en que entró', (await foco()) === 'lote-ajuste-elegido' && /QUEDAN 4 UND/i.test(await texto('#lote-ajuste-elegido')) && /\d{1,2}:\d{2}/.test(await texto('#lote-ajuste-elegido')) && !(await page.$('[data-lote-ajuste]')), `${await foco()} / ${await texto('#lote-ajuste-elegido')}`);
  await tecla('Enter'); await pausa(200);
  const opciones = await page.$$eval('[data-lote-ajuste]', (b) => b.length);
  ok('Enter abre el desplegable con TODOS los lotes con stock (2) y el selector en el elegido', opciones === 2 && (await foco()) === 'lote-ajuste-op-0', `${opciones} / ${await foco()}`);
  await tecla('Escape'); await pausa(200);
  ok('Esc cierra SOLO el desplegable (la ventana sigue)', (await foco()) === 'lote-ajuste-elegido' && !(await page.$('[data-lote-ajuste]')) && !!(await page.$('#input-cantidad-ajuste')), await foco());
  await tecla('Enter'); await pausa(200); await tecla('ArrowDown'); await tecla('Enter'); await pausa(300);
  ok('↓ y Enter elige el otro lote: el desplegable se cierra y pasa a "¿Cuántos salieron?"', (await foco()) === 'input-cantidad-ajuste' && !(await page.$('[data-lote-ajuste]')), await foco());
  ok('Cerrado muestra el lote elegido (6 en stock, S/ 2.00 c/u)', /QUEDAN 6 UND/i.test(await texto('#lote-ajuste-elegido')) && /2\.00/.test(await texto('#lote-ajuste-elegido')), await texto('#lote-ajuste-elegido'));
  await page.keyboard.type('7'); await tecla('Enter'); await pausa(500);
  ok('No deja sacar más de lo que tiene el lote: avisa', /solo tiene 6/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(400);
  ok('Tras el aviso vuelve a la cantidad', (await foco()) === 'input-cantidad-ajuste', await foco());
  await borrarYEscribir('2'); await tecla('Enter'); await pausa(300);
  ok('Con 2: pasa a los motivos de salida (sin "error de conteo")', (await foco()) === 'motivo-ajuste-0' && !/ERROR DE CONTEO/i.test(await texto('[aria-label="Motivo"]')), `${await foco()} / ${await texto('[aria-label="Motivo"]')}`);
  await tecla('ArrowDown'); await tecla('ArrowDown');
  ok('↓ ↓ llega a "Guardar ajuste"', (await foco()) === 'btn-guardar-ajuste', await foco());
  await tecla('Enter'); await pausa(500);
  ok('Sin motivo no se guarda: avisa', /motivo/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(400);
  await tecla('ArrowRight', 2); await tecla('Enter'); await pausa(200);
  ok('→ → Enter elige DAÑADO y pasa a la justificación', (await foco()) === 'input-justificacion-ajuste' && (await page.evaluate(() => document.querySelector('[data-motivo-ajuste][aria-selected="true"]')?.innerText)) === 'DAÑADO', await foco());
  await tecla('Enter'); await pausa(200); await tecla('Enter'); await pausa(500);
  ok('Sin justificación no se guarda: avisa', /justificaci/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(400);
  await page.keyboard.type('se cayeron al bajarlas', { delay: 10 }); await tecla('Enter'); await tecla('Enter'); await pausa(2500);
  ok('Guardado: vuelve al buscador y aparece en "Hechos ahora" como Merma', (await foco()) === 'input-buscar-ajuste' && /MERMA/i.test(await texto('[data-ajuste-fila="true"]')), `${await foco()} / ${await texto('[data-ajuste-fila="true"]')}`);
  let s = await estado(P);
  ok('Servidor: stock 8 y salió del lote elegido (B 6→4)', s === '8 | SAL-A=4,SAL-B=4', s);
  const w = await sql(`select quantity||':'||reason||':'||notes||':'||cost_unit||':'||total_loss||':'||"user"||':'||coalesce(origen,'') from waste where product_id=${P};`);
  ok('Servidor: salida -2 DAÑADO, costo S/ 2 (total 4), con QUIÉN y sin origen de conteo', /^-2:DAÑADO:se cayeron al bajarlas:2(\.0+)?:4(\.0+)?:Administrador[^:]*:$/.test(w), w);
  const k = await sql(`select change_amount||':'||operation_type from inventory_movements where product_id=${P} order by id desc limit 1;`);
  ok('Kardex: movimiento MERMA de -2', /^-2(\.0+)?:MERMA$/.test(k), k);

  // 2) GASTO DE CONSUMO (bolsas): sin pregunta ni lote, en soles
  await buscar(`BOL${m}`);
  ok('Producto de consumo: sin "¿Qué pasó?" ni lote, va directo a "¿Cuánto se gastó? (S/)"', (await foco()) === 'input-cantidad-ajuste' && !(await page.$('#modo-ajuste-SALIDA')) && /SE GAST/i.test(await texto('label[for="input-cantidad-ajuste"]')), `${await foco()} / ${await texto('label[for="input-cantidad-ajuste"]')}`);
  await page.keyboard.type('3.5'); await tecla('Enter'); await pausa(200);
  await tecla('ArrowRight', 4); await tecla('Enter'); await pausa(200);
  await page.keyboard.type('bolsas para despacho', { delay: 10 }); await tecla('Enter'); await tecla('Enter'); await pausa(2500);
  const g = await sql(`select quantity||':'||total_loss||':'||reason from waste where product_id=${C};`);
  ok('Servidor: gasto de S/ 3.50 sin unidades (USO INTERNO)', /^0(\.0+)?:3\.50*:USO INTERNO$/.test(g), g);

  // 3) La lista: la salida con su etiqueta; Enter la abre para corregir
  await tecla('Escape'); await pausa(3000);
  ok('Esc cierra y el selector vuelve a "Nuevo ajuste"', (await foco()) === 'btn-nuevo-ajuste', await foco());
  const fila = await page.evaluate((n) => [...document.querySelectorAll('div[data-row="true"]')].find((f) => f.innerText.includes(n))?.innerText.replace(/\s+/g, ' ') || '', `PRUEBA SALIDA ${m}`);
  ok('La lista muestra la merma con su etiqueta, motivo y justificación', /MERMA/i.test(fila) && /DAÑADO/.test(fila) && /se cayeron al bajarlas/i.test(fila), fila.slice(0, 200));
  const filaGasto = await page.evaluate((n) => [...document.querySelectorAll('div[data-row="true"]')].find((f) => f.innerText.includes(n))?.innerText.replace(/\s+/g, ' ') || '', `PRUEBA BOLSA ${m}`);
  ok('El gasto de consumo sale como "Gasto"', /GASTO/i.test(filaGasto), filaGasto.slice(0, 160));
  await page.evaluate((n) => [...document.querySelectorAll('div[data-row="true"]')].find((f) => f.innerText.includes(n))?.focus(), `PRUEBA SALIDA ${m}`);
  await tecla('Enter'); await pausa(1500);
  const cant = await page.evaluate(() => document.getElementById('merma-input-cantidad')?.value);
  ok('Enter en una salida abre "Editar registro" con su cantidad (2)', Number(cant) === 2 && /EDITAR REGISTRO/i.test(await texto('.fixed.inset-0.z-50')), String(cant));
  await tecla('Escape'); await pausa(800);

  // 4) SIN INTERNET: sale 1 por USO INTERNO (un producto con stock: sí baja unidades)
  await page.setOfflineMode(true);
  await page.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await page.focus('#btn-nuevo-ajuste'); await tecla('Enter'); await pausa(600);
  await buscar(`SAL${m}`);
  await tecla('Enter'); await pausa(300);
  ok('Sin internet: carga los lotes de la PC (propone el más antiguo, 4)', (await foco()) === 'lote-ajuste-elegido' && /QUEDAN 4 UND/i.test(await texto('#lote-ajuste-elegido')), `${await foco()} / ${await texto('#lote-ajuste-elegido')}`);
  await tecla('Enter'); await tecla('Enter'); await page.keyboard.type('1'); await tecla('Enter'); await pausa(200);
  await tecla('ArrowRight', 4); await tecla('Enter'); await pausa(200);
  await page.keyboard.type('para la limpieza', { delay: 10 }); await tecla('Enter'); await tecla('Enter'); await pausa(1500);
  ok('Sin internet: se guarda y vuelve al buscador', (await foco()) === 'input-buscar-ajuste', await foco());
  const local = await page.evaluate(async (p) => (await window.__siumaxPruebas.from('products').select('id, quantity').eq('id', p)).data?.[0]?.quantity, P);
  ok('Sin internet: el stock de la PC ya dice 7', Number(local) === 7, String(local));
  await tecla('Escape'); await pausa(300);
  await page.setOfflineMode(false);
  await page.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await pausa(25000);
  s = await estado(P);
  ok('Al volver: servidor con stock 7 y el lote A 4→3', s === '7 | SAL-A=3,SAL-B=4', s);
  const u = await sql(`select quantity||':'||reason from waste where product_id=${P} and reason='USO INTERNO';`);
  ok('Servidor: USO INTERNO de -1 (con unidades)', /^-1(\.0+)?:USO INTERNO$/.test(u), u);
  const cola = await page.evaluate(async () => { const r = indexedDB.open('siumax-local'); return await new Promise((ok) => { r.onsuccess = () => { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.length); }; }); });
  ok('No quedó nada en la cola', cola === 0, String(cola));
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set is_active=0 where id in (${P},${C}); update batches set is_active=0 where product_id in (${P},${C});`).catch(() => {});
  console.log(res.join('\n'));
}
