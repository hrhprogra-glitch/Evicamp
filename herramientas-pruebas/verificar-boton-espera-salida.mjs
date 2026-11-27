// Solo lectura (NO escribe en la base): abre Nueva salida con el bundle LOCAL, intercepta
// fn_registrar_salida y comprueba el botón nuevo «Espera» al lado de la X.
// Verifica: X y Esc siguen cerrando, no hay «Cancelar (Esc)», F10 sigue dando comprobante,
// «Espera» guarda una sola vez, no abre comprobante y deja el formulario listo para otra.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
process.loadEnvFile('E:/Programacion/siumax/.env.vps');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.argv[2] || 'https://nego.siumax.duckdns.org';
const DIST = process.env.BUNDLE_DIR || 'C:/Users/ADMIN/.local/share/opencode/worktree/05da08/siumax-direccion/dist/assets';
const JS_LOCAL = readdirSync(DIST).find((n) => /^index-.*\.js$/.test(n));
const CSS_LOCAL = readdirSync(DIST).find((n) => /^index-.*\.css$/.test(n));
console.log('bundle local:', JS_LOCAL, '/', CSS_LOCAL);

const resultados = [];
const check = (nombre, ok, detalle = '') => {
  resultados.push(!!ok);
  console.log(`${ok ? 'OK' : 'FALLO'} - ${nombre}${detalle ? ` (${detalle})` : ''}`);
};

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox'] });
try {
  const page = await nav.newPage();
  const errores = [];
  let llamadasRpc = 0;
  page.on('pageerror', (e) => errores.push(e.message));
  await page.setViewport({ width: 1437, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname.includes('/rpc/fn_registrar_salida')) {
      llamadasRpc++;
      setTimeout(() => req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 999999999 + llamadasRpc, codigo: `SAL-PRUEBA-${llamadasRpc}` }),
      }), 800);
      return;
    }
    const nombre = url.pathname.split('/').pop() || '';
    if (url.pathname.includes('/assets/') && /^index-.*\.(js|css)$/.test(nombre)) {
      const local = nombre.endsWith('.css') ? CSS_LOCAL : JS_LOCAL;
      req.respond({ status: 200, contentType: nombre.endsWith('.css') ? 'text/css' : 'text/javascript', body: readFileSync(path.join(DIST, local)) });
    } else req.continue();
  });

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com'); await page.keyboard.press('Enter'); await pausa(400);
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 30000 }); await pausa(1200);

  const abrir = async () => {
    await page.focus('#sidebar-btn-salidas'); await page.keyboard.press('Enter'); await pausa(1200);
    await page.focus('#btn-nueva-salida'); await page.keyboard.press('Enter');
    await page.waitForSelector('#modal-nueva-salida-container', { timeout: 15000 }); await pausa(1000);
  };
  const llenar = async () => {
    await page.focus('#buscar-cliente-salida'); await page.keyboard.type('BILLY'); await pausa(1200);
    await page.focus('#sugerencia-cliente-0'); await page.keyboard.press('Enter'); await pausa(1500);
    await page.focus('#select-empleado-salida'); await page.keyboard.press('ArrowDown'); await pausa(150);
    await page.evaluate(() => {
      const lbl = [...document.querySelectorAll('label')].find((l) => /PERSONAL.{0,3}T.CNICO/i.test(l.textContent || ''));
      lbl?.parentElement?.querySelector('button')?.click();
    });
    await pausa(200);
    await page.focus('#input-buscar-producto-salida'); await page.keyboard.type('manguera'); await pausa(2500);
    await page.evaluate(() => document.getElementById('sugerencia-salida-0')?.click()); await pausa(300);
    await page.keyboard.type('1'); await page.keyboard.press('Enter'); await pausa(600);
    const listo = await page.evaluate(() => ({
      empleado: !!document.getElementById('select-empleado-salida')?.value,
      fila: !!document.querySelector('[id^="input-cantidad-item-"]'),
    }));
    if (!listo.empleado || !listo.fila) throw new Error(`No se pudo llenar el formulario: ${JSON.stringify(listo)}`);
  };

  // A) Estructura de la cabecera y salida con Esc.
  await abrir();
  const cabecera = await page.evaluate(() => {
    const boton = document.getElementById('btn-guardar-y-otra-salida');
    const cerrar = document.getElementById('btn-cerrar-modal-nueva-salida');
    const botones = [...document.querySelectorAll('#modal-nueva-salida-container button')];
    return {
      existe: !!boton,
      texto: (boton?.textContent || '').replace(/\s+/g, ' ').trim(),
      title: boton?.getAttribute('title') || '',
      alLadoDeX: !!boton && !!cerrar && boton.compareDocumentPosition(cerrar) & Node.DOCUMENT_POSITION_FOLLOWING
        && boton.parentElement === cerrar.parentElement,
      cancelar: botones.filter((b) => /cancelar/i.test(b.textContent || '')).length,
      confirmar: !!document.getElementById('btn-guardar-salida'),
    };
  });
  check('botón «Espera» en la cabecera', cabecera.existe, cabecera.texto);
  check('el texto del botón es Espera', /^espera$/i.test(cabecera.texto), cabecera.texto);
  check('está justo al lado de la X', cabecera.alLadoDeX);
  check('tooltip explica que no abre comprobante', /sin comprobante/i.test(cabecera.title));
  check('ya no hay botón Cancelar', cabecera.cancelar === 0);
  check('sigue el botón Confirmar Salida (F10)', cabecera.confirmar);
  await page.keyboard.press('Escape'); await pausa(700);
  check('Esc sigue cerrando la ventana', await page.evaluate(() => !document.getElementById('modal-nueva-salida-container')));

  // B) F10 sigue guardando y mostrando el comprobante.
  await abrir();
  await llenar();
  await page.keyboard.press('F10');
  await pausa(2200);
  check('F10 abre la vista previa como antes', await page.evaluate(() => !!document.getElementById('btn-previa-salida-volver')));
  await page.keyboard.press('Enter'); await pausa(400); // cerrar el aviso de guardado
  await page.keyboard.press('Escape'); await pausa(700); // cerrar la vista previa (cierra también el modal)
  check('la vista previa se cierra con Esc', await page.evaluate(() => !document.getElementById('modal-nueva-salida-container')));
  check('F10 llamó una sola vez a la RPC', llamadasRpc === 1, `llamadas=${llamadasRpc}`);

  // C) «Espera»: doble clic, un solo guardado, sin comprobante y formulario limpio.
  await abrir();
  await llenar();
  await page.evaluate(() => {
    const b = document.getElementById('btn-guardar-y-otra-salida');
    b?.click(); b?.click();
  });
  await pausa(2200);
  check('«Espera» no abre comprobante', await page.evaluate(() => !document.getElementById('btn-previa-salida-volver')));
  check('doble clic guarda una sola vez', llamadasRpc === 2, `llamadas=${llamadasRpc}`);
  const aviso = await page.evaluate(() => document.querySelector('[data-dialogo-sistema] #dialogo-sistema-texto')?.textContent || '');
  check('aviso confirma que quedó listo para otra', /listo para otra/i.test(aviso), aviso.slice(0, 80));
  await page.keyboard.press('Enter'); await pausa(700);
  const despues = await page.evaluate(() => ({
    abierto: !!document.getElementById('modal-nueva-salida-container'),
    cliente: document.getElementById('buscar-cliente-salida')?.value || '',
    materiales: document.querySelectorAll('[id^="input-cantidad-item-"]').length,
    borrador: [...document.querySelectorAll('#modal-nueva-salida-container span')].some((s) => /borrador auto-guardado/i.test(s.textContent || '')),
    foco: document.activeElement?.id || '',
  }));
  check('la ventana sigue abierta para otra salida', despues.abierto);
  check('cliente y materiales quedaron limpios', !despues.cliente && despues.materiales === 0, JSON.stringify(despues));
  check('no reaparece el borrador', !despues.borrador);
  check('el foco vuelve al buscador de cliente', despues.foco === 'buscar-cliente-salida', despues.foco);

  // D) La X sigue cerrando.
  await page.evaluate(() => document.getElementById('btn-cerrar-modal-nueva-salida')?.click()); await pausa(600);
  check('la X sigue cerrando la ventana', await page.evaluate(() => !document.getElementById('modal-nueva-salida-container')));

  check('0 errores JS', errores.length === 0, errores.join(' | ').slice(0, 300));
  const buenas = resultados.filter(Boolean).length;
  console.log(`\nRESULTADO: ${buenas}/${resultados.length}`);
  if (buenas !== resultados.length) process.exitCode = 1;
} finally { await nav.close(); }
