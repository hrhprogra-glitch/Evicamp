// Prueba con teclado de "Gestión de proveedores" con el nuevo estilo (siumax) + captura.
// Uso: node prueba-proveedores.mjs <carpeta tools> <ruta .env.vps> <carpeta capturas>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, envVps, salida] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core'); process.loadEnvFile(envVps);
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1280, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(200); } };
const foco = () => page.evaluate(() => {
  const a = document.activeElement; if (!a) return '';
  if (a.getAttribute('data-row-prov')) return 'fila-' + Array.from(document.querySelectorAll('[data-row-prov="true"]')).indexOf(a);
  if (a.classList.contains('btn-editar-prov')) return 'editar-' + Array.from(document.querySelectorAll('.btn-editar-prov')).indexOf(a);
  if (a.classList.contains('btn-eliminar-prov')) return 'eliminar-' + Array.from(document.querySelectorAll('.btn-eliminar-prov')).indexOf(a);
  return a.id || a.tagName;
});
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(1500);
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-proveedores'); await pausa(1500);
  await page.focus('#btn-proveedores'); await tecla('Enter');
  await page.waitForSelector('#buscador-proveedores-gestion', { timeout: 10000 }); await pausa(1500);
  ok('Abre con el selector en el buscador', (await foco()) === 'buscador-proveedores-gestion', await foco());
  const filas = await page.evaluate(() => document.querySelectorAll('[data-row-prov="true"]').length);
  ok('Se ven los proveedores', filas > 0, `${filas}`);
  ok('Sin la cabecera negra de columnas', await page.evaluate(() => !document.body.textContent.includes('Razón Social / Comercial')));
  await page.screenshot({ path: path.join(salida, 'proveedores.png') });
  await tecla('ArrowRight'); ok('→ buscador → Todos', (await foco()) === 'btn-prov-filtro-TODOS', await foco());
  await tecla('ArrowRight', 3); ok('→ → → hasta Nuevo proveedor', (await foco()) === 'btn-nuevo-proveedor', await foco());
  await tecla('ArrowDown'); ok('↓ baja a la primera fila', (await foco()) === 'fila-0', await foco());
  await tecla('ArrowDown'); ok('↓ segunda fila', (await foco()) === 'fila-1', await foco());
  await tecla('ArrowRight'); ok('→ en la fila va a Editar', (await foco()) === 'editar-1', await foco());
  await tecla('ArrowRight'); ok('→ Eliminar', (await foco()) === 'eliminar-1', await foco());
  await tecla('ArrowUp'); ok('↑ Eliminar de la fila de arriba', (await foco()) === 'eliminar-0', await foco());
  await tecla('ArrowLeft'); ok('← Editar', (await foco()) === 'editar-0', await foco());
  await tecla('ArrowLeft'); ok('← vuelve a la fila', (await foco()) === 'fila-0', await foco());
  await tecla('ArrowUp'); ok('↑ desde la primera fila → Nuevo proveedor', (await foco()) === 'btn-nuevo-proveedor', await foco());
  await tecla('ArrowDown'); await tecla('Enter'); await pausa(800);
  ok('Enter en la fila abre el formulario de editar', await page.evaluate(() => !!document.getElementById('modal-proveedor-container')));
  await tecla('Escape'); await pausa(600);
  ok('Esc cierra el formulario y el selector vuelve a la fila', (await foco()) === 'fila-0', await foco());
  await page.focus('#buscador-proveedores-gestion'); await page.keyboard.type('COQUITA', { delay: 30 }); await pausa(500);
  const filtradas = await page.evaluate(() => Array.from(document.querySelectorAll('[data-row-prov="true"]')).every((f) => f.textContent.includes('COQUITA')));
  ok('El buscador filtra', filtradas);
  await tecla('Tab', 3);
  ok('Tab no se escapa ni abre el menú', await page.evaluate(() => !!document.activeElement?.closest('#modal-gestion-proveedores-container') && document.getElementById('evicamp-sidebar')?.getAttribute('data-sidebar-open') !== 'true'), await foco());
  await page.focus('#buscador-proveedores-gestion'); await tecla('Escape'); await tecla('Escape'); await pausa(400);
  ok('Esc borra la búsqueda y después cierra', !(await page.$('#buscador-proveedores-gestion')));
} catch (e) { ok('Sin fallas', false, e.message); }
finally { ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ')); await nav.close(); console.log(res.join('\n')); }
