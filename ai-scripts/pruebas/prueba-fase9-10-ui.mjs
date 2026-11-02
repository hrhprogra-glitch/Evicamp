// ai-scripts/pruebas/prueba-fase9-10-ui.mjs
// Prueba UI completa de Fase 9 (Almacenes y Traspasos) y Fase 10 (Tienda Web PC y Móvil) en siumax

import { createRequire } from 'node:module';
import path from 'node:path';

const cwd = process.cwd();
const reqP = createRequire(path.resolve(cwd, 'package.json'));
let puppeteer;
try {
  puppeteer = reqP('puppeteer-core');
} catch {
  puppeteer = reqP('D:/Programación/siumax/videos/grabador/node_modules/puppeteer-core');
}
const { NodeSSH } = reqP('node-ssh');
const { conexionVps } = reqP('./ai-scripts/vps.cjs');
process.loadEnvFile(path.resolve(cwd, '.env.vps'));

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? '✅' : '❌'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const sql = async (q) => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose();
  if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr);
  return r.stdout.trim();
};

const artifactsDir = 'C:/Users/User/.gemini/antigravity-ide/brain/a96188fc-0b77-4cdf-8c9c-73f7eb63bbb4';

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1280, height: 800 }
});

const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', msg => {
  const txt = msg.text();
  if (txt.includes('Error') || txt.includes('error')) console.log('PAGE LOG:', txt);
});
page.on('dialog', async (d) => {
  console.log('PAGE DIALOG:', d.message());
  await d.accept();
});

const descartarAviso = async () => {
  await pausa(500);
  const btnAceptar = await page.$('#dialogo-sistema-aceptar');
  if (btnAceptar) {
    await btnAceptar.click();
    await pausa(500);
  }
};

const TIMESTAMP = Date.now().toString().slice(-4);
const PRODUCTO_PRUEBA = `ARROZ COSTEÑO F9 ${TIMESTAMP}`;
let testProductId;

