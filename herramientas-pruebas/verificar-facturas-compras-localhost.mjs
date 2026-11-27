// Prueba en localhost de Compras > IMPORTAR facturas (27/11/2026), sin tocar la base real.
//  - Ver / Descargar / Importar en UNA fila; cartel que dice si el archivo ya está importado.
//  - PDF migrado caído: aviso claro, NO cierra la compra. PDF bueno: visor dentro de la ventana.
//  - Descargar guarda el archivo de verdad (se intercepta el clic del enlace).
//  - "Importar de nuevo" pide confirmación y REEMPLAZA el archivo anterior.
//  - "Nueva lista" permite importar el PDF, muestra "✅ Archivo importado" y lo guarda con la lista.
// Todo con teclado; RPC y REST respondidos falsos. Uso:
//   node herramientas-pruebas/verificar-facturas-compras-localhost.mjs [url]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
process.loadEnvFile('E:/Programacion/siumax/.env.vps');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.argv[2] || 'http://localhost:5173';

const PDF = '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
const temporal = (nombre) => {
  const ruta = path.join(os.tmpdir(), `${nombre}-${Date.now()}.pdf`);
  fs.writeFileSync(ruta, PDF);
  return ruta;
};
const temporales = [temporal('factura-prueba-ia'), temporal('factura-reemplazo-ia'), temporal('factura-nueva-lista')];
const datosPdf = `data:application/pdf;base64,${Buffer.from(PDF).toString('base64')}`;

const compra = {
  id: 800037, provider_id: 'd1bebd84-4b8a-4640-bd4a-08b76a117144', proveedor: 'FERRETERA APU S.A.C',
  estado: 'RECIBIDO', notas: '', documento: 'F001-1578', autor: 'PRUEBA IA', recibido_por: 'PRUEBA IA',
  recibido_por_id: 990001, created_at: '2026-11-27T10:00:00.000Z', recibido_at: '2026-11-27T11:00:00.000Z',
  compras_detalle: [{ id: 990001, product_id: '990149', product_name: 'BOQUILLA 10-VAN', cantidad: 2, cantidad_recibida: 2, costo_unit: 10, batch_id: 990169, unidad: 'UND' }],
  // 0 = PDF viejo caído; 1 = PDF bueno guardado en la base
  archivos: [
    { tipo: 'PDF', nombre: 'ed1de131-7854-4226-93c7-6fe3d19e7c40.pdf', url: '/api/uploads/factura/ed1de131-7854-4226-93c7-6fe3d19e7c40.pdf' },
    { tipo: 'PDF', nombre: 'factura-buena.pdf', datos: datosPdf },
  ],
};
const listado = [compra];
const producto = {
  id: 990150, name: 'MANGUERA PRUEBA IA', code: 'MANG-IA', barcode: '', unit: 'UND', quantity: 50,
  cost_price: 5, price: 8, min_stock: 5, category: 'GENERAL', image_path: '', is_active: 1, presentaciones: [],
};
const PERMISOS = {
  inventario_ver: true, almacen_ver_stock: true, almacen_ingresar_lotes: true,
  almacen_crear_editar_productos: true, almacen_editar: true, almacen_eliminar_productos: true,
  almacen_modificar_precios: true, almacen_registrar_mermas: true,
  compras_recibir: true, compras_enviar: true, configuracion_ver: true, salidas_ver: true, pos: true,
};
const EMPLEADO = { id: 990001, nombre: 'ADMIN PRUEBA IA', email: 'admin@prueba-ia.local', rol: 'admin', permisos: PERMISOS };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' };
const responder = (req, opciones) => req.respond({ ...opciones, headers: { ...CORS, ...(opciones.headers || {}) } });

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true, args: ['--no-sandbox'],
});
const page = await nav.newPage();
const errores = [];
const escrituras = [];
const resultados = {};
const ok = (nombre, condicion, extra = '') => {
  resultados[nombre] = !!condicion;
  console.log(`${condicion ? 'OK   ' : 'FALLO'} ${nombre}${extra ? ' | ' + extra : ''}`);
};
const tecla = async (k) => { await page.keyboard.press(k); await pausa(180); };
const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
const textoDialogo = () => page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.textContent || '');

