#!/bin/bash
# Borra un cliente de SiuMax: su base, su API, su link y su certificado.
# Seguros: solo si está SUSPENDIDO, y antes deja un backup final en $DIR_ELIMINADOS (se guarda 30 días).
# Uso: borrar-cliente.sh <slug>
# Restaurar el backup final en una base nueva:
#   sudo -u postgres createdb cli_x && sudo -u postgres pg_restore -d cli_x <archivo.dump>
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

DIR_ELIMINADOS="/var/backups/siuhub-eliminados"
SLUG="${1:-}"
validar_slug "$SLUG"
ESTADO=$(dato_registro "$SLUG" 4)
[ -n "$ESTADO" ] || { echo "ERROR: no existe el cliente '$SLUG'." >&2; exit 1; }
[ "$ESTADO" = "SUSPENDIDO" ] || { echo "ERROR: primero suspende al cliente '$SLUG'." >&2; exit 1; }

HOST=$(host_cliente "$SLUG")
BASE=$(base_cliente "$SLUG")
FECHA=$(date +%Y%m%d-%H%M)

echo "== 1/5 Backup final de $BASE"
mkdir -p "$DIR_ELIMINADOS"
chmod 700 "$DIR_ELIMINADOS"
FINAL="$DIR_ELIMINADOS/$BASE-$FECHA.dump"
if sudo -u postgres psql -Atc "select 1 from pg_database where datname='$BASE'" | grep -q 1; then
  sudo -u postgres pg_dump -Fc "$BASE" > "$FINAL"
  [ -s "$FINAL" ] || { rm -f "$FINAL"; echo "ERROR: el backup final salió vacío; no se borró nada." >&2; exit 1; }
  echo "   $FINAL ($(du -h "$FINAL" | cut -f1))"
fi
# Los backups diarios de este cliente pasan también a la carpeta de eliminados
if [ -d "/var/backups/siuhub/$BASE" ]; then
  mv "/var/backups/siuhub/$BASE" "$DIR_ELIMINADOS/$BASE-diarios-$FECHA"
fi

echo "== 2/5 API"
systemctl disable --now "postgrest-cliente@$SLUG" > /dev/null 2>&1 || true
rm -f "$DIR_CONF_CLIENTES/$SLUG.conf"

echo "== 3/5 Link y certificado ($HOST)"
rm -f "/etc/nginx/sites-enabled/cli-$SLUG" "/etc/nginx/sites-available/cli-$SLUG"
# Links viejos que redirigían a este cliente (si se le cambió el link)
if [ -f "$REDIRECCIONES" ]; then
  for viejo in $(awk -F'\t' -v s="$SLUG" '$2==s {print $1}' "$REDIRECCIONES"); do
    quitar_redireccion "$viejo"
    borrar_certificado "$viejo"
  done
fi
recargar_nginx
borrar_certificado "$SLUG"

echo "== 4/5 Base de datos y archivos"
sudo -u postgres dropdb --if-exists "$BASE"
rm -rf "${DIR_CLIENTES:?}/$SLUG"

echo "== 5/5 Registro"
awk -F'\t' -v s="$SLUG" '$1!=s' "$REGISTRO" > "$REGISTRO.tmp" && mv "$REGISTRO.tmp" "$REGISTRO"

echo "BORRADO: $SLUG. Backup final: $FINAL (se guarda 30 días)"
