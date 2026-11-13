#!/bin/bash
# Compresión (gzip) de lo que se manda al navegador: el programa del sistema (JS/CSS) y los datos de la API (JSON).
# Antes solo se comprimían las páginas HTML: los datos viajaban enteros (13/11/2026, dueño: "demora mucho en cargar").
# Uso: compresion.sh <sitio>   (el nombre del archivo en /etc/nginx/sites-available, ej. nego)
# Solo agrega "include snippets/compresion.conf;" a ESE sitio. (No se llama siumax-*.conf a propósito: Evicamp y otros
# sitios incluyen snippets/siumax-*.conf y lo recibirían sin querer.) Se puede repetir. Si Nginx da error, vuelve atrás.
set -euo pipefail
SITIO="${1:-}"
ARCHIVO="/etc/nginx/sites-available/$SITIO"
[ -n "$SITIO" ] && [ -f "$ARCHIVO" ] || { echo "Uso: $0 <sitio de /etc/nginx/sites-available>" >&2; exit 1; }

cat > /etc/nginx/snippets/compresion.conf <<'EOF'
# SiuMax: compresión gzip del programa y de los datos de la API (creado por compresion.sh)
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css text/javascript application/javascript application/json application/vnd.pgrst.object+json application/xml image/svg+xml;
EOF

if grep -q "include snippets/compresion.conf;" "$ARCHIVO"; then
  echo "El sitio $SITIO ya tenía la compresión."
else
  cp -a "$ARCHIVO" "/root/backups/$SITIO-antes-compresion-$(date +%Y%m%d-%H%M%S)"
  # Después del primer server_name (el del bloque HTTPS)
  awk 'BEGIN{hecho=0} {print} /server_name/ && !hecho {print "    include snippets/compresion.conf;   # compresion.sh"; hecho=1}' "$ARCHIVO" > "$ARCHIVO.tmp"
  mv "$ARCHIVO.tmp" "$ARCHIVO"
fi

if ! nginx -t 2>/dev/null; then
  echo "!! Nginx dio error: se quita la línea agregada." >&2
  sed -i '/include snippets\/compresion.conf;   # compresion.sh/d' "$ARCHIVO"
  nginx -t && systemctl reload nginx
  exit 1
fi
systemctl reload nginx
HOST=$(awk '/server_name/ {gsub(";","",$2); print $2; exit}' "$ARCHIVO")
JS=$(curl -s --max-time 20 "https://$HOST/" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
CE=$(curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' --max-time 20 "https://$HOST/$JS" | grep -i '^content-encoding' || true)
echo "LISTO: https://$HOST  ($JS -> ${CE:-sin compresión})"
