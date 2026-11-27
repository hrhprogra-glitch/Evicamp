// Solo lectura: cómo están guardados los adjuntos de compras en ecosistema.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const sql = `SELECT 'con_archivos', count(*) FROM public.compras WHERE archivos IS NOT NULL AND jsonb_array_length(archivos) > 0;
SELECT id, documento, jsonb_typeof(archivos) AS tipo, left(archivos::text, 500) AS muestra
  FROM public.compras WHERE archivos IS NOT NULL AND jsonb_array_length(archivos) > 0 ORDER BY id DESC LIMIT 5;
SELECT 'notas_con_pdf', count(*) FROM public.compras WHERE notas ILIKE '%PDF%' OR notas ILIKE '%Foto%';`;
    const r = await ssh.execCommand('runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ecosistema', { stdin: sql });
    console.log((r.stdout || '').trim());
    if (r.stderr) console.log('STDERR:', r.stderr.trim());
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
