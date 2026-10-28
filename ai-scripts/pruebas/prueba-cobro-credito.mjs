// Prueba (siumax): cobrar un crédito desde el Estado de cuenta (Clientes → Créditos). Con UN solo cobro la deuda
// desaparece de la lista, se guarda UN solo abono (antes se recargaba la lista antes de guardar y el cajero cobraba dos
// veces) y el selector no se pierde.
// Uso: node ai-scripts/pruebas/prueba-cobro-credito.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const m = Date.now(); const corto = String(m).slice(-6);
const C = 993000 + (m % 4000); const NOMBRE = `PRUEBA COBRO ${corto}`;
await sql(`insert into customers (id, name, created_at, is_synced) values (${C}, '${NOMBRE}', now(), 1);
  insert into fiados (id, customer_id, customer_name, amount, date_given, expected_pay_date, status, paid_amount, is_synced)
  values (${m}, ${C}, '${NOMBRE}', 10, now() - interval '2 day', to_char(now(), 'YYYY-MM-DD'), 'PENDIENTE', 0, 1);`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 900 } });
const page = await nav.newPage(); const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-clientes', { timeout: 20000 }); await pausa(2500);
  await page.evaluate(() => sessionStorage.setItem('clientes_pestana', 'CREDITOS'));
  await page.focus('#sidebar-btn-clientes'); await tecla('Enter'); await page.waitForSelector('#buscador-global-fiados'); await pausa(2000);
  await page.focus('#buscador-global-fiados'); await page.keyboard.type(NOMBRE, { delay: 10 }); await pausa(600);
  await tecla('ArrowDown'); await tecla('Enter'); await page.waitForSelector('#btn-confirmar-pago-modal', { timeout: 10000 }); await pausa(800);
  await page.evaluate(() => document.getElementById('btn-seleccionar-todas-modal')?.click()); await pausa(300);
  await page.focus('#input-abono-efectivo-modal'); await page.keyboard.type('10'); await pausa(300);
  await page.focus('#btn-confirmar-pago-modal'); await tecla('Enter'); await pausa(3500);
  const abonos = await sql(`select count(*)||'|'||coalesce(sum(amount),0) from debt_payments where fiado_id=${m};`);
  ok('Con UN cobro se guarda UN solo abono de S/ 10', /^1\|10(\.0+)?$/.test(abonos), abonos);
  const sigue = await page.evaluate((n) => [...document.querySelectorAll('tr[role="button"]')].some((f) => f.innerText.includes(n)), NOMBRE);
  ok('Al primer cobro la deuda ya no aparece en Créditos (deudores)', !sigue);
  const foco = await page.evaluate(() => { const a = document.activeElement; return !a || a === document.body ? 'NADA' : (a.id || a.tagName + (a.getAttribute('role') ? `[${a.getAttribute('role')}]` : '')); });
  ok('El selector no se pierde (queda en una fila o en el buscador)', foco !== 'NADA', foco);
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`delete from debt_payments where fiado_id=${m}; delete from fiados where id=${m}; delete from customers where id=${C};`).catch(() => {});
  console.log(res.join('\n'));
}
