// Genera una clave nueva para admin@siumax.com (sistema de pruebas), la guarda en .env.vps como
// SIUMAX_ADMIN_CLAVE y la aplica en el servidor. No la imprime.
// Uso: node ai-scripts/clave-pruebas.cjs
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const ABC = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let clave = '';
for (const b of crypto.randomBytes(14)) clave += ABC[b % ABC.length];
if (!/^[A-Za-z0-9]{14}$/.test(clave)) throw new Error('clave mal generada');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    // La clave va como variable de psql (nunca pegada en el SQL) y por stdin (no queda en el historial)
    const r = await ssh.execCommand(
      `read -r CLAVE; printf '%s\\n' "UPDATE empleados SET password_hash = crypt(:'clave', gen_salt('bf')) WHERE lower(email) = 'admin@siumax.com';" "DELETE FROM sesiones s USING empleados e WHERE e.id = s.empleado_id AND lower(e.email) = 'admin@siumax.com';" | runuser -u postgres -- psql -At -d siumax -v clave="$CLAVE"`,
      { stdin: clave + '\n' });
    if (r.code || !/UPDATE 1/.test(r.stdout)) throw new Error('no se pudo cambiar en el servidor: ' + (r.stderr || r.stdout));
  } finally {
    ssh.dispose();
  }
  const archivo = path.join(__dirname, '..', '.env.vps');
  const lineas = fs.readFileSync(archivo, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('SIUMAX_ADMIN_CLAVE='));
  lineas.push(`SIUMAX_ADMIN_CLAVE=${clave}`);
  fs.writeFileSync(archivo, lineas.join('\n') + '\n');
  console.log(`Clave nueva aplicada y guardada en .env.vps (${clave.length} caracteres).`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
