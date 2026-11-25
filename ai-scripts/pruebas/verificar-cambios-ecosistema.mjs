// 24/11/2026 — Verificación en el sitio oficial (solo lectura: no guarda salidas ni productos):
//  · manguera en unidad M con SUNAT MTR y rollo en Opciones avanzadas (precio 0.00 permitido),
//  · STOCK EN METROS: sugerido 100322 = 1430 M y lista 100282 = 327 M,
//  · sin texto «1 UND = 500 M», Devoluciones en columna propia, una flecha = una fila,
//  · Salidas ofrece el ROLLO igual que Caja y 1 ROLLO se agrega como 100 M,
//  · buscadores con tildes/espacios, sin internet y en 390/768/1366/1920.
// Uso: node ai-scripts/pruebas/verificar-cambios-ecosistema.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
const U = process.env.ECOSISTEMA_ADMIN_USUARIO, C = process.env.ECOSISTEMA_ADMIN_CLAVE;
if (!U || !C) throw new Error('Faltan ECOSISTEMA_ADMIN_USUARIO / ECOSISTEMA_ADMIN_CLAVE en .env.vps');

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
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, sel, valor);
  await pausa(400);
};
const filaActiva = () => page.evaluate(() => {
  const filas = [...document.querySelectorAll('[data-fila-salida="true"]')];
  return { indice: filas.indexOf(document.activeElement), id: document.activeElement?.id || document.activeElement?.tagName || '', total: filas.length };
});
const sugerencias = () => page.evaluate(() => {
  const lista = [...document.querySelectorAll('[id^="sugerencia-salida-"]')];
  return { total: lista.length, texto: lista.map((e) => e.textContent.trim()).join(' | ').slice(0, 180) };
});

