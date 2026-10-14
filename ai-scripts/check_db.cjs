const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect(conexionVps);
  
  const res = await ssh.execCommand('sudo -u postgres psql -c "\\dt"');
  console.log('TABLES:\n', res.stdout);
  
  ssh.dispose();
}
check().catch(console.error);
