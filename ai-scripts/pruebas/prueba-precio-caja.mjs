// Prueba de la fase 1.4 (siumax): cambiar el precio al cobrar. Cajero sin permiso → clave del administrador (cancelar
// devuelve el precio); queda registrado (precio de lista y quién); el admin lo cambia sin clave; el detalle del ticket
// lo muestra. Usuario de prueba "Cajero Prueba" (solo vender) con clave al azar por corrida.
// Uso: node prueba-precio-caja.mjs <carpeta tools> <carpeta del proyecto>
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
    ? await s.execCommand(`read -r CLAVE; printf '%s\\n' "${q.replace(/\s+/g, ' ')}" | runuser -u postgres -- psql -At -F '|' -d siuhub -v clave="$CLAVE"`, { stdin: `${clave}\n` })
    : await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q });
  s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim();
};
const CLAVE = crypto.randomBytes(12).toString('base64url');
const EMAIL = 'cajero.prueba@siumax.com';
await sql(`INSERT INTO empleados (nombre, email, password, rol, estado, permisos, password_hash)
  SELECT 'Cajero Prueba', '${EMAIL}', '', 'Cajero', 'ACTIVO', jsonb_build_object('caja_realizar_ventas', true), crypt(:'clave', gen_salt('bf'))
  WHERE NOT EXISTS (SELECT 1 FROM empleados WHERE lower(email) = '${EMAIL}');
  UPDATE empleados SET password_hash = crypt(:'clave', gen_salt('bf')), estado = 'ACTIVO', permisos = jsonb_build_object('caja_realizar_ventas', true) WHERE lower(email) = '${EMAIL}';`, CLAVE);
const PROD = 920003; // DEMO GASEOSA 1.5L, S/ 6.00
await sql(`update products set price = 6, quantity = greatest(quantity, 20) where id = ${PROD}; update batches set quantity = greatest(quantity, 20) where id = 920103;`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const errores = [];
const entrar = async (correo, clave) => {
  const ctx = await nav.createBrowserContext(); const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type(correo);
  await page.focus('#input-login-password'); await page.keyboard.type(clave); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2500);
  await page.focus('#sidebar-btn-pos'); await page.keyboard.press('Enter'); await page.waitForSelector('#buscador-global-pos'); await pausa(1500);
  return page;
};
const agregar = async (page) => { await page.focus('#buscador-global-pos'); await page.keyboard.type('DEMO-CMP-3'); await pausa(500); await page.keyboard.press('Enter'); await pausa(800); };
const cambiarPrecio = async (page, valor) => {
  await page.focus('#edit-price-0'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type(valor); await page.keyboard.press('Enter'); await pausa(900);
};
const precio = (page) => page.$eval('#edit-price-0', (i) => i.value);
try {
  // 1) Cajero sin permiso
  const caja = await entrar(EMAIL, CLAVE);
  await agregar(caja);
  ok('Cajero: el producto entra al carrito con S/ 6.00', (await precio(caja)) === '6.00', await precio(caja));
  await cambiarPrecio(caja, '5.50');
  ok('Cajero sin permiso: al cambiar el precio pide la clave del administrador', !!(await caja.$('#autorizacion-titulo')), await caja.$eval('#autorizacion-titulo', (e) => e.innerText).catch(() => 'sin ventana'));
  await caja.click('#autorizacion-cancelar'); await pausa(700);
  ok('Si cancela, el precio vuelve a S/ 6.00 y no queda marcado', (await precio(caja)) === '6.00' && !(await caja.$('[data-precio-cambiado]')), await precio(caja));
  await cambiarPrecio(caja, '5.50');
  await caja.focus('#autorizacion-correo'); await caja.keyboard.type('admin@siumax.com');
  await caja.focus('#autorizacion-clave'); await caja.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await caja.keyboard.press('Enter'); await pausa(2500);
  ok('Con la clave del admin el precio queda en S/ 5.50 y muestra el de antes tachado', (await precio(caja)) === '5.50' && /6\.00/.test(await caja.$eval('[data-precio-cambiado]', (e) => e.innerText).catch(() => '')), await precio(caja));
  // Cobrar: F2 → efectivo exacto → confirmar
  await caja.keyboard.press('F2'); await caja.waitForSelector('#btn-exacto-efectivo'); await pausa(500);
  await caja.click('#btn-exacto-efectivo'); await pausa(300); await caja.click('#cobro-btn-confirm'); await pausa(3500);
  const linea = await sql(`select d.sale_id||'|'||d.price_at_moment||'|'||coalesce(d.precio_lista::text,'-')||'|'||coalesce(d.precio_cambiado_por,'-')||'|'||coalesce(s.vendedor,'-') from sale_details d join sales s on s.id = d.sale_id where d.product_id = ${PROD} order by s.created_at desc limit 1;`);
  const [ventaId, cobrado, lista, quien, vendedor] = linea.split('|');
  ok('Servidor: se cobró 5.50, con precio de lista 6 y "Administrador SiuHub" como quien autorizó; vendió el cajero', Number(cobrado) === 5.5 && Number(lista) === 6 && quien === 'Administrador SiuHub' && vendedor === 'Cajero Prueba', linea);

  // 2) Admin: cambia sin clave
  const admin = await entrar('admin@siumax.com', process.env.SIUMAX_ADMIN_CLAVE);
  await agregar(admin);
  await cambiarPrecio(admin, '5.80');
  ok('Admin (con permiso): cambia el precio sin pedir clave', !(await admin.$('#autorizacion-titulo')) && (await precio(admin)) === '5.80' && !!(await admin.$('[data-precio-cambiado]')), await precio(admin));
  await cambiarPrecio(admin, '6.00');
  ok('Si vuelve al precio de lista, ya no queda marcado como cambiado', !(await admin.$('[data-precio-cambiado]')), await precio(admin));

  // 3) Detalle del ticket en Finanzas
  await admin.focus('#sidebar-btn-finanzas'); await admin.keyboard.press('Enter'); await pausa(3500);
  const abierto = await admin.evaluate((id) => { const f = [...document.querySelectorAll('[data-row="true"]')].find((x) => x.offsetParent && x.innerText.includes(`#${String(id).slice(-6)}`)); if (!f) return false; f.focus(); return true; }, ventaId);
  if (abierto) { await admin.keyboard.press('Enter'); await pausa(2000); }
  const detalle = await admin.evaluate(() => document.querySelector('[data-precio-cambiado]')?.innerText || '');
  ok('Finanzas · detalle del ticket: "Precio cambiado: S/ 6.00 → S/ 5.50 · Administrador SiuHub"', abierto && /Precio cambiado: S\/ 6\.00 → S\/ 5\.50 · Administrador SiuHub/.test(detalle), `${abierto} ${detalle}`);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`delete from sesiones s using empleados e where e.id = s.empleado_id and lower(e.email) = '${EMAIL}';`).catch(() => {});
  console.log(res.join('\n'));
}
