// 25/11/2026 — Nego: prueba REAL en pantalla de la X del historial de devoluciones.
// Crea una salida de prueba, registra una devolución con teclado, la borra con la X,
// verifica que el historial queda vacío y que se puede volver a registrar.
// Teclado, sin internet, 390/768/1366/1920, 0 errores JS. Limpia todo al final.
// Uso: node ai-scripts/pruebas/verificar-x-devolucion-nego.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const require = createRequire(path.join(tools, 'x.js'));
const puppeteer = require('puppeteer-core');
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh');
const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
    if (r.stderr && /ERROR|FATAL/i.test(r.stderr)) throw new Error(r.stderr);
    return r.stdout.trim();
  } finally { s.dispose(); }
};

const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(130); } };
const aceptar = async () => {
  if (await page.$('#dialogo-sistema-aceptar')) { await tecla('Enter'); await pausa(600); }
};
const sello = String(Date.now()).slice(-6);
const ID_CLI = 994000 + (Number(sello) % 9000);
const NOMBRE_CLI = `ZZZ X DEV ${sello}`;
let codigo = '';
let idSalida = 0;

try {
  await sql(`INSERT INTO customers (id,name,dni,activo,created_at,is_synced)
    VALUES (${ID_CLI},'${NOMBRE_CLI}','${sello}',true,now(),1)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`);
  codigo = await sql(`SELECT fn_registrar_salida(jsonb_build_object(
      'tipo','SERVICIO','customer_id',${ID_CLI},'usuario','Administrador SiuHub',
      'observaciones','ZZZ PRUEBA X DEVOLUCION',
      'trabajadores',jsonb_build_array()::jsonb,
      'items',jsonb_build_array(jsonb_build_object(
        'descripcion','ZZZ MATERIAL X','unidad','UNID','cantidad',3,'costo_unitario',1,'es_externo',true
      ))))->>'codigo';`);
  idSalida = Number(await sql(`SELECT id FROM salidas WHERE codigo='${codigo}'`));

  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario', { timeout: 20000 });
  await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await tecla('Enter');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 25000 }); await pausa(1200);
  await page.focus('#sidebar-btn-salidas'); await tecla('Enter'); await pausa(1000);
  await page.focus('#buscador-salidas'); await page.keyboard.type(codigo); await pausa(900);
  await tecla('ArrowDown'); await tecla('ArrowDown'); await tecla('Enter'); await pausa(1600);
  ok('El detalle abre con teclado', !!(await page.$('#modal-detalle-salida-container')), codigo);

  // Registrar una devolución de 1 con teclado (sin trabajador, materia externo).
  await page.focus('#btn-abrir-devoluciones'); await tecla('Enter'); await pausa(700);
  ok('La ventana de devoluciones abre', !!(await page.$('#modal-devoluciones-flotante-container')));
  await page.focus('#input-devolver-0'); await page.keyboard.type('1'); await pausa(200);
  await page.focus('#btn-confirmar-devolucion'); await tecla('Enter'); await pausa(700);
  await aceptar(); await pausa(1400); await aceptar(); await pausa(400);
  const dev1 = await sql(`select count(*)||'|'||coalesce(sum(cantidad),0)||'|'||coalesce((select string_agg(cantidad_devuelta::text,',') from salida_items where salida_id=${idSalida}),'') from salida_devoluciones where salida_id=${idSalida}`);
  ok('La devolución se registró y sube el Devuelto', /^1\|1(?:\.0+)?\|1(?:\.0+)?$/.test(dev1), dev1);

  const idDev = await sql(`SELECT id FROM salida_devoluciones WHERE salida_id=${idSalida} ORDER BY id DESC LIMIT 1`);
  const selX = `#btn-eliminar-devolucion-${idDev}`;
  ok('El historial muestra una X con id propio', !!(await page.$(selX)), selX);
  const textoHistorial = await page.evaluate(() => {
    const c = document.getElementById('modal-detalle-salida-container');
    return c?.textContent || '';
  });
  ok('La pantalla NO dice «anular»', !/anular/i.test(textoHistorial));

  // Borrar con la X usando teclado (Enter).
  await page.focus(selX); await tecla('Enter'); await pausa(700);
  await aceptar(); await pausa(1400); await aceptar(); await pausa(500);
  const dev2 = await sql(`select count(*)||'|'||coalesce((select string_agg(cantidad_devuelta::text,',') from salida_items where salida_id=${idSalida}),'') from salida_devoluciones where salida_id=${idSalida}`);
  ok('La X borra la fila y baja el Devuelto a 0', /^0\|0(?:\.0+)?$/.test(dev2), dev2);
  ok('La X desaparece del historial', !(await page.$(selX)));

  // Poder volver a registrar después de borrar.
  await page.focus('#btn-abrir-devoluciones'); await tecla('Enter'); await pausa(700);
  await page.focus('#input-devolver-0'); await page.keyboard.type('2'); await pausa(200);
  await page.focus('#btn-confirmar-devolucion'); await tecla('Enter'); await pausa(700);
  await aceptar(); await pausa(1400); await aceptar(); await pausa(500);
  const dev3 = await sql(`select count(*)||'|'||coalesce(sum(cantidad),0)||'|'||coalesce((select string_agg(cantidad_devuelta::text,',') from salida_items where salida_id=${idSalida}),'') from salida_devoluciones where salida_id=${idSalida}`);
  ok('Después de la X se puede volver a registrar', /^1\|2(?:\.0+)?\|2(?:\.0+)?$/.test(dev3), dev3);
  const idDev2 = await sql(`SELECT id FROM salida_devoluciones WHERE salida_id=${idSalida} ORDER BY id DESC LIMIT 1`);

  // Los cuatro tamaños: la X sigue visible y se puede enfocar.
  for (const ancho of [390, 768, 1366, 1920]) {
    await page.setViewport({ width: ancho, height: 900 });
    await pausa(500);
    const x = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, id: el.id };
    }, `#btn-eliminar-devolucion-${idDev2}`);
    ok(`La X se ve en ${ancho}px`, !!x && x.w > 0 && x.h > 0, JSON.stringify(x));
  }
  await page.setViewport({ width: 1366, height: 860 });
  await pausa(300);

  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  try {
    if (idSalida) await sql(`select public.fn_eliminar_salida(${idSalida}, 'LIMPIEZA PRUEBA X')`);
    await sql(`DELETE FROM customers WHERE id = ${ID_CLI};`);
  } catch (e) { res.push('MAL No se pudieron borrar los datos de prueba: ' + e.message); }
  console.log(res.join('\n'));
}
