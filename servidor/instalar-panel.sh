#!/bin/bash
# Instala o actualiza el Panel de Control en siumax.duckdns.org. Se puede repetir sin problema.
# (Hasta el 06/11/2026 estaba en panel.siumax.duckdns.org y siumax.duckdns.org era el sistema de pruebas.)
# Los archivos del panel ya fueron copiados a /opt/siuhub/panel por ai-scripts/cliente.cjs.
# La primera vez: PANEL_CLAVE='...' instalar-panel.sh   (después la clave no hace falta)
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

HOST="$DOMINIO_BASE"
PANEL="$DIR_SIUMAX/panel"
WEB_PANEL="/var/www/siumax-panel"     # archivos sueltos que nginx sirve en el link del panel
WEB_PRUEBAS="/var/www/siuhub/html"     # sistema de pruebas de Comerc: ahí viven actualizaciones/ y descargas/
chmod 700 "$PANEL"

if [ -n "${PANEL_CLAVE:-}" ]; then
  python3 "$PANEL/panel.py" crear-clave
fi
[ -f "$DIR_SIUMAX/panel-admin.json" ] || { echo "ERROR: falta la contraseña. Ejecuta con PANEL_CLAVE='...'." >&2; exit 1; }

echo "== Servicio del panel"
cat > /etc/systemd/system/siuhub-panel.service <<EOF
[Unit]
Description=SiuMax Panel de Control
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
sitio_con_certificado siuhub-panel "$HOST"

# Antes, en este link estaba el sistema de pruebas, que el navegador guardó para usarlo sin internet
# (service worker). Este sw.js lo borra solo la próxima vez que se abra el link, para que se vea el panel.
mkdir -p "$WEB_PANEL"
cat > "$WEB_PANEL/sw.js" <<'EOF'
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const nombre of await caches.keys()) await caches.delete(nombre);
    await self.registration.unregister();
    for (const cliente of await self.clients.matchAll({ type: 'window' })) cliente.navigate(cliente.url);
  })());
});
EOF
chown -R www-data:www-data "$WEB_PANEL"

cat > "$ARCHIVO" <<EOF
# SiuMax - Panel de Control (generado por instalar-panel.sh)
server {
    listen 443 ssl;
    server_name $HOST;

$(ssl_de "$HOST")

    client_max_body_size 32k;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Las apps de escritorio instaladas (también las de Evicamp) buscan aquí sus actualizaciones: NO QUITAR
    location /actualizaciones/ {
        alias $WEB_PRUEBAS/actualizaciones/;
    }
    location /descargas/ {
        alias $WEB_PRUEBAS/descargas/;
    }
    location = /sw.js {
        alias $WEB_PANEL/sw.js;
        default_type application/javascript;
        add_header Cache-Control "no-store" always;
    }

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
# SiuMax: avisos de vencimiento y suspensión automática (ver $PANEL/panel.py)
0 6 * * * root /usr/bin/python3 $PANEL/panel.py revisar-cobros >> $DIR_SIUMAX/cobros.log 2>&1
EOF
chmod 644 /etc/cron.d/siuhub-cobros

echo "Panel listo: https://$HOST  (API local: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3090/api/sesion))"
