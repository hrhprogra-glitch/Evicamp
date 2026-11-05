// Abre las ventanas principales en varios tamaños de pantalla y lista los botones o campos que quedan
// fuera de la pantalla sin poder llegar a ellos con scroll (cortados por la ventana del navegador).
// Uso: node ai-scripts/pruebas/estilo/revisar-ventanas.mjs <carpeta-para-capturas>
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');
const DIR = process.argv[2];
const TAMANOS = [[1920, 1080], [1366, 768], [1280, 720], [1024, 768], [768, 1024], [390, 844]];
// [vista, pestaña previa (opcional), botón que abre la ventana]
const VENTANAS = [
  ['inventario', null, 'btn-nuevo-producto'],
  ['inventario', null, 'btn-proveedores'],
  ['inventario', null, 'btn-ingresar-lote'],
  ['inventario', null, 'btn-header-producir'],
  ['inventario', null, 'btn-traspasos'],
  ['inventario', 'btn-tab-compras', 'btn-nueva-compra'],
  ['utilidades', null, 'btn-tops-utilidades'],
  ['clientes', null, 'btn-nuevo-cliente'],
  ['clientes', null, 'btn-ver-grupos'],
  ['conteos', null, 'btn-nuevo-ajuste'],
  ['finanzas', null, 'btn-aperturar-caja'],
  ['finanzas', null, 'btn-nuevo-movimiento'],
  ['finanzas', null, 'btn-reporte-contador'],
  ['finanzas', null, 'btn-cerrar-caja'],
  ['configuracion', 'btn-tab-usuarios', 'btn-nuevo-usuario-ajustes'],
  ['configuracion', 'btn-tab-tiendas', 'btn-nueva-tienda'],
];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 1080 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario');
await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
await page.keyboard.press('Enter'); await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(1500);

const medir = () => page.evaluate(() => {
  const W = innerWidth, H = innerHeight;
  // La ventana abierta = el último elemento fijo que cubre casi toda la pantalla
  const capas = [...document.querySelectorAll('body *')].filter((el) => { const cs = getComputedStyle(el); if (cs.position !== 'fixed') return false; const r = el.getBoundingClientRect(); return r.width >= W * 0.9 && r.height >= H * 0.9 && cs.display !== 'none' && cs.visibility !== 'hidden'; });
  const capa = capas[capas.length - 1];
  if (!capa) return null;
  const alcanzable = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if ((/auto|scroll/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) || (/auto|scroll/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1)) return true; } return false; };
  const nombre = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase()) + ' "' + (el.innerText || el.placeholder || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '"';
  const fuera = [];
  for (const el of capa.querySelectorAll('button, input, select, textarea, [role="tab"]')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if ((r.bottom > H + 1 || r.top < -1 || r.right > W + 1 || r.left < -1) && !alcanzable(el)) fuera.push(nombre(el) + ` (y ${Math.round(r.top)}→${Math.round(r.bottom)}, x ${Math.round(r.left)}→${Math.round(r.right)})`);
  }
  // El botón principal (Guardar, Registrar, Confirmar…) se tiene que ver entero SIN bajar con el mouse
  const PRINCIPAL = /^(guardar|registrar|confirmar|crear|finalizar|ingresar|aceptar|cobrar|grabar|procesar|emitir|actualizar|enviar)/i;
  for (const el of capa.querySelectorAll('button')) {
    const texto = (el.innerText || '').trim();
    if (!PRINCIPAL.test(texto)) continue;
    let r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    let top = Math.max(r.top, 0), bottom = Math.min(r.bottom, H), left = Math.max(r.left, 0), right = Math.min(r.right, W);
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') { const q = p.getBoundingClientRect(); top = Math.max(top, q.top); bottom = Math.min(bottom, q.bottom); left = Math.max(left, q.left); right = Math.min(right, q.right); }
    }
    if (bottom - top < r.height * 0.9 || right - left < r.width * 0.9) fuera.push(`botón principal oculto: ${nombre(el)} (hay que bajar para verlo)`);
  }
  return [...new Set(fuera)].slice(0, 6);
});

const informe = [];
for (const [w, h] of TAMANOS) {
  await page.setViewport({ width: w, height: h }); await pausa(500);
  for (const [vista, tab, boton] of VENTANAS) {
    await page.evaluate((id) => document.getElementById('sidebar-btn-' + id)?.click(), vista); await pausa(1500);
    if (tab) { await page.evaluate((id) => document.getElementById(id)?.click(), tab); await pausa(800); }
    const hay = await page.evaluate((id) => { const b = document.getElementById(id); if (!b) return false; b.click(); return true; }, boton);
    if (!hay) { informe.push(`·  ${w}x${h} ${boton}: no está en pantalla`); continue; }
    await pausa(1200);
    const f = await medir();
    if (f === null) informe.push(`·  ${w}x${h} ${boton}: no abrió ventana`);
    else if (f.length) { informe.push(`❌ ${w}x${h} ${boton}: ${f.join(', ')}`); await page.screenshot({ path: `${DIR}/ven-${boton}-${w}.png` }); }
    else informe.push(`✅ ${w}x${h} ${boton}`);
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await pausa(250); }
  }
}
console.log(informe.join('\n'), '\nerrores JS:', errores.length, errores.slice(0, 2));
await nav.close();
