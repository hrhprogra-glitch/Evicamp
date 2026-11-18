// Prueba: todas las tablas de Nego usan 50 filas por página y la franja siempre aparece.
// Cubre lo nuevo (Cotizaciones, Usuarios y las 4 pestañas de Utilidades de servicios) y una pasada
// rápida por las tablas que ya paginaban (Herramientas, Vehículos, Salidas, Contratos y Taller).
// Todo con teclado: flechas, Enter y Escape. Contra el sitio de pruebas Nego; sin Evicamp ni la base.
// Uso: node ai-scripts/pruebas/prueba-paginacion-50.mjs
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const sinDatos = (n, x = '') => res.push(`➖ ${n} — sin datos en Nego, no se pudo probar${x !== '' ? ' (' + x + ')' : ''}`);
const existe = async (sel) => (await page.$(sel)) !== null;
const foco = () => page.evaluate(() => document.activeElement?.id || '');

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 }
});
const page = await nav.newPage();

const irA = async (id) => {
  await page.focus(`#${id}`);
  await page.keyboard.press('Enter');
  await pausa(850);
};

const enfocarUltima = (sel) => page.evaluate((s) => {
  const filas = Array.from(document.querySelectorAll(s));
  (filas[filas.length - 1])?.focus();
}, sel);

// Comprueba la franja (arriba y abajo) y que no se dibujen más de 50 filas
const revisarFranja = async (nombre, selectorFilas, prefijo) => {
  const filas = await page.$$(selectorFilas);
  const franjas = await page.$$('.paginacion-sobria');
  const textos = await Promise.all(franjas.map((f) => f.evaluate((el) => el.innerText.replace(/\s+/g, ' ').trim())));
  ok(`${nombre}: paginación visible arriba y abajo`, franjas.length >= 2, textos.join(' | '));
  ok(`${nombre}: dice "Página N de N"`, textos.some((t) => /P[AÁ]GINA\s+\d+\s+DE\s+\d+/i.test(t)), textos[0] || 'sin franja');
  ok(`${nombre}: máximo 50 filas por página`, filas.length <= 50, `${filas.length} filas`);
  if (prefijo) {
    ok(`${nombre}: flechas con id estable`,
      (await existe(`#btn-pag-${prefijo}-ant`)) && (await existe(`#btn-pag-bottom-${prefijo}-sig`)));
  }
  return { filas: filas.length, textos };
};

