// Prueba de la fase 4.1 (siumax), SOLO CON TECLADO: GRUPOS DE CLIENTES (familia o empresa).
// Crear un grupo desde el detalle de un cliente, agregar otro cliente, ver la deuda del grupo, "Cobrar al grupo"
// (estado de cuenta con el nombre de cada uno), sacar a un miembro y eliminar el grupo (las cuentas no se tocan).
// Uso: node ai-scripts/pruebas/prueba-grupos.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const m = Date.now(); const corto = String(m).slice(-6);
const A = 987000 + (m % 1000) * 3, B = A + 1;
const NA = `PRUEBA GRUPO A ${corto}`, NB = `PRUEBA GRUPO B ${corto}`, GRUPO = `PRUEBA EMPRESA ${corto}`;
await sql(`insert into customers (id, name, created_at, is_synced) values (${A}, '${NA}', now(), 1), (${B}, '${NB}', now(), 1);
  insert into fiados (id, customer_id, customer_name, amount, date_given, expected_pay_date, status, paid_amount, is_synced) values
  (${m}, ${A}, '${NA}', 10, now(), to_char(now(),'YYYY-MM-DD'), 'PENDIENTE', 0, 1),
  (${m + 1}, ${B}, '${NB}', 5, now(), to_char(now(),'YYYY-MM-DD'), 'PENDIENTE', 0, 1);`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(250); } };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const texto = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ') || '', sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const grupoDe = (id) => sql(`select coalesce(grupo_id::text,'') from customers where id=${id};`);
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-clientes', { timeout: 20000 }); await pausa(2500);
  await page.evaluate(() => sessionStorage.removeItem('clientes_pestana'));
  await page.focus('#sidebar-btn-clientes'); await tecla('Enter'); await page.waitForSelector('#buscador-clientes'); await pausa(1500);
  await page.focus('#buscador-clientes'); await page.keyboard.type(NA, { delay: 10 }); await pausa(500);
  await tecla('ArrowDown'); await tecla('Enter'); await pausa(900);

  // 1) Crear el grupo desde el detalle del cliente
  await tecla('ArrowRight', 2);
  ok('En el detalle, → → llega a "Agregar a un grupo"', (await foco()) === 'btn-detalle-cliente-grupo' && /AGREGAR A UN GRUPO/i.test(await texto('#btn-detalle-cliente-grupo')), await foco());
  await tecla('Enter'); await pausa(600);
  ok('Abre la lista de grupos con el selector en su buscador', (await foco()) === 'buscar-elegir', await foco());
  await tecla('ArrowDown');
  ok('↓ llega a "+ Crear grupo nuevo"', (await foco()) === 'elegir-extra', await foco());
  await tecla('Enter'); await pausa(500);
  ok('Enter abre "Nuevo grupo" con el selector en el nombre', (await foco()) === 'grupo-nombre', await foco());
  await page.keyboard.type(GRUPO, { delay: 10 }); await tecla('Enter'); await tecla('ArrowRight');
  ok('Enter pasa al tipo y → elige EMPRESA', (await foco()) === 'grupo-tipo-EMPRESA', await foco());
  await tecla('Enter'); await tecla('Enter'); await tecla('Enter'); await pausa(2500);
  const g = await sql(`select id||'|'||tipo from grupos_clientes where nombre='${GRUPO}';`);
  const gid = g.split('|')[0];
  ok('Servidor: grupo creado (EMPRESA) y el cliente quedó en él', g.endsWith('|EMPRESA') && (await grupoDe(A)) === gid, `${g} / ${await grupoDe(A)}`);
  ok('Se cierran las ventanas y el selector vuelve al botón del grupo, que ahora dice "Grupo: …"', (await foco()) === 'btn-detalle-cliente-grupo' && (await texto('#btn-detalle-cliente-grupo')).includes(GRUPO), `${await foco()} / ${await texto('#btn-detalle-cliente-grupo')}`);
  ok('El detalle muestra el grupo y la deuda del grupo (S/ 10.00)', /DEUDA DEL GRUPO: S\/ 10\.00/i.test(await texto('#info-grupo-cliente')), await texto('#info-grupo-cliente'));

  // 2) Ventana del grupo: agregar otro cliente
  await tecla('Enter'); await pausa(700);
  ok('Enter en "Grupo: …" abre la ventana del grupo', (await texto('#titulo-grupo')).includes(GRUPO) && (await foco()) === 'btn-grupo-cobrar', await foco());
  await tecla('ArrowRight'); await tecla('Enter'); await pausa(500);
  await page.keyboard.type(NB, { delay: 10 }); await pausa(300); await tecla('Enter'); await tecla('Enter'); await pausa(1500);
  ok('Servidor: el otro cliente entró al grupo', (await grupoDe(B)) === gid, await grupoDe(B));
  await tecla('Escape'); await pausa(700);
  ok('Esc vuelve a la ventana del grupo: 2 miembros y deuda del grupo S/ 15.00', (await page.$$eval('[data-miembro-grupo]', (x) => x.length)) === 2 && /S\/ 15\.00/.test(await texto('#deuda-grupo')), `${await page.$$eval('[data-miembro-grupo]', (x) => x.length)} / ${await texto('#deuda-grupo')}`);

  // 3) Cobrar al grupo: estado de cuenta con los créditos de los dos y el nombre de cada uno
  await page.focus('#btn-grupo-cobrar'); await tecla('Enter'); await pausa(1200);
  const nombres = await page.$$eval('[data-nombre-credito]', (x) => x.map((n) => n.innerText));
  ok('"Cobrar al grupo" abre el estado de cuenta con los 2 créditos y el nombre de cada uno', nombres.length === 2 && nombres.some((n) => n.includes(NA.split(' ').pop())) && !(await page.$('#btn-ver-historial-modal')), JSON.stringify(nombres));
  await tecla('Escape'); await pausa(800);
  ok('Esc vuelve a la ventana del grupo', (await foco()) === 'btn-grupo-cobrar', await foco());

  // 4) Sacar a un miembro (→ en su fila)
  await tecla('ArrowDown');
  const filaB = await page.evaluate((id) => { const f = [...document.querySelectorAll('[data-miembro-grupo]')]; return f.findIndex((x) => x.getAttribute('data-cliente-id') === String(id)); }, B);
  if (filaB > 0) await tecla('ArrowDown', filaB);
  await tecla('ArrowRight'); await tecla('Enter'); await pausa(500);
  ok('Sacar pide confirmación (su cuenta sigue igual)', /sacar/i.test(await aviso()) && /cuenta/i.test(await aviso()), (await aviso()).slice(0, 100));
  await tecla('Enter'); await pausa(1500);
  ok('Servidor: salió del grupo y queda 1 miembro', (await grupoDe(B)) === '' && (await page.$$eval('[data-miembro-grupo]', (x) => x.length)) === 1);

  // 5) Eliminar el grupo: el cliente queda sin grupo, su crédito sigue
  await page.focus('#btn-grupo-eliminar'); await tecla('Enter'); await pausa(500);
  ok('Eliminar grupo pide confirmación', /eliminar el grupo/i.test(await aviso()), (await aviso()).slice(0, 100));
  await tecla('Enter'); await pausa(2000);
  ok('Servidor: grupo eliminado, el cliente sin grupo y su crédito intacto', (await sql(`select count(*) from grupos_clientes where id=${gid};`)) === '0' && (await grupoDe(A)) === '' && (await sql(`select count(*) from fiados where id=${m};`)) === '1');
  ok('Se cerró la ventana del grupo y el selector sigue en el detalle', !(await page.$('#titulo-grupo')) && !!(await page.$('#titulo-detalle-cliente')) && (await foco()) !== 'BODY', await foco());
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update customers set grupo_id=null where id in (${A}, ${B}); delete from grupos_clientes where nombre='${GRUPO}'; delete from fiados where id in (${m}, ${m + 1}); delete from customers where id in (${A}, ${B});`).catch(() => {});
  console.log(res.join('\n'));
}
