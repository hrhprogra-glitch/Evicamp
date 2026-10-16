#!/bin/bash
# Copia de seguridad diaria de TODAS las bases del VPS (Evicamp, CreditAltoque, SiuMax y clientes).
# Lo ejecuta cron todos los días a las 3:00 a. m. Guarda 14 días; las más viejas se borran solas.
# Restaurar una copia en una base NUEVA (no pisa la original):
#   sudo -u postgres createdb restaurada && sudo -u postgres pg_restore -d restaurada <archivo.dump>
set -uo pipefail
DESTINO="/var/backups/siuhub"
DIAS=14
FECHA=$(date +%Y%m%d-%H%M)
LOG="$DESTINO/backup.log"
mkdir -p "$DESTINO"
chmod 700 "$DESTINO"

errores=0
for base in $(sudo -u postgres psql -At -c "select datname from pg_database where not datistemplate"); do
  mkdir -p "$DESTINO/$base"
  archivo="$DESTINO/$base/$base-$FECHA.dump"
  if sudo -u postgres pg_dump -Fc "$base" > "$archivo"; then
    echo "$(date '+%F %T') OK    $base  $(du -h "$archivo" | cut -f1)" >> "$LOG"
  else
    echo "$(date '+%F %T') ERROR $base" >> "$LOG"
    rm -f "$archivo"
    errores=$((errores + 1))
  fi
  find "$DESTINO/$base" -name "*.dump" -mtime +$DIAS -delete
done

# Backups de clientes borrados y de antes de cambiar un link: se guardan 30 días
for extra in /var/backups/siuhub-eliminados /var/backups/siuhub-cambios; do
  if [ -d "$extra" ]; then
    find "$extra" -mindepth 1 -mtime +30 -delete
    find "$extra" -mindepth 1 -type d -empty -delete
  fi
done

exit $errores
