// Uso:
//   node ai-scripts/deploy.cjs           -> sube dist/ a Evicamp (producción de la clienta)
//   node ai-scripts/deploy.cjs siuhub    -> compila para SiuHub y sube dist-siuhub/ a siuhub.duckdns.org
const { NodeSSH } = require('node-ssh');
const path = require('path');
const { execSync } = require('child_process');
const { conexionVps } = require('./vps.cjs');
const ssh = new NodeSSH();

const DESTINOS = require('./destinos.cjs');

const nombre = process.argv[2] || 'evicamp';
const destino = DESTINOS[nombre];
if (!destino) {
  console.error(`Destino desconocido: ${nombre}. Opciones: ${Object.keys(DESTINOS).join(', ')}`);
  process.exit(1);
}

async function deploy() {
  try {
    if (destino.build) {
      console.log(`Compilando para ${nombre}...`);
      execSync(destino.build, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, ...destino.env },
      });
    }

    console.log('Connecting to VPS...');
    await ssh.connect(conexionVps);
    console.log('Connected!');

    const { localDir, remoteDir } = destino;

    console.log(`Uploading from ${localDir} to ${remoteDir}...`);
    const failed = [];
    const successful = [];

    await ssh.putDirectory(localDir, remoteDir, {
      recursive: true,
      concurrency: 10,
      tick: function(localPath, remotePath, error) {
        if (error) {
          failed.push(localPath);
        } else {
          successful.push(localPath);
        }
      }
    });

    console.log(`Upload complete. Success: ${successful.length}, Failed: ${failed.length}`);
    if (failed.length > 0) {
      console.log('Failed files:', failed);
    }

    console.log('Setting permissions and restarting nginx...');
    await ssh.execCommand(`chown -R www-data:www-data ${remoteDir}/`);
    await ssh.execCommand('systemctl restart nginx');

    console.log(`Deploy a ${nombre} completed successfully!`);
    ssh.dispose();
  } catch (err) {
    console.error('Deploy error:', err);
    process.exit(1);
  }
}

deploy();
