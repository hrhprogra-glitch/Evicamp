// Prueba de la fase 2.4 (siumax) con los datos DEMO COMPRAS (scratchpad/demo-compras.sql): filtro "Sin ventas
// (30 días)", orden "Más plata parada", y "Sugerir pedido" en Compras (con y sin proveedor). También sin internet.
// Uso: node prueba-compra-sugerida.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
await page.evaluateOnNewDocument(() => localStorage.setItem('siumax_pruebas', '1'));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-nav') || document.activeElement?.tagName);
const tecla = async (k) => { await page.keyboard.press(k); await pausa(200); };
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const visibles = () => page.evaluate(() => [...document.querySelectorAll('[data-row="true"]')].filter((f) => f.offsetParent !== null && /DEMO (ARROZ 1KG|FIDEO|GASEOSA|SHAMPOO|PILAS)/.test(f.innerText))
  .map((f) => f.innerText.match(/DEMO (ARROZ 1KG|FIDEO|GASEOSA|SHAMPOO|PILAS)/)[1].replace(' 1KG', '')));
const buscar = async (t) => { await page.focus('#buscador-global-inventario'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(t); await pausa(900); };
const lineas = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-producto]')].map((tr) => [tr.querySelector('td')?.innerText.trim(), tr.querySelector('input')?.value])));
const abrirEditor = async () => {
  await page.focus('#btn-tab-compras'); await tecla('Enter'); await pausa(1500);
  await page.waitForSelector('#btn-nueva-compra'); await page.focus('#btn-nueva-compra'); await tecla('Enter'); await page.waitForSelector('#compra-dias'); await pausa(600);
};
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(18000); // precarga
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#filtro-estado-inventario'); await pausa(2500);

  // 1) Sin ventas (30 días)
  const opciones = await page.evaluate(() => [...document.querySelectorAll('#filtro-estado-inventario option, #filtro-orden-inventario option')].map((o) => o.textContent.trim()));
  ok('Filtro "Sin ventas (30 días)" y orden "Más plata parada" existen', opciones.includes('Sin ventas (30 días)') && opciones.includes('Más plata parada'), opciones.slice(-3).join(' | '));
  await page.focus('#btn-tab-productos'); await tecla('Enter'); await buscar('DEMO');
  await page.select('#filtro-estado-inventario', 'SIN_VENTAS'); await pausa(800);
  ok('Productos · Sin ventas: shampoo (última venta hace 40 días) y pilas (nunca), NO arroz/fideo/gaseosa', JSON.stringify((await visibles()).sort()) === JSON.stringify(['PILAS', 'SHAMPOO']), JSON.stringify(await visibles()));
  await page.select('#filtro-orden-inventario', 'PLATA_PARADA'); await pausa(800);
  ok('Más plata parada: primero el shampoo (24 × 9 = S/ 216) y luego las pilas (40 × 5 = S/ 200)', JSON.stringify(await visibles()) === JSON.stringify(['SHAMPOO', 'PILAS']), JSON.stringify(await visibles()));
  await page.focus('#btn-tab-lotes'); await tecla('Enter'); await pausa(2500); await buscar('DEMO-CMP');
  ok('Lotes · Sin ventas: los lotes del shampoo y las pilas', JSON.stringify((await visibles()).sort()) === JSON.stringify(['PILAS', 'SHAMPOO']), JSON.stringify(await visibles()));
  await page.select('#filtro-estado-inventario', ''); await page.select('#filtro-orden-inventario', 'NOMBRE_ASC'); await pausa(500);

  // 2) Sugerir pedido con proveedor
  await abrirEditor();
  ok('Compras · Nueva lista: tiene "Para 15 días" y "Sugerir pedido"', (await page.$eval('#compra-dias', (i) => i.value)) === '15' && !!(await page.$('#btn-sugerir-pedido')));
  const provId = await page.evaluate(() => [...document.querySelectorAll('#compra-proveedor option')].find((o) => o.textContent === 'PROVEEDOR DEMO COMPRAS')?.value);
  await page.select('#compra-proveedor', provId); await pausa(300);
  await page.focus('#compra-dias'); await tecla('ArrowLeft');
  ok('← desde "días" llega a "Sugerir pedido" (un solo botón)', (await foco()) === 'btn-sugerir-pedido' && !(await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Agregar stock bajo/i.test(b.textContent)))), await foco());
  await tecla('Enter'); await pausa(1500);
  let l = await lineas();
  ok('Con el proveedor: arroz 22 (2/día × 15 − 8) y fideo 21 (1.5/día × 15 − 2)', l['DEMO ARROZ 1KG'] === '22' && l['DEMO FIDEO 500G'] === '21', JSON.stringify(l));
  ok('No sugiere la gaseosa (hay 50 y alcanza) ni lo que no se vende', !('DEMO GASEOSA 1.5L' in l) && !('DEMO SHAMPOO 400ML' in l) && !('DEMO PILAS AA X4' in l), JSON.stringify(l));
  ok('Solo productos de ese proveedor (2 líneas)', Object.keys(l).length === 2, `${Object.keys(l).length}`);
  ok('Muestra el resumen de lo sugerido (sin "0 por…")', (await page.$eval('#compra-resumen-sugerido', (e) => e.innerText)).startsWith('Se agregaron 2 producto(s): 2 por lo que se vende (para 15 días). Revisa') && !/ 0 por/.test(await page.$eval('#compra-resumen-sugerido', (e) => e.innerText)), await page.$eval('#compra-resumen-sugerido', (e) => e.innerText));
  const stockTexto = await page.evaluate(() => document.querySelector('[data-producto]')?.innerText || '');
  ok('La línea muestra lo vendido en 30 días (sin medias unidades)', /vendió 60 en 30 días/.test(stockTexto) && !/\d\.\d+\/día/.test(stockTexto), stockTexto.replace(/\s+/g, ' '));
  // 30 días: el arroz pasa a 52 si se quita y se vuelve a sugerir (los que ya están se respetan)
  const parpadea = () => page.$eval('#btn-sugerir-pedido', (b) => b.className.includes('animate-pulse'));
  ok('"Limpiar lista" está en rojo cuando hay productos', await page.$eval('#btn-limpiar-compra', (b) => b.className.includes('color-danger') && !b.className.split(/\s+/).includes('opacity-50')));
  ok('Recién sugerido, el botón no parpadea', !(await parpadea()));
  await page.focus('#compra-dias'); await page.keyboard.type('30'); await pausa(200);
  ok('Al cambiar los días, "Sugerir pedido" parpadea (falta presionarlo)', await parpadea());
  const antes = JSON.stringify(await lineas());
  await tecla('Enter'); await pausa(800);
  ok('Enter en los días NO sugiere: solo lleva el selector a "Sugerir pedido"', (await foco()) === 'btn-sugerir-pedido' && JSON.stringify(await lineas()) === antes, await foco());
  await tecla('Enter'); await pausa(1200);
  ok('Al presionar el botón deja de parpadear', !(await parpadea()));
  l = await lineas();
  ok('Volver a sugerir NO cambia lo que ya está en la lista', l['DEMO ARROZ 1KG'] === '22', JSON.stringify(l));
  await tecla('Escape'); await pausa(600);

  // 3) Proveedor sin lotes: avisa
  await page.focus('#btn-nueva-compra'); await tecla('Enter'); await page.waitForSelector('#compra-dias'); await pausa(600);
  const sinLotes = await page.evaluate(() => [...document.querySelectorAll('#compra-proveedor option')].find((o) => o.textContent === 'PROVEEDOR DEMO SIN LOTES')?.value);
  await page.select('#compra-proveedor', sinLotes); await page.focus('#btn-sugerir-pedido'); await tecla('Enter'); await pausa(1200);
  ok('Proveedor sin lotes: avisa que no sabe qué se le compra', /Todavía no hay lotes recibidos de PROVEEDOR DEMO SIN LOTES/.test(await aviso()), (await aviso()).slice(0, 80));
  await tecla('Enter'); await pausa(500);
  ok('Tras el aviso, el selector va al proveedor', (await foco()) === 'compra-proveedor', await foco());
  // 4) Sin proveedor: de todos
  await page.select('#compra-proveedor', ''); await page.focus('#btn-sugerir-pedido'); await tecla('Enter'); await pausa(1200);
  l = await lineas();
  ok('Sin proveedor: sugiere de todos (incluye arroz y fideo) y también lo que está bajo el mínimo', l['DEMO ARROZ 1KG'] === '22' && l['DEMO FIDEO 500G'] === '21' && Object.keys(l).length > 2, `${Object.keys(l).length} líneas`);
  ok('La ventana explica qué hace "Sugerir pedido"', await page.evaluate(() => /agrega lo que se acaba/.test(document.querySelector('[role="dialog"]')?.innerText || '')));
  // Limpiar lista (con confirmación) → lista vacía, sin aviso viejo y el selector en el buscador
  await page.focus('#btn-limpiar-compra'); await tecla('Enter'); await pausa(500);
  ok('Limpiar lista pregunta antes', /Quitar los \d+ productos/.test(await aviso()), (await aviso()).slice(0, 60));
  await tecla('Enter'); await pausa(600);
  ok('Al confirmar queda vacía, sin aviso viejo y el selector en el buscador', (await page.$$('[data-producto]')).length === 0 && !(await page.$('#compra-resumen-sugerido')) && (await foco()) === 'compra-buscar', await foco());
  // Filtro de categoría: solo DEMO COMPRAS
  const sel = async (id, valor) => { await page.select(id, valor); await pausa(200); };
  await sel('#compra-sugerir-categoria', 'DEMO COMPRAS'); await page.focus('#btn-sugerir-pedido'); await tecla('Enter'); await pausa(1200);
  l = await lineas();
  ok('Sugerir de "DEMO COMPRAS": solo arroz y fideo (los demás de esa categoría alcanzan)', JSON.stringify(Object.keys(l).sort()) === JSON.stringify(['DEMO ARROZ 1KG', 'DEMO FIDEO 500G']), JSON.stringify(l));
  // Solo bajo el mínimo: el fideo (2, mínimo 3) → hasta el doble del mínimo = 4; el arroz no (8 > 3)
  await page.focus('#btn-limpiar-compra'); await tecla('Enter'); await pausa(400); await tecla('Enter'); await pausa(500);
  await sel('#compra-sugerir-tipo', 'MINIMO'); await page.focus('#btn-sugerir-pedido'); await tecla('Enter'); await pausa(1200);
  l = await lineas();
  ok('"Solo lo que está bajo el mínimo": fideo 4, sin el arroz', JSON.stringify(l) === JSON.stringify({ 'DEMO FIDEO 500G': '4' }), JSON.stringify(l));
  // Solo lo que se vende: arroz 22 y fideo 21
  await page.focus('#btn-limpiar-compra'); await tecla('Enter'); await pausa(400); await tecla('Enter'); await pausa(500);
  await sel('#compra-sugerir-tipo', 'VENTA'); await page.focus('#btn-sugerir-pedido'); await tecla('Enter'); await pausa(1200);
  l = await lineas();
  ok('"Solo lo que se vende": arroz 22 y fideo 21', l['DEMO ARROZ 1KG'] === '22' && l['DEMO FIDEO 500G'] === '21' && Object.keys(l).length === 2, JSON.stringify(l));
  // Selector: ↓ desde el botón Sugerir baja a la fila de filtros
  await page.focus('#btn-sugerir-pedido'); await tecla('ArrowDown');
  ok('↓ desde "Sugerir pedido" baja a los filtros', /^compra-sugerir-/.test(await foco()), await foco());
  await tecla('Escape'); await pausa(600);

  // 5) Sin internet: el filtro sigue funcionando
  await page.setOfflineMode(true);
  await page.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await pausa(1500);
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-tab-productos'); await pausa(2500);
  await page.focus('#btn-tab-productos'); await tecla('Enter'); await page.waitForSelector('#filtro-estado-inventario'); await buscar('DEMO'); await page.select('#filtro-estado-inventario', 'SIN_VENTAS'); await pausa(800);
  ok('Sin internet · Sin ventas: shampoo y pilas', JSON.stringify((await visibles()).sort()) === JSON.stringify(['PILAS', 'SHAMPOO']), JSON.stringify(await visibles()));
  await page.setOfflineMode(false);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  console.log(res.join('\n'));
}
