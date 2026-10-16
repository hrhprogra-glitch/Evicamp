#!/bin/bash
# Migración de siuhub.duckdns.org a siumax.duckdns.org (cambio de marca SiuHub -> SiuMax).
# Mueve el sistema de pruebas y todos los clientes a sus links nuevos con HTTPS.
# Solo toca configuraciones de Nginx y certificados: las bases de datos y los datos NO cambian.
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

VIEJO="siuhub.duckdns.org"
FECHA=$(date +%Y%m%d-%H%M%S)
BK="/root/backups/migracion-siumax-$FECHA"
mkdir -p "$BK"
cp -a /etc/nginx/sites-available "$BK/"
cp -a /etc/nginx/sites-enabled "$BK/"
echo "Respaldo de Nginx en $BK"

certificado() { # certificado <host>: pide el certificado HTTPS si aún no existe
  [ -f "/etc/letsencrypt/live/$1/fullchain.pem" ] && return 0
  certbot certonly --nginx -d "$1" --non-interactive --agree-tos --keep-until-expiring > /dev/null
}

echo "== 1/3 Sistema de pruebas: https://$DOMINIO_BASE"
cat > /etc/nginx/sites-available/siumax <<EOF
server {
    listen 80;
    server_name $DOMINIO_BASE;
    root /var/www/siuhub/html;
}
EOF
ln -sf /etc/nginx/sites-available/siumax /etc/nginx/sites-enabled/siumax
rm -f /etc/nginx/sites-enabled/siuhub   # la config vieja apuntaba a un link que ya no existe
recargar_nginx
certificado "$DOMINIO_BASE"
CORS='
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, apikey, prefer, x-client-info, range, accept-profile, content-profile, x-supabase-api-version" always;
        add_header Access-Control-Expose-Headers "Content-Range, Location, Range-Unit" always;'
cat > /etc/nginx/sites-available/siumax <<EOF
# SiuMax - sistema de pruebas (base siuhub, API puerto 3001)
server {
    listen 443 ssl;
    server_name $DOMINIO_BASE;

    ssl_certificate /etc/letsencrypt/live/$DOMINIO_BASE/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMINIO_BASE/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/siuhub/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /rest/v1/ {
        if (\$request_method = OPTIONS) {$CORS
            add_header Access-Control-Max-Age 86400 always;
            add_header Content-Length 0 always;
            return 204;
        }
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Expose-Headers;$CORS

        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}

server {
    listen 80;
    server_name $DOMINIO_BASE;
    return 301 https://\$host\$request_uri;
}
EOF
recargar_nginx

echo "== 2/3 Clientes"
while IFS=$'\t' read -r slug nombre puerto estado alta; do
  [ -n "$slug" ] || continue
  host=$(host_cliente "$slug")
  escribir_nginx "$slug" "$puerto" http
  recargar_nginx
  certificado "$host"
  if [ "$estado" = "SUSPENDIDO" ]; then escribir_nginx "$slug" "$puerto" suspendido; else escribir_nginx "$slug" "$puerto" activo; fi
  recargar_nginx
  echo "   $slug -> https://$host ($estado)"
done < "$REGISTRO"

echo "== 3/3 Verificación"
echo "   Pruebas: $(curl -s -o /dev/null -w '%{http_code}' https://$DOMINIO_BASE/)  API: $(curl -s -o /dev/null -w '%{http_code}' "https://$DOMINIO_BASE/rest/v1/products?limit=1")"
while IFS=$'\t' read -r slug _ _ _ _; do
  [ -n "$slug" ] && echo "   $slug: $(curl -s -o /dev/null -w '%{http_code}' "https://$(host_cliente "$slug")/")"
done < "$REGISTRO"
echo "Migración lista. (El panel se migra con: node ai-scripts/cliente.cjs panel)"
