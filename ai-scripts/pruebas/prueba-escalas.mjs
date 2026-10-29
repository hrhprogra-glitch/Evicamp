// Prueba de la fase 1.3 (siumax): precios por cantidad. Se escriben en el formulario del producto (teclado), se
// guardan, la Caja cambia el precio al llegar a la cantidad (x6+, x12+) y vuelve al bajarla; un precio cambiado a mano
// no se toca; un cajero sin "Modificar precios" no puede cambiarlas (servidor).
// Uso: node prueba-escalas.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path'; import crypto from 'node:crypto';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q, clave) => {
  const s = new NodeSSH(); await s.connect(conexionVps);
  const r = clave
    ? await s.execCommand(`read -r CLAVE; printf '%s\\n' "${q.replace(/\s+/g, ' ')}" | runuser -u postgres -- psql -At -F '|' -d siumax -v clave="$CLAVE"`, { stdin: `${clave}\n` })
    : await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim();
};
const PROD = 920003; // DEMO GASEOSA 1.5L
await sql(`update products set price = 6, precios_cantidad = null, quantity = greatest(quantity, 40) where id = ${PROD}; update batches set quantity = greatest(quantity, 40) where id = 920103;`);
const CLAVE = crypto.randomBytes(12).toString('base64url'); const EMAIL = 'cajero.prueba@siumax.com';
await sql(`UPDATE empleados SET password_hash = crypt(:'clave', gen_salt('bf')), estado = 'ACTIVO', permisos = jsonb_build_object('caja_realizar_ventas', true) WHERE lower(email) = '${EMAIL}';`, CLAVE);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const errores = [];
const entrar = async (correo, clave) => {
  const ctx = await nav.createBrowserContext(); const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(e.message)); page.on('dialog', (d) => d.accept());
  await page.evaluateOnNewDocument(() => { if (window.top === window) localStorage.setItem('siumax_pruebas', '1'); });
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type(correo);
  await page.focus('#input-login-password'); await page.keyboard.type(clave); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2500);
  return page;
};
const tecla = async (page, k) => { await page.keyboard.press(k); await pausa(180); };
const foco = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
try {
  const admin = await entrar('admin@siumax.com', process.env.SIUMAX_ADMIN_CLAVE);
  // 1) Formulario: escribir las escalas con teclado
  await admin.focus('#sidebar-btn-inventario'); await tecla(admin, 'Enter'); await admin.waitForSelector('#btn-tab-productos'); await pausa(1500);
  await admin.focus('#btn-tab-productos'); await tecla(admin, 'Enter');
  await admin.focus('#buscador-global-inventario'); await admin.keyboard.type('DEMO GASEOSA'); await pausa(1000);
  await admin.evaluate(() => [...document.querySelectorAll('[data-row="true"]')].find((f) => f.offsetParent && f.innerText.includes('DEMO GASEOSA'))?.focus());
  await tecla(admin, 'Enter'); await admin.waitForSelector('#escala-desde-0'); await pausa(500);
  await admin.focus('#select-unidad-peso-producto'); await tecla(admin, 'ArrowDown');
  ok('↓ desde "Se vende por" llega a la primera escala', (await foco(admin)) === 'escala-desde-0', await foco(admin));
  await admin.keyboard.type('6'); await tecla(admin, 'Enter');
  ok('Enter en "desde" pasa a su precio', (await foco(admin)) === 'escala-precio-0', await foco(admin));
  await admin.keyboard.type('5.50'); await tecla(admin, 'Enter');
  ok('Enter en el precio pasa a la fila siguiente', (await foco(admin)) === 'escala-desde-1', await foco(admin));
  await admin.keyboard.type('12'); await tecla(admin, 'ArrowRight'); await admin.keyboard.type('5');
  await tecla(admin, 'ArrowDown'); await tecla(admin, 'ArrowDown');
  // (fase 1.2: después de las escalas vienen las presentaciones; de ahí ↓ ↓ ↓ llega a Guardar)
  ok('↓ desde la última escala pasa a las presentaciones', (await foco(admin)) === 'pres-unidad-0', await foco(admin));
  await tecla(admin, 'ArrowDown'); await tecla(admin, 'ArrowDown'); await tecla(admin, 'ArrowDown');
  ok('↓ desde la última presentación llega a Guardar', (await foco(admin)) === 'btn-guardar-producto', await foco(admin));
  await tecla(admin, 'Enter'); await pausa(2500);
  const guardado = await sql(`select precios_cantidad::text from products where id = ${PROD};`);
  ok('Servidor: guardó [desde 6 → 5.50, desde 12 → 5]', guardado.replace(/\s/g, '') === '[{"desde":6,"precio":5.5},{"desde":12,"precio":5}]', guardado);

  // 2) Caja
  await admin.reload({ waitUntil: 'networkidle2' }); await admin.waitForSelector('#sidebar-btn-pos'); await pausa(2000);
  await admin.focus('#sidebar-btn-pos'); await tecla(admin, 'Enter'); await admin.waitForSelector('#buscador-global-pos'); await pausa(1200);
  await admin.focus('#buscador-global-pos'); await admin.keyboard.type('DEMO-CMP-3'); await pausa(500); await tecla(admin, 'Enter'); await pausa(700);
  const linea = () => admin.evaluate(() => ({ precio: document.getElementById('edit-price-0')?.value, escala: document.querySelector('[data-escala]')?.innerText || '', cambiado: !!document.querySelector('[data-precio-cambiado]') }));
  const cantidad = async (n) => { await admin.focus('#edit-input-0'); await admin.keyboard.down('Control'); await admin.keyboard.press('a'); await admin.keyboard.up('Control'); await admin.keyboard.type(String(n)); await tecla(admin, 'Enter'); await pausa(600); };
  let l = await linea();
  ok('1 unidad: precio normal S/ 6.00 sin etiqueta', l.precio === '6.00' && !l.escala, JSON.stringify(l));
  await cantidad(6); l = await linea();
  ok('6 unidades: S/ 5.50 con etiqueta "x6+"', l.precio === '5.50' && /x6\+/.test(l.escala), JSON.stringify(l));
  await cantidad(12); l = await linea();
  ok('12 unidades: S/ 5.00 con "x12+"', l.precio === '5.00' && /x12\+/.test(l.escala), JSON.stringify(l));
  await cantidad(2); l = await linea();
  ok('Vuelve a 2: precio normal S/ 6.00 otra vez', l.precio === '6.00' && !l.escala, JSON.stringify(l));
  // Precio cambiado a mano: no se toca
  await admin.focus('#edit-price-0'); await admin.keyboard.down('Control'); await admin.keyboard.press('a'); await admin.keyboard.up('Control'); await admin.keyboard.type('4'); await tecla(admin, 'Enter'); await pausa(700);
  await cantidad(12); l = await linea();
  ok('Con precio cambiado a mano (S/ 4.00), llegar a 12 no lo cambia', l.precio === '4.00' && l.cambiado && !l.escala, JSON.stringify(l));

  // 3) Servidor: un cajero sin "Modificar precios" no puede cambiar las escalas
  const caja = await entrar(EMAIL, CLAVE);
  const r = await caja.evaluate(async (id) => (await window.__siumaxPruebas.from('products').update({ precios_cantidad: [{ desde: 2, precio: 0.5 }] }).eq('id', id)).error?.message || 'sin error', PROD);
  ok('Un cajero sin "Modificar precios" no puede cambiar las escalas (lo rechaza el servidor)', /permiso/i.test(r), r);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`delete from sesiones s using empleados e where e.id = s.empleado_id and lower(e.email) = '${EMAIL}';`).catch(() => {});
  console.log(res.join('\n'));
}
