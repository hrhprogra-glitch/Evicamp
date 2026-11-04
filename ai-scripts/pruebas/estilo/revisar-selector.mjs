// Revisa las reglas del selector (teclado) del dueño en secciones, pestañas y ventanas:
//  1. Con las flechas se llega a TODOS los botones, buscadores, filtros y campos (recorrido ← → ↑ ↓ desde donde arranca).
//  2. Calendario: Enter lo abre y el selector se queda en la fecha (al elegir, tampoco salta al siguiente cuadro).
//  3. Moverse con ← → ↑ ↓ (parte del recorrido del punto 1).
//  4. Al salir del sistema (otra pestaña o programa) y volver, algo queda seleccionado.
//  5. En una ventana flotante el selector nunca se pierde (ni con flechas, ni con Tab, ni con un clic en el fondo).
//  6. Con una ventana abierta, el selector nunca sale de ella.
// Abre una caja y un producto de prueba por SQL (no vende nada) y al final los borra.
// Uso: node ai-scripts/pruebas/estilo/revisar-selector.mjs [filtro]   (filtro = parte del nombre, ej. "inventario")
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch { puppeteer = require('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core'); }
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../../vps.cjs');
process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../.env.vps'));
const FILTRO = process.argv[2] || '';
const PROD = 9100000000077, CAJA = 9100000000077;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// [nombre, sección, pestaña o null, botón que abre la ventana o null]
const CASOS = [
  ['Caja', 'pos', null, null],
  ['Caja › Cobro', 'pos', null, 'btn-proceder-pago'],
  ['Caja › Cliente', 'pos', null, 'btn-pos-header-cliente'],
  ['Caja › Espera', 'pos', null, 'btn-pausar-ticket'],
  ['Caja › Cotización', 'pos', null, 'btn-pos-cotizacion'],
  ['Caja › Pedido', 'pos', null, 'btn-pos-pedido'],
  ['Clientes', 'clientes', null, null],
  ['Clientes › Nuevo cliente', 'clientes', null, 'btn-nuevo-cliente'],
  ['Clientes › Grupos', 'clientes', null, 'btn-ver-grupos'],
  ['Créditos', 'clientes', 'tab-clientes-creditos', null],
  ['Cotizaciones', 'clientes', 'tab-clientes-cotizaciones', null],
  ['Pedidos', 'clientes', 'tab-clientes-pedidos', null],
  ['Inventario', 'inventario', null, null],
  ['Inventario › Nuevo producto', 'inventario', null, 'btn-nuevo-producto'],
  ['Inventario › Ingresar lote', 'inventario', null, 'btn-ingresar-lote'],
  ['Inventario › Producir', 'inventario', null, 'btn-header-producir'],
  ['Inventario › Traspasos', 'inventario', null, 'btn-traspasos'],
  ['Inventario › Proveedores', 'inventario', null, 'btn-proveedores'],
  ['Lotes', 'inventario', 'btn-tab-lotes', null],
  ['Compras', 'inventario', 'btn-tab-compras', null],
  ['Conteos', 'conteos', null, null],
  ['Conteos › Nuevo ajuste', 'conteos', null, 'btn-nuevo-ajuste'],
  ['Finanzas', 'finanzas', null, null],
  ['Finanzas › Nuevo movimiento', 'finanzas', null, 'btn-nuevo-movimiento'],
  ['Finanzas › Reporte contador', 'finanzas', null, 'btn-reporte-contador'],
  ['Finanzas › Cierre de caja', 'finanzas', null, 'btn-cerrar-caja'],
  ['Ver historial', 'finanzas', 'btn-ver-historial', null],
  ['Utilidades', 'utilidades', null, null],
  ['Ajustes › Empresa', 'configuracion', null, null],
  ['Ajustes › Tiendas', 'configuracion', 'btn-tab-tiendas', null],
  ['Ajustes › Nueva tienda', 'configuracion', 'btn-tab-tiendas', 'btn-nueva-tienda'],
  ['Ajustes › Tienda web', 'configuracion', 'btn-tab-tienda_web', null],
  ['Ajustes › Facturación', 'configuracion', 'btn-tab-facturacion', null],
  ['Ajustes › Usuarios', 'configuracion', 'btn-tab-usuarios', null],
  ['Ajustes › Nuevo usuario', 'configuracion', 'btn-tab-usuarios', 'btn-nuevo-usuario-ajustes'],
  ['Ajustes › Apariencia', 'configuracion', 'btn-tab-apariencia', null],
  ['Ajustes › Sugerencias', 'configuracion', 'btn-tab-sugerencias', null],
].filter((c) => !FILTRO || c[0].toLowerCase().includes(FILTRO.toLowerCase()));

