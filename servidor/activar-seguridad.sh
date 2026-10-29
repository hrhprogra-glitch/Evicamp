#!/bin/bash
# Activa la protección por sesión en la API de un sistema: cada pedido debe traer una sesión válida
# (ver sql/seguridad-sesion.sql). Antes hace un backup de la base.
# Uso: activar-seguridad.sh <evicamp|siumax|clientes|link-cliente> [--quitar]
#   clientes  -> todos los clientes del registro
#   --quitar  -> vuelve atrás al instante (la API deja de exigir sesión)
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

OBJETIVO="${1:-}"; QUITAR="${2:-}"
SQL="$DIR_SIUMAX/sql/seguridad-sesion.sql"
LINEA='db-pre-request = "public.fn_verificar_peticion"'
FECHA=$(date +%Y%m%d-%H%M)
[ -f "$SQL" ] || { echo "ERROR: falta $SQL" >&2; exit 1; }

uno() { # uno <nombre> <base> <conf> <servicio> <nginx>
  local nombre="$1" base="$2" conf="$3" servicio="$4" nginx="$5"
  echo "== $nombre (base $base)"
  if [ "$QUITAR" = "--quitar" ]; then
    sed -i '/^db-pre-request/d' "$conf"
  else
    mkdir -p "$DIR_CAMBIOS"; chmod 700 "$DIR_CAMBIOS"
    sudo -u postgres pg_dump -Fc "$base" > "$DIR_CAMBIOS/$base-antes-seguridad-$FECHA.dump"
    sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d "$base" -f "$SQL"
    grep -q '^db-pre-request' "$conf" || echo "$LINEA" >> "$conf"
    # La cabecera x-sesion permitida también para el modo desarrollo (otro origen)
    [ -f "$nginx" ] && sed -i 's/content-profile, x-supabase-api-version" always;/content-profile, x-supabase-api-version, x-sesion" always;/' "$nginx"
  fi
  # Un cliente suspendido tiene su API apagada: queda listo para cuando se reactive
  if systemctl is-active --quiet "$servicio"; then
    systemctl restart "$servicio"; sleep 2
    systemctl is-active --quiet "$servicio" || { echo "   ERROR: la API no arrancó" >&2; return 1; }
    local puerto; puerto=$(awk -F'= *' '/^server-port/ {print $2}' "$conf")
    echo "   sin sesión: $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$puerto/products?select=id&limit=1")" \
         " | login: $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$puerto/empresa_config?select=id&limit=1")"
  else
    echo "   (API apagada: se aplicará al reactivarse)"
  fi
}

case "$OBJETIVO" in
  evicamp) uno Evicamp postgres /etc/postgrest.conf postgrest /etc/nginx/sites-available/evicamp ;;
  siumax)  uno SiuMax siumax /etc/postgrest_siuhub.conf postgrest_siuhub /etc/nginx/sites-available/siumax ;;
  clientes)
    while IFS=$'\t' read -r slug _ _ _ _; do
      [ -n "$slug" ] && uno "$slug" "$(base_cliente "$slug")" "$DIR_CONF_CLIENTES/$slug.conf" "postgrest-cliente@$slug" "/etc/nginx/sites-available/cli-$slug"
    done < "$REGISTRO" ;;
  *)
    validar_slug "$OBJETIVO"
    [ -n "$(dato_registro "$OBJETIVO" 1)" ] || { echo "ERROR: no existe el cliente '$OBJETIVO'." >&2; exit 1; }
    uno "$OBJETIVO" "$(base_cliente "$OBJETIVO")" "$DIR_CONF_CLIENTES/$OBJETIVO.conf" "postgrest-cliente@$OBJETIVO" "/etc/nginx/sites-available/cli-$OBJETIVO" ;;
esac
recargar_nginx
echo "Listo. Esperado: sin sesión 401 (bloqueado) y login 200.${QUITAR:+ (Protección QUITADA: sin sesión 200)}"
