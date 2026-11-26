// Inventario SOLO DE LECTURA del VPS. No modifica archivos, no reinicia servicios,
// no despliega y no muestra contraseñas ni hashes. Lee las credenciales de .env.vps.
// Uso: node ai-scripts/inventario-vps.cjs
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const lineas = [];
const seccion = (t) => lineas.push(`\n## ${t}\n`);
const nota = (t) => lineas.push(`${t}\n`);
const bloque = (label, texto) => {
  lineas.push(`### ${label}\n`);
  lineas.push('```text');
  lineas.push(String(texto || '').replace(/\r/g, '').trimEnd());
  lineas.push('```\n');
};

async function cmd(ssh, comando) {
  const r = await ssh.execCommand(comando);
  return (r.code === 0 ? r.stdout : `(error ${r.code}) ${r.stderr || r.stdout}`).trim();
}
async function sql(ssh, db, consulta) {
  return cmd(ssh, `sudo -u postgres psql -d ${db} -tAc ${JSON.stringify(consulta)}`);
}
const filas = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    seccion('Datos generales');
    bloque('Sistema', await cmd(ssh, 'hostname; date "+%F %T %Z"; uname -sr; . /etc/os-release && echo "$PRETTY_NAME"'));
    bloque('Uptime / carga', await cmd(ssh, 'uptime'));
    bloque('Disco', await cmd(ssh, 'df -h | grep -v tmpfs'));
    bloque('Memoria', await cmd(ssh, 'free -h'));

    seccion('Servicios');
    bloque('Servicios principales', await cmd(ssh, "for s in nginx postgresql postgrest ssh sshd docker pm2; do printf '%-12s ' \"$s\"; systemctl is-active \"$s\" 2>/dev/null || echo '-'; done"));
    bloque('Servicios activos', await cmd(ssh, "systemctl list-units --type=service --state=running --no-pager --plain 2>/dev/null | head -35"));
    bloque('Docker', await cmd(ssh, 'command -v docker >/dev/null && docker ps --format "{{.Names}} | {{.Image}} | {{.Status}} | {{.Ports}}" || echo "docker no instalado"'));
    bloque('Puertos escuchando', await cmd(ssh, "ss -ltnp 2>/dev/null | head -30 || netstat -ltnp 2>/dev/null | head -30"));

    seccion('Organización de carpetas web');
    bloque('/var/www (nivel 1 y 2)', await cmd(ssh, 'find /var/www -maxdepth 2 -type d 2>/dev/null | sort'));
    bloque('Bundles activos por sitio (los que sirve index.html)', await cmd(ssh, "for h in $(find /var/www -maxdepth 3 -name index.html 2>/dev/null | sort); do printf '%s | ' \"$(dirname \"$h\")\"; grep -oE '(src|href)=\"/assets/[^\"]+\"' \"$h\" | sed 's/.*=\"//;s/\"$//' | tr '\\n' ' '; printf '| '; grep -oE '<title>[^<]*' \"$h\" | sed 's/<title>//'; echo; done"));
    bloque('Sites de nginx', await cmd(ssh, 'ls -1 /etc/nginx/sites-enabled 2>/dev/null; echo "---"; grep -rh "server_name\|root " /etc/nginx/sites-enabled 2>/dev/null | head -60'));
    bloque('Certificados SSL', await cmd(ssh, 'for d in /etc/letsencrypt/live/*/; do [ -d "$d" ] || continue; printf "%s | " "$(basename "$d")"; openssl x509 -enddate -noout -in "$d/cert.pem" 2>/dev/null | cut -d= -f2; done'));

    seccion('Bases de datos PostgreSQL');
    const bases = filas(await sql(ssh, 'postgres', "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1"));
    nota(`Bases encontradas (${bases.length}): ${bases.join(', ')}`);
    const resumen = [];
    for (const db of bases) {
      const tam = (await sql(ssh, 'postgres', `SELECT pg_size_pretty(pg_database_size('${db}'))`)).trim();
      const nTablas = (await sql(ssh, db, "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).trim();
      resumen.push(`| ${db} | ${tam} | ${nTablas} |`);
    }
    lineas.push('| Base | Tamaño | Tablas |\n|---|---|---|');
    resumen.forEach((r) => lineas.push(r));
    lineas.push('');

    for (const db of bases) {
      seccion(`Base ${db} — tablas y filas`);
      const tablas = filas(await sql(ssh, db, "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1"));
      const conteos = [];
      for (const t of tablas) {
        const n = (await sql(ssh, db, `SELECT count(*) FROM "${t}"`)).trim();
        conteos.push(`| ${t} | ${n} |`);
      }
      if (!conteos.length) conteos.push('| (sin tablas) | - |');
      lineas.push('| Tabla | Filas |\n|---|---|');
      conteos.forEach((c) => lineas.push(c));
      lineas.push('');
    }

    seccion('Usuarios de base (sin contraseñas ni hashes)');
    bloque('Roles', await sql(ssh, 'postgres', "SELECT rolname || ' | login=' || rolcanlogin || ' | super=' || rolsuper FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY 1"));

    seccion('Respaldos');
    bloque('Archivos de respaldo', await cmd(ssh, "find /root /var/backups /backups -maxdepth 3 -type f \\( -name '*.dump' -o -name '*.sql' -o -name '*.sql.gz' -o -name '*.backup' \\) -printf '%TY-%Tm-%Td %TH:%TM | %s bytes | %p\\n' 2>/dev/null | sort -r | head -60"));

    seccion('Espacio por carpeta web');
    bloque('du -h', await cmd(ssh, 'du -h --max-depth=1 /var/www 2>/dev/null | sort -h | tail -30'));

    const salida = path.join(__dirname, '..', 'docs', 'INVENTARIO-VPS.md');
    fs.writeFileSync(salida, `# Inventario del VPS (solo lectura)\n\nGenerado automáticamente el ${new Date().toISOString()} con \`node ai-scripts/inventario-vps.cjs\`.\nNo incluye contraseñas, claves ni hashes.\n${lineas.join('\n')}`, 'utf8');
    console.log(`OK: ${salida}`);
    console.log(`Bases: ${bases.join(', ')}`);
    console.log(`Líneas: ${lineas.length}`);
  } finally {
    ssh.dispose();
  }
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
