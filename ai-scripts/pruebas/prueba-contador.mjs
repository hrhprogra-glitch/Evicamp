// Prueba: un empleado que SOLO tiene "Contar inventario" (siumax). Entra a Inventario y solo ve el botón Contar,
// nunca el stock; su conteo queda con SU nombre. Usuario de prueba "Contador Prueba" con clave al azar por corrida.
// Uso: node prueba-contador.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path'; import crypto from 'node:crypto';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q, clave) => {
  const s = new NodeSSH(); await s.connect(conexionVps);
  const r = clave
    ? await s.execCommand(`read -r CLAVE; printf '%s\\n' "${q.replace(/\s+/g, ' ')}" | runuser -u postgres -- psql -At -F '|' -d siuhub -v clave="$CLAVE"`, { stdin: `${clave}\n` })
    : await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q });
  s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim();
};
const CLAVE = crypto.randomBytes(12).toString('base64url');
const EMAIL = 'contador.prueba@siumax.com';
await sql(`INSERT INTO empleados (nombre, email, password, rol, estado, permisos, password_hash)
  SELECT 'Contador Prueba', '${EMAIL}', '', 'Cajero', 'ACTIVO', jsonb_build_object('inventario_contar', true), crypt(:'clave', gen_salt('bf'))
  WHERE NOT EXISTS (SELECT 1 FROM empleados WHERE lower(email) = '${EMAIL}');
  UPDATE empleados SET password_hash = crypt(:'clave', gen_salt('bf')), estado = 'ACTIVO', permisos = jsonb_build_object('inventario_contar', true) WHERE lower(email) = '${EMAIL}';`, CLAVE);
const m = Date.now(); const P = 950000 + (m % 9000);
await sql(`insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced) values (${P}, 'PRUEBA CONTADOR ${m}', 'GENERAL', 'CTD${m}', 5, 8, 1, 'UND', 1, 1);
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced) values (${m}, ${P}, 8, 8, 8, 1, 'CTD', 1, 1);`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage();
await page.evaluateOnNewDocument(() => { if (window.top === window) localStorage.setItem('siumax_pruebas', '1'); }); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const tecla = async (k) => { await page.keyboard.press(k); await pausa(200); };
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type(EMAIL);
  await page.focus('#input-login-password'); await page.keyboard.type(CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-conteos', { timeout: 20000 }); await pausa(3000);
  const menu = await page.evaluate(() => [...document.querySelectorAll('[id^="sidebar-btn-"]')].map((b) => b.id.replace('sidebar-btn-', '')));
  ok('En el menú solo tiene Conteos (no Inventario, Caja ni Finanzas)', menu.includes('conteos') && !menu.some((x) => ['inventario', 'pos', 'finanzas'].includes(x)), menu.join(','));
  await page.focus('#sidebar-btn-conteos'); await tecla('Enter'); await page.waitForSelector('#btn-nuevo-ajuste'); await pausa(1500);
  const pantalla = await page.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText);
  ok('Conteos: solo el botón "Contar inventario", sin la lista ni "Registrar merma"', !(await page.$('#buscador-global-conteos')) && !(await page.$('#btn-registrar-merma')) && !(await page.$('div[data-row="true"]')) && /CONTAR INVENTARIO/i.test(pantalla));
  ok('El selector está en "Contar inventario"', (await foco()) === 'btn-nuevo-ajuste', await foco());
  await tecla('Enter'); await pausa(600);
  await page.keyboard.type(`CTD${m}`, { delay: 15 }); await pausa(400);
  const lista = await page.evaluate(() => document.querySelector('[data-ajuste-prod-item="true"]')?.innerText || '');
  ok('A ciegas: el producto aparece sin su stock', lista.includes(`PRUEBA CONTADOR ${m}`) && !/\b8\b/.test(lista), JSON.stringify(lista));
  await tecla('Enter'); await pausa(300);
  ok('Sin la pregunta "¿Qué pasó?": va directo a "¿Cuántos hay?"', (await foco()) === 'input-contado' && !(await page.$('#modo-ajuste-SALIDA')), await foco());
  ok('El cajero cuenta a ciegas: NO ve el desplegable de lotes', !(await page.$('#lote-ajuste-elegido')));
  const lote = await sql(`select id from batches where product_id=${P} and is_active<>0 limit 1;`);
  const rechazo = await page.evaluate(async (args) => (await window.__siumaxPruebas.rpc('fn_registrar_conteo', { p_product_id: args.p, p_contado: 8, p_diferencia: 0, p_batch_id: Number(args.l) })).error?.message || 'sin error', { p: P, l: lote });
  ok('Servidor: el cajero NO puede elegir el lote (lo rechaza)', /Conteos completo/i.test(rechazo), rechazo);
  await page.keyboard.type('6'); await tecla('Enter'); await pausa(1500);
  await tecla('Enter'); await page.keyboard.type('rotos en el almacén', { delay: 10 }); await tecla('Enter'); await tecla('Enter'); await pausa(2000);
  const w = await sql(`select quantity||':'||reason||':'||"user" from waste where product_id=${P};`);
  ok('Su conteo se guardó con SU nombre (falta 2, ROBO)', w === '-2:ROBO:Contador Prueba', w);
  ok('Stock del servidor 6', (await sql(`select quantity from products where id=${P};`)) === '6');
  await tecla('Escape'); await pausa(400);
  ok('Esc cierra y el selector vuelve a "Contar inventario"', (await foco()) === 'btn-nuevo-ajuste', await foco());
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set is_active=0 where id=${P}; update batches set is_active=0 where product_id=${P};
    delete from sesiones s using empleados e where e.id = s.empleado_id and lower(e.email) = '${EMAIL}';`).catch(() => {});
  console.log(res.join('\n'));
}
