// Diagnóstico puntual del detalle 226: rects de botones, desbordes y guardado de la nota.
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
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 860 },
});
const page = await nav.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
const sello = String(Date.now()).slice(-6);
const ID_CLI = 990000 + (Number(sello) % 9000);
try {
  await sql(`INSERT INTO customers (id,name,dni,activo,created_at,is_synced) VALUES (${ID_CLI},'DIAG 226 ${sello}','${sello}',true,now(),1) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;`);
  const codigo = await sql(`SELECT fn_registrar_salida(jsonb_build_object(
    'tipo','SERVICIO','customer_id',${ID_CLI},'usuario','Administrador SiuHub',
    'observaciones','ZZZ DIAG 226',
    'items',jsonb_build_array(jsonb_build_object('descripcion','ZZZ MAT 226','unidad','UNID','cantidad',5,'costo_unitario',2,'es_externo',true))))->>'codigo';`);
  await page.goto('https://nego.siumax.duckdns.org', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#input-login-usuario');
  await page.focus('#input-login-usuario'); await page.keyboard.type('admin@siumax.com');
  await page.focus('#input-login-password'); await page.keyboard.type(process.env.SIUMAX_ADMIN_CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sidebar-btn-salidas', { timeout: 20000 }); await pausa(1200);
  await page.keyboard.down('Alt'); await page.keyboard.press('Digit4'); await page.keyboard.up('Alt'); await pausa(2000);
  await page.focus('#buscador-salidas'); await page.keyboard.type(codigo); await pausa(700);
  await page.keyboard.press('ArrowDown'); await pausa(200); await page.keyboard.press('ArrowDown'); await pausa(200);
  await page.keyboard.press('Enter'); await pausa(1400);

  for (const [w, h] of [[390, 844], [768, 1024], [1366, 860], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h }); await pausa(500);
    const m = await page.evaluate(() => {
      const ids = ['btn-imprimir-salida', 'btn-continuar-salida', 'btn-finalizar-salida', 'btn-eliminar-salida'];
      const botones = ids.map((id) => {
        const e = document.getElementById(id);
        if (!e) return `${id}:AUSENTE`;
        const r = e.getBoundingClientRect();
        return `${id}: top=${r.top.toFixed(0)} left=${r.left.toFixed(0)} w=${r.width.toFixed(0)} h=${r.height.toFixed(0)}`;
      });
      const c = document.getElementById('modal-detalle-salida-container');
      const desbordes = c ? [...c.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0)
        .map((e) => `${e.tagName}#${e.id || ''}.${(e.className || '').toString().slice(0, 40)} sw=${e.scrollWidth} cw=${e.clientWidth}`) : [];
      const footer = c?.querySelector('.border-t-2');
      return { botones, desbordes, footer: footer ? `sw=${footer.scrollWidth} cw=${footer.clientWidth} h=${footer.getBoundingClientRect().height}` : '?' };
    });
    console.log(`\n=== ${w}px ===\n${m.botones.join('\n')}\nFOOTER ${m.footer}\nDESBORDES (${m.desbordes.length}):\n${m.desbordes.join('\n')}`);
  }

  await page.setViewport({ width: 1366, height: 860 }); await pausa(400);

  // Reproducir exactamente la prueba: sin internet, Enter en Eliminar, Escape, volver online.
  await page.setOfflineMode(true); await pausa(300);
  await page.focus('#btn-eliminar-salida'); await page.keyboard.press('Enter'); await pausa(400);
  console.log('\nDialogo tras Enter en Eliminar (offline):', await page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '(ninguno)'));
  await page.keyboard.press('Escape'); await pausa(400);
  console.log('Foco tras Escape:', await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || ''));
  console.log('Modal sigue abierto:', !!(await page.$('#modal-detalle-salida-container')));
  await page.setOfflineMode(false); await pausa(300);

  await page.focus('#input-nota-detalle-salida');
  await page.keyboard.type(' ZZZ NOTA DIAG 226');
  console.log('\nValor input antes de Tab:', await page.$eval('#input-nota-detalle-salida', (e) => e.value));
  await page.keyboard.press('Tab'); await pausa(2000);
  console.log('Dialogo:', await page.evaluate(() => document.getElementById('dialogo-sistema-texto')?.innerText || '(ninguno)'));
  console.log('Foco:', await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || ''));
  console.log('BD tras Tab:', await sql(`select coalesce(observaciones,'') from salidas where codigo='${codigo}'`));
  console.log('Errores JS:', errores.join(' | ') || '(ninguno)');
} finally {
  await nav.close();
  try { await sql(`select fn_eliminar_salida((select id from salidas where customer_id=${ID_CLI} limit 1),'DIAG'); delete from customers where id=${ID_CLI};`); } catch {}
}
