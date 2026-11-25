// 230 (25/11/2026): persistencia del GENERAL de salidas en Nego.
// «Fusionar» guarda un grupo de 3, recarga y comprueba badge + botón en la tabla y «Fusionada con...»
// en el detalle; luego marca una del grupo (se marcan todas) y la desmarca (sale solo esa) y lo
// comprueba tras otra recarga. Sin internet externo (solo pasa el propio sitio). Uso:
//   node ai-scripts/pruebas/verificar-persistencia-fusion.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');

const A = 'SAL-1547';
const B = 'SAL-1548';
const TAMANOS = [[390, 844], [768, 1024], [1366, 860], [1920, 1080]];
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
page.on('pageerror', (e) => errores.push(e.message));

// El sistema no necesita internet externo: se bloquea cualquier dominio que no sea el suyo.
await page.setRequestInterception(true);
page.on('request', (req) => {
  const u = req.url();
  if (u.startsWith('https://nego.siumax.duckdns.org') || u.startsWith('data:') || u.startsWith('blob:')) req.continue();
  else req.abort().catch(() => {});
});

const tecla = async (k, n = 1) => {
  for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(110); }
};
const activo = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const existe = async (sel) => !!(await page.$(sel));
const texto = async (sel) => page.$eval(sel, (e) => e.innerText || '').catch(() => '');

