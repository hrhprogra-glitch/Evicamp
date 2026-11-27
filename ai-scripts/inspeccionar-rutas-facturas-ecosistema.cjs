// Solo lectura: localizar en el VPS los PDF migrados de compras y comprobar su URL pública.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const id = 'ed1de131-7854-4226-93c7-6fe3d19e7c40.pdf';
    const comandos = [
      `find / -name '${id}' -o -name '${id.split('-')[0]}*' 2>/dev/null | head -20`,
      "find /opt /var/lib /var/www /home -type d -iname '*factura*' 2>/dev/null | head -20",
      `curl -s -o /dev/null -w 'HTTP %{http_code} %{content_type} %{size_download}\\n' 'https://ecosistema123.duckdns.org/api/uploads/factura/${id}'`,
    ];
    for (const cmd of comandos) {
      const r = await ssh.execCommand(cmd, { execOptions: { timeout: 120000 } });
      console.log('$', cmd, '\n', (r.stdout || r.stderr || '').trim());
    }
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('FALLA:', e.message); process.exit(1); });
