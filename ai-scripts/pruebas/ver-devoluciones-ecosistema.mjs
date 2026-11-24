// SOLO LECTURA: abre una salida de ecosistema con devoluciones históricas y comprueba
// si la pantalla las ve (columna «Devuelto») y si la consulta a la API trae «devoluciones».
// No guarda ni devuelve nada. Uso:
//   node ai-scripts/pruebas/ver-devoluciones-ecosistema.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
const USUARIO = process.env.ECOSISTEMA_ADMIN_USUARIO;
const CLAVE = process.env.ECOSISTEMA_ADMIN_CLAVE;
if (!USUARIO || !CLAVE) throw new Error('Faltan credenciales de ecosistema en .env.vps');

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 },
});
const page = await nav.newPage();
const errores = [];
const api = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('response', async (r) => {
  const u = r.url();
  if (!/rest\/v1\/salidas(\?|$)/.test(u)) return;
  try {
    const t = await r.text();
    api.push({ estado: r.status(), conDevoluciones: t.includes('"devoluciones"'), largo: t.length, inicio: t.slice(0, 120) });
  } catch { api.push({ estado: r.status(), error: 'sin cuerpo' }); }
});
const tecla = async (k) => { await page.keyboard.press(k); await pausa(110); };
const escribir = async (t) => { await page.keyboard.type(t); await pausa(90); };
const irA = async (id) => { await page.focus(`#${id}`); await tecla('Enter'); await pausa(850); };

try {
  await page.goto('https://ecosistema123.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await escribir(USUARIO);
  await tecla('Enter'); await page.focus('#input-login-password'); await escribir(CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 25000 }); await pausa(1200);
  ok('Login real con teclado', true);

  await irA('sidebar-btn-salidas');
  await page.waitForSelector('#buscador-salidas', { timeout: 20000 });
  await page.focus('#buscador-salidas'); await escribir('SAL-MIG-00243'); await pausa(1000);
  await tecla('ArrowDown'); await tecla('ArrowDown'); await tecla('Enter'); await pausa(1600);
  ok('Salida con 21 devoluciones se abre con Enter', !!(await page.$('#modal-detalle-salida-container')));

  const detalle = await page.evaluate(() => {
    const d = document.getElementById('modal-detalle-salida-container');
    return d ? { texto: (d.innerText || '').slice(0, 600), botonDev: !!document.getElementById('btn-abrir-devoluciones') } : null;
  });
  ok('Detalle tiene el botón Devolver', !!detalle?.botonDev, JSON.stringify(detalle));

  await irA('btn-abrir-devoluciones');
  await page.waitForSelector('#modal-devoluciones-flotante-container', { timeout: 20000 });
  const vista = await page.evaluate(() => {
    const m = document.getElementById('modal-devoluciones-flotante-container');
    const filas = [...m.querySelectorAll('tbody tr')];
    const celdas = filas.map((f) => [...f.querySelectorAll('td')].map((c) => (c.innerText || '').trim()));
    return {
      filas: filas.length,
      conDevuelto: celdas.filter((c) => Number((c[3] || '0').replace(/[^\d.-]/g, '')) > 0).length,
      ejemplo: celdas.slice(0, 3),
    };
  });
  ok('La ventana de devoluciones muestra lo devuelto histórico', vista.conDevuelto > 0,
    JSON.stringify(vista));
  ok('La API trajo el bloque de devoluciones', api.some((a) => a.conDevoluciones),
    JSON.stringify(api.slice(-3)));
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 250));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  console.log(res.join('\n'));
  console.log('API:', JSON.stringify(api.slice(-5)));
}
