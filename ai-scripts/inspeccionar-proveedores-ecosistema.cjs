// 27/11/2026 — Solo lectura: ¿por qué no aparece ningún proveedor en ecosistema?
// No escribe en la base, no reinicia la API y no muestra credenciales.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const sql = `
\\echo '== ecosistema: columnas =='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='providers' ORDER BY ordinal_position;
\\echo '== ecosistema: filas en providers =='
SELECT count(*) AS total FROM providers;
\\echo '== ecosistema: últimas filas =='
SELECT * FROM providers ORDER BY created_at DESC NULLS LAST LIMIT 5;
\\echo '== ecosistema: RLS y políticas =='
SELECT relrowsecurity AS rls, relforcerowsecurity AS rls_forzado FROM pg_class WHERE relname='providers';
SELECT policyname, cmd, roles::text, qual, with_check FROM pg_policies WHERE tablename='providers';
\\echo '== ecosistema: tablas relacionadas =='
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%provider%' OR table_name ILIKE '%compra%') ORDER BY 1;
\\echo '== ecosistema: columnas que apuntan a proveedor =='
SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name ILIKE '%provider%' ORDER BY 1,2;
\\echo '== ecosistema: columnas de compras =='
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='compras' ORDER BY ordinal_position;
\\echo '== ecosistema: compras con proveedor =='
SELECT count(*) AS compras, count(provider_id) AS con_provider, count(DISTINCT provider_id) AS proveedores_distintos FROM compras;
SELECT provider_id, count(*) AS n, max(proveedor) AS texto FROM compras WHERE provider_id IS NOT NULL GROUP BY 1 ORDER BY 2 DESC;
\\echo '== ecosistema: lotes con proveedor =='
SELECT count(*) AS lotes, count(provider_id) AS con_provider FROM batches;
SELECT provider_id, count(*) FROM batches WHERE provider_id IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
\\echo '== ecosistema: el proveedor de lotes que no está en compras =='
SELECT column_name FROM information_schema.columns WHERE table_name='batches' ORDER BY ordinal_position;
SELECT * FROM batches WHERE provider_id='fa173ec6-65df-4ec8-a64f-e529c6e04577' LIMIT 2;
\\echo '== comparación: otras bases =='
`;

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const ejecutar = (db, texto) => ssh.execCommand(
      `runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ${db}`, { stdin: texto });
    const e = await ejecutar('ecosistema', sql);
    console.log(e.stdout.trim());
    if (e.stderr) console.log('STDERR ecosistema:', e.stderr.trim());
    for (const db of ['siumax', 'postgres', 'evidiary']) {
      const r = await ejecutar(db, `SELECT '${db}', count(*) FROM providers;`);
      console.log((r.stdout || '').trim(), (r.stderr || '').trim());
    }
    for (const db of ['siumax', 'postgres']) {
      const r = await ejecutar(db, `SELECT id, razon_social, nombre_comercial, ruc, estado FROM providers ORDER BY created_at DESC LIMIT 20;`);
      console.log(`== ${db}: proveedores existentes ==`);
      console.log((r.stdout || '').trim());
    }
  } finally {
    ssh.dispose();
  }
})().catch((err) => { console.error('FALLA:', err.message); process.exit(1); });
