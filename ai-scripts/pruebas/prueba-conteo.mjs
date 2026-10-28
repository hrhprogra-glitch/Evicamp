// Prueba de la fase 2.2 (toma de inventario) en siumax, SOLO CON TECLADO: contar a ciegas, faltante con motivo
// y justificación obligatorios, sobrante, cuadre de lotes, volver a contar, Mermas con turno, y sin internet.
// Uso: node prueba-conteo.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(proyecto, 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };

const m = Date.now();
const P = 960000 + (m % 9000), Q = P + 1;
await sql(`insert into products (id, name, category, code, price, quantity, min_stock, unit, is_active, is_synced) values
  (${P}, 'PRUEBA CONTEO ${m}', 'GENERAL', 'CNT${m}', 5, 10, 1, 'UND', 1, 1), (${Q}, 'PRUEBA DESCUADRE ${m}', 'GENERAL', 'DSC${m}', 5, 25, 1, 'UND', 1, 1);
  insert into batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, is_active, is_synced, created_at) values
  (${m}, ${P}, 4, 4, 4, 1, 'CNT-A', 1, 1, now() - interval '2 day'), (${m + 1}, ${P}, 6, 6, 12, 2, 'CNT-B', 1, 1, now() - interval '1 day'),
  (${m + 2}, ${Q}, 22, 22, 22, 1, 'DSC-A', 1, 1, now());`);
const estado = async (id) => sql(`select quantity from products where id=${id}; select string_agg(document_ref||'='||quantity, ',' order by created_at) from batches where product_id=${id} and is_active<>0;`).then((r) => r.replace(/\n/g, ' | '));

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
await page.evaluateOnNewDocument(() => localStorage.setItem('siumax_pruebas', '1'));
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-ajuste-prod-item') || document.activeElement?.tagName);
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(150); } };
const texto = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText || '', sel);
const aviso = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '');

