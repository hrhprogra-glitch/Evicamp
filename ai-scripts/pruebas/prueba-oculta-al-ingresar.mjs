// Prueba: al ingresar un lote nuevo, el lote agotado (antes el último) se oculta solo de la pestaña Lotes. Solo siumax.
import { createRequire } from 'node:module';
import path from 'node:path';
const [tools, envVps] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
process.loadEnvFile(envVps);
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1400, height: 950 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k) => { await page.keyboard.press(k); await pausa(200); };
const visible = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-row="true"][role="button"]')).some((f) => f.textContent.includes('PRUEBA-AGOTADO-ULTIMO')));
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(1500);
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-tab-lotes'); await pausa(1500);
  await page.focus('#btn-tab-lotes'); await tecla('Enter'); await pausa(2500);
  ok('Antes: el lote agotado de Azúcar se ve (es el último)', await visible());
  await page.focus('#btn-ingresar-lote'); await tecla('Enter'); await page.waitForSelector('#input-buscar-producto-lote'); await pausa(400);
  await page.keyboard.type('AZUCAR RUBIA', { delay: 30 }); await pausa(300); await tecla('Enter');
  await page.keyboard.type('2', { delay: 30 }); await tecla('Enter'); await page.keyboard.type('7', { delay: 30 });
  await page.focus('#input-vencimiento-lote'); await tecla('ArrowDown'); await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-texto', { timeout: 15000 }); await tecla('Enter'); await pausa(1500);
  ok('Después de ingresar un lote nuevo, el agotado se oculta solo (sin recargar)', !(await visible()));
  await page.reload({ waitUntil: 'networkidle2' }); await pausa(3000);
  if (!(await page.$('[data-row="true"][role="button"]'))) { await page.focus('#btn-tab-lotes').catch(() => {}); await tecla('Enter'); await pausa(2500); }
  ok('Después de recargar sigue oculto', !(await visible()));
} catch (e) { ok('Sin fallas', false, e.message); }
finally { ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ')); await nav.close(); console.log(res.join('\n')); }
