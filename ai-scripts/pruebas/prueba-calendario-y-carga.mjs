// Prueba (13/11/2026, dueño): 1) el calendario de Nueva salida ya no atrapa el selector (las flechas se mueven y no
// cambian la fecha); 2) Utilidades (Productos) y las demás secciones cargan sin errores tras los cambios de velocidad.
// Deja el tipo de negocio como estaba al empezar.
// Uso: node ai-scripts/pruebas/prueba-calendario-y-carga.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const ir = async (sec) => { await page.evaluate((s) => document.getElementById(`sidebar-btn-${s}`)?.click(), sec); await pausa(2500); };
const tiposAntes = await sql('select tipos_negocio from empresa_config limit 1');
try {
  await sql(`update empresa_config set tipos_negocio = '{comercio,servicios}'`);
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  // ---- 1) Calendario de Nueva salida
  await ir('salidas'); await page.focus('#btn-nueva-salida'); await page.keyboard.press('Enter'); await pausa(1500);
  const idFecha = await page.evaluate(() => [...document.querySelectorAll('input[type="date"]')].find((i) => i.offsetParent)?.id || '');
  ok('Nueva salida tiene su fecha', !!idFecha, idFecha);
  const fecha0 = await page.$eval('#' + idFecha, (i) => i.value);
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft']) {
    await page.focus('#' + idFecha); await page.keyboard.press(k); await pausa(300);
    const f = await foco();
    ok(`Calendario: ${k} sale del campo de fecha`, f !== idFecha && f !== 'BODY', f);
    ok(`Calendario: ${k} no cambió la fecha`, (await page.$eval('#' + idFecha, (i) => i.value)) === fecha0);
  }
  await page.focus('#' + idFecha); await page.keyboard.press('Enter'); await pausa(400);
  ok('Calendario: Enter deja el selector en la fecha (y abre el calendario)', (await foco()) === idFecha, await foco());
  await page.keyboard.press('Escape'); await pausa(300);
  await page.keyboard.press('Escape'); await pausa(600);

  // ---- 2) Secciones cargan sin errores; Utilidades › Productos con datos
  const t0 = Date.now();
  await page.evaluate(() => sessionStorage.setItem('utilidades_pestana', 'productos'));
  await ir('utilidades');
  await page.waitForFunction(() => !/Cargando/i.test(document.querySelector('main')?.innerText || ''), { timeout: 30000 }).catch(() => {});
  ok('Utilidades › Productos carga', !!(await page.$('#buscador-global-utilidades')), `${Date.now() - t0} ms`);
  const filas = await page.evaluate(() => document.querySelectorAll('main [data-row="true"], main tbody tr').length);
  ok('Utilidades muestra la tabla de productos', filas > 0, `${filas} filas`);
  for (const s of ['inventario', 'clientes', 'encargos', 'conteos', 'finanzas', 'agenda', 'taller']) {
    await ir(s); ok(`${s} abre sin errores`, errores.length === 0, errores.join(' | '));
  }
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  await nav.close();
  await sql(`update empresa_config set tipos_negocio = '${tiposAntes}'`);
  ok('El tipo de negocio queda como estaba', (await sql('select tipos_negocio from empresa_config limit 1')) === tiposAntes, tiposAntes);
  console.log(res.join('\n'));
}
