// Solo lectura: muestra QUÉ BASE atiende cada API, nunca la URI completa ni claves.
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  try {
    const r1 = await ssh.execCommand("grep -rn 'proxy_pass\\|/rest/v1' /etc/nginx/ 2>/dev/null | grep -v 'sites-available/default' | head -100");
    console.log(`\n===== Nginx: proxy_pass =====\n${(r1.stdout || r1.stderr).trim()}`);

    const r2 = await ssh.execCommand("for f in /etc/postgrest/*.conf; do b=$(grep -oE '5432/[A-Za-z0-9_]+' \"$f\" | head -1 | cut -d/ -f2); [ -n \"$b\" ] && echo \"$(basename \"$f\") -> Base: $b\"; done");
    console.log(`\n===== PostgREST (config) =====\n${(r2.stdout || r2.stderr).trim()}`);

    const r3 = await ssh.execCommand("for c in evidiary-api evidiary-api-prueba creditaltoque-api; do printf '%-24s ' \"$c\"; docker inspect \"$c\" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -oE '5432/[A-Za-z0-9_]+' | head -1 | cut -d/ -f2; done");
    console.log(`\n===== PostgREST (docker) =====\n${(r3.stdout || r3.stderr).trim()}`);

    const r4 = await ssh.execCommand("for u in postgrest.service postgrest_siuhub.service siudemo-api.service postgrest-cliente@ecosistema.service; do echo \"--- $u\"; systemctl cat \"$u\" 2>/dev/null | grep -E 'ExecStart|Environment' | sed -E 's#(postgres://[^:]+:)[^@]+@#\\1***@#g'; done");
    console.log(`\n===== Servicios PostgREST =====\n${(r4.stdout || r4.stderr).trim()}`);

    const r5 = await ssh.execCommand("for f in /etc/postgrest.conf /etc/postgrest_siuhub.conf /etc/postgrest/siudemo.conf /etc/postgrest/clientes/*.conf; do [ -f \"$f\" ] || continue; printf '%-45s | puerto %-5s | base %s\\n' \"$f\" \"$(grep -oE 'server-port *= *[0-9]+' \"$f\" | grep -oE '[0-9]+' | head -1)\" \"$(grep -oE '5432/[A-Za-z0-9_]+' \"$f\" | head -1 | cut -d/ -f2)\"; done");
    console.log(`\n===== Config -> puerto -> base =====\n${(r5.stdout || r5.stderr).trim()}`);
  } finally { ssh.dispose(); }
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
