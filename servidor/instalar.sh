#!/bin/bash
# Prepara el VPS para manejar varios clientes de SiuMax. Se puede ejecutar varias veces sin problema.
# Los scripts ya fueron copiados a /opt/siuhub por ai-scripts/cliente.cjs antes de llamar a este.
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

echo "== Carpetas"
mkdir -p "$DIR_SIUMAX" "$APP_COMPARTIDA" "$DIR_CLIENTES" "$DIR_CONF_CLIENTES" /var/backups/siuhub
touch "$REGISTRO"
chmod 700 /var/backups/siuhub
chmod +x "$DIR_SIUMAX"/*.sh

echo "== Servicio de API por cliente (postgrest-cliente@<slug>)"
cat > /etc/systemd/system/postgrest-cliente@.service <<'EOF'
[Unit]
Description=SiuMax API cliente %i (PostgREST)
After=postgresql.service

[Service]
ExecStart=/usr/local/bin/postgrest /etc/postgrest/clientes/%i.conf
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

echo "== Página de servicio suspendido"
cat > "$APP_COMPARTIDA/suspendido.html" <<'EOF'
<!doctype html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Servicio suspendido</title>
<style>
html,body{height:100%;margin:0}
body{display:flex;align-items:center;justify-content:center;background:#1E293B;color:#F8FAFC;padding:16px;box-sizing:border-box;font-family:ui-monospace,Menlo,Consolas,monospace;text-align:center}
.caja{border:2px solid #F59E0B;padding:32px 24px;max-width:460px;box-shadow:6px 6px 0 0 #F59E0B}
h1{margin:0 0 12px;font-size:18px;letter-spacing:.15em;text-transform:uppercase;color:#F59E0B}
p{margin:0;font-size:14px;line-height:1.6}
</style></head>
<body><div class="caja"><h1>Servicio suspendido</h1>
<p>El acceso a este sistema está suspendido temporalmente. Tus datos están guardados y seguros.<br><br>Comunícate con SiuMax para reactivarlo.</p></div></body></html>
EOF

echo "== Backup diario a las 3:00 a. m."
cat > /etc/cron.d/siuhub-backup <<EOF
# SiuMax: copia diaria de todas las bases (ver $DIR_SIUMAX/backup.sh)
0 3 * * * root $DIR_SIUMAX/backup.sh
EOF
chmod 644 /etc/cron.d/siuhub-backup

echo "Instalación lista."
