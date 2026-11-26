// Publicación puntual (26/11/2026): sube SOLO el dist ya compilado con el WIP del dueño
// + los arreglos de dirección/continuar salida. No compila, no toca SQL, no reinicia la API.
// Uso: node ai-scripts/publicar-bundle-combinado.cjs <ruta\a\dist>
const path = require('path');
const fs = require('fs');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');
const { SITIOS } = require('./destinos.cjs');

const localDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));
if (!fs.existsSync(path.join(localDir, 'index.html'))) {
  console.error(`No hay index.html en ${localDir}`);
  process.exit(1);
}
const html = fs.readFileSync(path.join(localDir, 'index.html'), 'utf8');
const hashes = [...new Set(html.match(/index-[A-Za-z0-9_-]+\.(?:js|css)/g) || [])];
console.log('Bundle local:', hashes.join(' / '));

const nombres = ['siumax', 'ecosistema', 'evicamp'];

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    for (const nombre of nombres) {
      const { remoteDir } = SITIOS[nombre];
      await ssh.execCommand(`mkdir -p ${remoteDir}`);
      let ok = 0;
      const fallidos = [];
      await ssh.putDirectory(localDir, remoteDir, {
        recursive: true,
        concurrency: 10,
        tick: (local, _remoto, error) => (error ? fallidos.push(local) : ok++),
      });
      await ssh.execCommand(`chown -R www-data:www-data ${remoteDir}/`);
      console.log(`${nombre}: ${ok} archivos subidos${fallidos.length ? `, FALLARON ${fallidos.length}: ${fallidos.join(', ')}` : ''}`);
      if (fallidos.length) process.exitCode = 1;
    }
    await ssh.execCommand('systemctl reload nginx');
    console.log('nginx recargado. Publicación terminada.');
  } finally {
    ssh.dispose();
  }
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
