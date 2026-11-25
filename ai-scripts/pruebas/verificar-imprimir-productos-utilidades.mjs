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
  ok('La ventana abre con Enter', !!(await page.$('#casilla-todas-categorias')));
  await page.waitForFunction(() => document.querySelectorAll('[data-categoria]').length > 1, { timeout: 30000 });
  await page.waitForSelector('iframe[title="Vista previa del listado de productos"]', { timeout: 30000 });
  await pausa(700);
  const v0 = await vista();
  ok('Sin internet carga los productos activos', v0.filas.length > 0, `${v0.filas.length} filas`);
  ok('Por defecto trae Cant. a pedir y no Precio', v0.cabeceras.join('|') === 'CÓDIGO|NOMBRE|CATEGORÍA|STOCK|CANT. A PEDIR', v0.cabeceras.join('|'));
  ok('El encabezado dice LISTADO DE PRODUCTOS', /LISTADO DE PRODUCTOS/.test(v0.texto));
  await page.waitForFunction(() => {
    const img = document.querySelector('iframe[title="Vista previa del listado de productos"]')?.contentDocument?.querySelector('img.logo');
    return !!img && img.complete && img.naturalWidth > 0;
  }, { timeout: 10000 });
  const logoEnCabecera = await page.evaluate(() => {
    const d = document.querySelector('iframe[title="Vista previa del listado de productos"]')?.contentDocument;
    const img = d?.querySelector('.cabecera img.logo');
    return !!img && !!d?.querySelector('.cabecera .marca') && (img.src || '').length > 0 && img.naturalWidth > 0;
  });
  ok('La hoja lleva el logo de la empresa en la cabecera', logoEnCabecera);
  const cabeceraConEspacio = await page.evaluate(() => {
    const d = document.querySelector('iframe[title="Vista previa del listado de productos"]')?.contentDocument;
    const c = d?.querySelector('.cabecera');
    const marca = d?.querySelector('.marca');
    const titulo = d?.querySelector('.titulo');
    if (!c || !marca || !titulo) return false;
    const e = getComputedStyle(c);
    const izquierda = parseFloat(e.paddingLeft || '0');
    const derecha = parseFloat(e.paddingRight || '0');
    const hueco = titulo.getBoundingClientRect().left - marca.getBoundingClientRect().right;
    return izquierda >= 10 && derecha >= 10 && hueco >= 12;
  });
  ok('Logo, título, categorías y fecha no están pegados a los bordes', cabeceraConEspacio);
  const hojaEstilizada = await page.evaluate(() => {
    const d = document.querySelector('iframe[title="Vista previa del listado de productos"]')?.contentDocument;
    return !!(d?.querySelector('.cabecera') && d?.querySelector('.pie') && /@page/.test(d?.styleSheets?.[0]?.cssRules ? [...d.styleSheets[0].cssRules].map((r) => r.cssText).join('') : ''));
  });
  ok('La hoja A4 lleva cabecera, pie y regla de página', hojaEstilizada);
  const tablaEstilizada = await page.evaluate(() => {
    const d = document.querySelector('iframe[title="Vista previa del listado de productos"]')?.contentDocument;
    const th = d?.querySelector('thead th');
    const filas = d?.querySelectorAll('tbody tr');
    if (!th || !filas || filas.length < 2) return false;
    const fondoTh = getComputedStyle(th).backgroundColor;
    const fondoPar = getComputedStyle(filas[1].querySelector('td')).backgroundColor;
    const fondoImpar = getComputedStyle(filas[0].querySelector('td')).backgroundColor;
    return fondoTh !== 'rgba(0, 0, 0, 0)' && fondoTh !== 'rgb(255, 255, 255)' && fondoPar !== fondoImpar;
  });
  ok('La tabla tiene encabezado oscuro y filas alternas', tablaEstilizada);
  const unaFila = await page.evaluate(() => {
    const fs = [...document.querySelectorAll('[role="dialog"] fieldset')];
    return fs.length >= 2 && Math.abs(fs[0].getBoundingClientRect().top - fs[1].getBoundingClientRect().top) < 8;
  });
  ok('Categorías y columnas están en una sola fila', unaFila);
  ok('No hay botón Cancelar (cierra la X)', !(await page.$('#btn-cancelar-imprimir-productos')));
  const btnAcomodado = await page.evaluate(() => {
    const b = document.getElementById('btn-imprimir-productos-hoja');
    const fs = [...document.querySelectorAll('[role="dialog"] fieldset')];
    const dialogo = document.querySelector('[role="dialog"]');
    if (!b || fs.length < 2 || !dialogo) return false;
    const rb = b.getBoundingClientRect();
    const rf = fs[1].getBoundingClientRect();
    const rd = dialogo.getBoundingClientRect();
    return Math.abs(rb.bottom - rf.bottom) < 10 && rb.right <= rd.right + 1 && rb.width > 150;
  });
  ok('El botón Imprimir queda acomodado al final de la fila', btnAcomodado);
  await page.setOfflineMode(false);

  // Precio empieza desmarcado; se puede marcar y volver a omitir.
  ok('Precio viene desmarcado', !v0.cabeceras.includes('PRECIO') && !v0.celdasUltima.some((c) => /^\s*S\//.test(c)), v0.cabeceras.join('|'));
  await page.focus('#casilla-precio'); await tecla(' '); await pausa(600);
  const v1 = await vista();
  const idxPrecio = v1.cabeceras.indexOf('PRECIO');
  ok('Se puede marcar Precio', idxPrecio >= 0 && v1.filas.some((f) => /^\s*S\//.test(f[idxPrecio] || '')), v1.cabeceras.join('|'));
  await tecla(' '); await pausa(600);
  const v2 = await vista();
  ok('Precio vuelve a omitirse', !v2.cabeceras.includes('PRECIO'), v2.cabeceras.join('|'));

  // No se puede dejar sin ninguna columna con datos (Cant. a pedir no cuenta).
  await page.focus('#casilla-precio'); await tecla(' ');
  await page.focus('#casilla-pedido'); await tecla(' ');
  for (const id of ['casilla-codigo', 'casilla-nombre', 'casilla-categoria', 'casilla-stock']) {
    await page.focus(`#${id}`); await tecla(' ');
  }
  await page.focus('#casilla-precio'); await tecla(' '); await pausa(500);
  const marcadas = await page.$$eval('input[data-columna]', (xs) => xs.filter((x) => x.checked).map((x) => x.id));
  ok('Siempre queda al menos una columna', marcadas.length === 1 && marcadas[0] === 'casilla-precio', marcadas.join(','));
  // Volver al estado pedido por defecto: precio fuera, cantidad a pedir dentro.
  for (const id of ['casilla-codigo', 'casilla-nombre', 'casilla-categoria', 'casilla-stock']) {
    await page.focus(`#${id}`); await tecla(' ');
  }
  await page.focus('#casilla-precio'); await tecla(' ');
  await page.focus('#casilla-pedido'); await tecla(' ');
  await pausa(400);

  // Categorías con casillas: se elige cuáles se imprimen y cuáles no
  const cats = await page.$$eval('[data-categoria]', (xs) => xs.map((x) => x.dataset.categoria));
  ok('Hay casillas para todas las categorías reales', cats.length > 1, `${cats.length} categorías`);
  ok('Todas las categorías vienen marcadas', await page.$eval('#casilla-todas-categorias', (x) => x.checked));

  // Desmarcar todo deja la hoja vacía; volver a marcar una deja solo esa categoría.
  await page.focus('#casilla-todas-categorias'); await tecla(' '); await pausa(400);
  ok('Se pueden desmarcar todas las categorías', (await vista()).filas.length === 0);
  await page.focus('#casilla-categoria-0'); await tecla(' '); await pausa(700);
  const v3 = await vista();
  const cat = cats[0];
  const idxCat = v3.cabeceras.indexOf('CATEGORÍA');
  const todasCoinciden = v3.filas.length > 0 && v3.filas.every((f) => (f[idxCat] || '') === cat);
  ok('Solo se imprime la categoría elegida', todasCoinciden, `${v3.filas.length} filas de ${cat}`);
  await page.focus('#casilla-todas-categorias'); await tecla(' '); await pausa(400);
  await page.focus('#casilla-categoria-0'); await tecla(' '); await pausa(600);
  const v3b = await vista();
  const sinCat = v3b.filas.length > 0 && v3b.filas.every((f) => (f[idxCat] || '') !== cat);
  ok('Se puede excluir una categoría', sinCat, `${v3b.filas.length} filas sin ${cat}`);
  await page.focus('#casilla-todas-categorias'); await tecla(' '); await pausa(500);

  // Columna en blanco para anotar la cantidad a pedir: viene marcada por defecto.
  const v4 = await vista();
  ok('CANT. A PEDIR viene marcada por defecto', v4.cabeceras.includes('CANT. A PEDIR'), v4.cabeceras.join('|'));
  ok('CANT. A PEDIR sale en blanco para escribir',
    v4.filas.length > 0 && v4.filas.every((f) => (f[f.length - 1] || '').trim() === ''));
  await page.focus('#casilla-pedido'); await tecla(' '); await pausa(400);
  ok('Se puede quitar CANT. A PEDIR', !(await vista()).cabeceras.includes('CANT. A PEDIR'));
  await tecla(' '); await pausa(400);
  ok('CANT. A PEDIR vuelve al marcarla', (await vista()).cabeceras.includes('CANT. A PEDIR'));

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
  ok('Escape cierra la ventana', !(await page.$('#casilla-todas-categorias')));
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
    await page.waitForFunction(() => document.querySelectorAll('[data-categoria]').length > 1, { timeout: 30000 });
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
