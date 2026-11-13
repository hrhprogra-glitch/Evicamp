// Prueba del 12/11/2026 (SiuMax Nego), con teclado: sección ENCARGOS (Cotizaciones + Pedidos) y los avisos de la Caja
// "Cotizaciones: N" y "Pedidos: N" (en alerta si algo vence o se entrega hoy). También que los botones de arriba de la
// Caja se acomoden bien en celular (390), tablet (768), laptop (1366) y PC (1920): sin salirse de la pantalla, sin
// taparse y sin barra de desplazamiento de costado. Al final borra lo creado y deja el negocio en solo Comercio.
// Uso: node ai-scripts/pruebas/prueba-encargos-nego.mjs <carpeta tools con puppeteer-core>
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [tools] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(tools, 'x.js')); const puppeteer = require('puppeteer-core');
process.loadEnvFile(path.join(aqui, '..', '..', '.env.vps'));
const reqP = createRequire(path.join(aqui, '..', '..', 'x.js'));
const { NodeSSH } = reqP('node-ssh'); const { conexionVps } = reqP('./ai-scripts/vps.cjs');
const sql = async (q) => { const s = new NodeSSH(); await s.connect(conexionVps); const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q }); s.dispose(); if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr); return r.stdout.trim(); };
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK ' : 'MAL'} ${n}${x !== '' ? ' — ' + x : ''}`);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sello = String(Date.now()).slice(-6);
const CLI = `PRUEBA AUTO CLIENTE ENCARGO ${sello}`;

