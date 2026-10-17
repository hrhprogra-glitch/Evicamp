// Prueba que un backup de esta PC SÍ se puede recuperar: lo sube al VPS, lo restaura en una base TEMPORAL
// aparte (no toca la real), compara tabla por tabla con la base real y borra la temporal.
// Uso: node ai-scripts/probar-restauracion.cjs [base]      (por defecto: postgres = Evicamp)
//   Las diferencias pequeñas son normales si hubo ventas después de la hora del backup.
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const BASE = process.argv[2] || 'postgres';
if (!/^[a-z0-9_]+$/.test(BASE)) { console.error('Base inválida.'); process.exit(1); }
const LOCAL = path.join(process.env.BACKUP_LOCAL || 'D:\\Backups-SiuMax', BASE);
const TEMPORAL = `prueba_restauracion_${Date.now()}`;

(async () => {
  const archivos = fs.existsSync(LOCAL) ? fs.readdirSync(LOCAL).filter((f) => f.endsWith('.dump')).sort() : [];
  if (!archivos.length) throw new Error(`No hay backups de ${BASE} en ${LOCAL}`);
  const dump = archivos.at(-1);
  console.log(`Backup de esta PC: ${path.join(LOCAL, dump)}`);

  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const remoto = `/tmp/${TEMPORAL}.dump`;
  const sql = (base, consulta) => ssh.execCommand(`runuser -u postgres -- psql -At -d ${base} -c "${consulta}"`);
  try {
    await ssh.putFile(path.join(LOCAL, dump), remoto);
    await ssh.execCommand(`chmod 644 ${remoto}`);
    const crear = await ssh.execCommand(`runuser -u postgres -- createdb ${TEMPORAL} && runuser -u postgres -- pg_restore --no-owner --role=postgres -d ${TEMPORAL} ${remoto}`);
    if (crear.code) console.log('   (avisos de pg_restore:', crear.stderr.split('\n').slice(0, 3).join(' | '), ')');

    // Filas por tabla: restaurada vs. real
    const conteo = `select string_agg(table_name || '=' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text, ',' order by table_name) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`;
    const aMapa = (txt) => Object.fromEntries(txt.trim().split(',').filter(Boolean).map((p) => p.split('=')));
    const restaurada = aMapa((await sql(TEMPORAL, conteo)).stdout);
    const real = aMapa((await sql(BASE, conteo)).stdout);

    console.log(`\n${'TABLA'.padEnd(24)} ${'BACKUP'.padStart(8)} ${'REAL HOY'.padStart(9)}`);
    let tablas = 0, iguales = 0;
    for (const t of Object.keys(real).sort()) {
      tablas++;
      const ok = restaurada[t] === real[t];
      if (ok) iguales++;
      console.log(`${t.padEnd(24)} ${String(restaurada[t] ?? 'FALTA').padStart(8)} ${String(real[t]).padStart(9)} ${ok ? '' : ' ← cambió desde el backup'}`);
    }
    const faltan = Object.keys(real).filter((t) => !(t in restaurada));
    console.log(`\nResultado: ${tablas - faltan.length}/${tablas} tablas recuperadas, ${iguales} idénticas a hoy.`);
    console.log(faltan.length ? `ATENCIÓN: faltan tablas: ${faltan.join(', ')}` : 'El backup SÍ se puede recuperar.');
  } finally {
    await ssh.execCommand(`runuser -u postgres -- dropdb --if-exists ${TEMPORAL}; rm -f ${remoto}`);
    console.log(`(base temporal ${TEMPORAL} borrada; la base real no se tocó)`);
    ssh.dispose();
  }
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
