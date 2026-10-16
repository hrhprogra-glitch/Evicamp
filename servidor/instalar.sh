#!/bin/bash
# Prepara el VPS para manejar varios clientes de SiuMax. Se puede ejecutar varias veces sin problema.
# Los scripts ya fueron copiados a /opt/siuhub por ai-scripts/cliente.cjs antes de llamar a este.
set -euo pipefail
source /opt/siuhub/siuhub-lib.sh

echo "== Carpetas"
mkdir -p "$DIR_SIUMAX" "$APP_COMPARTIDA" "$DIR_CLIENTES" "$DIR_CONF_CLIENTES" /var/backups/siuhub
touch "$REGISTRO"
chmod 700 /var/backups/siuhub
chmod +x "$DIR_SIUMAX"/*.sh

echo "== Servicio de API por cliente (postgrest-cliente@<slug>)"
cat > /etc/systemd/system/postgrest-cliente@.service <<'EOF'
[Unit]
Description=SiuMax API cliente %i (PostgREST)
After=postgresql.service

[Service]
ExecStart=/usr/local/bin/postgrest /etc/postgrest/clientes/%i.conf
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

echo "== Página de servicio suspendido"
cat > "$APP_COMPARTIDA/suspendido.html" <<'EOF'
<!doctype html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Servicio suspendido</title>
<style>
html,body{height:100%;margin:0}
body{display:flex;align-items:center;justify-content:center;background:#1E293B;color:#F8FAFC;padding:16px;box-sizing:border-box;font-family:ui-monospace,Menlo,Consolas,monospace;text-align:center}
.caja{border:2px solid #F59E0B;padding:32px 24px;max-width:460px;box-shadow:6px 6px 0 0 #F59E0B}
h1{margin:0 0 12px;font-size:18px;letter-spacing:.15em;text-transform:uppercase;color:#F59E0B}
p{margin:0;font-size:14px;line-height:1.6}
.pagar{display:none;margin-top:22px}
.pagar a{display:inline-block;background:#F59E0B;color:#1E293B;font-weight:900;text-decoration:none;letter-spacing:.12em;text-transform:uppercase;padding:12px 22px;border:2px solid #F8FAFC;box-shadow:4px 4px 0 0 #F8FAFC}
.pagar a:hover,.pagar a:focus-visible{outline:none;transform:translate(-1px,-1px);box-shadow:5px 5px 0 0 #F8FAFC}
.pagar small{display:block;margin-top:12px;color:#CBD5E1;font-size:12px}
</style></head>
<body><div class="caja"><h1>Servicio suspendido</h1>
<p id="mensaje">El acceso a este sistema está suspendido temporalmente. Tus datos están guardados y seguros.<br><br>Comunícate con SiuMax para reactivarlo.</p>
<div class="pagar" id="pagar"><a id="btn-pagar" href="#" target="_blank" rel="noopener">Pagar ahora</a>
<small>Yape o tarjeta con Mercado Pago. Al pagar, tu sistema se reactiva solo.</small></div></div>
<script>
// Suspendido por falta de pago: el Panel de Control deja /suscripcion.json con el link de pago
const fechaPe = (iso) => iso ? iso.split('-').reverse().join('/') : '';
fetch('/suscripcion.json', { cache: 'no-store' })
  .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
  .then((s) => {
    if (!s || !s.pagar_url || !s.suspendido_por_pago) return;
    document.getElementById('mensaje').innerHTML = 'Tu plan de SiuMax venció el ' + fechaPe(s.proximo_pago) +
      ' y el servicio se suspendió. Tus datos están guardados y seguros.<br><br>Renueva tu plan para seguir usando el sistema.';
    const b = document.getElementById('btn-pagar');
    b.href = s.pagar_url;
    document.getElementById('pagar').style.display = 'block';
    b.focus();
  })
  .catch(() => {});
// Cuando se reactiva (por ejemplo, apenas se aprueba el pago), vuelve solo al sistema
setInterval(() => {
  fetch('/rest/v1/empresa_config?select=id&limit=1', { cache: 'no-store' })
    .then((r) => { if (r.ok) location.replace('/'); })
    .catch(() => {});
}, 15000);
</script></body></html>
EOF

echo "== Links de clientes (configuración de Nginx al día)"
while IFS=$'\t' read -r slug _ puerto estado _; do
  [ -n "$slug" ] || continue
  [ -f "/etc/letsencrypt/live/$(host_cliente "$slug")/fullchain.pem" ] || continue
  if [ "$estado" = "SUSPENDIDO" ]; then escribir_nginx "$slug" "$puerto" suspendido; else escribir_nginx "$slug" "$puerto" activo; fi
done < "$REGISTRO"
recargar_nginx

echo "== Backup diario a las 3:00 a. m."
cat > /etc/cron.d/siuhub-backup <<EOF
# SiuMax: copia diaria de todas las bases (ver $DIR_SIUMAX/backup.sh)
0 3 * * * root $DIR_SIUMAX/backup.sh
EOF
chmod 644 /etc/cron.d/siuhub-backup

echo "Instalación lista."
