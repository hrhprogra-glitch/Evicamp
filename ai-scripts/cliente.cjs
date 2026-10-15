// Manejo de clientes de SiuHub desde tu PC (la Fase 5 hará lo mismo con botones en un panel).
// Uso:
//   node ai-scripts/cliente.cjs instalar                                   -> prepara el VPS (una sola vez; repetir no daña)
//   node ai-scripts/cliente.cjs nuevo <link> "<Negocio>" <correo> <clave>  -> crea cliente completo
//   node ai-scripts/cliente.cjs listar                                     -> clientes, estado y último backup
//   node ai-scripts/cliente.cjs suspender <link>                           -> bloquea el acceso (no borra datos)
//   node ai-scripts/cliente.cjs activar <link>                             -> lo reactiva
//   node ai-scripts/cliente.cjs backup                                     -> copia de todas las bases ahora mismo
//   node ai-scripts/cliente.cjs panel                                      -> instala/actualiza el Panel de Control
//     (la primera vez usa PANEL_CLAVE de .env.vps como contraseña del panel)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const DIR_REMOTO = '/opt/siuhub';
const DIR_LOCAL = path.join(__dirname, '..', 'servidor');
const [accion, ...args] = process.argv.slice(2);

// Comillas simples seguras para bash
const q = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`;

const ejecutar = async (ssh, comando) => {
  const r = await ssh.execCommand(comando, {
    onStdout: (c) => process.stdout.write(c),
    onStderr: (c) => process.stderr.write(c),
  });
  if (r.code) throw new Error(`El comando terminó con código ${r.code}`);
};

const subirScripts = async (ssh) => {
  await ssh.execCommand(`mkdir -p ${DIR_REMOTO}`);
  for (const archivo of fs.readdirSync(DIR_LOCAL).filter((f) => f.endsWith('.sh'))) {
    const contenido = fs.readFileSync(path.join(DIR_LOCAL, archivo), 'utf8').replace(/\r\n/g, '\n');
    await ssh.execCommand(`cat > ${DIR_REMOTO}/${archivo} && chmod +x ${DIR_REMOTO}/${archivo}`, { stdin: contenido });
  }
};

(async () => {
  const validos = ['instalar', 'nuevo', 'listar', 'suspender', 'activar', 'backup', 'panel'];
  if (!validos.includes(accion)) {
    console.error(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).join('\n'));
    process.exit(1);
  }

  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    // Los scripts del servidor siempre se suben en su última versión antes de usarlos
    await subirScripts(ssh);

    if (accion === 'instalar') {
      await ejecutar(ssh, `${DIR_REMOTO}/instalar.sh`);
      console.log('Publicando el sistema en la copia compartida de clientes...');
      ssh.dispose();
      execSync('node ai-scripts/deploy.cjs clientes', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
      return;
    }

    if (accion === 'nuevo') {
      const [slug, negocio, correo, clave] = args;
      if (!slug || !negocio || !correo || !clave) {
        throw new Error('Uso: node ai-scripts/cliente.cjs nuevo <link> "<Negocio>" <correo> <clave>');
      }
      // La clave va como variable de entorno, no como argumento del script
      // El instalador de PC genérico se copia solo dentro de nuevo-cliente.sh
      await ejecutar(ssh, `CLAVE_ADMIN=${q(clave)} ${DIR_REMOTO}/nuevo-cliente.sh ${q(slug)} ${q(negocio)} ${q(correo)}`);
      console.log(`\nCliente listo: https://${slug}.siuhub.duckdns.org  |  usuario: ${correo.toLowerCase()}`);
      return;
    }

    if (accion === 'panel') {
      const dirPanel = path.join(DIR_LOCAL, 'panel');
      await ssh.execCommand(`mkdir -p ${DIR_REMOTO}/panel`);
      for (const archivo of fs.readdirSync(dirPanel)) {
        const contenido = fs.readFileSync(path.join(dirPanel, archivo), 'utf8').replace(/\r\n/g, '\n');
        await ssh.execCommand(`cat > ${DIR_REMOTO}/panel/${archivo}`, { stdin: contenido });
      }
      // Contraseña del panel: solo hace falta la primera vez (o para cambiarla). Vive en .env.vps.
      // Logo de SiuHub: se sube en binario desde la misma imagen que usa el sistema
      await ssh.putFile(path.join(__dirname, '..', 'src', 'assets', 'logo.png'), `${DIR_REMOTO}/panel/logo.png`);
      const clave = process.env.PANEL_CLAVE;
      await ejecutar(ssh, `${clave ? `PANEL_CLAVE=${q(clave)} ` : ''}${DIR_REMOTO}/instalar-panel.sh`);
      // Mercado Pago: producción si existe MP_ACCESS_TOKEN; si no, el de prueba
      const tokenMp = process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN_PRUEBA;
      if (tokenMp) {
        const modo = process.env.MP_ACCESS_TOKEN ? 'produccion' : 'prueba';
        await ejecutar(ssh, `MP_ACCESS_TOKEN=${q(tokenMp.trim())} MP_MODO=${modo} python3 ${DIR_REMOTO}/panel/panel.py configurar-mp && systemctl restart siuhub-panel`);
      }
      return;
    }

    if (accion === 'listar') await ejecutar(ssh, `${DIR_REMOTO}/listar-clientes.sh`);
    if (accion === 'suspender' || accion === 'activar') {
      if (!args[0]) throw new Error(`Uso: node ai-scripts/cliente.cjs ${accion} <link>`);
      await ejecutar(ssh, `${DIR_REMOTO}/estado-cliente.sh ${q(args[0])} ${accion}`);
    }
    if (accion === 'backup') {
      await ejecutar(ssh, `${DIR_REMOTO}/backup.sh && tail -n 20 /var/backups/siuhub/backup.log`);
    }
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
