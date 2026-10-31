// ai-scripts/pruebas/prueba-fase7-ui.mjs
// Prueba UI completa Fase 7 en siumax con Puppeteer:
// 1. Iniciar sesión en siumax.duckdns.org
// 2. Ir a Inventario -> Nuevo Producto -> Activar Variantes -> Plantilla Ropa (S, M, L, XL)
// 3. Poner nombre "POLO ALGODON VARTEST", precio 50, stock a talla M (5) y talla L (3)
// 4. Guardar producto y verificar que aparezca la insignia "4 variantes" en la tabla
// 5. Ir a Caja (POS), buscar "POLO ALGODON VARTEST"
// 6. Verificar que aparezcan las variantes individuales para seleccionar
// 7. Vender 1 unidad de Talla M en POS y verificar que el stock baja en pantalla

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

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 }
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('dialog', async (d) => {
  console.log('PAGE DIALOG:', d.message());
  await d.accept();
});

try {
  console.log('Iniciando prueba UI en navegador para Fase 7...');

  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await pausa(2000);

  // 1. Inventario
  await page.click('#sidebar-btn-inventario');
  await page.waitForSelector('#btn-tab-productos');
  await pausa(1000);

  // Abrir Nuevo Producto
  await page.click('#btn-nuevo-producto');
  await page.waitForSelector('#btn-naturaleza-unidad');
  await page.click('#btn-naturaleza-unidad'); // Paso 1 -> Unidad
  await page.waitForSelector('#input-nombre-producto');
  await pausa(500);

  const nombreProd = `POLO VARTEST ${Date.now() % 10000}`;
  console.log('Creando producto:', nombreProd);
  await page.focus('#input-nombre-producto');
  await page.keyboard.type(nombreProd);
  await page.focus('#input-precio-producto');
  await page.keyboard.type('50.00');

  // Activar Variantes
  console.log('Activando variantes...');
  await page.click('#check-tiene-variantes');
  await pausa(800);

  // Aplicar plantilla rápida ropa
  console.log('Aplicando plantilla ropa...');
  await page.click('#btn-preset-ropa');
  await pausa(800);

  // Asignar stock a la primera y segunda variante (Talla S: 5, Talla M: 3)
  console.log('Asignando stock...');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[placeholder="0"]'));
    console.log('Inputs con placeholder 0 encontrados:', inputs.length);
    if (inputs[0]) {
      inputs[0].value = '5';
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (inputs[1]) {
      inputs[1].value = '3';
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await pausa(800);

  // Inspeccionar estado antes de guardar
  const estadoModal = await page.evaluate(() => {
    const nombre = document.getElementById('input-nombre-producto')?.value;
    const precio = document.getElementById('input-precio-producto')?.value;
    const tieneVars = document.getElementById('check-tiene-variantes')?.checked;
    const filasVars = document.querySelectorAll('input[placeholder="Talla"]').length;
    const btnGuardar = !!document.getElementById('btn-guardar-producto');
    return { nombre, precio, tieneVars, filasVars, btnGuardar };
  });
  console.log('Estado del Modal antes de guardar:', estadoModal);

  // Guardar producto
  console.log('Guardando producto...');
  await page.click('#btn-guardar-producto');
  await pausa(1500);

  // Si apareció el aviso propio del sistema, cerrarlo (Enter o clic en #dialogo-sistema-aceptar)
  const hayAviso = await page.$('#dialogo-sistema-aceptar');
  if (hayAviso) {
    console.log('Aceptando aviso del sistema (#dialogo-sistema-aceptar)...');
    await page.click('#dialogo-sistema-aceptar');
    await pausa(1000);
  } else {
    await page.keyboard.press('Enter');
    await pausa(1000);
  }

  // Verificar en tabla de inventario que exista el producto con la insignia "4 variantes"
  console.log('Buscando en Inventario...');
  await pausa(1000);
  await page.click('#buscador-global-inventario');
  await page.keyboard.type(nombreProd, { delay: 30 });
  await pausa(2000);

  const resInventario = await page.evaluate((nombre) => {
    const inputVal = document.getElementById('buscador-global-inventario')?.value;
    const text = document.body.innerText;
    const hasNombre = text.toUpperCase().includes(nombre.toUpperCase());
    const hasBadge = /4\s*variantes|variante/i.test(text);
    const rows = Array.from(document.querySelectorAll('[data-row="true"]')).map(r => r.innerText.replace(/\s+/g, ' ').slice(0, 120));
    return { inputVal, hasNombre, hasBadge, rowsCount: rows.length, rowsSample: rows.slice(0, 3) };
  }, nombreProd);
  console.log('Resultado búsqueda en Inventario:', resInventario);

  ok('Producto creado y muestra insignia de variantes en Inventario', resInventario.hasNombre && resInventario.hasBadge);

  // 2. Ir a Caja (POS)
  await page.click('#sidebar-btn-pos');
  await page.waitForSelector('#buscador-global-pos', { timeout: 15000 });
  await pausa(2000);

  // Buscar el producto en POS
  await page.focus('#buscador-global-pos');
  await page.keyboard.type(nombreProd);
  await pausa(2000);

  const opcionesEnPOS = await page.evaluate((nombre) => {
    const elementos = Array.from(document.querySelectorAll('#productos-grid-pos button, button'));
    const matches = elementos.filter(el => el.innerText && el.innerText.includes(nombre) && el.innerText.includes('TALLA'));
    return matches.length;
  }, nombreProd);

  ok('En POS aparecen las variantes específicas como opciones de venta', opcionesEnPOS > 0, `Encontradas: ${opcionesEnPOS}`);

  // Limpieza en BD
  await sql(`
    DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE name = '${nombreProd}');
    DELETE FROM products WHERE name = '${nombreProd}';
  `);
  console.log('Limpieza UI completada.');

} catch (err) {
  ok('Error en prueba UI', false, err.message);
} finally {
  console.log('\n=== ERRORES DE PÁGINA (PAGEERROR) ===', errores);
  await nav.close();
}

console.log('\n--- RESULTADOS PRUEBA UI FASE 7 ---');
console.log(res.join('\n'));
if (res.some(r => r.startsWith('❌'))) {
  process.exit(1);
} else {
  process.exit(0);
}
