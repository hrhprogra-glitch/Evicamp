// Prueba con teclado de "Ingresar lote" (fase 0) en siumax. Solo pruebas: crea lotes en la base de pruebas.
// Uso: node prueba-lote.mjs <carpeta tools> <ruta .env.vps>
import { createRequire } from 'node:module';
import path from 'node:path';
const [tools, envVps] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
process.loadEnvFile(envVps);
const CLAVE = process.env.SIUMAX_ADMIN_CLAVE;
const URL = 'https://siumax.duckdns.org';
const DOC = 'F001-PRUEBALOTE-' + Date.now().toString().slice(-5);

const resultados = [];
const ok = (nombre, cond, extra = '') => { resultados.push(`${cond ? '✅' : '❌'} ${nombre}${extra ? ' — ' + extra : ''}`); };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const navegador = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true, args: ['--window-size=1400,950'], defaultViewport: { width: 1400, height: 950 },
});
const page = await navegador.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-lote-prov-item') && 'item-proveedor' || document.activeElement?.tagName);
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(150); } };
const escribir = async (t) => { await page.keyboard.type(t, { delay: 30 }); await pausa(250); };
const valor = (id) => page.evaluate((i) => document.getElementById(i)?.value, id);
const textoDialogo = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.textContent || '');

try {
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario');
  await escribir('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await pausa(1500);
  await page.focus('#sidebar-btn-inventario');
  await tecla('Enter');
  await page.waitForSelector('#btn-ingresar-lote', { timeout: 20000 });
  await pausa(1500);

  // === 1. Lote CON proveedor y documento, todo con teclado ===
  await page.focus('#btn-ingresar-lote');
  await tecla('Enter');
  await page.waitForSelector('#input-buscar-producto-lote');
  await pausa(400);
  ok('Al abrir, el foco está en Buscar producto', (await foco()) === 'input-buscar-producto-lote', await foco());
  await escribir('AUTOTEST');
  await tecla('Enter');
  await pausa(300);
  ok('Enter en producto → Cantidad', (await foco()) === 'input-cantidad-lote', await foco());
  await escribir('3');
  await tecla('Enter');
  ok('Enter en Cantidad → Costo', (await foco()) === 'input-costo-total-lote', await foco());
  await escribir('9');
  await tecla('Enter');
  ok('Enter en Costo → Proveedor', (await foco()) === 'input-proveedor-lote', await foco());
  await escribir('COQUI');
  const hayLista = await page.evaluate(() => document.querySelectorAll('[data-lote-prov-item="true"]').length);
  ok('Al escribir aparece la lista de proveedores', hayLista > 0, `${hayLista} opción(es)`);
  await tecla('Enter');
  ok('Enter en Proveedor elige el primero y pasa a Documento', (await foco()) === 'input-sustento-lote', await foco());
  ok('Proveedor quedó como COQUITA', (await valor('input-proveedor-lote')) === 'COQUITA', await valor('input-proveedor-lote'));
  await escribir(DOC);
  await tecla('Enter');
  ok('Enter en Documento → Vencimiento', (await foco()) === 'input-vencimiento-lote', await foco());
  await tecla('ArrowDown');
  ok('Flecha abajo en Vencimiento → Guardar', (await foco()) === 'btn-guardar-lote', await foco());
  await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-texto', { timeout: 15000 });
  const aviso1 = await textoDialogo();
  ok('Aviso propio "Lote registrado" (no alert del navegador)', aviso1.includes('Lote registrado'), aviso1.replace(/\s+/g, ' '));
  ok('La ventana del lote se cerró', !(await page.$('#input-cantidad-lote')));
  await tecla('Enter');
  await pausa(500);

  // === 2. Flechas entre los campos ===
  await page.focus('#btn-ingresar-lote');
  await tecla('Enter');
  await page.waitForSelector('#input-buscar-producto-lote');
  await pausa(300);
  await escribir('AUTOTEST');
  await tecla('Enter');
  const pasos = [
    ['ArrowDown', 'input-proveedor-lote', 'Cantidad ↓ → Proveedor'],
    ['ArrowRight', 'input-sustento-lote', 'Proveedor → → Documento'],
    ['ArrowLeft', 'input-proveedor-lote', 'Documento ← → Proveedor'],
  ];
  for (const [k, esperado, nombre] of pasos) { await tecla(k); ok(nombre, (await foco()) === esperado, await foco()); }
  await tecla('ArrowDown');
  ok('Proveedor ↓ con lista abierta → primer proveedor', (await foco()) === 'item-proveedor', await foco());
  await tecla('ArrowLeft');
  ok('Proveedor de la lista ← → vuelve al campo Proveedor', (await foco()) === 'input-proveedor-lote', await foco());
  await tecla('ArrowRight');
  await tecla('ArrowDown');
  ok('Documento ↓ → Vencimiento', (await foco()) === 'input-vencimiento-lote', await foco());
  await tecla('ArrowUp');
  ok('Vencimiento ↑ → Proveedor', (await foco()) === 'input-proveedor-lote', await foco());
  await tecla('ArrowRight');
  await tecla('ArrowUp');
  ok('Documento ↑ → Costo', (await foco()) === 'input-costo-total-lote', await foco());
  await tecla('ArrowDown');
  ok('Costo ↓ → Documento', (await foco()) === 'input-sustento-lote', await foco());

  // === 3. Lote SIN proveedor ni documento (opcionales) ===
  await page.focus('#input-cantidad-lote');
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await escribir('1');
  await page.focus('#input-vencimiento-lote');
  await tecla('ArrowDown');
  ok('Guardar sin proveedor: foco en Guardar', (await foco()) === 'btn-guardar-lote', await foco());
  await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-texto', { timeout: 15000 });
  const aviso2 = await textoDialogo();
  ok('Se guarda sin proveedor ni documento', aviso2.includes('Lote registrado'), aviso2.replace(/\s+/g, ' '));
  await tecla('Enter');
  await pausa(500);

  // === 4. Editar el lote con proveedor: debe venir cargado ===
  await page.focus('#btn-tab-lotes');
  await tecla('Enter');
  await pausa(2500);
  const encontrado = await page.evaluate((doc) => {
    const fila = Array.from(document.querySelectorAll('[data-row="true"]')).find((f) => f.textContent.includes(doc));
    if (!fila) return null;
    fila.focus();
    return fila.textContent.includes('PROV: COQUITA');
  }, DOC);
  ok('El lote aparece en la tabla con "PROV: COQUITA"', encontrado === true, String(encontrado));
  await tecla('Enter');
  await page.waitForSelector('#input-proveedor-lote', { timeout: 10000 });
  await pausa(500);
  ok('Al editar, Proveedor viene cargado', (await valor('input-proveedor-lote')) === 'COQUITA', await valor('input-proveedor-lote'));
  ok('Al editar, Documento viene cargado', (await valor('input-sustento-lote')) === DOC, await valor('input-sustento-lote'));
  const totalActivos = Number(process.env.PROVEEDORES_ACTIVOS || 0);
  await page.focus('#input-sustento-lote');
  await tecla('ArrowLeft');
  const enLista = await page.evaluate(() => document.querySelectorAll('[data-lote-prov-item="true"]').length);
  ok('Al editar y entrar a Proveedor, la lista muestra TODOS los activos', enLista === totalActivos, `${enLista} de ${totalActivos}`);
  await escribir('PROVEEDOR TEST B');
  const filtrados = await page.evaluate(() => Array.from(document.querySelectorAll('[data-lote-prov-item="true"]')).map((x) => x.textContent));
  ok('Al escribir, la lista filtra y pone primero lo exacto', filtrados.length > 0 && filtrados.length < enLista && filtrados[0].includes('PROVEEDOR TEST B'), `${filtrados.length} opción(es), primero: ${filtrados[0]}`);
  await tecla('Enter');
  ok('Enter elige el proveedor filtrado', (await valor('input-proveedor-lote')).includes('PROVEEDOR TEST B'), await valor('input-proveedor-lote'));
  await page.focus('#input-vencimiento-lote');
  await tecla('ArrowDown');
  await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-texto', { timeout: 15000 });
  const aviso3 = await textoDialogo();
  ok('Editar guarda con aviso propio', aviso3.includes('Lote actualizado'), aviso3.replace(/\s+/g, ' '));
  await tecla('Enter');
} catch (e) {
  ok('La prueba terminó sin errores', false, e.message);
} finally {
  ok('Sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  await navegador.close();
  console.log('DOC=' + DOC);
  console.log(resultados.join('\n'));
}
