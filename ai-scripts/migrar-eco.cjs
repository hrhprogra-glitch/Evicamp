// Carga (o prueba en seco) el SQL de la migración Eco -> Nego en la base siumax del VPS.
// Uso:
//   node ai-scripts/migrar-eco.cjs ../migracion-eco/carga-nego.sql dry    -> ejecuta todo y DESHACE (no deja nada)
//   node ai-scripts/migrar-eco.cjs ../migracion-eco/carga-nego.sql real   -> carga de verdad (dentro de una transacción)
//   node ai-scripts/migrar-eco.cjs ../migracion-eco/rollback-nego.sql borrar -> borra exactamente lo cargado
// La clave nueva de los 3 usuarios se genera aquí, se guarda en .env.vps y nunca se imprime.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const archivo = process.argv[2];
const modo = process.argv[3] || 'dry';
if (!archivo) { console.error('Uso: node ai-scripts/migrar-eco.cjs <archivo.sql> [dry|real|borrar]'); process.exit(1); }

const ABC = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let clave = '';
for (const b of crypto.randomBytes(14)) clave += ABC[b % ABC.length];

function guardarClaveEnEnv(clave) {
  const env = path.join(__dirname, '..', '.env.vps');
  let lineas = [];
  try { lineas = fs.readFileSync(env, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('SIUMAX_USUARIOS_CLAVE=')); } catch { /* aún no existe */ }
  lineas.push(`SIUMAX_USUARIOS_CLAVE=${clave}`);
  fs.writeFileSync(env, lineas.join('\n') + '\n');
}

(async () => {
  let sql = fs.readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
  if (modo === 'dry') {
    // En la prueba en seco, el COMMIT final pasa a ROLLBACK: se ejecuta todo y no queda nada.
    const i = sql.lastIndexOf('COMMIT;');
    if (i < 0) throw new Error('No encontré el COMMIT final para la prueba en seco.');
    sql = sql.slice(0, i) + 'ROLLBACK;' + sql.slice(i + 'COMMIT;'.length);
  }
  if (modo === 'real') guardarClaveEnEnv(clave);

  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const remoto = '/tmp/carga-nego.sql';
    await ssh.execCommand(`cat > ${remoto} && chmod 644 ${remoto}`, { stdin: sql });
    // La clave va por stdin y como variable de psql (no queda en el historial ni en el archivo).
    const r = await ssh.execCommand(
      `read -r CLAVE; runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d siumax -v clave_usuarios="$CLAVE" -f ${remoto}`,
      { stdin: (modo === 'dry' ? 'solo-prueba-en-seco' : clave) + '\n',
        onStdout: (c) => process.stdout.write(c), onStderr: (c) => process.stderr.write(c) });
    await ssh.execCommand(`rm -f ${remoto}`);
    if (r.code) throw new Error('psql terminó con error (código ' + r.code + ')');
  } finally {
    ssh.dispose();
  }
  if (modo === 'real') console.log('Carga hecha. Clave nueva de los 3 usuarios guardada en .env.vps (SIUMAX_USUARIOS_CLAVE).');
  if (modo === 'dry') console.log('Prueba en seco terminada: se ejecutó todo y se deshizo (no quedó nada).');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
