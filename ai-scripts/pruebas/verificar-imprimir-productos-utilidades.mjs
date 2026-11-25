// 25/11/2026 — Prueba REAL del botón «Imprimir productos» en Utilidades (solo Nego).
// Teclado, sin internet, 390/768/1366/1920, columnas opcionales, filtro por categoría y 0 errores JS.
// Uso: node ai-scripts/pruebas/verificar-imprimir-productos-utilidades.mjs [carpeta tools]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const aqui = path.dirname(fileURLToPath(import.meta.url));
const tools = process.argv[2] || 'D:/Programación/siumax/herramientas-pruebas';
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = 'https://nego.siumax.duckdns.org';
const usuario = process.env.SIUMAX_ADMIN_USUARIO || 'admin@siumax.com';
const clave = process.env.SIUMAX_ADMIN_CLAVE;
if (!clave) throw new Error('Falta SIUMAX_ADMIN_CLAVE en .env.vps');

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k) => { await page.keyboard.press(k); await pausa(180); };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const vista = () => page.evaluate(() => {
  const f = document.querySelector('iframe[title="Vista previa del listado de productos"]');
  const d = f?.contentDocument;
  return {
    texto: d?.body?.innerText || '',
    filas: Array.from(d?.querySelectorAll('tbody tr') || []).map((tr) => Array.from(tr.cells).map((td) => td.textContent || '')),
    cabeceras: Array.from(d?.querySelectorAll('thead th') || []).map((th) => th.textContent || ''),
    // Ojo: hay productos con «S/P» en el NOMBRE, así que el precio se mira solo en la última columna.
    celdasUltima: Array.from(d?.querySelectorAll('tbody tr') || []).map((tr) => tr.cells[tr.cells.length - 1]?.textContent || ''),
  };
});

