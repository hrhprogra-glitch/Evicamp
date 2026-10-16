#!/bin/bash
# Bloquea automáticamente a quien falle varias veces la contraseña de SSH (robots que prueban contraseñas).
# 5 intentos fallidos en 10 minutos -> esa IP queda bloqueada 1 hora; si insiste, más tiempo.
# Se puede ejecutar varias veces sin problema.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
command -v fail2ban-client > /dev/null || { apt-get update -qq; apt-get install -y -qq fail2ban > /dev/null; }

cat > /etc/fail2ban/jail.d/siumax.local <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
# Reincidentes: el bloqueo se duplica cada vez (máximo 1 semana)
bantime.increment = true
bantime.maxtime = 1w
backend = systemd

[sshd]
enabled = true
EOF

systemctl enable --now fail2ban > /dev/null 2>&1
systemctl restart fail2ban
sleep 2
fail2ban-client status sshd | sed -n '1,8p'
