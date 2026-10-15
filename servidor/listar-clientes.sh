#!/bin/bash
# Lista los clientes de SiuHub con su estado real (API activa y último backup).
source /opt/siuhub/siuhub-lib.sh

printf '%-18s %-26s %-6s %-11s %-11s %-9s %s\n' "LINK" "NEGOCIO" "PUERTO" "ESTADO" "ALTA" "API" "ÚLTIMO BACKUP"
[ -f "$REGISTRO" ] || { echo "(sin clientes todavía)"; exit 0; }
while IFS=$'\t' read -r slug nombre puerto estado alta; do
  [ -n "$slug" ] || continue
  api=$(systemctl is-active "postgrest-cliente@$slug" 2>/dev/null)
  ultimo=$(ls -t "/var/backups/siuhub/$(base_cliente "$slug")"/*.dump 2>/dev/null | head -1 | grep -oE '[0-9]{8}-[0-9]{4}' || echo "-")
  printf '%-18s %-26s %-6s %-11s %-11s %-9s %s\n' "$slug" "${nombre:0:26}" "$puerto" "$estado" "$alta" "$api" "$ultimo"
done < "$REGISTRO"
