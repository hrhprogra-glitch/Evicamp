// Diferencia permanente 24/11/2026: el Modo Oscuro de ecosistema es AZUL (#0EA5E9), no verde.
// Comprueba en vivo que solo ecosistema cambia, que Nego sigue verde, teclado, sin internet
// y 390/768/1366/1920. No escribe en la base. Uso:
//   node ai-scripts/pruebas/verificar-tema-oscuro-ecosistema.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
const USUARIO = process.env.ECOSISTEMA_ADMIN_USUARIO;
const CLAVE = process.env.ECOSISTEMA_ADMIN_CLAVE;
if (!USUARIO || !CLAVE) throw new Error('Faltan credenciales de ecosistema en .env.vps');

const ECO = 'https://ecosistema123.duckdns.org';
const NEGO = 'https://nego.siumax.duckdns.org';
const AZUL = 'rgb(14, 165, 233)';
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(90); } };
const escribir = async (t) => { await page.keyboard.type(t); await pausa(80); };
const irA = async (id) => { await page.focus(`#${id}`); await tecla('Enter'); await pausa(800); };
const variables = () => page.evaluate(() => {
  const e = getComputedStyle(document.documentElement);
  const v = (n) => e.getPropertyValue(n).trim().toLowerCase();
  return {
    clase: document.documentElement.classList.contains('sitio-ecosistema'),
    tema: document.documentElement.getAttribute('data-theme'),
    accent: v('--color-accent'),
    marca: v('--color-brand-accent'),
    exito: v('--color-success'),
    fondoTag: v('--color-accent-bg'),
    fondo: v('--color-bg'),
    caja: v('--color-surface'),
    borde: v('--color-border'),
    texto: v('--color-ink'),
    peligro: v('--color-danger'),
    aviso: v('--color-warning'),
  };
});

try {
  await page.goto(ECO, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  const inicio = await variables();
  ok('ecosistema sigue arrancando en Océano y lleva la marca del sitio',
    inicio.clase && inicio.tema === 'oceano' && inicio.accent === '#0ea5e9', JSON.stringify(inicio));

  await page.focus('#input-login-usuario'); await escribir(USUARIO);
  await tecla('Enter'); await page.focus('#input-login-password'); await escribir(CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 25000 }); await pausa(1200);
  ok('Login real con teclado', true);

  await irA('sidebar-btn-configuracion');
  await irA('btn-tab-apariencia');
  await page.waitForSelector('#btn-tema-monochrome', { timeout: 20000 });

  const muestra = await page.evaluate(() => {
    const b = document.getElementById('btn-tema-monochrome');
    const muestras = [...b.querySelectorAll('[style*="background-color"]')].map((d) => getComputedStyle(d).backgroundColor);
    return muestras;
  });
  ok('La muestra del Modo Oscuro es azul en ecosistema',
    muestra[2] === AZUL && muestra[0] === 'rgb(11, 15, 23)' && muestra[1] === 'rgb(17, 24, 39)',
    JSON.stringify(muestra));

  await page.focus('#btn-tema-monochrome'); await tecla('Enter'); await pausa(700);
  const oscuro = await variables();
  ok('Modo Oscuro de ecosistema: acento, marca y éxito azules',
    oscuro.tema === 'dark' && oscuro.accent === '#0ea5e9' && oscuro.marca === '#0ea5e9'
      && oscuro.exito === '#0ea5e9' && oscuro.fondoTag === '#082f49', JSON.stringify(oscuro));
  ok('El resto de colores del oscuro sigue igual (negro, grafito, gris, rojo, ámbar)',
    oscuro.fondo === '#0b0f17' && oscuro.caja === '#111827' && oscuro.borde === '#334155'
      && oscuro.texto === '#cbd5e1' && oscuro.peligro === '#f87171' && oscuro.aviso === '#fbbf24',
    JSON.stringify(oscuro));

  // Foco real con Tab: el anillo del selector de teclado debe ser azul, no verde.
  await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.focus());
  let focoAzul = false;
  const focos = [];
  for (let i = 0; i < 12; i++) {
    await tecla('Tab');
    const f = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a) return null;
      const s = getComputedStyle(a);
      return { id: a.id || a.tagName, outline: s.outlineColor, sombra: s.boxShadow, borde: s.borderTopColor };
    });
    if (f) focos.push(f);
    if (f && [f.outline, f.sombra, f.borde].some((c) => /14, 165, 233/.test(c))) focoAzul = true;
  }
  ok('Foco con Tab en azul (sin verde en el anillo)', focoAzul, JSON.stringify(focos.slice(0, 4)));

  for (const [w, h] of [[390, 844], [768, 900], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(300);
    const e = await variables();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    ok(`${w}px: azul intacto y sin desbordes`, e.accent === '#0ea5e9' && !desborde, JSON.stringify(e));
  }
  await page.setViewport({ width: 1366, height: 860 }); await pausa(250);

  await page.setOfflineMode(true); await pausa(300);
  await tecla('Tab'); await tecla('Enter'); await pausa(300);
  const sinInternet = await variables();
  ok('Sin internet: el tema azul sigue aplicado', sinInternet.accent === '#0ea5e9' && sinInternet.tema === 'dark');
  await page.setOfflineMode(false);

  // Nego NO debe llevar el cambio: su Modo Oscuro sigue verde.
  await page.goto(NEGO, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.setItem('gestorpro_theme', 'monochrome'));
  await page.reload({ waitUntil: 'networkidle2' }); await pausa(400);
  const nego = await variables();
  ok('Nego NO lleva la marca de ecosistema', !nego.clase);
  ok('Nego sigue con verde esmeralda en el Modo Oscuro', nego.accent === '#10b981' && nego.marca === '#10b981',
    JSON.stringify({ accent: nego.accent, marca: nego.marca }));

  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 250));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  console.log(res.join('\n'));
}
