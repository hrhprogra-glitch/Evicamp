// Prueba del 17/11/2026 (dueño): con el negocio en SOLO Servicios, el tipo NO debe volver a Comercio
// solo con el paso del tiempo (App revalida cada 60 s) ni al volver a la pestaña (visibilitychange),
// ni aunque falte internet. NO cambia el tipo de negocio: solo comprueba que se respete lo elegido.
// Uso: node ai-scripts/pruebas/prueba-tipo-servicios-no-revierte.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const estado = async () => page.evaluate(() => ({
  tipo: localStorage.getItem('nego_tipos_negocio'),
  caja: !!document.getElementById('sidebar-btn-pos'),
  salidas: !!document.getElementById('sidebar-btn-salidas'),
  taller: !!document.getElementById('sidebar-btn-taller'),
  encargos: !!document.getElementById('sidebar-btn-encargos'),
}));
const debeSerServicios = (e) => e?.tipo === '["servicios"]' && !e.caja && e.salidas && e.taller && e.encargos;

try {
  const baseAntes = await sql('select tipos_negocio from empresa_config limit 1');
  ok('La base empieza en solo Servicios', baseAntes === '{servicios}', baseAntes);

  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);

  const inicio = await estado();
  ok('Al entrar sale menú de Servicios (sin Caja)', debeSerServicios(inicio), JSON.stringify(inicio));

  // Simular que el dueño sale y vuelve a la pestaña (App escucha visibilitychange)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await pausa(3000);
  ok('Al volver a la pestaña sigue en Servicios', debeSerServicios(await estado()), JSON.stringify(await estado()));

  // Esperar a que pase el revalidado automático (REVALIDAR_CADA_MS = 60 s)
  await pausa(64000);
  ok('Tras 60 s sigue en Servicios (no se pasó a Comercio)', debeSerServicios(await estado()), JSON.stringify(await estado()));

  // Sin internet: no debe caer a Comercio
  await page.setOfflineMode(true); await pausa(1000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await pausa(2000);
  ok('Sin internet sigue en Servicios', debeSerServicios(await estado()), JSON.stringify(await estado()));

  const baseDespues = await sql('select tipos_negocio from empresa_config limit 1');
  ok('La base sigue en solo Servicios', baseDespues === '{servicios}', baseDespues);
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  await nav.close();
  console.log(res.join('\n'));
}
