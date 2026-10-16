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
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, apikey, prefer, x-client-info, range, accept-profile, content-profile, x-supabase-api-version, x-sesion" always;
        add_header Access-Control-Expose-Headers "Content-Range, Location, Range-Unit" always;'

  local cuerpo
  if [ "$modo" = "suspendido" ]; then
    cuerpo="
    root $APP_COMPARTIDA;
    location / {
        try_files /suspendido.html =503;
        add_header Cache-Control \"no-store\" always;
    }

    # Estado del plan: la página de suspensión muestra el botón \"Pagar ahora\"
    location = /suscripcion.json {
        alias $DIR_CLIENTES/$slug/suscripcion.json;
        add_header Cache-Control \"no-store\" always;
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

    # Máximo 10 intentos de login por minuto desde una misma conexión (ver conf.d/siumax-login.conf)
    limit_req zone=siumax_login burst=5 nodelay;
    limit_req_status 429;
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

# === Links viejos que redirigen al nuevo (cuando se cambia el link de un cliente) ===
REDIRECCIONES="$DIR_SIUMAX/redirecciones.tsv"   # link_viejo  link_nuevo  fecha
DIR_CAMBIOS="/var/backups/siuhub-cambios"       # backup previo a cada cambio de link (30 días)

redireccion_de() { # redireccion_de <link_viejo>: a qué link redirige (vacío si no redirige)
  [ -f "$REDIRECCIONES" ] || return 0
  awk -F'\t' -v s="$1" '$1==s {print $2}' "$REDIRECCIONES"
}

escribir_nginx_redireccion() { # <viejo> <nuevo>: usa el certificado que ya tenía el link viejo
  local host_viejo; host_viejo=$(host_cliente "$1")
  local archivo="/etc/nginx/sites-available/redir-$1"
  cat > "$archivo" <<EOF
# SiuMax - el link $1 cambió a $2 (generado por /opt/siuhub, no editar a mano)
server {
    listen 443 ssl;
    server_name $host_viejo;

    ssl_certificate /etc/letsencrypt/live/$host_viejo/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$host_viejo/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://$(host_cliente "$2")\$request_uri;
}

server {
    listen 80;
    server_name $host_viejo;
    return 301 https://$(host_cliente "$2")\$request_uri;
}
EOF
  ln -sf "$archivo" "/etc/nginx/sites-enabled/redir-$1"
}

agregar_redireccion() { # <viejo> <nuevo>; las que apuntaban al viejo ahora apuntan al nuevo
  touch "$REDIRECCIONES"
  awk -F'\t' -v OFS='\t' -v v="$1" -v n="$2" '$1!=v {if ($2==v) $2=n; print}' "$REDIRECCIONES" > "$REDIRECCIONES.tmp"
  printf '%s\t%s\t%s\n' "$1" "$2" "$(date +%F)" >> "$REDIRECCIONES.tmp"
  mv "$REDIRECCIONES.tmp" "$REDIRECCIONES"
  while IFS=$'\t' read -r v n _; do
    [ -n "$v" ] && escribir_nginx_redireccion "$v" "$n"
  done < "$REDIRECCIONES"
}

quitar_redireccion() { # <viejo>: el link deja de redirigir (su certificado se borra aparte, si hace falta)
  [ -f "$REDIRECCIONES" ] || return 0
  [ -n "$(redireccion_de "$1")" ] || return 0
  awk -F'\t' -v v="$1" '$1!=v' "$REDIRECCIONES" > "$REDIRECCIONES.tmp" && mv "$REDIRECCIONES.tmp" "$REDIRECCIONES"
  rm -f "/etc/nginx/sites-enabled/redir-$1" "/etc/nginx/sites-available/redir-$1"
}

borrar_certificado() { certbot delete --cert-name "$(host_cliente "$1")" --non-interactive > /dev/null 2>&1 || true; }
