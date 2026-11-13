#!/bin/bash
# Borra los links viejos de pruebas (pedido del dueño, 13/11/2026): comerc.siumax.duckdns.org y servic.siumax.duckdns.org.
# El sistema de pruebas sigue en nego.siumax.duckdns.org (misma carpeta, base siumax y API 3001: no se toca).
#   - comerc.siumax: se quita su sitio de Nginx y su certificado.
#   - servic.siumax: se quita su sitio y su certificado, y se apaga su API (postgrest-cliente@servic, puerto 3002).
#     COPIA: su base `servic` y su carpeta /var/www/servic se QUEDAN como están; además se guarda un respaldo en
#     /root/backups/servic-<fecha>/ (base .dump + carpeta .tar.gz). Nada de Servic se pierde.
#   - Links que no existen en el servidor: ya no muestran ningún sitio (antes caían en el primero de la lista).
# Evicamp, el Panel, EviDiary y CreditAlToque no se tocan. Si algo falla, vuelve sola a como estaba.
set -Eeuo pipefail
source /opt/siuhub/siuhub-lib.sh

FECHA=$(date +%Y%m%d-%H%M%S)
BK="/root/backups/links-viejos-$FECHA"
mkdir -p "$BK"
cp -a /etc/nginx/sites-available /etc/nginx/sites-enabled "$BK/"
echo "Respaldo de Nginx en $BK"

API_SERVIC_APAGADA=0
volver_atras() {
  echo "!! Algo falló: se vuelve a como estaba ($BK)." >&2
  rm -rf /etc/nginx/sites-available /etc/nginx/sites-enabled
  cp -a "$BK/sites-available" "$BK/sites-enabled" /etc/nginx/
  nginx -t && systemctl reload nginx
  if [ $API_SERVIC_APAGADA = 1 ]; then systemctl enable --now postgrest-cliente@servic > /dev/null 2>&1 || true; fi
}
trap volver_atras ERR

HOST_SERVIC="servic.$DOMINIO_BASE"

echo "== 1/5 Copia de Servic (la base y la carpeta se quedan; esto es un respaldo extra)"
mkdir -p "$BK/servic"
if sudo -u postgres psql -Atc "select 1 from pg_database where datname='servic'" | grep -q 1; then
  sudo -u postgres pg_dump -Fc servic > "$BK/servic/base-servic.dump"
  [ -s "$BK/servic/base-servic.dump" ]
  echo "   base: $BK/servic/base-servic.dump ($(du -h "$BK/servic/base-servic.dump" | cut -f1))"
fi
if [ -d /var/www/servic ]; then
  tar -czf "$BK/servic/carpeta-servic.tar.gz" -C /var/www servic
  echo "   carpeta: $BK/servic/carpeta-servic.tar.gz ($(du -h "$BK/servic/carpeta-servic.tar.gz" | cut -f1))"
fi
cp -a /etc/postgrest/clientes/servic.conf "$BK/servic/" 2>/dev/null || true

echo "== 2/5 Se apaga la API de Servic (puerto 3002)"
if systemctl is-active --quiet postgrest-cliente@servic; then
  systemctl disable --now postgrest-cliente@servic > /dev/null 2>&1
  API_SERVIC_APAGADA=1
fi

echo "== 3/5 Se quitan los sitios $HOST_PRUEBAS y $HOST_SERVIC"
rm -f /etc/nginx/sites-enabled/comerc /etc/nginx/sites-available/comerc
rm -f /etc/nginx/sites-enabled/servic /etc/nginx/sites-available/servic
# Links desconocidos: ningún sitio (antes, el primero de la lista: era comerc; sin él sería otro proyecto)
cat > /etc/nginx/sites-available/000-desconocidos <<'EOF'
# SiuMax - links que no existen en este servidor: no se muestra ningún sitio. Creado por borrar-links-viejos.sh
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    ssl_reject_handshake on;
    return 444;
}
EOF
ln -sf /etc/nginx/sites-available/000-desconocidos /etc/nginx/sites-enabled/000-desconocidos
nginx -t
systemctl reload nginx

echo "== 4/5 Revisión"
codigo() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1" || true; }
contiene() { local t; t=$(curl -s --max-time 20 "$1"); [[ "$t" == *"$2"* ]]; }
revisar() { # revisar <qué> <comando...>
  local que="$1"; shift
  if "$@"; then echo "   OK  $que"; else echo "   MAL $que" >&2; false; fi
}
revisar "Pruebas de Nego abre"                 contiene "https://$HOST_PRUEBAS_NEGO/" "SiuMax"
revisar "Pruebas de Nego: API pide sesión"     test "$(codigo "https://$HOST_PRUEBAS_NEGO/rest/v1/products?limit=1")" = 401
revisar "Panel abre"                           contiene "https://$DOMINIO_BASE/" "Panel de Control"
revisar "Actualizaciones de la app de PC"      test "$(codigo "https://$DOMINIO_BASE/actualizaciones/latest.yml")" = 200
revisar "Evicamp abre"                         test "$(codigo "https://evicamp.duckdns.org/")" = 200
revisar "EviDiary abre"                        test "$(codigo "https://evi.siumax.duckdns.org/")" = 200
revisar "EviDiary (su link propio) abre"       test "$(codigo "https://evidiary.duckdns.org/")" = 200
revisar "CreditAlToque abre"                   test "$(codigo "https://creditaltoque.duckdns.org/")" = 200
revisar "$HOST_PRUEBAS ya no abre"             test "$(codigo "https://$HOST_PRUEBAS/")" = 000
revisar "$HOST_SERVIC ya no abre"              test "$(codigo "https://$HOST_SERVIC/")" = 000
trap - ERR

echo "== 5/5 Se borran los certificados de los dos links"
certbot delete --cert-name "$HOST_PRUEBAS" --non-interactive > /dev/null 2>&1 || true
certbot delete --cert-name "$HOST_SERVIC" --non-interactive > /dev/null 2>&1 || true

echo "LISTO. Pruebas: https://$HOST_PRUEBAS_NEGO | Copia de Servic: $BK/servic (y la base 'servic' y /var/www/servic siguen)"
