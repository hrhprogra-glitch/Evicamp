// Instala o actualiza el FACTURADOR ELECTRÓNICO en el VPS (fase 11).
// Uso:
//   node ai-scripts/facturador-servidor.cjs siumax            -> atiende solo la base de pruebas
//   node ai-scripts/facturador-servidor.cjs siumax postgres   -> varias bases (postgres = Evicamp)
//
// Qué hace:
//  1. Sube servidor/facturador/ a /opt/siuhub/facturador e instala sus dependencias (pg) con /opt/node22.
//  2. Escribe bases.json con las bases que se piden (las que no tengan la fase 11 aplicada se saltan solas).
//  3. Crea /var/lib/siumax-cpe (copias propias de cada comprobante, del usuario postgres).
//  4. Servicio siumax-facturador (usuario postgres, se reinicia solo). Revisa la sintaxis antes de reiniciar.
// No reinicia PostgREST ni toca nginx: no corta ventas.
const path = require('path');
const { NodeSSH } = require('node-ssh');
const { conexionVps } = require('./vps.cjs');

const bases = process.argv.slice(2);
if (!bases.length || bases.some((b) => !/^[a-z0-9_]+$/.test(b))) {
  console.error('Uso: node ai-scripts/facturador-servidor.cjs <base> [base...]   (ej: siumax)');
  process.exit(1);
}
const DIR = '/opt/siuhub/facturador';
const NODE = '/opt/node22/bin';
const UNIDAD = `[Unit]
Description=SiuMax facturador electronico (boletas y facturas SUNAT)
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
User=postgres
WorkingDirectory=${DIR}
ExecStart=${NODE}/node facturador.mjs
Restart=always
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
`;

(async () => {
  const ssh = new NodeSSH();
  await ssh.connect(conexionVps);
  const ej = async (cmd, stdin) => {
    const r = await ssh.execCommand(cmd, stdin === undefined ? {} : { stdin });
    if (r.code !== 0) throw new Error(`${cmd.slice(0, 50)}…: ${r.stderr || r.stdout}`);
    return r.stdout.trim();
  };
  try {
    await ej(`mkdir -p ${DIR} /var/lib/siumax-cpe && chown postgres:postgres /var/lib/siumax-cpe && chmod 750 /var/lib/siumax-cpe`);
    for (const archivo of ['facturador.mjs', 'sunat.mjs', 'package.json']) {
      await ssh.putFile(path.join(__dirname, '..', 'servidor', 'facturador', archivo), `${DIR}/nuevo.${archivo}`);
    }
    await ej(`cd ${DIR} && ${NODE}/node --check nuevo.facturador.mjs && ${NODE}/node --check nuevo.sunat.mjs`);
    await ej(`cd ${DIR} && mv nuevo.facturador.mjs facturador.mjs && mv nuevo.sunat.mjs sunat.mjs && mv nuevo.package.json package.json && rm -f facturador.mjs.nuevo package.json.nuevo`);
    console.log('1. Archivos subidos');
    await ej(`cd ${DIR} && PATH=${NODE}:$PATH npm install --omit=dev --no-audit --no-fund --loglevel=error`);
    console.log('2. Dependencias instaladas');
    await ej(`cat > ${DIR}/bases.json`, JSON.stringify(bases) + '\n');
    await ej(`chmod -R a+rX ${DIR}`);
    console.log('3. Bases atendidas:', bases.join(', '));
    await ej('cat > /etc/systemd/system/siumax-facturador.service', UNIDAD);
    await ej('systemctl daemon-reload && systemctl enable siumax-facturador --quiet && systemctl restart siumax-facturador');
    await new Promise((r) => setTimeout(r, 4000));
    console.log('4. Servicio:', await ej('systemctl is-active siumax-facturador'));
    console.log(await ej('journalctl -u siumax-facturador -n 8 --no-pager -o cat'));
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    ssh.dispose();
  }
})();
