// Prueba (siumax): al cerrar una ventana, el selector vuelve a la fila que estaba seleccionada (no al buscador),
// en todas las sesiones. Selecciona la 2.ª fila, Enter abre su ventana, Esc la cierra y revisa dónde quedó.
// Uso: node prueba-seleccion.mjs <carpeta tools> <carpeta del proyecto>
import { createRequire } from 'node:module'; import path from 'node:path';
const [tools, proyecto] = process.argv.slice(2);
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(proyecto, '.env.vps'));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 860 } });
const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const hayVentana = () => page.evaluate(() => [...document.querySelectorAll('[role="dialog"], .fixed.inset-0')].some((v) => v.getClientRects().length && !v.closest('[data-fondo-menu]')));
const textoFila = (el) => (el?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60);

// Enfoca la fila n (visible) de la sesión, Enter, espera la ventana, Esc, y dice dónde quedó el selector
const probar = async (nombre, { sidebar, pestana, selector = '[data-row="true"]', n = 1, cerrar = 'Escape', texto = '' }) => {
  try {
    await page.focus(`#sidebar-btn-${sidebar}`); await page.keyboard.press('Enter'); await pausa(2500);
    if (pestana) { await page.focus(pestana); await page.keyboard.press('Enter'); await pausa(2500); }
    const elegido = await page.evaluate((sel, i, txt) => {
      const filas = [...document.querySelectorAll(sel)].filter((f) => f.getClientRects().length && (!txt || new RegExp(txt).test(f.innerText)));
      const f = filas[Math.min(i, filas.length - 1)]; if (!f) return null;
      f.focus(); return (f.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    }, selector, n, texto);
    if (!elegido) { ok(`${nombre}: no hay filas para probar`, false); return; }
    await page.keyboard.press('Enter'); await pausa(1200);
    if (!(await hayVentana())) { ok(`${nombre}: Enter no abrió ninguna ventana`, false, elegido); return; }
    await page.keyboard.press(cerrar); await pausa(1200);
    const ahora = await page.evaluate(() => { const a = document.activeElement; return { id: a?.id || '', fila: a?.getAttribute('data-row') === 'true' || (a?.tagName === 'TR' && a?.getAttribute('role') === 'button'), texto: (a?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60) }; });
    ok(`${nombre}: al cerrar, el selector vuelve a la fila elegida`, ahora.fila && ahora.texto === elegido, `elegida "${elegido.slice(0, 40)}" → quedó ${ahora.fila ? `fila "${ahora.texto.slice(0, 40)}"` : `"${ahora.id || 'nada'}"`}`);
  } catch (e) { ok(`${nombre}: sin fallas`, false, e.message); }
};

try {
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 }); await pausa(4000);

  await probar('Inventario · Productos (editar producto)', { sidebar: 'inventario', pestana: '#btn-tab-productos' });
  await probar('Inventario · Lotes (editar lote)', { sidebar: 'inventario', pestana: '#btn-tab-lotes' });
  await probar('Conteos (editar registro)', { sidebar: 'conteos' });
  await probar('Clientes · Créditos (estado de cuenta)', { sidebar: 'clientes', pestana: '#tab-clientes-creditos', selector: 'tr[role="button"]' });
  await probar('Clientes · Clientes (detalle del cliente)', { sidebar: 'clientes', pestana: '#tab-clientes-clientes', selector: '[data-fila-cliente="true"]' });
  await probar('Finanzas (detalle de un ticket)', { sidebar: 'finanzas', texto: 'VENDI', n: 0 });
  await probar('Utilidades (detalle de producto)', { sidebar: 'utilidades' });
} catch (e) { ok('Sin fallas', false, e.stack || e.message); }
finally {
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
  await nav.close();
  console.log(res.join('\n'));
}
