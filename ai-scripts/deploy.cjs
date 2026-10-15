// Compila el sistema UNA vez y lo publica.
// Uso:
//   node ai-scripts/deploy.cjs siuhub      -> solo SiuHub (para probar)
//   node ai-scripts/deploy.cjs evicamp     -> solo Evicamp
//   node ai-scripts/deploy.cjs clientes    -> todos los clientes nuevos (*.siuhub.duckdns.org)
//   node ai-scripts/deploy.cjs todos       -> Evicamp + SiuHub + clientes
//   (sin argumento = evicamp, como antes)
const { NodeSSH } = require('node-ssh');
const path = require('path');
const { execSync } = require('child_process');
const { conexionVps } = require('./vps.cjs');
const { SITIOS } = require('./destinos.cjs');

const pedido = process.argv[2] || 'evicamp';
const nombres = pedido === 'todos' ? Object.keys(SITIOS) : [pedido];
for (const n of nombres) {
  if (!SITIOS[n]) {
    console.error(`Destino desconocido: ${n}. Opciones: ${Object.keys(SITIOS).join(', ')}, todos`);
    process.exit(1);
  }
}

async function deploy() {
  console.log('Compilando...');
  execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    for (const n of nombres) {
      const { localDir, remoteDir } = SITIOS[n];
      await ssh.execCommand(`mkdir -p ${remoteDir}`);
      let ok = 0; const fallidos = [];
      await ssh.putDirectory(localDir, remoteDir, {
        recursive: true,
        concurrency: 10,
        tick: (local, _remoto, error) => (error ? fallidos.push(local) : ok++),
      });
      await ssh.execCommand(`chown -R www-data:www-data ${remoteDir}/`);
      console.log(`${n}: ${ok} archivos subidos${fallidos.length ? `, FALLARON ${fallidos.length}: ${fallidos.join(', ')}` : ''}`);
      if (fallidos.length) process.exitCode = 1;
    }
    await ssh.execCommand('systemctl reload nginx');
    console.log('Deploy completed successfully!');
  } finally {
    ssh.dispose();
  }
}

deploy().catch((err) => { console.error('Deploy error:', err); process.exit(1); });
