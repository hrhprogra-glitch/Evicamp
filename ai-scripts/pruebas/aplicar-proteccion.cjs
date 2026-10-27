// Aplica SOLO la regla fn_reduce_stock_from_sales (con la protección contra doble descuento) y su índice,
// tomados de servidor/sql/seguridad-sesion.sql. No reinicia la API ni toca nada más: no corta ventas.
// Uso: node aplicar-proteccion.cjs <carpeta del proyecto> <base>
const fs = require('fs');
const path = require('path');
const [proyecto, base] = process.argv.slice(2);
const { NodeSSH } = require(path.join(proyecto, 'node_modules', 'node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts', 'vps.cjs'));
if (!/^[a-z_]+$/.test(base)) throw new Error('base inválida');

const texto = fs.readFileSync(path.join(proyecto, 'servidor', 'sql', 'seguridad-sesion.sql'), 'utf8');
const ini = texto.indexOf('CREATE OR REPLACE FUNCTION public.fn_reduce_stock_from_sales()');
const fin = texto.indexOf('$$;', texto.indexOf('RETURN NEW;\nEND;', ini)) + 3;
if (ini < 0 || fin <= ini) throw new Error('no se encontró la regla en seguridad-sesion.sql');
const funcion = texto.slice(ini, fin);

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const psql = (sql) => ssh.execCommand(`runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d ${base}`, { stdin: sql });
  try {
    const md5 = async () => (await psql("SELECT md5(prosrc) FROM pg_proc WHERE proname = 'fn_reduce_stock_from_sales';")).stdout.split('\n')[2]?.trim();
    console.log('regla antes:', await md5());
    // 1) Índice sin bloquear las ventas (CONCURRENTLY no puede ir dentro de una transacción)
    let r = await psql('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimientos_producto_tipo ON public.inventory_movements (product_id, operation_type);');
    if (r.code !== 0) throw new Error(r.stderr);
    console.log('índice:', r.stdout.trim(), r.stderr.trim());
    // 2) La regla (reemplazo instantáneo)
    r = await psql(funcion + '\n');
    if (r.code !== 0) throw new Error(r.stderr);
    console.log('regla:', r.stdout.trim());
    console.log('regla después:', await md5());
    const t = await psql("SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'tr_sale_details_reduce';");
    console.log(t.stdout.trim());
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