try {
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await page.keyboard.type(usuario); await tecla('Enter');
  await page.focus('#input-login-password'); await page.keyboard.type(clave); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-utilidades', { timeout: 25000 }); await pausa(1200);
  await page.focus('#sidebar-btn-utilidades'); await tecla('Enter'); await pausa(1500);
  ok('Utilidades carga con el buscador de siempre', !!(await page.$('#buscador-global-utilidades')));

  // Botón al lado de «Gráficos y detalles»
  const lado = await page.evaluate(() => {
    const a = document.getElementById('btn-tops-utilidades');
    const b = document.getElementById('btn-imprimir-productos-utilidades');
    if (!a || !b) return null;
    const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect();
    return { mismaFila: Math.abs(ra.top - rb.top) < 8, aLaDerecha: rb.left > ra.left, texto: b.textContent?.trim() };
  });
  ok('El botón nuevo está al costado del de Gráficos y detalles', !!lado && lado.mismaFila && lado.aLaDerecha, JSON.stringify(lado));

  // Navegación con teclado en la cabecera
  await page.focus('#btn-tops-utilidades'); await tecla('ArrowRight');
  ok('→ desde Gráficos va al botón de impresión', (await foco()) === 'btn-imprimir-productos-utilidades', await foco());
  await tecla('ArrowLeft');
  ok('← desde Impresión vuelve a Gráficos', (await foco()) === 'btn-tops-utilidades', await foco());
  await page.focus('#btn-imprimir-productos-utilidades'); await tecla('ArrowDown');
  ok('↓ desde Impresión baja al buscador', (await foco()) === 'buscador-global-utilidades', await foco());
  await page.focus('#btn-tab-util-salidas'); await tecla('ArrowRight');
  ok('→ desde la última pestaña va al botón de impresión', (await foco()) === 'btn-imprimir-productos-utilidades', await foco());

  // Sin internet: la ventana debe cargar igual desde la copia local
  await page.setOfflineMode(true); await pausa(300);
  await page.focus('#btn-imprimir-productos-utilidades'); await tecla('Enter'); await pausa(2500);
  ok('La ventana abre con Enter', !!(await page.$('#categoria-imprimir-productos')));
  await page.waitForFunction(() => !document.querySelector('#categoria-imprimir-productos')?.disabled, { timeout: 30000 });
  await page.waitForSelector('iframe[title="Vista previa del listado de productos"]', { timeout: 30000 });
  await pausa(700);
  const v0 = await vista();
  ok('Sin internet carga los productos activos', v0.filas.length > 0, `${v0.filas.length} filas`);
  ok('La vista previa trae las 5 columnas por defecto', v0.cabeceras.join('|') === 'CÓDIGO|NOMBRE|CATEGORÍA|STOCK|PRECIO', v0.cabeceras.join('|'));
  ok('El encabezado dice LISTADO DE PRODUCTOS', /LISTADO DE PRODUCTOS/.test(v0.texto));
  await page.setOfflineMode(false);

  // Quitar y volver a poner la columna Precio
  await page.focus('#casilla-precio'); await tecla(' '); await pausa(600);
  const v1 = await vista();
  ok('Se puede omitir Precio', !v1.cabeceras.includes('PRECIO') && !v1.celdasUltima.some((c) => /^\s*S\//.test(c)), v1.cabeceras.join('|'));
  await tecla(' '); await pausa(600);
  const v2 = await vista();
  ok('Precio vuelve al marcarlo', v2.cabeceras.includes('PRECIO'), v2.cabeceras.join('|'));

  // No se puede dejar sin ninguna columna
  for (const id of ['casilla-codigo', 'casilla-nombre', 'casilla-categoria', 'casilla-stock']) {
    await page.focus(`#${id}`); await tecla(' ');
  }
  await page.focus('#casilla-precio'); await tecla(' '); await pausa(500);
  const marcadas = await page.$$eval('input[id^="casilla-"]', (xs) => xs.filter((x) => x.checked).map((x) => x.id));
  ok('Siempre queda al menos una columna', marcadas.length === 1 && marcadas[0] === 'casilla-precio', marcadas.join(','));
  for (const id of ['casilla-codigo', 'casilla-nombre', 'casilla-categoria', 'casilla-stock']) {
    await page.focus(`#${id}`); await tecla(' ');
  }
  await pausa(400);

  // Filtro por categoría
  const opciones = await page.$$eval('#categoria-imprimir-productos option', (xs) => xs.map((x) => x.value));
  ok('El filtro trae Todas más categorías reales', opciones.length > 1 && opciones[0] === 'TODAS', `${opciones.length} opciones`);
  await page.select('#categoria-imprimir-productos', opciones[1]); await pausa(700);
  const v3 = await vista();
  const cat = opciones[1];
  const todasCoinciden = v3.filas.length > 0 && v3.filas.every((f) => (f[2] || '') === cat);
  ok('El filtro de categoría deja solo esa categoría', todasCoinciden, `${v3.filas.length} filas de ${cat}`);
  await page.select('#categoria-imprimir-productos', 'TODAS'); await pausa(500);

  // El botón manda a imprimir SOLO la hoja (iframe), no toda la pantalla
  await page.evaluate(() => {
    const f = document.querySelector('iframe[title="Vista previa del listado de productos"]');
    if (f?.contentWindow) { f.contentWindow.__impreso = false; f.contentWindow.print = () => { f.contentWindow.__impreso = true; }; }
  });
  await page.focus('#btn-imprimir-productos-hoja'); await tecla('Enter'); await pausa(400);
  const impreso = await page.evaluate(() => !!document.querySelector('iframe[title="Vista previa del listado de productos"]')?.contentWindow?.__impreso);
  ok('Imprimir / PDF llama a la hoja A4', impreso);

  // Escape cierra y el selector vuelve al botón
  await tecla('Escape'); await pausa(400);
  ok('Escape cierra la ventana', !(await page.$('#categoria-imprimir-productos')));
  ok('El foco vuelve al botón de impresión', (await foco()) === 'btn-imprimir-productos-utilidades', await foco());

  // Cuatro tamaños: botón, ventana y hoja visibles sin desbordes
  for (const ancho of [390, 768, 1366, 1920]) {
    await page.setViewport({ width: ancho, height: 900 }); await pausa(500);
    const visible = await page.evaluate(() => {
      const b = document.getElementById('btn-imprimir-productos-utilidades');
      if (!b) return false;
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.left >= 0 && r.right <= window.innerWidth + 1;
    });
    ok(`${ancho}px: botón visible sin desborde`, visible);
    await page.focus('#btn-imprimir-productos-utilidades'); await tecla('Enter'); await pausa(900);
    await page.waitForFunction(() => !document.querySelector('#categoria-imprimir-productos')?.disabled, { timeout: 30000 });
    const v = await vista();
    ok(`${ancho}px: ventana y hoja con filas`, !!(await page.$('#btn-imprimir-productos-hoja')) && v.filas.length > 0, `${v.filas.length} filas`);
    await tecla('Escape'); await pausa(300);
  }
  ok('0 errores JS', errores.length === 0, errores.join(' | '));
} catch (e) {
  ok('La prueba terminó sin excepción', false, e.message);
} finally {
  console.log(res.join('\n'));
  const malos = res.filter((r) => r.startsWith('MAL'));
  console.log(`\nRESULTADO: ${res.length - malos.length}/${res.length}${malos.length ? ` · ${malos.length} MAL` : ' · TODO OK'}`);
  await nav.close();
  if (malos.length) process.exitCode = 1;
}
