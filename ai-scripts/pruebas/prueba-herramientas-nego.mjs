// Prueba del 12/11/2026 (SiuMax Nego, paso 3d), con teclado: Inventario → Herramientas y vehículos (de SiuMax Servic),
// solo con "Talleres y servicios". Crea una herramienta, abre el historial de préstamos y Vehículos; al final borra lo
// creado y deja el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/prueba-herramientas-nego.mjs <carpeta tools con puppeteer-core>
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
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const hay = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const cerrarAviso = async () => { await pausa(300); if (await aviso()) { await tecla('Enter'); await pausa(400); } };
const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
const elegir = async (tipos) => {
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
  await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
  for (const t of ['servicios', 'comercio']) if (tipos.includes(t) && (await marcado(t)) !== 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  for (const t of ['comercio', 'servicios']) if (!tipos.includes(t) && (await marcado(t)) === 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  await page.focus('#btn-guardar-tipo-negocio'); await tecla('Enter'); await pausa(1500); await cerrarAviso();
};
const abrirInventario = async () => { await page.evaluate(() => document.getElementById('sidebar-btn-inventario')?.click()); await pausa(2000); };
const HERR = `TALADRO PRUEBA ${String(Date.now()).slice(-6)}`;

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  await elegir(['comercio']); await abrirInventario();
  ok('Solo Comercio: Inventario sin "Herramientas y vehículos"', !(await hay('#btn-tab-activos')) && (await hay('#btn-tab-compras')));

  await elegir(['comercio', 'servicios']); await abrirInventario();
  ok('Con Servicios: aparece la pestaña "Herramientas y vehículos"', await hay('#btn-tab-activos'));
  await page.focus('#btn-tab-compras'); await tecla('ArrowRight');
  ok('→ desde Compras va a Herramientas y vehículos', (await foco()) === 'btn-tab-activos', await foco());
  await tecla('Enter'); await pausa(1500);
  ok('Enter la abre: sin los botones de productos ni los filtros de Inventario', (await hay('#btn-subtab-herramientas')) && !(await hay('#btn-nuevo-producto')) && !(await hay('#filtro-categoria-inventario')));
  ok('Barra sobria: Prestar, Historial y Nueva herramienta', (await hay('#btn-prestar-herramienta')) && (await hay('#btn-historial-prestamos')) && (await hay('#btn-nueva-herramienta')));
  await page.focus('#btn-tab-activos'); await tecla('ArrowDown');
  ok('↓ desde la pestaña baja a su buscador', (await foco()) === 'buscador-activos', await foco());

  // Nueva herramienta
  await page.focus('#btn-nueva-herramienta'); await tecla('Enter'); await pausa(800);
  ok('Enter en "Nueva herramienta" abre su ventana', await hay('#input-herr-nombre'));
  await page.focus('#input-herr-nombre'); await page.keyboard.type(HERR);
  await page.focus('#input-herr-cantidad'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type('3');
  await page.focus('#btn-guardar-herramienta'); await tecla('Enter'); await pausa(1800); await cerrarAviso();
  const fila = await sql(`select nombre, cantidad_total from herramientas where nombre = '${HERR}'`);
  ok('La herramienta se guarda en la base', fila === `${HERR}|3`, fila);
  ok('Y sale en la tabla', await page.evaluate((t) => document.body.innerText.toUpperCase().includes(t), HERR));

  // Historial de préstamos
  await page.focus('#btn-historial-prestamos'); await tecla('Enter'); await pausa(900);
  ok('"Historial" abre el historial de préstamos', await page.evaluate(() => /HISTORIAL/i.test([...document.querySelectorAll('[role="dialog"], .fixed.inset-0')].map((d) => d.innerText).join(' '))));
  await tecla('Escape'); await pausa(500);

  // Vehículos
  await page.focus('#btn-subtab-vehiculos'); await tecla('Enter'); await pausa(1200);
  ok('Vehículos: su tabla y botones (sin cuadros de resumen)', (await hay('#tabla-vehiculos-activos')) && (await hay('#btn-nuevo-vehiculo')) && !(await page.evaluate(() => document.body.innerText.toUpperCase().includes('ALERTAS SOAT'))));
  await page.screenshot({ path: path.join(aqui, 'captura-herramientas-nego.png') });

  // Solo Comercio otra vez: la pestaña guardada vuelve a Productos
  await elegir(['comercio']); await abrirInventario();
  ok('De vuelta a solo Comercio: sin la pestaña y abre Productos', !(await hay('#btn-tab-activos')) && (await hay('#btn-nuevo-producto')));
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  try { await elegir(['comercio']); } catch { /* */ }
  await nav.close();
  await sql(`delete from herramientas where nombre = '${HERR}';`);
  console.log(res.join('\n'));
}
