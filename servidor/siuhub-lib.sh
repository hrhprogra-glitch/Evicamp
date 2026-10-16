#!/bin/bash
# Funciones comunes de los scripts de SiuMax en el VPS (se instalan en /opt/siuhub).
# Cada cliente: base cli_<slug>, API PostgREST propia (puerto 3100+), link <slug>.siumax.duckdns.org.

DOMINIO_BASE="siumax.duckdns.org"
DIR_SIUMAX="/opt/siuhub"
REGISTRO="$DIR_SIUMAX/clientes.tsv"           # slug  nombre  puerto  estado  fecha_alta
APP_COMPARTIDA="/var/www/siuhub-app/html"     # una sola copia del sistema para todos los clientes
DIR_CLIENTES="/var/www/clientes"              # por cliente: descargas (instalador de PC)
CONF_POSTGREST_BASE="/etc/postgrest_siuhub.conf"
DIR_CONF_CLIENTES="/etc/postgrest/clientes"
PUERTO_INICIAL=3100

host_cliente() { echo "$1.$DOMINIO_BASE"; }
base_cliente() { echo "cli_${1//-/_}"; }

# slug: solo minúsculas, números y guion; 3 a 30 caracteres; no empieza ni termina en guion
LINKS_RESERVADOS=" panel www api admin app mail ftp siuhub siumax evicamp creditaltoque descargas actualizaciones "

validar_slug() {
  [[ "$1" =~ ^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$ ]] || {
    echo "ERROR: link inválido '$1'. Usa minúsculas, números y guiones (3 a 30 caracteres)." >&2
    return 1
  }
  [[ "$LINKS_RESERVADOS" != *" $1 "* ]] || {
    echo "ERROR: el link '$1' está reservado para SiuMax. Elige otro." >&2
    return 1
  }
}

dato_registro() { # dato_registro <slug> <columna 1-5>
  [ -f "$REGISTRO" ] && awk -F'\t' -v s="$1" -v c="$2" '$1==s {print $c}' "$REGISTRO"
}

siguiente_puerto() {
  local p=$PUERTO_INICIAL
  if [ -f "$REGISTRO" ]; then
    local maximo
    maximo=$(awk -F'\t' 'NF>=3 && $3+0>m {m=$3+0} END {print m+0}' "$REGISTRO")
    [ "$maximo" -ge "$p" ] && p=$((maximo + 1))
  fi
  while ss -ltn | grep -q ":$p "; do p=$((p + 1)); done
  echo "$p"
}

cambiar_estado_registro() { # cambiar_estado_registro <slug> <ACTIVO|SUSPENDIDO>
  awk -F'\t' -v OFS='\t' -v s="$1" -v e="$2" '$1==s {$4=e} {print}' "$REGISTRO" > "$REGISTRO.tmp" && mv "$REGISTRO.tmp" "$REGISTRO"
}

# Escribe la config de Nginx del cliente.
#   modo "http"       -> solo puerto 80 (para pedir el certificado la primera vez)
#   modo "activo"     -> HTTPS con sistema + API + descargas
#   modo "suspendido" -> HTTPS mostrando la página de servicio suspendido
escribir_nginx() {
  local slug="$1" puerto="$2" modo="$3"
  local host; host=$(host_cliente "$slug")
  local archivo="/etc/nginx/sites-available/cli-$slug"

  local cors='
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, apikey, prefer, x-client-info, range, accept-profile, content-profile, x-supabase-api-version" always;
        add_header Access-Control-Expose-Headers "Content-Range, Location, Range-Unit" always;'

  local cuerpo
  if [ "$modo" = "suspendido" ]; then
    cuerpo="
    root $APP_COMPARTIDA;
    location / {
        try_files /suspendido.html =503;
    }
    location /rest/v1/ {
        return 503;
    }"
  else
    cuerpo="
    root $APP_COMPARTIDA;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Instalador de PC propio de este cliente (se conecta a su link)
    location /descargas/ {
        alias $DIR_CLIENTES/$slug/descargas/;
    }

    # Estado del plan (lo escribe el Panel de Control): el sistema avisa cuando está por vencer
    location = /suscripcion.json {
        alias $DIR_CLIENTES/$slug/suscripcion.json;
        add_header Cache-Control "no-store" always;
    }

    location /rest/v1/ {
        if (\$request_method = OPTIONS) {$cors
            add_header Access-Control-Max-Age 86400 always;
            add_header Content-Length 0 always;
            return 204;
        }
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Expose-Headers;$cors

        proxy_pass http://127.0.0.1:$puerto/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }"
  fi

  if [ "$modo" = "http" ]; then
    cat > "$archivo" <<EOF
server {
    listen 80;
    server_name $host;
    root $APP_COMPARTIDA;
}
EOF
  else
    cat > "$archivo" <<EOF
# SiuMax - cliente $slug (generado por /opt/siuhub, no editar a mano)
server {
    listen 443 ssl;
    server_name $host;

    ssl_certificate /etc/letsencrypt/live/$host/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$host/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
$cuerpo
}

server {
    listen 80;
    server_name $host;
    return 301 https://\$host\$request_uri;
}
EOF
  fi
  ln -sf "$archivo" "/etc/nginx/sites-enabled/cli-$slug"
}

recargar_nginx() {
  nginx -t 2>/dev/null && systemctl reload nginx
}
