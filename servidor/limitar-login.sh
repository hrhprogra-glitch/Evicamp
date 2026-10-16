#!/bin/bash
# Limita los intentos de login: máximo 10 por minuto (más 5 de margen) desde una misma conexión.
# Solo cuenta el pedido de login (/rest/v1/rpc/fn_login); el resto del sistema no se limita.
# Aplica a Evicamp, SiuMax y todos los clientes. Se puede ejecutar varias veces sin problema.
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

cat > /etc/nginx/conf.d/siumax-login.conf <<'EOF'
# SiuMax: la clave de la zona solo existe para el login; los demás pedidos (clave vacía) no se limitan
map $request_uri $siumax_clave_login {
    ~^/rest/v1/rpc/fn_login  $binary_remote_addr;
    default                  "";
}
limit_req_zone $siumax_clave_login zone=siumax_login:10m rate=10r/m;
EOF

# Sitios con su propia configuración (Evicamp y SiuMax): una línea dentro de su bloque HTTPS
for sitio in /etc/nginx/sites-available/evicamp /etc/nginx/sites-available/siumax; do
  [ -f "$sitio" ] || continue
  grep -q "zone=siumax_login" "$sitio" && continue
  cp "$sitio" "$sitio.antes-limite-login"
  # después de la primera línea "listen 443" (el bloque HTTPS)
  awk '!hecho && /listen 443/ {print; print "    limit_req zone=siumax_login burst=5 nodelay;"; print "    limit_req_status 429;"; hecho=1; next} {print}' \
    "$sitio.antes-limite-login" > "$sitio"
done

# Clientes: se regenera su configuración con la plantilla (que ya trae el límite)
while IFS=$'\t' read -r slug _ puerto estado _; do
  [ -n "$slug" ] || continue
  [ -f "/etc/letsencrypt/live/$(host_cliente "$slug")/fullchain.pem" ] || continue
  if [ "$estado" = "SUSPENDIDO" ]; then escribir_nginx "$slug" "$puerto" suspendido; else escribir_nginx "$slug" "$puerto" activo; fi
done < "$REGISTRO"

if nginx -t 2>/dev/null; then
  systemctl reload nginx
  echo "Límite de login activo."
else
  echo "ERROR en la configuración; se vuelve atrás." >&2
  for sitio in /etc/nginx/sites-available/evicamp /etc/nginx/sites-available/siumax; do
    [ -f "$sitio.antes-limite-login" ] && cp "$sitio.antes-limite-login" "$sitio"
  done
  rm -f /etc/nginx/conf.d/siumax-login.conf
  nginx -t
  exit 1
fi
