// Prueba enfocada (fase 204, 23/11/2026): el empleado responsable se ve en el ticket de una salida
// ya guardada y se puede cambiar desde el detalle, con guardado real en la base.
// Usa una salida existente (no crea salidas: la secuencia de siumax está desfasada) y al final
// devuelve el empleado original. Solo Nego, sin Evicamp, sin push.
// Uso: node ai-scripts/pruebas/prueba-empleado-detalle-salida.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const ID = 387, CODIGO = 'SAL-1534', ORIGINAL = 'Jorge Luis';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(120); } };
const ticket = () => page.evaluate(() => document.querySelector('[data-vista-previa-salida] iframe')?.contentDocument?.body?.innerText || '');

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com'); await pausa(100);
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 20000 }); await pausa(1200);

  await page.keyboard.down('Alt'); await tecla('Digit4'); await page.keyboard.up('Alt'); await pausa(2200);
  await page.focus('#buscador-salidas'); await page.keyboard.type(CODIGO); await pausa(900);
  const filas = await page.$$('[data-fila-salida]');
  ok('Salida existente encontrada en la tabla', filas.length > 0, `${filas.length} fila(s)`);
  await tecla('ArrowDown'); await tecla('ArrowDown'); await tecla('Enter'); await pausa(1300);
  let enDetalle = await page.evaluate(() => !!document.getElementById('modal-detalle-salida-container'));
  if (!enDetalle && filas[0]) { await filas[0].click(); await pausa(1000); enDetalle = await page.evaluate(() => !!document.getElementById('modal-detalle-salida-container')); }
  ok('Abrir la fila abre el detalle de la salida', enDetalle);

  const emp = await page.$eval('#select-empleado-detalle-salida', (el) => ({
    valor: el.value || '', texto: el.selectedOptions?.[0]?.textContent || '',
  })).catch(() => null);
  ok('204: el detalle muestra al empleado anterior cuando ya no está activo',
    !!emp && emp.valor === ORIGINAL && /anterior/i.test(emp.texto), emp ? `${emp.texto} (${emp.valor})` : 'sin selector');

  await page.focus('#btn-imprimir-salida'); await tecla('Enter'); await pausa(900);
  const t1 = await ticket();
  ok('204: el ticket de una salida guardada muestra el empleado responsable',
    /empleado responsable/i.test(t1) && /jorge luis/i.test(t1), t1.slice(0, 180).replace(/\s+/g, ' '));
  await tecla('Escape'); await pausa(500);

  const adminId = await page.evaluate(() => {
    const s = document.getElementById('select-empleado-detalle-salida');
    const op = [...(s?.options || [])].find((o) => /administrador/i.test(o.textContent || ''));
    return op ? op.value : '';
  });
  ok('Empleado activo disponible para el cambio', !!adminId, adminId);
  if (adminId) {
    await page.evaluate((id) => {
      const s = document.getElementById('select-empleado-detalle-salida');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(s, id);
      s.dispatchEvent(new Event('change', { bubbles: true }));
    }, adminId);
    await pausa(1600);
    const guardado = await sql(`select coalesce(usuario,'') from salidas where id=${ID}`);
    ok('204: cambiar el empleado en el detalle se guarda en la base', /administrador/i.test(guardado), guardado);

    await page.focus('#btn-imprimir-salida'); await tecla('Enter'); await pausa(900);
    const t2 = await ticket();
    ok('204: el ticket refleja el empleado ya cambiado',
      /empleado responsable/i.test(t2) && /administrador/i.test(t2), t2.slice(0, 180).replace(/\s+/g, ' '));
    await tecla('Escape'); await pausa(500);
  }
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  try {
    await sql(`update salidas set usuario='${ORIGINAL}' where id=${ID}`);
    ok('Empleado original restaurado en la salida de prueba',
      (await sql(`select coalesce(usuario,'') from salidas where id=${ID}`)) === ORIGINAL, ORIGINAL);
  } catch (e) { res.push('MAL No se pudo restaurar el empleado original: ' + e.message); }
  console.log(res.join('\n'));
}
