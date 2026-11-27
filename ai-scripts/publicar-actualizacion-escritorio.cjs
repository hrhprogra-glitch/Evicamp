const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const carpeta = path.join(__dirname, '..', 'escritorio');
const salida = path.join(carpeta, 'salida');
const instalador = path.join(salida, 'SiuMax-Setup.exe');
const blockmap = path.join(salida, 'SiuMax-Setup.exe.blockmap');
const latest = path.join(salida, 'latest.yml');
const CANAL = '/var/www/siuhub/html/actualizaciones';
const REMOTO = '/var/www/siuhub-app/descargas';

for (const f of [instalador, blockmap, latest]) {
  if (!fs.existsSync(f)) { console.error('Falta:', f); process.exit(1); }
}

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    await ssh.execCommand(`mkdir -p ${REMOTO} ${CANAL}`);
    console.log('Subiendo instalador genérico...');
    await ssh.putFile(instalador, `${REMOTO}/SiuMax-Setup.exe`);
    await ssh.execCommand(`chown -R www-data:www-data ${REMOTO}`);
    console.log('Copiando a descargas de clientes y pruebas...');
    await ssh.execCommand(`for d in /var/www/clientes/*/descargas /var/www/siuhub/html/descargas; do [ -d "$d" ] && cp ${REMOTO}/SiuMax-Setup.exe "$d/"; done`);
    console.log('Publicando canal de actualizaciones...');
    await ssh.putFile(instalador, `${CANAL}/SiuMax-Setup.exe`);
    await ssh.putFile(blockmap, `${CANAL}/SiuMax-Setup.exe.blockmap`);
    await ssh.putFile(latest, `${CANAL}/latest.yml`);
    await ssh.execCommand(`chown -R www-data:www-data ${CANAL}`);
    const ver = JSON.parse(fs.readFileSync(path.join(carpeta, 'package.json'), 'utf8')).version;
    console.log('Actualización publicada:', ver);
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
