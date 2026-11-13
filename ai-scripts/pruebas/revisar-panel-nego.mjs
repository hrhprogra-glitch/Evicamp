// Revisión del 12/11/2026 (SiuMax Nego, fase 4): el Panel de Control (siumax.duckdns.org) muestra "SiuMax Nego" en
// Mis sitios y, en "Nuevo cliente", las casillas de tipo de negocio y el link <negocio>.nego.siumax.duckdns.org.
// NO crea ningún cliente: abre la ventana, la revisa y la cierra. También abre nego.siumax y entra al sistema.
// Uso: node ai-scripts/pruebas/revisar-panel-nego.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
try {
  // Panel
  await page.goto('https://siumax.duckdns.org/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#clave', { visible: true, timeout: 15000 });
  await page.type('#clave', process.env.PANEL_CLAVE); await page.keyboard.press('Enter'); await pausa(3000);
  const sitios = await page.evaluate(() => document.body.innerText);
  ok('Mis sitios: SiuMax Nego (nego.siumax.duckdns.org)', /SiuMax Nego/i.test(sitios) && sitios.includes('nego.siumax.duckdns.org'));
  // comerc.siumax y servic.siumax se borraron (dueño, 13/11/2026)
  ok('Mis sitios: ya no están comerc.siumax ni servic.siumax', !sitios.includes('comerc.siumax') && !sitios.includes('servic.siumax'));
  await page.click('#btn-nuevo'); await pausa(800);
  const m = await page.evaluate(() => {
    const f = document.querySelector('input[name="tipo_comercio"]')?.form; // el formulario de la ventana (no el de entrar)
    return {
      comercio: f?.tipo_comercio?.checked, servicios: f?.tipo_servicios?.checked === false,
      sinSelectViejo: !document.getElementById('nuevo-tipo-sistema'),
      link: document.getElementById('vista-link')?.innerText,
    };
  });
  ok('Nuevo cliente: casillas Comercio (marcada) y Talleres y servicios, sin el selector Comerc/Servic', m.comercio && m.servicios && m.sinSelectViejo, JSON.stringify(m));
  await page.type('input[name="nombre"]', 'Bodega Prueba'); await pausa(300);
  const link = await page.evaluate(() => document.getElementById('vista-link')?.innerText);
  ok('El link que se muestra es <negocio>.nego.siumax.duckdns.org', link === 'Quedará en: https://bodegaprueba.nego.siumax.duckdns.org', link);
  await page.screenshot({ path: path.join(aqui, 'captura-panel-nego.png') });
  // Cerrar sin crear nada
  await page.evaluate(() => document.querySelector('[data-cerrar2]')?.click()); await pausa(500);
  ok('La ventana se cierra sin crear nada', !(await page.evaluate(() => !!document.querySelector('input[name="nombre"]'))));

  // Pruebas de Nego
  const p2 = await nav.newPage(); p2.on('pageerror', (e) => errores.push('nego: ' + e.message));
  await p2.goto('https://nego.siumax.duckdns.org/', { waitUntil: 'networkidle2' });
  await p2.waitForSelector('#input-login-usuario'); await p2.focus('#input-login-usuario'); await p2.keyboard.type('admin@siumax.com');
  await p2.focus('#input-login-password'); await p2.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await p2.keyboard.press('Enter');
  await p2.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2000);
  ok('nego.siumax: se entra al sistema y el título dice SiuMax Nego', (await p2.title()).includes('SiuMax Nego'), await p2.title());
} catch (e) {
  ok('Sin fallas en la revisión', false, e.message);
} finally {
  ok('Sin errores en las páginas', errores.length === 0, errores.join(' | '));
  await nav.close();
  console.log(res.join('\n'));
}
