// SOLO LECTURA: llaves foráneas de salida_devoluciones en ecosistema.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');
(async () => {
  const s = new NodeSSH(); await s.connect(conexionVps);
  const q = `
    SELECT 'FK ' || conname || ': ' || pg_get_constraintdef(oid) FROM pg_constraint
      WHERE conrelid='public.salida_devoluciones'::regclass AND contype='f' ORDER BY conname;
    SELECT 'trabajadores FKs hacia salida_devoluciones: ' || count(*) FROM pg_constraint
      WHERE confrelid='public.salida_devoluciones'::regclass AND contype='f';
    SELECT 'relaciones PostgREST: ' || string_agg(proname, ',') FROM pg_proc WHERE proname LIKE 'fn_%' AND pronamespace='public'::regnamespace AND proname IN ('fn_registrar_devolucion','fn_registrar_devoluciones_lote');
  `;
  const r = await s.execCommand('runuser -u postgres -- psql -At -d ecosistema', { stdin: q });
  console.log((r.stdout || r.stderr).trim()); s.dispose();
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
