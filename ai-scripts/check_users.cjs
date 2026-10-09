const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function check() {
  await ssh.connect({ host: '72.60.242.133', username: 'root', password: 'X3L7S7rWbP?(ipa' });
  
  const grantSQL = 'GRANT SELECT, INSERT, UPDATE, DELETE ON empleados TO anon, web_anon; GRANT SELECT, INSERT, UPDATE, DELETE ON sesiones TO anon, web_anon;';
  const res = await ssh.execCommand('sudo -u postgres psql -c "' + grantSQL + '"');
  console.log('GRANT RESULT:', res.stdout, res.stderr);
  
  // Also reload postgrest schema
  await ssh.execCommand('systemctl restart postgrest || docker restart postgrest || pm2 restart postgrest');
  
  ssh.dispose();
}
check().catch(console.error);
