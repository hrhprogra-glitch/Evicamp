// 24/11/2026 — Urgente Salidas ecosistema: (1) la marquita «dev.» vuelve a verse en la
// lista de Salidas y (2) el limpiador de fecha vuelve a ser el icono FilterX (no texto TODAS).
// Solo lectura en la base. Uso:
//   node ai-scripts/pruebas/verificar-devoluciones-y-limpiador-ecosistema.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
const USUARIO = process.env.ECOSISTEMA_ADMIN_USUARIO;
const CLAVE = process.env.ECOSISTEMA_ADMIN_CLAVE;
if (!USUARIO || !CLAVE) throw new Error('Faltan credenciales de ecosistema en .env.vps');

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 900 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(100); } };
const escribir = async (t) => { await page.keyboard.type(t); await pausa(90); };
const irA = async (id) => { await page.focus(`#${id}`); await tecla('Enter'); await pausa(850); };
const marcas = () => page.evaluate(() => {
  const m = [...document.querySelectorAll('#tabla-salidas-lista [title="Tiene devoluciones registradas"]')];
  return { cantidad: m.length, textos: m.slice(0, 5).map((e) => (e.innerText || '').trim()) };
});
const limpiador = () => page.evaluate(() => {
  const b = document.getElementById('btn-filtro-fecha-todas');
  if (!b) return null;
  const svg = b.querySelector('svg');
  return {
    id: b.id,
    clase: b.className,
    title: b.getAttribute('title'),
    texto: (b.innerText || '').trim(),
    icono: svg ? [...svg.classList].find((c) => c.startsWith('lucide-')) || svg.getAttribute('class') : null,
    // lucide-react renombró filter → funnel en versiones nuevas: FilterX dibuja lucide-funnel-x.
    esFilterX: !!svg && ([...svg.classList].includes('lucide-filter-x') || [...svg.classList].includes('lucide-funnel-x')),
    tamano: svg ? svg.getAttribute('width') : null,
  };
});

try {
  await page.goto('https://ecosistema123.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await escribir(USUARIO);
  await tecla('Enter'); await page.focus('#input-login-password'); await escribir(CLAVE);
  await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 25000 }); await pausa(1200);
  ok('Login real con teclado', true);

  await irA('sidebar-btn-salidas');
  await page.waitForSelector('#tabla-salidas-lista', { timeout: 20000 });
  await pausa(900);

  const l = await limpiador();
  ok('Limpiador sigue teniendo su id y su título', l?.id === 'btn-filtro-fecha-todas' && l?.title === 'Ver salidas de todos los días', JSON.stringify(l));
  ok('Limpiador es el icono FilterX, ya no dice TODAS',
    l?.clase === 'limpiar-sobrio' && l?.esFilterX && l?.texto === '' && l?.tamano === '16',
    JSON.stringify(l));

  const m0 = await marcas();
  ok('La marquita «dev.» aparece en la lista de Salidas', m0.cantidad > 0 && m0.textos.every((t) => /^\d+ dev\.$/i.test(t)),
    JSON.stringify(m0));

  // La salida con 21 devoluciones debe mostrar exactamente «21 dev.».
  await page.focus('#buscador-salidas'); await escribir('SAL-MIG-00243'); await pausa(1000);
  await tecla('ArrowDown'); await tecla('ArrowDown'); await pausa(500);
  const fila = await page.evaluate(() => {
    const e = [...document.querySelectorAll('#tabla-salidas-lista [title="Tiene devoluciones registradas"]')]
      .find((x) => (x.closest('tr, [data-row="true"]')?.innerText || '').includes('SAL-MIG-00243'));
    return e ? (e.innerText || '').trim() : null;
  });
  ok('SAL-MIG-00243 muestra «21 dev.» en su fila', /^21 dev\.$/i.test(fila || ''), JSON.stringify({ fila }));

  // El limpiador borra la fecha y devuelve la lista completa, con teclado.
  // Primero se borra la búsqueda con su botón, también con Enter.
  await page.evaluate(() => document.querySelector('.buscador-sobrio__borrar')?.focus());
  await tecla('Enter'); await pausa(600);
  const antes = await page.evaluate(() => document.querySelectorAll('#tabla-salidas-lista [data-row="true"], #tabla-salidas-lista tbody tr').length);
  await page.focus('#filtro-fecha-salidas');
  await page.evaluate(() => {
    const i = document.getElementById('filtro-fecha-salidas');
    // Input controlado por React: hay que usar el setter nativo para que actualice el estado.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(i, '2026-10-07');
    i.dispatchEvent(new Event('input', { bubbles: true }));
    i.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await pausa(900);
  const conFecha = await page.evaluate(() => ({
    valor: document.getElementById('filtro-fecha-salidas').value,
    filas: document.querySelectorAll('#tabla-salidas-lista [data-row="true"], #tabla-salidas-lista tbody tr').length,
  }));
  await page.focus('#btn-filtro-fecha-todas'); await tecla('Enter'); await pausa(900);
  const despues = await page.evaluate(() => ({
    valor: document.getElementById('filtro-fecha-salidas').value,
    filas: document.querySelectorAll('#tabla-salidas-lista [data-row="true"], #tabla-salidas-lista tbody tr').length,
    foco: document.activeElement?.id,
  }));
  ok('El limpiador borra la fecha con Enter y devuelve la lista',
    conFecha.valor === '2026-10-07' && despues.valor === '' && despues.filas > conFecha.filas && despues.foco === 'btn-filtro-fecha-todas',
    JSON.stringify({ antes, conFecha, despues }));

  // Tamaños: la marquita y el icono siguen visibles y no hay desbordes.
  for (const [w, h] of [[390, 844], [768, 900], [1366, 900], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(350);
    const e = await page.evaluate(() => {
      const b = document.getElementById('btn-filtro-fecha-todas');
      const r = b?.getBoundingClientRect();
      return {
        icono: !!b?.querySelector('svg.lucide-filter-x, svg.lucide-funnel-x'),
        marcas: document.querySelectorAll('#tabla-salidas-lista [title="Tiene devoluciones registradas"]').length,
        visible: !!r && r.width > 0 && r.height > 0,
        desborde: document.documentElement.scrollWidth > window.innerWidth + 2,
      };
    });
    ok(`${w}px: icono y marquita visibles, sin desbordes`,
      e.icono && e.marcas > 0 && e.visible && !e.desborde, JSON.stringify(e));
  }
  await page.setViewport({ width: 1366, height: 900 }); await pausa(250);

  await page.setOfflineMode(true); await pausa(300);
  await tecla('Tab'); await pausa(250);
  const off = await page.evaluate(() => ({
    icono: !!document.querySelector('#btn-filtro-fecha-todas svg.lucide-filter-x, #btn-filtro-fecha-todas svg.lucide-funnel-x'),
    marcas: document.querySelectorAll('#tabla-salidas-lista [title="Tiene devoluciones registradas"]').length,
  }));
  ok('Sin internet: icono y marquita siguen ahí', off.icono && off.marcas > 0, JSON.stringify(off));
  await page.setOfflineMode(false);

  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 250));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  console.log(res.join('\n'));
  console.log(`TOTAL: ${res.filter((r) => r.startsWith('OK ')).length}/${res.length}`);
}
