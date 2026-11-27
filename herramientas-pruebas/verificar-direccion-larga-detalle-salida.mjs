// Solo lectura: abre el detalle de una salida falsa con Dirección y Ubicación (link) largos.
// Comprueba que se vean en UNA línea con «…», con el valor completo en el tooltip, sin JS
// y sin escribir en la base. Todo por teclado. Uso:
//   node herramientas-pruebas/verificar-direccion-larga-detalle-salida.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
process.loadEnvFile('E:/Programacion/siumax/.env.vps');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.argv[2] || 'http://localhost:5173';

const DIRECCION = 'AV. RINCONADA DE LAGO 1536, LA MOLINA, LIMA, PERÚ — referencia: frente al parque, portón negro';
const UBICACION = 'https://www.google.com/maps/search/?api=1&query=Av.+Rinconada+de+Lago+1536%2C+La+Molina%2C+Lima%2C+Per%C3%BA&z=17';

const PERMISOS = {
  inventario_ver: true, almacen_ver_stock: true, almacen_editar: true,
  salidas_ver: true, salidas_crear: true, salidas_editar: true,
  cobros_ver: true, finanzas_ver: true, configuracion_ver: true,
};
const EMPLEADO = { id: 990001, nombre: 'ADMIN PRUEBA IA', email: 'admin@prueba-ia.local', rol: 'admin', permisos: PERMISOS };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
const responder = (req, opciones) => req.respond({ ...opciones, headers: { ...CORS, ...(opciones.headers || {}) } });

const salida = {
  id: 9900418, codigo: 'SAL-LARGA-IA', tipo: 'SALIDA', customer_id: 990001,
  bien_id: null, direccion: DIRECCION, ubicacion: UBICACION, fecha: '2026-11-27',
  estado: 'EN_PROCESO', salida_raiz_id: null, observaciones: '',
  usuario: 'Administrador SiuHub', created_at: new Date().toISOString(),
  customer: { id: 990001, name: 'DANIEL REYNAFAR', direccion: DIRECCION },
  bien: null, trabajadores: [], items: [], devoluciones: [],
};

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true, args: ['--no-sandbox'],
});
const page = await nav.newPage();
const errores = [];
const resultados = {};
const ok = (nombre, condicion, extra = '') => {
  resultados[nombre] = !!condicion;
  console.log(`${condicion ? 'OK   ' : 'FALLO'} ${nombre}${extra ? ' | ' + extra : ''}`);
};

try {
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('consola: ' + m.text()); });
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1437, height: 900 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('nego_tipos_negocio', JSON.stringify(['servicios', 'comercio']));
  });
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    try {
      const url = new URL(req.url());
      const ruta = url.pathname;
      if (req.method() === 'OPTIONS') return req.continue();
      if (ruta.includes('/rpc/')) {
        const rpc = ruta.split('/').pop();
        if (rpc === 'fn_login') return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'TOKEN-IA', ...EMPLEADO }) });
        if (rpc === 'fn_validar_sesion') return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify(EMPLEADO) });
        if (rpc === 'fn_cerrar_sesion') return responder(req, { status: 200, contentType: 'application/json', body: '{"success":true}' });
        if (rpc === 'fn_ventas_por_producto') return responder(req, { status: 200, contentType: 'application/json', body: '[]' });
        return responder(req, { status: 200, contentType: 'application/json', body: '{"success":true}' });
      }
      const objeto = /vnd\.pgrst\.object/.test(String(req.headers().accept || '')) || url.searchParams.has('id');
      if (ruta === '/rest/v1/empresa_config') {
        const config = { id: 1, nombre_empresa: 'PRUEBA IA', logo_url: '', tipos_negocio: ['servicios', 'comercio'] };
        return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify(objeto ? config : [config]) });
      }
      if (ruta === '/rest/v1/salidas') {
        return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify(objeto ? salida : [salida]) });
      }
      if (ruta.startsWith('/rest/v1/')) {
        return responder(req, { status: 200, contentType: 'application/json', body: '[]' });
      }
      return req.continue();
    } catch (e) {
      errores.push('interceptor: ' + e.message);
      try { await req.continue(); } catch {}
    }
  });

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.keyboard.press('Enter'); await pausa(300);
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE || '');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 30000 });
  await pausa(1000);
  await page.focus('#sidebar-btn-salidas');
  await page.keyboard.press('Enter');
  await page.waitForSelector('tr[data-fila-salida="true"]', { timeout: 20000 });
  await pausa(500);
  await page.focus('tr[data-fila-salida="true"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#modal-detalle-salida-container', { timeout: 15000 });
  await pausa(400);

  const dato = (etiqueta) => page.evaluate((nombre) => {
    const cont = document.getElementById('modal-detalle-salida-container');
    if (!cont) return null;
    const etiquetas = [...cont.querySelectorAll('span')].filter((e) => (e.textContent || '').trim() === nombre);
    const span = etiquetas[0];
    const caja = span?.nextElementSibling;
    const valor = caja?.querySelector('span') || caja;
    if (!caja || !valor) return null;
    const estilo = getComputedStyle(valor);
    return {
      texto: (valor.textContent || '').trim(),
      title: valor.getAttribute('title') || '',
      aria: valor.getAttribute('aria-label') || '',
      whiteSpace: estilo.whiteSpace,
      textOverflow: estilo.textOverflow,
      overflow: estilo.overflow,
      altoCaja: Math.round(caja.getBoundingClientRect().height),
      recortado: valor.scrollWidth > valor.clientWidth + 1,
      cliente: valor.clientWidth,
      scroll: valor.scrollWidth,
    };
  }, etiqueta);

  const direccion = await dato('Dirección');
  const ubicacion = await dato('Ubicación');
  ok('La dirección larga se muestra en una sola línea',
    !!direccion && direccion.whiteSpace === 'nowrap' && direccion.textOverflow === 'ellipsis' && direccion.recortado && direccion.altoCaja <= 44,
    JSON.stringify(direccion));
  ok('El tooltip guarda la dirección completa',
    !!direccion && direccion.title === DIRECCION && direccion.aria === DIRECCION, direccion?.title?.slice(0, 80));
  ok('El link largo se muestra en una sola línea',
    !!ubicacion && ubicacion.whiteSpace === 'nowrap' && ubicacion.textOverflow === 'ellipsis' && ubicacion.recortado && ubicacion.altoCaja <= 44,
    JSON.stringify(ubicacion));
  ok('El tooltip guarda el link completo',
    !!ubicacion && ubicacion.title === UBICACION && ubicacion.aria === UBICACION, ubicacion?.title?.slice(0, 80));
  const filasParejas = await page.evaluate(() => {
    const cont = document.getElementById('modal-detalle-salida-container');
    const grilla = cont?.querySelector('#inicio-detalle-salida .grid');
    if (!grilla) return null;
    const cajas = [...grilla.children].map((hijo) => hijo.querySelector('div'));
    const altos = cajas.filter(Boolean).map((c) => Math.round(c.getBoundingClientRect().height));
    return { altos, parejas: new Set(altos).size === 1 };
  });
  ok('Todas las celdas de la fila siguen con la misma altura', !!filasParejas?.parejas, JSON.stringify(filasParejas));
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | '));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  const todoBien = Object.values(resultados).every(Boolean);
  console.log('CHECKS:', JSON.stringify(resultados));
  console.log('TODO BIEN:', todoBien);
  process.exit(todoBien ? 0 : 1);
}
