// Prueba adaptiva (18/11/2026, fase 180): Nueva salida como ventana flotante por pasos (1 datos → 2 productos),
// buscador de productos igual al de Caja, y Agenda en celular. Se corre contra el sitio de pruebas Nego,
// con teclado y sin servicios externos. Solo Nego: sin Evicamp, sin SQL.
// Tamaños: 390 (celular), 768 (tablet), 1366 y 1920 (laptop/PC).
// Uso: node ai-scripts/pruebas/prueba-adaptiva-salida-caja-agenda.mjs
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
const cerrar = async () => { await page.keyboard.press('Escape'); await pausa(350); };

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 }
});
const page = await nav.newPage();

const irA = async (id) => {
  await page.focus(`#${id}`);
  await page.keyboard.press('Enter');
  await pausa(800);
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
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await pausa(1200);

  for (const t of tam) {
    await page.setViewport({ width: t.w, height: t.h });
    await pausa(500);
    const celular = t.w < 768;

    // ---------------- SALIDA ----------------
    try {
      await irA('sidebar-btn-salidas');
      await page.focus('#btn-nueva-salida');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#modal-nueva-salida-container', { timeout: 8000 });
      await pausa(300);

      // 180: vuelve a ser ventana flotante sobre la lista (no sub sesión ni tres apartados).
      const forma = await page.$eval('#modal-nueva-salida-container', (el) => ({
        flotante: !!el.closest('.fixed.inset-0'),
        subSesion: !!document.getElementById('sub-sesion-nueva-salida'),
        listaVisible: !!document.getElementById('btn-nueva-salida') && !!document.getElementById('tabla-salidas-lista'),
        radius: getComputedStyle(el).borderTopLeftRadius,
      }));
      ok(`Salida ${t.nombre}: ventana flotante sobre la lista`,
        forma.flotante && !forma.subSesion && forma.listaVisible);
      ok(`Salida ${t.nombre}: sin botones de sub sesión`,
        !(await existe('#btn-volver-lista-salida')) && !(await existe('#btn-volver-lista-footer-salida')));
      ok(`Salida ${t.nombre}: estilo sobrio sin esquinas`, forma.radius === '0px', forma.radius);

      // Stepper de dos pasos, igual en celular y en PC.
      ok(`Salida ${t.nombre}: stepper de 2 pasos`,
        (await existe('#btn-paso-datos-salida')) && (await existe('#btn-paso-productos-salida')));
      ok(`Salida ${t.nombre}: abre en el paso 1 Datos`,
        (await existe('#select-tipo-salida')) && !(await existe('#input-buscar-producto-salida')));
      ok(`Salida ${t.nombre}: foco al abrir en Tipo de Trabajo`, (await foco()) === 'select-tipo-salida', await foco());
      ok(`Salida ${t.nombre}: botón Siguiente en el paso 1`, await existe('#btn-siguiente-salida-datos'));

      if (celular) {
        const campo = await page.$eval('#select-cliente-salida', (el) => ({
          alto: el.getBoundingClientRect().height,
          fuente: parseFloat(getComputedStyle(el).fontSize),
        }));
        ok('Salida celular: campos de datos grandes', campo.alto >= 44 && campo.fuente >= 14,
          `alto ${Math.round(campo.alto)}, fuente ${campo.fuente}`);
      }
      ok(`Salida ${t.nombre}: nombre libre de cliente`, await existe('#input-cliente-libre-salida'));
      ok(`Salida ${t.nombre}: opción "Otro" en lo que se atiende`,
        await page.$eval('#select-bien-salida', (el) => Array.from(el.options).some((o) => o.value === 'otro')));

      // Llenar datos mínimos y pasar con F10 (no con clic) para comprobar el teclado.
      const primerCliente = await page.$eval('#select-cliente-salida', (el) => {
        const op = Array.from(el.options).find((o) => o.value && !o.disabled);
        return op ? op.value : '';
      });
      if (primerCliente) {
        await page.select('#select-cliente-salida', primerCliente);
        await pausa(250);
      }
      // Si el borrador ya trae trabajador, NO hacer clic: se desmarcaría y F10 no pasaría de paso.
      const yaHayTrabajador = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-trabajador-salida]'))
          .some((b) => b.className.includes('bg-[var(--color-ink)]')));
      if (!yaHayTrabajador) {
        const trabajador = await page.$('[data-trabajador-salida]');
        if (trabajador) await trabajador.click();
      }
      await page.keyboard.press('F10');
      await page.waitForSelector('#input-buscar-producto-salida', { timeout: 5000 });
      await pausa(200);
      ok(`Salida ${t.nombre}: F10 pasa al paso 2 Productos`,
        !(await existe('#select-tipo-salida')) && (await existe('#input-buscar-producto-salida')));
      ok(`Salida ${t.nombre}: foco en el buscador al entrar al paso 2`,
        (await foco()) === 'input-buscar-producto-salida', await foco());
      ok(`Salida ${t.nombre}: Confirmar Salida (F10) y Atrás en el paso 2`,
        (await existe('#btn-guardar-salida')) && (await existe('#btn-atras-salida-productos')));

      // Buscador tipo Caja: Enter agrega directo, sin segundo Enter en cantidad.
      const buscador = await page.$eval('#input-buscar-producto-salida', (el) => ({
        alto: el.getBoundingClientRect().height,
        fuente: parseFloat(getComputedStyle(el).fontSize),
        permiteEnter: !!el.closest('[data-permitir-salto-enter]'),
      }));
      ok(`Salida ${t.nombre}: buscador tipo Caja con Enter propio`, buscador.permiteEnter,
        `alto ${Math.round(buscador.alto)}, fuente ${buscador.fuente}`);
      ok(`Salida ${t.nombre}: buscador legible`, buscador.alto >= 44 && buscador.fuente >= 14);
      ok(`Salida ${t.nombre}: botón de cámara`, await existe('#btn-escaner-salida'));

      try {
        await page.focus('#input-buscar-producto-salida');
        await page.keyboard.type('a');
        await pausa(400);
        const sugerencias = await page.$$('[id^="sugerencia-salida-"]');
        if (sugerencias.length) {
          const nombre = await sugerencias[0].evaluate((el) => el.innerText.split('\n')[0].trim());
          const conFoto = await sugerencias[0].evaluate((el) => !!el.querySelector('img, svg.lucide-package'));
          ok(`Salida ${t.nombre}: sugerencias con foto y stock`, conFoto && (await existe('#resultados-salida')));
          await page.keyboard.press('Enter');
          await pausa(300);
          const primera = await page.$eval('table[data-tabla-campos] tbody tr:first-child td:nth-child(3)', (el) => el.innerText.trim());
          ok(`Salida ${t.nombre}: Enter agrega directo y entra arriba`,
            primera.toUpperCase().includes(nombre.toUpperCase().slice(0, 8)), `${primera} vs ${nombre}`);
          ok(`Salida ${t.nombre}: foco vuelve al buscador`, (await foco()) === 'input-buscar-producto-salida', await foco());
          await page.click('table[data-tabla-campos] tbody tr:first-child td:last-child button');
          await pausa(200);
        } else {
          res.push(`➖ Salida ${t.nombre}: sin sugerencias con "a", orden no probado`);
        }
      } catch (e) {
        res.push(`➖ Salida ${t.nombre}: buscador no probado (${e.message.slice(0, 180)})`);
      }

      // Atrás y vuelve a Productos desde el stepper, sin perder los datos.
      await page.click('#btn-atras-salida-productos');
      await pausa(250);
      ok(`Salida ${t.nombre}: Atrás vuelve al paso 1`,
        (await existe('#select-tipo-salida')) && !(await existe('#input-buscar-producto-salida')));
      await page.click('#btn-paso-productos-salida');
      await page.waitForSelector('#input-buscar-producto-salida', { timeout: 5000 });
      await pausa(200); // el foco al buscador se hace justo después de montar el paso 2
      ok(`Salida ${t.nombre}: stepper vuelve al paso 2 sin perder datos`,
        (await foco()) === 'input-buscar-producto-salida', await foco());
      ok(`Salida ${t.nombre}: material fuera de almacén en el paso 2`, await existe('#check-material-externo-salida'));

      await page.keyboard.press('Escape');
      await pausa(400);
      ok(`Salida ${t.nombre}: Escape cierra la ventana flotante`,
        !(await existe('#modal-nueva-salida-container')) && (await existe('#btn-nueva-salida')));
      ok(`Salida ${t.nombre}: foco al cerrar`, (await foco()) === 'btn-nueva-salida', await foco());

      // El flujo "Continuar" del detalle debe abrir la misma ventana flotante (se comprueba una vez, en PC).
      if (t.w >= 1920) {
        const fila = await page.$('[data-fila-salida="true"]');
        if (fila) {
          await fila.focus();
          await page.keyboard.press('Enter');
          await page.waitForSelector('#btn-continuar-salida', { timeout: 8000 });
          await page.click('#btn-continuar-salida');
          await page.waitForSelector('#modal-nueva-salida-container', { timeout: 8000 });
          ok('Salida PC: Continuar abre la misma ventana flotante',
            await page.$eval('#modal-nueva-salida-container', (el) => !!el.closest('.fixed.inset-0')));
          await page.keyboard.press('Escape');
          await pausa(400);
        }
      }
    } catch (e) {
      ok(`Salida ${t.nombre}`, false, e.message.slice(0, 110));
      await cerrar();
    }

    // ---------------- CAJA ----------------
    try {
      await irA('sidebar-btn-pos');
      await page.waitForSelector('#buscador-global-pos', { timeout: 10000 });
      await pausa(300);
      const listoVisible = await page.$eval('#btn-listo-teclado-pos', (el) => getComputedStyle(el).display !== 'none');
      ok(`Caja ${t.nombre}: botón ✓ Listo ${celular ? 'visible' : 'oculto'}`, listoVisible === celular);

      if (celular) {
        await page.focus('#buscador-global-pos');
        await page.evaluate(() => {
          const area = document.getElementById('resultados-caja');
          const t = new Touch({ identifier: 1, target: area, clientX: 100, clientY: 400 });
          area?.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
        });
        await pausa(120);
        const trasTouch = await foco();
        ok(`Caja ${t.nombre}: el teclado se guarda al tocar resultados`, trasTouch !== 'buscador-global-pos', trasTouch);

        await page.evaluate(() => {
          const area = document.getElementById('resultados-caja');
          area?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await pausa(150);
        const trasClick = await foco();
        ok(`Caja ${t.nombre}: el imán no reabre el teclado`, trasClick !== 'buscador-global-pos', trasClick);

        await page.evaluate(() => { document.getElementById('resultados-caja')?.dispatchEvent(new TouchEvent('touchend', { bubbles: true })); });
        await page.focus('#buscador-global-pos');
        await page.evaluate(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        await pausa(150);
        ok(`Caja ${t.nombre}: al volver al buscador el imán funciona`, (await foco()) === 'buscador-global-pos', await foco());
      }
    } catch (e) {
      ok(`Caja ${t.nombre}`, false, e.message.slice(0, 110));
    }

    // ---------------- AGENDA ----------------
    try {
      await irA('sidebar-btn-agenda');
      await page.focus('#btn-nuevo-trabajo');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#form-nuevo-trabajo', { timeout: 8000 });
      await pausa(350);
      const focoAlAbrir = await foco();
      if (celular) ok(`Agenda ${t.nombre}: no abre el teclado al entrar`, focoAlAbrir !== 'input-titulo-trabajo', focoAlAbrir);
      else ok(`Agenda ${t.nombre}: foco automático para teclado`, focoAlAbrir === 'input-titulo-trabajo', focoAlAbrir);

      const forma = await page.$eval('#form-nuevo-trabajo', (el) => ({
        evita: el.hasAttribute('data-evitar-scroll-foco'),
        alto: el.closest('.ventana-sobria')?.getBoundingClientRect().height || 0,
      }));
      ok(`Agenda ${t.nombre}: vista sin scroll forzado`, forma.evita);
      if (celular) ok(`Agenda ${t.nombre}: ventana a pantalla completa`, forma.alto >= t.h - 6, `${Math.round(forma.alto)} de ${t.h}`);

      const campo = await page.$eval('#input-titulo-trabajo', (el) => ({
        minH: parseFloat(getComputedStyle(el).minHeight) || 0,
        size: parseFloat(getComputedStyle(el).fontSize),
      }));
      if (celular) ok(`Agenda ${t.nombre}: campo grande y claro`, campo.minH >= 44 && campo.size >= 15, `minH ${campo.minH}, fuente ${campo.size}`);

      if (celular) {
        await page.focus('#input-titulo-trabajo');
        const antes = await page.$eval('#form-nuevo-trabajo', (el) => el.scrollTop);
        await page.keyboard.press('ArrowDown');
        await pausa(200);
        const despues = await page.$eval('#form-nuevo-trabajo', (el) => el.scrollTop);
        const destino = await foco();
        ok(`Agenda ${t.nombre}: ↓ baja al siguiente campo sin "subir"`, destino !== 'input-titulo-trabajo' && despues <= antes, `${destino}, scroll ${antes}→${despues}`);

        await page.focus('#input-titulo-trabajo');
        await page.keyboard.type('x');
        await page.keyboard.press('Enter');
        await pausa(200);
        ok(`Agenda ${t.nombre}: Enter deja el selector en el campo`, (await foco()) === 'input-titulo-trabajo', await foco());
      }
      await cerrar();
    } catch (e) {
      ok(`Agenda ${t.nombre}`, false, e.message.slice(0, 110));
      await cerrar();
    }
  }

  console.log('\nResultados (adaptivo: salida en 2 pasos, Caja y Agenda, solo Nego):\n' + res.join('\n'));
  const fallos = res.filter((r) => r.startsWith('❌')).length;
  const sinProbar = res.filter((r) => r.startsWith('➖')).length;
  console.log(`\nTotal: ${res.length} comprobaciones, ${fallos} fallos, ${sinProbar} sin datos/no probadas.`);
} catch (err) {
  console.error('Error durante la prueba:', err);
  process.exit(1);
} finally {
  await nav.close();
}