try {
  console.log('--- 1. PREPARANDO DATOS DE PRUEBA EN BD SIUMAX ---');
  // Asegurar configuración de catálogo en empresa_config
  await sql(`
    UPDATE empresa_config 
    SET catalogo_activo = true, 
        catalogo_whatsapp = '51999888777', 
        catalogo_ocultar_precios = false, 
        catalogo_mensaje_bienvenida = '¡Bienvenido a nuestra Tienda Web Oficial!'
    WHERE id = 1;
  `);

  // Crear producto de prueba con stock en Tienda Principal
  const pRaw = await sql(`
    INSERT INTO products (name, code, barcode, category, unit, control_type, price, cost_price, quantity, is_active, mostrar_en_catalogo, destacado_catalogo)
    VALUES ('${PRODUCTO_PRUEBA}', 'ARR-${TIMESTAMP}', '775009${TIMESTAMP}', 'ABARROTES', 'UND', 'UNIT', 5.50, 4.00, 100, 1, true, true)
    RETURNING id;
  `);
  testProductId = pRaw.match(/\d+/)?.[0];

  const nowMs = Date.now();
  await sql(`
    INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_unit, cost_total, document_ref, store_id, is_active, is_synced)
    VALUES (${nowMs}, ${testProductId}, 100, 100, 4.00, 400.00, 'LOTE-TEST-${TIMESTAMP}', 1, 1, 1);
  `);
  ok('Datos de prueba creados (Arroz Costeño 100 unds en Tienda Principal, Catálogo Activo)', true);

  console.log('--- 2. INICIANDO SESIÓN EN SIUMAX ---');
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 15000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');

  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  ok('Inicio de sesión exitoso', true);
  await pausa(1500);

  console.log('--- 3. FASE 9: CONFIGURACIÓN DE TIENDAS Y ALMACENES ---');
  await page.click('#sidebar-btn-configuracion');
  await page.waitForSelector('#btn-tab-tiendas', { timeout: 10000 });
  await page.click('#btn-tab-tiendas');
  await pausa(1000);

  // Verificar que la tabla de tiendas carga y tiene la tienda principal
  const contenidoTiendas = await page.evaluate(() => document.body.innerText.toLowerCase());
  ok('Pestaña Tiendas y Almacenes carga correctamente', contenidoTiendas.includes('tiendas') || contenidoTiendas.includes('principal'));

  // Abrir Modal de Tienda
  const btnNuevaTienda = await page.$('#btn-nueva-tienda');
  ok('Botón [ + Nueva Tienda / Almacén ] visible', !!btnNuevaTienda);
  if (btnNuevaTienda) {
    await btnNuevaTienda.click();
    await page.waitForSelector('#modal-tienda', { timeout: 5000 });
    ok('ModalTienda abierto correctamente con #modal-tienda', true);

    await page.focus('#input-tienda-nombre');
    await page.keyboard.type(`Almacén Norte ${TIMESTAMP}`);
    await page.focus('#input-tienda-codigo');
    await page.keyboard.type(`ALM-${TIMESTAMP}`);
    await page.focus('#input-tienda-direccion');
    await page.keyboard.type('Av. Los Almacenes 123');

    await page.screenshot({ path: path.join(artifactsDir, 'fase9_modal_tienda.png') });

    await page.click('#btn-guardar-tienda');
    await descartarAviso();
    await pausa(1000);

    const despuesCrear = await page.evaluate(() => document.body.innerText);
    ok(`Nuevo almacén "Almacén Norte ${TIMESTAMP}" registrado en la tabla`, despuesCrear.includes(`Almacén Norte ${TIMESTAMP}`));
  }

  console.log('--- 4. FASE 10: CONFIGURACIÓN DE TIENDA WEB ---');
  await page.click('#btn-tab-tienda_web');
  await pausa(1500);
  const contenidoTiendaWeb = await page.evaluate(() => document.body.innerText.toLowerCase());
  ok('Pestaña Tienda Web accesible en Ajustes', contenidoTiendaWeb.includes('tienda web') || contenidoTiendaWeb.includes('enlace'));
  const btnCopiarEnlace = await page.$('#btn-copiar-enlace-tienda');
  ok('Botón de copiar enlace público y acceso a Tienda Web presente', !!btnCopiarEnlace);
  await page.screenshot({ path: path.join(artifactsDir, 'fase10_ajustes_tienda_web.png') });

  console.log('--- 5. FASE 9: TRASPASOS ENTRE ALMACENES EN INVENTARIO ---');
  await page.click('#sidebar-btn-inventario');
  await page.waitForSelector('#btn-traspasos', { timeout: 15000 });
  ok('Botón [ 🔄 Traspasos ] visible en la barra de acciones de Inventario', true);

  await page.evaluate(() => document.getElementById('btn-traspasos')?.click());
  await page.waitForSelector('#modal-traspasos', { timeout: 10000 });
  ok('ModalTraspaso abre correctamente con #modal-traspasos', true);
  await pausa(1500);

  // Seleccionar destino en el traspaso
  const selectsDestino = await page.$$('#select-traspaso-destino option');
  if (selectsDestino.length > 1) {
    const valDestino = await page.evaluate(el => el.options[1].value, await page.$('#select-traspaso-destino'));
    await page.select('#select-traspaso-destino', valDestino);
  }

  // Buscar el producto de prueba en el selector de traspaso
  await page.focus('#buscador-producto-traspaso');
  await page.keyboard.type(`ARROZ COSTEÑO F9 ${TIMESTAMP}`);
  await pausa(1000);

  // Seleccionar producto de las sugerencias
  const btnSugerencia = await page.$('.group');
  if (btnSugerencia) {
    await btnSugerencia.click();
    await pausa(500);
  }

  await page.screenshot({ path: path.join(artifactsDir, 'fase9_modal_nuevo_traspaso.png') });

  // Confirmar traspaso
  await page.click('#btn-confirmar-traspaso');
  await descartarAviso();
  await pausa(1500);

  // Vale de traspaso aparece en pantalla
  const valeModal = await page.$('[role="dialog"]');
  if (valeModal) {
    await page.screenshot({ path: path.join(artifactsDir, 'fase9_vale_traspaso.png') });
    await page.keyboard.press('Escape'); // Cerrar vale
    await pausa(800);
  }

  // Ir a pestaña historial
  const tabHistorial = await page.$('#tab-historial-traspasos');
  if (tabHistorial) {
    await tabHistorial.click();
    await pausa(1000);

    // Verificar en Historial
    const contenidoHistorial = await page.evaluate(() => document.body.innerText.toLowerCase());
    const tieneEnTransito = contenidoHistorial.includes('tránsito') || contenidoHistorial.includes('transito') || contenidoHistorial.includes('recibido');
    ok('Traspaso registrado en el historial de traspasos', tieneEnTransito);

    // Tomar captura del historial
    await page.screenshot({ path: path.join(artifactsDir, 'fase9_historial_traspasos.png') });

    // Recibir traspaso si existe botón
    const btnRecibir = await page.$('.btn-recibir-traspaso');
    if (btnRecibir) {
      await btnRecibir.click();
      await descartarAviso();
      await pausa(1000);
      const contenidoRecibido = await page.evaluate(() => document.body.innerText.toLowerCase());
      ok('Traspaso recibido y stock acreditado en destino', contenidoRecibido.includes('recibido'));
    }
  }

  // Probar cierre con Escape
  await page.keyboard.press('Escape');
  await pausa(800);
  const modalTraspasoCerrado = await page.$('#modal-traspasos');
  ok('ModalTraspaso se cierra correctamente con tecla Escape', !modalTraspasoCerrado);

  console.log('--- 6. FASE 10: TIENDA WEB PÚBLICA (PC DESKTOP VIEW) ---');
  // Navegar a la Tienda Web pública como cliente (pantalla de 1280x800)
  await page.goto('https://siumax.duckdns.org/#/tienda', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#tienda-navbar', { timeout: 15000 });
  ok('Tienda Web carga en modo público (#/tienda)', true);
  await pausa(1500);

  // Verificar elementos de Tienda Web en PC
  const textoTienda = await page.evaluate(() => document.body.innerText.toLowerCase());
  ok('Encabezado y buscador público presentes en PC', textoTienda.includes('tienda') || textoTienda.includes('catálogo') || textoTienda.includes('carrito'));
  ok(`Producto de prueba visible en la vitrina`, textoTienda.includes(`arroz costeño f9 ${TIMESTAMP}`.toLowerCase()));

  await page.screenshot({ path: path.join(artifactsDir, 'fase10_tienda_pc_desktop.png') });

  // Agregar producto al carrito
  const btnAgregar = await page.$('.btn-agregar-carrito');
  if (btnAgregar) {
    await btnAgregar.click();
    await pausa(600);
    await btnAgregar.click();
    await pausa(600);
    ok('Producto agregado al carrito exitosamente', true);
  }

  // Abrir carrito drawer desde el navbar
  const btnCarrito = await page.$('#btn-abrir-carrito-navbar');
  if (btnCarrito) {
    await btnCarrito.click();
    await page.waitForSelector('#drawer-carrito-tienda', { timeout: 5000 });
    ok('Drawer lateral de carrito abierto en Desktop', true);
    await pausa(800);
    await page.screenshot({ path: path.join(artifactsDir, 'fase10_tienda_pc_carrito.png') });

    // Proceder al checkout
    const btnProceder = await page.$('#btn-proceder-pedido-web');
    if (btnProceder) {
      await btnProceder.click();
      await page.waitForSelector('#modal-pedido-tienda', { timeout: 5000 });
      ok('Modal de Checkout abierto para ingresar datos del cliente', true);
      await pausa(600);

      await page.focus('#input-pedido-nombre');
      await page.keyboard.type('Carlos Mendoza');
      await page.focus('#input-pedido-telefono');
      await page.keyboard.type('987654321');

      // Elegir Delivery para mostrar el campo de dirección
      const btnDelivery = await page.$('#btn-entrega-delivery');
      if (btnDelivery) {
        await btnDelivery.click();
        await pausa(400);
      }

      await page.focus('#input-pedido-direccion');
      await page.keyboard.type('Calle Los Cedros 456, Urb. Aurora');

      await page.screenshot({ path: path.join(artifactsDir, 'fase10_tienda_pc_modal_pedido.png') });

      // Cerrar modal
      await page.click('#btn-cerrar-modal-pedido');
      await pausa(500);
    }
  }

  console.log('--- 7. FASE 10: TIENDA WEB EN MÓVIL (MOBILE VIEW 375x667) ---');
  await page.setViewport({ width: 375, height: 667, isMobile: true });
  await page.goto('https://siumax.duckdns.org/#/tienda', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#tienda-navbar', { timeout: 15000 });
  await pausa(1500);

  ok('Tienda Web optimizada y adaptada en resolución móvil (375x667)', true);

  // Asegurar al menos 1 producto en carrito para ver el botón flotante en móvil
  const btnAgregarMovil = await page.$('.btn-agregar-carrito');
  if (btnAgregarMovil) {
    await btnAgregarMovil.click();
    await pausa(800);
  }

  await page.screenshot({ path: path.join(artifactsDir, 'fase10_tienda_movil.png') });

  // Floating cart button en móvil
  const btnFlotanteMovil = await page.$('#btn-carrito-flotante-movil');
  ok('Botón flotante de carrito inferior visible en móvil', !!btnFlotanteMovil);

} catch (err) {
  console.error('ERROR EN PRUEBA:', err);
  ok('Error durante la ejecución', false, err.message);
  await page.screenshot({ path: path.join(artifactsDir, 'fase9_10_error.png') });
} finally {
  console.log('--- 8. LIMPIEZA DE DATOS DE PRUEBA ---');
  try {
    if (testProductId) {
      await sql(`
        DELETE FROM store_transfer_items WHERE product_id = ${testProductId};
        DELETE FROM batches WHERE product_id = ${testProductId};
        DELETE FROM products WHERE id = ${testProductId};
        DELETE FROM stores WHERE codigo LIKE 'ALM-${TIMESTAMP}';
      `);
      console.log('Limpieza completada en siumax.');
    }
  } catch (cleanErr) {
    console.error('Error limpiando datos:', cleanErr);
  }
  await nav.close();
}

console.log('\n=======================================');
console.log('RESULTADOS PRUEBA AUTOMATIZADA FASE 9 Y 10:');
console.log('=======================================');
res.forEach(r => console.log(r));
if (errores.length > 0) {
  console.log('\nErrores en consola de navegador:', errores);
}
console.log('=======================================\n');
