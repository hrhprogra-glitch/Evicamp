// Prueba con teclado de la fase 2.1 en siumax: kardex (pestaña Movimientos del reloj) con quién lo hizo,
// y quién abrió/cerró la caja en Finanzas. Uso: node prueba-kardex.mjs <carpeta tools> <ruta .env.vps>
import { createRequire } from 'node:module';
import path from 'node:path';
const [tools, envVps] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
process.loadEnvFile(envVps);
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1400, height: 950 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(200); } };
const foco = () => page.evaluate(() => {
  const a = document.activeElement; if (!a) return '';
  if (a.getAttribute('data-hist-lote')) return 'fila-lote-' + Array.from(document.querySelectorAll('[data-hist-lote="true"]')).indexOf(a);
  if (a.getAttribute('data-hist-mov')) return 'fila-mov-' + Array.from(document.querySelectorAll('[data-hist-mov="true"]')).indexOf(a);
  return a.id || a.getAttribute('title') || a.tagName;
});
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(1500);
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-ingresar-lote'); await pausa(1500);

  // 1) Ingreso de un lote con la sesión del admin (el movimiento debe guardar su nombre)
  await page.focus('#btn-ingresar-lote'); await tecla('Enter'); await page.waitForSelector('#input-buscar-producto-lote'); await pausa(400);
  await page.keyboard.type('AUTOTEST', { delay: 30 }); await tecla('Enter');
  await page.keyboard.type('1', { delay: 30 }); await tecla('Enter'); await page.keyboard.type('2', { delay: 30 });
  await page.focus('#input-vencimiento-lote'); await tecla('ArrowDown'); await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-texto', { timeout: 15000 }); await tecla('Enter'); await pausa(800);

  // 2) Reloj del producto → pestaña Movimientos con teclado
  await page.focus('#btn-tab-productos'); await tecla('Enter'); await pausa(1500);
  const enfocado = await page.evaluate(() => {
    const fila = Array.from(document.querySelectorAll('tr, [data-row="true"]')).find((f) => f.textContent.includes('PRODUCTO AUTOTEST'));
    const b = fila?.querySelector('[title="Historial de Lotes / Movimientos"]'); if (!b) return false; b.focus(); return true;
  });
  ok('Se llega al reloj de PRODUCTO AUTOTEST', enfocado);
  await tecla('Enter'); await page.waitForSelector('#titulo-historial-lotes', { timeout: 10000 }); await pausa(1500);
  ok('Abre en la pestaña Lotes con el selector en la primera fila', (await foco()) === 'fila-lote-0', await foco());
  await tecla('ArrowUp');
  ok('↑ desde la primera fila → la pestaña abierta (Lotes)', (await foco()) === 'tab-hist-lotes', await foco());
  await tecla('ArrowUp');
  ok('↑ → la X', (await foco()) === 'btn-cerrar-historial-lotes', await foco());
  await tecla('ArrowDown');
  ok('↓ desde la X → vuelve a la barra (Lotes)', (await foco()) === 'tab-hist-lotes', await foco());
  await tecla('ArrowRight'); await pausa(800);
  ok('→ en las pestañas SOLO mueve el selector a Movimientos (sigue en Lotes)', (await foco()) === 'tab-hist-movimientos' && await page.evaluate(() => !document.getElementById('hist-desde') && !!document.querySelector('[data-hist-lote="true"]')), await foco());
  await tecla('ArrowLeft'); await pausa(400);
  ok('← vuelve el selector a Lotes sin cambiar nada', (await foco()) === 'tab-hist-lotes' && await page.evaluate(() => !document.getElementById('hist-desde')), await foco());
  await tecla('ArrowRight');
  await tecla('Enter'); await pausa(1800);
  ok('Enter en Movimientos recién abre Movimientos (el selector sigue en la pestaña)', (await foco()) === 'tab-hist-movimientos' && await page.evaluate(() => !!document.getElementById('hist-desde')), await foco());
  await tecla('ArrowLeft'); await tecla('Enter'); await pausa(800);
  ok('Enter en Lotes vuelve a Lotes', await page.evaluate(() => !document.getElementById('hist-desde') && !!document.querySelector('[data-hist-lote="true"]')));
  await tecla('ArrowRight'); await tecla('Enter'); await pausa(1800);
  const n = await page.evaluate(() => document.querySelectorAll('[data-hist-mov="true"]').length);
  ok('Hay movimientos de los últimos 30 días', n > 0, `${n}`);
  const primera = await page.evaluate(() => document.querySelector('[data-hist-mov="true"]')?.textContent || '');
  ok('El más reciente es el Ingreso que acabo de hacer', primera.includes('Ingreso') && primera.includes('Ingreso Lote'), primera);
  ok('…y guarda QUIÉN lo hizo (no "postgres" ni "Sistema")', primera.includes('Administrador SiuHub'), primera);
  ok('Resumen "Entró / Salió" visible', await page.evaluate(() => /Entró:/.test(document.body.textContent) && /Salió:/.test(document.body.textContent)));
  // La barra es una fila: → pasa a las fechas; ↓ baja a la lista; ↑ vuelve a donde estaba
  await tecla('ArrowRight');
  ok('→ desde la pestaña Movimientos → fecha Desde', (await foco()) === 'hist-desde', await foco());
  await tecla('ArrowRight');
  ok('→ → fecha Hasta', (await foco()) === 'hist-hasta', await foco());
  await tecla('ArrowLeft');
  ok('← → vuelve a Desde', (await foco()) === 'hist-desde', await foco());
  // Enter en una fecha abre el calendario (se cuenta la llamada; el calendario del navegador no se ve en la prueba)
  await page.evaluate(() => { window.__calendario = 0; HTMLInputElement.prototype.showPicker = function () { window.__calendario++; }; });
  await tecla('Enter');
  ok('Enter en la fecha abre el calendario y el selector sigue en la fecha', (await page.evaluate(() => window.__calendario)) === 1 && (await foco()) === 'hist-desde', await foco());
  await tecla('ArrowDown');
  ok('↓ desde la fecha → primer movimiento', (await foco()) === 'fila-mov-0', await foco());
  await tecla('ArrowUp');
  ok('↑ desde el primer movimiento → vuelve a la fecha Desde (donde estaba)', (await foco()) === 'hist-desde', await foco());
  await tecla('ArrowDown');
  await tecla('Tab', 2);
  ok('Tab no se escapa de la ventana', /^(fila-|tab-hist|hist-|btn-cerrar)/.test(await foco()), await foco());
  ok('Tab no abrió el menú', await page.evaluate(() => document.getElementById('evicamp-sidebar')?.getAttribute('data-sidebar-open') !== 'true'));
  // Fechas: dejar "Desde" en mañana → no hay movimientos
  await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); const v = d.toLocaleDateString('en-CA'); const i = document.getElementById('hist-hasta'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })); const i2 = document.getElementById('hist-desde'); set.call(i2, v); i2.dispatchEvent(new Event('input', { bubbles: true })); });
  await pausa(1500);
  ok('Cambiar las fechas filtra (mañana: sin movimientos)', await page.evaluate(() => document.body.textContent.includes('No hay movimientos en estas fechas')));
  await tecla('Escape'); await pausa(400);
  ok('Esc cierra y el selector vuelve al reloj', !(await page.$('#titulo-historial-lotes')) && (await foco()) === 'Historial de Lotes / Movimientos', await foco());

  // 3) Finanzas: historial de cajas muestra quién abrió y cerró (dato de prueba puesto en la base)
  await page.evaluate(() => document.getElementById('sidebar-btn-finanzas')?.click()); await pausa(2500);
  await page.waitForSelector('#btn-ver-historial', { timeout: 15000 }); await page.focus('#btn-ver-historial'); await tecla('Enter'); await pausa(2500);
  const caja = await page.evaluate(() => document.body.textContent.includes('Abrió: PRUEBA ABRIO') && document.body.textContent.includes('Cerró: PRUEBA CERRO'));
  ok('Finanzas: el historial de cajas muestra "Abrió" y "Cerró"', caja);
} catch (e) { ok('Sin fallas', false, e.message); }
finally { ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ')); await nav.close(); console.log(res.join('\n')); }
