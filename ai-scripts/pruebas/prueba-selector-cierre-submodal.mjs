import { createRequire } from 'node:module';
const require = createRequire('D:/Programación/siumax/comercio/package.json');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
process.loadEnvFile('D:/Programación/siumax/comercio/.env.vps');

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 }
});
const page = await nav.newPage();

try {
  await page.goto('https://comerc.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 15000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-finanzas', { timeout: 20000 });
  await pausa(2000);

  // 1. Navegar a Finanzas
  await page.focus('#sidebar-btn-finanzas');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#btn-ver-historial', { timeout: 15000 });
  await pausa(1000);

  // 2. Cambiar a Historial de Cajas
  await page.focus('#btn-ver-historial');
  await page.keyboard.press('Enter');
  await page.waitForSelector('tr[id^="caja-row-"]', { timeout: 15000 });
  await pausa(1000);

  // 3. Buscar las filas de cajas cerradas
  const cajaRows = await page.$$eval('tr[id^="caja-row-"]', (els) => els.map((e) => e.id));
  console.log('Filas de cajas encontradas:', cajaRows.length);
  ok('Hay al menos una fila en historial de cajas', cajaRows.length > 0, `Total: ${cajaRows.length}`);

  if (cajaRows.length > 0) {
    const primeraCajaId = cajaRows[0];
    await page.focus(`#${primeraCajaId}`);
    await pausa(300);
    // Abrir ModalDetalleCaja
    await page.keyboard.press('Enter');
    await page.waitForSelector('#modal-detalle-caja-container', { timeout: 10000 });
    await pausa(1500);

    // 4. Buscar filas de tickets de venta dentro del modal
    const ticketRows = await page.$$eval('#tabla-movimientos-caja button[id^="btn-ver-ticket-"]', (els) => els.map((e) => e.id.replace('btn-ver-ticket-', 'mov-row-')));
    console.log('Tickets de venta encontrados en caja:', ticketRows.length);
    ok('Hay tickets de venta en el modal de detalle de caja', ticketRows.length > 0, `Total: ${ticketRows.length}`);

    if (ticketRows.length > 0) {
      const movIdAProbar = ticketRows[0];
      // Enfocar la fila del movimiento
      await page.focus(`#${movIdAProbar}`);
      await pausa(400);

      const focoAntes = await page.evaluate(() => document.activeElement?.id);
      console.log('Foco antes de abrir ticket:', focoAntes);
      ok('Foco se colocó en la fila del ticket', focoAntes === movIdAProbar, focoAntes);

      // Abrir ticket con Enter
      await page.keyboard.press('Enter');
      await page.waitForSelector('#btn-reimprimir-ticket', { timeout: 10000 });
      await pausa(800);

      console.log('Modal de ticket abierto exitosamente');
      // Cerrar ticket con Escape
      await page.keyboard.press('Escape');
      await pausa(1000);

      // Comprobar foco tras cerrar el submodal
      const focoDespuesTicket = await page.evaluate(() => document.activeElement?.id);
      console.log('Foco tras cerrar ticket (debe ser la fila, NO el buscador):', focoDespuesTicket);
      ok(
        'Al cerrar ticket, el selector se queda en la fila seleccionada (NO en el buscador)',
        focoDespuesTicket === movIdAProbar,
        `Foco actual: ${focoDespuesTicket}`
      );

      // Captura de pantalla para validar visualmente
      await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4/submodal_foco_fila_restaurado.png' });

      // Ahora cerrar ModalDetalleCaja con Escape
      await page.keyboard.press('Escape');
      await pausa(1000);

      const focoDespuesCaja = await page.evaluate(() => document.activeElement?.id);
      console.log('Foco tras cerrar caja (debe ser la fila de la caja en el historial):', focoDespuesCaja);
      ok(
        'Al cerrar el modal de caja, el selector vuelve a la fila de la caja en el historial (NO al buscador)',
        focoDespuesCaja === primeraCajaId,
        `Foco actual: ${focoDespuesCaja}`
      );
    }
  }

  console.log('\nResultados de la prueba:\n' + res.join('\n'));
} catch (err) {
  console.error('Error durante la prueba:', err);
  process.exit(1);
} finally {
  await nav.close();
}
