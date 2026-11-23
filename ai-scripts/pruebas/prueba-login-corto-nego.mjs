// Prueba del login corto en Nego: escribir solo "admin" entra, el correo completo sigue entrando,
// billy/harry ya no existen y la sesión aguanta sin internet. Teclado real, 4 tamaños. No escribe en la base.
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const SITIO = 'https://nego.siumax.duckdns.org';
const CLAVE = process.env.SIUMAX_ADMIN_CLAVE;
if (!CLAVE) throw new Error('Falta SIUMAX_ADMIN_CLAVE en .env.vps');
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

    // 1) Login corto + offline
    {
      const { contexto, page } = await nuevaPagina(ancho);
      const placeholder = await page.$eval('#input-login-usuario', (e) => e.placeholder);
      ok(`[${tag}] Placeholder dice admin`, placeholder === 'admin', placeholder);
      ok(`[${tag}] Entra escribiendo solo admin`, await entrar(page, 'admin'));
      await page.setOfflineMode(true);
      await pausa(1200);
      await page.focus('#sidebar-btn-salidas');
      await page.keyboard.press('Enter');
      await pausa(900);
      ok(`[${tag}] Sesión sigue sin internet`, (await page.$('#btn-nueva-salida')) !== null);
      await contexto.close();
    }

    // 2) Correo completo
    {
      const { contexto, page } = await nuevaPagina(ancho);
      ok(`[${tag}] Entra con el correo completo`, await entrar(page, 'admin@siumax.com'));
      await contexto.close();
    }

    // 3) billy ya no existe
    {
      const { contexto, page } = await nuevaPagina(ancho);
      const entro = await entrar(page, 'billy');
      const texto = await page.evaluate(() => document.body.innerText);
      ok(`[${tag}] billy ya no entra`, !entro && /credenciales|inválidas/i.test(texto));
      await contexto.close();
    }

    // 4) harry ya no existe
    {
      const { contexto, page } = await nuevaPagina(ancho);
      ok(`[${tag}] harry ya no entra`, !(await entrar(page, 'harry')));
      await contexto.close();
    }
  }
} finally {
  await nav.close();
}
console.log(res.join('\n'));
const fallos = res.filter((r) => r.startsWith('❌')).length;
console.log(`\n${res.length - fallos}/${res.length} correctos, ${fallos} fallos`);
process.exitCode = fallos ? 1 : 0;
