// Prueba del 12/11/2026 (SiuMax Nego, paso 3c), con teclado: Clientes con "Talleres y servicios": pestaña Trabajadores,
// ficha con correo / persona de contacto / notas, y "lo que se atiende" en el detalle. Sin Comercio no salen las cosas
// de tienda. Al final borra lo creado y deja el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/prueba-clientes-servicios.mjs <carpeta tools con puppeteer-core>
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
const foco = () => page.evaluate(() => { const a = document.activeElement; if (!a) return ''; if (a.getAttribute('data-bien-cliente')) return 'bien:' + [...document.querySelectorAll('[data-bien-cliente]')].indexOf(a); return a.id || a.tagName; });
const hay = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const cerrarAviso = async () => { await pausa(300); if (await aviso()) { await tecla('Enter'); await pausa(400); } };
const escribir = async (sel, t) => { await page.focus(sel); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(t, { delay: 8 }); };
const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
const elegir = async (tipos) => {
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
  await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
  for (const t of ['servicios', 'comercio']) if (tipos.includes(t) && (await marcado(t)) !== 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  for (const t of ['comercio', 'servicios']) if (!tipos.includes(t) && (await marcado(t)) === 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  await page.focus('#btn-guardar-tipo-negocio'); await tecla('Enter'); await pausa(1500); await cerrarAviso();
};
const abrirClientes = async () => { await page.evaluate(() => document.getElementById('sidebar-btn-clientes')?.click()); await pausa(1800); };
const pestanas = () => page.$$eval('[role="tablist"][aria-label="Clientes"] [role="tab"]', (b) => b.map((x) => x.textContent.trim().toUpperCase()).join(','));
const m = Date.now(); const NOMBRE = `PRUEBA SERVICIOS ${String(m).slice(-6)}`; const TRAB = `TECNICO PRUEBA ${String(m).slice(-6)}`;

try {
  await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  // 0. Solo Comercio: Clientes igual que siempre
  await elegir(['comercio']); await abrirClientes();
  ok('Solo Comercio: pestañas de siempre (sin Trabajadores)', (await pestanas()) === 'CLIENTES,CRÉDITOS,COTIZACIONES,PEDIDOS', await pestanas());

  // 1. Comercio + Servicios
  await elegir(['comercio', 'servicios']); await abrirClientes();
  ok('Con Servicios: aparece la pestaña Trabajadores', (await pestanas()) === 'CLIENTES,CRÉDITOS,COTIZACIONES,PEDIDOS,TRABAJADORES', await pestanas());
  // Trabajadores
  await page.focus('#tab-clientes-trabajadores'); await tecla('Enter'); await pausa(1200);
  ok('Enter en Trabajadores abre la pestaña con el selector en su buscador', (await foco()) === 'buscador-trabajadores', await foco());
  await page.focus('#tab-clientes-trabajadores'); await tecla('ArrowRight');
  ok('→ desde la última pestaña llega a "Nuevo trabajador"', (await foco()) === 'btn-nuevo-trabajador', await foco());
  await tecla('Enter'); await pausa(800);
  ok('Enter abre la ventana del trabajador', await hay('#modal-trabajador'));
  await escribir('#trab-nombre', TRAB); await escribir('#trab-cargo', 'TECNICO');
  await page.focus('#btn-guardar-trabajador'); await tecla('Enter'); await pausa(1500); await cerrarAviso();
  ok('El trabajador nuevo sale en la lista', (await page.evaluate((t) => document.body.innerText.toUpperCase().includes(t), TRAB)), TRAB);

  // Ficha con correo, contacto y notas
  await page.focus('#tab-clientes-clientes'); await tecla('Enter'); await pausa(800);
  await page.focus('#btn-nuevo-cliente'); await tecla('Enter'); await pausa(800);
  ok('Ficha con Comercio + Servicios: correo, contacto, notas Y días de plazo / mayorista', (await hay('#ficha-correo')) && (await hay('#ficha-contacto')) && (await hay('#ficha-notas')) && (await hay('#ficha-dias-plazo')) && (await hay('#ficha-es-mayorista')));
  await escribir('#ficha-nombre', NOMBRE);
  await page.focus('#ficha-referencia'); await tecla('ArrowDown');
  ok('↓ desde Referencia baja a Correo', (await foco()) === 'ficha-correo', await foco());
  await page.keyboard.type('prueba@gmail.com'); await tecla('ArrowRight');
  ok('→ desde Correo va a Persona de contacto', (await foco()) === 'ficha-contacto', await foco());
  await page.keyboard.type('SR. JUAN'); await tecla('ArrowDown'); await page.keyboard.type('TIENE PERRO');
  await page.focus('#btn-guardar-ficha'); await tecla('Enter'); await pausa(1500); await cerrarAviso();
  const fila = await sql(`select correo, persona_contacto, notas from customers where name = '${NOMBRE}'`);
  ok('Se guardan correo, persona de contacto y notas', fila === 'prueba@gmail.com|SR. JUAN|TIENE PERRO', fila);

  // Detalle: lo que se atiende
  await escribir('#buscador-clientes', NOMBRE); await pausa(600);
  await page.focus('[data-fila-cliente="true"]'); await tecla('Enter'); await pausa(1200);
  ok('Detalle: muestra correo, contacto y notas', /prueba@gmail\.com/.test(await page.$eval('#datos-detalle-cliente', (e) => e.innerText)) && (await hay('#notas-detalle-cliente')));
  await tecla('ArrowDown'); ok('↓ desde Editar baja a Pendientes (con Comercio)', (await foco()) === 'btn-historial-cliente-pendientes', await foco());
  await tecla('ArrowDown'); ok('↓ desde el historial baja a "Agregar" (lo que se atiende)', (await foco()) === 'btn-nuevo-bien', await foco());
  await tecla('Enter'); await pausa(800);
  ok('Enter abre la ventana de lo que se atiende', await hay('#modal-bien-cliente'));
  await escribir('#bien-nombre', 'PISCINA CASA DE PLAYA');
  await page.focus('#btn-guardar-bien'); await tecla('Enter'); await pausa(1500); await cerrarAviso();
  ok('Lo nuevo sale en el detalle', (await page.$$eval('[data-bien-cliente]', (x) => x.length)) === 1);
  await page.focus('#btn-nuevo-bien'); await tecla('ArrowDown');
  ok('↓ desde Agregar baja a la piscina', (await foco()) === 'bien:0', await foco());
  await tecla('Enter'); await pausa(800);
  ok('Enter en la piscina la abre para editar', await hay('#modal-bien-cliente'));
  await tecla('Escape'); await pausa(500);
  await tecla('Escape'); await pausa(600);

  // 2. Solo Servicios: sin cosas de tienda
  await elegir(['servicios']); await abrirClientes();
  ok('Solo Servicios: pestañas Clientes y Trabajadores', (await pestanas()) === 'CLIENTES,TRABAJADORES', await pestanas());
  await escribir('#buscador-clientes', NOMBRE); await pausa(600);
  await page.focus('[data-fila-cliente="true"]'); await tecla('Enter'); await pausa(1200);
  ok('Detalle sin Estado de cuenta ni historial de tienda', !(await hay('#btn-detalle-cliente-cuenta')) && !(await hay('#btn-historial-cliente-pendientes')) && !(await hay('#resumen-detalle-cliente')));
  await tecla('ArrowDown'); ok('↓ desde Editar baja directo a "Agregar"', (await foco()) === 'btn-nuevo-bien', await foco());
  await page.focus('#btn-detalle-cliente-editar'); await tecla('Enter'); await pausa(800);
  ok('Ficha sin días de plazo, descuento ni mayorista', !(await hay('#ficha-dias-plazo')) && !(await hay('#ficha-descuento')) && !(await hay('#ficha-es-mayorista')) && (await hay('#ficha-correo')));
  await page.focus('#btn-guardar-ficha'); await tecla('ArrowUp');
  ok('↑ desde Guardar sube a Notas (último campo)', (await foco()) === 'ficha-notas', await foco());
  await page.screenshot({ path: path.join(aqui, 'captura-ficha-servicios.png') });
  await tecla('Escape'); await pausa(500);
  await page.screenshot({ path: path.join(aqui, 'captura-detalle-servicios.png') });
  await tecla('Escape'); await pausa(500);
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  try { await elegir(['comercio']); } catch { /* */ }
  await nav.close();
  await sql(`delete from bienes_cliente where customer_id in (select id from customers where name = '${NOMBRE}'); delete from customers where name = '${NOMBRE}'; delete from trabajadores where nombre = '${TRAB}';`);
  console.log(res.join('\n'));
}
