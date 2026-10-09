const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: '72.60.242.133',
    username: 'root',
    password: 'X3L7S7rWbP?(ipa'
  });
  
  const res = await ssh.execCommand('sudo -u postgres psql -c "\\dt"');
  console.log('TABLES:\n', res.stdout);
  
  ssh.dispose();
}
check().catch(console.error);
