// 24/11/2026 — Los 6 pedidos del dueño en Salidas de ecosistema, por navegador real y teclado.
// (1) cantidad borrable/directa, (2) buscador del detalle, (3) foco arriba, (4) tabla de
// devolución con flechas libres, (5) buscador de devoluciones, (6) etiqueta UND = 500 M.
// Solo lectura en la base: no guarda salidas ni devoluciones. Uso:
//   node ai-scripts/pruebas/verificar-6-cambios-salidas.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
const U = process.env.ECOSISTEMA_ADMIN_USUARIO, C = process.env.ECOSISTEMA_ADMIN_CLAVE;
if (!U || !C) throw new Error('Faltan credenciales de ecosistema en .env.vps');

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(120); } };
const escribir = async (t) => { await page.keyboard.type(t); await pausa(120); };

// React controla estos inputs: usar el setter nativo para que dispare onChange de verdad.
const escribirEn = async (sel, valor) => {
  await page.focus(sel);
  await page.evaluate((s, v) => {
    const el = document.querySelector(s);
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, sel, valor);
  await pausa(350);
};
const abrirSalida = async (codigo) => {
  await page.focus('#buscador-salidas');
  await escribirEn('#buscador-salidas', codigo);
  await tecla('ArrowDown', 2); await tecla('Enter'); await pausa(1000);
  await page.waitForSelector('#modal-detalle-salida-container', { timeout: 12000 });
};
const cerrarConEscape = async (veces = 1) => { for (let i = 0; i < veces; i++) { await tecla('Escape'); await pausa(350); } };

const estadoFoco = () => page.evaluate(() => {
  const d = document.getElementById('modal-detalle-salida-container');
  if (!d) return null;
  const a = document.activeElement;
  return { id: a?.id || a?.tagName || '', dentro: !!a && d.contains(a), scroll: Math.round(d.querySelector('.overflow-y-auto')?.scrollTop || 0) };
});

try {
  await page.goto('https://ecosistema123.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await escribir(U);
  await tecla('Enter'); await page.focus('#input-login-password'); await escribir(C); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 25000 }); await pausa(1200);
  ok('Login real de ecosistema con teclado', true);

  // ---------- Detalle: buscador, foco arriba, etiqueta de unidad ----------
  await page.focus('#sidebar-btn-salidas'); await tecla('Enter'); await pausa(900);
  await abrirSalida('SAL-MIG-00243');

  const buscadorDetalle = await page.evaluate(() => {
    const b = document.getElementById('buscador-materiales-detalle');
    return { existe: !!b, visible: !!b && b.getClientRects().length > 0, tamano: b?.value?.length || 0 };
  });
  ok('El detalle tiene buscador de materiales', buscadorDetalle.existe && buscadorDetalle.visible, JSON.stringify(buscadorDetalle));

  const filaDetalle = () => page.evaluate(() => {
    const tabla = [...document.querySelectorAll('#modal-detalle-salida-container table')]
      .find((t) => /Descripción/i.test(t.querySelector('thead')?.textContent || ''));
    if (!tabla) return null;
    const filas = [...tabla.querySelectorAll('tbody tr')];
    return { total: filas.length, textos: filas.map((f) => f.textContent.trim()) };
  });
  const antesDetalle = await filaDetalle();
  const termino = (antesDetalle?.textos[0] || 'MANGUERA').split(/\s+/).slice(0, 2).join(' ').slice(0, 8);
  await escribirEn('#buscador-materiales-detalle', termino);
  const filtradoDetalle = await filaDetalle();
  const coincide = (x) => x.toLowerCase().includes(termino.toLowerCase());
  ok('El buscador filtra solo los materiales de esa salida',
    !!antesDetalle && !!filtradoDetalle && filtradoDetalle.total > 0
      && filtradoDetalle.total < antesDetalle.total && filtradoDetalle.textos.every(coincide),
    JSON.stringify({ antes: antesDetalle?.total, despues: filtradoDetalle?.total, termino }));

  await page.focus('#btn-limpiar-buscador-materiales-detalle'); await tecla('Enter'); await pausa(300);
  const limpioDetalle = await filaDetalle();
  ok('El limpiador del buscador devuelve todos los materiales (con Enter)',
    !!limpioDetalle && limpioDetalle.total === antesDetalle?.total,
    JSON.stringify({ antes: antesDetalle?.total, limpio: limpioDetalle?.total }));

  const unidadDetalle = await page.evaluate(() => {
    const d = document.getElementById('modal-detalle-salida-container');
    const t = d?.textContent || '';
    return { und: t.includes('1 UND = 500 M'), metro: /METRO/.test(t) };
  });
  ok('El detalle muestra «UND / 1 UND = 500 M» y ya no dice METRO',
    unidadDetalle.und && !unidadDetalle.metro, JSON.stringify(unidadDetalle));

  const focoApertura = await estadoFoco();
  ok('Al abrir el detalle el foco queda arriba y la vista no baja',
    !!focoApertura && focoApertura.dentro && focoApertura.scroll === 0, JSON.stringify(focoApertura));

  await page.mouse.click(4, 4); await pausa(500);
  const focoTrasClic = await estadoFoco();
  ok('Un clic afuera no baja el foco ni el scroll',
    !!focoTrasClic && focoTrasClic.dentro && focoTrasClic.scroll === 0, JSON.stringify(focoTrasClic));

  // La misma comprobación de unidad dentro de Devolver, en esta salida que sí tiene mangueras.
  await page.focus('#btn-abrir-devoluciones'); await tecla('Enter'); await pausa(700);
  const unidadDevManguera = await page.evaluate(() => {
    const d = document.getElementById('modal-devoluciones-flotante-container');
    const t = d?.textContent || '';
    return { und: t.includes('1 UND = 500 M'), metro: /METRO/.test(t) };
  });
  ok('Devoluciones muestra «UND / 1 UND = 500 M» y ya no dice METRO',
    unidadDevManguera.und && !unidadDevManguera.metro, JSON.stringify(unidadDevManguera));
  await cerrarConEscape(); await pausa(300);

  // ---------- Cantidad directa en «Continuar salida» ----------
  await page.focus('#btn-continuar-salida'); await tecla('Enter'); await pausa(1200);
  const idCantidad = await page.evaluate(() => document.querySelector('[id^="input-cantidad-item-"]')?.id || '');
  ok('«Continuar salida» trae las cantidades en campos editables', !!idCantidad, idCantidad);
  if (idCantidad) {
    await page.focus(`#${idCantidad}`);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await tecla('Backspace');
    const borrado = await page.$eval(`#${idCantidad}`, (e) => e.value);
    await escribir('7');
    const escrito = await page.$eval(`#${idCantidad}`, (e) => e.value);
    await tecla('Tab'); await pausa(250);
    const final = await page.$eval(`#${idCantidad}`, (e) => e.value);
    ok('La cantidad se puede borrar y escribir directo, sin + ni -',
      borrado === '' && escrito === '7' && final === '7', JSON.stringify({ borrado, escrito, final }));
  }
  await cerrarConEscape(); await pausa(500);

  // ---------- Devoluciones: buscador, flechas y etiqueta ----------
  await abrirSalida('SAL-MIG-00141');
  await page.focus('#btn-abrir-devoluciones'); await tecla('Enter'); await pausa(900);
  const modalDev = await page.$('#modal-devoluciones-flotante-container');
  ok('La ventana de devoluciones abre con teclado', !!modalDev);

  const estadoDev = await page.evaluate(() => {
    const d = document.getElementById('modal-devoluciones-flotante-container');
    const tabla = d?.querySelector('table[data-tabla-campos="true"]');
    const b = document.getElementById('buscador-materiales-devolucion');
    const inputs = [...(d?.querySelectorAll('input[data-devolver]:not([disabled])') || [])];
    return {
      buscador: !!b && b.getClientRects().length > 0,
      marcada: !!tabla,
      activos: inputs.length,
      primero: inputs[0]?.id || '',
    };
  });
  ok('Devoluciones tiene buscador y la tabla está marcada para liberar flechas',
    estadoDev.buscador && estadoDev.marcada, JSON.stringify(estadoDev));
  ok('Hay campos de devolución habilitados para probar las flechas', estadoDev.activos > 1, JSON.stringify(estadoDev));

  const filaDev = () => page.evaluate(() => {
    const tabla = document.querySelector('#modal-devoluciones-flotante-container table[data-tabla-campos]');
    if (!tabla) return null;
    const filas = [...tabla.querySelectorAll('tbody tr')];
    return { total: filas.length, textos: filas.map((f) => f.textContent.trim()) };
  });
  const antesDev = await filaDev();
  const terminoDev = (antesDev?.textos[0] || '').split(/\s+/).slice(0, 2).join(' ').slice(0, 8) || 'MANGUERA';
  await escribirEn('#buscador-materiales-devolucion', terminoDev);
  const filtradoDev = await filaDev();
  ok('El buscador de devoluciones filtra solo los materiales de esa salida',
    !!antesDev && !!filtradoDev && filtradoDev.total > 0 && filtradoDev.total < antesDev.total
      && filtradoDev.textos.every((x) => x.toLowerCase().includes(terminoDev.toLowerCase())),
    JSON.stringify({ antes: antesDev?.total, despues: filtradoDev?.total, termino: terminoDev }));

  await page.focus('#btn-limpiar-buscador-materiales-devolucion'); await tecla('Enter'); await pausa(300);
  const limpioDev = await filaDev();
  ok('El limpiador del buscador devuelve todos los materiales de devolución',
    !!limpioDev && limpioDev.total === antesDev?.total, JSON.stringify({ antes: antesDev?.total, limpio: limpioDev?.total }));

  if (estadoDev.primero) {
    await page.focus(`#${estadoDev.primero}`);
    const inicio = await page.evaluate(() => document.activeElement?.id || '');
    await tecla('ArrowDown'); await pausa(350);
    const despues = await page.evaluate(() => ({
      id: document.activeElement?.id || '',
      esDevolver: !!document.activeElement?.matches?.('input[data-devolver]'),
    }));
    ok('Las flechas bajan entre campos de devolución (no se quedan en la fila)',
      despues.esDevolver && despues.id !== inicio, JSON.stringify({ inicio, despues }));
  }
  await cerrarConEscape(); await pausa(400);

  // ---------- Tamaños de pantalla ----------
  for (const [w, h] of [[390, 844], [768, 900], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(400);
    const vista = await page.evaluate(() => {
      const d = document.getElementById('modal-detalle-salida-container');
      const b = document.getElementById('buscador-materiales-detalle');
      if (!d || !b) return null;
      const r = b.getBoundingClientRect();
      return {
        visible: r.width > 0 && r.height > 0,
        desbordes: [...d.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0
          && getComputedStyle(e).overflowX !== 'auto').length,
      };
    });
    ok(`${w}px: buscador visible y sin desbordes`, !!vista && vista.visible && vista.desbordes === 0, JSON.stringify(vista));
  }
  await page.setViewport({ width: 1366, height: 860 }); await pausa(300);

  // ---------- Sin internet ----------
  await page.setOfflineMode(true); await pausa(400);
  const antesOffline = await filaDetalle();
  const terminoOffline = (antesOffline?.textos[0] || '').split(/\s+/).slice(0, 2).join(' ').slice(0, 8) || 'TUBO';
  await escribirEn('#buscador-materiales-detalle', terminoOffline);
  const sinInternet = await filaDetalle();
  ok('Sin internet el buscador del detalle sigue filtrando',
    !!sinInternet && sinInternet.total > 0 && sinInternet.total < antesOffline?.total
      && sinInternet.textos.every((x) => x.toLowerCase().includes(terminoOffline.toLowerCase())),
    JSON.stringify({ antes: antesOffline?.total, despues: sinInternet?.total, termino: terminoOffline }));
  await page.setOfflineMode(false);

  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  await nav.close();
  console.log(res.join('\n'));
  const buenas = res.filter((r) => r.startsWith('OK ')).length;
  console.log(`TOTAL: ${buenas}/${res.length}`);
  process.exit(buenas === res.length ? 0 : 1);
}
