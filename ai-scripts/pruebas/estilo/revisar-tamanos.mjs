// Revisa todas las secciones en varios tamaños de pantalla y lista lo que se corta o se monta:
// - la página se sale a lo ancho (barra horizontal),
// - botones, pestañas o campos que quedan fuera de la pantalla (y no están dentro de algo con scroll),
// - títulos tapados por botones o pestañas.
// Uso: node ai-scripts/pruebas/estilo/revisar-tamanos.mjs <carpeta-para-capturas> [vista1,vista2]
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');
const DIR = process.argv[2];
// Cada vista es 'seccion' o 'seccion>id-de-la-pestaña' (se le hace clic antes de medir)
const TODAS = 'pos,clientes,clientes>tab-clientes-creditos,clientes>tab-clientes-cotizaciones,clientes>tab-clientes-pedidos,inventario,inventario>btn-tab-lotes,inventario>btn-tab-compras,conteos,finanzas,finanzas>btn-ver-historial,utilidades,configuracion,configuracion>btn-tab-tiendas,configuracion>btn-tab-tienda_web,configuracion>btn-tab-facturacion,configuracion>btn-tab-usuarios,configuracion>btn-tab-apariencia,configuracion>btn-tab-sugerencias';
const VISTAS = (process.argv[3] || TODAS).split(',');
const TAMANOS = [[1920, 1080], [1600, 900], [1366, 768], [1280, 720], [1024, 768], [768, 1024], [390, 844]];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 1080 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
await page.waitForSelector('#input-login-usuario');
await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
await page.keyboard.press('Enter'); await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(1500);

const medir = () => page.evaluate(() => {
  const W = innerWidth, H = innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[aria-hidden="true"]'); };
  const enScroll = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  const nombre = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase()) + ' "' + (el.innerText || el.placeholder || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"';
  const res = { ancho: document.documentElement.scrollWidth > W + 1 ? document.documentElement.scrollWidth : 0, fuera: [], montados: [] };
  const main = document.querySelector('main') || document.body;
  const ctrls = [...main.querySelectorAll('button, [role="tab"], input, select, a')].filter(visible);
  for (const el of ctrls) {
    const r = el.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && !enScroll(el)) res.fuera.push(nombre(el) + ` (${Math.round(r.left)}→${Math.round(r.right)})`);
  }
  // Títulos tapados: el texto del h1/h2 se cruza con un botón o pestaña
  const titulos = [...main.querySelectorAll('h1, h2')].filter(visible);
  for (const t of titulos) {
    const rng = document.createRange(); rng.selectNodeContents(t); const rt = rng.getBoundingClientRect();
    for (const b of ctrls) {
      if (t.contains(b) || b.contains(t)) continue;
      const rb = b.getBoundingClientRect();
      const x = Math.min(rt.right, rb.right) - Math.max(rt.left, rb.left), y = Math.min(rt.bottom, rb.bottom) - Math.max(rt.top, rb.top);
      if (x > 2 && y > 2) res.montados.push(`${nombre(t)} tapado por ${nombre(b)}`);
    }
  }
  res.fuera = [...new Set(res.fuera)].slice(0, 8); res.montados = [...new Set(res.montados)].slice(0, 5);
  return res;
});

const informe = [];
for (const [w, h] of TAMANOS) {
  await page.setViewport({ width: w, height: h }); await pausa(600);
  for (const v of VISTAS) {
    const [seccion, pestana] = v.split('>');
    await page.evaluate((id) => document.getElementById('sidebar-btn-' + id)?.click(), seccion); await pausa(1800);
    if (pestana) { await page.evaluate((id) => document.getElementById(id)?.click(), pestana); await pausa(1500); }
    await page.evaluate(() => document.activeElement?.blur()); await pausa(200);
    const m = await medir();
    const malo = m.ancho || m.fuera.length || m.montados.length;
    if (malo) {
      informe.push(`❌ ${w}x${h} ${v}: ` + [m.ancho && `página más ancha (${m.ancho}px)`, m.fuera.length && `fuera: ${m.fuera.join(', ')}`, m.montados.length && `montados: ${m.montados.join(' | ')}`].filter(Boolean).join(' · '));
      await page.screenshot({ path: `${DIR}/tam-${v.replace(">", "_")}-${w}.png` });
    } else informe.push(`✅ ${w}x${h} ${v}`);
  }
}
console.log(informe.join('\n'), '\nerrores JS:', errores.length, errores.slice(0, 2));
await nav.close();
