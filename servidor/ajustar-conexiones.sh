#!/bin/bash
# Más clientes en el mismo servidor: cada API de cliente reserva menos conexiones a la base y PostgreSQL
# acepta más en total. Antes: 10 por cliente y 100 en total (~8 clientes). Ahora: 4 por cliente y 200 en total.
# Evicamp (el sistema con más movimiento) conserva 10. Se puede ejecutar varias veces sin problema.
# OJO: si cambia el máximo de PostgreSQL hay que reiniciarlo (todas las APIs se cortan unos segundos).
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

POOL_CLIENTE=4
POOL_EVICAMP=10
MAX_CONEXIONES=200

poner_pool() { # poner_pool <archivo.conf> <cantidad>
  if grep -q '^db-pool *=' "$1"; then sed -i "s/^db-pool *=.*/db-pool = $2/" "$1"; else echo "db-pool = $2" >> "$1"; fi
}

echo "== Conexiones por API"
poner_pool /etc/postgrest.conf "$POOL_EVICAMP"
poner_pool "$CONF_POSTGREST_BASE" "$POOL_CLIENTE"      # SiuMax pruebas y plantilla de los clientes nuevos
for conf in "$DIR_CONF_CLIENTES"/*.conf; do
  [ -f "$conf" ] && poner_pool "$conf" "$POOL_CLIENTE"
done

echo "== Máximo de conexiones de PostgreSQL"
actual=$(sudo -u postgres psql -At -c "show max_connections")
if [ "$actual" -lt "$MAX_CONEXIONES" ]; then
  sudo -u postgres psql -q -c "ALTER SYSTEM SET max_connections = $MAX_CONEXIONES"
  echo "   $actual -> $MAX_CONEXIONES (reiniciando PostgreSQL unos segundos)"
  systemctl restart postgresql
  sleep 3
else
  echo "   ya está en $actual"
fi

echo "== Reiniciando las APIs"
systemctl restart postgrest postgrest_siuhub
for conf in "$DIR_CONF_CLIENTES"/*.conf; do
  [ -f "$conf" ] || continue
  slug=$(basename "$conf" .conf)
  systemctl is-enabled --quiet "postgrest-cliente@$slug" 2>/dev/null && systemctl restart "postgrest-cliente@$slug" || true
done
sleep 3
echo "   PostgreSQL: $(systemctl is-active postgresql) | Evicamp: $(systemctl is-active postgrest) | SiuMax: $(systemctl is-active postgrest_siuhub)"
echo "   máximo: $(sudo -u postgres psql -At -c 'show max_connections') conexiones"
