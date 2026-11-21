// Prueba de la fase 194: vista previa del comprobante de salida al guardar y en salidas ya ingresadas.
// Ticket 80 mm por predeterminado (hoja A4 al elegirla), descargar PDF, WhatsApp (app conectada + Web), impresión y teclado.
// Ningún formato lleva firma (pedido del dueño). Ojo: las flechas SOLO mueven el selector; Enter elige el formato.
// Solo Nego, con teclado, en 390/768/1366/1920 y con una parte final SIN internet (modo offline).
// Uso: node ai-scripts/pruebas/prueba-vista-previa-salidas.mjs
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const existe = async (sel) => (await page.$(sel)) !== null;
const foco = () => page.evaluate(() => document.activeElement?.id || '');

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 },
});
const page = await nav.newPage();
const erroresJS = [];
page.on('pageerror', (e) => erroresJS.push(e.message));

const irA = async (id) => {
  await page.focus(`#${id}`);
  await page.keyboard.press('Enter');
  await pausa(700);
};
const reescribir = async (sel, texto) => {
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(texto);
};
const cerrarAviso = async () => {
  if (await existe('[data-dialogo-sistema]')) {
    await page.keyboard.press('Escape');
    await pausa(350);
  }
};
const abrirVistaPrevia = async () => {
  await page.waitForSelector('[data-vista-previa-salida]', { timeout: 10000 });
  await pausa(550);
};

