// Verificación en vivo del arreglo de Salidas para PC pequeña (25/11/2026).
// Uso: node ai-scripts/pruebas/verificar-salidas-pantalla-pc.mjs [nego|ecosistema]
// Solo lectura: no escribe en la base ni cambia datos.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); }
catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile(new URL('../../.env.vps', import.meta.url));

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const SITIO = process.argv[2] || 'nego';
const URLS = { nego: 'https://nego.siumax.duckdns.org', ecosistema: 'https://ecosistema123.duckdns.org' };
const usuario = SITIO === 'ecosistema' ? process.env.ECOSISTEMA_ADMIN_USUARIO : 'admin@siumax.com';
const clave = SITIO === 'ecosistema' ? process.env.ECOSISTEMA_ADMIN_CLAVE : process.env.SIUMAX_ADMIN_CLAVE;
const TAMANOS = [[390, 844], [768, 1024], [1024, 768], [1280, 720], [1366, 768], [1920, 1080]];

let ok = 0, fallos = 0;
const comprobar = (nombre, condicion, detalle = '') => {
  if (condicion) { ok++; console.log(`  OK  ${nombre}`); }
  else { fallos++; console.log(`  FALLO ${nombre}${detalle ? ` · ${detalle}` : ''}`); }
};

const medir = () => {
  const raiz = document.querySelector('main');
  const botones = [...document.querySelectorAll('[id^="btn-ver-salida-"]')].filter((e) => e.offsetParent !== null);
  const ver = botones[0];
  const estado = document.querySelector('#tabla-salidas-lista [data-etiqueta="Estado"]');
  const cont = document.querySelector('.tabla-salidas-scroll');
  const tabla = document.querySelector('#tabla-salidas-lista table');
  const desbordes = [];
  if (raiz) {
    for (const el of raiz.querySelectorAll('th, td, div, span, button, input, select')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || !el.clientWidth || cs.position === 'fixed') continue;
      const rec = el.getBoundingClientRect();
      if (rec.right > innerWidth + 2) {
        const texto = (el.innerText || el.textContent || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 28);
        desbordes.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${texto}" x=${Math.round(rec.right)}`);
      }
    }
  }
  return {
    ancho: innerWidth,
    paginaDesborda: document.documentElement.scrollWidth > innerWidth + 2,
    desbordes: [...new Set(desbordes)].slice(0, 5),
    filas: document.querySelectorAll('[data-fila-salida="true"]').length,
    ver: ver ? { right: Math.round(ver.getBoundingClientRect().right), visible: ver.getBoundingClientRect().right <= innerWidth + 1 } : null,
    estado: estado ? { right: Math.round(estado.getBoundingClientRect().right), visible: estado.getBoundingClientRect().right <= innerWidth + 1 } : null,
    tabla: tabla ? Math.round(tabla.getBoundingClientRect().width) : 0,
    contenedor: cont ? Math.round(cont.getBoundingClientRect().width) : 0,
    overflow: cont ? getComputedStyle(cont).overflowX : '',
    apilado: tabla ? getComputedStyle(tabla).display === 'block' : false,
  };
};

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true, defaultViewport: { width: 1366, height: 768 },
});
const page = await nav.newPage();
await page.setCacheEnabled(false);
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));

await page.goto(URLS[SITIO], { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
await page.focus('#input-login-usuario'); await page.keyboard.type(usuario);
await page.focus('#input-login-password'); await page.keyboard.type(clave || '');
await page.keyboard.press('Enter');
await page.waitForSelector('#sidebar-btn-salidas', { timeout: 30000 });
await pausa(1200);

for (const [w, h] of TAMANOS) {
  await page.setViewport({ width: w, height: h });
  await pausa(350);
  await page.evaluate(() => document.getElementById('sidebar-btn-salidas')?.click());
  await page.waitForSelector('#btn-nueva-salida', { timeout: 10000 });
  await pausa(900);
  console.log(`\n=== ${SITIO} ${w}x${h} ===`);
  const m = await page.evaluate(medir);
  console.log(JSON.stringify(m));
  comprobar(`${w}: hay salidas en la lista`, m.filas > 0);
  comprobar(`${w}: botón VER dentro de la pantalla`, !!m.ver?.visible, JSON.stringify(m.ver));
  comprobar(`${w}: ESTADO dentro de la pantalla`, !!m.estado?.visible, JSON.stringify(m.estado));
  comprobar(`${w}: la página no se desplaza a los lados`, !m.paginaDesborda);
  comprobar(`${w}: nada de la lista sale del borde`, m.desbordes.length === 0, m.desbordes.join(' | '));
  comprobar(`${w}: tabla cabe en su contenedor`, m.tabla <= m.contenedor + 2, `${m.tabla} > ${m.contenedor}`);
  comprobar(`${w}: modo correcto`, w <= 1100 ? m.apilado : !m.apilado, `apilado=${m.apilado}`);

  if (w === 1366 || w === 1024) {
    await page.focus('#buscador-salidas');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await pausa(150);
    const enFila = await page.evaluate(() => document.activeElement?.getAttribute('data-fila-salida') === 'true');
    comprobar(`${w}: las flechas bajan del buscador a la fila`, enFila);
    await page.keyboard.press('Enter');
    const abrio = await page.evaluate(() => !!document.querySelector('#modal-detalle-salida-container'));
    comprobar(`${w}: Enter abre el detalle`, abrio);
    await page.keyboard.press('Escape');
    await pausa(250);
    const cerro = await page.evaluate(() => !document.querySelector('#modal-detalle-salida-container'));
    comprobar(`${w}: Escape cierra el detalle`, cerro);
  }
}

// Sin internet, ya dentro de Salidas: la lista y el teclado siguen funcionando.
await page.setViewport({ width: 1366, height: 768 });
await page.evaluate(() => document.getElementById('sidebar-btn-salidas')?.click());
await pausa(700);
await page.setOfflineMode(true);
await pausa(300);
await page.focus('#buscador-salidas');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await pausa(400);
const offline = await page.evaluate(() => ({
  detalle: !!document.querySelector('#modal-detalle-salida-container'),
  ver: !!document.querySelector('[id^="btn-ver-salida-"]'),
}));
console.log('\n=== Sin internet ===');
comprobar('detalle abre sin internet', offline.detalle);
comprobar('botón VER sigue en la lista sin internet', offline.ver);
await page.setOfflineMode(false);

comprobar('0 errores JS', errores.length === 0, errores.slice(0, 3).join(' | '));
console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos`);
await nav.close();
process.exitCode = fallos ? 1 : 0;
