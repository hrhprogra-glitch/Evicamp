// Prueba adaptiva (18/11/2026, fase 182): buscador desplegable de cliente y botón de cliente no registrado en
// Nueva salida, además del teclado de Caja y la Agenda en celular.
// Se corre contra el sitio de pruebas Nego, con teclado y sin servicios externos. Solo Nego: sin Evicamp, sin SQL.
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

// Borrar un campo y escribir otro texto usando solo teclado (así se comprueba la Regla 9 de verdad).
const reescribir = async (sel, texto) => {
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(texto);
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

      // 187: un solo buscador hace las dos cosas: sugerencias y registro del nombre como nota, sin botón ni campo aparte.
      ok(`Salida ${t.nombre}: buscador desplegable de cliente`, await existe('#buscar-cliente-salida'));
      ok(`Salida ${t.nombre}: NO hay botón de cliente no registrado`, !(await existe('#btn-cliente-no-registrado-salida')));
      ok(`Salida ${t.nombre}: NO hay campo de nombre aparte`, !(await existe('#input-cliente-libre-salida')));
      const buscarCli = await page.$eval('#buscar-cliente-salida', (el) => ({
        alto: el.getBoundingClientRect().height,
        fuente: parseFloat(getComputedStyle(el).fontSize),
        permiteEnter: !!el.closest('[data-permitir-salto-enter]'),
      }));
      ok(`Salida ${t.nombre}: buscador de cliente legible`, buscarCli.alto >= 44 && buscarCli.fuente >= 14,
        `alto ${Math.round(buscarCli.alto)}, fuente ${buscarCli.fuente}`);
      ok(`Salida ${t.nombre}: Enter propio en el buscador de cliente`, buscarCli.permiteEnter);
      // 190: campo normal, sin el bloque negro de la lupa, con el mismo borde que los demás campos.
      const estiloCli = await page.evaluate(() => {
        const input = document.querySelector('#buscar-cliente-salida');
        // Comparar contra un campo que NO esté enfocado: el enfocado muestra el borde oscuro del focus.
        const otro = document.querySelector('#input-direccion-salida');
        if (!input || !otro) return null;
        return {
          svgs: input.parentElement.querySelectorAll('svg').length,
          borde: getComputedStyle(input).borderTopColor,
          bordeOtro: getComputedStyle(otro).borderTopColor,
          fondo: getComputedStyle(input).backgroundColor,
          fondoOtro: getComputedStyle(otro).backgroundColor,
        };
      });
      ok(`Salida ${t.nombre}: buscador sin icono negro (campo normal)`,
        !!estiloCli && estiloCli.svgs === 0 && estiloCli.borde === estiloCli.bordeOtro,
        estiloCli ? `sin iconos=${estiloCli.svgs === 0}, borde=${estiloCli.borde}` : 'sin datos');

      // Posición de referencia ANTES de abrir la lista: si la capa flota, no debe moverse ni un píxel.
      const campoAntes = await page.$eval('#select-bien-salida', (el) => el.getBoundingClientRect().top);

      // --- Registrar un nombre nuevo COMO NOTA desde la misma lista (sin botón) ---
      await reescribir('#buscar-cliente-salida', 'ZZZZ CLIENTE SIN REGISTRO');
      await pausa(350);
      ok(`Salida ${t.nombre}: opción de registrar nota dentro del desplegable`, await existe('#sugerencia-cliente-nota'));
      ok(`Salida ${t.nombre}: la lista flota como capa fija`, await page.evaluate(() => {
        const l = document.querySelector('#resultados-cliente-salida');
        return !!l && getComputedStyle(l).position === 'fixed' && l.parentElement === document.body;
      }));
      ok(`Salida ${t.nombre}: la lista NO mueve el formulario`, await page.evaluate((antes) => {
        const campo = document.querySelector('#select-bien-salida').getBoundingClientRect();
        return Math.abs(campo.top - antes) <= 2;
      }, campoAntes));
      await page.keyboard.press('Enter');
      await pausa(250);
      ok(`Salida ${t.nombre}: Enter registra la nota`, await existe('#nota-cliente-salida'));
      const notaTexto = await page.$eval('#nota-cliente-salida', (el) => el.innerText);
      ok(`Salida ${t.nombre}: la nota muestra el nombre escrito`, /ZZZZ CLIENTE SIN REGISTRO/i.test(notaTexto), notaTexto);
      ok(`Salida ${t.nombre}: la nota queda DENTRO del cuadro del buscador`, await page.evaluate(() => {
        const nota = document.querySelector('#nota-cliente-salida');
        const input = document.querySelector('#buscar-cliente-salida');
        return !!nota && !!input && nota.parentElement === input.parentElement;
      }));
      ok(`Salida ${t.nombre}: se cierra el desplegable al registrar la nota`, !(await existe('#resultados-cliente-salida')));
      // El dueño pidió que el selector NO se quede atrapado: antes un setTimeout devolvía el foco al buscador.
      await page.keyboard.press('ArrowDown');
      await pausa(250);
      const trasNota = await foco();
      ok(`Salida ${t.nombre}: el foco NO vuelve al buscador tras la nota`, trasNota !== 'buscar-cliente-salida', trasNota || 'sin foco');
      await reescribir('#buscar-cliente-salida', ''); // vaciar quita la nota, sin botón
      await pausa(150);
      ok(`Salida ${t.nombre}: al vaciar el buscador se quita la nota`, !(await existe('#nota-cliente-salida')));

      ok(`Salida ${t.nombre}: botón de cámara`, await existe('#btn-escaner-salida'));
      ok(`Salida ${t.nombre}: opción "Otro" en lo que se atiende`,
        await page.$eval('#select-bien-salida', (el) => Array.from(el.options).some((o) => o.value === 'otro')));

      // Elegir cliente registrado solo con teclado: escribir, bajar con flecha y Enter (como en Caja).
      let sugerenciasCli = [];
      for (const letra of ['a', 'e', 'o', 's', 'i']) {
        await reescribir('#buscar-cliente-salida', letra);
        await pausa(280);
        sugerenciasCli = await page.$$('#resultados-cliente-salida [id^="sugerencia-cliente-"]');
        if (sugerenciasCli.length > 1) break;
      }
      ok(`Salida ${t.nombre}: desplegable muestra clientes`, sugerenciasCli.length > 1, `${sugerenciasCli.length} opciones`);
      if (sugerenciasCli.length > 1) {
        ok(`Salida ${t.nombre}: opción de nota también con coincidencias`, await existe('#sugerencia-cliente-nota'));
        await page.keyboard.press('ArrowDown');
        await pausa(120);
        await page.keyboard.press('Enter');
        await pausa(250);
        const valorCli = await page.$eval('#buscar-cliente-salida', (el) => el.value);
        ok(`Salida ${t.nombre}: Enter elige el cliente y cierra el desplegable`,
          valorCli.trim().length > 0 && !(await existe('#resultados-cliente-salida')), valorCli);
        ok(`Salida ${t.nombre}: foco sigue en el buscador de cliente`,
          (await foco()) === 'buscar-cliente-salida', await foco());
        // 189: con la lista cerrada, ↓ debe bajar al siguiente campo (no quedarse en el buscador).
        await page.keyboard.press('ArrowDown');
        await pausa(200);
        // En celular el campo de abajo es "Lo que se atiende"; en tablet/PC va a "Dirección" porque
        // esos tres campos están en la misma fila. Lo que se comprueba es que SALE del buscador.
        const trasFlecha = await foco();
        ok(`Salida ${t.nombre}: ↓ baja del buscador al siguiente campo`,
          trasFlecha !== 'buscar-cliente-salida' && /^(select|input)-/.test(trasFlecha), trasFlecha);
        // Y con la lista ABIERTA: desde la última opción, ↓ la cierra y baja al campo siguiente.
        await reescribir('#buscar-cliente-salida', 'ZZZ Sin Cliente');
        await pausa(250);
        ok(`Salida ${t.nombre}: lista con una sola opción abierta`, await existe('#resultados-cliente-salida'));
        await page.keyboard.press('ArrowDown');
        await pausa(250);
        const trasBorde = await foco();
        ok(`Salida ${t.nombre}: ↓ desde la última opción baja al siguiente campo`,
          !(await existe('#resultados-cliente-salida')) && trasBorde !== 'buscar-cliente-salida' && /^(select|input)-/.test(trasBorde), trasBorde);
      } else {
        ok(`Salida ${t.nombre}: Enter elige el cliente`, false, 'sin sugerencias para probar');
      }
      await pausa(300);
      await page.select('#select-bien-salida', 'otro');
      await pausa(200);
      ok(`Salida ${t.nombre}: aparece el nombre libre de lo que se atiende`, await existe('#input-bien-libre-salida'));
      await page.select('#select-bien-salida', '');

      const estilo = await page.$eval('#modal-nueva-salida-container', (el) => ({
        radius: getComputedStyle(el).borderTopLeftRadius,
      }));
      ok(`Salida ${t.nombre}: estilo sobrio sin esquinas`, estilo.radius === '0px', estilo.radius);

      const buscador = await page.$eval('#input-buscar-producto-salida', (el) => ({
        minH: parseFloat(getComputedStyle(el).minHeight) || 0,
        sticky: getComputedStyle(el.parentElement?.parentElement || el).position,
      }));
      if (celular) ok(`Salida ${t.nombre}: buscador grande y fijo arriba`, buscador.minH >= 44 && buscador.sticky === 'sticky', `minH ${buscador.minH}, ${buscador.sticky}`);
      else ok(`Salida ${t.nombre}: buscador presente`, true, `minH ${buscador.minH}`);

      // Producto nuevo entra arriba: escribir, Enter para elegir, Enter en cantidad para agregar
      try {
        const nominal = await page.$eval('#input-buscar-producto-salida', (el) => el.placeholder.length > 0);
        if (nominal) {
          await page.focus('#input-buscar-producto-salida');
          await page.keyboard.type('a');
          await pausa(400);
          const sugerencias = await page.$$('[id^="sugerencia-salida-"]');
          if (sugerencias.length) {
            const nombre = await sugerencias[0].evaluate((el) => el.innerText.split('\n')[0].trim());
            await page.keyboard.press('Enter');
            await pausa(200);
            await page.focus('#input-cant-item-salida');
            await page.keyboard.press('Enter');
            await pausa(300);
            const primera = await page.$eval('table[data-tabla-campos] tbody tr:first-child td:nth-child(3)', (el) => el.innerText.trim());
            ok(`Salida ${t.nombre}: producto nuevo entra arriba`, primera.toUpperCase().includes(nombre.toUpperCase().slice(0, 8)), `${primera} vs ${nombre}`);
            // Quitar el material para no dejar datos en el borrador
            await page.click('table[data-tabla-campos] tbody tr:first-child td:last-child button');
            await pausa(200);
          } else {
            res.push(`➖ Salida ${t.nombre}: sin sugerencias con "a", orden no probado`);
          }
        }
      } catch (e) {
        res.push(`➖ Salida ${t.nombre}: orden de producto no probado (${e.message.slice(0, 60)})`);
      }
      await cerrar();
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

  console.log('\nResultados (adaptivo: salida, Caja y Agenda, solo Nego):\n' + res.join('\n'));
  const fallos = res.filter((r) => r.startsWith('❌')).length;
  const sinProbar = res.filter((r) => r.startsWith('➖')).length;
  console.log(`\nTotal: ${res.length} comprobaciones, ${fallos} fallos, ${sinProbar} sin datos/no probadas.`);
} catch (err) {
  console.error('Error durante la prueba:', err);
  process.exit(1);
} finally {
  await nav.close();
}
