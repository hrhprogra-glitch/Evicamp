// Prueba del 12/11/2026 (SiuMax Nego): en las ventanas traídas de SiuMax Servic, Enter en un campo NO pasa al siguiente
// (el selector se queda; se mueve con flechas), como pidió el dueño ("siempre tiene que ser así"). No guarda nada.
// Al final deja el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/prueba-enter-se-queda-nego.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { tipoInicial, restaurarTipo, tipoActual } from './lib-tipo-negocio.mjs';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const tiposAntes = await tipoInicial(); // 17/11: devolver la elección del dueño al terminar
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
const ir = async (sec) => { await page.evaluate((s) => document.getElementById(`sidebar-btn-${s}`)?.click(), sec); await pausa(2000); };
// Enter en cada campo: el selector debe seguir ahí (también pasado medio segundo) y la ventana seguir abierta
const enterSeQueda = async (ventana, campos, textoAntes = true) => {
  for (const c of campos) {
    if (!(await hay('#' + c))) { ok(`${ventana}: existe ${c}`, false); continue; }
    await page.focus('#' + c);
    const esTexto = await page.$eval('#' + c, (e) => e instanceof HTMLInputElement && ['text', 'number', 'tel', 'email', ''].includes(e.type));
    if (esTexto && textoAntes) await page.keyboard.type('1');
    await tecla('Enter'); await pausa(600);
    const f = await foco();
    ok(`${ventana}: Enter en ${c} → el selector se queda`, f === c, f);
    if (f !== c) await page.focus('#' + c);
    if (!(await hay('#' + c))) { ok(`${ventana}: la ventana sigue abierta`, false); return false; }
  }
  return true;
};
const cerrar = async (idCerrar) => { await page.focus('#' + idCerrar); await tecla('Enter'); await pausa(500); await cerrarAviso(); };

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);
  await elegir(['comercio', 'servicios']);

  // 1. Trabajador
  await ir('clientes'); await page.focus('#tab-clientes-trabajadores'); await tecla('Enter'); await pausa(1200);
  await page.focus('#btn-nuevo-trabajador'); await tecla('Enter'); await pausa(800);
  if (await enterSeQueda('Trabajador', ['trab-nombre', 'trab-dni', 'trab-cargo', 'trab-telefono', 'trab-estado'])) await cerrar('btn-cerrar-trabajador');

  // 2. Lo que se atiende (con el primer cliente de la lista)
  await page.focus('#tab-clientes-clientes'); await tecla('Enter'); await pausa(1000);
  if (await hay('[data-fila-cliente="true"]')) {
    await page.focus('[data-fila-cliente="true"]'); await tecla('Enter'); await pausa(1200);
    await page.focus('#btn-nuevo-bien'); await tecla('Enter'); await pausa(800);
    if (await enterSeQueda('Lo que se atiende', ['bien-tipo', 'bien-nombre', 'bien-direccion', 'bien-ubicacion', 'bien-estado'])) await cerrar('btn-cerrar-bien');
    await tecla('Escape'); await pausa(500);
  } else ok('Hay un cliente para probar "Lo que se atiende"', false);

  // 3. Herramientas y vehículos
  await ir('inventario'); await page.focus('#btn-tab-activos'); await tecla('Enter'); await pausa(1500);
  await page.focus('#btn-nueva-herramienta'); await tecla('Enter'); await pausa(800);
  if (await enterSeQueda('Nueva herramienta', ['input-herr-nombre', 'input-herr-categoria', 'input-herr-marca', 'input-herr-cantidad', 'select-herr-estado', 'input-herr-observaciones'])) await tecla('Escape');
  await pausa(500);
  await page.focus('#btn-prestar-herramienta'); await tecla('Enter'); await pausa(800);
  if (await enterSeQueda('Prestar herramienta', ['select-herr-prestamo', 'select-trabajador-prestamo', 'input-cant-prestamo', 'input-notas-prestamo'])) await tecla('Escape');
  await pausa(500);
  await page.focus('#btn-subtab-vehiculos'); await tecla('Enter'); await pausa(1200);
  await page.focus('#btn-nuevo-vehiculo'); await tecla('Enter'); await pausa(800);
  if (await enterSeQueda('Nuevo vehículo', ['input-veh-placa', 'input-veh-marca', 'input-veh-modelo', 'input-veh-color', 'input-veh-obs'])) await tecla('Escape');
  await pausa(500);
  await page.focus('#btn-nuevo-mantenimiento'); await tecla('Enter'); await pausa(800);
  if (await enterSeQueda('Mantenimiento', ['select-mant-vehiculo', 'select-mant-tipo', 'input-mant-km', 'input-mant-taller', 'input-mant-desc', 'input-mant-obs'])) await tecla('Escape');
  await pausa(500);

  // 4. Nueva salida
  await ir('salidas'); await page.focus('#btn-nueva-salida'); await tecla('Enter'); await pausa(1000);
  await enterSeQueda('Nueva salida', ['input-direccion-salida', 'input-observaciones-salida']);
  await page.evaluate(() => { const chk = document.querySelector('[role="dialog"] input[type="checkbox"], input[type="checkbox"]'); if (chk && !chk.checked) chk.click(); }); await pausa(400); // material fuera del inventario
  await enterSeQueda('Nueva salida', ['input-desc-material-externo']);
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  try { await page.keyboard.press('Escape'); await pausa(400); await cerrarAviso(); await page.keyboard.press('Escape'); await pausa(400); await cerrarAviso(); await restaurarTipo(tiposAntes); ok('Tipo de negocio restaurado a como estaba', (await tipoActual()) === tiposAntes, tiposAntes); } catch { /* */ }
  await nav.close();
  console.log(res.join('\n'));
}
