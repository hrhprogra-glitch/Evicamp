// Inspección SOLO DE LECTURA de llaves foráneas y columnas de sesiones.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    for (const db of ['siumax', 'ecosistema']) {
      console.log(`\n===== ${db} =====`);
      const fks = await ssh.execCommand(
        `sudo -u postgres psql -d ${db} -tAc "SELECT conrelid::regclass::text || ' -> ' || confrelid::regclass::text FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY 1;"`
      );
      console.log('Foreign keys:\n' + fks.stdout.trim());
      const cols = await ssh.execCommand(
        `sudo -u postgres psql -d ${db} -tAc "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='sesiones' ORDER BY ordinal_position;"`
      );
      console.log('Columnas de sesiones: ' + cols.stdout.trim().split('\n').join(', '));
    }
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
