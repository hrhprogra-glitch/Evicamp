// Activa el buscador de fotos (Pixabay) en el servidor, para el formulario de producto.
// Uso:
//   node ai-scripts/imagenes-servidor.cjs siumax            -> solo el sitio de pruebas
//   node ai-scripts/imagenes-servidor.cjs siumax evicamp    -> varios sitios (nombres de /etc/nginx/sites-available)
//
// La clave se lee de .env.vps (PIXABAY_KEY=...) y se escribe SOLO en el servidor
// (/etc/nginx/snippets/siumax-imagenes.conf, permisos 600): nunca va al navegador, al código ni a git.
// El sistema pide /api/imagenes?q=... y nginx lo reenvía a Pixabay agregando la clave
// (src/utils/buscarImagenes.ts). Si `nginx -t` falla, se restauran los archivos y no se recarga.
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const sitios = process.argv.slice(2);
if (!sitios.length || sitios.some((s) => !/^[a-z0-9-]+$/.test(s))) {
  console.error('Uso: node ai-scripts/imagenes-servidor.cjs <sitio> [sitio...]   (ej: siumax)');
  process.exit(1);
}

const env = fs.readFileSync(path.join(__dirname, '..', '.env.vps'), 'utf8');
const clave = (env.match(/^PIXABAY_KEY=(.+)$/m) || [])[1]?.trim();
if (!clave || !/^[A-Za-z0-9-]+$/.test(clave)) {
  console.error('Falta PIXABAY_KEY en .env.vps (la clave de https://pixabay.com/api/docs/, solo letras, números y guiones).');
  process.exit(1);
}

const ZONA = `# SiuMax: límite del buscador de fotos (para que nadie gaste la clave de Pixabay)
limit_req_zone $binary_remote_addr zone=siumax_imagenes:10m rate=30r/m;
`;
const SNIPPET = `# SiuMax: buscador de fotos del formulario de producto (Pixabay).
# Generado por ai-scripts/imagenes-servidor.cjs. La clave solo existe aquí (no en el navegador).
location = /api/imagenes {
    limit_req zone=siumax_imagenes burst=10 nodelay;
    limit_req_status 429;
    resolver 1.1.1.1 8.8.8.8 valid=300s ipv6=off;
    resolver_timeout 5s;
    proxy_ssl_server_name on;
    proxy_set_header Host pixabay.com;
    proxy_set_header Cookie "";
    proxy_hide_header Set-Cookie;
    proxy_pass https://pixabay.com/api/?key=${clave}&$args;
    # Pixabay pide guardar los resultados 24 horas en vez de repetir la misma búsqueda
    add_header Cache-Control "private, max-age=86400" always;
}
`;
// Glob: si algún día no existe el archivo, nginx no falla
const INCLUDE = '    include snippets/siumax-*.conf;'; // buscador de fotos + sugerencias (y lo que venga)

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const ej = async (cmd, stdin) => {
    const r = await ssh.execCommand(cmd, stdin === undefined ? {} : { stdin });
    if (r.code !== 0) throw new Error(`${cmd.split(' ')[0]}: ${r.stderr || r.stdout}`);
    return r.stdout;
  };
  const sello = Date.now();
  const respaldos = [];
  try {
    await ej('cat > /etc/nginx/conf.d/siumax-imagenes.conf', ZONA);
    await ej('umask 077 && cat > /etc/nginx/snippets/siumax-imagenes.conf && chmod 600 /etc/nginx/snippets/siumax-imagenes.conf', SNIPPET);
    for (const sitio of sitios) {
      const archivo = `/etc/nginx/sites-available/${sitio}`;
      const texto = await ej(`cat ${archivo}`);
      if (texto.includes('snippets/siumax-')) { console.log(`${sitio}: ya estaba activado`); continue; }
      const i = texto.indexOf('    location /rest/v1/');
      if (i < 0) throw new Error(`${sitio}: no se encontró "location /rest/v1/"`);
      await ej(`cp ${archivo} /root/${sitio}.antes-imagenes-${sello}`);
      respaldos.push([archivo, `/root/${sitio}.antes-imagenes-${sello}`]);
      const nuevo = `${texto.slice(0, i)}${INCLUDE}\n\n${texto.slice(i)}`;
      await ej(`cat > ${archivo}`, nuevo.endsWith('\n') ? nuevo : `${nuevo}\n`);
      console.log(`${sitio}: buscador activado`);
    }
    const prueba = await ssh.execCommand('nginx -t');
    if (prueba.code !== 0) throw new Error(`nginx -t falló: ${prueba.stderr}`);
    await ej('systemctl reload nginx');
    console.log('Nginx recargado. Listo.');
  } catch (e) {
    for (const [archivo, respaldo] of respaldos) await ssh.execCommand(`cp ${respaldo} ${archivo}`);
    console.error('ERROR (se restauraron los sitios, nginx no se recargó):', e.message.replace(clave, '***'));
    process.exitCode = 1;
  } finally {
    ssh.dispose();
  }
})();
