// 24/11/2026 — Nego: (1) una flecha = una fila en la tabla de Salidas, (2) buscadores
// que encuentran productos aunque escribas tildes, mayúsculas o un espacio de más.
// Solo lectura: no guarda salidas ni productos. Uso:
//   node ai-scripts/pruebas/verificar-flechas-y-buscador-nego.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
const U = 'admin@siumax.com', C = process.env.SIUMAX_ADMIN_CLAVE;
if (!C) throw new Error('Falta SIUMAX_ADMIN_CLAVE en .env.vps');

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true, defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(140); } };
const escribirEn = async (sel, valor) => {
  await page.focus(sel);
  await page.evaluate((s, v) => {
    const el = document.querySelector(s);
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, sel, valor);
  await pausa(400);
};
const filaActiva = () => page.evaluate(() => {
  const filas = [...document.querySelectorAll('[data-fila-salida="true"]')];
  const i = filas.indexOf(document.activeElement);
  return { indice: i, id: document.activeElement?.id || document.activeElement?.tagName || '', total: filas.length };
});
const sugerencias = () => page.evaluate(() => {
  const lista = [...document.querySelectorAll('[id^="sugerencia-salida-"]')];
  return { total: lista.length, texto: lista.map((e) => e.textContent.trim()).join(' | ').slice(0, 200) };
});

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await page.keyboard.type(U);
  await tecla('Enter'); await page.focus('#input-login-password'); await page.keyboard.type(C); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 25000 }); await pausa(1200);
  await page.focus('#sidebar-btn-salidas'); await tecla('Enter'); await pausa(1000);
  await page.waitForSelector('[data-fila-salida="true"]', { timeout: 15000 });
  ok('Login y entrada a Salidas con teclado', true);

  // 0) Devoluciones tiene columna propia (pedido del dueño 24/11).
  const columnas = await page.evaluate(() => {
    const ths = [...document.querySelectorAll('#tabla-salidas-lista thead th')].map((e) => e.textContent.trim());
    const fila = document.querySelector('[data-fila-salida="true"]');
    const celdas = [...(fila?.children || [])].map((e) => e.textContent.trim());
    return { ths, items: celdas[5] || '', dev: celdas[6] || '' };
  });
  ok('La tabla tiene Devoluciones como columna, no debajo de Ítems',
    columnas.ths.includes('Devoluciones') && !/dev\./i.test(columnas.items), JSON.stringify(columnas));
  // En Nego no hay devoluciones registradas: la columna debe mostrar "-" y no dejar la celda vacía.
  const celdasDev = await page.$$eval('[data-fila-salida="true"]',
    (filas) => filas.map((f) => (f.children[6]?.textContent || '').trim()));
  ok('Todas las filas traen valor en Devoluciones (número o "-")',
    celdasDev.length > 0 && celdasDev.every((x) => x.length > 0), JSON.stringify(celdasDev.slice(0, 5)));

  // 1) Una flecha = una fila. Antes el listener general de la pantalla movía otra vez.
  const filas = await page.$$('[data-fila-salida="true"]');
  await filas[0].focus(); await pausa(200);
  const inicio = await filaActiva();
  await tecla('ArrowDown');
  const baja1 = await filaActiva();
  await tecla('ArrowDown');
  const baja2 = await filaActiva();
  await tecla('ArrowUp');
  const sube1 = await filaActiva();
  await tecla('ArrowUp');
  const sube2 = await filaActiva();
  ok('↓ baja UNA fila (no dos)', inicio.indice === 0 && baja1.indice === 1, JSON.stringify({ inicio, baja1 }));
  ok('↓ otra vez baja la siguiente, sin saltos', baja2.indice === 2, JSON.stringify(baja2));
  ok('↑ sube UNA fila (no dos)', sube1.indice === 1 && sube2.indice === 0, JSON.stringify({ sube1, sube2 }));
  await tecla('ArrowUp');
  const arriba = await filaActiva();
  ok('↑ desde la primera fila sube a la paginación, no al buscador',
    arriba.id === 'btn-pagina-sig-salidas-arriba', JSON.stringify(arriba));

  // 2) Buscador general de Salidas: espacios de más siguen encontrando.
  await escribirEn('#buscador-salidas', 'electrob');
  const general1 = await page.$$eval('[data-fila-salida="true"]', (f) => f.length);
  await escribirEn('#buscador-salidas', '  electrob   ');
  const general2 = await page.$$eval('[data-fila-salida="true"]', (f) => f.length);
  ok('El buscador de Salidas ignora espacios de más',
    general1 > 0 && general2 === general1, JSON.stringify({ normal: general1, conEspacios: general2 }));
  await escribirEn('#buscador-salidas', '');

  // 3) Buscador de producto en Nueva salida: tildes, mayúsculas y doble espacio.
  await page.focus('#btn-nueva-salida'); await tecla('Enter'); await pausa(900);
  await page.waitForSelector('#input-buscar-producto-salida', { timeout: 15000 });
  await escribirEn('#input-buscar-producto-salida', 'UNIÓN UNIVERSAL');
  const conTilde = await sugerencias();
  ok('Encuentra «UNIÓN UNIVERSAL» tal como está en el producto',
    conTilde.total > 0 && /UNIÓN/i.test(conTilde.texto), JSON.stringify(conTilde));
  await escribirEn('#input-buscar-producto-salida', 'union  universal');
  const sinTildeDobleEspacio = await sugerencias();
  ok('Encuentra el mismo producto sin tilde y con doble espacio',
    sinTildeDobleEspacio.total > 0 && /UNIÓN/i.test(sinTildeDobleEspacio.texto), JSON.stringify(sinTildeDobleEspacio));
  await escribirEn('#input-buscar-producto-salida', 'sanking');
  const porPalabra = await sugerencias();
  ok('Encuentra el producto por una palabra del nombre',
    porPalabra.total > 0, JSON.stringify(porPalabra));

  // 3b) La equivalencia «1 UND = 500 M» quedó quitada de Salidas (pedido del dueño 24/11).
  await escribirEn('#input-buscar-producto-salida', 'MANGUERA');
  const mangueras = await sugerencias();
  if (mangueras.total > 0) {
    await tecla('Enter'); await pausa(350);
    const textoSalida = await page.evaluate(() => document.body.innerText);
    ok('Salidas NO muestra «1 UND = N M» al agregar una manguera',
      !/1\s*UND\s*=\s*\d+\s*M/i.test(textoSalida), JSON.stringify({ total: mangueras.total }));
  } else {
    ok('Salidas NO muestra «1 UND = N M» al agregar una manguera',
      !/1\s*UND\s*=\s*\d+\s*M/i.test(await page.evaluate(() => document.body.innerText)), 'sin mangueras en Nego');
  }

  // 4) Sin internet y en los cuatro tamaños.
  await page.setOfflineMode(true); await pausa(300);
  await escribirEn('#input-buscar-producto-salida', 'UNION UNIVERSAL');
  const sinInternet = await sugerencias();
  ok('Sin internet el buscador sigue encontrando con tilde quitada',
    sinInternet.total > 0, JSON.stringify(sinInternet));
  await page.setOfflineMode(false);

  for (const [w, h] of [[390, 844], [768, 900], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(350);
    const vista = await page.evaluate(() => {
      const b = document.getElementById('input-buscar-producto-salida');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { visible: r.width > 0 && r.height > 0, desbordes: document.documentElement.scrollWidth - window.innerWidth };
    });
    ok(`${w}px: buscador de producto visible y sin desbordes`,
      !!vista && vista.visible && vista.desbordes <= 2, JSON.stringify(vista));
  }
  await page.setViewport({ width: 1366, height: 860 }); await pausa(250);
  for (let i = 0; i < 3; i++) { await tecla('Escape'); await pausa(250); }
  const cerrado = await page.evaluate(() => !document.getElementById('input-buscar-producto-salida'));
  ok('La ventana de Nueva salida se cierra con Escape', cerrado);

  // 5) En cada tamaño, una flecha en la tabla sigue moviendo una sola fila.
  for (const [w, h] of [[390, 844], [768, 900], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(300);
    const filasTam = await page.$$('[data-fila-salida="true"]');
    if (filasTam.length < 2) continue;
    await filasTam[0].focus(); await pausa(150);
    await tecla('ArrowDown');
    const paso = await filaActiva();
    ok(`${w}px: ↓ baja UNA fila en la tabla`, paso.indice === 1, JSON.stringify(paso));
  }
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  await nav.close();
  console.log(res.join('\n'));
  const buenas = res.filter((r) => r.startsWith('OK ')).length;
  console.log(`TOTAL: ${buenas}/${res.length}`);
  process.exit(buenas === res.length ? 0 : 1);
}
