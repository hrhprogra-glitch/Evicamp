// Aplicar migración de Fase 3 a la base de pruebas SIUMAX:
// Columnas en products: marca, modelo, medida, laboratorio, ubicacion
// Uso: node ai-scripts/pruebas/aplicar-fase3-siumax.cjs
const path = require('path');
const proyecto = 'd:/Programación/siumax/comercio';
const { NodeSSH } = require(path.join(proyecto, 'node_modules/node-ssh'));
const { conexionVps } = require(path.join(proyecto, 'ai-scripts/vps.cjs'));

(async () => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  try {
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldo = `/var/lib/postgresql/respaldo-siumax-antes-fase3-${marca}.dump`;
    console.log('1. Creando respaldo en siumax...');
    let r = await s.execCommand(`runuser -u postgres -- pg_dump -Fc -d siumax -f ${respaldo} && ls -lh ${respaldo}`);
    if (r.code !== 0) throw new Error('Respaldo falló: ' + r.stderr);
    console.log('✔ Respaldo completado:', r.stdout.trim());

    console.log('2. Aplicando columnas de Fase 3 en siumax...');
    const sql = `
      SET lock_timeout = '5s';
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS marca text;
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS modelo text;
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS medida text;
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS laboratorio text;
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ubicacion text;
      CREATE INDEX IF NOT EXISTS idx_products_marca ON public.products (marca);
      CREATE INDEX IF NOT EXISTS idx_products_modelo ON public.products (modelo);
      CREATE INDEX IF NOT EXISTS idx_products_medida ON public.products (medida);
      NOTIFY pgrst, 'reload schema';
    `;
    r = await s.execCommand(`runuser -u postgres -- psql -d siumax -c "${sql.replace(/\n/g, ' ')}"`);
    console.log('RESULTADO SQL:', r.stdout.trim() || r.stderr.trim());

    console.log('3. Verificando columnas en siumax...');
    r = await s.execCommand(`runuser -u postgres -- psql -At -d siumax -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='products' AND column_name IN ('marca','modelo','medida','laboratorio','ubicacion')"`);
    console.log('COLUMNAS CONFIRMADAS:\n' + r.stdout.trim());
    console.log('✔ Migración de Fase 3 completada con éxito en siumax.');
  } finally {
    s.dispose();
  }
})().catch((e) => {
  console.error('FALLA:', e.message);
  process.exit(1);
});
