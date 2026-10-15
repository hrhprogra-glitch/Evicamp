// Arma el instalador de la app de escritorio (SiuHub-Setup.exe) para un cliente y lo publica
// en su sistema, donde aparece el botón "App para PC".
// Uso:
//   node ai-scripts/build-escritorio.cjs siuhub            -> arma y sube a siuhub.duckdns.org
//   node ai-scripts/build-escritorio.cjs evicamp           -> arma y sube a evicamp.duckdns.org
//   node ai-scripts/build-escritorio.cjs siuhub --local    -> solo arma (no sube), para probar
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const DESTINOS = require('./destinos.cjs');

const nombre = process.argv[2];
const soloLocal = process.argv.includes('--local');
const destino = DESTINOS[nombre];
if (!destino) {
  console.error(`Uso: node ai-scripts/build-escritorio.cjs <destino> [--local]. Opciones: ${Object.keys(DESTINOS).join(', ')}`);
  process.exit(1);
}

const carpeta = path.join(__dirname, '..', 'escritorio');
const instalador = path.join(carpeta, 'salida', 'SiuHub-Setup.exe');

// 1. A qué sistema se conecta este instalador
fs.writeFileSync(
  path.join(carpeta, 'destino.json'),
  JSON.stringify({ url: destino.url, nombre: destino.nombre }, null, 2)
);
console.log(`Instalador para ${destino.nombre} -> ${destino.url}`);

// 2. Armar el .exe
fs.rmSync(path.join(carpeta, 'salida'), { recursive: true, force: true });
execSync('npm run build', { cwd: carpeta, stdio: 'inherit' });
if (!fs.existsSync(instalador)) {
  console.error('No se generó el instalador.');
  process.exit(1);
}
const mb = (fs.statSync(instalador).size / 1024 / 1024).toFixed(1);
console.log(`Instalador listo: ${instalador} (${mb} MB)`);

if (soloLocal) process.exit(0);

// 3. Publicarlo en el sistema del cliente: /descargas/SiuHub-Setup.exe
(async () => {
  const { NodeSSH } = require('node-ssh');
  const { conexionVps } = require('./vps.cjs');
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const remoto = `${destino.remoteDir}/descargas`;
  await ssh.execCommand(`mkdir -p ${remoto}`);
  console.log('Subiendo instalador...');
  await ssh.putFile(instalador, `${remoto}/SiuHub-Setup.exe`);
  await ssh.execCommand(`chown -R www-data:www-data ${remoto}`);
  ssh.dispose();
  console.log(`Publicado: ${destino.url}/descargas/SiuHub-Setup.exe`);
})().catch((e) => { console.error('Error al subir:', e.message); process.exit(1); });