const escribir = async (sel, valor) => {
  await page.focus(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(valor);
  await pausa(350);
};

const buscarSalidas = async () => {
  for (const d of ['Digit4', 'Digit3']) {
    await page.keyboard.down('Alt');
    await tecla(d);
    await page.keyboard.up('Alt');
    await pausa(1100);
    if (await existe('#buscador-salidas')) return true;
  }
  await page.focus('#sidebar-btn-salidas');
  await tecla('Enter');
  await pausa(1100);
  return existe('#buscador-salidas');
};

const cerrarDialogos = async () => {
  for (let i = 0; i < 6; i++) {
    if (!(await existe('[data-dialogo-sistema]'))) break;
    await page.focus('#dialogo-sistema-aceptar').catch(() => {});
    await tecla('Enter');
    await pausa(250);
  }
};

const cerrarVentanas = async () => {
  await cerrarDialogos();
  for (let i = 0; i < 6; i++) {
    const abiertas = await page.evaluate(() => [
      '[data-vista-previa-salida]', '[data-dialogo-sistema]',
      '#modal-fusionar-salidas-container', '#modal-detalle-salida-container',
    ].filter((s) => !!document.querySelector(s)));
    if (!abiertas.length) break;
    await tecla('Escape');
    await pausa(300);
  }
};

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('#input-login-usuario', { timeout: 30000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 30000 });
  await pausa(1200);
  ok('Se abre Salidas con teclado', await buscarSalidas(), `foco=${await activo()}`);
  await page.waitForSelector('#tabla-salidas-lista [data-fila-salida="true"]', { timeout: 30000 });

  // --- Guardar el GENERAL desde la cabecera ---
  await cerrarVentanas();
  await page.focus('#btn-fusionar-salidas');
  await tecla('Enter');
  await pausa(450);
  const tercero = await page.evaluate(() => {
    const fila = Array.from(document.querySelectorAll('#lista-fusionar-salidas tr[data-fila-fusion]'))
      .find((f) => !f.querySelector('[id^="badge-fusion-lista-"]')
        && !/SAL-1547|SAL-1548/.test(f.querySelector('td:nth-child(2)')?.innerText || ''));
    if (!fila) return null;
    return {
      codigo: ((fila.querySelector('td:nth-child(2)')?.innerText || '').match(/SAL-\d+/) || [''])[0],
      id: fila.querySelector('[id^="btn-fusion-elegir-"]')?.id || '',
    };
  });
  ok('Hay una tercera salida libre para probar que el resto sigue fusionado', !!tercero?.id, JSON.stringify(tercero));

  for (const codigo of [A, B, ...(tercero?.codigo ? [tercero.codigo] : [])]) {
    await escribir('#buscador-fusionar-salidas', codigo);
    const id = await page.evaluate(() => document.querySelector('[id^="btn-fusion-elegir-"]')?.id || '');
    ok(`Encuentra ${codigo} para fusionar`, !!id, id);
    if (!id) continue;
    const marcada = await page.$eval(`#${id}`, (e) => e.getAttribute('aria-pressed') === 'true');
    if (!marcada) {
      await page.focus(`#${id}`);
      await tecla('Enter');
    }
  }
  ok('«Ver general» ahora es el botón «Fusionar»',
    (await texto('#btn-fusion-ejecutar')).toLowerCase().includes('fusionar'),
    await texto('#btn-fusion-ejecutar'));
  await page.focus('#btn-fusion-ejecutar');
  await tecla('Enter');
  await pausa(1200);
  const avisoGuardado = await texto('#dialogo-sistema-texto');
  const codigoFusion = (avisoGuardado.match(/FUS-\d+/) || [])[0] || '';
  ok('«Fusionar» guarda y muestra el código del GENERAL', !!codigoFusion, avisoGuardado.replace(/\s+/g, ' '));
  await cerrarDialogos();
  await tecla('Escape');
  await pausa(350);

  // --- Recargar: el grupo debe seguir en la tabla y en el detalle ---
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('#buscador-salidas', { timeout: 30000 });
  await pausa(900);
  ok('Tras recargar sigue en la pantalla de Salidas', await existe('#btn-fusionar-salidas'));

  for (const [w, h] of TAMANOS) {
    await cerrarVentanas();
    await page.setViewport({ width: w, height: h });
    await pausa(300);
    const tam = `${w}px`;

    await escribir('#buscador-salidas', A);
    await pausa(250);
    const filaA = await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('[data-fila-salida="true"]'))
        .find((x) => (x.innerText || '').includes('SAL-1547'));
      if (!f) return null;
      const badge = f.querySelector('[id^="badge-fusion-"]');
      const boton = f.querySelector('[id^="btn-ver-general-fusion-"]');
      return {
        badge: badge?.textContent?.trim() || '',
        codigo: badge?.getAttribute('data-fusion-codigo') || '',
        boton: boton?.id || '',
      };
    });
    ok(`${tam}: la tabla muestra «FUSIONADA» en ${A}`, /fusionada/i.test(filaA?.badge || ''), JSON.stringify(filaA));
    ok(`${tam}: el badge trae el código guardado`, filaA?.codigo === codigoFusion, `${filaA?.codigo} vs ${codigoFusion}`);
    ok(`${tam}: la tabla ofrece «Ver general»`, !!filaA?.boton, filaA?.boton || '');

    if (!filaA?.boton) continue;
    await page.focus(`#${filaA.boton}`);
    await tecla('Enter');
    await pausa(450);
    const general = await texto('#modal-fusionar-salidas-container .ventana-cabecera__subtitulo');
    const filasGenerales = await texto('tbody[data-fusion-filas]');
    ok(`${tam}: «Ver general» abre el grupo guardado`,
      general.includes(codigoFusion) && filasGenerales.includes(A) && filasGenerales.includes(B),
      general.replace(/\s+/g, ' '));
    await tecla('Escape');
    await pausa(300);

    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('[data-fila-salida="true"]'))
        .find((x) => (x.innerText || '').includes('SAL-1547'));
      (f?.querySelector('[id^="btn-ver-salida-"]'))?.click();
    });
    await page.waitForSelector('#modal-detalle-salida-container', { timeout: 10000 });
    await pausa(300);
    const bloque = await texto('#bloque-fusion-detalle');
    const fusionados = await texto('#fusionados-detalle');
    ok(`${tam}: el detalle dice «Fusionada con…»`, /fusionada con/i.test(bloque), bloque.replace(/\s+/g, ' '));
    ok(`${tam}: el detalle nombra a la otra salida`, fusionados.includes(B), fusionados);
    ok(`${tam}: el detalle ofrece «Ver general»`, await existe('#btn-detalle-ver-general'));
    await page.focus('#btn-detalle-ver-general');
    await tecla('Enter');
    await pausa(450);
    ok(`${tam}: desde el detalle se abre el GENERAL`, await existe('#modal-fusionar-salidas-container'));
    await tecla('Escape');
    await pausa(300);
    ok(`${tam}: Escape cierra solo la fusión y deja el detalle`,
      !(await existe('#modal-fusionar-salidas-container')) && (await existe('#modal-detalle-salida-container')));
  }

  // --- Al marcar una del grupo se marcan todas; al desmarcarla se quita solo esa ---
  await cerrarVentanas();
  await page.focus('#btn-fusionar-salidas');
  await tecla('Enter');
  await pausa(450);
  const idBotonA = await page.evaluate(() => document.querySelector('[id^="btn-abrir-fusion-general-"]')?.id || '');
  ok('El modal lista el GENERAL guardado', !!idBotonA, idBotonA);

  const filaB = await page.evaluate((codigo) => {
    const fila = Array.from(document.querySelectorAll('#lista-fusionar-salidas tr[data-fila-fusion]'))
      .find((f) => (f.querySelector('td:nth-child(2)')?.innerText || '').includes(codigo));
    if (!fila) return null;
    return {
      boton: fila.querySelector('[id^="btn-fusion-elegir-"]')?.id || '',
      celda: `#lista-fusionar-salidas tr[data-fila-fusion="${fila.getAttribute('data-fila-fusion')}"] td:nth-child(3)`,
    };
  }, B);
  ok('Encuentra la fila de SAL-1548 en la lista', !!filaB?.boton, JSON.stringify(filaB));
  if (filaB?.boton) {
    // El grupo puede tener 2, 3 o más salidas según el estado de la base: se mide, no se supone.
    const esperados = await page.evaluate((boton) => {
      const codigo = document.querySelector(`#badge-fusion-lista-${boton.replace('btn-fusion-elegir-', '')}`)
        ?.getAttribute('data-fusion-codigo-lista') || '';
      return Array.from(document.querySelectorAll(`#lista-fusionar-salidas [data-fusion-codigo-lista="${codigo}"]`))
        .filter((e) => e.id.startsWith('badge-fusion-lista-')).length;
    }, filaB.boton);
    ok('Mide cuántas salidas tiene el GENERAL', esperados >= 2, `${esperados} salida(s)`);
    await page.click(filaB.celda);
    await pausa(300);
    const marcados = await page.$$eval('#lista-fusionar-salidas [id^="btn-fusion-elegir-"][aria-pressed="true"]',
      (els) => els.map((e) => e.id));
    ok('Al marcar una del grupo se marcan todas las del GENERAL',
      marcados.length === esperados && marcados.includes(filaB.boton),
      `grupo=${esperados} marcados=${marcados.length}: ${marcados.join(' | ')}`);

    await page.click(filaB.celda);
    await pausa(1400);
    const despues = await page.$$eval('#lista-fusionar-salidas [id^="btn-fusion-elegir-"][aria-pressed="true"]',
      (els) => els.map((e) => e.id));
    ok('Al desmarcar solo se quita esa salida', despues.length === esperados - 1 && !despues.includes(filaB.boton),
      `antes=${esperados} después=${despues.length}: ${despues.join(' | ')}`);
    ok('La salida desmarcada pierde su badge en la lista',
      !(await existe(`#badge-fusion-lista-${filaB.boton.replace('btn-fusion-elegir-', '')}`)));
  }
  await tecla('Escape');
  await pausa(300);

  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('#buscador-salidas', { timeout: 30000 });
  await pausa(900);
  const estadoTrasRecarga = await page.evaluate(() => {
    const buscar = (codigo) => Array.from(document.querySelectorAll('[data-fila-salida="true"]'))
      .filter((x) => (x.innerText || '').includes(codigo)).map((f) => ({
        fusion: f.querySelector('[id^="badge-fusion-"]')?.getAttribute('data-fusion-codigo') || '',
      }))[0] || null;
    return { a: buscar('SAL-1547'), b: buscar('SAL-1548') };
  });
  ok('Tras desmarcar y recargar, SAL-1547 sigue fusionada con el mismo GENERAL',
    estadoTrasRecarga.a?.fusion === codigoFusion, JSON.stringify(estadoTrasRecarga));
  ok('Tras desmarcar y recargar, SAL-1548 ya no está fusionada', !estadoTrasRecarga.b?.fusion, JSON.stringify(estadoTrasRecarga));

  ok('Sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
} catch (e) {
  ok('La prueba terminó con un error', false, String(e.message || e));
} finally {
  await nav.close();
}

console.log('\nResultado (persistencia de la fusión, solo Nego, sin internet externo):\n' + res.join('\n'));
const fallos = res.filter((r) => r.startsWith('MAL')).length;
console.log(`\nRESULTADO: ${res.length - fallos}/${res.length}`);
process.exit(fallos ? 1 : 0);
