const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');
(async () => {
  const s = new NodeSSH(); await s.connect(conexionVps);
  const q = `
    SELECT s.id || ' | ' || s.codigo || ' | ' || count(d.id) FROM public.salidas s JOIN public.salida_devoluciones d ON d.salida_id=s.id GROUP BY s.id,s.codigo ORDER BY count(d.id) DESC LIMIT 8;
    SELECT 'salida 1000382: ' || coalesce((SELECT codigo FROM public.salidas WHERE id=1000382),'NO');
  `;
  const r = await s.execCommand('runuser -u postgres -- psql -At -d ecosistema', { stdin: q });
  console.log(r.stdout.trim()); s.dispose();
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
