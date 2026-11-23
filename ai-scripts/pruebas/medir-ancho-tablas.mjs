// Mide, en el sitio de pruebas, cuánto espacio sobra a izquierda/derecha
// entre el contenido de cada sesión y el borde del área principal. Solo lectura.
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const SITIO = 'https://nego.siumax.duckdns.org';
const CLAVE = process.env.SIUMAX_ADMIN_CLAVE;
if (!CLAVE) throw new Error('Falta SIUMAX_ADMIN_CLAVE');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sesiones = ['clientes', 'pos', 'encargos', 'agenda', 'salidas', 'contratos', 'taller', 'inventario', 'conteos', 'finanzas', 'utilidades', 'configuracion'];

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const page = await nav.newPage();
try {
  await page.goto(SITIO, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario'); await page.keyboard.type('admin'); await page.keyboard.press('Enter');
  await page.focus('#input-login-password'); await page.keyboard.type(CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-clientes', { timeout: 25000 });
  await pausa(2500);

  for (const id of sesiones) {
    const btn = `#sidebar-btn-${id}`;
    if (!(await page.$(btn))) { console.log(`${id}: sin botón`); continue; }
    await page.focus(btn); await page.keyboard.press('Enter'); await pausa(1800);
    const m = await page.evaluate(() => {
      const area = document.querySelector('main section') || document.querySelector('main');
      const a = area.getBoundingClientRect();
      const medir = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { izq: Math.round(r.left - a.left), der: Math.round(a.right - r.right), ancho: Math.round(r.width) };
      };
      return { area: Math.round(a.width), buscador: medir('.buscador-sobrio, #caja-buscador-inventario'), tabla: medir('.tabla-marco'), tablaBruta: medir('table') };
    });
    console.log(`${id.padEnd(14)} área=${m.area}  buscador=${JSON.stringify(m.buscador)}  tabla=${JSON.stringify(m.tabla)}  <table>=${JSON.stringify(m.tablaBruta)}`);
  }
} finally { await nav.close(); }
