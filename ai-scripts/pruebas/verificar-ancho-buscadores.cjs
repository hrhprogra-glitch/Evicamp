const { createRequire } = require('node:module');
const require2 = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require2('puppeteer-core'); } catch { puppeteer = require2('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const SITIO = 'https://nego.siumax.duckdns.org';
const CLAVE = process.env.SIUMAX_ADMIN_CLAVE;
if (!CLAVE) throw new Error('Falta SIUMAX_ADMIN_CLAVE');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sesiones = ['clientes', 'encargos', 'agenda', 'salidas', 'contratos', 'taller', 'inventario', 'conteos', 'finanzas', 'utilidades', 'configuracion'];

(async () => {
  const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
  const page = await nav.newPage();
  try {
    await page.goto(SITIO, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#input-login-usuario');
    await page.focus('#input-login-usuario'); await page.keyboard.type('admin'); await page.keyboard.press('Enter');
    await page.focus('#input-login-password'); await page.keyboard.type(CLAVE); await page.keyboard.press('Enter');
    await page.waitForSelector('#sidebar-btn-clientes', { timeout: 25000 });
    await pausa(2500);

    const medir = async (etiqueta) => {
      const malos = await page.evaluate(() => {
        const area = document.querySelector('main section') || document.querySelector('main');
        const a = area.getBoundingClientRect();
        const out = [];
        const vistos = new Set();
        const candidatos = Array.from(document.querySelectorAll('input, .buscador-sobrio, #caja-buscador-inventario')).filter((e) => {
          const r = e.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          if (e.tagName === 'INPUT') {
            const id = e.id || '', ph = e.placeholder || '';
            return /buscador|busqueda|search/i.test(id) || /uscar/i.test(ph);
          }
          return true;
        });
        for (const e of candidatos) {
          const caja = e.closest('.buscador-sobrio, #caja-buscador-inventario') || e;
          if (vistos.has(caja)) continue;
          vistos.add(caja);
          const r = caja.getBoundingClientRect();
          const izq = Math.round(r.left - a.left), der = Math.round(a.right - r.right);
          if (izq !== 0) {
            const cadena = [];
            let n = caja;
            while (n && n !== document.body) {
              const cs = getComputedStyle(n);
              if (parseFloat(cs.paddingLeft) || parseFloat(cs.marginLeft)) cadena.push({ cls: String(n.className).slice(0, 100), pl: cs.paddingLeft, ml: cs.marginLeft });
              n = n.parentElement;
            }
            out.push({ tipo: 'buscador', id: caja.id, cls: String(caja.className).slice(0, 80), izq, der, cadena });
          }
        }
        for (const e of document.querySelectorAll('.tabla-marco, table')) {
          const r = e.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const izq = Math.round(r.left - a.left), der = Math.round(a.right - r.right);
          if (izq !== 0 || der !== 0) out.push({ tipo: 'tabla', cls: String(e.className).slice(0, 80), izq, der });
        }
        return out;
      });
      if (malos.length) console.log(`  MAL [${etiqueta}] ${JSON.stringify(malos)}`);
      return malos.length;
    };

    let total = 0;
    for (const id of sesiones) {
      const btn = `#sidebar-btn-${id}`;
      if (!(await page.$(btn))) { console.log(`${id}: sin botón`); continue; }
      await page.focus(btn); await page.keyboard.press('Enter'); await pausa(1600);
      let malos = await medir(id);
      const vistas = await page.evaluate(() => [...new Set(Array.from(document.querySelectorAll('[role="tab"], [id^="tab-"], [id^="btn-tab-"], [id^="btn-subtab-"]'))
        .filter((e) => e.getClientRects().length && !e.getAttribute('aria-disabled'))
        .map((e) => e.id || e.getAttribute('aria-controls') || e.textContent.trim().slice(0, 30)))].slice(0, 20));
      for (const p of vistas) {
        const ok = await page.evaluate((nombre) => {
          const e = Array.from(document.querySelectorAll('[role="tab"], [id^="tab-"], [id^="btn-tab-"], [id^="btn-subtab-"]'))
            .find((x) => x.id === nombre || x.getAttribute('aria-controls') === nombre || x.textContent.trim().slice(0, 30) === nombre);
          if (!e) return false;
          e.click(); return true;
        }, p);
        if (ok) { await pausa(900); malos += await medir(`${id}/${p}`); }
      }
      console.log(`${id.padEnd(14)} vistas=${vistas.length}  con margen=${malos}`);
      total += malos;
    }
    console.log(`\nTOTAL con margen: ${total}`);
  } finally { await nav.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
