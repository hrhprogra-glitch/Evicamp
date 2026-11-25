// 229 (25/11/2026): el nombre escrito al registrar una nota debe verse en la tabla de Salidas,
// en el buscador, en el detalle, en el comprobante y al «Continuar salida».
// Solo lectura: no crea ni borra datos. Con teclado y sin internet en 390/768/1366/1920.
// Uso: node ai-scripts/pruebas/verificar-nombre-nota-salidas.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');

const NOTAS = [
  { codigo: 'SAL-1547', nombre: 'ZZZ NOTA DIAG 224' },
  { codigo: 'SAL-1548', nombre: 'EDIFICIO LOS NOGALES' },
];
const GENERICO = 'CLIENTE NO REGISTRADO (NOTA)';
const TAMANOS = [[390, 844], [768, 1024], [1366, 860], [1920, 1080]];
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));

const tecla = async (k, n = 1) => {
  for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(110); }
};
const activo = () => page.evaluate(() => document.activeElement?.id
  || document.activeElement?.getAttribute('data-fila-salida') || document.activeElement?.tagName || '');
const mismoNombre = (texto, nombre) => String(texto || '').trim().toUpperCase() === nombre.toUpperCase();
const contiene = (texto, nombre) => String(texto || '').toUpperCase().includes(nombre.toUpperCase());

const buscar = async (texto) => {
  await page.focus('#buscador-salidas');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(texto);
  await pausa(650);
};

const abrirSalidas = async () => {
  for (const d of ['Digit4', 'Digit3']) {
    await page.keyboard.down('Alt');
    await tecla(d);
    await page.keyboard.up('Alt');
    await pausa(1300);
    if (await page.$('#buscador-salidas')) return true;
  }
  await page.focus('#sidebar-btn-salidas');
  await tecla('Enter');
  await pausa(1300);
  return !!(await page.$('#buscador-salidas'));
};

const cerrarVentanas = async () => {
  for (let i = 0; i < 4; i++) {
    const abiertas = await page.evaluate(() => [
      '[data-vista-previa-salida]',
      '#modal-nueva-salida-container',
      '#modal-detalle-salida-container',
    ].filter((s) => !!document.querySelector(s)));
    if (!abiertas.length) break;
    await tecla('Escape');
    await pausa(350);
  }
};

try {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('#input-login-usuario', { timeout: 30000 });
  await page.focus('#input-login-usuario');
  await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password');
  await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await tecla('Enter', 1);
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 30000 });
  await pausa(1500);

  ok('Con teclado se abre Salidas', await abrirSalidas(), `foco=${await activo()}`);
  await page.waitForSelector('#tabla-salidas-lista [data-fila-salida="true"]', { timeout: 30000 });
  await pausa(900);

  // Los datos ya están en memoria: de aquí en adelante el navegador navega sin internet.
  await page.setOfflineMode(true);
  await pausa(300);

  for (const [w, h] of TAMANOS) {
    await page.setViewport({ width: w, height: h });
    await pausa(450);
    const tam = `${w}px`;

    for (const { codigo, nombre } of NOTAS) {
      await cerrarVentanas();
      await buscar(codigo);

      const filas = await page.$$eval('#tabla-salidas-lista [data-fila-salida="true"]', (els) => els.map((e) => ({
        texto: e.innerText || '',
        ver: e.querySelector('[id^="btn-ver-salida-"]')?.id || '',
      })));
      ok(`${tam}: ${codigo} aparece en la tabla con el nombre de la nota`,
        filas.length === 1 && contiene(filas[0]?.texto, nombre),
        `${filas.length} fila(s): ${filas[0]?.texto?.replace(/\s+/g, ' ').slice(0, 90) || 'sin filas'}`);
      ok(`${tam}: ${codigo} no muestra el cliente genérico`,
        filas.length === 1 && !contiene(filas[0]?.texto, GENERICO));
      const idBoton = filas[0]?.ver || '';

      // Dos ↓ desde el buscador y Enter, como manda la regla probada de Salidas.
      await tecla('ArrowDown', 2);
      await tecla('Enter');
      await pausa(900);
      const enDetalle = !!(await page.$('#modal-detalle-salida-container'));
      ok(`${tam}: Enter abre el detalle de ${codigo}`, enDetalle, `foco=${await activo()}`);
      if (!enDetalle) continue;

      const datoCliente = await page.$eval('#dato-cliente-detalle-salida', (e) => e.textContent || '').catch(() => '');
      ok(`${tam}: el detalle de ${codigo} muestra el nombre de la nota`, mismoNombre(datoCliente, nombre), datoCliente);

      // Comprobante: el mismo nombre debe llegar al vale que se imprime.
      await page.focus('#btn-imprimir-salida');
      await tecla('Enter');
      await pausa(700);
      const vale = await page.evaluate(() => document.querySelector('[data-vista-previa-salida] iframe')?.contentDocument?.body?.innerText || '');
      ok(`${tam}: el comprobante de ${codigo} muestra el nombre de la nota`, contiene(vale, nombre),
        vale.replace(/\s+/g, ' ').slice(0, 120));
      await tecla('Escape');
      await pausa(400);

      // «Continuar salida» debe conservar el nombre escrito en el cuadro de cliente.
      await page.focus('#btn-continuar-salida');
      await tecla('Enter');
      await pausa(900);
      const cuadroCliente = await page.$eval('#buscar-cliente-salida', (e) => e.value || '').catch(() => '');
      const avisoNota = await page.evaluate(() => document.getElementById('modal-nueva-salida-container')?.textContent || '');
      ok(`${tam}: «Continuar ${codigo}» conserva el nombre escrito`, mismoNombre(cuadroCliente, nombre), cuadroCliente);
      ok(`${tam}: el formulario de ${codigo} sigue marcando la nota`, contiene(avisoNota, 'NOTA:') && contiene(avisoNota, nombre));
      await cerrarVentanas();

      // El buscador de la lista debe encontrar la nota escribiendo el nombre, no solo el código.
      await buscar(nombre);
      const porNombre = await page.$$eval('#tabla-salidas-lista [data-fila-salida="true"]', (els) => els.map((e) => ({
        texto: e.innerText || '',
        ver: e.querySelector('[id^="btn-ver-salida-"]')?.id || '',
      })));
      ok(`${tam}: el buscador encuentra ${codigo} por el nombre escrito`,
        porNombre.some((f) => f.ver === idBoton && contiene(f.texto, nombre)),
        `${porNombre.length} fila(s): ${porNombre.map((f) => f.ver).join(', ') || 'sin filas'}`);
    }
  }

  await page.setOfflineMode(false);
  ok('Sin errores de JavaScript', errores.length === 0, errores.slice(0, 2).join(' | '));
} catch (e) {
  ok('Sin fallas en la prueba', false, e?.message || String(e));
} finally {
  try { await page.setOfflineMode(false); } catch { /* navegador cerrado */ }
  await nav.close();
  const fallos = res.filter((r) => r.startsWith('MAL')).length;
  console.log(res.join('\n'));
  console.log(`RESULTADO: ${res.length - fallos}/${res.length}`);
  if (fallos) process.exitCode = 1;
}
