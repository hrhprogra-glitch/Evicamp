// Solo lectura: lista los correos de empleados de una base. Nunca muestra claves ni hashes.
// Uso: node ai-scripts/listar-usuarios.cjs [siumax|ecosistema]
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const db = ['siumax', 'ecosistema'].includes(process.argv[2]) ? process.argv[2] : 'siumax';

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const r = await ssh.execCommand(`sudo -u postgres psql -d ${db} -tAc "SELECT email FROM public.empleados WHERE email IS NOT NULL ORDER BY 1"`);
    console.log(`Usuarios de ${db} (solo correos):`);
    console.log((r.stdout || r.stderr).trim() || '(ninguno)');
  } finally { ssh.dispose(); }
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
