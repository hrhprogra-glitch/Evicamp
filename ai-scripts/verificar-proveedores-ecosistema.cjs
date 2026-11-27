// Solo lectura: comprobar proveedores de ecosistema después de la copia.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const sql = `SELECT 'proveedores', count(*) FROM public.providers;
SELECT 'activos', count(*) FROM public.providers WHERE upper(estado)='ACTIVO';
SELECT 'compras', count(*) FROM public.compras;
SELECT 'lotes', count(*) FROM public.batches;
SELECT 'compras_sin_proveedor', count(*) FROM public.compras c
 WHERE c.provider_id IS NOT NULL AND NOT EXISTS
 (SELECT 1 FROM public.providers p WHERE p.id::text = c.provider_id);
SELECT 'ids_repetidos', count(*) FROM (SELECT id FROM public.providers GROUP BY 1 HAVING count(*)>1) x;
SELECT id, razon_social, ruc, estado FROM public.providers ORDER BY razon_social LIMIT 20;`;
    const r = await ssh.execCommand('runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ecosistema', { stdin: sql });
    console.log((r.stdout || '').trim());
    if (r.stderr) console.log('STDERR:', r.stderr.trim());
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
