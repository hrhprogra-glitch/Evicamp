// Arma el instalador de la app de escritorio (SiuMax-Setup.exe) y lo publica.
// Uso:
//   node ai-scripts/build-escritorio.cjs generico                  -> instalador para todos (pregunta el link al abrirse)
//   node ai-scripts/build-escritorio.cjs generico --nueva-version  -> ACTUALIZACIÓN: sube la versión y todas las
//                                                                     apps instaladas se actualizan solas
//   node ai-scripts/build-escritorio.cjs evicamp                   -> instalador fijo para evicamp.duckdns.org
//   node ai-scripts/build-escritorio.cjs siuhub --local            -> solo arma (no sube), para probar
//
// El genérico publica además el canal de actualizaciones (latest.yml) en
// https://siumax.duckdns.org/actualizaciones/, que revisan todas las apps instaladas (también las de
// instaladores fijos: conservan su link al actualizarse).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { destino: buscarDestino } = require('./destinos.cjs');

const { normalizar } = require('./destinos.cjs');

const nombre = process.argv[2];
const soloLocal = process.argv.includes('--local');
const nuevaVersion = process.argv.includes('--nueva-version');
const destino = nombre && buscarDestino(nombre);
if (!destino || (!destino.url && !destino.generico)) {
  console.error('Uso: node ai-scripts/build-escritorio.cjs <generico|evicamp|ecosistema|siuhub|link-cliente> [--nueva-version] [--local]');
  process.exit(1);
}

const esEcosistema = normalizar(nombre) === 'ecosistema';
const nombreProducto = esEcosistema ? 'ECO SISTEMAS URH' : 'SiuMax';
const nombreInstalador = esEcosistema ? 'Ecosistema-Setup.exe' : 'SiuMax-Setup.exe';
const iconoBase = path.join(__dirname, '..', 'escritorio', 'icono.png');
const iconoEcosistema = path.join(__dirname, '..', 'escritorio', 'icono-ecosistema-256.png');

const carpeta = path.join(__dirname, '..', 'escritorio');
const salida = path.join(carpeta, 'salida');
const instalador = path.join(salida, nombreInstalador);
const CANAL_ACTUALIZACIONES = '/var/www/siuhub/html/actualizaciones';

// 0. Nueva versión: las apps solo se actualizan si ven un número MAYOR (1.1.0 -> 1.1.1)
const archivoPaquete = path.join(carpeta, 'package.json');
const paqueteOriginal = fs.readFileSync(archivoPaquete, 'utf8');
const paquete = JSON.parse(paqueteOriginal);
const iconoOriginal = fs.existsSync(iconoBase) ? fs.readFileSync(iconoBase) : null;
if (nuevaVersion) {
  const [ma, mi, pa] = paquete.version.split('.').map(Number);
  paquete.version = `${ma}.${mi}.${pa + 1}`;
}
if (esEcosistema) {
  paquete.productName = nombreProducto;
  paquete.description = `${nombreProducto} para escritorio.`;
  paquete.build = paquete.build || {};
  paquete.build.productName = nombreProducto;
  paquete.build.nsis = { ...(paquete.build.nsis || {}), shortcutName: nombreProducto, artifactName: nombreInstalador };
}
fs.writeFileSync(archivoPaquete, JSON.stringify(paquete, null, 2) + '\n');
if (esEcosistema && fs.existsSync(iconoEcosistema) && iconoOriginal) {
  fs.copyFileSync(iconoEcosistema, iconoBase);
}
console.log(`Versión del programa: ${paquete.version}`);

// 1. A qué sistema se conecta este instalador
fs.writeFileSync(
  path.join(carpeta, 'destino.json'),
  JSON.stringify({ url: destino.url, nombre: destino.nombre }, null, 2)
);
console.log(destino.generico ? 'Instalador genérico (pregunta el link al abrirse)' : `Instalador para ${destino.nombre} -> ${destino.url}`);

// 2. Armar el .exe
try {
  fs.rmSync(salida, { recursive: true, force: true });
  execSync('npm run build', { cwd: carpeta, stdio: 'inherit' });
} finally {
  fs.writeFileSync(archivoPaquete, paqueteOriginal);
  if (esEcosistema && iconoOriginal) fs.writeFileSync(iconoBase, iconoOriginal);
}
if (!fs.existsSync(instalador)) {
  console.error(`No se generó el instalador: ${instalador}`);
  process.exit(1);
}
const mb = (fs.statSync(instalador).size / 1024 / 1024).toFixed(1);
console.log(`Instalador listo: ${instalador} (${mb} MB)`);

if (soloLocal) process.exit(0);

// 3. Publicar
(async () => {
  const { NodeSSH } = require('node-ssh');
  const { conexionVps } = require('./vps.cjs');
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const remoto = `${destino.remoteDir}/descargas`;
    await ssh.execCommand(`mkdir -p ${remoto}`);
    console.log('Subiendo instalador...');
    await ssh.putFile(instalador, `${remoto}/${nombreInstalador}`);
    await ssh.execCommand(`chown -R www-data:www-data ${remoto}`);
    console.log(destino.generico ? `Publicado: ${remoto}/${nombreInstalador}` : `Publicado: ${destino.url}/descargas/${nombreInstalador}`);

    if (destino.generico) {
      // Los clientes creados desde el panel (y el sistema de pruebas) descargan siempre el genérico más reciente
      await ssh.execCommand(`for d in /var/www/clientes/*/descargas /var/www/siuhub/html/descargas; do [ -d "$d" ] && cp ${remoto}/${nombreInstalador} "$d/"; done`);

      // Canal de actualizaciones: primero el instalador y su mapa, al final latest.yml
      // (así ninguna app ve la versión nueva antes de que el archivo esté completo)
      console.log('Publicando la actualización automática...');
      await ssh.execCommand(`mkdir -p ${CANAL_ACTUALIZACIONES}`);
      await ssh.putFile(instalador, `${CANAL_ACTUALIZACIONES}/${nombreInstalador}`);
      await ssh.putFile(`${instalador}.blockmap`, `${CANAL_ACTUALIZACIONES}/${nombreInstalador}.blockmap`);
      await ssh.putFile(path.join(salida, 'latest.yml'), `${CANAL_ACTUALIZACIONES}/latest.yml`);
      await ssh.execCommand(`chown -R www-data:www-data ${CANAL_ACTUALIZACIONES}`);
      console.log(`Actualización ${paquete.version} publicada: las apps instaladas la descargarán solas.`);
    }
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('Error al subir:', e.message); process.exit(1); });
