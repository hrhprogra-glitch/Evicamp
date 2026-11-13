#!/bin/bash
# SiuMax Nego, fase 4 (12/11/2026): link de pruebas nego.siumax.duckdns.org.
# Es el MISMO sistema de pruebas de comerc.siumax.duckdns.org (carpeta /var/www/siuhub/html, base siumax, API 3001):
# copia su configuración de Nginx cambiando solo el link y el certificado. comerc.siumax sigue funcionando igual.
# Solo toca Nginx y certificados: ninguna base de datos ni API. Evicamp no se toca. Se puede repetir sin problema.
# Si algo falla, vuelve sola a la configuración de antes.
set -Eeuo pipefail
source /opt/siuhub/siuhub-lib.sh

FECHA=$(date +%Y%m%d-%H%M%S)
BK="/root/backups/link-nego-$FECHA"
mkdir -p "$BK"
cp -a /etc/nginx/sites-available /etc/nginx/sites-enabled "$BK/"
echo "Respaldo de Nginx en $BK"

volver_atras() {
  echo "!! Algo falló: se vuelve a la configuración de antes ($BK)." >&2
  rm -rf /etc/nginx/sites-available /etc/nginx/sites-enabled
  cp -a "$BK/sites-available" "$BK/sites-enabled" /etc/nginx/
  nginx -t && systemctl reload nginx
}
trap volver_atras ERR

echo "== 1/2 Pruebas de Nego: https://$HOST_PRUEBAS_NEGO"
grep -q "server_name $HOST_PRUEBAS;" /etc/nginx/sites-available/comerc
if ! grep -qs "listen 443" /etc/nginx/sites-available/nego; then
  sitio_con_certificado nego "$HOST_PRUEBAS_NEGO"
  sed "s#$HOST_PRUEBAS#$HOST_PRUEBAS_NEGO#g" /etc/nginx/sites-available/comerc > /etc/nginx/sites-available/nego
  sed -i "1i # SiuMax Nego - sistema de pruebas (el mismo de comerc.siumax: base siumax, API puerto 3001). Creado por link-pruebas-nego.sh" /etc/nginx/sites-available/nego
  ln -sf /etc/nginx/sites-available/nego /etc/nginx/sites-enabled/nego
  recargar_nginx
fi

echo "== 2/2 Revisión"
codigo() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
contiene() { local t; t=$(curl -s --max-time 20 "$1"); [[ "$t" == *"$2"* ]]; }
revisar() { # revisar <qué> <comando...>
  local que="$1"; shift
  if "$@"; then echo "   OK  $que"; else echo "   MAL $que" >&2; false; fi
}
revisar "Pruebas de Nego abre"                   contiene "https://$HOST_PRUEBAS_NEGO/" "SiuMax"
revisar "Pruebas de Nego: API pide sesión"       test "$(codigo "https://$HOST_PRUEBAS_NEGO/rest/v1/products?limit=1")" = 401
revisar "Pruebas con el link anterior abre"      contiene "https://$HOST_PRUEBAS/" "SiuMax"
revisar "Panel abre"                             test "$(codigo "https://$DOMINIO_BASE/")" = 200
revisar "Actualizaciones de la app de PC"        test "$(codigo "https://$DOMINIO_BASE/actualizaciones/latest.yml")" = 200
revisar "Evicamp abre"                           test "$(codigo "https://evicamp.duckdns.org/")" = 200
revisar "EviDiary abre"                          test "$(codigo "https://evi.siumax.duckdns.org/")" = 200
trap - ERR
echo "LISTO. Pruebas de Nego: https://$HOST_PRUEBAS_NEGO (y sigue https://$HOST_PRUEBAS)"
