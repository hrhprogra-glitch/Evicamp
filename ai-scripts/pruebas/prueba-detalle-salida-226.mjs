// Pasada 226: prueba del detalle nuevo de Salidas en Nego (solo siumax).
// Teclado, sin internet, 390/768/1366/1920, edición total, devolución múltiple y borrado con stock.
// Uso: node ai-scripts/pruebas/prueba-detalle-salida-226.mjs <carpeta tools con puppeteer-core>
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
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose();
  if (r.stderr && /ERROR|FATAL/i.test(r.stderr)) throw new Error(r.stderr);
  return r.stdout.trim();
};

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
const activo = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('data-fila-salida') || document.activeElement?.tagName || '');
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(120); } };
const escribir = async (t) => { await page.keyboard.type(t); await pausa(100); };
const aceptar = async () => {
  if (await page.$('#dialogo-sistema-aceptar')) { await tecla('Enter'); await pausa(700); }
};
const sello = String(Date.now()).slice(-6);
const NOMBRE_CLI = `ZZZ 226 CLIENTE ${sello}`;
const NOMBRE_TRAB = `ZZZ 226 TECNICO ${sello}`;
const ID_CLI = 990000 + (Number(sello) % 9000);

try {
  // Primero el cliente y el técnico (la salida tiene FK a customers).
  await sql(`INSERT INTO customers (id,name,dni,activo,created_at,is_synced) VALUES (${ID_CLI},'${NOMBRE_CLI}','${sello}',true,now(),1)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO trabajadores (nombre,cargo,estado) VALUES ('${NOMBRE_TRAB}','TECNICO','ACTIVO');`);
  const codigo = await sql(`SELECT fn_registrar_salida(jsonb_build_object(
      'tipo','SERVICIO','customer_id',${ID_CLI},'usuario','Administrador SiuHub',
      'observaciones','ZZZ DETALLE 226',
      'items',jsonb_build_array(jsonb_build_object('descripcion','ZZZ MATERIAL 226','unidad','UNID','cantidad',5,'costo_unitario',2,'es_externo',true))
    ))->>'codigo';`);

  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario'); await escribir('admin@siumax.com');
  await page.focus('#input-login-password'); await escribir(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 20000 }); await pausa(1500);
  await page.keyboard.down('Alt'); await tecla('Digit4'); await page.keyboard.up('Alt'); await pausa(2200);

  await page.focus('#buscador-salidas'); await escribir(codigo); await pausa(800);
  await tecla('ArrowDown'); await tecla('ArrowDown');
  await tecla('Enter'); await pausa(1500);
  ok('El detalle abre con Enter desde la fila', !!(await page.$('#modal-detalle-salida-container')));

  // --- Medición en los 4 tamaños, sobre el mismo detalle abierto ---
  for (const [w, h] of [[390, 844], [768, 1024], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h });
    await pausa(500);
    const m = await page.evaluate(() => {
      const c = document.getElementById('modal-detalle-salida-container');
      if (!c) return null;
      const ids = ['btn-imprimir-salida', 'btn-continuar-salida', 'btn-finalizar-salida', 'btn-eliminar-salida'];
      const ys = ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top).filter((y) => y !== undefined);
      const desbordes = [...c.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0).length;
      return {
        ancho: Math.round(c.getBoundingClientRect().width),
        filasBoton: ys.slice().sort((a, b) => a - b).reduce((n, y, i, arr) => n + (i === 0 || y - arr[i - 1] > 4 ? 1 : 0), 0),
        desbordes,
        cerrar: [...c.querySelectorAll('button')].some((b) => (b.textContent || '').trim().toLowerCase() === 'cerrar'),
        x: !!document.getElementById('btn-cerrar-detalle-salida'),
        desplegable: !!document.getElementById('select-material-devolucion'),
      };
    });
    ok(`${w}px: botones en una fila, sin «Cerrar», con X, sin desplegable de devolución`,
      !!m && m.filasBoton === 1 && !m.cerrar && m.x && !m.desplegable,
      m ? `ancho=${m.ancho} filas=${m.filasBoton} desbordes=${m.desbordes}` : 'sin modal');
    if (w >= 1366) ok(`${w}px: aprovecha el ancho (>= 1000 px)`, !!m && m.ancho >= 1000, m ? `${m.ancho}px` : '');
  }

  await page.setViewport({ width: 1366, height: 860 }); await pausa(400);

  // Sin internet: el detalle ya cargado sigue respondiendo al teclado
  await page.setOfflineMode(true); await pausa(300);
  await page.focus('#btn-eliminar-salida'); await tecla('Enter'); await pausa(400);
  const dialogo = !!(await page.$('#dialogo-sistema-aceptar'));
  await tecla('Escape'); await pausa(400);
  ok('Sin internet: los botones del detalle siguen respondiendo con teclado', dialogo, `foco=${await activo()}`);
  await page.setOfflineMode(false);
  // El sistema confirma que volvió internet en su vigilante de 15 s; hasta entonces bloquea escrituras
  // a propósito. Esperar a la barra "SIN INTERNET" desaparezca antes de seguir editando.
  let reconectado = false;
  for (let i = 0; i < 30; i++) {
    await pausa(800);
    reconectado = !(await page.evaluate(() => (document.body.innerText || '').includes('SIN INTERNET')));
    if (reconectado) break;
  }
  ok('Al volver internet el sistema vuelve a permitir guardar', reconectado);

  // Todo se puede editar desde el detalle
  await page.focus('#input-nota-detalle-salida');
  await escribir(' ZZZ NOTA EDITADA 226'); await tecla('Tab');
  let notaDb = '';
  for (let i = 0; i < 20; i++) {
    await pausa(400); await aceptar();
    notaDb = await sql(`select coalesce(observaciones,'') from salidas where codigo='${codigo}'`);
    if (/ZZZ NOTA EDITADA 226/.test(notaDb)) break;
  }
  ok('La nota se edita en el detalle y se guarda', /ZZZ NOTA EDITADA 226/.test(notaDb), notaDb);

  await page.select('#select-empleado-detalle-salida', await page.evaluate(() => document.getElementById('select-empleado-detalle-salida')?.options?.[1]?.value || ''));
  await pausa(1400); await aceptar();
  ok('Se puede cambiar quién atendió desde el detalle', !!(await page.$('#select-empleado-detalle-salida')));

  await page.focus('#btn-agregar-trabajador-detalle'); await tecla('Enter'); await pausa(1600); await aceptar();
  const trabDb = await sql(`select count(*) from salida_trabajadores where salida_id=(select id from salidas where codigo='${codigo}')`);
  ok('Se puede agregar trabajador dentro del detalle', Number(trabDb) >= 1, `${trabDb} trabajador(es)`);

  await page.select('#select-material-nuevo-detalle', 'OTRO'); await pausa(200);
  await page.focus('#input-desc-material-externo-detalle'); await escribir('ZZZ MATERIAL AGREGADO 226');
  await page.focus('#input-cantidad-material-nuevo-detalle');
  await page.keyboard.down('Control'); await tecla('KeyA'); await page.keyboard.up('Control');
  await escribir('3');
  await page.focus('#btn-agregar-material-detalle'); await tecla('Enter'); await pausa(1800); await aceptar();
  const itemsDb = await sql(`select count(*) from salida_items where salida_id=(select id from salidas where codigo='${codigo}')`);
  ok('Se puede agregar material desde el detalle', Number(itemsDb) === 2, `${itemsDb} materiales`);

  // Devolver dos materiales a la vez, sin desplegable
  const devInputs = await page.$$('[id^="input-devolver-"]');
  ok('Todos los materiales salen en la tabla de devoluciones', devInputs.length === 2, `${devInputs.length} filas`);
  await page.focus('#input-devolver-0');
  await page.keyboard.down('Control'); await tecla('KeyA'); await page.keyboard.up('Control'); await escribir('2');
  await page.focus('#input-devolver-1');
  await page.keyboard.down('Control'); await tecla('KeyA'); await page.keyboard.up('Control'); await escribir('1');
  await page.focus('#btn-confirmar-devolucion'); await tecla('Enter'); await pausa(700); await aceptar(); await pausa(1600); await aceptar();
  const devDb = await sql(`select count(*)||'|'||coalesce(sum(cantidad),0) from salida_devoluciones where salida_id=(select id from salidas where codigo='${codigo}')`);
  ok('La devolución múltiple se guarda de una vez', /^2\|3/.test(devDb), devDb);

  // Finalizar y borrar
  await page.focus('#btn-finalizar-salida'); await tecla('Enter'); await pausa(700); await aceptar(); await pausa(1200); await aceptar();
  const finalizado = await page.evaluate(() => (document.querySelector('#modal-detalle-salida-container')?.textContent || '').includes('Finalizado'));
  ok('Finalizar salida sigue funcionando en la misma fila de botones', finalizado);

  await page.focus('#btn-eliminar-salida'); await tecla('Enter'); await pausa(700); await aceptar(); await pausa(1500); await aceptar();
  const borrada = await sql(`select count(*) from salidas where codigo='${codigo}'`);
  const cerrada = !(await page.$('#modal-detalle-salida-container'));
  ok('Eliminar borra la salida y cierra el detalle', borrada === '0' && cerrada, `filas=${borrada} cerrada=${cerrada}`);

  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  try {
    // Borrar con la RPC (no DELETE directo) para que devuelva cualquier stock pendiente si la prueba se cortó a medias.
    const ids = (await sql(`select coalesce(string_agg(id::text, ','), '') from salidas where customer_id = ${ID_CLI}`))
      .split(',').filter(Boolean);
    for (const id of ids) await sql(`select public.fn_eliminar_salida(${id}, 'LIMPIEZA PRUEBA 226')`);
    await sql(`DELETE FROM customers WHERE id = ${ID_CLI};
      DELETE FROM trabajadores WHERE nombre = '${NOMBRE_TRAB}';`);
  } catch (e) { res.push('MAL No se pudieron borrar los datos de prueba: ' + e.message); }
  console.log(res.join('\n'));
}
