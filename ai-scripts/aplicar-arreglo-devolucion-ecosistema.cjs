// 27/11/2026 — Arreglo puntual en ecosistema: Devuelto 3 vs historial 4 (SAL-0018).
// Respaldo → ensayo con ROLLBACK → aplicación real. No reinicia la API, no toca stock, no hace push.
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const sql = fs.readFileSync(path.join(__dirname, '..', 'servidor', 'sql', 'corregir-devoluciones-ajuste.sql'), 'utf8');
const marca = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const respaldo = `/var/lib/postgresql/respaldo-ecosistema-antes-devolucion-ajuste-${marca}.dump`;

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const ejecutar = (texto) => ssh.execCommand('runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At -d ecosistema', { stdin: texto });
  try {
    console.log('1. Respaldo:', (await ssh.execCommand(`runuser -u postgres -- pg_dump -Fc -d ecosistema -f ${respaldo} && ls -lh ${respaldo} | awk '{print $5, $9}'`)).stdout.trim());

    console.log('2. Ensayo (ROLLBACK):');
    const ensayo = await ejecutar(sql.replace('COMMIT;', 'ROLLBACK;'));
    console.log((ensayo.stdout || '').trim());
    if (ensayo.stderr && /ERROR|FATAL/i.test(ensayo.stderr)) throw new Error('Ensayo falló: ' + ensayo.stderr);

    console.log('3. Aplicación real:');
    const aplicado = await ejecutar(sql);
    console.log((aplicado.stdout || '').trim());
    if (aplicado.stderr && /ERROR|FATAL/i.test(aplicado.stderr)) throw new Error('Aplicación falló: ' + aplicado.stderr);
    console.log('LISTO. Sin stock, sin API, sin push.');
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
