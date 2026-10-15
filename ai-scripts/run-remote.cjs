// Sube un script bash al VPS, lo ejecuta mostrando la salida y lo borra.
// Uso: node ai-scripts/run-remote.cjs ai-scripts/setup-siuhub.sh
const path = require('path');
const fs = require('fs');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const script = process.argv[2];
if (!script) { console.error('Uso: node ai-scripts/run-remote.cjs <script.sh>'); process.exit(1); }

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const remoto = '/root/' + path.basename(script);
  await ssh.execCommand(`cat > ${remoto}`, { stdin: fs.readFileSync(script, 'utf8').replace(/\r\n/g, '\n') });
  const r = await ssh.execCommand(`bash ${remoto}`, {
    onStdout: c => process.stdout.write(c),
    onStderr: c => process.stderr.write(c),
  });
  await ssh.execCommand(`rm -f ${remoto}`);
  ssh.dispose();
  process.exit(r.code || 0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
