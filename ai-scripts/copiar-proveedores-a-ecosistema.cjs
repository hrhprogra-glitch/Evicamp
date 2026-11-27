// 27/11/2026 — ecosistema tenía 0 proveedores y 37 compras apuntaban a los 16 IDs de Nego.
// Respaldo → ensayo con ROLLBACK → aplicación con lock_timeout. No toca compras, lotes, stock ni la API.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const marca = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const respaldo = `/var/lib/postgresql/respaldo-ecosistema-antes-proveedores-${marca}.dump`;

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const psql = (db, texto) => ssh.execCommand(
    `runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ${db}`, { stdin: texto });
  try {
    const antes = await psql('ecosistema', `SELECT 'proveedores', count(*) FROM providers;
      SELECT 'compras', count(*) FROM compras;
      SELECT 'lotes', count(*) FROM batches;`);
    console.log('0. Antes:', (antes.stdout || '').trim().replace(/\n/g, ' | '));
    if (/^proveedores\|0$/m.test((antes.stdout || '').trim()) === false) {
      throw new Error('La tabla providers no está vacía; no se copia nada para evitar duplicados.');
    }

    console.log('1. Respaldo:', (await ssh.execCommand(
      `runuser -u postgres -- pg_dump -Fc -d ecosistema -f ${respaldo} && ls -lh ${respaldo} | awk '{print $5, $9}'`)).stdout.trim());

    const dump = await ssh.execCommand(
      'runuser -u postgres -- pg_dump --data-only --table=providers --no-owner --no-privileges -d siumax');
    if (dump.code !== 0 || /ERROR|FATAL/i.test(dump.stderr || '')) {
      throw new Error('No se pudo leer providers de siumax: ' + (dump.stderr || dump.stdout));
    }
    const filas = (dump.stdout.match(/^([0-9a-f-]{36})\t/gm) || []).length;
    console.log('2. Proveedores de Nego a copiar:', filas);
    if (filas !== 16) throw new Error(`Se esperaban 16 proveedores, hay ${filas}. No se aplica nada.`);

    // pg_dump deja search_path vacío: las comprobaciones van siempre con public. delante.
    const sql = `SET lock_timeout = '5s';\nBEGIN;\n${dump.stdout}\nSET search_path = public;\n`;
    const ensayo = await psql('ecosistema', sql + 'ROLLBACK;');
    console.log('3. Ensayo (ROLLBACK):', (ensayo.stdout || '').trim().replace(/\n/g, ' | '));
    if (ensayo.code !== 0 || /ERROR|FATAL/i.test(ensayo.stderr || '')) {
      throw new Error('Ensayo falló: ' + (ensayo.stderr || ensayo.stdout));
    }

    const aplicado = await psql('ecosistema', sql + `COMMIT;
      SELECT 'proveedores', count(*) FROM public.providers;
      SELECT 'compras', count(*) FROM public.compras;
      SELECT 'lotes', count(*) FROM public.batches;
      SELECT 'compras_sin_proveedor', count(*) FROM public.compras c
        WHERE c.provider_id IS NOT NULL AND NOT EXISTS
        (SELECT 1 FROM public.providers p WHERE p.id::text = c.provider_id);`);
    console.log('4. Después:', (aplicado.stdout || '').trim().replace(/\n/g, ' | '));
    if (aplicado.code !== 0 || /ERROR|FATAL/i.test(aplicado.stderr || '')) {
      throw new Error('Aplicación falló: ' + (aplicado.stderr || aplicado.stdout));
    }
    console.log('LISTO. Sin compras, lotes, stock ni API tocados. Sin push.');
  } finally {
    ssh.dispose();
  }
})().catch((err) => { console.error('FALLA:', err.message); process.exit(1); });
