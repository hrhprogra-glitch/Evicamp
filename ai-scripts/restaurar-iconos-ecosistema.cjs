// Reponer los 5 iconos del sitio oficial después de cada deploy (el dist compartido trae los de SiuMax).
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const res = await ssh.execCommand('bash /opt/siuhub/ecosistema-iconos.sh');
    if (res.code !== 0) throw new Error(res.stderr || res.stdout);
    console.log(res.stdout.trim() || 'Iconos repuestos.');
    const md5 = await ssh.execCommand('md5sum /var/www/ecosistema123/html/icons/icon-192.png /opt/siuhub/ecosistema-logo.png');
    console.log(md5.stdout.trim());
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
