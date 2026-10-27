// Prueba: Tab dentro de ventanas (Balanza y otras) no abre el menú ni pierde el selector; sin ventana, Tab sigue
// abriendo y cerrando el menú. Solo siumax. Uso: node prueba-tab-ventanas.mjs <carpeta tools> <ruta .env.vps>
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
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const shiftTab = async () => { await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift'); await pausa(220); };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('title') || document.activeElement?.tagName);
const menuAbierto = () => page.evaluate(() => document.getElementById('evicamp-sidebar')?.getAttribute('data-sidebar-open') === 'true');
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(1500);
  if (await menuAbierto()) { await tecla('Tab'); await pausa(300); }
  await page.evaluate(() => document.getElementById('sidebar-btn-pos')?.click()); await pausa(2000);
  if (await menuAbierto()) { await tecla('Tab'); await pausa(300); }

  // === Sin ventana: Tab sigue abriendo y cerrando el menú ===
  await page.focus('#buscador-global-pos');
  await tecla('Tab');
  ok('Sin ventana: Tab abre el menú lateral (como siempre)', await menuAbierto());
  await tecla('Tab'); await pausa(300);
  ok('Sin ventana: Tab lo vuelve a cerrar', !(await menuAbierto()));

  // === Balanza ===
  await page.focus('#buscador-global-pos');
  await page.keyboard.type('AZUCAR RUBIA', { delay: 40 }); await pausa(600); await tecla('Enter');
  await page.waitForSelector('#balanza-input-monto', { timeout: 10000 }); await pausa(400);
  ok('Se abre la Balanza con el selector en "dinero"', (await foco()) === 'balanza-input-monto', await foco());
  const pasos = [['balanza-input-peso'], ['balanza-btn-confirm'], ['balanza-btn-close'], ['balanza-input-monto']];
  for (const [esperado] of pasos) {
    await tecla('Tab');
    ok(`Tab → ${esperado} (el menú NO se abre)`, (await foco()) === esperado && !(await menuAbierto()), `${await foco()} | menú abierto: ${await menuAbierto()}`);
  }
  await shiftTab();
  ok('Shift+Tab → vuelve a la X', (await foco()) === 'balanza-btn-close' && !(await menuAbierto()), await foco());
  await tecla('Escape'); await pausa(300);
  ok('Esc cierra la Balanza', !(await page.$('#balanza-input-monto')));

  // === Red de seguridad: ventana que NO maneja Tab (se simula una ventana nueva sin manejo de teclado) ===
  await page.evaluate(() => {
    const capa = document.createElement('div');
    capa.id = 'ventana-simulada'; capa.className = 'fixed inset-0 z-[77777]';
    capa.innerHTML = '<button id="sim-1">uno</button><button id="sim-2">dos</button>';
    document.body.appendChild(capa); document.getElementById('sim-2').focus();
  });
  await tecla('Tab');
  ok('Ventana sin manejo de Tab: el selector no se sale de la ventana', ['sim-1', 'sim-2'].includes(await foco()) && !(await menuAbierto()), `${await foco()} | menú abierto: ${await menuAbierto()}`);
  await shiftTab();
  ok('Ventana sin manejo de Tab: Shift+Tab tampoco se sale', ['sim-1', 'sim-2'].includes(await foco()), await foco());
  await page.evaluate(() => document.getElementById('ventana-simulada')?.remove());
} catch (e) { ok('Sin fallas', false, e.message); }
finally { ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ')); await nav.close(); console.log(res.join('\n')); }
