// Prueba (siumax): el código (SKU) se escribe en el formulario del producto con teclado, se guarda en mayúsculas,
// no deja repetir el código de otro producto y, vacío, se genera solo.
// Uso: node prueba-sku.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => {
  const s = new NodeSSH(); await s.connect(conexionVps);
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q });
  s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim();
};
const PROD = 920003; // DEMO GASEOSA 1.5L
const original = await sql(`select code from products where id = ${PROD};`);
const otro = await sql(`select code from products where id <> ${PROD} and code is not null and is_active = 1 limit 1;`);
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const errores = [];
const tecla = async (page, k) => { await page.keyboard.press(k); await pausa(180); };
const foco = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
try {
  const ctx = await nav.createBrowserContext(); const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await p.waitForSelector('#input-login-usuario'); await p.focus('#input-login-usuario'); await p.keyboard.type('admin@siumax.com');
  await p.focus('#input-login-password'); await p.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await p.keyboard.press('Enter');
  await p.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2500);
  const abrir = async () => {
    await p.focus('#sidebar-btn-inventario'); await tecla(p, 'Enter'); await p.waitForSelector('#btn-tab-productos'); await pausa(1500);
    await p.focus('#btn-tab-productos'); await tecla(p, 'Enter');
    await p.focus('#buscador-global-inventario'); await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control'); await p.keyboard.type('DEMO GASEOSA'); await pausa(1000);
    await p.evaluate(() => [...document.querySelectorAll('[data-row="true"]')].find((f) => f.offsetParent && f.innerText.includes('DEMO GASEOSA'))?.focus());
    await tecla(p, 'Enter'); await p.waitForSelector('#input-codigo-producto'); await pausa(600);
  };
  const escribirCodigo = async (t) => { await p.focus('#input-codigo-producto'); await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control'); await p.keyboard.press('Backspace'); if (t) await p.keyboard.type(t); };
  const guardar = async () => { await p.focus('#btn-guardar-producto'); await tecla(p, 'Enter'); await pausa(2500); };

  await abrir();
  ok('El campo Código (SKU) muestra el código actual', (await p.$eval('#input-codigo-producto', (i) => i.value)) === original, original);
  await p.focus('#input-categoria-producto'); await p.evaluate(() => { const i = document.getElementById('input-categoria-producto'); i.setSelectionRange(i.value.length, i.value.length); });
  await tecla(p, 'ArrowRight'); if ((await foco(p)) !== 'input-codigo-producto') await tecla(p, 'Escape');
  ok('→ desde Categoría llega al Código (SKU)', (await foco(p)) === 'input-codigo-producto', await foco(p));
  await escribirCodigo('prueba-sku-1'); await tecla(p, 'Enter');
  ok('Enter en el Código pasa al código de barras', (await foco(p)) === 'input-barcode-producto', await foco(p));
  await tecla(p, 'Home'); await tecla(p, 'ArrowLeft');
  ok('← desde el código de barras vuelve al Código', (await foco(p)) === 'input-codigo-producto', await foco(p));
  await guardar();
  ok('Servidor: guardó el código en mayúsculas', (await sql(`select code from products where id = ${PROD};`)) === 'PRUEBA-SKU-1');

  await abrir(); await escribirCodigo(otro); await guardar();
  const aviso = await p.evaluate(() => document.body.innerText.match(/ya existe en otro producto/i)?.[0] || '');
  ok('No deja usar el código de otro producto', !!aviso && (await sql(`select code from products where id = ${PROD};`)) === 'PRUEBA-SKU-1', aviso);
  await tecla(p, 'Escape'); await pausa(500); await tecla(p, 'Escape'); await pausa(500);

  await abrir(); await escribirCodigo(''); await guardar();
  const gen = await sql(`select code from products where id = ${PROD};`);
  ok('Vacío: se genera solo (SKU-######)', /^SKU-\d{6}$/.test(gen), gen);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set code = '${original.replace(/'/g, "''")}' where id = ${PROD};`).catch(() => {});
  console.log(res.join('\n'));
}
