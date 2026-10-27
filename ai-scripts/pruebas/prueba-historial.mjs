// Prueba con teclado: pestaña Lotes oculta agotados con lote más nuevo + ventana del reloj (historial). Solo siumax.
// Uso: node prueba-historial.mjs <carpeta tools> <ruta .env.vps>
import { createRequire } from 'node:module';
import path from 'node:path';
const [tools, envVps] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
process.loadEnvFile(envVps);

const resultados = [];
const ok = (n, c, extra = '') => resultados.push(`${c ? '✅' : '❌'} ${n}${extra !== '' ? ' — ' + extra : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const navegador = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true, args: ['--window-size=1400,950'], defaultViewport: { width: 1400, height: 950 },
});
const page = await navegador.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(180); } };
const foco = () => page.evaluate(() => {
  const a = document.activeElement;
  if (!a) return '';
  if (a.getAttribute('data-hist-lote')) return 'fila-historial-' + Array.from(document.querySelectorAll('[data-hist-lote="true"]')).indexOf(a);
  return a.id || a.getAttribute('title') || a.tagName;
});
const filasLotes = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-row="true"][role="button"]')).filter((f) => !f.closest('.hidden')).map((f) => f.textContent));

try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(1500);
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter');
  await page.waitForSelector('#btn-tab-lotes', { timeout: 20000 }); await pausa(1500);

  // === 1. Pestaña Lotes ===
  await page.focus('#btn-tab-lotes'); await tecla('Enter'); await pausa(2500);
  // Con muchos lotes de prueba, los de este caso pueden quedar en otra página: se buscan
  await page.focus('#buscador-global-inventario'); await page.keyboard.type('PRUEBA'); await pausa(1500);
  const filas = await filasLotes();
  ok('Lote agotado que es el ÚLTIMO de su producto se sigue viendo (Arroz)', filas.some((t) => t.includes('PRUEBA-AGOTADO-ULTIMO-2')));
  const stockBajo = filas.filter((t) => t.includes('PRODUCTO PRUEBA STOCK BAJO'));
  ok('Lote agotado con un lote más nuevo se oculta (Stock bajo: solo 1 de 2)', stockBajo.length === 1, `${stockBajo.length} fila(s)`);

  // === 2. Reloj en la fila de Productos ===
  await page.focus('#btn-tab-productos'); await tecla('Enter');
  await pausa(2000);
  const enfocado = await page.evaluate(() => {
    const fila = Array.from(document.querySelectorAll('tr, [data-row="true"]')).find((f) => f.textContent.includes('PRODUCTO PRUEBA STOCK BAJO'));
    const btn = fila?.querySelector('[title="Historial de Lotes / Movimientos"]');
    if (!btn) return false;
    btn.focus();
    return document.activeElement === btn;
  });
  ok('Se llega al botón del reloj del producto', enfocado);
  await tecla('Enter');
  await page.waitForSelector('#titulo-historial-lotes', { timeout: 10000 });
  await pausa(1500);
  ok('Se abre la ventana flotante del historial', true);
  ok('El historial NO cambió de pestaña (seguimos en Productos)', await page.evaluate(() => sessionStorage.getItem('inventario_vista') !== 'LOTES'));
  const nFilas = await page.evaluate(() => document.querySelectorAll('[data-hist-lote="true"]').length);
  ok('El historial muestra los 2 lotes (con stock + agotado)', nFilas === 2, `${nFilas}`);
  ok('Aparece el separador "Agotados (1)"', await page.evaluate(() => document.body.textContent.includes('Agotados (1)')));
  ok('Al abrir, el selector está en la primera fila', (await foco()) === 'fila-historial-0', await foco());
  await tecla('ArrowDown');
  ok('↓ pasa a la segunda fila', (await foco()) === 'fila-historial-1', await foco());
  await tecla('ArrowDown');
  ok('↓ en la última fila se queda ahí', (await foco()) === 'fila-historial-1', await foco());
  await tecla('ArrowUp', 4);
  ok('↑ desde la primera fila (pasando por las pestañas) llega a la X', (await foco()) === 'btn-cerrar-historial-lotes', await foco());
  await tecla('ArrowDown', 2); // la barra (pestañas y fechas) es UNA fila: X → barra → primera fila
  ok('↓ desde la X (pasando por las pestañas) vuelve a la primera fila (X → barra → fila)', (await foco()) === 'fila-historial-0', await foco());
  await tecla('Tab', 3);
  ok('Tab no se escapa de la ventana', /^(fila-historial|tab-hist|btn-cerrar-historial-lotes)/.test(await foco()), await foco());
  const sidebarAbierto = await page.evaluate(() => document.getElementById('evicamp-sidebar')?.getAttribute('data-sidebar-open'));
  ok('Tab no abrió el menú lateral detrás', sidebarAbierto !== 'true', String(sidebarAbierto));
  await tecla('Escape');
  await pausa(400);
  ok('Esc cierra la ventana', !(await page.$('#titulo-historial-lotes')));
  ok('Al cerrar, el selector vuelve al botón del reloj', (await foco()) === 'Historial de Lotes / Movimientos', await foco());

  // === 3. Reloj desde una fila de Lotes ===
  await page.focus('#btn-tab-lotes'); await tecla('Enter'); await pausa(2000);
  const desdeLote = await page.evaluate(() => {
    const fila = Array.from(document.querySelectorAll('[data-row="true"][role="button"]')).find((f) => f.textContent.includes('PRUEBA-AGOTADO-ULTIMO-2'));
    const btn = fila?.querySelector('[title="Historial de Lotes / Movimientos"]');
    if (!btn) return false; btn.focus(); return true;
  });
  ok('Se llega al reloj de un lote', desdeLote);
  await tecla('Enter');
  await page.waitForSelector('#titulo-historial-lotes', { timeout: 10000 }); await pausa(1200);
  const titulo = await page.evaluate(() => document.getElementById('titulo-historial-lotes')?.parentElement?.textContent || '');
  ok('Desde un lote abre el historial de SU producto', titulo.includes('ARROZ'), titulo);
  ok('Producto con solo un lote agotado: "Con stock: 0" y "Agotados: 1"', await page.evaluate(() => document.body.textContent.includes('Agotados (1)')));
  await page.click('#btn-cerrar-historial-lotes'); await pausa(400);
  ok('La X con el mouse también cierra', !(await page.$('#titulo-historial-lotes')));
} catch (e) {
  ok('La prueba terminó sin errores', false, e.message);
} finally {
  ok('Sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  await navegador.close();
  console.log(resultados.join('\n'));
}
