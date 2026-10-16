#!/bin/bash
# Cambia el link de un cliente (ej. harry -> bodegaharry) SIN tocar sus datos:
# la base se renombra (no se copia), y el link viejo queda redirigiendo al nuevo.
# Uso: cambiar-link.sh <link-actual> <link-nuevo>
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

VIEJO="${1:-}"; NUEVO="${2:-}"
validar_slug "$VIEJO"
validar_slug "$NUEVO"
[ "$VIEJO" != "$NUEVO" ] || { echo "ERROR: el link nuevo es igual al actual." >&2; exit 1; }
PUERTO=$(dato_registro "$VIEJO" 3)
ESTADO=$(dato_registro "$VIEJO" 4)
[ -n "$PUERTO" ] || { echo "ERROR: no existe el cliente '$VIEJO'." >&2; exit 1; }
[ -z "$(dato_registro "$NUEVO" 1)" ] || { echo "ERROR: el link '$NUEVO' ya es de otro cliente." >&2; exit 1; }
# Un link que hoy redirige a otro cliente no se puede reutilizar (salvo que redirija a este mismo)
DESTINO_REDIR=$(redireccion_de "$NUEVO")
[ -z "$DESTINO_REDIR" ] || [ "$DESTINO_REDIR" = "$VIEJO" ] || {
  echo "ERROR: el link '$NUEVO' está reservado (redirige a otro cliente)." >&2; exit 1; }

BASE_VIEJA=$(base_cliente "$VIEJO"); BASE_NUEVA=$(base_cliente "$NUEVO")
HOST_NUEVO=$(host_cliente "$NUEVO")
if sudo -u postgres psql -Atc "select 1 from pg_database where datname='$BASE_NUEVA'" | grep -q 1; then
  echo "ERROR: ya existe la base $BASE_NUEVA." >&2; exit 1
fi
FECHA=$(date +%Y%m%d-%H%M)

echo "== 1/6 Backup de seguridad"
mkdir -p "$DIR_CAMBIOS"; chmod 700 "$DIR_CAMBIOS"
COPIA="$DIR_CAMBIOS/$BASE_VIEJA-antes-de-$NUEVO-$FECHA.dump"
sudo -u postgres pg_dump -Fc "$BASE_VIEJA" > "$COPIA"
[ -s "$COPIA" ] || { echo "ERROR: el backup salió vacío; no se cambió nada." >&2; exit 1; }
echo "   $COPIA"

echo "== 2/6 Certificado HTTPS de $HOST_NUEVO"
[ "$DESTINO_REDIR" = "$VIEJO" ] && quitar_redireccion "$NUEVO"   # vuelve a un link que ya tuvo
escribir_nginx "$NUEVO" "$PUERTO" http
recargar_nginx
if ! certbot certonly --nginx -d "$HOST_NUEVO" --non-interactive --agree-tos --keep-until-expiring > /dev/null; then
  rm -f "/etc/nginx/sites-enabled/cli-$NUEVO" "/etc/nginx/sites-available/cli-$NUEVO"; recargar_nginx || true
  echo "ERROR: no se pudo sacar el certificado de $HOST_NUEVO; no se cambió nada." >&2; exit 1
fi

# Desde aquí, si algo falla, se vuelve al link viejo tal como estaba
deshacer() {
  echo "!! Falló el cambio. Volviendo a $VIEJO..." >&2
  systemctl disable --now "postgrest-cliente@$NUEVO" > /dev/null 2>&1 || true
  rm -f "$DIR_CONF_CLIENTES/$NUEVO.conf"
  if sudo -u postgres psql -Atc "select 1 from pg_database where datname='$BASE_NUEVA'" | grep -q 1; then
    sudo -u postgres psql -qc "ALTER DATABASE $BASE_NUEVA RENAME TO $BASE_VIEJA" || true
  fi
  [ -d "$DIR_CLIENTES/$NUEVO" ] && [ ! -d "$DIR_CLIENTES/$VIEJO" ] && mv "$DIR_CLIENTES/$NUEVO" "$DIR_CLIENTES/$VIEJO"
  rm -f "/etc/nginx/sites-enabled/cli-$NUEVO" "/etc/nginx/sites-available/cli-$NUEVO"
  quitar_redireccion "$VIEJO"
  if [ "$ESTADO" = "SUSPENDIDO" ]; then escribir_nginx "$VIEJO" "$PUERTO" suspendido
  else systemctl enable --now "postgrest-cliente@$VIEJO" > /dev/null 2>&1 || true; escribir_nginx "$VIEJO" "$PUERTO" activo; fi
  recargar_nginx || true
}
trap deshacer ERR

echo "== 3/6 Base de datos: $BASE_VIEJA -> $BASE_NUEVA (mismos datos)"
systemctl disable --now "postgrest-cliente@$VIEJO" > /dev/null 2>&1 || true
sudo -u postgres psql -qc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$BASE_VIEJA' AND pid <> pg_backend_pid()" > /dev/null
sudo -u postgres psql -qc "ALTER DATABASE $BASE_VIEJA RENAME TO $BASE_NUEVA"

echo "== 4/6 API"
sed "s#/$BASE_VIEJA\"#/$BASE_NUEVA\"#" "$DIR_CONF_CLIENTES/$VIEJO.conf" > "$DIR_CONF_CLIENTES/$NUEVO.conf"
grep -q "/$BASE_NUEVA\"" "$DIR_CONF_CLIENTES/$NUEVO.conf"
if [ "$ESTADO" != "SUSPENDIDO" ]; then
  systemctl enable --now "postgrest-cliente@$NUEVO" > /dev/null 2>&1
  sleep 3
  systemctl is-active --quiet "postgrest-cliente@$NUEVO"
fi
rm -f "$DIR_CONF_CLIENTES/$VIEJO.conf"

echo "== 5/6 Link nuevo y redirección del viejo"
mv "$DIR_CLIENTES/$VIEJO" "$DIR_CLIENTES/$NUEVO"
if [ "$ESTADO" = "SUSPENDIDO" ]; then escribir_nginx "$NUEVO" "$PUERTO" suspendido; else escribir_nginx "$NUEVO" "$PUERTO" activo; fi
rm -f "/etc/nginx/sites-enabled/cli-$VIEJO" "/etc/nginx/sites-available/cli-$VIEJO"
agregar_redireccion "$VIEJO" "$NUEVO"
recargar_nginx
trap - ERR

echo "== 6/6 Registro y backups diarios"
awk -F'\t' -v OFS='\t' -v v="$VIEJO" -v n="$NUEVO" '$1==v {$1=n} {print}' "$REGISTRO" > "$REGISTRO.tmp" && mv "$REGISTRO.tmp" "$REGISTRO"
[ -d "/var/backups/siuhub/$BASE_VIEJA" ] && mv "/var/backups/siuhub/$BASE_VIEJA" "/var/backups/siuhub/$BASE_NUEVA"

WEB=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST_NUEVO/")
REDIR=$(curl -s -o /dev/null -w '%{http_code}' "https://$(host_cliente "$VIEJO")/")
echo "Link nuevo: $WEB  |  Link viejo (redirige): $REDIR"
echo "LISTO: https://$(host_cliente "$VIEJO") -> https://$HOST_NUEVO"
