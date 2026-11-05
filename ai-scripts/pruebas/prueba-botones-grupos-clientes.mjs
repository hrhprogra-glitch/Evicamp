// ai-scripts/pruebas/prueba-botones-grupos-clientes.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');

const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./ai-scripts/vps.cjs');

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose();
  if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr);
  return r.stdout.trim();
};

const timestamp = Date.now().toString().slice(-5);
const NOMBRE_GRUPO = `GRUPO VOLVER ${timestamp}`;

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 }
});

const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));

const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const texto = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ') || '', sel);

try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');

  await page.waitForSelector('#sidebar-btn-clientes', { timeout: 20000 });
  await pausa(2000);

  // Ir a la sección Clientes
  await page.evaluate(() => sessionStorage.removeItem('clientes_pestana'));
  await page.focus('#sidebar-btn-clientes');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#buscador-clientes');
  await pausa(1200);

  // 1. Verificar botones en la cabecera: SOLO nuevo cliente y grupos (nuevo grupo ya no debe existir)
  const existeNuevoCli = await page.$('#btn-nuevo-cliente');
  const existeNuevoGrp = await page.$('#btn-nuevo-grupo');
  const existeVerGrp = await page.$('#btn-ver-grupos');

  ok('Existe botón [+ Nuevo cliente]', !!existeNuevoCli);
  ok('Botón [+ Nuevo grupo] fue ELIMINADO de la cabecera', !existeNuevoGrp);
  ok('Existe botón [Grupos (n)]', !!existeVerGrp);

  // 2. Navegación por teclado entre nuevo cliente y grupos
  await page.focus('#btn-nuevo-cliente');
  await pausa(150);
  ok('Foco inicial en btn-nuevo-cliente', (await foco()) === 'btn-nuevo-cliente', await foco());

  await page.keyboard.press('ArrowRight');
  await pausa(150);
  ok('→ pasa directamente a btn-ver-grupos', (await foco()) === 'btn-ver-grupos', await foco());

  await page.keyboard.press('ArrowLeft');
  await pausa(150);
  ok('← vuelve a btn-nuevo-cliente', (await foco()) === 'btn-nuevo-cliente', await foco());

  await page.keyboard.press('ArrowRight');
  await pausa(150);

  // 3. Abrir modal [Grupos (n)]
  await page.keyboard.press('Enter');
  await page.waitForSelector('#buscar-elegir', { timeout: 5000 });
  await pausa(400);
  ok('Enter en [Grupos] abre lista con foco en buscar-elegir', (await foco()) === 'buscar-elegir', await foco());

  // Opción crear grupo nuevo
  const textoExtra = await texto('#elegir-extra');
  ok('Opción extra dice "Crear grupo nuevo" (sin duplicar +)', !textoExtra.includes('++'), textoExtra);

  // Bajar a "Crear grupo nuevo"
  await page.keyboard.press('ArrowDown');
  await pausa(150);
  ok('↓ enfoca la opción para crear grupo nuevo', (await foco()) === 'elegir-extra', await foco());

  // 4. Abrir ModalFormGrupo desde "Crear grupo nuevo"
  await page.keyboard.press('Enter');
  await page.waitForSelector('#grupo-nombre', { timeout: 5000 });
  await pausa(300);
  ok('Enter abre ModalFormGrupo con foco en grupo-nombre', (await foco()) === 'grupo-nombre', await foco());

  // Verificar existencia del botón Volver
  const existeBtnVolver = await page.$('#btn-volver-form-grupo');
  const existeBtnVolverHdr = await page.$('#btn-header-volver-form-grupo');
  ok('Ya NO hay botón [Volver] en el pie (el dueño pidió solo la flecha de arriba)', !existeBtnVolver);
  ok('Existe botón volver [←] en el header', !!existeBtnVolverHdr);

  // Tomar captura de ModalFormGrupo con botón Volver
  const screenshotForm = 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4/modal_form_grupo_con_volver.png';
  await page.screenshot({ path: screenshotForm });

  // 5. Probar botón Volver (sin guardar, debe regresar a la lista de grupos)
  await page.click('#btn-header-volver-form-grupo');
  await page.waitForSelector('#buscar-elegir', { timeout: 5000 });
  await pausa(300);
  ok('Clic en la flecha [←] regresa a la lista de grupos (ModalElegir)', !!(await page.$('#buscar-elegir')));

  // 6. Volver a abrir Crear grupo y esta vez crearlo
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#grupo-nombre', { timeout: 5000 });
  await pausa(300);

  const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(250); } };
  await page.keyboard.type(NOMBRE_GRUPO, { delay: 10 });
  await tecla('Enter'); // a tipo
  await tecla('ArrowRight'); // a EMPRESA
  await tecla('Enter'); // a ruc
  await tecla('Enter'); // a descuento
  await tecla('Enter'); // a btn-guardar-grupo
  await tecla('Enter'); // guardar
  await pausa(2500);

  // 7. Al crearse, debe VOLVER a la lista de grupos y mostrar el nuevo grupo
  await page.waitForSelector('#buscar-elegir', { timeout: 5000 });
  await pausa(500);
  ok('Al crear el grupo, regresa automáticamente a la lista de grupos', !!(await page.$('#buscar-elegir')));

  const listaTexto = await page.evaluate(() => document.body.innerText);
  ok('El nuevo grupo aparece en la lista de grupos tras crearse', listaTexto.includes(NOMBRE_GRUPO));

  // Tomar captura de la lista con el grupo creado
  const screenshotLista = 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4/lista_grupos_tras_crear.png';
  await page.screenshot({ path: screenshotLista });

  // Cerrar modal de lista con Escape
  await tecla('Escape');
  await pausa(300);
  ok('Escape en lista vuelve a enfocar btn-ver-grupos', (await foco()) === 'btn-ver-grupos', await foco());

} catch (e) {
  ok('Sin fallas inesperadas', false, e.stack || e.message);
} finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  // Limpieza en DB
  await sql(`delete from grupos_clientes where nombre='${NOMBRE_GRUPO}';`).catch(() => {});
  console.log(res.join('\n'));
}
