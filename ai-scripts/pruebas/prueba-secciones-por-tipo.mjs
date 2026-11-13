// Prueba del 12/11/2026 (SiuMax Nego, paso 3b), con teclado: el menú, los atajos Alt y los permisos de Usuarios
// cambian según Ajustes → Tipo de negocio. Al final deja el negocio como estaba (solo Comercio).
// Uso: node ai-scripts/pruebas/prueba-secciones-por-tipo.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(200); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const menu = () => page.$$eval('#evicamp-sidebar [id^="sidebar-btn-"]', (b) => b.map((x) => x.id.replace('sidebar-btn-', '')).join(','));
const titulo = (id) => page.$eval(`#sidebar-btn-${id}`, (b) => b.title).catch(() => '(no está)');
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const cerrarAviso = async () => { await pausa(300); if (await aviso()) { await tecla('Enter'); await pausa(400); } };
const alt = async (d) => { await page.keyboard.down('Alt'); await page.keyboard.press(d); await page.keyboard.up('Alt'); await pausa(1500); };
const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
const abrirTipo = async () => {
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
  await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
};
// Deja marcados exactamente esos tipos y guarda
const elegir = async (tipos) => {
  await abrirTipo();
  for (const t of ['servicios', 'comercio']) { // primero marcar los nuevos (nunca queda vacío)
    if (tipos.includes(t) && (await marcado(t)) !== 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  }
  for (const t of ['comercio', 'servicios']) {
    if (!tipos.includes(t) && (await marcado(t)) === 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
  }
  await page.focus('#btn-guardar-tipo-negocio'); await tecla('Enter'); await pausa(1500); await cerrarAviso();
};
const COMERCIO = 'pos,clientes,inventario,conteos,finanzas,utilidades,configuracion';

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);
  await elegir(['comercio']); // por si una prueba anterior lo dejó distinto

  // 1. Solo Comercio: el menú y los atajos de siempre
  ok('Solo Comercio: el menú es el de siempre (sin Servicios)', (await menu()) === COMERCIO, await menu());
  ok('Solo Comercio: Ajustes sigue con Alt + 7', (await titulo('configuracion')) === 'Ajustes (Alt + 7)', await titulo('configuracion'));
  await alt('Digit1'); ok('Alt + 1 abre Caja', !!(await page.$('#buscador-global-pos')));

  // 2. "Talleres y servicios" ya se puede elegir
  await abrirTipo();
  const txt = await page.$eval('#tipo-negocio-servicios', (b) => b.innerText.toUpperCase());
  ok('"Talleres y servicios" sale Disponible', /DISPONIBLE/.test(txt) && !/PRÓXIMAMENTE/.test(txt), txt.slice(0, 80));

  // 3. Comercio + Servicios
  await elegir(['comercio', 'servicios']);
  ok('Comercio + Servicios: aparecen Agenda, Salidas, Contratos, Taller y Cotizaciones al instante',
    (await menu()) === 'pos,clientes,agenda,salidas,contratos,taller,cotizaciones,inventario,conteos,finanzas,utilidades,configuracion', await menu());
  ok('Atajos en el orden del menú: Agenda con Alt + 3, Finanzas con Alt + 0', (await titulo('agenda')) === 'Agenda (Alt + 3)' && (await titulo('finanzas')) === 'Finanzas (Alt + 0)', `${await titulo('agenda')} · ${await titulo('finanzas')}`);
  await alt('Digit4');
  ok('Alt + 4 abre Salidas ("Pronto", con el selector en el aviso)', (await foco()) === 'pronto-salidas', await foco());
  await page.click('#sidebar-btn-taller'); await pausa(1200);
  ok('Clic en Taller abre su aviso "Pronto"', !!(await page.$('#pronto-taller')));

  // 4. Usuarios: permisos y roles de servicios
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1200);
  await page.focus('#btn-tab-usuarios'); await tecla('Enter'); await pausa(1200);
  await page.focus('#btn-nuevo-usuario-ajustes'); await tecla('Enter'); await pausa(1200);
  const roles = await page.$$eval('#select-rol-usuario-modal option', (o) => o.map((x) => x.textContent).join(','));
  ok('Usuarios: roles "Encargado de servicios" y "Técnico"', /Encargado de servicios/.test(roles) && /Técnico/.test(roles), roles);
  ok('Usuarios: permisos de Agenda, Salidas, Taller…', !!(await page.$('#permiso-agenda_ver')) && !!(await page.$('#permiso-salidas_crear')) && !!(await page.$('#permiso-taller_editar')));
  await tecla('Escape'); await pausa(600);

  // 5. Solo Servicios: sin Caja ni Finanzas
  await elegir(['servicios']);
  ok('Solo Servicios: sin Caja ni Finanzas', (await menu()) === 'clientes,agenda,salidas,contratos,taller,cotizaciones,inventario,conteos,utilidades,configuracion', await menu());
  await alt('Digit1'); ok('Alt + 1 abre Clientes', !!(await page.$('#buscador-clientes')), await foco());
  await page.reload({ waitUntil: 'networkidle2' }); await pausa(3000);
  ok('Después de recargar: sigue sin Caja y abre en otra sección (no en Caja)', !(await page.$('#sidebar-btn-pos')) && !(await page.$('#buscador-global-pos')), await menu());

  // 6. Volver a solo Comercio (como estaba)
  await elegir(['comercio']);
  ok('De vuelta a solo Comercio: menú de siempre', (await menu()) === COMERCIO, await menu());
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1200);
  await page.focus('#btn-tab-usuarios'); await tecla('Enter'); await pausa(1000);
  await page.focus('#btn-nuevo-usuario-ajustes'); await tecla('Enter'); await pausa(1000);
  ok('Solo Comercio: Usuarios sin permisos de servicios', !(await page.$('#permiso-agenda_ver')));
  await tecla('Escape'); await pausa(500);
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
  console.log(res.join('\n'));
  await nav.close();
}
