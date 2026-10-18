// Activa "Ajustes > Sugerencias y errores": los mensajes de cada cliente llegan al Panel de Control.
// Uso:
//   node ai-scripts/sugerencias-servidor.cjs siumax            -> panel actualizado + solo el sitio de pruebas
//   node ai-scripts/sugerencias-servidor.cjs siumax evicamp    -> varios sitios (nombres de /etc/nginx/sites-available)
//
// Qué hace:
//  1. Sube SOLO servidor/panel/panel.py e index.html (no toca la contraseña del panel ni Mercado Pago,
//     a diferencia de `cliente.cjs panel`). Revisa la sintaxis antes de reiniciar; si falla, restaura.
//  2. Crea /opt/siuhub/sugerencias-secreto (solo root): contraseña interna entre nginx y el panel.
//  3. snippets/siumax-sugerencias.conf: /api/sugerencias del link del cliente → panel, con el link de
//     origen y esa contraseña. Límite: 6 mensajes por minuto por conexión.
//  4. En cada sitio deja `include snippets/siumax-*.conf;` (buscador de fotos + sugerencias).
// Si `nginx -t` falla, se restauran los sitios y no se recarga.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const sitios = process.argv.slice(2);
if (!sitios.length || sitios.some((s) => !/^[a-z0-9-]+$/.test(s))) {
  console.error('Uso: node ai-scripts/sugerencias-servidor.cjs <sitio> [sitio...]   (ej: siumax)');
  process.exit(1);
}
const DIR_PANEL = '/opt/siuhub/panel';
const SECRETO = '/opt/siuhub/sugerencias-secreto';
const INCLUDE = '    include snippets/siumax-*.conf;';

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
    // 1. Panel
    await ej(`mkdir -p /root/panel-antes-${sello} && cp ${DIR_PANEL}/panel.py ${DIR_PANEL}/index.html /root/panel-antes-${sello}/`);
    for (const archivo of ['panel.py', 'index.html']) {
      const texto = fs.readFileSync(path.join(__dirname, '..', 'servidor', 'panel', archivo), 'utf8').replace(/\r\n/g, '\n');
      await ej(`cat > ${DIR_PANEL}/${archivo}.nuevo`, texto);
    }
    const compila = await ssh.execCommand(`python3 -m py_compile ${DIR_PANEL}/panel.py.nuevo`);
    if (compila.code !== 0) throw new Error(`panel.py tiene un error: ${compila.stderr}`);
    await ej(`mv ${DIR_PANEL}/panel.py.nuevo ${DIR_PANEL}/panel.py && mv ${DIR_PANEL}/index.html.nuevo ${DIR_PANEL}/index.html && systemctl restart siuhub-panel`);
    await new Promise((r) => setTimeout(r, 1500));
    if ((await ssh.execCommand('systemctl is-active siuhub-panel')).stdout.trim() !== 'active') {
      await ssh.execCommand(`cp /root/panel-antes-${sello}/* ${DIR_PANEL}/ && systemctl restart siuhub-panel`);
      throw new Error('El panel no arrancó con la versión nueva: se restauró la anterior.');
    }
    console.log('Panel actualizado y funcionando.');

    // 2. Contraseña interna (se crea una sola vez)
    let secreto = (await ssh.execCommand(`cat ${SECRETO} 2>/dev/null`)).stdout.trim();
    if (!/^[0-9a-f]{64}$/.test(secreto)) {
      secreto = crypto.randomBytes(32).toString('hex');
      await ej(`umask 077 && cat > ${SECRETO}`, secreto);
    }

    // 3. Límite y reenvío
    await ej('cat > /etc/nginx/conf.d/siumax-sugerencias.conf', `# SiuMax: límite de "Sugerencias y errores" (para que nadie llene el panel)
limit_req_zone $binary_remote_addr zone=siumax_sugerencias:10m rate=6r/m;
`);
    await ej('umask 077 && cat > /etc/nginx/snippets/siumax-sugerencias.conf && chmod 600 /etc/nginx/snippets/siumax-sugerencias.conf', `# SiuMax: Ajustes > Sugerencias y errores → Panel de Control (servidor/panel/panel.py)
# Generado por ai-scripts/sugerencias-servidor.cjs. La contraseña interna solo existe aquí y en el panel.
location = /api/sugerencias {
    limit_except POST { deny all; }
    limit_req zone=siumax_sugerencias burst=3 nodelay;
    limit_req_status 429;
    client_max_body_size 16k;
    proxy_pass http://127.0.0.1:3090/api/sugerencia-cliente;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Cliente-Host $host;
    proxy_set_header X-SiuMax-Origen "${secreto}";
}
`);

    // 4. Sitios
    for (const sitio of sitios) {
      const archivo = `/etc/nginx/sites-available/${sitio}`;
      const texto = await ej(`cat ${archivo}`);
      let nuevo;
      if (texto.includes('include snippets/siumax-*.conf;')) { console.log(`${sitio}: ya estaba activado`); continue; }
      if (texto.includes('include snippets/siumax-imagenes*.conf;')) {
        nuevo = texto.replace(/^\s*include snippets\/siumax-imagenes\*\.conf;/m, INCLUDE);
      } else {
        const i = texto.indexOf('    location /rest/v1/');
        if (i < 0) throw new Error(`${sitio}: no se encontró "location /rest/v1/"`);
        nuevo = `${texto.slice(0, i)}${INCLUDE}\n\n${texto.slice(i)}`;
      }
      await ej(`cp ${archivo} /root/${sitio}.antes-sugerencias-${sello}`);
      respaldos.push([archivo, `/root/${sitio}.antes-sugerencias-${sello}`]);
      await ej(`cat > ${archivo}`, nuevo.endsWith('\n') ? nuevo : `${nuevo}\n`);
      console.log(`${sitio}: sugerencias activadas`);
    }
    const prueba = await ssh.execCommand('nginx -t');
    if (prueba.code !== 0) throw new Error(`nginx -t falló: ${prueba.stderr}`);
    await ej('systemctl reload nginx');
    console.log('Nginx recargado. Listo.');
  } catch (e) {
    for (const [archivo, respaldo] of respaldos) await ssh.execCommand(`cp ${respaldo} ${archivo}`);
    console.error('ERROR (se restauraron los sitios, nginx no se recargó):', e.message);
    process.exitCode = 1;
  } finally {
    ssh.dispose();
  }
})();
