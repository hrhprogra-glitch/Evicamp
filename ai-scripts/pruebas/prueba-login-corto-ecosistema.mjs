// Prueba de la Fase B en el sitio oficial: login corto, un solo admin, logo y sin cobro.
// Teclado real y sin internet en 390 / 768 / 1366 / 1920. No escribe en la base.
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const SITIO = 'https://ecosistema123.duckdns.org';
const USUARIO = process.env.ECOSISTEMA_ADMIN_USUARIO;
const CLAVE = process.env.ECOSISTEMA_ADMIN_CLAVE;
if (!USUARIO || !CLAVE) throw new Error('Faltan credenciales del sitio oficial en .env.vps');
const CORREO_COMPLETO = USUARIO;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 },
});

async function nuevaPagina(ancho) {
  const contexto = await nav.createBrowserContext();
  const page = await contexto.newPage();
  await page.setViewport({ width: ancho, height: 900 });
  await page.goto(SITIO, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  return { contexto, page };
}

async function entrar(page, usuario) {
  await page.focus('#input-login-usuario');
  await page.keyboard.type(usuario);
  await page.keyboard.press('Enter');
  await page.focus('#input-login-password');
  await page.keyboard.type(CLAVE);
  await page.keyboard.press('Enter');
  try {
    await page.waitForSelector('#sidebar-btn-inventario', { timeout: 25000 });
    return true;
  } catch { return false; }
}

try {
  for (const ancho of [390, 768, 1366, 1920]) {
    const tag = `${ancho}px`;
    const { contexto, page } = await nuevaPagina(ancho);

    const placeholder = await page.$eval('#input-login-usuario', (e) => e.placeholder);
    ok(`[${tag}] Placeholder dice admin`, placeholder === 'admin', placeholder);
    ok(`[${tag}] Título sigue siendo ECO SISTEMAS URH`, await page.evaluate(() => document.title === 'ECO SISTEMAS URH'));
    ok(`[${tag}] Tema Océano por defecto`, await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'oceano'));
    const logo = await page.evaluate(() => {
      const i = document.querySelector('img[alt="Logo Empresa"]');
      return !!i && i.complete && i.naturalWidth > 0 && i.src.startsWith('data:image/png;base64,');
    });
    ok(`[${tag}] Logo del cliente sigue visible`, logo);
    const sus = await page.evaluate(async () => (await fetch('/suscripcion.json', { cache: 'no-store' })).status);
    ok(`[${tag}] Sin aviso de plan (404)`, sus === 404, `HTTP ${sus}`);

    ok(`[${tag}] Entra escribiendo solo admin`, await entrar(page, 'admin'));
    await page.setOfflineMode(true);
    await pausa(1200);
    await page.focus('#sidebar-btn-salidas');
    await page.keyboard.press('Enter');
    await pausa(900);
    ok(`[${tag}] Sesión sigue sin internet`, (await page.$('#btn-nueva-salida')) !== null);
    await contexto.close();

    for (const [nombre, usuario] of [['correo completo', CORREO_COMPLETO], ['billy', 'billy'], ['harry', 'harry']]) {
      const c = await nuevaPagina(ancho);
      const entro = await entrar(c.page, usuario);
      if (nombre === 'correo completo') ok(`[${tag}] Entra con ${nombre}`, entro);
      else {
        const texto = await c.page.evaluate(() => document.body.innerText);
        ok(`[${tag}] ${nombre} ya no entra`, !entro && /credenciales|inválidas/i.test(texto));
      }
      await c.contexto.close();
    }
  }
} finally {
  await nav.close();
}
console.log(res.join('\n'));
const fallos = res.filter((r) => r.startsWith('❌')).length;
console.log(`\n${res.length - fallos}/${res.length} correctos, ${fallos} fallos`);
process.exitCode = fallos ? 1 : 0;
