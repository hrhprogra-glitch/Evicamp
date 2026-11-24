// SOLO LECTURA: compara las devoluciones de Salidas en ecosistema ahora contra
// los respaldos tomados antes de la pasada 228. Crea una base temporal, la borra y
// no toca producción. Uso: node ai-scripts/pruebas/diagnostico-devoluciones-ecosistema.cjs
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('../vps.cjs');

const CONTEOS = `
  SELECT 'columnas: ' || string_agg(column_name, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='salida_devoluciones';
  SELECT 'salidas: ' || count(*) FROM public.salidas;
  SELECT 'items: ' || count(*) FROM public.salida_items;
  SELECT 'devoluciones: ' || count(*) FROM public.salida_devoluciones;
  SELECT 'devoluciones con trabajador: ' || count(*) FROM public.salida_devoluciones WHERE trabajador_id IS NOT NULL;
  SELECT 'total devuelto: ' || coalesce(sum(cantidad),0)::text FROM public.salida_devoluciones;
  SELECT 'salidas con devoluciones: ' || count(DISTINCT salida_id) FROM public.salida_devoluciones;
`;

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const ej = async (cmd, opciones) => {
    const r = await s.execCommand(cmd, opciones);
    return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), code: r.code };
  };
  const psql = (db, q) => ej(`runuser -u postgres -- psql -At -d ${db}`, { stdin: q });
  try {
    console.log('RESPALDOS DISPONIBLES:');
    console.log((await ej('ls -lh /var/lib/postgresql/respaldo-ecosistema-*.dump')).out);

    const ahora = await psql('ecosistema', CONTEOS);
    console.log('\nAHORA (producción):');
    console.log(ahora.out);
    if (/ERROR|FATAL/.test(ahora.err)) console.log('STDERR:', ahora.err);

    const dumps = [
      '/var/lib/postgresql/respaldo-ecosistema-antes-salidas-228-2026-11-24T19-11-44-625Z.dump',
      '/var/lib/postgresql/respaldo-ecosistema-antes-salidas-228-2026-11-24T19-12-22-411Z.dump',
    ];
    for (let i = 0; i < dumps.length; i++) {
      const db = `eco_diag_dev_${Date.now()}_${i}`;
      const r = await ej(`runuser -u postgres -- createdb ${db} && runuser -u postgres -- pg_restore -d ${db} ${dumps[i]} 2>&1 | tail -4; echo FIN=$?`);
      const permitidas = ['batches_store_id_fkey', 'inventory_movements_store_id_fkey', 'sales_store_id_fkey'];
      const mal = r.out.split('\n').filter((l) => /ERROR:|FATAL:/.test(l) && !permitidas.some((p) => l.includes(p)));
      if (mal.length) { console.log(`\nRESALPALDO ${i}: error inesperado`, mal.join(' | ')); }
      else {
        const q = await psql(db, CONTEOS.replace(/trabajador_id IS NOT NULL/g, 'true'));
        console.log(`\nRESPALDO ${i} (${dumps[i].split('/').pop()}):`);
        console.log(q.out);
      }
      await ej(`runuser -u postgres -- dropdb --if-exists ${db}`);
    }

    const detalle = await psql('ecosistema', `
      SELECT 'ejemplo: ' || d.salida_id || ' | ' || coalesce(d.cantidad::text,'?') || ' | ' || coalesce(d.motivo,'') || ' | ' || coalesce(d.usuario,'')
        FROM public.salida_devoluciones d ORDER BY d.id DESC LIMIT 5;
    `);
    console.log('\nÚLTIMAS 5 DEVOLUCIONES:');
    console.log(detalle.out);
  } finally {
    s.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
