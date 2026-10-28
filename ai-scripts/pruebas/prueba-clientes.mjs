// Prueba de la fase 4.1a (siumax), SOLO CON TECLADO: sección Clientes (antes Créditos) con pestañas Clientes | Créditos,
// ficha del cliente (solo el nombre obligatorio; DNI/RUC revisados; teléfono, dirección y referencia se GUARDAN),
// aviso de nombre parecido ("¿Es esta Rosa?"), documento repetido, editar, eliminar, y "Por cobrar" de la Caja abre Créditos.
// Uso: node ai-scripts/pruebas/prueba-clientes.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

// Un RUC válido (dígito verificador módulo 11) para la prueba
const rucCon = (base10) => { const p = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]; const s = p.reduce((t, w, i) => t + w * Number(base10[i]), 0); const r = 11 - (s % 11); return base10 + (r === 10 ? 0 : r === 11 ? 1 : r); };
const m = Date.now(); const corto = String(m).slice(-6);
const NOMBRE = `PRUEBA ROSA ${corto}`;
const DNI = `7${corto}1`;                       // 8 dígitos
const RUC_OK = rucCon(`2060${corto}`);
const RUC_MAL = RUC_OK.slice(0, 10) + ((Number(RUC_OK[10]) + 1) % 10);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
await page.evaluateOnNewDocument(() => { if (window.top === window) localStorage.setItem('siumax_pruebas', '1'); });
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(220); } };
const foco = () => page.evaluate(() => document.activeElement?.id || (document.activeElement?.getAttribute('data-cliente-id') ? 'fila:' + document.activeElement.getAttribute('data-cliente-id') : document.activeElement?.tagName));
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');
const escribir = async (t) => { await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.type(t, { delay: 10 }); };
const cliente = (nombre) => sql(`select coalesce(tipo_doc,'')||'|'||coalesce(dni,'')||'|'||coalesce(telefono,'')||'|'||coalesce(direccion,'')||'|'||coalesce(referencia,'') from customers where name='${nombre}';`);
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-clientes', { timeout: 20000 }); await pausa(2500);
  await page.evaluate(() => sessionStorage.removeItem('clientes_pestana'));
  const titulo = await page.evaluate(() => document.getElementById('sidebar-btn-clientes')?.getAttribute('title') || '');
  ok('El menú dice "Clientes" (antes Créditos) con Alt + 2', /^Clientes \(Alt \+ 2\)/.test(titulo) && !(await page.$('#sidebar-btn-fiados')), titulo);
  await page.focus('#sidebar-btn-clientes'); await tecla('Enter'); await pausa(2500);
  ok('Abre en la pestaña Clientes con el selector en su buscador', (await foco()) === 'buscador-clientes' && (await page.evaluate(() => document.getElementById('tab-clientes-clientes')?.getAttribute('aria-selected'))) === 'true', await foco());

  // Pestañas: ↑ a la pestaña, → a Créditos, Enter cambia; ↓ baja a su buscador
  await tecla('ArrowUp');
  ok('↑ desde el buscador sube a la pestaña Clientes', (await foco()) === 'tab-clientes-clientes', await foco());
  await tecla('ArrowRight');
  ok('→ mueve a la pestaña Créditos SIN cambiarla todavía', (await foco()) === 'tab-clientes-creditos' && !!(await page.$('#buscador-clientes')), await foco());
  await tecla('Enter'); await pausa(800);
  ok('Enter abre Créditos (la de siempre) con el selector en su buscador', (await foco()) === 'buscador-global-fiados' && !(await page.$('#buscador-clientes')) && /POR COBRAR/i.test(await page.evaluate(() => document.body.innerText)), await foco());
  await tecla('ArrowUp');
  ok('↑ desde el buscador de Créditos sube a su pestaña', (await foco()) === 'tab-clientes-creditos', await foco());
  await tecla('ArrowLeft'); await tecla('Enter'); await pausa(800);
  ok('← y Enter vuelven a Clientes', (await foco()) === 'buscador-clientes', await foco());

  // Nuevo cliente: la barra se recorre con →
  await tecla('ArrowRight', 3);
  ok('→ → → recorre la barra hasta "Nuevo cliente"', (await foco()) === 'btn-nuevo-cliente', await foco());
  await tecla('Enter'); await pausa(500);
  ok('Enter abre la ficha con el selector en el nombre', (await foco()) === 'ficha-nombre', await foco());
  await tecla('Enter'); await pausa(200);
  ok('Sin nombre: Guardar avisa', true); // (se prueba abajo con Guardar)
  ok('Enter pasa al documento ("Sin documento" marcado)', (await foco()) === 'ficha-tipo-NINGUNO' && (await page.evaluate(() => document.getElementById('ficha-tipo-NINGUNO')?.getAttribute('aria-checked'))) === 'true', await foco());
  await tecla('ArrowDown', 4);
  ok('Sin documento se salta el número: ↓ ↓ ↓ ↓ llega a Guardar', (await foco()) === 'btn-guardar-ficha', await foco());
  await tecla('Enter'); await pausa(400);
  ok('Sin nombre no se guarda: avisa', /nombre/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(400);
  ok('Tras el aviso vuelve al nombre', (await foco()) === 'ficha-nombre', await foco());
  await page.keyboard.type(NOMBRE.toLowerCase(), { delay: 10 }); await tecla('Enter'); await pausa(200);
  await tecla('ArrowRight'); await pausa(200);
  ok('→ elige DNI y aparece el número', (await foco()) === 'ficha-tipo-DNI' && !!(await page.$('#ficha-numero')), await foco());
  await tecla('Enter'); await page.keyboard.type('1234567'); await tecla('Enter');
  ok('Enter en el número pasa al teléfono', (await foco()) === 'ficha-telefono', await foco());
  await page.keyboard.type('987 654 321'); await tecla('Enter'); await page.keyboard.type('Jr. Lima 123'); await tecla('Enter');
  await page.keyboard.type('vecina del 2do piso'); await tecla('Enter');
  ok('Enter en la referencia llega a Guardar', (await foco()) === 'btn-guardar-ficha', await foco());
  await tecla('Enter'); await pausa(400);
  ok('DNI de 7 números: avisa "8 números"', /8 n/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(400);
  ok('Tras el aviso vuelve al número', (await foco()) === 'ficha-numero', await foco());
  await escribir(DNI); await page.focus('#btn-guardar-ficha'); await tecla('Enter'); await pausa(2000);
  ok('Guardado: la ficha se cierra', !(await page.$('#ficha-nombre')));
  const guardado = await cliente(NOMBRE.toLowerCase());
  ok('Servidor: guardó DNI, TELÉFONO, dirección y referencia', guardado === `DNI|${DNI}|987 654 321|Jr. Lima 123|vecina del 2do piso`, guardado);

  // ¿Es esta Rosa? Otro con nombre parecido → Cancelar no guarda
  await page.focus('#btn-nuevo-cliente'); await tecla('Enter'); await pausa(500);
  await page.keyboard.type(`${NOMBRE} PÉREZ`); await page.focus('#btn-guardar-ficha'); await tecla('Enter'); await pausa(500);
  const parecido = await aviso();
  ok('Nombre parecido: pregunta "¿Es OTRA persona?" mostrando el que existe y su referencia', /parecido/i.test(parecido) && parecido.includes(NOMBRE.toLowerCase()) && /vecina del 2do piso/i.test(parecido), parecido.slice(0, 120));
  await tecla('Escape'); await pausa(500);
  ok('Cancelar: no se guarda y vuelve al nombre', (await foco()) === 'ficha-nombre' && (await sql(`select count(*) from customers where name='${NOMBRE} PÉREZ';`)) === '0', await foco());

  // RUC: inválido avisa; DNI repetido avisa; RUC válido se guarda
  await escribir(`PRUEBA FERRETERIA ${corto} SAC`); await tecla('Enter'); await tecla('ArrowRight', 2); await pausa(200);
  ok('→ → elige RUC', (await foco()) === 'ficha-tipo-RUC', await foco());
  await tecla('Enter'); await page.keyboard.type(RUC_MAL); await page.focus('#btn-guardar-ficha'); await tecla('Enter'); await pausa(400);
  ok('RUC con el último número mal: avisa que no es válido', /no es v[aá]lido/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(300);
  await tecla('ArrowLeft'); await pausa(200); // (en el número: nada que hacer con ←)
  await page.focus('#ficha-tipo-RUC'); await tecla('ArrowLeft'); await tecla('Enter'); await escribir(DNI);
  await page.focus('#btn-guardar-ficha'); await tecla('Enter'); await pausa(400);
  ok('DNI que ya es de otro cliente: avisa de quién es', /ya es de/i.test(await aviso()) && (await aviso()).includes(NOMBRE.toLowerCase()), await aviso());
  await tecla('Enter'); await pausa(300);
  await page.focus('#ficha-tipo-DNI'); await tecla('ArrowRight'); await tecla('Enter'); await escribir(RUC_OK);
  await page.focus('#btn-guardar-ficha'); await tecla('Enter'); await pausa(2000);
  ok('RUC válido: se guarda como RUC', (await cliente(`PRUEBA FERRETERIA ${corto} SAC`)).startsWith(`RUC|${RUC_OK}|`), await cliente(`PRUEBA FERRETERIA ${corto} SAC`));

  // Buscar por teléfono y editar con → (botón Editar de la fila)
  await page.focus('#buscador-clientes'); await escribir('987 654 321'); await pausa(500);
  const filas = await page.$$eval('[data-fila-cliente="true"]', (f) => f.map((x) => x.innerText.replace(/\s+/g, ' ')));
  ok('El buscador encuentra por teléfono y la fila muestra DNI, teléfono y referencia', filas.length === 1 && filas[0].includes(DNI) && /vecina del 2do piso/i.test(filas[0]), JSON.stringify(filas).slice(0, 160));
  await tecla('ArrowDown'); await tecla('ArrowRight');
  ok('↓ a la fila y → llega a Editar', (await page.evaluate(() => document.activeElement?.getAttribute('data-accion-cliente'))) === 'editar');
  await tecla('Enter'); await pausa(500);
  ok('Editar abre la ficha con sus datos', (await page.$eval('#ficha-telefono', (i) => i.value)) === '987 654 321' && (await page.$eval('#ficha-numero', (i) => i.value)) === DNI);
  await page.focus('#ficha-referencia'); await escribir('vecina del 3er piso'); await tecla('Enter'); await tecla('Enter'); await pausa(2000);
  ok('Servidor: la referencia se actualizó', (await cliente(NOMBRE.toLowerCase())).endsWith('|vecina del 3er piso'), await cliente(NOMBRE.toLowerCase()));
  const tras = await foco();
  ok('Al guardar, el selector vuelve a la fila (o a su botón)', /^fila:|^$|BUTTON/.test(tras) || (await page.evaluate(() => !!document.activeElement?.closest('[data-fila-cliente="true"]'))), tras);

  // Eliminar con → → y confirmar
  await page.focus('#buscador-clientes'); await escribir(`PRUEBA FERRETERIA ${corto}`); await pausa(500);
  await tecla('ArrowDown'); await tecla('ArrowRight', 2);
  ok('→ → llega a Eliminar', (await page.evaluate(() => document.activeElement?.getAttribute('data-accion-cliente'))) === 'eliminar');
  await tecla('Enter'); await pausa(500);
  ok('Pregunta antes de eliminar', /eliminar/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(2000);
  ok('Servidor: el cliente se eliminó', (await sql(`select count(*) from customers where name='PRUEBA FERRETERIA ${corto} SAC';`)) === '0');

  // "Por cobrar" de la Caja abre la pestaña Créditos
  await page.focus('#sidebar-btn-pos'); await tecla('Enter'); await page.waitForSelector('#buscador-global-pos'); await pausa(1500);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /POR COBRAR|NADIE/i.test(b.innerText) || /deudas/i.test(b.title))?.click());
  await pausa(2000);
  ok('"Por cobrar" de la Caja abre Clientes en la pestaña Créditos', (await page.evaluate(() => document.getElementById('tab-clientes-creditos')?.getAttribute('aria-selected'))) === 'true', await foco());
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`delete from customers where name in ('${NOMBRE.toLowerCase()}', '${NOMBRE} PÉREZ', 'PRUEBA FERRETERIA ${corto} SAC');`).catch(() => {});
  console.log(res.join('\n'));
}
