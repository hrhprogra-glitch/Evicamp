#!/bin/bash
# Suspende o reactiva un cliente (por ejemplo, por falta de pago). Sus datos NO se borran.
# Uso: estado-cliente.sh <slug> suspender|activar
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

SLUG="${1:-}"; ACCION="${2:-}"
validar_slug "$SLUG"
PUERTO=$(dato_registro "$SLUG" 3)
[ -n "$PUERTO" ] || { echo "ERROR: no existe el cliente '$SLUG'." >&2; exit 1; }

case "$ACCION" in
  suspender)
    escribir_nginx "$SLUG" "$PUERTO" suspendido
    recargar_nginx
    systemctl stop "postgrest-cliente@$SLUG"   # libera memoria mientras está suspendido
    cambiar_estado_registro "$SLUG" SUSPENDIDO
    echo "Cliente $SLUG SUSPENDIDO (sus datos se conservan)."
    ;;
  activar)
    systemctl start "postgrest-cliente@$SLUG"
    escribir_nginx "$SLUG" "$PUERTO" activo
    recargar_nginx
    cambiar_estado_registro "$SLUG" ACTIVO
    echo "Cliente $SLUG ACTIVO."
    ;;
  *)
    echo "Uso: $0 <slug> suspender|activar" >&2; exit 1 ;;
esac