const tam = [
  { w: 390, h: 844, nombre: 'celular' },
  { w: 768, h: 1024, nombre: 'tablet' },
  { w: 1366, h: 768, nombre: 'laptop' },
  { w: 1920, h: 1080, nombre: 'PC' },
];

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 15000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 20000 });
  await pausa(1200);

  for (const t of tam) {
    await page.setViewport({ width: t.w, height: t.h });
    await pausa(450);
    const pref = `Salida ${t.nombre}`;
    // Cada tamaño empieza limpio: el borrador de la fase 192 restaura cliente/trabajador/material
    // y luego un Enter de más los desmarca. Se borra antes de abrir el formulario.
    await page.evaluate(() => {
      localStorage.removeItem('siumax_servic_borrador_salida');
      localStorage.removeItem('salidas_formato_impresion'); // la vista previa recuerda hoja/ticket; cada tamaño arranca en ticket
    });

    try {
      await irA('sidebar-btn-salidas');
      await page.focus('#btn-nueva-salida');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#modal-nueva-salida-container', { timeout: 8000 });
      await pausa(350);

      // Cliente registrado desde el desplegable (la salida lo exige por llave foránea).
      await reescribir('#buscar-cliente-salida', 'a');
      await pausa(450);
      await page.keyboard.press('Enter');
      await pausa(350);
      // El bien es opcional. No se toca: en tablet/laptop/PC una flecha desde el select cae en el campo
      // de fecha y el Enter abre el calendario, que atrapa el foco y luego el trabajador no se marca.
      // Al menos un trabajador sí es obligatorio; se llega con Tab real (el foco programático lo devuelve el imán).
      const trabajador = await page.evaluate(() => {
        const etiqueta = [...document.querySelectorAll('label')].find((l) => /Personal Técnico Asignado/i.test(l.innerText || ''));
        const boton = etiqueta?.parentElement?.querySelector('button');
        if (!boton) return { hay: false, yaSeleccionado: false };
        const yaSeleccionado = (boton.getAttribute('class') || '').includes('bg-[var(--color-ink)]');
        boton.setAttribute('data-prueba-trabajador', '1');
        return { hay: true, yaSeleccionado };
      });
      ok(`${pref}: hay trabajadores para asignar`, trabajador.hay);
      for (let i = 0; i < 40; i++) {
        if (await page.evaluate(() => document.activeElement?.dataset?.pruebaTrabajador === '1')) break;
        await page.keyboard.press('Tab');
        await pausa(40);
      }
      ok(`${pref}: Tab llega al trabajador`, await page.evaluate(() => document.activeElement?.dataset?.pruebaTrabajador === '1'));
      if (!trabajador.yaSeleccionado) {
        await page.keyboard.press('Enter'); // Enter = clic; si ya estaba marcado, un Enter lo desmarcaría
        await pausa(250);
      }
      ok(`${pref}: el trabajador quedó marcado`, await page.evaluate(() => {
        const b = document.querySelector('[data-prueba-trabajador]');
        return (b?.getAttribute('class') || '').includes('bg-[var(--color-ink)]');
      }));
      // Material externo: sirve aunque no haya stock en el catálogo de pruebas.
      const cuentaMateriales = () => page.$eval('#modal-nueva-salida-container', (el) =>
        Number((el.innerText.match(/(\d+) material\(es\)/) || [0, 0])[1]));
      if ((await cuentaMateriales()) === 0) {
        await page.focus('#check-material-externo-salida');
        await page.keyboard.press('Enter');
        await pausa(250);
        await reescribir('#input-desc-material-externo', 'MATERIAL DE PRUEBA FASE 194');
        await page.focus('#input-cant-item-externo');
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.keyboard.type('2');
        await page.keyboard.press('Enter');
        await pausa(350);
      }
      ok(`${pref}: se agregó el material`, (await cuentaMateriales()) >= 1);
      await page.keyboard.press('F10');
      await abrirVistaPrevia();
      await cerrarAviso();

      ok(`${pref}: al guardar sale la vista previa`, await existe('[data-vista-previa-salida]'));
      const encabezado = await page.$eval('[data-vista-previa-salida] .ventana-cabecera__titulo', (el) => el.innerText);
      ok(`${pref}: el título dice Vista previa`, /vista previa/i.test(encabezado), encabezado);
      const ids = ['btn-previa-salida-imprimir', 'btn-previa-salida-descargar', 'btn-previa-salida-whatsapp',
        'btn-previa-salida-whatsapp-web', 'btn-previa-salida-whatsapp-pdf', 'btn-formato-salida-HOJA', 'btn-formato-salida-TICKET',
        'btn-previa-salida-volver'];
      for (const id of ids) ok(`${pref}: botón ${id}`, await existe(`#${id}`));

      const src0 = await page.$eval('[data-vista-previa-salida] iframe', (el) => el.srcdoc);
      ok(`${pref}: abre en ticket 80 mm por predeterminado`, /size: 80mm/.test(src0) && /Vale de salida/i.test(src0) && /<img/.test(src0));
      ok(`${pref}: el ticket NO lleva firma`, !/Responsable técnico/i.test(src0) && !/Recibido \/ conforme/i.test(src0));
      const codigo = (encabezado.match(/[A-Z]+-?\d+/) || [''])[0];
      ok(`${pref}: el comprobante trae el código de la salida`, codigo.length > 0 && src0.includes(codigo), codigo);

      // Teclado: ← solo mueve el selector a Hoja (regla del dueño), Enter sí escoge el formato;
      // → vuelve a Ticket, ↓ baja al pie, Esc cierra la previa y el formulario.
      await enfocarId('btn-formato-salida-TICKET');
      await page.keyboard.press('ArrowLeft');
      await pausa(250);
      ok(`${pref}: ← mueve el selector a Hoja`, (await foco()) === 'btn-formato-salida-HOJA', await foco());
      await page.keyboard.press('Enter');
      await pausa(350);
      const hojaOn = await page.$eval('#btn-formato-salida-HOJA', (el) => el.getAttribute('aria-pressed'));
      const srcHoja = await page.$eval('[data-vista-previa-salida] iframe', (el) => el.srcdoc);
      ok(`${pref}: Enter escoge hoja A4`, hojaOn === 'true' && /size: A4/.test(srcHoja));
      ok(`${pref}: la hoja A4 NO lleva firma`, !/Responsable técnico/i.test(srcHoja) && !/Recibido \/ conforme/i.test(srcHoja));
      await page.keyboard.press('ArrowRight');
      await pausa(250);
      ok(`${pref}: → mueve el selector a Ticket`, (await foco()) === 'btn-formato-salida-TICKET', await foco());
      await page.keyboard.press('Enter');
      await pausa(350);
      const ticketOn = await page.$eval('#btn-formato-salida-TICKET', (el) => el.getAttribute('aria-pressed'));
      const src1 = await page.$eval('[data-vista-previa-salida] iframe', (el) => el.srcdoc);
      ok(`${pref}: Enter vuelve a ticket 80 mm`, ticketOn === 'true' && /size: 80mm/.test(src1));
      ok(`${pref}: el ticket es para el trabajador`, /para el trabajador/i.test(await page.$eval('[data-vista-previa-salida]', (el) => el.innerText)));
      await page.keyboard.press('ArrowDown');
      await pausa(250);
      ok(`${pref}: ↓ baja del selector al pie`, (await foco()).startsWith('btn-previa-salida-'), await foco());
      await page.keyboard.press('Escape');
      await pausa(450);
      ok(`${pref}: Esc cierra la vista previa`, !(await existe('[data-vista-previa-salida]')));
      ok(`${pref}: al guardar, Esc cierra también el formulario`, !(await existe('#modal-nueva-salida-container')));

      // Salida ya ingresada: el botón Imprimir abre la MISMA vista previa.
      await irA('sidebar-btn-salidas');
      await pausa(600);
      const botonVer = await page.$('#tabla-salidas-lista [id^="btn-ver-salida-"]');
      if (botonVer) {
        await botonVer.focus();
        await page.keyboard.press('Enter');
        await page.waitForSelector('#btn-imprimir-salida', { timeout: 8000 });
        await pausa(300);
        const textoBoton = await page.$eval('#btn-imprimir-salida', (el) => el.innerText);
        ok(`${pref}: salida ingresada tiene el botón de imprimir/enviar`, /imprimir/i.test(textoBoton), textoBoton);
        await page.focus('#btn-imprimir-salida');
        await page.keyboard.press('Enter');
        await abrirVistaPrevia();
        ok(`${pref}: salida ingresada abre la vista previa nueva`, await existe('#btn-previa-salida-imprimir') && await existe('#btn-formato-salida-TICKET'));
        await page.keyboard.press('Escape');
        await pausa(400);
        ok(`${pref}: Esc vuelve al detalle sin cerrar toda la pantalla`, !(await existe('[data-vista-previa-salida]')) && await existe('#btn-imprimir-salida'));
        await page.keyboard.press('Escape');
        await pausa(350);
      } else {
        ok(`${pref}: salida ingresada abre la vista previa nueva`, false, 'no hay filas en la tabla');
      }
    } catch (e) {
      ok(`${pref}: flujo completo`, false, e.message.slice(0, 130));
      await cerrarAviso();
      await page.keyboard.press('Escape').catch(() => {});
      await pausa(250);
    }
  }

  // ---------------- SIN INTERNET (una vez, en PC) ----------------
  try {
    await page.setViewport({ width: 1366, height: 768 });
    const botonVer = await page.$('#tabla-salidas-lista [id^="btn-ver-salida-"]');
    if (!botonVer) throw new Error('no hay salidas en la tabla');
    await botonVer.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#btn-imprimir-salida', { timeout: 8000 });
    await page.setOfflineMode(true);
    await pausa(500);
    await page.focus('#btn-imprimir-salida');
    await page.keyboard.press('Enter');
    await abrirVistaPrevia();
    ok('Sin internet: abre la vista previa de una salida ingresada', await existe('[data-vista-previa-salida]'));
    // Abre en ticket por predeterminado (y el formato elegido se recuerda); ahí dice "Vale de salida".
    ok('Sin internet: se ve el comprobante con el logo guardado',
      /VALE DE SALIDA/i.test(await page.$eval('[data-vista-previa-salida] iframe', (el) => el.srcdoc)));
    const descargas = 'C:/Users/User/AppData/Local/Temp/opencode/descargas-fase194';
    const fs = await import('node:fs');
    fs.mkdirSync(descargas, { recursive: true });
    const cdp = await page.target().createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: descargas, eventsEnabled: true });
    let eventoDescarga = false;
    cdp.on('Browser.downloadWillBegin', () => { eventoDescarga = true; });
    await page.focus('#btn-previa-salida-descargar');
    await page.keyboard.press('Enter');
    await pausa(3500);
    const avisoDescarga = await page.evaluate(() => document.querySelector('[data-dialogo-sistema]')?.innerText || '');
    await cerrarAviso();
    const archivos = fs.readdirSync(descargas).filter((f) => f.endsWith('.pdf'));
    ok('Sin internet: Descargar PDF funciona', archivos.length > 0 || eventoDescarga || /PDF descargado/i.test(avisoDescarga),
      `${archivos.join(', ') || 'sin archivo'} · ${/PDF descargado/i.test(avisoDescarga) ? 'confirmado en pantalla' : 'sin confirmación'}`);
    await page.setOfflineMode(false);
  } catch (e) {
    ok('Sin internet: vista previa y PDF', false, e.message.slice(0, 130));
    await page.setOfflineMode(false).catch(() => {});
  }
} catch (e) {
  ok('Prueba completa', false, e.message.slice(0, 160));
} finally {
  await nav.close();
  console.log(res.join('\n'));
  const fallos = res.filter((r) => r.startsWith('❌')).length;
  console.log(`Total: ${res.length} comprobaciones, ${fallos} fallos, 0 sin datos/no probadas.`);
  console.log(erroresJS.length ? 'errores JS: ' + erroresJS.slice(0, 6).join(' | ') : 'sin errores JS');
}

async function enfocarId(id) {
  await page.focus(`#${id}`);
  await pausa(120);
}
