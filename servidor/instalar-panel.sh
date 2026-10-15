#!/bin/bash
# Instala o actualiza el Panel de Control en panel.siuhub.duckdns.org. Se puede repetir sin problema.
# Los archivos del panel ya fueron copiados a /opt/siuhub/panel por ai-scripts/cliente.cjs.
# La primera vez: PANEL_CLAVE='...' instalar-panel.sh   (después la clave no hace falta)
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

HOST="panel.$DOMINIO_BASE"
PANEL="$DIR_SIUHUB/panel"
chmod 700 "$PANEL"

if [ -n "${PANEL_CLAVE:-}" ]; then
  python3 "$PANEL/panel.py" crear-clave
fi
[ -f "$DIR_SIUHUB/panel-admin.json" ] || { echo "ERROR: falta la contraseña. Ejecuta con PANEL_CLAVE='...'." >&2; exit 1; }

echo "== Servicio del panel"
cat > /etc/systemd/system/siuhub-panel.service <<EOF
[Unit]
Description=SiuHub Panel de Control
After=network.target postgresql.service

[Service]
ExecStart=/usr/bin/python3 $PANEL/panel.py
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable siuhub-panel > /dev/null 2>&1
systemctl restart siuhub-panel
sleep 2
systemctl is-active --quiet siuhub-panel

echo "== Link $HOST con HTTPS"
ARCHIVO=/etc/nginx/sites-available/siuhub-panel
if [ ! -f "/etc/letsencrypt/live/$HOST/fullchain.pem" ]; then
  cat > "$ARCHIVO" <<EOF
server {
    listen 80;
    server_name $HOST;
    root /var/www/html;
}
EOF
  ln -sf "$ARCHIVO" /etc/nginx/sites-enabled/siuhub-panel
  recargar_nginx
  certbot certonly --nginx -d "$HOST" --non-interactive --agree-tos --keep-until-expiring > /dev/null
fi
cat > "$ARCHIVO" <<EOF
# SiuHub - Panel de Control (generado por instalar-panel.sh)
server {
    listen 443 ssl;
    server_name $HOST;

    ssl_certificate /etc/letsencrypt/live/$HOST/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$HOST/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 32k;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://127.0.0.1:3090;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 900s;  # crear un cliente o un backup puede tardar
    }
}

server {
    listen 80;
    server_name $HOST;
    return 301 https://\$host\$request_uri;
}
EOF
ln -sf "$ARCHIVO" /etc/nginx/sites-enabled/siuhub-panel
recargar_nginx

echo "== Revisión diaria de cobros (6:00 a. m.): avisos y suspensión por falta de pago"
cat > /etc/cron.d/siuhub-cobros <<EOF
# SiuHub: avisos de vencimiento y suspensión automática (ver $PANEL/panel.py)
0 6 * * * root /usr/bin/python3 $PANEL/panel.py revisar-cobros >> $DIR_SIUHUB/cobros.log 2>&1
EOF
chmod 644 /etc/cron.d/siuhub-cobros

echo "Panel listo: https://$HOST  (API local: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3090/api/sesion))"