// Entrar (en modo celular el teclado simulado vaciaba el usuario: se llena como lo haría React)
const entrar = async (page) => {
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario'); await pausa(600);
  await page.evaluate((u, c) => {
    const poner = (id, v) => { const el = document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    poner('input-login-usuario', u); poner('input-login-password', c);
  }, 'admin@siumax.com', process.env.SIUMAX_ADMIN_CLAVE);
  await pausa(300);
  await page.evaluate(() => document.querySelector('form')?.requestSubmit());
  await page.waitForSelector('#sidebar-btn-configuracion', { timeout: 20000 }); await pausa(2500);
};

try {
  // Una cotización vigente que vence hoy y un pedido pendiente para hoy (los dos deben poner su aviso en alerta)
  await sql(`insert into cotizaciones (numero, cliente_nombre, fecha_emision, fecha_vencimiento, estado, total, observaciones)
               values ('COT-E${sello}', '${CLI}', now(), date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima' + interval '23 hours', 'VIGENTE', 50, 'PRUEBA AUTO ${sello}');
             insert into pedidos_clientes (numero, cliente_nombre, fecha_entrega, estado, total, adelanto, saldo_pendiente, observaciones)
               values ('PED-E${sello}', '${CLI}', now() - interval '1 hour', 'PENDIENTE', 80, 20, 60, 'PRUEBA AUTO ${sello}');`);

  const nav = await puppeteer.launch({ executablePath: EDGE, headless: true, defaultViewport: { width: 1366, height: 860 } });
  const page = await nav.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message));
  const tecla = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pausa(250); } };
  const foco = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '');
  const hay = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  const marcado = (id) => page.$eval(`#tipo-negocio-${id}`, (b) => b.getAttribute('aria-checked'));
  const elegir = async (tipos) => {
    await page.evaluate(() => document.getElementById('sidebar-btn-configuracion')?.click()); await pausa(1500);
    await page.focus('#btn-tab-tipo_negocio'); await tecla('Enter'); await pausa(1200);
    for (const t of ['servicios', 'comercio']) if (tipos.includes(t) && (await marcado(t)) !== 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
    for (const t of ['comercio', 'servicios']) if (!tipos.includes(t) && (await marcado(t)) === 'true') { await page.focus(`#tipo-negocio-${t}`); await tecla('Enter'); }
    await page.focus('#btn-guardar-tipo-negocio'); await tecla('Enter'); await pausa(1500);
    if (await page.evaluate(() => !!document.getElementById('dialogo-sistema-texto')?.innerText)) await tecla('Enter');
  };
  const ir = async (sec) => { await page.evaluate((s) => document.getElementById(`sidebar-btn-${s}`)?.click(), sec); await pausa(2500); };
  const vista = () => page.evaluate(() => localStorage.getItem('evicamp_last_view'));
  const pestanaActiva = () => page.evaluate(() => document.querySelector('[id^="tab-encargos-"][aria-selected="true"]')?.id || '');
  try {
    await entrar(page);
    await elegir(['comercio']);
    await ir('clientes');
    const tabsCli = await page.$$eval('main [role="tab"], main .pestanas-sobrias > button', (b) => b.map((x) => x.innerText.trim().toUpperCase()).join(','));
    ok('Clientes ya no tiene Pedidos (ni Cotizaciones)', tabsCli === 'CLIENTES,CRÉDITOS', tabsCli);
    ok('Menú: Encargos', (await hay('#sidebar-btn-encargos')) && !(await hay('#sidebar-btn-cotizaciones')));

    // Caja: avisos
    await ir('pos');
    const avisos = await page.evaluate(() => ['btn-pos-aviso-cotizaciones', 'btn-pos-aviso-pedidos'].map((id) => { const b = document.getElementById(id); return b ? { t: b.innerText.replace(/\s+/g, ' ').trim(), alerta: b.className.includes('animate-pulse') } : null; }));
    ok('Caja: aviso "Cotizaciones" en alerta (una vence hoy)', !!avisos[0] && avisos[0].alerta && /COTIZACIONES: \d+/.test(avisos[0].t), JSON.stringify(avisos[0]));
    ok('Caja: aviso "Pedidos" en alerta (uno para hoy)', !!avisos[1] && avisos[1].alerta && /PEDIDOS: \d+/.test(avisos[1].t), JSON.stringify(avisos[1]));
    await page.focus('#btn-por-cobrar-pos'); await tecla('ArrowRight');
    ok('→ desde "Por cobrar" va a "Cotizaciones"', (await foco()) === 'btn-pos-aviso-cotizaciones', await foco());
    await tecla('ArrowRight'); ok('→ otra vez va a "Pedidos"', (await foco()) === 'btn-pos-aviso-pedidos', await foco());
    await tecla('ArrowLeft'); ok('← vuelve a "Cotizaciones"', (await foco()) === 'btn-pos-aviso-cotizaciones', await foco());
    await page.focus('#btn-pos-aviso-pedidos'); await tecla('ArrowDown');
    ok('↓ desde un aviso baja al buscador de la Caja', (await foco()) === 'buscador-global-pos', await foco());
    await page.focus('#btn-pos-aviso-pedidos'); await tecla('Enter'); await pausa(2500);
    ok('Enter en "Pedidos" abre Encargos en la pestaña Pedidos', (await vista()) === 'encargos' && (await pestanaActiva()) === 'tab-encargos-pedidos', `${await vista()} ${await pestanaActiva()}`);
    ok('…con el selector en el buscador de pedidos', (await foco()) === 'buscador-pedidos', await foco());
    ok('El pedido de la prueba sale en la lista', await page.evaluate((t) => document.body.innerText.includes(t), `PED-E${sello}`));
    await tecla('ArrowUp'); ok('↑ desde el buscador sube a la pestaña Pedidos', (await foco()) === 'tab-encargos-pedidos', await foco());
    await tecla('ArrowLeft'); ok('← va a la pestaña Cotizaciones', (await foco()) === 'tab-encargos-cotizaciones', await foco());
    await tecla('Enter'); await pausa(1500);
    ok('Enter abre Cotizaciones con el selector en su buscador', (await pestanaActiva()) === 'tab-encargos-cotizaciones' && (await foco()) === 'buscador-cotizaciones', `${await pestanaActiva()} ${await foco()}`);
    ok('La cotización de la prueba sale y "Nueva cotización" está en la cabecera', (await page.evaluate((t) => document.body.innerText.includes(t), `COT-E${sello}`)) && (await hay('#btn-nueva-cotizacion')));
    ok('No se abrió ninguna ventana sola al cambiar de pestaña', !(await hay('#modal-titulo-coti')));
    await ir('pos'); await page.focus('#btn-pos-aviso-cotizaciones'); await tecla('Enter'); await pausa(2500);
    ok('Enter en "Cotizaciones" de la Caja abre Encargos en Cotizaciones', (await vista()) === 'encargos' && (await pestanaActiva()) === 'tab-encargos-cotizaciones', await pestanaActiva());

    // Solo servicios: sin Pedidos ni pestañas
    await elegir(['servicios']); await ir('encargos');
    ok('Solo Servicios: Encargos sin pestaña Pedidos (solo cotizaciones)', !(await hay('#tab-encargos-pedidos')) && (await hay('#buscador-cotizaciones')));
    ok('Sin errores en la página', errores.length === 0, errores.join(' | '));
    await elegir(['comercio']);
  } finally { await nav.close(); }

  // Botones de arriba de la Caja en cada pantalla
  for (const vp of [
    { nombre: 'celular', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { nombre: 'tablet', width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { nombre: 'laptop', width: 1366, height: 768 },
    { nombre: 'PC', width: 1920, height: 1000 },
  ]) {
    const n2 = await puppeteer.launch({ executablePath: EDGE, headless: true, defaultViewport: vp });
    try {
      const p = await n2.newPage();
      await entrar(p);
      await p.evaluate(() => document.getElementById('sidebar-btn-pos')?.click()); await pausa(2500);
      const m = await p.evaluate(() => {
        const ids = ['btn-pos-header-cliente', 'btn-por-cobrar-pos', 'btn-pos-aviso-cotizaciones', 'btn-pos-aviso-pedidos'];
        const cajas = ids.map((id) => document.getElementById(id)).filter(Boolean).map((b) => ({ id: b.id, r: b.getBoundingClientRect(), visible: b.getClientRects().length > 0 }));
        const W = window.innerWidth;
        const fuera = cajas.filter((c) => c.r.right > W + 1 || c.r.left < -1).map((c) => c.id);
        const tapados = [];
        for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
          const a = cajas[i].r, b = cajas[j].r;
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) tapados.push(`${cajas[i].id}/${cajas[j].id}`);
        }
        const top = (id) => Math.round(cajas.find((c) => c.id === id)?.r.top ?? -1);
        const avisosEnUnaFila = new Set(['btn-por-cobrar-pos', 'btn-pos-aviso-cotizaciones', 'btn-pos-aviso-pedidos'].map(top)).size === 1;
        const todoEnUnaFila = avisosEnUnaFila && top('btn-pos-header-cliente') === top('btn-por-cobrar-pos');
        const textos = ['btn-por-cobrar-pos', 'btn-pos-aviso-cotizaciones', 'btn-pos-aviso-pedidos'].map((id) => document.getElementById(id)?.innerText.replace(/\s+/g, ' ').trim());
        return { vistos: cajas.filter((c) => c.visible).length, fuera, tapados, desborde: document.documentElement.scrollWidth > W + 1, avisosEnUnaFila, todoEnUnaFila, textos };
      });
      ok(`${vp.nombre} (${vp.width}): los 4 botones se ven, sin salirse ni taparse y sin desplazamiento de costado`, m.vistos === 4 && m.fuera.length === 0 && m.tapados.length === 0 && !m.desborde, JSON.stringify(m));
      ok(`${vp.nombre} (${vp.width}): los 3 avisos juntos en una fila, con su nombre`, m.avisosEnUnaFila && m.textos.every((t) => /[A-Z]{4,}.*: ?\d+/.test(t || '')), JSON.stringify(m.textos));
      if (vp.width >= 1536) ok(`${vp.nombre} (${vp.width}): título, Cliente y avisos en UNA sola fila`, m.todoEnUnaFila);
      await p.screenshot({ path: path.join(aqui, `captura-caja-avisos-${vp.width}.png`) });
    } finally { await n2.close(); }
  }
} catch (e) {
  ok('Sin fallas en la prueba', false, e.message);
} finally {
  try { await sql(`delete from cotizaciones where numero = 'COT-E${sello}'; delete from pedidos_clientes where numero = 'PED-E${sello}';`); } catch (e) { res.push('MAL limpieza — ' + e.message); }
  console.log(res.join('\n'));
}