const ssh = new NodeSSH(); await ssh.connect(conexionVps);
const sql = async (q) => (await ssh.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q })).stdout.trim();
if (await sql("SELECT count(*) FROM cash_sessions WHERE status = 'OPEN' AND id <> " + CAJA) !== '0') { console.log('Hay una caja abierta de verdad en siumax: no hago nada.'); process.exit(1); }
const ventasAntes = Number(await sql('SELECT count(*) FROM sales'));
// Si algo llegara a vender el producto de prueba, se borra esa venta y su movimiento (siumax queda como estaba)
const limpiar = () => sql(`DELETE FROM inventory_movements WHERE product_id = ${PROD};
  DELETE FROM sales WHERE id IN (SELECT sale_id FROM sale_details WHERE product_id = ${PROD});
  DELETE FROM sale_details WHERE product_id = ${PROD};
  DELETE FROM products WHERE id = ${PROD}; DELETE FROM cash_sessions WHERE id = ${CAJA};`);
await limpiar();
await sql(`INSERT INTO cash_sessions (id, opening_balance, status, opened_at, is_synced) VALUES (${CAJA}, 0, 'OPEN', now(), 1);
  INSERT INTO products (id, name, price, quantity, unit, category, is_active, control_type) VALUES (${PROD}, 'PRUEBA SELECTOR', 5, 50, 'UND', 'PRUEBAS', 1, 'UNIT');`);

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, defaultViewport: { width: 1366, height: 768 } });
const informe = []; const errores = [];
try {
  const page = await nav.newPage(); page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.type('#input-login-usuario', 'admin@siumax.com'); await page.type('#input-login-password', process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter'); await page.waitForSelector('#sidebar-btn-pos', { timeout: 20000 }); await pausa(2500);
  // Un producto en el ticket (para el cobro)
  await page.evaluate(() => document.getElementById('sidebar-btn-pos')?.click()); await pausa(1500);
  await page.focus('#buscador-global-pos'); await page.keyboard.type('PRUEBA SELECTOR', { delay: 20 }); await pausa(1000);
  await page.keyboard.press('Enter'); await pausa(1000);

  // Ámbito: la ventana de arriba si hay una; si no, el contenido de la sección (sin el menú lateral)
  const PREP = () => {
    window.__sel = {};
    const SEL = '[role="dialog"], [aria-modal="true"], [data-dialogo-sistema], .fixed.inset-0';
    // Visible de verdad: ni escondido, ni dentro de un panel transparente o de ancho cero (ej. el panel de fiado cerrado)
    const vis = (el) => {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return false;
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.opacity === '0' || (cs.overflow === 'hidden' && p.getBoundingClientRect().width < 2)) return false;
      }
      return true;
    };
    window.__sel.ventana = () => {
      const t = [...document.querySelectorAll(SEL)].filter((el) => !el.closest('[data-fondo-menu]') && vis(el));
      const ext = t.filter((el) => !t.some((o) => o !== el && o.contains(el)));
      return ext.reduce((s, el) => (!s || (Number(getComputedStyle(el).zIndex) || 0) >= (Number(getComputedStyle(s).zIndex) || 0) ? el : s), null);
    };
    window.__sel.ambito = () => window.__sel.ventana() || document.querySelector('main');
    window.__sel.nombre = (el) => {
      if (!el || el === document.body) return '(nada: selector perdido)';
      const t = (el.innerText || el.placeholder || el.title || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 22);
      return (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.type ? `[${el.type}]` : '')) + (t ? ` "${t}"` : '');
    };
    // Controles que el selector debe alcanzar (sin filas de tablas ni lo que está dentro de ellas)
    const FILA = '[data-row="true"], [data-row-prov="true"], [data-fila-cliente="true"], [data-fila-ticket="true"], tr[role="button"], [id^="coti-row-"], [id^="ped-row-"], tbody tr';
    window.__sel.marcar = () => {
      document.querySelectorAll('[data-sel]').forEach((el) => el.removeAttribute('data-sel'));
      const a = window.__sel.ambito(); if (!a) return 0;
      const els = [...a.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.tabIndex !== -1 && vis(el) && !el.closest('#evicamp-sidebar') && !el.closest(FILA) && !el.matches(FILA) && el.getAttribute('aria-hidden') !== 'true');
      els.forEach((el, i) => el.setAttribute('data-sel', String(i)));
      // La primera y la última fila de las tablas también se recorren (por ellas se llega a la paginación de abajo)
      const filas = [...a.querySelectorAll(FILA)].filter((f) => vis(f) && f.tabIndex >= 0);
      [filas[0], filas[filas.length - 1]].filter(Boolean).forEach((f, j) => f.setAttribute('data-sel', 'f' + j));
      return els.length;
    };
  };
  const enAmbito = () => page.evaluate(() => { const a = window.__sel.ambito(); const el = document.activeElement; return { dentro: !!(a && el && el !== document.body && a.contains(el)), perdido: !el || el === document.body, nombre: window.__sel.nombre(el), sel: el?.getAttribute?.('data-sel') ?? null, fila: !!el?.closest?.('tbody tr, [data-row="true"]') }; });
  const enfocar = (i) => page.evaluate((n) => { const el = document.querySelector(`[data-sel="${n}"]`); if (!el) return false; el.focus(); return document.activeElement === el; }, i);
  const cerrarTodo = async () => { for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); await pausa(200); } };
  const salirYVolver = async () => {
    const otra = await nav.newPage(); await otra.bringToFront(); await pausa(500);
    await otra.close(); await page.bringToFront();
    await page.evaluate(() => { window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
    await pausa(700);
  };

  for (const [nombre, seccion, pestana, boton] of CASOS) {
    const fallas = [];
    await cerrarTodo();
    await page.evaluate((id) => document.getElementById('sidebar-btn-' + id)?.click(), seccion); await pausa(2000);
    if (pestana) { await page.evaluate((id) => document.getElementById(id)?.click(), pestana); await pausa(1500); }
    if (boton) {
      const hay = await page.evaluate((id) => { const b = document.getElementById(id); if (!b) return false; b.click(); return true; }, boton);
      if (!hay) { informe.push(`·  ${nombre}: el botón no está en pantalla`); continue; }
      await pausa(1500);
    }
    await page.evaluate(PREP);
    const esVentana = await page.evaluate(() => !!window.__sel.ventana());
    if (boton && !esVentana) { informe.push(`·  ${nombre}: no abrió ventana`); continue; }

    // Al abrir: algo seleccionado (y dentro de la ventana)
    const ini = await enAmbito();
    if (ini.perdido) fallas.push('al abrir no hay nada seleccionado');
    else if (esVentana && !ini.dentro) fallas.push(`al abrir el selector está fuera de la ventana (${ini.nombre})`);

    // Regla 4: salir del sistema y volver (con el selector perdido antes de salir)
    await page.evaluate(() => document.activeElement?.blur()); await pausa(200);
    await salirYVolver();
    const vuelta = await enAmbito();
    if (vuelta.perdido) fallas.push('al salir y volver al sistema no queda nada seleccionado');
    else if (esVentana && !vuelta.dentro) fallas.push(`al volver, el selector quedó fuera de la ventana (${vuelta.nombre})`);

    // Regla 5/6 (ventanas): clic en el fondo oscuro, Tab y flechas: nunca perdido ni fuera
    if (esVentana) {
      await page.evaluate(() => { const v = window.__sel.ventana(); const p = [...v.querySelectorAll('input, button, select')].find((el) => el.getClientRects().length); p?.focus(); });
      await page.mouse.click(3, 3); await pausa(500);
      if (await page.evaluate(() => !!window.__sel.ventana())) {
        const c = await enAmbito();
        if (c.perdido) fallas.push('con un clic en el fondo oscuro se pierde el selector');
        else if (!c.dentro) fallas.push(`con un clic en el fondo el selector sale de la ventana (${c.nombre})`);
      } else { informe.push(`·  ${nombre}: el clic en el fondo cerró la ventana`); continue; }
      await page.evaluate(() => { const v = window.__sel.ventana(); const p = [...v.querySelectorAll('input, button, select')].find((el) => el.getClientRects().length); p?.focus(); });
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press('Tab'); await pausa(80);
        if (!(await page.evaluate(() => !!window.__sel.ventana()))) break;
        const t = await enAmbito();
        if (t.perdido || !t.dentro) { fallas.push(`con Tab el selector ${t.perdido ? 'se pierde' : 'sale de la ventana (' + t.nombre + ')'}`); break; }
      }
    }

    // Reglas 1, 3, 5, 6: recorrido con flechas desde cada control; ¿se llega a todos?
    const total = await page.evaluate(() => window.__sel.marcar());
    const alcanzados = new Set(); const malos = new Set(); const saltos = new Set();
    const inicio = await page.evaluate(() => { const a = document.activeElement; return a?.getAttribute?.('data-sel') ?? null; });
    const cola = [inicio ?? '0']; const vistos = new Set(cola);
    alcanzados.add(cola[0]);
    let pasos = 0;
    while (cola.length && pasos < 400) {
      const n = cola.shift();
      for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
        if (!(await enfocar(n))) break;
        await page.keyboard.press(k); await pausa(220); pasos++;
        const r = await enAmbito();
        // Entró a una lista o a una línea (opción de búsqueda, línea del ticket, fila): se sigue recorriendo desde ahí
        if (r.sel === null && !r.perdido && pasos < 380) {
          const nuevo = await page.evaluate((c) => {
            const el = document.activeElement;
            if (!el || !el.closest('[role="option"], [data-fila-ticket="true"], [data-lote-prod-item="true"]')) return null;
            el.setAttribute('data-sel', 'x' + c);
            return 'x' + c;
          }, pasos);
          if (nuevo) r.sel = nuevo;
        }
        if (esVentana && !(await page.evaluate(() => !!window.__sel.ventana()))) { malos.add(`${k} en ${n} cerró la ventana`); await page.evaluate((id) => document.getElementById(id)?.click(), boton); await pausa(1200); await page.evaluate(PREP); await page.evaluate(() => window.__sel.marcar()); break; }
        if (r.perdido) malos.add(`${k} desde ${await page.evaluate((i) => window.__sel.nombre(document.querySelector(`[data-sel="${i}"]`)), n)} pierde el selector`);
        else if (esVentana && !r.dentro) malos.add(`${k} desde ${await page.evaluate((i) => window.__sel.nombre(document.querySelector(`[data-sel="${i}"]`)), n)} sale de la ventana a ${r.nombre}`);
        // ¿Se saltó algo? (orden de lectura: no pasar por encima de un control que está en medio, ni ir al de la derecha
        // cuando el de la izquierda está igual de alineado)
        if (r.sel !== null && r.sel !== n && !r.perdido) {
          const salto = await page.evaluate((origen, k) => {
            const a = document.querySelector(`[data-sel="${origen}"]`), b = document.activeElement;
            if (!a || !b) return null;
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            const cruceH = (p, q) => Math.min(p.right, q.right) - Math.max(p.left, q.left);
            const cruceV = (p, q) => Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
            const otros = [...document.querySelectorAll('[data-sel]')].filter((c) => c !== a && c !== b && !/^[fx]/.test(c.getAttribute('data-sel')) && c.getClientRects().length && !c.disabled && c.getAttribute('aria-disabled') !== 'true');
            for (const c of otros) {
              const rc = c.getBoundingClientRect();
              let medio = false, izquierda = false;
              if (k === 'ArrowDown') { medio = rb.top > ra.bottom && rc.top >= ra.bottom - 4 && rc.bottom <= rb.top + 4 && cruceH(rc, ra) > 0 && cruceH(rc, rb) > 0;
                izquierda = Math.abs(rc.top - rb.top) < 8 && rc.left < rb.left && cruceH(rc, ra) >= 0.85 * cruceH(rb, ra) && cruceH(rb, ra) > 0; }
              if (k === 'ArrowUp') { medio = rb.bottom < ra.top && rc.bottom <= ra.top + 4 && rc.top >= rb.bottom - 4 && cruceH(rc, ra) > 0 && cruceH(rc, rb) > 0;
                izquierda = Math.abs(rc.top - rb.top) < 8 && rc.left < rb.left && cruceH(rc, ra) >= 0.85 * cruceH(rb, ra) && cruceH(rb, ra) > 0; }
              if (k === 'ArrowRight') medio = rb.left > ra.right && rc.left >= ra.right - 4 && rc.right <= rb.left + 4 && cruceV(rc, ra) > 0 && cruceV(rc, rb) > 0;
              if (k === 'ArrowLeft') medio = rb.right < ra.left && rc.right <= ra.left + 4 && rc.left >= rb.right - 4 && cruceV(rc, ra) > 0 && cruceV(rc, rb) > 0;
              if (b.getAttribute('role') === 'tab' && c.getAttribute('role') === 'tab') continue; // ↑ a la pestaña elegida (no a otra pestaña): es la regla de las pestañas
              if (medio || izquierda) return `${k.replace('Arrow', '')} desde ${window.__sel.nombre(a)} va a ${window.__sel.nombre(b)} y se salta ${window.__sel.nombre(c)}`;
            }
            return null;
          }, n, k);
          if (salto) saltos.add(salto.replace('Right', '→').replace('Left', '←').replace('Down', '↓').replace('Up', '↑'));
        }
        if (r.sel !== null && !vistos.has(r.sel)) { vistos.add(r.sel); alcanzados.add(r.sel); cola.push(r.sel); }
        // Si llegó a la primera fila, con ↓ se baja por todas: la última fila también cuenta como alcanzada
        if (r.sel === 'f0' && !vistos.has('f1')) { vistos.add('f1'); alcanzados.add('f1'); cola.push('f1'); }
      }
    }
    const sinLlegar = await page.evaluate((ok) => [...document.querySelectorAll('[data-sel]')].filter((el) => !ok.includes(el.getAttribute('data-sel')) && !el.getAttribute('data-sel').startsWith('f') && el.getClientRects().length).map((el) => window.__sel.nombre(el)), [...alcanzados]);
    if (sinLlegar.length) fallas.push(`con flechas no se llega a ${sinLlegar.length} de ${total}: ${sinLlegar.slice(0, 6).join(', ')}${sinLlegar.length > 6 ? '…' : ''}`);
    for (const m of [...malos].slice(0, 3)) fallas.push(m);
    if (saltos.size) fallas.push(`orden de lectura (${saltos.size} saltos): ${[...saltos].slice(0, 4).join(' · ')}${saltos.size > 4 ? '…' : ''}`);

    // Regla 2: calendarios
    const fechas = await page.evaluate(() => { const a = window.__sel.ambito(); document.querySelectorAll('[data-fecha]').forEach((el) => el.removeAttribute('data-fecha')); return [...a.querySelectorAll('input[type="date"]')].filter((el) => el.getClientRects().length).map((el, i) => { el.setAttribute('data-fecha', String(i)); return window.__sel.nombre(el); }); });
    // SEGURIDAD: si el selector deja la fecha, no se presiona nada más (un Enter en otro botón podría cobrar o guardar)
    const enFecha = (n) => page.evaluate((x) => document.activeElement === document.querySelector(`[data-fecha="${x}"]`), n);
    for (let i = 0; i < fechas.length; i++) {
      if (!(await page.evaluate((n) => { const el = document.querySelector(`[data-fecha="${n}"]`); el?.focus(); return !!el && document.activeElement === el; }, i))) continue;
      await page.keyboard.press('Enter'); await pausa(400);
      if (!(await enFecha(i))) { fallas.push(`calendario ${fechas[i]}: Enter no se queda en la fecha (salta a ${(await enAmbito()).nombre})`); continue; }
      // Elegir una fecha (como al terminar en el calendario) y volver a dar Enter
      await page.keyboard.type('15112026', { delay: 30 }); await pausa(400);
      if (!(await enFecha(i))) { fallas.push(`calendario ${fechas[i]}: al elegir la fecha el selector se va`); continue; }
      await page.keyboard.press('Enter'); await pausa(400);
      if (!(await enFecha(i))) fallas.push(`calendario ${fechas[i]}: después de elegir, Enter salta a otro cuadro`);
    }
    // SEGURIDAD: ninguna prueba debe crear ventas
    const ventasAhora = Number(await sql('SELECT count(*) FROM sales'));
    if (ventasAhora !== ventasAntes) { informe.push(`🛑 ${nombre}: se creó una venta durante la prueba; me detengo`); break; }

    informe.push(fallas.length ? `❌ ${nombre} (${total} controles${fechas.length ? `, ${fechas.length} calendarios` : ''}):\n     - ${fallas.join('\n     - ')}` : `✅ ${nombre} (${total} controles${fechas.length ? `, ${fechas.length} calendarios` : ''})`);
  }
} finally {
  await nav.close();
  await limpiar();
  console.log(informe.join('\n'), '\nerrores JS:', errores.length, errores.slice(0, 3));
  console.log('Limpieza: caja de prueba', await sql(`SELECT count(*) FROM cash_sessions WHERE id = ${CAJA}`), '· producto de prueba', await sql(`SELECT count(*) FROM products WHERE id = ${PROD}`));
  ssh.dispose();
}
