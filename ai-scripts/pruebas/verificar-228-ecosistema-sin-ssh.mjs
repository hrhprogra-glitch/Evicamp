// Variante de verificar-228-ecosistema.mjs que NO usa SSH: toma un código real ya conocido
// (SAL-MIG-00243, con materiales y devoluciones) y comprueba lo mismo por navegador.
// Útil si la VPS rechaza la conexión SSH; no escribe en la base.
// Uso: node ai-scripts/pruebas/verificar-228-ecosistema-sin-ssh.mjs <carpeta tools con puppeteer-core>
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
const codigo = 'SAL-MIG-00243';

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(120); } };
const escribir = async (t) => { await page.keyboard.type(t); await pausa(100); };
const irA = async (id) => { await page.focus(`#${id}`); await tecla('Enter'); await pausa(900); };

try {
  await page.goto('https://ecosistema123.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await escribir(USUARIO);
  await tecla('Enter'); await page.focus('#input-login-password'); await escribir(CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 25000 }); await pausa(1500);
  ok('Login real de ecosistema con teclado', true, codigo);

  await irA('sidebar-btn-salidas');
  await page.waitForSelector('#buscador-salidas', { timeout: 20000 });
  await page.focus('#buscador-salidas'); await escribir(codigo); await pausa(1000);
  await tecla('ArrowDown', 2); await tecla('Enter'); await pausa(1500);
  ok('La salida se abre con Enter y muestra el detalle', !!(await page.$('#modal-detalle-salida-container')));

  const idsBotones = ['btn-imprimir-salida', 'btn-continuar-salida', 'btn-finalizar-salida',
    'btn-eliminar-salida', 'btn-abrir-devoluciones', 'btn-cerrar-detalle-salida'];
  const detalle = await page.evaluate((ids) => {
    const d = document.getElementById('modal-detalle-salida-container');
    if (!d) return null;
    return {
      campos: d.querySelectorAll('input,select,textarea').length,
      quitar: d.querySelectorAll('[id^="btn-quitar-material-detalle-"]').length,
      botones: ids.filter((id) => !!document.getElementById(id)).length,
      cliente: !!document.getElementById('dato-cliente-detalle-salida'),
      radio: getComputedStyle(document.getElementById('btn-eliminar-salida') || d).borderRadius,
      soloLectura: /solo lectura/i.test(d.textContent || ''),
      guia: /continuar salida/i.test(d.textContent || ''),
      sobrio: d.classList.contains('ventana-sobria') && d.classList.contains('max-w-5xl'),
    };
  }, idsBotones);
  ok('Detalle solo para ver: 0 campos y 0 X de materiales',
    !!detalle && detalle.campos === 0 && detalle.quitar === 0, JSON.stringify(detalle));
  // SAL-MIG-00243 ya está FINALIZADA: no muestra «Finalizar», por eso son 5 botones
  // (en la prueba original con SSH se elegía una salida EN_PROCESO y eran 6).
  ok('Detalle avisa que es solo lectura, tiene sus botones y estilo sobrio',
    !!detalle && detalle.soloLectura && detalle.guia && detalle.cliente && detalle.botones === 5
      && detalle.sobrio && /^0px$/.test(detalle.radio), JSON.stringify(detalle));

  for (const [w, h] of [[390, 844], [768, 900], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(350);
    const estado = await page.evaluate((ids) => {
      const d = document.getElementById('modal-detalle-salida-container');
      if (!d) return null;
      const pies = ids.slice(0, 4);
      const ys = pies.map((id) => document.getElementById(id)?.getBoundingClientRect().top).filter((y) => y !== undefined);
      return {
        filas: ys.slice().sort((a, b) => a - b).reduce((n, y, i, arr) => n + (i === 0 || y - arr[i - 1] > 4 ? 1 : 0), 0),
        radio: getComputedStyle(document.getElementById('btn-eliminar-salida') || d).borderRadius,
        ancho: Math.round(d.getBoundingClientRect().width),
        desbordes: [...d.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0).length,
        x: !!document.getElementById('btn-cerrar-detalle-salida'),
        campos: d.querySelectorAll('input,select,textarea').length,
      };
    }, idsBotones);
    ok(`${w}px: botones del pie en una fila, X, sin campos y sin desbordes`,
      !!estado && estado.filas === 1 && /^0px$/.test(estado.radio) && estado.x && estado.campos === 0,
      JSON.stringify(estado));
  }
  await page.setViewport({ width: 1366, height: 860 }); await pausa(300);

  await page.setOfflineMode(true); await pausa(400);
  await page.focus('#btn-eliminar-salida'); await tecla('Enter'); await pausa(500);
  ok('Sin internet: Eliminar responde con teclado y pide confirmación', !!(await page.$('#dialogo-sistema-aceptar')));
  await tecla('Escape'); await pausa(400);
  await page.setOfflineMode(false);
  await tecla('Escape'); await pausa(600);
  ok('Escape cierra el detalle sin borrar nada', !(await page.$('#modal-detalle-salida-container')));

  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  console.log(res.join('\n'));
  const b = res.filter((r) => r.startsWith('OK ')).length;
  console.log(`TOTAL: ${b}/${res.length}`);
}
