// Pasada 228: verificación en vivo de Evicamp SIN credenciales (solo pantalla de login).
// Comprueba que no pide planes, que la API cierra sin sesión, teclado, sin internet y 4 tamaños.
// Uso: node ai-scripts/pruebas/verificar-evicamp-228.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
const pagos = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('request', (r) => { if (/mercadopago|pagar|suscripcion|plan/i.test(r.url())) pagos.push(r.url()); });

try {
  const resp = await page.goto('https://evicamp.duckdns.org', { waitUntil: 'networkidle2' });
  ok('Evicamp abre sin error de servidor', resp.status() === 200, String(resp.status()));
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  const texto = await page.evaluate(() => document.body.innerText || '');
  ok('No hay aviso de pago ni botón «Pagar plan»', !/pagar plan|mercado pago|suscripci[oó]n|plan premium/i.test(texto));
  ok('No se llama a servicios de pago', pagos.length === 0, pagos.join(', ').slice(0, 200));

  for (const [w, h] of [[390, 844], [768, 900], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(300);
    const estado = await page.evaluate(() => {
      const u = document.getElementById('input-login-usuario');
      const p = document.getElementById('input-login-password');
      const r = u?.getBoundingClientRect();
      return { usuario: !!u, password: !!p, ancho: r ? Math.round(r.width) : 0, scroll: document.documentElement.scrollWidth > window.innerWidth + 2 };
    });
    ok(`${w}px: login usable y sin desbordes`, estado.usuario && estado.password && estado.ancho > 0 && !estado.scroll, JSON.stringify(estado));
    if (w === 390) {
      const boton = await page.evaluate(() => {
        const b = document.querySelector('button[type="submit"]');
        if (!b) return null;
        const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), radio: getComputedStyle(b).borderRadius };
      });
      ok('390px: botón cuadrado y visible', !!boton && boton.w > 0 && boton.h > 0 && /^0px$/.test(boton.radio), JSON.stringify(boton));
    }
  }
  await page.setViewport({ width: 1366, height: 860 }); await pausa(300);

  await page.setOfflineMode(true); await pausa(400);
  const sinInternet = await page.evaluate(() => document.body.innerText || '');
  await page.focus('#input-login-usuario');
  await page.keyboard.type('prueba@teclado');
  const escrito = await page.$eval('#input-login-usuario', (e) => e.value);
  ok('Sin internet: se puede escribir y navegar con teclado', escrito === 'prueba@teclado' && sinInternet.length > 0, escrito);
  await page.keyboard.press('Enter');
  const foco = await page.evaluate(() => document.activeElement?.id);
  ok('Enter lleva del usuario a la contraseña (regla del teclado)', foco === 'input-login-password', foco);
  await page.setOfflineMode(false);

  ok('Sin errores de JavaScript al entrar', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  console.log(res.join('\n'));
}
