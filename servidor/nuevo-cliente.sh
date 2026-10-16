#!/bin/bash
# Crea un cliente nuevo de SiuMax en un solo paso.
# Uso: CLAVE_ADMIN='secreta' nuevo-cliente.sh <slug> "<Nombre del negocio>" <correo-admin>
# La contraseña va por variable de entorno para que no quede en el historial de comandos.
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

SLUG="${1:-}"; NOMBRE="${2:-}"; CORREO="${3:-}"
[ -n "$SLUG" ] && [ -n "$NOMBRE" ] && [ -n "$CORREO" ] && [ -n "${CLAVE_ADMIN:-}" ] || {
  echo "Uso: CLAVE_ADMIN='...' $0 <slug> \"<Nombre del negocio>\" <correo-admin>" >&2; exit 1; }
validar_slug "$SLUG"
[[ "$CORREO" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || { echo "ERROR: correo inválido." >&2; exit 1; }
[ ${#CLAVE_ADMIN} -ge 6 ] || { echo "ERROR: la contraseña debe tener al menos 6 caracteres." >&2; exit 1; }

HOST=$(host_cliente "$SLUG")
BASE=$(base_cliente "$SLUG")
[ -z "$(dato_registro "$SLUG" 1)" ] || { echo "ERROR: el cliente '$SLUG' ya existe." >&2; exit 1; }
if sudo -u postgres psql -Atc "select 1 from pg_database where datname='$BASE'" | grep -q 1; then
  echo "ERROR: ya existe la base $BASE." >&2; exit 1
fi
PUERTO=$(siguiente_puerto)

# Si algo falla, se deshace lo creado para no dejar un cliente a medias
CREADO_BASE=0; CREADO_API=0; CREADO_NGINX=0
deshacer() {
  echo "!! Falló la creación. Deshaciendo cambios..." >&2
  if [ $CREADO_NGINX = 1 ]; then rm -f "/etc/nginx/sites-enabled/cli-$SLUG" "/etc/nginx/sites-available/cli-$SLUG"; recargar_nginx || true; fi
  if [ $CREADO_API = 1 ]; then systemctl disable --now "postgrest-cliente@$SLUG" 2>/dev/null || true; rm -f "$DIR_CONF_CLIENTES/$SLUG.conf"; fi
  if [ $CREADO_BASE = 1 ]; then sudo -u postgres dropdb --if-exists "$BASE" || true; fi
  rm -rf "${DIR_CLIENTES:?}/$SLUG"
}
trap deshacer ERR

echo "== 1/6 Base de datos $BASE (estructura copiada de SiuMax, sin datos)"
sudo -u postgres createdb "$BASE"
CREADO_BASE=1
sudo -u postgres pg_dump --schema-only siuhub | sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d "$BASE" > /dev/null

echo "== 2/6 Empresa y usuario administrador"
PERMISOS=$(sudo -u postgres psql -At -d siuhub -c "select permisos from empleados where rol='Administrador' order by created_at limit 1")
[ -n "$PERMISOS" ] || PERMISOS='{}'
# Valores pasados como variables de psql (:'x') para que comillas en el nombre no rompan nada
sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d "$BASE" \
  -v nombre="$NOMBRE" -v correo="${CORREO,,}" -v clave="$CLAVE_ADMIN" -v permisos="$PERMISOS" <<'SQL'
INSERT INTO empresa_config (nombre_empresa) VALUES (upper(:'nombre'));
INSERT INTO empleados (nombre, email, password, password_hash, rol, permisos, estado)
VALUES ('Administrador', :'correo', '', crypt(:'clave', gen_salt('bf')), 'Administrador', :'permisos'::jsonb, 'ACTIVO');
SQL

echo "== 3/6 API propia (PostgREST, puerto $PUERTO)"
mkdir -p "$DIR_CONF_CLIENTES"
sed -E "s#/siuhub\"#/$BASE\"#; s#^server-port *=.*#server-port = $PUERTO#" "$CONF_POSTGREST_BASE" > "$DIR_CONF_CLIENTES/$SLUG.conf"
grep -q "/$BASE\"" "$DIR_CONF_CLIENTES/$SLUG.conf"
CREADO_API=1
systemctl enable --now "postgrest-cliente@$SLUG" > /dev/null 2>&1
sleep 3
systemctl is-active --quiet "postgrest-cliente@$SLUG"

echo "== 4/6 Link y certificado HTTPS ($HOST)"
mkdir -p "$DIR_CLIENTES/$SLUG/descargas"
# Instalador de PC genérico (pregunta el link al abrirse); se publica con build-escritorio.cjs generico
if [ -f "$APP_COMPARTIDA/../descargas/SiuMax-Setup.exe" ]; then
  cp "$APP_COMPARTIDA/../descargas/SiuMax-Setup.exe" "$DIR_CLIENTES/$SLUG/descargas/"
fi
escribir_nginx "$SLUG" "$PUERTO" http
CREADO_NGINX=1
recargar_nginx
certbot certonly --nginx -d "$HOST" --non-interactive --agree-tos --keep-until-expiring > /dev/null
escribir_nginx "$SLUG" "$PUERTO" activo
recargar_nginx

echo "== 5/6 Registro"
mkdir -p "$DIR_SIUMAX"
printf '%s\t%s\t%s\t%s\t%s\n' "$SLUG" "$NOMBRE" "$PUERTO" "ACTIVO" "$(date +%F)" >> "$REGISTRO"
trap - ERR

echo "== 6/6 Verificación"
WEB=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/")
API=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/rest/v1/empresa_config?select=nombre_empresa")
echo "Web: $WEB  |  API: $API"
echo "LISTO: https://$HOST  (admin: ${CORREO,,})"