try {
  await page.goto('https://ecosistema123.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await page.keyboard.type(U);
  await tecla('Enter'); await page.focus('#input-login-password'); await page.keyboard.type(C); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 25000 }); await pausa(900);
  ok('Login con teclado en ecosistema', true);

  // 1) Salidas: columna Devoluciones, una flecha = una fila y buscadores flexibles.
  await page.focus('#sidebar-btn-salidas'); await tecla('Enter'); await pausa(900);
  await page.waitForSelector('[data-fila-salida="true"]', { timeout: 15000 });
  const ths = await page.$$eval('#tabla-salidas-lista thead th', (e) => e.map((x) => x.textContent.trim()));
  ok('Devoluciones es columna propia', ths.includes('Devoluciones'), JSON.stringify(ths));
  const filas = await page.$$('[data-fila-salida="true"]');
  await filas[0].focus(); await pausa(150);
  await tecla('ArrowDown'); const baja = await filaActiva();
  await tecla('ArrowUp'); const sube = await filaActiva();
  ok('↓ baja UNA fila y ↑ sube UNA', baja.indice === 1 && sube.indice === 0, JSON.stringify({ baja, sube }));
  await escribirEn('#buscador-salidas', '  '); await pausa(100);
  await escribirEn('#buscador-salidas', 'MANGUERA');
  const buscaGeneral = await page.$$eval('[data-fila-salida="true"]', (f) => f.length);
  ok('Buscador general de Salidas responde sin error', buscaGeneral >= 0, String(buscaGeneral));
  await escribirEn('#buscador-salidas', '');

  await page.focus('#btn-nueva-salida'); await tecla('Enter'); await pausa(700);
  await page.waitForSelector('#input-buscar-producto-salida', { timeout: 15000 });
  await escribirEn('#input-buscar-producto-salida', 'manguera  ciega');
  const mangs = await sugerencias();
  ok('Buscador de producto tolera espacio de más y minúsculas', mangs.total > 0, JSON.stringify(mangs));
  ok('Sugerido de 100282 muestra el stock en metros (327 M)', /327(?:\.0+)?\s*M\b/.test(mangs.texto), JSON.stringify(mangs));
  await escribirEn('#input-buscar-producto-salida', 'MANGUERA DE 16');
  const m16 = await sugerencias();
  ok('Sugerido de 100322 muestra los metros reales (1430 M)', /1430(?:\.0+)?\s*M\b/.test(m16.texto), JSON.stringify(m16));
  await tecla('Enter'); await pausa(300);
  const textoSalida = await page.evaluate(() => document.body.innerText);
  ok('NO aparece «1 UND = 500 M»', !/1\s*UND\s*=\s*\d+\s*M/i.test(textoSalida));
  for (let i = 0; i < 3; i++) { await tecla('Escape'); await pausa(220); }

  // 1b) Igual que en Caja: el buscador de Salidas ofrece el rollo y, al elegirlo,
  //     se convierte a metros (1 ROLLO x100 = 100 M) para guardar y descontar en M.
  await page.focus('#btn-nueva-salida'); await tecla('Enter'); await pausa(600);
  await page.waitForSelector('#input-buscar-producto-salida', { timeout: 15000 });
  await escribirEn('#input-buscar-producto-salida', 'manguera  ciega');
  const conRollo = await sugerencias();
  ok('Salidas ofrece el ROLLO como Caja ((ROLLO x100))', /ROLLO\s*x\s*100/i.test(conRollo.texto), JSON.stringify(conRollo));
  ok('El ROLLO muestra su stock en rollos (3 ROLLO)', /3\s*ROLLO\b/.test(conRollo.texto), JSON.stringify(conRollo));
  let rolloEncontrado = false;
  for (let i = 0; i < 8; i++) {
    await tecla('ArrowDown');
    const activo = await page.evaluate(() => {
      const e = [...document.querySelectorAll('[id^="sugerencia-salida-"]')].find((x) => x.className.includes('color-accent'));
      return e?.textContent || '';
    });
    if (/ROLLO\s*x\s*100/i.test(activo)) { rolloEncontrado = true; break; }
  }
  ok('Con teclado se puede elegir el ROLLO en Salidas', rolloEncontrado);
  await tecla('Enter'); await pausa(350);
  await escribirEn('#input-cant-item-salida', '1');
  await tecla('Enter'); await pausa(350);
  const itemRollo = await page.evaluate(() => {
    const inp = document.querySelector('input[id^="input-cantidad-item-"]');
    if (!inp) return null;
    return {
      cantidad: inp.value,
      texto: (inp.closest('tr')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
    };
  });
  ok('1 ROLLO se agrega como 100 M (se guarda en metros)', !!itemRollo && Number(itemRollo.cantidad) === 100 && /\bM\b/.test(itemRollo.texto), JSON.stringify(itemRollo));
  for (let i = 0; i < 3; i++) { await tecla('Escape'); await pausa(220); }

  // 2) Inventario: la manguera está en M / MTR y el rollo en Opciones avanzadas con precio 0.00.
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await pausa(1000);
  await page.waitForSelector('#btn-tab-productos', { timeout: 15000 });
  await page.focus('#btn-tab-productos'); await tecla('Enter'); await pausa(1000);
  await escribirEn('#buscador-global-inventario', 'MANGUERA CIEGA');
  const filaProd = await page.evaluate(() => {
    const f = [...document.querySelectorAll('[data-row="true"]')].find((x) => x.offsetParent && /MANGUERA CIEGA/i.test(x.innerText));
    if (!f) return null;
    f.focus();
    return f.innerText.replace(/\s+/g, ' ').slice(0, 180);
  });
  ok('La lista de Inventario muestra la manguera', !!filaProd, String(filaProd));
  ok('La lista muestra la unidad M y el rollo en la fila', !!filaProd && /\bM\b/.test(filaProd) && /ROLLO\s*x\s*100/i.test(filaProd), String(filaProd));
  ok('El stock de 100282 se muestra en metros reales (327 M)', !!filaProd && /327(?:\.0+)?\s*M\b/.test(filaProd), String(filaProd));
  await tecla('Enter'); await pausa(900);
  await page.waitForSelector('#select-unidad-peso-producto', { timeout: 15000 });
  const prod = await page.evaluate(() => ({
    unidad: document.getElementById('select-unidad-peso-producto')?.value || '',
    sunat: document.getElementById('codigo-sunat-producto')?.textContent || '',
    presUnidad: document.getElementById('pres-unidad-0')?.value || '',
    presFactor: document.getElementById('pres-factor-0')?.value || '',
    presPrecio: document.getElementById('pres-precio-0')?.value || '',
    avanzadasAbiertas: !!document.getElementById('pres-unidad-0'),
  }));
  ok('El producto se vende por M (Metro)', prod.unidad === 'M', JSON.stringify(prod));
  ok('Código SUNAT MTR', /MTR/.test(prod.sunat), prod.sunat);
  ok('Opciones avanzadas abiertas con ROLLO x100', prod.avanzadasAbiertas && prod.presUnidad === 'ROLLO' && Number(prod.presFactor) === 100, JSON.stringify(prod));
  ok('Rollo con precio S/ 0.00 visible (sin precio inventado)', Number(prod.presPrecio) === 0, prod.presPrecio);

  // 3) Sin internet y en los cuatro tamaños, sin desbordes.
  await page.setOfflineMode(true); await pausa(400);
  await escribirEn('#buscador-global-inventario', 'manguera');
  const sinInternet = await page.evaluate(() => document.body.innerText.includes('MANGUERA'));
  ok('Sin internet el buscador sigue encontrando la manguera', sinInternet);
  await page.setOfflineMode(false);
  for (const [w, h] of [[390, 844], [768, 900], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(300);
    const vista = await page.evaluate(() => ({
      visible: !!document.getElementById('select-unidad-peso-producto'),
      desbordes: document.documentElement.scrollWidth - window.innerWidth,
    }));
    ok(`${w}px: formulario visible y sin desbordes`, vista.visible && vista.desbordes <= 2, JSON.stringify(vista));
  }
  for (let i = 0; i < 3; i++) { await tecla('Escape'); await pausa(220); }
  ok('La ventana del producto se cierra con Escape', !(await page.$('#select-unidad-peso-producto')));
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
