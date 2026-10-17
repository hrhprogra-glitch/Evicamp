// Copia FUERA del servidor: descarga a esta PC el backup más reciente de cada base del VPS.
// Si el VPS se daña o lo atacan, los backups siguen a salvo aquí.
// Uso: node ai-scripts/descargar-backups.cjs
//   Carpeta: BACKUP_LOCAL en .env.vps (por defecto D:\Backups-SiuMax). Guarda los últimos 30 por base.
// Windows lo ejecuta solo cada día (tarea programada "SiuMax - Backups").
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const DESTINO = process.env.BACKUP_LOCAL || 'D:\\Backups-SiuMax';
const GUARDAR = 30;
const REMOTO = '/var/backups/siuhub';

const registro = (msg) => {
  const linea = `${new Date().toLocaleString('es-PE')}  ${msg}`;
  console.log(linea);
  try { fs.appendFileSync(path.join(DESTINO, 'descargas.log'), linea + '\n'); } catch { /* carpeta aún no creada */ }
};

(async () => {
  fs.mkdirSync(DESTINO, { recursive: true });
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  let nuevos = 0;
  try {
    // El backup más reciente de cada base (una carpeta por base) y de la configuración del sistema (.tar.gz)
    const { stdout } = await ssh.execCommand(
      `for d in ${REMOTO}/*/; do f=$(ls -1t "$d"*.dump "$d"*.tar.gz 2>/dev/null | head -1); [ -n "$f" ] && echo "$f"; done`);
    const archivos = stdout.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!archivos.length) throw new Error('No se encontraron backups en el servidor.');

    for (const remoto of archivos) {
      const base = path.basename(path.dirname(remoto));
      const carpeta = path.join(DESTINO, base);
      fs.mkdirSync(carpeta, { recursive: true });
      const local = path.join(carpeta, path.basename(remoto));
      if (!fs.existsSync(local)) {
        await ssh.getFile(local + '.parcial', remoto);
        fs.renameSync(local + '.parcial', local);   // nunca queda un archivo a medias con nombre final
        nuevos++;
        registro(`OK  ${base}  ${path.basename(remoto)}  ${(fs.statSync(local).size / 1024).toFixed(0)} KB`);
      }
      // Solo los últimos 30 de cada base
      const viejos = fs.readdirSync(carpeta).filter((f) => f.endsWith('.dump') || f.endsWith('.tar.gz')).sort().reverse().slice(GUARDAR);
      for (const f of viejos) fs.unlinkSync(path.join(carpeta, f));
    }
    registro(`Listo: ${archivos.length} bases revisadas, ${nuevos} backups nuevos descargados en ${DESTINO}`);
  } finally {
    ssh.dispose();
  }
})().catch((e) => { registro(`ERROR: ${e.message}`); process.exit(1); });
