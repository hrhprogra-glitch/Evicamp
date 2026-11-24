// Pasada 228: prueba del detalle de Salidas en Nego (solo siumax).
// Detalle SOLO para mirar (sin campos editables ni X), botones en una fila, teclado,
// sin internet, 390/768/1366/1920, fecha y trabajador al devolver, y «Continuar salida»
// que trae los materiales a la tabla editable y guarda una salida nueva.
// Uso: node ai-scripts/pruebas/prueba-detalle-salida-228.mjs <carpeta tools con puppeteer-core>
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
const ponerValor = async (sel, valor) => {
  await page.$eval(sel, (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, valor);
};

const sello = String(Date.now()).slice(-6);
const NOMBRE_CLI = `ZZZ 228 CLIENTE ${sello}`;
const NOMBRE_TRAB = `ZZZ 228 TECNICO ${sello}`;
const ID_CLI = 993000 + (Number(sello) % 9000);
const FECHA_DEV = '2026-11-20';

try {
  await sql(`INSERT INTO customers (id,name,dni,activo,created_at,is_synced) VALUES (${ID_CLI},'${NOMBRE_CLI}','${sello}',true,now(),1)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO trabajadores (nombre,cargo,estado) VALUES ('${NOMBRE_TRAB}','TECNICO','ACTIVO');`);
  const idTrab = await sql(`SELECT id FROM trabajadores WHERE nombre='${NOMBRE_TRAB}' ORDER BY id DESC LIMIT 1`);
  const codigo = await sql(`SELECT fn_registrar_salida(jsonb_build_object(
      'tipo','SERVICIO','customer_id',${ID_CLI},'usuario','Administrador SiuHub',
      'observaciones','ZZZ DETALLE 228',
      'trabajadores',jsonb_build_array(jsonb_build_object('trabajador_id',${idTrab},'rol','RESPONSABLE')),
      'items',jsonb_build_array(
        jsonb_build_object('descripcion','ZZZ MATERIAL A 228','unidad','UNID','cantidad',5,'costo_unitario',2,'es_externo',true),
        jsonb_build_object('descripcion','ZZZ MATERIAL B 228','unidad','UNID','cantidad',3,'costo_unitario',1,'es_externo',true)
      )))->>'codigo';`);
  const idRaiz = await sql(`SELECT id FROM salidas WHERE codigo='${codigo}'`);

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

  // --- El detalle es solo para mirar: ni un campo editable, ni la X de quitar material ---
  const soloLectura = await page.evaluate(() => {
    const c = document.getElementById('modal-detalle-salida-container');
    if (!c) return null;
    return {
      campos: c.querySelectorAll('input, select, textarea').length,
      quitar: c.querySelectorAll('[id^="btn-quitar-material-detalle-"]').length,
      cliente: !!document.getElementById('dato-cliente-detalle-salida'),
      nota: (c.textContent || '').includes('Solo lectura'),
      guia: (c.textContent || '').includes('Continuar salida'),
      botones: ['btn-imprimir-salida', 'btn-continuar-salida', 'btn-finalizar-salida', 'btn-eliminar-salida',
        'btn-abrir-devoluciones', 'btn-cerrar-detalle-salida'].filter((id) => !!document.getElementById(id)).length,
    };
  });
  ok('Detalle sin campos editables y sin X de materiales',
    !!soloLectura && soloLectura.campos === 0 && soloLectura.quitar === 0, JSON.stringify(soloLectura));
  ok('Detalle muestra datos, avisa que es solo lectura y tiene los 6 botones',
    !!soloLectura && soloLectura.cliente && soloLectura.nota && soloLectura.guia && soloLectura.botones === 6,
    JSON.stringify(soloLectura));

  // --- Medición en los 4 tamaños ---
  for (const [w, h] of [[390, 844], [768, 1024], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h });
    await pausa(500);
    const m = await page.evaluate(() => {
      const c = document.getElementById('modal-detalle-salida-container');
      if (!c) return null;
      const ids = ['btn-imprimir-salida', 'btn-continuar-salida', 'btn-finalizar-salida', 'btn-eliminar-salida'];
      const ys = ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top).filter((y) => y !== undefined);
      const desbordes = [...c.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0).length;
      const cab = c.querySelector('.ventana-cabecera');
      return {
        ancho: Math.round(c.getBoundingClientRect().width),
        filasBoton: ys.slice().sort((a, b) => a - b).reduce((n, y, i, arr) => n + (i === 0 || y - arr[i - 1] > 4 ? 1 : 0), 0),
        desbordes,
        sobrio: c.classList.contains('ventana-sobria') && c.classList.contains('max-w-5xl') && !!cab,
        radio: getComputedStyle(c.querySelector('#btn-eliminar-salida') || c).borderRadius,
        cerrar: [...c.querySelectorAll('button')].some((b) => (b.textContent || '').trim().toLowerCase() === 'cerrar'),
        x: !!document.getElementById('btn-cerrar-detalle-salida'),
        campos: c.querySelectorAll('input, select, textarea').length,
      };
    });
    ok(`${w}px: botones en una fila, X, sin «Cerrar», sin campos y sin desbordes`,
      !!m && m.filasBoton === 1 && m.x && !m.cerrar && m.campos === 0,
      m ? `ancho=${m.ancho} filas=${m.filasBoton} desbordes=${m.desbordes}` : 'sin modal');
    ok(`${w}px: estilo SiuMax Sobrio con esquinas cuadradas`,
      !!m && m.sobrio && /^0px$/.test(m.radio), m ? `radio=${m.radio}` : '');
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
  let reconectado = false;
  for (let i = 0; i < 30; i++) {
    await pausa(800);
    reconectado = !(await page.evaluate(() => (document.body.innerText || '').includes('SIN INTERNET')));
    if (reconectado) break;
  }
  ok('Al volver internet el sistema vuelve a permitir guardar', reconectado);

  // --- Devoluciones: ventana flotante con fecha y trabajador ---
  await page.focus('#btn-abrir-devoluciones'); await tecla('Enter'); await pausa(700);
  ok('«Devolver» abre una ventana flotante', !!(await page.$('#modal-devoluciones-flotante-container')));
  const flot = await page.evaluate(() => {
    const f = document.getElementById('modal-devoluciones-flotante-container');
    const b = document.getElementById('btn-confirmar-devolucion');
    const sel = document.getElementById('select-trabajador-devolucion-flotante');
    return {
      dentroDelDetalle: !!document.getElementById('modal-detalle-salida-container')?.contains(f),
      inputs: [...(f?.querySelectorAll('[id^="input-devolver-"]') || [])].length,
      fecha: document.getElementById('input-fecha-devolucion-flotante')?.type,
      trabajadorOpciones: sel?.options?.length || 0,
      submit: b?.getAttribute('type') === 'submit' && b?.getAttribute('form') === 'form-devoluciones-flotante',
      sobrio: !!f?.classList.contains('ventana-sobria') && !!f?.classList.contains('max-w-5xl') && !!f?.querySelector('.ventana-cabecera'),
      radio: b ? getComputedStyle(b).borderRadius : '',
    };
  });
  ok('Flotante hermana del detalle, con materiales, fecha, trabajador y un botón',
    !flot.dentroDelDetalle && flot.inputs === 2 && flot.fecha === 'date' && flot.trabajadorOpciones >= 2 && flot.submit,
    JSON.stringify(flot));
  ok('La flotante usa el mismo estilo SiuMax Sobrio y botones cuadrados',
    flot.sobrio && /^0px$/.test(flot.radio), `radio=${flot.radio}`);
  await tecla('Escape'); await pausa(500);
  ok('Escape cierra solo la flotante y deja el detalle abierto',
    !(await page.$('#modal-devoluciones-flotante-container')) && !!(await page.$('#modal-detalle-salida-container')));

  await page.focus('#btn-abrir-devoluciones'); await tecla('Enter'); await pausa(600);
  await page.focus('#input-devolver-0');
  await page.keyboard.down('Control'); await tecla('KeyA'); await page.keyboard.up('Control'); await escribir('2');
  await tecla('Tab'); await escribir('1');
  await ponerValor('#input-fecha-devolucion-flotante', FECHA_DEV);
  await page.select('#select-trabajador-devolucion-flotante', idTrab); await pausa(200);
  const totalFlot = await page.evaluate(() => document.getElementById('modal-devoluciones-flotante-container')?.textContent || '');
  ok('La flotante muestra el monto a devolver', /Total a devolver/.test(totalFlot) && /5\.00/.test(totalFlot),
    totalFlot.match(/Total a devolver.{0,30}/)?.[0] || '');
  await page.focus('#btn-confirmar-devolucion'); await tecla('Enter'); await pausa(700); await aceptar(); await pausa(1600); await aceptar();
  const devDb = await sql(`select count(*)||'|'||coalesce(sum(cantidad),0)||'|'||count(*) filter (where trabajador_id=${idTrab} and fecha::date=date '${FECHA_DEV}') from salida_devoluciones where salida_id=${idRaiz}`);
  ok('La devolución guarda fecha y trabajador y cierra la flotante',
    /^2\|3(?:\.0+)?\|2$/.test(devDb) && !(await page.$('#modal-devoluciones-flotante-container')), devDb);

  // --- Continuar salida: trae los materiales a la tabla editable y guarda una salida nueva ---
  await page.focus('#btn-continuar-salida'); await tecla('Enter'); await pausa(1200);
  ok('«Continuar salida» abre la ventana de Nueva salida', !!(await page.$('#modal-nueva-salida-container')));
  const cont = await page.evaluate(() => {
    const c = document.getElementById('modal-nueva-salida-container');
    const inputs = [...(c?.querySelectorAll('[data-tabla-campos] input[type=number]') || [])];
    return {
      titulo: c?.textContent || '',
      cantidades: inputs.map((i) => i.value),
      quitar: c?.querySelectorAll('button[title="Quitar material"]').length || 0,
    };
  });
  ok('Los materiales de la salida original llegan a la tabla editable',
    cont.cantidades.length === 2 && cont.cantidades[0] === '5' && cont.cantidades[1] === '3' && cont.quitar === 2,
    JSON.stringify(cont.cantidades));
  ok('La ventana dice «Continuar Salida» con el código',
    cont.titulo.includes('Continuar Salida') && cont.titulo.includes(codigo));

  // Cambiar la cantidad del primero y quitar el segundo, todo con teclado
  await page.evaluate(() => document.querySelectorAll('[data-tabla-campos] input[type=number]')[0]?.focus());
  await page.keyboard.down('Control'); await tecla('KeyA'); await page.keyboard.up('Control'); await escribir('7'); await tecla('Tab');
  await page.evaluate(() => document.querySelectorAll('[data-tabla-campos] button[title="Quitar material"]')[1]?.focus());
  await tecla('Enter'); await pausa(300);
  const trasEditar = await page.evaluate(() => [...document.querySelectorAll('[data-tabla-campos] input[type=number]')].map((i) => i.value));
  ok('Se puede cambiar una cantidad y quitar un material en la tabla',
    trasEditar.length === 1 && trasEditar[0] === '7', JSON.stringify(trasEditar));

  await page.focus('#btn-guardar-salida'); await tecla('Enter'); await pausa(1200);
  const avisoGuardar = await page.evaluate(() => document.querySelector('#dialogo-sistema, [id^="dialogo-sistema"]')?.textContent || '');
  await aceptar(); await pausa(1200); await aceptar();
  const diag = await sql(`select coalesce(string_agg(id::text||':raiz='||coalesce(salida_raiz_id::text,'-')||':obs='||coalesce(observaciones,'-'),' / '),'') from salidas where customer_id=${ID_CLI}`);
  const nueva = await sql(`select count(*)||'|'||coalesce(string_agg(i.cantidad::text,','),'')||'|'||count(*) filter (where s.observaciones like 'Continuación de ${codigo}%') from salidas s join salida_items i on i.salida_id=s.id where s.salida_raiz_id=${idRaiz}`);
  ok('Guardar crea una salida nueva ligada a la original, con el material editado',
    /^1\|7(?:\.0+)?\|1$/.test(nueva), `aviso=${avisoGuardar.slice(0, 120)} salidas=${diag} nueva=${nueva}`);
  const orig = await sql(`select count(*)||'|'||coalesce(string_agg(cantidad::text,',' order by id),'') from salida_items where salida_id=${idRaiz}`);
  ok('La salida original queda igual', /^2\|5(?:\.0+)?,3(?:\.0+)?$/.test(orig), orig);
  await tecla('Escape'); await pausa(400);

  ok('Sin errores de JavaScript', errores.length === 0, errores.join(' | ').slice(0, 300));
} catch (e) {
  ok('Sin fallas', false, e.message);
} finally {
  await nav.close();
  try {
    const ids = (await sql(`select coalesce(string_agg(id::text, ','), '') from salidas where customer_id = ${ID_CLI}`))
      .split(',').filter(Boolean);
    for (const id of ids) await sql(`select public.fn_eliminar_salida(${id}, 'LIMPIEZA PRUEBA 228')`);
    await sql(`DELETE FROM customers WHERE id = ${ID_CLI}; DELETE FROM trabajadores WHERE nombre = '${NOMBRE_TRAB}';`);
  } catch (e) { res.push('MAL No se pudieron borrar los datos de prueba: ' + e.message); }
  console.log(res.join('\n'));
}
