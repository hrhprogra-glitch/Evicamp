// Prueba: ¿la PÁGINA WEB (pestaña normal, sin instalar) funciona sin internet? Solo siumax.
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, envVps, salida] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core'); process.loadEnvFile(envVps);
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1280, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k) => { await page.keyboard.press(k); await pausa(250); };
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 });
  await pausa(12000); // deja que guarde la copia del sistema y de los datos
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
  ok('Con internet: el navegador guardó la copia del sistema (service worker)', sw);

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await pausa(5000);
  const abre = await page.evaluate(() => !!document.getElementById('sidebar-btn-pos'));
  ok('SIN internet: al recargar la página, el sistema abre (no sale "sin conexión")', abre, await page.evaluate(() => document.title + ' | ' + document.body.innerText.slice(0, 80).replace(/\s+/g, ' ')));
  const aviso = await page.evaluate(() => /sin internet|sin conexi/i.test(document.body.innerText));
  ok('Muestra el aviso de que está sin internet', aviso);
  await page.evaluate(() => document.getElementById('sidebar-btn-pos')?.click()); await pausa(2500);
  await page.screenshot({ path: path.join(salida, 'web-sin-internet.png') });
  await page.focus('#buscador-global-pos').catch(() => {});
  await page.keyboard.type('AUTOTEST', { delay: 40 }); await pausa(1200);
  const productos = await page.evaluate(() => document.querySelectorAll('#productos-grid-pos button').length);
  ok('SIN internet: Caja busca productos (copia local)', productos > 0, `${productos} producto(s)`);
} catch (e) { ok('Sin fallas', false, e.message); }
finally { await nav.close(); console.log(res.join('\n')); console.log(errores.length ? 'errores JS: ' + errores.join(' | ').slice(0, 300) : 'sin errores JS'); }
