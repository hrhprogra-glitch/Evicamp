// Prueba (13/11/2026, dueño: "cuando selecciono el buscador o la cantidad no puedo subir arriba"): ↑ ↓ en Nueva
// cotización (líneas) y en Nueva salida (buscador de materiales y cantidad). No guarda nada.
// Uso: node ai-scripts/pruebas/prueba-flechas-coti-salida.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const desde = async (id, tecla = 'ArrowUp') => { await page.focus('#' + id); await page.keyboard.press(tecla); await pausa(300); return foco(); };
const valor = (id) => page.$eval('#' + id, (e) => e.value);
try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  // ---- Nueva cotización con 2 líneas
  await page.evaluate(() => sessionStorage.setItem('encargos_pestana', 'cotizaciones'));
  await page.evaluate(() => document.getElementById('sidebar-btn-encargos')?.click()); await pausa(2500);
  await page.focus('#btn-nueva-cotizacion'); await page.keyboard.press('Enter'); await pausa(1500);
  await page.focus('#btn-agregar-item-coti'); await page.keyboard.press('Enter'); await pausa(400);
  ok('Hay 2 líneas', (await page.$$eval('[id^="input-desc-item-"]', (x) => x.length)) === 2);
  for (const c of ['seccion', 'desc', 'unidad', 'cant', 'precio']) {
    const f = await desde(`input-${c}-item-0`);
    ok(`Cotización: ↑ desde ${c} (línea 1) sube arriba`, ['buscador-producto-coti', 'btn-agregar-item-coti'].includes(f), f);
    const f2 = await desde(`input-${c}-item-1`);
    ok(`Cotización: ↑ desde ${c} (línea 2) sube a la línea 1`, f2 === `input-${c}-item-0`, f2);
    const f3 = await desde(`input-${c}-item-0`, 'ArrowDown');
    ok(`Cotización: ↓ desde ${c} (línea 1) baja a la línea 2`, f3 === `input-${c}-item-1`, f3);
  }
  const cant = await valor('input-cant-item-0'); await desde('input-cant-item-0'); await desde('input-cant-item-0', 'ArrowDown');
  ok('Las flechas no cambian la cantidad', (await valor('input-cant-item-0')) === cant, `${cant} → ${await valor('input-cant-item-0')}`);
  const fb = await desde('buscador-producto-coti', 'ArrowDown');
  ok('Cotización: ↓ desde el buscador baja a la primera línea', fb.endsWith('-item-0'), fb);
  const fu = await desde('buscador-producto-coti');
  ok('Cotización: ↑ desde el buscador sube a los datos del cliente', fu !== 'buscador-producto-coti' && /coti$/.test(fu), fu);
  await page.keyboard.press('Escape'); await pausa(800);

  // ---- Nueva salida
  await page.evaluate(() => document.getElementById('sidebar-btn-salidas')?.click()); await pausa(2500);
  await page.focus('#btn-nueva-salida'); await page.keyboard.press('Enter'); await pausa(1500);
  const fbs = await desde('input-buscar-producto-salida');
  ok('Salida: ↑ desde el buscador de materiales sube', fbs !== 'input-buscar-producto-salida' && fbs !== 'BODY', fbs);
  const fc = await desde('input-cant-item-salida');
  ok('Salida: ↑ desde la cantidad sube (a algo con id, que se ve)', fc !== 'input-cant-item-salida' && fc !== 'INPUT' && fc !== 'BODY', fc);
  const anillo = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return cs.boxShadow !== 'none' || cs.outlineStyle !== 'none'; });
  ok('Salida: lo que queda seleccionado se ve (borde)', anillo);
  const fd = await desde('input-buscar-producto-salida', 'ArrowDown');
  ok('Salida: ↓ desde el buscador (sin lista) baja', fd !== 'input-buscar-producto-salida', fd);
  await page.focus('#input-buscar-producto-salida'); await page.keyboard.type('a'); await pausa(600);
  await page.keyboard.press('ArrowDown'); await pausa(300);
  ok('Salida: con la lista abierta, ↓ elige en la lista (no sale del buscador)', (await foco()) === 'input-buscar-producto-salida', await foco());
  await page.keyboard.press('Escape'); await pausa(300);
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  await nav.close();
  console.log(res.join('\n'));
}
