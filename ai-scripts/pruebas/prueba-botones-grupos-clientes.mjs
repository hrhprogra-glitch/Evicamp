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
const NOMBRE_GRUPO = `GRUPO TEST ${timestamp}`;

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

  // 1. Verificar existencia de los tres botones en la cabecera
  const existeNuevoCli = await page.$('#btn-nuevo-cliente');
  const existeNuevoGrp = await page.$('#btn-nuevo-grupo');
  const existeVerGrp = await page.$('#btn-ver-grupos');

  ok('Existe botón [+ Nuevo cliente]', !!existeNuevoCli);
  ok('Existe botón [+ Nuevo grupo]', !!existeNuevoGrp);
  ok('Existe botón [Grupos (n)]', !!existeVerGrp);

  const textoBtnVer = await texto('#btn-ver-grupos');
  ok('Botón [Grupos] muestra conteo', /Grupos \(\d+\)/i.test(textoBtnVer), textoBtnVer);

  // 2. Navegación por teclado entre los botones
  await page.focus('#btn-nuevo-cliente');
  await pausa(150);
  ok('Foco inicial en btn-nuevo-cliente', (await foco()) === 'btn-nuevo-cliente', await foco());

  await page.keyboard.press('ArrowRight');
  await pausa(150);
  ok('→ pasa a btn-nuevo-grupo', (await foco()) === 'btn-nuevo-grupo', await foco());

  await page.keyboard.press('ArrowRight');
  await pausa(150);
  ok('→ pasa a btn-ver-grupos', (await foco()) === 'btn-ver-grupos', await foco());

  await page.keyboard.press('ArrowLeft');
  await pausa(150);
  ok('← vuelve a btn-nuevo-grupo', (await foco()) === 'btn-nuevo-grupo', await foco());

  await page.keyboard.press('ArrowLeft');
  await pausa(150);
  ok('← vuelve a btn-nuevo-cliente', (await foco()) === 'btn-nuevo-cliente', await foco());

  await page.keyboard.press('ArrowDown');
  await pausa(150);
  ok('↓ baja a buscador-clientes', (await foco()) === 'buscador-clientes', await foco());

  const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(250); } };

  // 3. Crear grupo directamente desde [+ Nuevo grupo]
  await page.focus('#btn-nuevo-grupo');
  await tecla('Enter');
  await page.waitForSelector('#grupo-nombre', { timeout: 5000 });
  await pausa(300);

  ok('Enter en [+ Nuevo grupo] abre modal con foco en grupo-nombre', (await foco()) === 'grupo-nombre', await foco());

  await page.keyboard.type(NOMBRE_GRUPO, { delay: 10 });
  await tecla('Enter'); // a grupo-tipo
  await tecla('ArrowRight'); // a EMPRESA
  await tecla('Enter'); // a grupo-ruc
  await tecla('Enter'); // a grupo-descuento
  await tecla('Enter'); // a btn-guardar-grupo
  await tecla('Enter'); // guardar
  await pausa(2500);

  // Verificar en base de datos
  const dbCheck = await sql(`select count(*) from grupos_clientes where nombre='${NOMBRE_GRUPO}';`);
  ok('Grupo creado directamente en servidor Postgres', dbCheck === '1', `count: ${dbCheck}`);

  // Verificar que el foco volvió a btn-nuevo-grupo
  ok('Al guardar, foco vuelve a btn-nuevo-grupo', (await foco()) === 'btn-nuevo-grupo', await foco());

  // 4. Abrir [Grupos] y ver el grupo en la lista
  await tecla('ArrowRight'); // a btn-ver-grupos
  await tecla('Enter');
  await page.waitForSelector('#buscar-elegir', { timeout: 5000 });
  await pausa(500);

  ok('Enter en [Grupos] abre lista con foco en buscar-elegir', (await foco()) === 'buscar-elegir', await foco());

  const listaTexto = await page.evaluate(() => document.body.innerText);
  ok('El grupo recién creado aparece en la lista de grupos', listaTexto.includes(NOMBRE_GRUPO));

  // Tomar captura
  const screenshotPath = 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4/clientes_grupos_cabecera.png';
  await page.screenshot({ path: screenshotPath });
  ok('Captura tomada con éxito', fs.existsSync(screenshotPath));

  // Cerrar modal
  await tecla('Escape');
  await pausa(400);
  ok('Escape vuelve a enfocar btn-ver-grupos', (await foco()) === 'btn-ver-grupos', await foco());

} catch (e) {
  ok('Sin fallas inesperadas', false, e.stack || e.message);
} finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  // Limpieza en DB
  await sql(`delete from grupos_clientes where nombre='${NOMBRE_GRUPO}';`).catch(() => {});
  console.log(res.join('\n'));
}
