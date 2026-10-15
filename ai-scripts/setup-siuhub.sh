#!/bin/bash
# Convierte el entorno "evicamp pruebas" en SiuHub. Hace respaldo antes de cada cambio.
set -euo pipefail
FECHA=$(date +%Y%m%d-%H%M%S)
BK=/root/backups/siuhub-migracion-$FECHA
mkdir -p "$BK"

echo "== 1. Respaldo"
sudo -u postgres pg_dump -Fc evicamp_test > "$BK/evicamp_test.dump"
cp /etc/postgrest_test.conf "$BK/"
cp /etc/systemd/system/postgrest_test.service "$BK/"
cp -P /etc/nginx/sites-enabled/evicamp-test "$BK/evicamp-test.enabled"
[ -f /etc/nginx/sites-available/evicamp-test ] && cp /etc/nginx/sites-available/evicamp-test "$BK/evicamp-test.available" || true
ls -la "$BK"

echo "== 2. Detener API de pruebas"
systemctl stop postgrest_test
systemctl disable postgrest_test

echo "== 3. Renombrar base de datos evicamp_test -> siuhub"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER DATABASE evicamp_test RENAME TO siuhub;"

echo "== 4. Configuración y servicio de la API SiuHub"
sed 's#/evicamp_test"#/siuhub"#' /etc/postgrest_test.conf > /etc/postgrest_siuhub.conf
grep -q '/siuhub"' /etc/postgrest_siuhub.conf
cat > /etc/systemd/system/postgrest_siuhub.service <<'EOF'
[Unit]
Description=SiuHub API (PostgREST) - base siuhub
After=postgresql.service

[Service]
ExecStart=/usr/local/bin/postgrest /etc/postgrest_siuhub.conf
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
mv /etc/systemd/system/postgrest_test.service "$BK/postgrest_test.service.retirado"
mv /etc/postgrest_test.conf "$BK/postgrest_test.conf.retirado"
systemctl daemon-reload
systemctl enable --now postgrest_siuhub
sleep 3
systemctl is-active postgrest_siuhub
echo "API local: $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:3001/products?limit=1')"

echo "== 5. Carpeta web"
mkdir -p /var/www/siuhub/html
echo '<!doctype html><title>SiuHub</title><p>SiuHub: instalando...</p>' > /var/www/siuhub/html/index.html
chown -R www-data:www-data /var/www/siuhub

echo "== 6. Nginx: sitio siuhub y retiro de evicamp-test (puerto 8000)"
cat > /etc/nginx/sites-available/siuhub <<'EOF'
server {
    listen 80;
    server_name siuhub.duckdns.org;

    # 1. FRONTEND
    root /var/www/siuhub/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. API POSTGREST (base siuhub, puerto 3001)
    location /rest/v1/ {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, apikey, prefer, x-client-info, range, accept-profile, content-profile, x-supabase-api-version' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            add_header 'Content-Type' 'text/plain charset=UTF-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }

        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Expose-Headers;

        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, apikey, prefer, x-client-info, range, accept-profile, content-profile, x-supabase-api-version' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Range, Location, Range-Unit' always;

        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
ln -sf /etc/nginx/sites-available/siuhub /etc/nginx/sites-enabled/siuhub
rm -f /etc/nginx/sites-enabled/evicamp-test
if ! nginx -t; then
  echo "nginx -t FALLÓ, restaurando"
  rm -f /etc/nginx/sites-enabled/siuhub
  cp -P "$BK/evicamp-test.enabled" /etc/nginx/sites-enabled/evicamp-test
  exit 1
fi
systemctl reload nginx

echo "== 7. HTTPS (Let's Encrypt)"
certbot --nginx -d siuhub.duckdns.org --non-interactive --agree-tos --redirect
nginx -t && systemctl reload nginx

echo "== 8. Cerrar puerto 8000 (ya no se usa)"
ufw delete allow 8000/tcp || true

echo "== 9. Verificación"
echo "Web:  $(curl -s -o /dev/null -w '%{http_code}' https://siuhub.duckdns.org/)"
echo "API:  $(curl -s -o /dev/null -w '%{http_code}' 'https://siuhub.duckdns.org/rest/v1/products?limit=1')"
echo "Evicamp sigue: $(curl -s -o /dev/null -w '%{http_code}' https://evicamp.duckdns.org/)"
echo "CreditAltoque sigue: $(curl -s -o /dev/null -w '%{http_code}' https://creditaltoque.duckdns.org/)"
echo "Respaldo en: $BK"
