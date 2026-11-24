// Pasada 228: prueba REAL de «Eliminar salida» desde el detalle, con teclado y sin internet.
// Crea una salida con material de almacén, la abre desde la tabla, aprieta Eliminar,
// confirma con Enter y comprueba que la salida desaparece y el stock vuelve.
// Uso: node ai-scripts/pruebas/prueba-eliminar-salida-228.mjs <carpeta tools con puppeteer-core>
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
const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(120); } };
const escribir = async (t) => { await page.keyboard.type(t); await pausa(100); };
const aceptar = async () => {
  if (await page.$('#dialogo-sistema-aceptar')) { await tecla('Enter'); await pausa(800); }
};

const sello = String(Date.now()).slice(-6);
const NOMBRE_CLI = `ZZZ 228 BORRAR CLI ${sello}`;
const ID_CLI = 994000 + (Number(sello) % 9000);
const USUARIO = 'PRUEBA ELIMINAR 228';
let codigo = '';

try {
  await sql(`INSERT INTO customers (id,name,dni,activo,created_at,is_synced)
    VALUES (${ID_CLI},'${NOMBRE_CLI}','${sello}',true,now(),1)
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;`);
  const prod = (await sql(`SELECT id||'|'||coalesce(quantity,0) FROM products WHERE coalesce(is_active,1)=1 AND coalesce(quantity,0)>=4 ORDER BY id LIMIT 1`)).split('|');
  const idProd = prod[0]; const stock0 = prod[1];
  if (!idProd) throw new Error('No hay producto con stock para la prueba');
  codigo = await sql(`SELECT fn_registrar_salida(jsonb_build_object(
      'tipo','SERVICIO','customer_id',${ID_CLI},'usuario','${USUARIO}',
      'observaciones','ZZZ ELIMINAR 228',
      'items',jsonb_build_array(jsonb_build_object(
        'product_id',${idProd},'descripcion','ZZZ MATERIAL BORRAR 228','unidad','UNID',
        'cantidad',3,'costo_unitario',1,'es_externo',false))))->>'codigo';`);
  const idSalida = await sql(`SELECT id FROM salidas WHERE codigo='${codigo}'`);
  const trasCrear = await sql(`SELECT coalesce(quantity,0)||'|'||count(*) FROM products p LEFT JOIN salida_items i ON i.product_id=p.id AND i.salida_id=${idSalida} WHERE p.id=${idProd} GROUP BY p.id`);
  ok('La salida de prueba descuenta 3 unidades del almacén',
    Math.abs(Number(trasCrear.split('|')[0]) - (Number(stock0) - 3)) < 0.001, `antes=${stock0} despues=${trasCrear}`);

  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario'); await escribir('admin@siumax.com');
  await page.focus('#input-login-password'); await escribir(process.env.SIUMAX_ADMIN_CLAVE); await tecla('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 20000 }); await pausa(1500);
  await page.keyboard.down('Alt'); await tecla('Digit4'); await page.keyboard.up('Alt'); await pausa(2200);

  await page.focus('#buscador-salidas'); await escribir(codigo); await pausa(800);
  await tecla('ArrowDown'); await tecla('ArrowDown'); await tecla('Enter'); await pausa(1400);
  ok('La fila se abre con Enter y muestra el detalle', !!(await page.$('#modal-detalle-salida-container')));

  for (const [w, h] of [[390, 844], [1366, 860]]) {
    await page.setViewport({ width: w, height: h }); await pausa(400);
    const visible = await page.evaluate(() => {
      const b = document.getElementById('btn-eliminar-salida');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), radio: getComputedStyle(b).borderRadius };
    });
    ok(`${w}px: el botón Eliminar se ve y es cuadrado`,
      !!visible && visible.w > 0 && visible.h > 0 && /^0px$/.test(visible.radio), JSON.stringify(visible));
  }
  await page.setViewport({ width: 1366, height: 860 }); await pausa(300);

  // Sin internet el botón responde con teclado y pide confirmación (la base solo se toca con internet).
  await page.setOfflineMode(true); await pausa(300);
  await page.focus('#btn-eliminar-salida'); await tecla('Enter'); await pausa(500);
  ok('Sin internet: Eliminar responde con teclado y pide confirmación', !!(await page.$('#dialogo-sistema-aceptar')));
  await tecla('Escape'); await pausa(400);
  await page.setOfflineMode(false);
  let reconectado = false;
  for (let i = 0; i < 30; i++) {
    await pausa(800);
    reconectado = !(await page.evaluate(() => (document.body.innerText || '').includes('SIN INTERNET')));
    if (reconectado) break;
  }
  ok('Al volver internet el sistema vuelve a permitir guardar', reconectado);

  // Borrar de verdad, con teclado y confirmación propia.
  await page.focus('#btn-eliminar-salida'); await tecla('Enter'); await pausa(500);
  ok('Eliminar pide confirmación propia con el teclado', !!(await page.$('#dialogo-sistema-aceptar')));
  await aceptar(); await pausa(1500); await aceptar(); await pausa(800);
  const quedan = await sql(`SELECT count(*) FROM salidas WHERE id=${idSalida}`);
  const stockFinal = await sql(`SELECT coalesce(quantity,0) FROM products WHERE id=${idProd}`);
  const movs = await sql(`SELECT count(*) FROM inventory_movements WHERE reason='Devolución de Salida ${codigo}' AND operation_type='DEVOLUCION'`);
  ok('Eliminar borra la salida y devuelve el stock con teclado',
    quedan === '0' && Math.abs(Number(stockFinal) - Number(stock0)) < 0.001,
    `quedan=${quedan} stock=${stockFinal} esperado=${stock0}`);
  ok('El movimiento de devolución queda registrado', Number(movs) >= 1, movs);
  ok('El detalle se cierra al eliminar', !(await page.$('#modal-detalle-salida-container')));

  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  try {
    await sql(`SELECT public.fn_eliminar_salida(id, 'LIMPIEZA ${USUARIO}') FROM salidas WHERE customer_id=${ID_CLI};
      DELETE FROM inventory_movements WHERE reason='Devolución de Salida ${codigo || ''}' OR "user" IN ('${USUARIO}','LIMPIEZA ${USUARIO}');
      DELETE FROM salida_devoluciones WHERE usuario IN ('${USUARIO}','LIMPIEZA ${USUARIO}');
      DELETE FROM customers WHERE id=${ID_CLI};`);
  } catch (e) { res.push('MAL No se pudieron borrar los datos de prueba: ' + e.message); }
  console.log(res.join('\n'));
}