const cerrarSiAbierto = async (sel) => {
  if (await existe(sel)) { await page.keyboard.press('Escape'); await pausa(400); }
};

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 15000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await pausa(1500);

  // ---- 1. COTIZACIONES: la tabla nueva de 50, con teclado e ids intactos ----
  try {
    await irA('sidebar-btn-encargos');
    // Con solo Servicios hay una sola pestaña y no se dibuja el selector; con Comercio sí.
    if (await existe('#tab-encargos-cotizaciones')) await irA('tab-encargos-cotizaciones');
    await page.waitForSelector('#buscador-cotizaciones', { timeout: 15000 });
    await pausa(1200);
    const { filas, textos } = await revisarFranja('Cotizaciones', '#tabla-cotizaciones [data-fila-coti="true"]', 'cotizaciones');
    if (filas === 0) {
      sinDatos('Cotizaciones: teclado en filas');
    } else {
      const primerId = await page.$eval('#tabla-cotizaciones [data-fila-coti="true"]', (el) => el.id);
      ok('Cotizaciones: id de fila intacto (fila-coti-id)', /^fila-coti-\d+$/.test(primerId), primerId);
      // Si hay más de 50, debe haber 2 páginas o más
      if (/P[AÁ]GINA\s+1\s+DE\s+([2-9]|\d{2,})/i.test(textos[0] || '')) {
        ok('Cotizaciones: 50 filas exactas en la página 1', filas === 50, `${filas} filas`);
        await enfocarUltima('#tabla-cotizaciones [data-fila-coti="true"]');
        await page.keyboard.press('ArrowDown');
        ok('Cotizaciones: ↓ desde la última fila baja a la paginación', (await foco()) === 'btn-pag-bottom-cotizaciones-ant', await foco());
        await page.keyboard.press('ArrowRight');
        ok('Cotizaciones: → pasa a la flecha siguiente', (await foco()) === 'btn-pag-bottom-cotizaciones-sig', await foco());
        await page.keyboard.press('Enter');
        await pausa(600);
        const pag2 = await page.$$eval('.paginacion-sobria', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
        ok('Cotizaciones: Enter cambia de página', pag2.some((t) => /P[AÁ]GINA\s+2\s+DE/i.test(t)), pag2[0] || '');
      }
      await page.focus('#tabla-cotizaciones [data-fila-coti="true"]');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#modal-titulo-detalle-coti', { timeout: 6000 });
      ok('Cotizaciones: Enter en la fila abre el detalle', true);
      await cerrarSiAbierto('#modal-titulo-detalle-coti');
    }
  } catch (e) {
    ok('Cotizaciones: paginación 50 y teclado', false, e.message.slice(0, 110));
    await cerrarSiAbierto('#modal-titulo-detalle-coti');
  }

  // ---- 2. USUARIOS (Ajustes) ----
  try {
    await irA('sidebar-btn-configuracion');
    await irA('btn-tab-usuarios');
    await page.waitForSelector('#buscador-usuarios-ajustes', { timeout: 15000 });
    await pausa(900);
    const { filas } = await revisarFranja('Usuarios', '#tabla-usuarios-ajustes tr[data-row="true"]', 'usuarios-ajustes');
    if (filas === 0) sinDatos('Usuarios: teclado en filas');
    else {
      await page.focus('#tabla-usuarios-ajustes tr[data-row="true"]');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#modal-usuario-container', { timeout: 6000 });
      ok('Usuarios: Enter en la fila abre el detalle', true);
      await cerrarSiAbierto('#modal-usuario-container');
      await enfocarUltima('#tabla-usuarios-ajustes tr[data-row="true"]');
      await page.keyboard.press('ArrowDown');
      ok('Usuarios: ↓ desde la última fila baja a la paginación', (await foco()) === 'btn-pag-bottom-usuarios-ajustes-ant', await foco());
    }
  } catch (e) {
    ok('Usuarios: paginación 50 y teclado', false, e.message.slice(0, 110));
    await cerrarSiAbierto('#modal-usuario-container');
  }

  // ---- 3. UTILIDADES DE SERVICIOS: 4 pestañas ----
  try {
    await irA('sidebar-btn-utilidades');
    for (const [tab, prefijo] of [
      ['rentabilidad', 'rentabilidad'],
      ['tecnicos', 'tecnicos'],
      ['materiales', 'materiales'],
      ['cobranzas', 'cobranzas'],
    ]) {
      await irA(`btn-tab-util-${tab}`);
      await page.select('#select-periodo-graficos', 'anio');
      await pausa(900);
      const { filas } = await revisarFranja(`Utilidades › ${tab}`, `#tabla-${tab} [data-fila-grafico="true"]`, prefijo);
      if (filas === 0) { sinDatos(`Utilidades › ${tab}: teclado en filas`); continue; }
      await page.focus(`#tabla-${tab} [data-fila-grafico="true"]`);
      await page.keyboard.press('Enter');
      await page.waitForSelector('#modal-detalle-fila', { timeout: 6000 });
      ok(`Utilidades › ${tab}: Enter abre el detalle`, true);
      await cerrarSiAbierto('#modal-detalle-fila');
    }
  } catch (e) {
    ok('Utilidades de servicios: paginación 50 y teclado', false, e.message.slice(0, 110));
    await cerrarSiAbierto('#modal-detalle-fila');
  }

  // ---- 4. PASADA RÁPIDA A LAS TABLAS QUE YA PAGINABAN (sin regresiones) ----
  const rapidas = [
    ['Herramientas', 'btn-tab-activos', 'btn-subtab-herramientas', '#tabla-herramientas-activos [data-row="true"]'],
    ['Vehículos', 'btn-tab-activos', 'btn-subtab-vehiculos', '#tabla-vehiculos-activos [data-row="true"]'],
  ];
  try {
    await irA('sidebar-btn-inventario');
    for (const [nombre, tab, sub, sel] of rapidas) {
      await irA(tab);
      await irA(sub);
      await pausa(400);
      await revisarFranja(nombre, sel, '');
    }
  } catch (e) {
    ok('Inventario > Activos: repaso de paginación', false, e.message.slice(0, 110));
  }
  for (const [nombre, sidebar, sel] of [
    ['Salidas', 'sidebar-btn-salidas', '#tabla-salidas-lista [data-fila-salida="true"]'],
    ['Contratos', 'sidebar-btn-contratos', '#tabla-contratos [data-row="true"]'],
    ['Taller', 'sidebar-btn-taller', 'tr[data-row="true"]'],
  ]) {
    try {
      await irA(sidebar);
      await pausa(500);
      const filas = await page.$$(sel);
      ok(`${nombre}: máximo 50 filas por página`, filas.length <= 50, `${filas.length} filas`);
      ok(`${nombre}: franja de paginación visible`, (await page.$$('.paginacion-sobria')).length >= 2);
    } catch (e) {
      ok(`${nombre}: repaso de paginación`, false, e.message.slice(0, 110));
    }
  }

  console.log('\nResultados de la prueba (50 filas por página, solo Nego):\n' + res.join('\n'));
  const fallos = res.filter((r) => r.startsWith('❌')).length;
  const sinProbar = res.filter((r) => r.startsWith('➖')).length;
  console.log(`\nTotal: ${res.length} comprobaciones, ${fallos} fallos, ${sinProbar} sin datos en Nego.`);
} catch (err) {
  console.error('Error durante la prueba:', err);
  process.exit(1);
} finally {
  await nav.close();
}
