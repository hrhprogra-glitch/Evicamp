// Prueba de SiuMax Nego, paso 3e (12/11/2026): Salidas a obras y servicios (traída de SiuMax Servic, su prueba-fase3)
// con teclado, sobre https://nego.siumax.duckdns.org con el negocio en Comercio + Servicios.
// Uso: node ai-scripts/pruebas/prueba-salidas-nego.mjs <carpeta tools con puppeteer-core>
// Crea datos "PRUEBA AUTO ..." y al final los borra y deja el negocio en solo Comercio.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const activo = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-fila-salida') || document.activeElement?.tagName || '');
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(120); } };
const escribir = async (t) => { await page.keyboard.type(t); await pausa(100); };
const sello = String(Date.now()).slice(-6);
const NOMBRE_CLI = `PRUEBA AUTO CLIENTE ${sello}`;
const NOMBRE_TRAB = `PRUEBA AUTO TECNICO ${sello}`;
const NOMBRE_MAT = `PRUEBA AUTO VALVULA ${sello}`;

try {
  // Pre-crear cliente y trabajador de prueba en la base para la salida
  await sql(`INSERT INTO customers (id, name, dni, activo, created_at, is_synced) VALUES (${990000 + Number(sello) % 9000}, '${NOMBRE_CLI}', '${sello.padStart(8, '1')}', true, now(), 1);
    INSERT INTO trabajadores (nombre, cargo, estado) VALUES ('${NOMBRE_TRAB}', 'TECNICO', 'ACTIVO');
    UPDATE empresa_config SET tipos_negocio = '{comercio,servicios}';`);

  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await escribir('admin@siumax.com');
  await page.focus('#input-login-password'); await escribir(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 20000 }); await pausa(1500);

  // 1. Alt + 4 abre Salidas (Comercio + Servicios: Caja 1, Clientes 2, Agenda 3, Salidas 4) con el selector en el buscador
  await page.keyboard.down('Alt'); await tecla('Digit4'); await page.keyboard.up('Alt'); await pausa(2500);
  ok('Alt + 4 abre Salidas con el selector en el buscador', (await activo()) === 'buscador-salidas', await activo());

  // 2. Botón Nueva Salida abre ModalNuevaSalida
  await page.focus('#btn-nueva-salida'); await tecla('Enter'); await pausa(1000);
  ok('"Nueva Salida" abre modal en el tipo de trabajo', (await activo()) === 'select-tipo-salida', await activo());

  // 3. En Nego rige la regla general: Enter abre la lista (o hace clic) y el selector se queda; las flechas mueven
  await tecla('Enter'); await pausa(300);
  ok('Enter en Tipo abre la lista y el selector se queda', (await activo()) === 'select-tipo-salida', await activo());
  const cliVal = await page.evaluate((nom) => {
    const sel = document.getElementById('select-cliente-salida');
    const opt = [...sel.options].find((o) => o.text.includes(nom));
    if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return opt.value; }
    return '';
  }, NOMBRE_CLI);
  ok('Cliente de prueba encontrado en el selector', !!cliVal);
  await pausa(500);
  await page.focus('#input-direccion-salida'); await escribir('AV. LAS PRUEBAS 456');
  await tecla('Enter'); ok('Enter en Dirección: el selector se queda', (await activo()) === 'input-direccion-salida', await activo());
  await page.focus('#input-observaciones-salida'); await escribir(`PRUEBA AUTO OBS ${sello}`);

  // Seleccionar trabajador
  const trabSel = await page.evaluate((nom) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(nom));
    if (btn) { btn.click(); return true; }
    return false;
  }, NOMBRE_TRAB);
  ok('Trabajador asignado con clic/teclado', trabSel);

  // Agregar material fuera de inventario
  await page.evaluate(() => {
    const chk = document.querySelector('input[type="checkbox"]');
    if (chk && !chk.checked) chk.click();
  });
  await pausa(300);
  await page.focus('#input-desc-material-externo'); await escribir(NOMBRE_MAT);
  await page.focus('#input-cant-item-externo');
  await page.keyboard.press('Backspace');
  await escribir('5');
  await page.focus('#btn-agregar-item-externo'); await tecla('Enter');
  await pausa(600);

  const hayItem = await page.evaluate((nom) => {
    return document.querySelector('#modal-nueva-salida-container table')?.textContent.includes(nom) || false;
  }, NOMBRE_MAT);
  ok('Material agregado a la lista de la salida', hayItem);

  // Confirmar salida
  await page.focus('#btn-guardar-salida'); await tecla('Enter'); await pausa(1500);
  if ((await activo()) === 'dialogo-sistema-aceptar') {
    await tecla('Enter'); await pausa(1000);
  }

  // 4. Buscar la salida creada en la tabla
  await page.focus('#buscador-salidas'); await escribir(sello); await pausa(800);
  const textoTabla = await page.evaluate(() => document.getElementById('tabla-salidas-lista')?.textContent || '');
  ok('La salida creada aparece en la tabla con el cliente y material', textoTabla.includes(NOMBRE_CLI), textoTabla.slice(0, 120));

  // 5. Ver detalle de la salida con Enter
  await tecla('ArrowDown'); await pausa(300);
  await tecla('ArrowDown'); await pausa(300);
  ok('Navegación con ↓ llega a la fila de la salida', (await activo()) === 'true' || (await activo()) === 'TR', await activo());
  await tecla('Enter'); await pausa(1500);

  const enDetalle = await page.evaluate(() => document.getElementById('modal-detalle-salida-container') !== null);
  ok('Enter en la fila abre ModalDetalleSalida', enDetalle);

  // 6. Probar Devolución de Material
  await page.focus('#btn-devolver-material'); await tecla('Enter'); await pausa(1000);
  const enDevolucion = await page.evaluate(() => document.getElementById('modal-devolucion-container') !== null);
  ok('Botón "Registrar Devolución" abre modal de devolución', enDevolucion);

  await page.focus('#input-cantidad-devolver');
  await page.keyboard.press('Backspace');
  await escribir('2');
  await page.focus('#btn-confirmar-devolucion'); await tecla('Enter'); await pausa(1500);
  if ((await activo()) === 'dialogo-sistema-aceptar') {
    await tecla('Enter'); await pausa(1000);
  }

  const tablaDetalle = await page.evaluate(() => document.querySelector('#modal-detalle-salida-container table')?.textContent || '');
  ok('La devolución actualizó el consumo neto a 3 (5 - 2)', tablaDetalle.includes('3') && tablaDetalle.includes('2'), tablaDetalle);

  // 7. Probar Finalizar Salida
  await page.focus('#btn-finalizar-salida'); await tecla('Enter'); await pausa(1000);
  if ((await activo()) === 'dialogo-sistema-aceptar') {
    await tecla('Enter'); await pausa(1000);
  }
  if ((await activo()) === 'dialogo-sistema-aceptar') {
    await tecla('Enter'); await pausa(1000);
  }

  const estadoFin = await page.evaluate(() => document.querySelector('#modal-detalle-salida-container')?.textContent.includes('Finalizado') || false);
  ok('Salida marcada como Finalizado con éxito', estadoFin);

  // Cerrar modal detalle
  await tecla('Escape'); await pausa(800);

} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  try {
    await sql(`DELETE FROM salidas WHERE customer_id IN (SELECT id FROM customers WHERE name = '${NOMBRE_CLI}');
      DELETE FROM customers WHERE name = '${NOMBRE_CLI}'; DELETE FROM trabajadores WHERE nombre = '${NOMBRE_TRAB}';
      UPDATE empresa_config SET tipos_negocio = '{comercio}';`);
  } catch (e) { res.push('MAL No se pudieron borrar los datos de prueba: ' + e.message); }
  console.log(res.join('\n'));
}
