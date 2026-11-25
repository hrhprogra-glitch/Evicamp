// Solo lectura: confirma que la carpeta compartida del panel de clientes sirve el bundle nuevo.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const index = await ssh.execCommand("grep -o 'assets/index-[^\" ]*' /var/www/siuhub-app/html/index.html");
    const bundles = index.stdout.trim().split(/\s+/).filter(Boolean);
    const js = bundles.find((b) => /\.js$/.test(b));
    const css = bundles.find((b) => /\.css$/.test(b));
    console.log(`clientes: ${js || '?'} / ${css || '?'}`);
    if (!js || !css) throw new Error('index.html sin bundle');
    const jsTxt = await ssh.execCommand(`grep -c 'tabla-salidas-scroll' /var/www/siuhub-app/html/${js}`);
    const cssTxt = await ssh.execCommand(`grep -c '1101px' /var/www/siuhub-app/html/${css}`);
    console.log(`JS con tabla-salidas-scroll: ${jsTxt.stdout.trim()}`);
    console.log(`CSS con regla 1101px: ${cssTxt.stdout.trim()}`);
    if (Number(jsTxt.stdout.trim()) < 1 || Number(cssTxt.stdout.trim()) < 1) throw new Error('bundle viejo en clientes');
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('FALLO: ' + e.message); process.exit(1); });