// Cuenta un producto con teclado: buscar por código, cantidad, Enter
// (Conteos: el admin puede las dos cosas → pregunta "¿Qué pasó?"; → elige "CONTEO". El admin ve el lote: se deja
// en "Automático" y ↓ baja a "¿Cuántos hay?")
const contar = async (codigo, cantidad) => {
  await page.waitForSelector('#input-buscar-ajuste'); await page.focus('#input-buscar-ajuste');
  await page.keyboard.type(codigo, { delay: 15 }); await pausa(300); await tecla('Enter'); await pausa(400);
  const f1 = await foco();
  if (f1 === 'modo-ajuste-SALIDA') await tecla('ArrowRight');
  const f2 = await foco();
  await tecla('Enter'); await pausa(200);
  const f3 = await foco();
  if (f3 === 'lote-ajuste-elegido') await tecla('ArrowDown');
  const f4 = await foco();
  await page.keyboard.type(String(cantidad)); await tecla('Enter'); await pausa(1200);
  return { f1, f2, f3, f4 };
};
try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(20000); // precarga

  await page.focus('#sidebar-btn-inventario'); await tecla('Enter'); await page.waitForSelector('#btn-proveedores'); await pausa(1500);
  const tituloMenu = await page.evaluate(() => document.getElementById('sidebar-btn-conteos')?.getAttribute('title') || '');
  ok('El menú dice "Conteos" (ya no "Mermas")', /^Conteos/.test(tituloMenu) && !(await page.$('#sidebar-btn-mermas')), tituloMenu);
  await page.focus('#sidebar-btn-conteos'); await tecla('Enter'); await page.waitForSelector('#btn-nuevo-ajuste'); await pausa(1500);
  // En Conteos: un solo botón, "Nuevo ajuste"
  ok('Conteos: un solo botón (ya no están "Registrar merma" ni "Contar")', !(await page.$('#btn-registrar-merma')) && !(await page.$('#btn-toma-inventario')) && /NUEVO AJUSTE/i.test(await texto('#btn-nuevo-ajuste')));
  await page.focus('#btn-nuevo-ajuste'); await tecla('Enter'); await pausa(600);
  ok('Enter abre "Nuevo ajuste" con el selector en el buscador', (await foco()) === 'input-buscar-ajuste', await foco());
  const hayLista = () => page.evaluate(() => !!document.querySelector('[data-ajuste-prod-item="true"]'));
  ok('Al abrir, la lista de productos NO se despliega sola', !(await hayLista()));
  await tecla('ArrowDown'); await pausa(200);
  ok('↓ en el buscador vacío despliega todos y va al primero', (await hayLista()) && (await foco()) === 'true', await foco());
  await tecla('ArrowUp'); await tecla('ArrowUp'); await pausa(200);
  ok('↑ ↑ vuelve a la X y la lista se cierra', (await foco()) === 'btn-cerrar-ajuste' && !(await hayLista()), await foco());
  await tecla('ArrowDown'); await pausa(200);
  ok('↓ desde la X vuelve al buscador sin desplegar la lista', (await foco()) === 'input-buscar-ajuste' && !(await hayLista()), await foco());
  await page.keyboard.type(`CNT${m}`, { delay: 15 }); await pausa(400);
  const lista = await texto('[data-ajuste-prod-item="true"]');
  ok('A ciegas: la lista de productos NO muestra el stock', lista.includes(`PRUEBA CONTEO ${m}`) && !/\b10\b|stock/i.test(lista), JSON.stringify(lista));
  await page.evaluate(() => { const i = document.getElementById('input-buscar-ajuste'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.focus('#input-buscar-ajuste'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace');

  // 1) FALTANTE: contó 7, el sistema dice 10
  const f1 = await contar(`CNT${m}`, 7);
  ok('Enter en el buscador elige el producto y pregunta "¿Qué pasó?" (MERMA marcada)', f1.f1 === 'modo-ajuste-SALIDA', f1.f1);
  ok('→ elige CONTEO; el admin pasa por el lote (Automático) y ↓ llega a "¿Cuántos hay?"', f1.f2 === 'modo-ajuste-CONTEO' && f1.f3 === 'lote-ajuste-elegido' && f1.f4 === 'input-contado', JSON.stringify(f1));
  ok('Muestra "Faltan 3 UND" y el selector va al primer motivo', /FALTAN 3 UND/i.test(await texto('#ajuste-diferencia')) && (await foco()) === 'motivo-ajuste-0', `${await texto('#ajuste-diferencia')} / ${await foco()}`);
  // Sin motivo: Guardar avisa
  await tecla('ArrowDown'); await tecla('ArrowDown');
  ok('↓ ↓ llega a "Guardar ajuste"', (await foco()) === 'btn-guardar-ajuste', await foco());
  await tecla('Enter'); await pausa(500);
  ok('Sin motivo no se guarda: avisa', /motivo/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(500);
  ok('Tras el aviso, el selector vuelve a los motivos', (await foco()) === 'motivo-ajuste-0', await foco());
  await tecla('ArrowRight'); await tecla('Enter'); await pausa(300);
  ok('→ y Enter elige "PÉRDIDA" y pasa a la justificación', (await foco()) === 'input-justificacion-ajuste' && (await page.evaluate(() => document.getElementById('motivo-ajuste-1')?.getAttribute('aria-selected'))) === 'true', await foco());
  await tecla('Enter'); await pausa(200); await tecla('Enter'); await pausa(500);
  ok('Sin justificación no se guarda: avisa', /justificaci/i.test(await aviso()), await aviso());
  await tecla('Enter'); await pausa(500);
  ok('Tras el aviso, el selector vuelve a la justificación', (await foco()) === 'input-justificacion-ajuste', await foco());
  await page.keyboard.type('no estaban en el estante', { delay: 10 }); await tecla('Enter');
  ok('Enter en la justificación pasa a Guardar', (await foco()) === 'btn-guardar-ajuste', await foco());
  await tecla('Enter'); await pausa(2000);
  ok('Guardado: el selector vuelve al buscador y aparece en "Contados ahora"', (await foco()) === 'input-buscar-ajuste' && /MERMA/.test(await texto('[data-ajuste-fila="true"]')), `${await foco()} / ${await texto('[data-ajuste-fila="true"]')}`);
  let s = await estado(P);
  ok('Servidor: stock 7 y los 3 salieron del lote más antiguo (A 4→1)', s === '7 | CNT-A=1,CNT-B=6', s);
  const w = await sql(`select string_agg(quantity||':'||reason||':'||notes||':'||origen||':'||conteo_sistema||'/'||conteo_contado||':'||"user", ' ; ') from waste where product_id=${P};`);
  ok('Conteos: queda con motivo, justificación, lo contado y QUIÉN', /-3:PÉRDIDA:no estaban en el estante:CONTEO:10\/7:Administrador/.test(w), w);

  // 2) CUADRA (lotes descuadrados 22 vs stock 25): se guarda solo y cuadra los lotes
  await contar(`DSC${m}`, 25); await pausa(1200);
  s = await estado(Q);
  ok('Contar lo mismo que el sistema se guarda solo ("Cuadra") y los lotes quedan = stock', s === '25 | DSC-A=25' && (await foco()) === 'input-buscar-ajuste', `${s} / ${await foco()}`);

  // 3) SOBRANTE: contó 9 (sistema 7)
  await contar(`CNT${m}`, 9);
  ok('Muestra "Sobran 2 UND" con los motivos de sobrante', /SOBRAN 2 UND/i.test(await texto('#ajuste-diferencia')) && /NO INGRESADO/.test(await texto('#motivo-ajuste-0')), await texto('#ajuste-diferencia'));
  await tecla('Enter'); await page.keyboard.type('llegaron sin registrar', { delay: 10 }); await tecla('Enter'); await tecla('Enter'); await pausa(2000);
  s = await estado(P);
  ok('Servidor: stock 9 y los 2 entraron al último lote (B 6→8)', s === '9 | CNT-A=1,CNT-B=8', s);

  // 4) VOLVER A CONTAR: contó 5 por error, vuelve a contar 9
  await contar(`CNT${m}`, 5);
  await tecla('ArrowDown'); await tecla('ArrowDown'); await tecla('ArrowLeft');
  ok('← desde Guardar llega a "Volver a contar"', (await foco()) === 'btn-recontar', await foco());
  await tecla('Enter'); await pausa(300);
  ok('"Volver a contar" deja escribir otra vez la cantidad', (await foco()) === 'input-contado' && !(await page.$('#ajuste-diferencia')), await foco());
  await page.keyboard.type('9'); await tecla('Enter'); await pausa(2000);
  s = await estado(P);
  ok('Recontado 9 = sistema: cuadra, no cambia nada', s === '9 | CNT-A=1,CNT-B=8', s);

  // 5) Esc cierra y el selector vuelve a "Contar"
  await tecla('Escape'); await pausa(500);
  ok('Esc cierra y el selector vuelve a "Nuevo ajuste"', (await foco()) === 'btn-nuevo-ajuste' && !(await page.$('#input-buscar-ajuste')), await foco());

  // 6) Mermas: el admin ve el conteo con el turno
  await pausa(2500); // Mermas se recarga sola al contar
  const filas = await page.evaluate((nombre) => [...document.querySelectorAll('div[data-row="true"]')].filter((f) => f.innerText.includes(nombre)).map((f) => f.innerText.replace(/\s+/g, ' ')), `PRUEBA CONTEO ${m}`);
  ok('Conteos muestra el faltante y el sobrante del conteo', filas.some((f) => /CONTEO · FALTANTE/i.test(f) && /PÉRDIDA/.test(f)) && filas.some((f) => /CONTEO · SOBRANTE/i.test(f) && /\+2/.test(f)), JSON.stringify(filas).slice(0, 400));
  ok('Cada uno con lo contado, la justificación y el turno', filas.some((f) => /CONTÓ 7 · SISTEMA 10/i.test(f) && /no estaban en el estante/i.test(f) && /TURNO:/i.test(f)), JSON.stringify(filas).slice(0, 400));
  // Corregir el faltante (PÉRDIDA → DAÑADO) con teclado: solo motivo y justificación
  await page.evaluate((nombre) => [...document.querySelectorAll('div[data-row="true"]')].find((f) => f.innerText.includes(nombre) && /PÉRDIDA/.test(f.innerText))?.focus(), `PRUEBA CONTEO ${m}`);
  await tecla('Enter'); await pausa(600);
  ok('Enter en un conteo abre "Corregir conteo" con el selector en su motivo (PÉRDIDA)', (await foco()) === 'motivo-editar-conteo-1' && /FALTANTE: 3/i.test(await texto('#detalle-editar-conteo')), `${await foco()} / ${(await texto('#detalle-editar-conteo')).slice(0, 80)}`);
  ok('La ventana dice que la cantidad no cambia', /la cantidad no cambia/i.test(await texto('[role="dialog"]')));
  await tecla('ArrowRight'); await tecla('Enter'); await pausa(200);
  ok('→ y Enter elige DAÑADO y pasa a la justificación', (await foco()) === 'input-justificacion-editar-conteo', await foco());
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('estaban rotos al fondo', { delay: 10 }); await tecla('Enter');
  ok('Enter pasa a "Guardar corrección"', (await foco()) === 'btn-guardar-editar-conteo', await foco());
  await tecla('Enter'); await pausa(2000);
  const filaFoco = await page.evaluate(() => document.activeElement?.getAttribute('data-row') === 'true' ? document.activeElement.innerText.replace(/s+/g, ' ') : document.activeElement?.id);
  ok('Al guardar se cierra y el selector vuelve a ESE registro (no al buscador)', !(await page.$('#btn-guardar-editar-conteo')) && /PRUEBA CONTEO/.test(filaFoco || ''), String(filaFoco).slice(0, 80));
  const corregido = await sql(`select quantity||':'||reason||':'||notes||':'||conteo_motivo_original||':'||conteo_justificacion_original||':'||conteo_editado_por from waste where product_id=${P} and conteo_contado=7;`);
  ok('Servidor: motivo y justificación nuevos, guarda lo de antes y QUIÉN corrigió; la cantidad sigue -3', corregido === '-3:DAÑADO:estaban rotos al fondo:PÉRDIDA:no estaban en el estante:Administrador SiuHub', corregido);
  ok('El stock no cambió al corregir (9)', (await sql(`select quantity from products where id=${P};`)) === '9');
  const filaCorregida = await page.evaluate((nombre) => [...document.querySelectorAll('div[data-row="true"]')].find((f) => f.innerText.includes(nombre) && /DAÑADO/.test(f.innerText))?.innerText || '', `PRUEBA CONTEO ${m}`);
  ok('Conteos muestra "Corregido por" en ese registro', /CORREGIDO POR ADMINISTRADOR/i.test(filaCorregida), filaCorregida.replace(/\s+/g, ' ').slice(0, 160));
  const cambioCantidad = await page.evaluate(async (p) => (await window.__siumaxPruebas.from('waste').update({ quantity: -1 }).eq('product_id', p).eq('conteo_contado', 7)).error?.message || null, P);
  ok('Nadie puede cambiar la cantidad de un conteo (el servidor lo rechaza)', /no se cambia/i.test(cambioCantidad || ''), String(cambioCantidad));

  // 7) SIN INTERNET: contar 6 (falta 3, ROBO)
  await page.setOfflineMode(true);
  await page.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await page.focus('#sidebar-btn-conteos'); await tecla('Enter'); await page.waitForSelector('#btn-nuevo-ajuste'); await pausa(1500);
  await page.focus('#btn-nuevo-ajuste'); await tecla('Enter'); await pausa(500);
  await contar(`CNT${m}`, 6);
  ok('Sin internet: calcula "Faltan 3 UND" con el stock de la PC', /FALTAN 3 UND/i.test(await texto('#ajuste-diferencia')), await texto('#ajuste-diferencia'));
  await tecla('Enter'); await page.keyboard.type('se perdieron sin internet', { delay: 10 }); await tecla('Enter'); await tecla('Enter'); await pausa(1500);
  ok('Sin internet: se guarda y vuelve al buscador', (await foco()) === 'input-buscar-ajuste' && /MERMA/.test(await texto('[data-ajuste-fila="true"]')), await foco());
  const local = await page.evaluate(async (p) => (await window.__siumaxPruebas.from('products').select('id, quantity').eq('id', p)).data?.[0]?.quantity, P);
  ok('Sin internet: el stock de la PC ya dice 6', Number(local) === 6, String(local));
  await tecla('Escape'); await pausa(300);
  await page.setOfflineMode(false);
  await page.evaluate(async () => { try { await window.__siumaxPruebas.from('products').select('id').limit(1); } catch {} });
  await pausa(25000);
  s = await estado(P);
  ok('Al volver: servidor con stock 6 y la merma ROBO', s === '6 | CNT-A=0,CNT-B=6' && /ROBO/.test(await sql(`select string_agg(reason, ',') from waste where product_id=${P};`)), s);
  const cola = await page.evaluate(async () => { const r = indexedDB.open('siumax-local'); return await new Promise((ok) => { r.onsuccess = () => { const t = r.result.transaction('pendientes').objectStore('pendientes').getAll(); t.onsuccess = () => ok(t.result.length); }; }); });
  ok('No quedó nada en la cola', cola === 0, String(cola));
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  await sql(`update products set is_active=0 where id in (${P},${Q}); update batches set is_active=0 where product_id in (${P},${Q});`).catch(() => {});
  console.log(res.join('\n'));
}
