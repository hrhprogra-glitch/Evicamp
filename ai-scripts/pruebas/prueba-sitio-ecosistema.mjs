// Prueba del sitio oficial de ECO SISTEMAS URH: logo, sin cobro, teclado y sin internet
// en 390 / 768 / 1366 / 1920. No escribe en la base.
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const SITIO = 'https://ecosistema123.duckdns.org';
const USUARIO = process.env.ECOSISTEMA_ADMIN_USUARIO;
const CLAVE = process.env.ECOSISTEMA_ADMIN_CLAVE;
if (!USUARIO || !CLAVE) throw new Error('Faltan las credenciales del sitio oficial en .env.vps');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const existe = async (sel) => (await page.$(sel)) !== null;

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 }
});
const page = await nav.newPage();
const irA = async (id) => { await page.focus(`#${id}`); await page.keyboard.press('Enter'); await pausa(700); };

const logoInfo = () => page.evaluate(() => {
  const i = document.querySelector('img[alt="Logo Empresa"]');
  return i ? { cargado: i.complete && i.naturalWidth > 0, ancho: i.naturalWidth, esBase64: i.src.startsWith('data:image/png;base64,') } : null;
});

try {
  await page.goto(SITIO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });

  // --- Logo y ausencia de cobro en el login ---
  const lLogin = await logoInfo();
  ok('Login: logo de la empresa visible', !!lLogin && lLogin.cargado, lLogin ? `ancho ${lLogin.ancho}px` : 'sin logo');
  ok('Login: logo viene de la base (base64)', !!lLogin && lLogin.esBase64);
  const textoLogin = await page.evaluate(() => document.body.innerText);
  ok('Login: nombre ECO SISTEMAS URH', /ECO SISTEMAS URH/i.test(textoLogin));
  ok('Login: sin aviso de plan', !/vence|venció|plan de SiuMax/i.test(textoLogin));
  ok('Login: sin botón Pagar plan', !/Pagar plan/i.test(textoLogin));
  const cantSus = await page.evaluate(async () => {
    try { const r = await fetch('/suscripcion.json', { cache: 'no-store' }); return r.status; } catch { return -1; }
  });
  ok('suscripcion.json no existe (404)', cantSus === 404, `HTTP ${cantSus}`);

  // --- Login solo con teclado ---
  await page.focus('#input-login-usuario');
  await page.keyboard.type(USUARIO);
  await page.focus('#input-login-password');
  await page.keyboard.type(CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 25000 });
  await pausa(1000);
  ok('Login con teclado correcto', await existe('#sidebar-btn-inventario'));

  const lMenu = await logoInfo();
  ok('Menú: logo de la empresa visible', !!lMenu && lMenu.cargado, lMenu ? `ancho ${lMenu.ancho}px` : 'sin logo');
  const textoMenu = await page.evaluate(() => document.body.innerText);
  ok('Menú: sin aviso de plan', !/vence|venció|plan de SiuMax|Pagar plan/i.test(textoMenu));

  // Dejar datos en caché para la prueba sin internet
  await irA('sidebar-btn-inventario');
  await irA('sidebar-btn-salidas');
  await irA('sidebar-btn-inventario');

  // --- Sin internet en los cuatro tamaños ---
  await page.setOfflineMode(true);
  await pausa(1200);

  const tam = [
    { w: 390, h: 844, nombre: 'celular' },
    { w: 768, h: 1024, nombre: 'tablet' },
    { w: 1366, h: 768, nombre: 'laptop' },
    { w: 1920, h: 1080, nombre: 'PC' },
  ];
  for (const t of tam) {
    await page.setViewport({ width: t.w, height: t.h });
    await pausa(500);

    await irA('sidebar-btn-salidas');
    const abre = await existe('#btn-nueva-salida');
    ok(`${t.nombre} sin internet: Salidas abre con Enter`, abre);
    if (abre) {
      await page.focus('#btn-nueva-salida');
      await page.keyboard.press('Enter');
      await pausa(700);
      ok(`${t.nombre} sin internet: modal Nueva salida abre`, await existe('#modal-nueva-salida-container'));
      ok(`${t.nombre} sin internet: buscador de cliente presente`, await existe('#buscar-cliente-salida'));
      await page.keyboard.press('Escape');
      await pausa(400);
    }

    await irA('sidebar-btn-inventario');
    const lOff = await logoInfo();
    ok(`${t.nombre} sin internet: logo visible`, !!lOff && lOff.cargado, lOff ? `ancho ${lOff.ancho}px` : 'sin logo');
    const sinPlan = await page.evaluate(() => {
      const aviso = document.querySelector('[role="alert"]');
      const boton = document.querySelector('button[aria-label*="Pagar plan"], button[title*="Pagar plan"]');
      const avisoDePlan = aviso && /plan de SiuMax/i.test(aviso.textContent || '');
      return !avisoDePlan && !boton;
    });
    ok(`${t.nombre} sin internet: sin aviso de plan`, sinPlan);
  }

  await page.setOfflineMode(false).catch(() => {});
} catch (e) {
  ok('Prueba completada sin errores', false, e.message);
} finally {
  await nav.close();
}

console.log(res.join('\n'));
const fallos = res.filter((r) => r.startsWith('❌')).length;
console.log(`\nTotal: ${res.length} comprobaciones, ${fallos} fallos.`);
process.exit(fallos ? 1 : 0);
