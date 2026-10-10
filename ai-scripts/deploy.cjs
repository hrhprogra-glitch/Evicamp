const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to VPS...');
    await ssh.connect({
      host: '72.60.242.133',
      username: 'root',
      password: 'X3L7S7rWbP?(ipa'
    });
    console.log('Connected!');

    const localDir = path.join(__dirname, '..', 'dist');
    const remoteDir = '/var/www/evicamp.duckdns.org/html';

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
    await ssh.execCommand('chown -R www-data:www-data /var/www/evicamp.duckdns.org/html/');
    await ssh.execCommand('systemctl restart nginx');
    
    console.log('Deploy completed successfully!');
    ssh.dispose();
  } catch (err) {
    console.error('Deploy error:', err);
    process.exit(1);
  }
}

deploy();
