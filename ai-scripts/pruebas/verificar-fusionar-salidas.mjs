// 230 (25/11/2026): botón «Fusionar salidas» en Nueva salida y GENERAL de solo vista.
// Verifica elegir salidas con teclado, ver todo junto, imprimir el general y que «Devolver todo»
// pida confirmación (la prueba la CANCELA: no cambia datos ni stock).
// Sin internet, en 390/768/1366/1920. Uso:
//   node ai-scripts/pruebas/verificar-fusionar-salidas.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');

const CODIGOS = ['SAL-1547', 'SAL-1548'];
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

const tecla = async (k, n = 1) => {
  for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(110); }
};
const activo = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const existe = async (sel) => !!(await page.$(sel));
const texto = async (sel) => page.$eval(sel, (e) => e.innerText || '').catch(() => '');

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

const escribir = async (sel, valor) => {
  await page.focus(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(valor);
  await pausa(350);
};

const cerrarTodo = async () => {
  for (let i = 0; i < 6; i++) {
    const abiertas = await page.evaluate(() => [
      '[data-vista-previa-salida]', '[data-dialogo-sistema]',
      '#modal-fusionar-salidas-container', '#modal-nueva-salida-container',
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

  ok('Con teclado se abre Salidas', await buscarSalidas(), `foco=${await activo()}`);
  await page.waitForSelector('#tabla-salidas-lista [data-fila-salida="true"]', { timeout: 30000 });
  await pausa(700);

  // Todo lo que sigue corre SIN internet, con los datos ya cargados en memoria.
  await page.setOfflineMode(true);
  await pausa(300);

  for (const [w, h] of TAMANOS) {
    await cerrarTodo();
    await page.setViewport({ width: w, height: h });
    await pausa(350);
    const tam = `${w}px`;

    const ubicacion = await page.evaluate(() => {
      const b = document.getElementById('btn-fusionar-salidas');
      const n = document.getElementById('btn-nueva-salida');
      if (!b || !n) return null;
      const rb = b.getBoundingClientRect();
      const rn = n.getBoundingClientRect();
      return {
        fueraDelModal: !b.closest('#modal-nueva-salida-container'),
        mismoPadre: b.parentElement === n.parentElement,
        aLaIzquierda: rb.right <= rn.left + 2 && Math.abs(rb.top - rn.top) < rn.height + 8,
        cantidad: document.querySelectorAll('#btn-fusionar-salidas').length,
      };
    });
    ok(`${tam}: «Fusionar salidas» está en la cabecera, fuera de Nueva salida`,
      !!ubicacion?.fueraDelModal && !!ubicacion?.mismoPadre, JSON.stringify(ubicacion));
    ok(`${tam}: solo existe un botón «Fusionar salidas»`, ubicacion?.cantidad === 1, JSON.stringify(ubicacion));
    ok(`${tam}: queda justo a la izquierda de «Nueva salida»`, !!ubicacion?.aLaIzquierda, JSON.stringify(ubicacion));

    await page.focus('#btn-fusionar-salidas');
    await tecla('ArrowRight');
    ok(`${tam}: → de Fusión lleva a Nueva salida`, (await activo()) === 'btn-nueva-salida', await activo());
    await tecla('ArrowLeft');
    ok(`${tam}: ← de Nueva salida vuelve a Fusión`, (await activo()) === 'btn-fusionar-salidas', await activo());
    await tecla('Enter');
    await pausa(500);
    ok(`${tam}: Enter abre la fusión SIN abrir Nueva salida`,
      await existe('#modal-fusionar-salidas-container') && !(await existe('#modal-nueva-salida-container')));
    ok(`${tam}: el buscador de salidas recibe el foco`, (await activo()) === 'buscador-fusionar-salidas', await activo());

    // 231: en la lista se ven las salidas ya fusionadas y un clic en la fila ya las elige.
    const badgesLista = await page.$$eval('#lista-fusionar-salidas [id^="badge-fusion-lista-"]', (els) =>
      els.map((e) => ({ id: e.id, codigo: e.getAttribute('data-fusion-codigo-lista') || '' })));
    ok(`${tam}: la lista marca las salidas ya fusionadas`,
      badgesLista.length > 0 && badgesLista.some((b) => /^FUS-/i.test(b.codigo)),
      badgesLista.slice(0, 3).map((b) => `${b.id}:${b.codigo}`).join(' | ') || 'sin badges');

    // El id interno no es el número del código: se busca la fila por código.
    const filaDatos = await page.evaluate((codigo) => {
      const fila = Array.from(document.querySelectorAll('#lista-fusionar-salidas tr[data-fila-fusion]'))
        .find((f) => (f.innerText || '').includes(codigo));
      if (!fila) return null;
      return {
        id: fila.getAttribute('data-fila-fusion'),
        boton: fila.querySelector('[id^="btn-fusion-elegir-"]')?.id || '',
      };
    }, CODIGOS[0]);
    if (filaDatos?.boton) {
      const boton = `#${filaDatos.boton}`;
      const celda = `#lista-fusionar-salidas tr[data-fila-fusion="${filaDatos.id}"] td:nth-child(3)`;
      const antes = await page.$eval(boton, (e) => e.getAttribute('aria-pressed') === 'true');
      await page.click(celda);
      await pausa(200);
      const despues = await page.$eval(boton, (e) => e.getAttribute('aria-pressed') === 'true');
      ok(`${tam}: clic en la fila elige ${CODIGOS[0]} sin tocar el cuadro`, despues === !antes, `antes=${antes} después=${despues}`);
      await page.click(celda);
      await pausa(200);
      ok(`${tam}: otro clic en la fila lo deselecciona`,
        (await page.$eval(boton, (e) => e.getAttribute('aria-pressed') === 'true')) === antes);
      await page.click(boton);
      await pausa(150);
      const conCuadro = await page.$eval(boton, (e) => e.getAttribute('aria-pressed') === 'true');
      ok(`${tam}: el cuadro sigue eligiendo una sola vez`, conCuadro === !antes);
      await page.click(boton);
      await pausa(150);
    } else {
      ok(`${tam}: clic en la fila elige ${CODIGOS[0]} sin tocar el cuadro`, false, 'fila no encontrada');
    }

    // Los clics dejan el foco en los cuadros: se devuelve al buscador para probar las flechas.
    await page.focus('#buscador-fusionar-salidas');
    await tecla('ArrowUp');
    ok(`${tam}: ↑ desde el buscador sube a la X`, (await activo()) === 'btn-cerrar-fusionar-salidas', await activo());
    await tecla('ArrowDown');
    ok(`${tam}: ↓ desde la X baja al buscador`, (await activo()) === 'buscador-fusionar-salidas', await activo());

    await escribir('#buscador-fusionar-salidas', CODIGOS[0]);
    await tecla('Enter');
    ok(`${tam}: Enter en el buscador no salta de campo`, (await activo()) === 'buscador-fusionar-salidas', await activo());

    for (const codigo of CODIGOS) {
      await escribir('#buscador-fusionar-salidas', codigo);
      const idBoton = await page.evaluate(() => document.querySelector('[id^="btn-fusion-elegir-"]')?.id || '');
      ok(`${tam}: el buscador encuentra ${codigo}`, !!idBoton, idBoton);
      if (!idBoton) continue;
      await page.focus(`#${idBoton}`);
      await tecla('Enter');
      await pausa(200);
      const marcada = await page.$eval(`#${idBoton}`, (e) => e.getAttribute('aria-pressed') === 'true');
      ok(`${tam}: Enter marca ${codigo} sin salir del botón`, marcada && (await activo()) === idBoton, await activo());
    }
    const contador = await page.evaluate(() => Array.from(document.querySelectorAll('#modal-fusionar-salidas-container span'))
      .map((e) => (e.textContent || '').trim())
      .find((t) => /^\d+\s+elegida\(s\)$/i.test(t)) || '');
    ok(`${tam}: quedan 2 salidas elegidas`, contador.startsWith('2'), contador || 'sin contador');

    await page.focus('#btn-fusion-ver-general');
    await tecla('Enter');
    await pausa(400);
    ok(`${tam}: Enter abre el general`, await existe('#tabla-resumen-fusion'));
    const resumen = await page.$$eval('#tabla-resumen-fusion tbody tr', (els) => els.length);
    const detalle = await page.$$eval('tbody[data-fusion-filas] tr', (els) => els.length);
    ok(`${tam}: el general muestra materiales sumados`, resumen > 0 && detalle > 0, `resumen=${resumen} detalle=${detalle}`);
    const textoDetalle = await texto('tbody[data-fusion-filas]');
    ok(`${tam}: el general trae las dos salidas`, CODIGOS.every((c) => textoDetalle.includes(c)));
    ok(`${tam}: el general muestra el pendiente`, (await texto('#total-fusion')).includes('Pendiente:'));

    const entradas = await page.$$eval('input[id^="input-devolver-fusion-"]:not([disabled])', (els) => els.map((e) => e.id));
    ok(`${tam}: hay cantidades para devolver`, entradas.length > 0, `${entradas.length} campo(s)`);
    if (entradas.length > 1) {
      await page.focus(`#${entradas[0]}`);
      await tecla('ArrowDown');
      ok(`${tam}: ↓ pasa a la siguiente cantidad`, (await activo()) === entradas[1], await activo());
      const valor = await page.$eval(`#${entradas[1]}`, (e) => e.value);
      ok(`${tam}: la flecha no cambia el valor`, valor === '', `valor="${valor}"`);
    }

    await page.focus('#btn-fusion-imprimir-general');
    await tecla('Enter');
    await pausa(650);
    ok(`${tam}: imprime el general`, await existe('[data-vista-previa-salida]'));
    const vale = await page.evaluate(() => document.querySelector('[data-vista-previa-salida] iframe')?.contentDocument?.body?.innerText || '');
    ok(`${tam}: el comprobante dice GENERAL y trae las salidas`, vale.includes('GENERAL') && CODIGOS.every((c) => vale.includes(c)),
      vale.replace(/\s+/g, ' ').slice(0, 110));
    await tecla('Escape');
    await pausa(350);
    ok(`${tam}: Escape cierra la vista previa, no la fusión`,
      !(await existe('[data-vista-previa-salida]')) && (await existe('#modal-fusionar-salidas-container')));

    // Escribir una cantidad es solo preparación: la confirmación se cancela, no se devuelve nada.
    await page.focus(`#${entradas[0]}`);
    await page.keyboard.type('1');
    await pausa(200);
    ok(`${tam}: se puede escribir la cantidad a devolver`,
      (await page.$eval(`#${entradas[0]}`, (e) => e.value)) === '1');
    await page.focus('#btn-fusion-devolver-todo');
    await tecla('Enter');
    await pausa(400);
    ok(`${tam}: «Devolver todo» pide confirmación`, await existe('[data-dialogo-sistema]'));
    const aviso = await texto('#dialogo-sistema-texto');
    ok(`${tam}: la confirmación dice cuántas salidas`, aviso.includes('salida(s)'), aviso.replace(/\s+/g, ' ').slice(0, 110));
    await page.focus('#dialogo-sistema-cancelar');
    await tecla('Enter');
    await pausa(350);
    ok(`${tam}: cancelar no devuelve nada y sigue en el general`,
      !(await existe('[data-dialogo-sistema]')) && (await existe('#tabla-resumen-fusion')));

    const chips = await page.$$eval('[id^="btn-desvincular-salida-"]', (els) => els.map((e) => ({
      id: e.id, texto: e.parentElement?.innerText || '',
    })));
    const quitar = chips.find((c) => c.texto.includes(CODIGOS[1]));
    ok(`${tam}: el general ofrece desvincular ${CODIGOS[1]}`, !!quitar,
      chips.map((c) => c.texto.replace(/\s+/g, ' ')).join(' | '));
    if (quitar) {
      await page.focus(`#${quitar.id}`);
      await tecla('Enter');
      await pausa(350);
      const quedo = await texto('tbody[data-fusion-filas]');
      const restantes = await page.$$eval('[id^="btn-desvincular-salida-"]', (els) => els.length);
      ok(`${tam}: desvincular quita ${CODIGOS[1]} y deja ${CODIGOS[0]}`,
        !quedo.includes(CODIGOS[1]) && quedo.includes(CODIGOS[0]));
      ok(`${tam}: solo queda 1 salida en el general`, restantes === 1, `${restantes} salida(s)`);
      const subt = await texto('#modal-fusionar-salidas-container .ventana-cabecera__subtitulo');
      ok(`${tam}: el aviso dice 1 salida`, subt.toLowerCase().includes('1 salida(s)'), subt);
    }

    await tecla('Escape');
    await pausa(350);
    ok(`${tam}: Escape cierra la fusión y vuelve a la lista de Salidas`,
      !(await existe('#modal-fusionar-salidas-container')) && (await existe('#btn-nueva-salida')));

    await escribir('#buscador-salidas', CODIGOS[1]);
    await pausa(300);
    const sigue = await page.evaluate((codigo) => Array.from(document.querySelectorAll('[data-fila-salida="true"]'))
      .some((f) => (f.innerText || '').includes(codigo)), CODIGOS[1]);
    ok(`${tam}: desvincular no borra la salida real`, sigue);
  }

  ok('Sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
} catch (e) {
  ok('La prueba terminó con un error', false, String(e.message || e));
} finally {
  await nav.close();
}

console.log('\nResultado (fusión de salidas, solo Nego, sin internet):\n' + res.join('\n'));
const fallos = res.filter((r) => r.startsWith('MAL')).length;
console.log(`\nRESULTADO: ${res.length - fallos}/${res.length}`);
process.exit(fallos ? 1 : 0);
