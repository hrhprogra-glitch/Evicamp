// Prueba de la fase 2.3 mínima (siumax): filtros "Vencidos" y "Vencen en 30 días" en Productos y en Lotes, y la
// etiqueta "VENCE EN X DÍAS". También sin internet.
// Uso: node prueba-vencimientos.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const m = Date.now(); const B = 940000 + (m % 9000); const TAG = `VNC${m}`;
// fecha local de Lima + N días
const dia = (n) => { const d = new Date(Date.now() + n * 86_400_000); return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); };
const casos = [['VENCIDO', -5, 3], ['EN10', 10, 4], ['HOY', 0, 2], ['EN60', 60, 5], ['VENCIDOSINSTOCK', -3, 0], ['SINFECHA', null, 6]];
await sql(casos.map(([n, d, q], i) => `insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced) values (${B + i}, '${TAG} ${n}', 'GENERAL', '${TAG}-${i}', 1, ${q}, 0, 'UND', 1, 1);
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, expiration_date, is_active, is_synced) values (${m + i}, ${B + i}, ${q}, ${q || 1}, 1, 1, 'VNC', ${d === null ? 'null' : `'${dia(d)}'`}, 1, 1);`).join('\n'));

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
await page.evaluateOnNewDocument(() => localStorage.setItem('siumax_pruebas', '1'));
const tecla = async (k) => { await page.keyboard.press(k); await pausa(200); };
const nombresVisibles = () => page.evaluate((tag) => [...document.querySelectorAll('[data-row="true"]')].filter((f) => f.offsetParent !== null && f.innerText.includes(tag)).map((f) => f.innerText.match(new RegExp(`${tag} (\\w+)`))?.[1]).filter(Boolean).sort().join(','), TAG);
const filtrar = async (valor) => { await page.select('#filtro-estado-inventario', valor); await pausa(800); };
const buscar = async () => { await page.focus('#buscador-global-inventario'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(TAG); await pausa(800); };
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(18000); // precarga
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#filtro-estado-inventario'); await pausa(2000);

  const opciones = await page.evaluate(() => [...document.querySelectorAll('#filtro-estado-inventario option')].map((o) => o.textContent.trim()));
  ok('El filtro de estado tiene "Vencidos" y "Vencen en 30 días"', opciones.includes('Vencidos') && opciones.includes('Vencen en 30 días'), opciones.join(' | '));

  // PRODUCTOS
  await page.focus('#btn-tab-productos'); await tecla('Enter'); await buscar();
  ok('Productos sin filtro: aparecen los 6 de prueba', (await nombresVisibles()).split(',').length === 6, await nombresVisibles());
  await filtrar('VENCIDOS');
  ok('Productos · Vencidos: solo el vencido con stock', (await nombresVisibles()) === 'VENCIDO', await nombresVisibles());
  await filtrar('POR_VENCER');
  ok('Productos · Vencen en 30 días: el de 10 días y el que vence hoy (no el de 60)', (await nombresVisibles()) === 'EN10,HOY', await nombresVisibles());

  // LOTES
  await filtrar(''); await page.focus('#btn-tab-lotes'); await tecla('Enter'); await pausa(2500); await buscar();
  const etiquetas = await page.evaluate((tag) => Object.fromEntries([...document.querySelectorAll('[data-row="true"]')].filter((f) => f.offsetParent !== null && f.innerText.includes(tag))
    .map((f) => [f.innerText.match(new RegExp(`${tag} (\\w+)`))?.[1], f.querySelector('[data-vence="true"]')?.innerText || '—'])), TAG);
  ok('Lotes: "Venció hace 5 días" en el vencido', /VENCIÓ HACE 5 DÍAS/i.test(etiquetas.VENCIDO || ''), JSON.stringify(etiquetas));
  ok('Lotes: "Vence en 10 días", "Vence hoy" y "Vence en 60 días"', /VENCE EN 10 DÍAS/i.test(etiquetas.EN10 || '') && /VENCE HOY/i.test(etiquetas.HOY || '') && /VENCE EN 60 DÍAS/i.test(etiquetas.EN60 || ''), JSON.stringify(etiquetas));
  ok('Lotes: sin etiqueta el que no tiene fecha', (etiquetas.SINFECHA || '—') === '—', JSON.stringify(etiquetas));
  await filtrar('VENCIDOS');
  ok('Lotes · Vencidos: solo el vencido con stock (no el agotado)', (await nombresVisibles()) === 'VENCIDO', await nombresVisibles());
  await filtrar('POR_VENCER');
  ok('Lotes · Vencen en 30 días: el de 10 días y el de hoy', (await nombresVisibles()) === 'EN10,HOY', await nombresVisibles());

  // SIN INTERNET: el filtro sigue funcionando (copia de la precarga con la fecha)
  await filtrar('');
  await page.setOfflineMode(true);
  await page.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await pausa(1500);
  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#filtro-estado-inventario'); await pausa(2500);
  await page.focus('#btn-tab-productos'); await tecla('Enter'); await buscar(); await filtrar('VENCIDOS');
  ok('Sin internet · Productos Vencidos: el vencido', (await nombresVisibles()) === 'VENCIDO', await nombresVisibles());
  await filtrar('POR_VENCER');
  ok('Sin internet · Productos Vencen en 30 días', (await nombresVisibles()) === 'EN10,HOY', await nombresVisibles());
  await page.setOfflineMode(false);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set is_active=0 where name like '${TAG} %'; update batches set is_active=0 where document_ref='VNC' and id between ${m} and ${m + 10};`).catch(() => {});
  console.log(res.join('\n'));
}