try {
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('consola: ' + m.text()); });
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1437, height: 900 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('nego_tipos_negocio', JSON.stringify(['servicios', 'comercio']));
    window.__descargas = [];
    const clickOriginal = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) { window.__descargas.push(this.download); return; }
      return clickOriginal.call(this);
    };
  });
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    try {
      const url = new URL(req.url());
      const ruta = url.pathname;
      const metodo = req.method();
      if (metodo === 'OPTIONS') return req.continue();

      if (ruta.includes('/rpc/')) {
        const rpc = ruta.split('/').pop();
        if (rpc === 'fn_login') return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'TOKEN-IA', ...EMPLEADO }) });
        if (rpc === 'fn_validar_sesion') return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify(EMPLEADO) });
        if (rpc === 'fn_cerrar_sesion') return responder(req, { status: 200, contentType: 'application/json', body: '{"success":true}' });
        if (rpc === 'fn_ventas_por_producto') return responder(req, { status: 200, contentType: 'application/json', body: '[]' });
        return responder(req, { status: 200, contentType: 'application/json', body: '{"success":true}' });
      }

      // PDF migrado que ya no existe en el VPS: el servidor devuelve la página del sistema.
      if (ruta.startsWith('/api/uploads/factura/')) {
        return responder(req, { status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body>SiuMax</body></html>' });
      }

      if (ruta === '/rest/v1/empresa_config') {
        const config = { id: 1, nombre_empresa: 'PRUEBA IA', logo_url: '', tipos_negocio: ['servicios', 'comercio'] };
        return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify(/vnd\.pgrst\.object/.test(String(req.headers().accept || '')) ? config : [config]) });
      }
      if (ruta === '/rest/v1/products' || ruta === '/rest/v1/productos') {
        return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify([producto]) });
      }
      if (ruta === '/rest/v1/compras') {
        if (metodo === 'PATCH') {
          const cuerpo = JSON.parse(req.postData() || '{}');
          escrituras.push({ ruta, metodo, cuerpo });
          compra.archivos = cuerpo.archivos;
          return responder(req, { status: 200, contentType: 'application/json', body: '[]' });
        }
        if (metodo === 'POST') {
          const cuerpo = JSON.parse(req.postData() || '[]');
          const fila = Array.isArray(cuerpo) ? cuerpo[0] || {} : cuerpo;
          escrituras.push({ ruta, metodo, cuerpo: fila });
          const nueva = {
            ...compra, id: 800038, estado: 'PENDIENTE', notas: fila.notas || '', documento: null,
            recibido_por: null, recibido_at: null, created_at: '2026-11-27T12:00:00.000Z',
            compras_detalle: [], archivos: fila.archivos || null,
          };
          listado.unshift(nueva);
          return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify([nueva]) });
        }
        return responder(req, { status: 200, contentType: 'application/json', body: JSON.stringify(listado) });
      }
      if (ruta.startsWith('/rest/v1/')) {
        if (metodo !== 'GET' && metodo !== 'HEAD') escrituras.push({ ruta, metodo, cuerpo: req.postData() || '' });
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
  await tecla('Enter');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE || '');
  await tecla('Enter');
  let listo = false;
  for (let i = 0; i < 10 && !listo; i++) {
    try {
      await page.waitForSelector('#sidebar-btn-inventario', { timeout: 3000 });
      await pausa(700);
      listo = await page.evaluate(() => !!document.getElementById('sidebar-btn-inventario'));
    } catch { await pausa(700); }
  }
  if (!listo) throw new Error('No apareció Inventario después de iniciar sesión');

  await page.focus('#sidebar-btn-inventario'); await tecla('Enter');
  await page.waitForSelector('#btn-tab-compras', { timeout: 15000 });
  await page.focus('#btn-tab-compras'); await tecla('Enter');
  await page.waitForSelector('[data-compra="800037"]', { timeout: 15000 });
  await pausa(600);
  await page.focus('[data-compra="800037"]'); await tecla('Enter');
  await page.waitForSelector('#btn-detalle-archivo-0', { timeout: 15000 });
  await pausa(400);

  // 0) El detalle dice claramente que ya hay un archivo importado
  const estado = await page.$eval('#estado-adjuntos', (e) => e.textContent.trim());
  ok('El detalle dice que ya está adjuntado', /Archivo importado/.test(estado) && /factura-buena\.pdf/.test(estado), estado);
  const etiquetaImportar = await page.$eval('#btn-detalle-adjuntar', (e) => e.textContent.trim());
  ok('El botón dice Importar de nuevo cuando ya hay archivo', /Importar de nuevo/i.test(etiquetaImportar), etiquetaImportar);
  const fila = await page.evaluate(() => {
    const ids = ['btn-detalle-archivo-0', 'btn-detalle-descargar-0', 'btn-detalle-adjuntar'];
    const els = ids.map((id) => document.getElementById(id));
    if (els.some((e) => !e)) return { bien: false, detalle: 'falta algún botón' };
    const tops = els.map((e) => Math.round(e.getBoundingClientRect().top));
    const padre = els.every((e) => e.parentElement === els[0].parentElement);
    return { bien: padre && Math.max(...tops) - Math.min(...tops) <= 4, tops, padre };
  });
  ok('Ver factura / Descargar / Importar están en una fila', fila.bien, JSON.stringify(fila));

  // 1) PDF migrado caído → aviso claro y la compra sigue abierta
  await page.focus('#btn-detalle-archivo-0'); await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-aceptar', { timeout: 10000 });
  const aviso = await textoDialogo();
  ok('Avisa claro si el PDF viejo ya no existe', /ya no está/.test(aviso) && /Importar PDF/.test(aviso), aviso.slice(0, 120));
  await tecla('Enter'); await pausa(220);
  ok('El aviso no cerró el detalle de la compra', !!(await page.$('#btn-detalle-archivo-0')));

  // 2) PDF bueno → visor interno; Esc cierra el visor, no la compra
  await page.focus('#btn-detalle-archivo-1'); await tecla('Enter');
  await page.waitForSelector('#btn-visor-cerrar', { timeout: 10000 });
  ok('Ver factura abre un visor dentro del sistema',
    await page.evaluate(() => !!document.querySelector('#btn-visor-cerrar') && !!document.querySelector('iframe')));
  ok('El foco va al botón de cerrar del visor', (await foco()) === 'btn-visor-cerrar', await foco());
  await tecla('Escape'); await pausa(220);
  ok('Esc cierra el visor y deja la compra abierta',
    !(await page.$('#btn-visor-cerrar')) && !!(await page.$('#btn-detalle-archivo-1')));
  ok('El foco vuelve a Ver factura', (await foco()) === 'btn-detalle-archivo-1', await foco());

  // 3) Descargar guarda el archivo en la PC
  await page.focus('#btn-detalle-descargar-1'); await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-aceptar', { timeout: 10000 });
  const mensajeDescarga = await textoDialogo();
  const descargas = await page.evaluate(() => window.__descargas || []);
  ok('Descargar guarda el PDF con su nombre', descargas.includes('factura-buena.pdf'), JSON.stringify(descargas));
  ok('Avisa que se descargó', /Descargado/.test(mensajeDescarga), mensajeDescarga);
  await tecla('Enter'); await pausa(220);

  // 4) Importar de nuevo: confirmación + reemplaza el archivo anterior
  const chooserPromise = page.waitForFileChooser({ timeout: 15000 });
  await page.focus('#btn-detalle-adjuntar'); await tecla('Enter');
  await page.waitForSelector('#dialogo-sistema-cancelar', { timeout: 10000 });
  ok('Pide confirmación antes de reemplazar', /reemplazarlo/i.test(await textoDialogo()), await textoDialogo());
  await tecla('Enter');
  const chooser = await chooserPromise;
  await chooser.accept([temporales[1]]);
  await page.waitForSelector('#dialogo-sistema-aceptar', { timeout: 10000 });
  const mensajeReemplazo = await textoDialogo();
  ok('Avisa que el archivo fue reemplazado', /reemplazado/.test(mensajeReemplazo), mensajeReemplazo);
  await tecla('Enter'); await pausa(220);
  ok('Reemplaza: queda solo el archivo nuevo',
    compra.archivos.length === 1 && compra.archivos[0].nombre === path.basename(temporales[1]), JSON.stringify(compra.archivos.map((a) => a.nombre)));
  const estadoTras = await page.$eval('#estado-adjuntos', (e) => e.textContent.trim());
  ok('El cartel muestra el archivo reemplazado', estadoTras.includes(path.basename(temporales[1])), estadoTras);
  ok('Tras reemplazar siguen en una fila', await page.evaluate(() => {
    const ids = ['btn-detalle-archivo-0', 'btn-detalle-descargar-0', 'btn-detalle-adjuntar'];
    const els = ids.map((id) => document.getElementById(id));
    if (els.some((e) => !e)) return false;
    const tops = els.map((e) => Math.round(e.getBoundingClientRect().top));
    return els.every((e) => e.parentElement === els[0].parentElement) && Math.max(...tops) - Math.min(...tops) <= 4;
  }));

  // 5) Nueva lista: importar el PDF ANTES de guardar la lista
  await tecla('Escape');
  await page.waitForSelector('#btn-nueva-compra', { timeout: 10000 });
  await page.focus('#btn-nueva-compra'); await tecla('Enter');
  await page.waitForSelector('#btn-importar-compra', { timeout: 10000 });
  ok('Nueva lista tiene el botón Importar PDF o foto',
    /Importar PDF o foto/i.test(await page.$eval('#btn-importar-compra', (e) => e.textContent)), await foco());
  const chooserNueva = page.waitForFileChooser({ timeout: 15000 });
  await page.focus('#btn-importar-compra'); await tecla('Enter');
  (await chooserNueva).accept([temporales[2]]);
  await page.waitForSelector('#estado-importado', { timeout: 10000 });
  const estadoNueva = await page.$eval('#estado-importado', (e) => e.textContent.trim());
  ok('Nueva lista muestra ✅ Archivo importado', /Archivo importado/.test(estadoNueva) && estadoNueva.includes(path.basename(temporales[2])), estadoNueva);
  ok('Nueva lista ofrece Importar de nuevo y Quitar', await page.evaluate(() =>
    /Importar de nuevo/i.test(document.getElementById('btn-importar-compra')?.textContent || '')
    && !!document.getElementById('btn-quitar-importado-compra')));

  // El imán de foco de las ventanas devuelve el selector al pie durante ~500 ms después de importar;
  // esperar a que se asiente y volver a enfocar el buscador antes de escribir.
  await pausa(800);
  await page.focus('#compra-buscar');
  await page.keyboard.type('MANG', { delay: 60 });
  await page.waitForSelector('#compra-resultado-0', { timeout: 10000 });
  await page.focus('#compra-buscar');
  await tecla('Enter');
  await pausa(450);
  ok('El producto quedó en la lista', (await page.$$('[data-producto]')).length === 1, String((await page.$$('[data-producto]')).length));
  const antesGuardar = await page.$eval('#estado-importado', (e) => e.textContent.trim()).catch(() => ' SIN CARTEL ');
  ok('El archivo sigue marcado antes de guardar', /Archivo importado/.test(antesGuardar), antesGuardar);
  await page.focus('#btn-guardar-compra'); await tecla('Enter');
  await pausa(600);
  await page.waitForSelector('[data-compra="800038"]', { timeout: 15000 });
  const inserts = escrituras.filter((e) => e.ruta === '/rest/v1/compras' && e.metodo === 'POST');
  ok('Guardar lista guarda el archivo en la compra nueva', inserts.length === 1
    && inserts[0].cuerpo.archivos?.[0]?.nombre === path.basename(temporales[2]), JSON.stringify(inserts.map((e) => e.cuerpo.archivos)));

  // 6) La compra recién creada ya muestra el archivo en su detalle
  await page.focus('[data-compra="800038"]'); await tecla('Enter');
  await page.waitForSelector('#estado-adjuntos', { timeout: 15000 });
  const estadoFinal = await page.$eval('#estado-adjuntos', (e) => e.textContent.trim());
  ok('La lista nueva ya aparece como adjuntada en el detalle', /Archivo importado/.test(estadoFinal) && estadoFinal.includes(path.basename(temporales[2])), estadoFinal);
  ok('La escritura del PDF fue simulada (3 PATCH/POST, ninguna a otra tabla)', escrituras.length === 3, JSON.stringify(escrituras.map((e) => e.ruta)));
  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | '));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  temporales.forEach((ruta) => { try { fs.unlinkSync(ruta); } catch {} });
  await nav.close();
  const todoBien = Object.values(resultados).every(Boolean);
  console.log('CHECKS:', JSON.stringify(resultados));
  console.log('TODO BIEN:', todoBien);
  process.exit(todoBien ? 0 : 1);
}
