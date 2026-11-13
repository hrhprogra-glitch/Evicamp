// Mide cuánto tarda cada sección en cargar la PRIMERA vez (13/11/2026, dueño: "cuando entro demora mucho en cargar").
// Por sección: tiempo hasta que no hay pedidos pendientes, cuántos pedidos hizo a la API, cuántos datos bajó y los más lentos.
// Uso: node ai-scripts/pruebas/medir-carga-secciones.mjs <carpeta tools> [link]   (link por defecto: nego.siumax)
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools, link = 'https://nego.siumax.duckdns.org'] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage();
const cdp = await page.createCDPSession(); await cdp.send('Network.enable');
const pedidos = new Map(); // requestId -> {url, t0, bytes, fin}
cdp.on('Network.requestWillBeSent', (e) => { if (e.request.url.includes('/rest/v1/')) pedidos.set(e.requestId, { url: e.request.url, t0: e.timestamp, bytes: 0, fin: null }); });
cdp.on('Network.loadingFinished', (e) => { const p = pedidos.get(e.requestId); if (p) { p.fin = e.timestamp; p.bytes = e.encodedDataLength; } });
const pendientes = () => [...pedidos.values()].filter((p) => p.fin === null).length;
const esperarQuieto = async (max = 30000) => { const t = Date.now(); let quieto = 0; while (Date.now() - t < max) { if (pendientes() === 0) { quieto += 100; if (quieto >= 600) break; } else quieto = 0; await pausa(100); } return Date.now() - t - 600; };

await page.goto(link, { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 });
await esperarQuieto(); await pausa(1500);
const secciones = await page.$$eval('#evicamp-sidebar [id^="sidebar-btn-"]', (b) => b.map((x) => x.id.replace('sidebar-btn-', '')));
const out = [];
for (const s of secciones) {
  pedidos.clear();
  const t0 = Date.now();
  await page.evaluate((x) => document.getElementById(`sidebar-btn-${x}`)?.click(), s);
  await pausa(150);
  const ms = Date.now() - t0 + await esperarQuieto();
  const lista = [...pedidos.values()];
  const kb = Math.round(lista.reduce((a, p) => a + p.bytes, 0) / 1024);
  const lentos = lista.filter((p) => p.fin).map((p) => ({ ms: Math.round((p.fin - p.t0) * 1000), kb: Math.round(p.bytes / 1024), url: decodeURIComponent(p.url.split('/rest/v1/')[1]).slice(0, 70) }))
    .sort((a, b) => b.ms - a.ms).slice(0, 4).map((p) => `${p.ms}ms ${p.kb}KB ${p.url}`);
  out.push(`${s.padEnd(14)} ${String(ms).padStart(6)} ms · ${String(lista.length).padStart(3)} pedidos · ${String(kb).padStart(5)} KB\n      ${lentos.join('\n      ')}`);
}
console.log(out.join('\n'));
await nav.close();
