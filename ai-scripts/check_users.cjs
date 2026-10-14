const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');
const ssh = new NodeSSH();
async function check() {
  await ssh.connect(conexionVps);
  
  const grantSQL = 'GRANT SELECT, INSERT, UPDATE, DELETE ON empleados TO anon, web_anon; GRANT SELECT, INSERT, UPDATE, DELETE ON sesiones TO anon, web_anon;';
  const res = await ssh.execCommand('sudo -u postgres psql -c "' + grantSQL + '"');
  console.log('GRANT RESULT:', res.stdout, res.stderr);
  
  // Also reload postgrest schema
  await ssh.execCommand('systemctl restart postgrest || docker restart postgrest || pm2 restart postgrest');
  
  ssh.dispose();
}
check().catch(console.error);
