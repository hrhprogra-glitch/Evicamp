// 25/11/2026 — Nego: dejar el grupo de ejemplo como FUS-0001 → SAL-1547, SAL-1548 (ids 398, 399).
// Solo en la base siumax, con respaldo previo y lock_timeout. No toca salidas reales ni stock.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  try {
    const destino = `/root/backups/siumax-antes-restaurar-ejemplo-${fecha}.dump`;
    const b = await ssh.execCommand(`sudo -u postgres pg_dump -Fc -d siumax > ${destino} && ls -lh ${destino}`);
    if (b.code !== 0) throw new Error(`Fallo el respaldo: ${b.stderr || b.stdout}`);
    console.log('RESPALDO:', b.stdout.trim());

    const sql = `
      BEGIN;
      SET LOCAL lock_timeout = '5s';
      DELETE FROM public.salida_fusion_items
       WHERE fusion_id IN (SELECT id FROM public.salida_fusiones WHERE codigo <> 'FUS-0001');
      DELETE FROM public.salida_fusiones WHERE codigo <> 'FUS-0001';
      INSERT INTO public.salida_fusiones (id, codigo, usuario)
      VALUES (1, 'FUS-0001', 'Sistema')
      ON CONFLICT (codigo) DO UPDATE SET updated_at = now();
      DELETE FROM public.salida_fusion_items
       WHERE fusion_id = 1 AND salida_id NOT IN (398, 399);
      INSERT INTO public.salida_fusion_items (fusion_id, salida_id)
      SELECT 1, x FROM unnest(ARRAY[398, 399]::bigint[]) AS x
      ON CONFLICT (fusion_id, salida_id) DO NOTHING;
      SELECT setval('public.seq_fusiones_codigo', 1, true);
      SELECT setval(pg_get_serial_sequence('public.salida_fusiones', 'id'),
                    (SELECT max(id) FROM public.salida_fusiones), true);
      COMMIT;
      SELECT f.id, f.codigo, array_agg(i.salida_id ORDER BY i.salida_id) AS salidas
        FROM public.salida_fusiones f
        JOIN public.salida_fusion_items i ON i.fusion_id = f.id
       GROUP BY f.id, f.codigo ORDER BY f.id;
    `;
    const r = await ssh.execCommand(`echo '${Buffer.from(sql).toString('base64')}' | base64 -d | sudo -u postgres psql -tA -v ON_ERROR_STOP=1 -d siumax`);
    if (r.code !== 0) throw new Error(r.stderr || r.stdout);
    console.log('ESTADO FINAL:');
    console.log(r.stdout.trim());
  } finally { ssh.dispose(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
