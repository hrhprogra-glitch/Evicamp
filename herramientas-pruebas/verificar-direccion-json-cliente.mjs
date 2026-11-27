// Solo lectura: comprueba que una dirección guardada como JSON migratorio NO se vea cruda
// ni en el detalle de la salida ni al elegir el cliente en Nueva salida (ecosistema/cualquier sitio).
// Todo por teclado, con RPC/rest falsos y sin escribir en la base. Uso:
//   node herramientas-pruebas/verificar-direccion-json-cliente.mjs [url]
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
process.loadEnvFile('E:/Programacion/siumax/.env.vps');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.argv[2] || 'http://localhost:5173';
// Si se pasa BUNDLE_DIR, se sustituye cualquier index-*.js/css por el bundle local (prueba en vivo).
const DIST = process.env.BUNDLE_DIR || '';
const JS_LOCAL = DIST ? readdirSync(DIST).find((n) => /^index-.*\.js$/.test(n)) : '';
const CSS_LOCAL = DIST ? readdirSync(DIST).find((n) => /^index-.*\.css$/.test(n)) : '';
if (DIST) console.log('bundle local:', JS_LOCAL, '/', CSS_LOCAL);

const JSON_DIR = '{"zip":"","pais":"","calle":"MZA. 3A LOTE. 35 SOL DE LA MOLINA LIMA - LIMA - LA MOLINA","calle2":"","ciudad":"","estado":"","distrito":""}';
const LIMPIA = 'MZA. 3A LOTE. 35 SOL DE LA MOLINA LIMA - LIMA - LA MOLINA';
const PERMISOS = {
  inventario_ver: true, almacen_ver_stock: true, almacen_editar: true,
  salidas_ver: true, salidas_crear: true, salidas_editar: true,
  cobros_ver: true, finanzas_ver: true, configuracion_ver: true,
};
const EMPLEADO = { id: 990001, nombre: 'ADMIN PRUEBA IA', email: 'admin@prueba-ia.local', rol: 'admin', permisos: PERMISOS };
const CLIENTE = { id: 990123, name: 'CLIENTE DIRECCION JSON', dni: '', ruc: '', direccion: JSON_DIR, activo: true };
const SALIDA = {
  id: 9900419, codigo: 'SAL-JSON-IA', tipo: 'SALIDA', customer_id: CLIENTE.id,
  bien_id: null, direccion: JSON_DIR, ubicacion: '', fecha: '2026-11-27',
  estado: 'EN_PROCESO', salida_raiz_id: null, observaciones: '',
  usuario: 'Administrador SiuHub', created_at: new Date().toISOString(),
  customer: CLIENTE, bien: null, trabajadores: [], items: [], devoluciones: [],
};
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
const responder = (req, opciones) => req.respond({ ...opciones, headers: { ...CORS, ...(opciones.headers || {}) } });

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true, args: ['--no-sandbox'],
});
const resultados = [];
const check = (nombre, ok, detalle = '') => {
  resultados.push(!!ok);
  console.log(`${ok ? 'OK' : 'FALLO'} - ${nombre}${detalle ? ` (${detalle})` : ''}`);
};
try {
  const page = await nav.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  // ecosistema no tiene suscripcion.json (archivo del panel): ese 404 es ajeno a Salidas.
  const esAjeno = (url = '') => url.includes('suscripcion.json');
  page.on('console', (m) => {
    if (m.type() === 'error' && !esAjeno(m.location()?.url || '')) errores.push('consola: ' + m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !esAjeno(r.url())) errores.push(`HTTP ${r.status()} ${r.url()}`);
  });
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1437, height: 900 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('nego_tipos_negocio', JSON.stringify(['servicios', 'comercio']));
    localStorage.removeItem('siumax_servic_borrador_salida');
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
        return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify(objeto ? SALIDA : [SALIDA]) });
      }
      if (ruta === '/rest/v1/customers') {
        return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify([CLIENTE]) });
      }
      if (DIST && ruta.includes('/assets/') && /^index-.*\.(js|css)$/.test(ruta.split('/').pop() || '')) {
        const css = ruta.endsWith('.css');
        return req.respond({
          status: 200,
          contentType: css ? 'text/css' : 'text/javascript',
          body: readFileSync(path.join(DIST, css ? CSS_LOCAL : JS_LOCAL)),
        });
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
  await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com'); await page.keyboard.press('Enter'); await pausa(300);
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE || ''); await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 30000 }); await pausa(1000);
  await page.focus('#sidebar-btn-salidas'); await page.keyboard.press('Enter');
  await page.waitForSelector('tr[data-fila-salida="true"]', { timeout: 20000 }); await pausa(500);

  // A) Detalle de una salida que ya guardó el JSON crudo.
  await page.focus('tr[data-fila-salida="true"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('#modal-detalle-salida-container', { timeout: 15000 }); await pausa(500);
  const detalle = await page.evaluate(() => document.getElementById('modal-detalle-salida-container')?.textContent || '');
  check('el detalle no muestra el JSON crudo', !detalle.includes('"zip"') && !detalle.includes('"calle"'));
  check('el detalle muestra la calle legible', detalle.includes('MZA. 3A LOTE. 35 SOL DE LA MOLINA'));
  await page.keyboard.press('Escape'); await pausa(600);

  // B) Nueva salida: al elegir el cliente, el campo Dirección debe quedar limpio.
  await page.focus('#btn-nueva-salida'); await page.keyboard.press('Enter');
  await page.waitForSelector('#buscar-cliente-salida', { timeout: 15000 }); await pausa(700);
  await page.focus('#buscar-cliente-salida'); await page.keyboard.type('CLIENTE DIRECCION JSON'); await pausa(900);
  await page.focus('#sugerencia-cliente-0'); await page.keyboard.press('Enter'); await pausa(1200);
  const campo = await page.$eval('#input-direccion-salida', (e) => e.value || '');
  check('el campo Dirección no muestra el JSON crudo', !campo.includes('"zip"') && !campo.includes('"calle"'), campo.slice(0, 100));
  check('el campo Dirección trae solo la calle', campo.trim() === LIMPIA, campo.slice(0, 100));

  check('0 errores JS', errores.length === 0, errores.join(' | ').slice(0, 250));
  const buenas = resultados.filter(Boolean).length;
  console.log(`\nRESULTADO: ${buenas}/${resultados.length}`);
  if (buenas !== resultados.length) process.exitCode = 1;
} finally { await nav.close(); }
