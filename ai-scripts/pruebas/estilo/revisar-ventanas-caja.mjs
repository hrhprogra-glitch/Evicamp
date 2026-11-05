// Ventanas de la Caja y de la caja abierta (cobro, cliente, espera, cotización, pedido, nuevo movimiento, cierre)
// en varios tamaños: lista botones o campos cortados por la pantalla sin poder llegar a ellos con scroll.
// Abre una caja y crea un producto de prueba por SQL, NO vende nada, y al final borra los dos (siumax queda como estaba).
// Uso: node ai-scripts/pruebas/estilo/revisar-ventanas-caja.mjs <carpeta-para-capturas>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../../vps.cjs');
process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../.env.vps'));
const DIR = process.argv[2];
const TAMANOS = [[1920, 1080], [1366, 768], [1280, 720], [1024, 768], [768, 1024], [390, 844]];
const PROD = 9100000000077, CAJA = 9100000000077;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
if (await sql("SELECT count(*) FROM cash_sessions WHERE status = 'OPEN'") !== '0') { console.log('Hay una caja abierta de verdad en siumax: no hago nada.'); process.exit(1); }
const limpiar = () => sql(`DELETE FROM products WHERE id = ${PROD}; DELETE FROM cash_sessions WHERE id = ${CAJA};`);
await limpiar();
await sql(`INSERT INTO cash_sessions (id, opening_balance, status, opened_at, is_synced) VALUES (${CAJA}, 0, 'OPEN', now(), 1);
  INSERT INTO products (id, name, price, quantity, unit, category, is_active, control_type) VALUES (${PROD}, 'PRUEBA TAMANO PANTALLA', 5, 50, 'UND', 'PRUEBAS', 1, 'UNIT');`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1920, height: 1080 } });
const informe = []; const errores = [];
try {
  const page = await nav.newPage(); page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter'); await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2500);

  const medir = () => page.evaluate(() => {
    const W = innerWidth, H = innerHeight;
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
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      let top = Math.max(r.top, 0), bottom = Math.min(r.bottom, H), left = Math.max(r.left, 0), right = Math.min(r.right, W);
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') { const q = p.getBoundingClientRect(); top = Math.max(top, q.top); bottom = Math.min(bottom, q.bottom); left = Math.max(left, q.left); right = Math.min(right, q.right); }
      }
      if (bottom - top < r.height * 0.9 || right - left < r.width * 0.9) fuera.push(`botón principal oculto: ${nombre(el)} (hay que bajar para verlo)`);
    }
    return [...new Set(fuera)].slice(0, 6);
  });
  const cerrar = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await pausa(250); } };
  const probar = async (w, h, nombre, abrir) => {
    const hay = await abrir();
    if (!hay) { informe.push(`·  ${w}x${h} ${nombre}: no está en pantalla`); return; }
    await pausa(1200);
    const f = await medir();
    if (f === null) informe.push(`·  ${w}x${h} ${nombre}: no abrió ventana`);
    else if (f.length) { informe.push(`❌ ${w}x${h} ${nombre}: ${f.join(', ')}`); await page.screenshot({ path: `${DIR}/caja-${nombre}-${w}.png` }); }
    else informe.push(`✅ ${w}x${h} ${nombre}`);
    await cerrar();
  };
  const clic = (id) => () => page.evaluate((i) => { const b = document.getElementById(i); if (!b) return false; b.click(); return true; }, id);

  // Un producto en el ticket (se queda en el carrito mientras se prueban los tamaños)
  await page.evaluate(() => document.getElementById('sidebar-btn-pos')?.click()); await pausa(2000);
  await page.focus('#buscador-global-pos'); await page.keyboard.type('PRUEBA TAMANO', { delay: 30 }); await pausa(1200);
  await page.keyboard.press('Enter'); await pausa(1200);

  for (const [w, h] of TAMANOS) {
    await page.setViewport({ width: w, height: h }); await pausa(700);
    await page.evaluate(() => document.getElementById('sidebar-btn-pos')?.click()); await pausa(1500);
    for (const [nombre, id] of [['cobro', 'btn-proceder-pago'], ['cliente', 'btn-pos-header-cliente'], ['espera', 'btn-pausar-ticket'], ['cotizacion', 'btn-pos-cotizacion'], ['pedido', 'btn-pos-pedido']]) {
      await probar(w, h, nombre, clic(id));
    }
    await page.evaluate(() => document.getElementById('sidebar-btn-finanzas')?.click()); await pausa(3000);
    await probar(w, h, 'nuevo-movimiento', clic('btn-nuevo-movimiento'));
    await probar(w, h, 'cierre-caja', clic('btn-cerrar-caja'));
  }
  // Vaciar el carrito antes de irse
  await page.evaluate(() => document.getElementById('sidebar-btn-pos')?.click()); await pausa(1500);
  await page.evaluate(() => { try { localStorage.removeItem('siumax_carrito'); } catch {} });
} finally {
  await nav.close();
  await limpiar();
  console.log(informe.join('\n'), '\nerrores JS:', errores.length, errores.slice(0, 2));
  console.log('Limpieza: caja de prueba', await sql(`SELECT count(*) FROM cash_sessions WHERE id = ${CAJA}`), '· producto de prueba', await sql(`SELECT count(*) FROM products WHERE id = ${PROD}`));
  ssh.dispose();
}
