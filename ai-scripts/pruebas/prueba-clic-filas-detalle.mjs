// Prueba: al hacer clic (o Enter) en una fila se abre el detalle, igual que Inventario > Productos.
// Cubre: Herramientas, Vehículos, Salidas, Utilidades (Cobranzas) y Contratos (Visitas y Cobros).
// También comprueba que los botones internos de la fila NO abran el detalle (stopPropagation),
// que Escape cierre la ventana nueva y que la paginación siga visible.
// Todo con teclado y contra el sitio de pruebas Nego (sin tocar Evicamp ni la base).
// Uso: node ai-scripts/pruebas/prueba-clic-filas-detalle.mjs
import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/negocios/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/negocios/comercio/.env.vps');

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const sinDatos = (n, x = '') => res.push(`➖ ${n} — sin datos en Nego, no se pudo probar${x !== '' ? ' (' + x + ')' : ''}`);
const existe = async (sel) => (await page.$(sel)) !== null;

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 }
});
const page = await nav.newPage();

const irA = async (id) => {
  await page.focus(`#${id}`);
  await page.keyboard.press('Enter');
  await pausa(900);
};

const cerrarSiAbierto = async (selBotonCierre) => {
  if (await existe(selBotonCierre)) {
    await page.keyboard.press('Escape');
    await pausa(500);
  }
};

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 15000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await pausa(1500);

  // ---- 1. HERRAMIENTAS: clic en la fila abre el modal de edición ----
  try {
    await irA('sidebar-btn-inventario');
    await irA('btn-tab-activos');
    await irA('btn-subtab-herramientas');
    const filas = await page.$$('#fila-herr-0');
    if (filas.length === 0) {
      ok('Herramientas: clic en fila abre detalle', false, 'No hay filas de herramientas en Nego');
    } else {
      await filas[0].click();
      await page.waitForSelector('#btn-cerrar-modal-herramienta', { timeout: 6000 });
      ok('Herramientas: clic en fila abre detalle', true);
      await page.keyboard.press('Escape');
      await pausa(400);
      ok('Herramientas: Escape cierra el detalle', !(await existe('#btn-cerrar-modal-herramienta')));
      await pausa(300);

      // Enter también abre (el comportamiento que ya existía no se rompió)
      await page.focus('#fila-herr-0');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#btn-cerrar-modal-herramienta', { timeout: 6000 });
      ok('Herramientas: Enter sigue abriendo el detalle', true);
      await cerrarSiAbierto('#btn-cerrar-modal-herramienta');
    }
  } catch (e) {
    ok('Herramientas: clic en fila abre detalle', false, e.message.slice(0, 90));
    await cerrarSiAbierto('#btn-cerrar-modal-herramienta');
  }

  // ---- 2. VEHÍCULOS: clic en la fila abre el modal de edición ----
  try {
    await irA('btn-subtab-vehiculos');
    const filas = await page.$$('#fila-veh-0');
    if (filas.length === 0) {
      ok('Vehículos: clic en fila abre detalle', false, 'No hay filas de vehículos en Nego');
    } else {
      await filas[0].click();
      await page.waitForSelector('#btn-cerrar-modal-vehiculo', { timeout: 6000 });
      ok('Vehículos: clic en fila abre detalle', true);
      await cerrarSiAbierto('#btn-cerrar-modal-vehiculo');
    }
  } catch (e) {
    ok('Vehículos: clic en fila abre detalle', false, e.message.slice(0, 90));
    await cerrarSiAbierto('#btn-cerrar-modal-vehiculo');
  }

  // ---- 3. SALIDAS: clic abre detalle; botones internos y paginación intactos ----
  try {
    await irA('sidebar-btn-salidas');
    await page.waitForSelector('#tabla-salidas-lista [data-fila-salida="true"]', { timeout: 12000 });
    ok('Salidas: paginación sigue visible', await existe('#btn-pagina-ant-salidas-arriba'));
    const filas = await page.$$('#tabla-salidas-lista [data-fila-salida="true"]');
    if (filas.length === 0) {
      ok('Salidas: clic en fila abre detalle', false, 'No hay filas de salidas en Nego');
    } else {
      await filas[0].click();
      await page.waitForSelector('#modal-detalle-salida-container', { timeout: 6000 });
      ok('Salidas: clic en fila abre detalle', true);
      await page.keyboard.press('Escape');
      await pausa(400);
      ok('Salidas: Escape cierra el detalle', !(await existe('#modal-detalle-salida-container')));
    }
  } catch (e) {
    ok('Salidas: clic en fila abre detalle', false, e.message.slice(0, 90));
    await cerrarSiAbierto('#btn-cerrar-detalle-salida');
  }

  // ---- 4. UTILIDADES: clic abre el modal sobrio en Rentabilidad / Técnicos / Materiales ----
  try {
    await irA('sidebar-btn-utilidades');
    for (const tab of ['rentabilidad', 'tecnicos', 'materiales']) {
      await irA(`btn-tab-util-${tab}`);
      await page.select('#select-periodo-graficos', 'anio');
      await pausa(900);
      const filas = await page.$$('tr[data-fila-grafico="true"]');
      if (filas.length === 0) { sinDatos(`${tab}: clic en fila abre detalle`); continue; }
      await filas[0].click();
      await page.waitForSelector('#modal-detalle-fila', { timeout: 6000 });
      ok(`${tab}: clic en fila abre detalle`, true, `${filas.length} filas`);
      if (tab === 'rentabilidad') {
        ok('Modal de detalle es sobrio (sin esquinas redondeadas)',
          await page.$eval('#modal-detalle-fila > div', (el) => getComputedStyle(el).borderRadius === '0px'));
        await page.keyboard.press('Escape');
        await pausa(400);
        ok('Modal genérico: Escape cierra el detalle', !(await existe('#modal-detalle-fila')));
      }
      await cerrarSiAbierto('#btn-cerrar-detalle-fila');
    }

    // Cobranzas no tiene datos en Nego en ningún período; se marca como "sin datos", no como fallo.
    await irA('btn-tab-util-cobranzas');
    await page.select('#select-periodo-graficos', 'anio');
    await pausa(900);
    const filasCob = await page.$$('tr[data-fila-grafico="true"]');
    if (filasCob.length === 0) sinDatos('Cobranzas: clic en fila abre detalle');
    else {
      await filasCob[0].click();
      await page.waitForSelector('#modal-detalle-fila', { timeout: 6000 });
      ok('Cobranzas: clic en fila abre detalle', true);
      await cerrarSiAbierto('#btn-cerrar-detalle-fila');
    }
  } catch (e) {
    ok('Utilidades: clic en fila abre detalle', false, e.message.slice(0, 90));
    await cerrarSiAbierto('#btn-cerrar-detalle-fila');
  }

  // ---- 5. CONTRATOS > VISITAS: clic abre detalle; botón "Listo" NO lo abre ----
  try {
    await irA('sidebar-btn-contratos');
    await page.select('#filtro-vista-contratos', 'visitas');
    await pausa(900);
    const filas = await page.$$('tr[data-fila-visita="true"]');
    if (filas.length === 0) {
      sinDatos('Visitas: clic en fila abre detalle');
    } else {
      await filas[0].click();
      await page.waitForSelector('#modal-detalle-fila', { timeout: 6000 });
      ok('Visitas: clic en fila abre detalle', true);
      await cerrarSiAbierto('#btn-cerrar-detalle-fila');

      const btnListo = await page.$('button[id^="btn-realizar-visita-"]');
      if (btnListo) {
        await btnListo.click();
        await pausa(700);
        ok('Visitas: el botón "Listo" NO abre el detalle', !(await existe('#modal-detalle-fila')));
      }
    }
  } catch (e) {
    ok('Visitas: clic en fila abre detalle', false, e.message.slice(0, 90));
    await cerrarSiAbierto('#btn-cerrar-detalle-fila');
  }

  // ---- 6. CONTRATOS > COBROS: clic abre detalle; botón "Cobrar" NO lo abre ----
  try {
    await page.select('#filtro-vista-contratos', 'cobros');
    await pausa(900);
    const filas = await page.$$('tr[data-fila-cobro="true"]');
    if (filas.length === 0) {
      sinDatos('Cobros: clic en fila abre detalle');
    } else {
      await filas[0].click();
      await page.waitForSelector('#modal-detalle-fila', { timeout: 6000 });
      ok('Cobros: clic en fila abre detalle', true);
      await cerrarSiAbierto('#btn-cerrar-detalle-fila');

      const btnCobrar = await page.$('button[id^="btn-pagar-cobro-"]');
      if (btnCobrar) {
        await btnCobrar.click();
        await pausa(700);
        ok('Cobros: el botón "Cobrar" NO abre el detalle', !(await existe('#modal-detalle-fila')));
      }
    }
  } catch (e) {
    ok('Cobros: clic en fila abre detalle', false, e.message.slice(0, 90));
    await cerrarSiAbierto('#btn-cerrar-detalle-fila');
  }

  console.log('\nResultados de la prueba (clic/Enter abre detalle):\n' + res.join('\n'));
  const fallos = res.filter((r) => r.startsWith('❌')).length;
  const sinProbar = res.filter((r) => r.startsWith('➖')).length;
  console.log(`\nTotal: ${res.length} comprobaciones, ${fallos} fallos, ${sinProbar} sin datos en Nego.`);
} catch (err) {
  console.error('Error durante la prueba:', err);
  process.exit(1);
} finally {
  await nav.close();
}
