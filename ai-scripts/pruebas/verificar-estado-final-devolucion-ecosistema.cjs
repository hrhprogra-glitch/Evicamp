// 27/11/2026 — Comprobación SOLO LECTURA del estado final del arreglo en ecosistema.
// No escribe, no reinicia la API y no publica nada.
// Uso: node ai-scripts/pruebas/verificar-estado-final-devolucion-ecosistema.cjs
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const SQL = `
\\set ON_ERROR_STOP on
SET lock_timeout = '5s';
SELECT 'CASO SAL-0018: cantidad=' || i.cantidad || ' devuelto=' || i.cantidad_devuelta ||
       ' historial=' || coalesce(d.total, 0)
FROM public.salida_items i
LEFT JOIN (SELECT salida_item_id, sum(cantidad) total FROM public.salida_devoluciones GROUP BY 1) d
  ON d.salida_item_id = i.id
WHERE i.id = 2003006;
SELECT 'DESINCRONIZADOS: ' || count(*)
FROM public.salida_items i
LEFT JOIN (SELECT salida_item_id, sum(cantidad) total FROM public.salida_devoluciones GROUP BY 1) d
  ON d.salida_item_id = i.id
WHERE i.cantidad_devuelta <> coalesce(d.total, 0);
`;

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const r = await ssh.execCommand('runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ecosistema', { stdin: SQL });
    const salida = (r.stdout || '').trim();
    console.log(salida);
    if (r.stderr) console.error((r.stderr || '').trim());
    if (/ERROR|FATAL/i.test(r.stderr || '')) throw new Error('La consulta falló');
    if (!/CASO SAL-0018: cantidad=5\.000 devuelto=4\.000 historial=4\.000/.test(salida)) {
      throw new Error('SAL-0018 no quedó como se esperaba');
    }
    if (!/DESINCRONIZADOS: 0/.test(salida)) throw new Error('Hay items desincronizados');
    console.log('ESTADO FINAL: TODO BIEN');
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
