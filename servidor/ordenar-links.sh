#!/bin/bash
# Ordena los links de SiuMax (pedido del dueño, 06/11/2026). Se puede repetir sin problema.
#   siumax.duckdns.org         -> Panel de Control (antes era el sistema de pruebas de Comerc)
#   comerc.siumax.duckdns.org  -> sistema de pruebas de Comerc (misma carpeta, base `siumax` y API 3001 de siempre)
#   servic.siumax.duckdns.org  -> sistema de pruebas de SiuMax Servic (por ahora, página "en preparación")
#   panel.siumax.duckdns.org   -> se elimina
# Solo toca configuraciones de Nginx y certificados: ninguna base de datos ni API. Evicamp no se toca.
# Si algo falla, vuelve sola a la configuración de antes.
set -Eeuo pipefail   # -E: la vuelta atrás también corre si algo falla dentro de una función
source /opt/siuhub/siuhub-lib.sh

FECHA=$(date +%Y%m%d-%H%M%S)
BK="/root/backups/ordenar-links-$FECHA"
mkdir -p "$BK"
cp -a /etc/nginx/sites-available /etc/nginx/sites-enabled "$BK/"
echo "Respaldo de Nginx en $BK"

volver_atras() {
  echo "!! Algo falló: se vuelve a la configuración de antes ($BK)." >&2
  rm -rf /etc/nginx/sites-available /etc/nginx/sites-enabled
  cp -a "$BK/sites-available" "$BK/sites-enabled" /etc/nginx/
  nginx -t && systemctl reload nginx
  systemctl restart siuhub-panel || true
}
trap volver_atras ERR

WEB_PRUEBAS="/var/www/siuhub/html"
HOST_SERVIC="servic.$DOMINIO_BASE"

echo "== 1/4 Pruebas de Comerc: https://$HOST_PRUEBAS"
if ! grep -qs "listen 443" /etc/nginx/sites-available/comerc; then
  # Copia exacta de la configuración del sistema de pruebas (API, límite de login, fotos, sugerencias),
  # solo cambia el link y su certificado
  grep -q "server_name $DOMINIO_BASE;" /etc/nginx/sites-available/siumax
  sitio_con_certificado comerc "$HOST_PRUEBAS"
  sed "s#$DOMINIO_BASE#$HOST_PRUEBAS#g" /etc/nginx/sites-available/siumax > /etc/nginx/sites-available/comerc
  sed -i "1i # SiuMax Comerc - sistema de pruebas (base siumax, API puerto 3001). Creado por ordenar-links.sh" /etc/nginx/sites-available/comerc
  ln -sf /etc/nginx/sites-available/comerc /etc/nginx/sites-enabled/comerc
  recargar_nginx
fi

echo "== 2/4 Pruebas de Servic: https://$HOST_SERVIC"
mkdir -p /var/www/servic/html
cat > /var/www/servic/html/index.html <<'EOF'
<!doctype html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>SiuMax Servic</title>
<style>
:root{--bg:#F8FAFC;--ink:#1E293B;--muted:#64748B;--accent:#10B981}
@media (prefers-color-scheme:dark){:root{--bg:#0F172A;--ink:#F1F5F9;--muted:#94A3B8}}
*{border-radius:0}
html,body{height:100%;margin:0}
body{display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--ink);padding:16px;box-sizing:border-box;font-family:ui-monospace,Menlo,Consolas,monospace;text-align:center}
.caja{border:2px solid var(--ink);padding:32px 24px;max-width:460px}
h1{margin:0 0 12px;font-size:20px;letter-spacing:.15em;text-transform:uppercase}
h1 span{color:var(--accent)}
p{margin:0;font-size:14px;line-height:1.6;color:var(--muted)}
</style></head>
<body><div class="caja"><h1>SiuMax<span>.</span> Servic</h1>
<p>Sistema para talleres y servicios.<br>En preparación.</p></div></body></html>
EOF
chown -R www-data:www-data /var/www/servic
if ! grep -qs "listen 443" /etc/nginx/sites-available/servic; then
  sitio_con_certificado servic "$HOST_SERVIC"
  cat > /etc/nginx/sites-available/servic <<EOF
# SiuMax Servic - sistema de pruebas (por ahora solo la página "en preparación"). Creado por ordenar-links.sh
server {
    listen 443 ssl;
    server_name $HOST_SERVIC;

$(ssl_de "$HOST_SERVIC")

    root /var/www/servic/html;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

server {
    listen 80;
    server_name $HOST_SERVIC;
    return 301 https://\$host\$request_uri;
}
EOF
  ln -sf /etc/nginx/sites-available/servic /etc/nginx/sites-enabled/servic
  recargar_nginx
fi

echo "== 3/4 Panel de Control: https://$DOMINIO_BASE"
# El sistema de pruebas ya responde en comerc.siumax; su configuración vieja queda guardada en sites-available/siumax
rm -f /etc/nginx/sites-enabled/siumax
bash "$DIR_SIUMAX/instalar-panel.sh"

echo "== 4/4 Revisión"
codigo() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
contiene() { local t; t=$(curl -s --max-time 20 "$1"); [[ "$t" == *"$2"* ]]; }
revisar() { # revisar <qué> <comando...>
  local que="$1"; shift
  if "$@"; then echo "   OK  $que"; else echo "   MAL $que" >&2; false; fi
}
revisar "Pruebas de Comerc abre"                 contiene "https://$HOST_PRUEBAS/" "SiuMax"
revisar "Pruebas de Comerc: API pide sesión"     test "$(codigo "https://$HOST_PRUEBAS/rest/v1/products?limit=1")" = 401
revisar "Pruebas de Servic abre"                 contiene "https://$HOST_SERVIC/" "SiuMax"
revisar "Panel abre"                             contiene "https://$DOMINIO_BASE/" "Panel de Control"
revisar "Actualizaciones de la app de PC"        test "$(codigo "https://$DOMINIO_BASE/actualizaciones/latest.yml")" = 200
revisar "Evicamp abre"                           test "$(codigo "https://evicamp.duckdns.org/")" = 200
revisar "EviDiary abre"                          test "$(codigo "https://evi.siumax.duckdns.org/")" = 200
trap - ERR

echo "== Se elimina panel.$DOMINIO_BASE (su configuración ya fue reemplazada por la del panel nuevo)"
certbot delete --cert-name "panel.$DOMINIO_BASE" --non-interactive > /dev/null 2>&1 || true

echo "LISTO. Panel: https://$DOMINIO_BASE | Comerc: https://$HOST_PRUEBAS | Servic: https://$HOST_SERVIC"
