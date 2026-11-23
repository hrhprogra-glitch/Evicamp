// Prueba de los usuarios nuevos en ecosistema: billy y john entran con admin123,
// por correo completo y escribiendo solo el nombre, con teclado real y sin internet
// en 390 / 768 / 1366 / 1920. También revisa logo, tema y ausencia de aviso de plan.
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }

const SITIO = 'https://ecosistema123.duckdns.org';
const CLAVE = 'admin' + '123';
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

async function textoMenu(page) {
  await pausa(3500);
  return page.evaluate(() => document.body.innerText.slice(0, 4000));
}

try {
  for (const ancho of [390, 768, 1366, 1920]) {
    const tag = `${ancho}px`;

    for (const usuario of ['billy@ecosistema.com', 'john@ecosistema.com']) {
      const nombre = usuario.split('@')[0];
      const { contexto, page } = await nuevaPagina(ancho);

      const logo = await page.evaluate(() => {
        const i = document.querySelector('img[alt="Logo Empresa"]');
        return !!i && i.complete && i.naturalWidth > 0 && i.src.startsWith('data:image/png;base64,');
      });
      ok(`[${tag}] Logo del cliente visible (${nombre})`, logo);
      const sus = await page.evaluate(async () => (await fetch('/suscripcion.json', { cache: 'no-store' })).status);
      ok(`[${tag}] Sin aviso de plan (${nombre})`, sus === 404, `HTTP ${sus}`);

      ok(`[${tag}] ${nombre} entra con el correo completo`, await entrar(page, usuario));
      const texto = await textoMenu(page);
      ok(`[${tag}] ${nombre} ve los datos cargados`, /CLIENTES/i.test(texto) && /PÁGINA 1 DE/i.test(texto));

      // Dejar datos en caché y comprobar que la sesión sigue sin internet.
      await page.focus('#sidebar-btn-inventario');
      await page.keyboard.press('Enter');
      await pausa(900);
      await page.focus('#sidebar-btn-salidas');
      await page.keyboard.press('Enter');
      await pausa(900);
      await page.setOfflineMode(true);
      await pausa(1200);
      await page.focus('#sidebar-btn-salidas');
      await page.keyboard.press('Enter');
      await pausa(900);
      ok(`[${tag}] ${nombre} sigue trabajando sin internet`, (await page.$('#btn-nueva-salida')) !== null);
      await contexto.close();

      // El login corto también debe completar el dominio del sitio.
      const c = await nuevaPagina(ancho);
      ok(`[${tag}] ${nombre} entra escribiendo solo ${nombre}`, await entrar(c.page, nombre));
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
