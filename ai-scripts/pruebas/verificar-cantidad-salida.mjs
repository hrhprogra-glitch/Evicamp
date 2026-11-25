// Prueba real de la cantidad en Nueva salida. Solo lectura: NO guarda ninguna salida.
// Uso: node ai-scripts/pruebas/verificar-cantidad-salida.mjs [nego|ecosistema|evicamp]
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); }
catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('C:/Users/User/AppData/Local/Temp/opencode/salidas-pantalla-pc/.env.vps');

const URLS = {
  nego: 'https://nego.siumax.duckdns.org',
  ecosistema: 'https://ecosistema123.duckdns.org',
  evicamp: 'https://evicamp.duckdns.org',
};
const sitio = process.argv[2] || 'nego';
if (!URLS[sitio]) { console.error(`Sitio desconocido: ${sitio}`); process.exit(1); }

let ok = 0, fallos = 0;
const comprobar = (nombre, condicion, detalle = '') => {
  if (condicion) { ok++; console.log(`  OK  ${nombre}`); }
  else { fallos++; console.log(`  FALLO ${nombre}${detalle ? ` · ${detalle}` : ''}`); }
};
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function probar(ancho, alto) {
  console.log(`\n=== ${sitio} ${ancho}x${alto} ===`);
  const nav = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, defaultViewport: { width: ancho, height: alto },
  });
  const page = await nav.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.setCacheEnabled(false);
  try {
    await page.goto(URLS[sitio], { waitUntil: 'networkidle2' });
    await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
    await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
    await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE || '');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#sidebar-btn-salidas', { timeout: 30000 });
    await pausa(700);
    await page.evaluate(() => document.getElementById('sidebar-btn-salidas')?.click());
    await pausa(700);
    await page.evaluate(() => document.getElementById('btn-nueva-salida')?.click());
    await page.waitForSelector('#input-buscar-producto-salida', { timeout: 10000 });
    await pausa(400);

    const arriba = '#input-cant-item-salida';
    const valor = async (sel) => page.$eval(sel, (e) => e.value).catch(() => '(sin campo)');
    const borrarTodo = async () => {
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    };

    // Agregar un producto con cantidad 25.
    await page.focus('#input-buscar-producto-salida');
    await page.keyboard.type('manguera');
    await pausa(1100);
    await page.evaluate(() => document.getElementById('sugerencia-salida-0')?.click());
    await pausa(200);
    await page.focus(arriba);
    await borrarTodo();
    await page.keyboard.type('25');
    await page.keyboard.press('Enter');
    await pausa(600);
    const fila = await page.evaluate(() => document.querySelector('[id^="input-cantidad-item-"]')?.id || '');
    comprobar(`${ancho}: se agregó el producto a la fila`, !!fila);
    if (!fila) return;
    const sel = `#${fila}`;
    comprobar(`${ancho}: la fila empieza en 25`, (await valor(sel)) === '25', `valor=${await valor(sel)}`);

    // Caso del dueño: borrar 25 por completo.
    await page.focus(sel);
    await borrarTodo();
    await page.keyboard.type('25');
    await page.keyboard.press('Backspace');
    comprobar(`${ancho}: primer Backspace deja 2`, (await valor(sel)) === '2', `valor=${await valor(sel)}`);
    await page.keyboard.press('Backspace');
    comprobar(`${ancho}: segundo Backspace deja el campo vacío`, (await valor(sel)) === '', `valor=${await valor(sel)}`);
    await page.evaluate(() => document.getElementById('input-buscar-producto-salida')?.focus());
    await pausa(200);
    comprobar(`${ancho}: al salir vuelve 25 y no el 2 a medias`, (await valor(sel)) === '25', `valor=${await valor(sel)}`);

    // Escribir un número nuevo después de borrar.
    await page.focus(sel);
    await borrarTodo();
    await page.keyboard.type('7');
    await page.evaluate(() => document.getElementById('input-buscar-producto-salida')?.focus());
    await pausa(200);
    comprobar(`${ancho}: escribir 7 y salir guarda 7`, (await valor(sel)) === '7', `valor=${await valor(sel)}`);

    // Enter confirma y sale del campo.
    await page.focus(sel);
    await borrarTodo();
    await page.keyboard.type('9');
    await page.keyboard.press('Enter');
    await pausa(200);
    comprobar(`${ancho}: Enter confirma 9`, (await valor(sel)) === '9', `valor=${await valor(sel)}`);
    // Regla 9 del teclado SiuMax: tras Enter el foco vuelve al campo de origen. Se comprueba que
    // el número quedó guardado de verdad dando + después (9 -> 10), no solo el texto escrito.

    // Botones -/+ siguen funcionando.
    await page.evaluate(() => document.querySelector('button[title="Sumar 1"]')?.click());
    await pausa(150);
    comprobar(`${ancho}: botón + suma 1`, (await valor(sel)) === '10', `valor=${await valor(sel)}`);
    await page.evaluate(() => document.querySelector('button[title="Restar 1"]')?.click());
    await pausa(150);
    comprobar(`${ancho}: botón - resta 1`, (await valor(sel)) === '9', `valor=${await valor(sel)}`);

    // El campo de arriba sigue borrando completo.
    await page.focus(arriba);
    await borrarTodo();
    await page.keyboard.type('25');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    comprobar(`${ancho}: campo de arriba borra completo`, (await valor(arriba)) === '', `valor=${await valor(arriba)}`);

    comprobar(`${ancho}: 0 errores JavaScript`, errores.length === 0, errores.slice(0, 2).join(' | '));
  } finally {
    await nav.close();
  }
}

console.log(`Sitio: ${URLS[sitio]}`);
await probar(1366, 768);
await probar(390, 844);
console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos`);
process.exitCode = fallos ? 1 : 0;
