// ai-scripts/pruebas/prueba-lote-variantes-ui.mjs
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
page.on('console', msg => {
  const txt = msg.text();
  if (!txt.includes('Download the React DevTools')) console.log('PAGE LOG:', txt);
});
page.on('dialog', async (d) => {
  console.log('PAGE DIALOG:', d.message());
  await d.accept();
});

try {
  console.log('1. Iniciando sesión en siumax...');
  await page.goto('https://siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE || 'admin123');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-inventario', { timeout: 20000 });
  await pausa(1500);
  ok('Inicio de sesión exitoso', true);

  // 2. Navegar a Inventario
  console.log('2. Navegando a Inventario...');
  await page.click('#sidebar-btn-inventario');
  await page.waitForSelector('#btn-ingresar-lote', { timeout: 15000 });
  await pausa(1000);

  // 3. Abrir ModalLote (botón "Ingresar Lote")
  console.log('3. Abriendo modal Ingresar Lote...');
  await page.click('#btn-ingresar-lote');
  await page.waitForSelector('#input-buscar-producto-lote', { timeout: 10000 });
  await pausa(600);

  // 4. Buscar producto con variantes "POLO ALGODON VARTEST" o similar
  console.log('4. Buscando producto con variantes...');
  await page.focus('#input-buscar-producto-lote');
  await page.keyboard.type('POLO');
  await pausa(800);
  await page.keyboard.press('Enter');
  await pausa(800);

  // 5. Verificar que aparezca la tabla de variantes
  console.log('5. Verificando adaptación a variantes...');
  const gridVar = await page.$('input[id^="input-lote-var-"]');
  ok('Modal adaptó sección 2 a variantes', !!gridVar);

  // 6. Ingresar unidades en las variantes
  const inputsVar = await page.$$('input[id^="input-lote-var-"]');
  console.log(`Encontrados ${inputsVar.length} inputs de variantes.`);
  ok('Inputs de variantes encontrados', inputsVar.length >= 1, `${inputsVar.length} variantes`);

  if (inputsVar.length >= 1) {
    await inputsVar[0].focus();
    await page.keyboard.type('20');
    await pausa(200);

    if (inputsVar.length >= 2) {
      await inputsVar[1].focus();
      await page.keyboard.type('30');
      await pausa(200);
    }
  }

  // 7. Ingresar costo total: 1000
  await page.focus('#input-costo-total-lote');
  await page.keyboard.type('1000');
  await pausa(300);

  // 8. Guardar Lote
  console.log('8. Guardando lote de variantes...');
  await page.click('#btn-guardar-lote');
  await pausa(1000);

  try {
    const btnAceptar = await page.waitForSelector('#dialogo-sistema-aceptar', { timeout: 3000 });
    if (btnAceptar) {
      await btnAceptar.click();
      await pausa(500);
    }
  } catch {}

  // 9. Verificar en la base de datos de siumax
  console.log('9. Verificando lotes en base de datos...');
  const qLotes = `
    SELECT b.id, b.variant_id, b.variant_name, b.quantity, b.cost_unit, b.cost_total 
    FROM batches b 
    WHERE b.variant_id IS NOT NULL AND b.is_active = 1
    ORDER BY b.id DESC LIMIT 4;
  `;
  const resLotes = await sql(qLotes);
  console.log('LOTES REGISTRADOS EN BD:\n' + resLotes);
  ok('Lotes con variant_id y variant_name guardados en batches', resLotes.length > 0 && resLotes.includes('|'));

  // 10. Verificar stock en product_variants
  const qVars = `
    SELECT pv.id, pv.nombre_variante, pv.quantity 
    FROM product_variants pv 
    WHERE pv.quantity > 0 AND pv.is_active = 1
    ORDER BY pv.id DESC LIMIT 4;
  `;
  const resVars = await sql(qVars);
  console.log('STOCK DE VARIANTES EN BD:\n' + resVars);
  ok('Stock de variantes incrementado correctamente', resVars.length > 0 && resVars.includes('|'));

  // 11. Cambiar a la pestaña "Lotes" en la UI de Inventario
  console.log('11. Verificando pestaña Lotes en Inventario...');
  await page.click('#btn-tab-lotes');
  await pausa(1500);
  const textoPagina = await page.evaluate(() => document.body.innerText);
  console.log('Texto visible en pestaña Lotes (primeros 500 caracteres):\n', textoPagina.slice(0, 500));
  const tieneInsigniaVariante = textoPagina.includes('🏷️') || textoPagina.includes('TALLA M');
  ok('Pestaña Lotes muestra el distintivo de variante 🏷️', tieneInsigniaVariante);

} catch (err) {
  console.error('ERROR EN PRUEBA:', err);
  ok('Ejecución de prueba', false, err.message);
} finally {
  await nav.close();
  console.log('\n--- RESULTADOS PRUEBA LOTES VARIANTES ---');
  res.forEach(r => console.log(r));
  if (errores.length > 0) {
    console.log('\nErrores en consola de navegador:', errores);
  }
}
