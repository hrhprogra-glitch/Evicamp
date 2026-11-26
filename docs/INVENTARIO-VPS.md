# Inventario del VPS (solo lectura)

Generado automáticamente el 2026-11-26T15:10:35.141Z con `node ai-scripts/inventario-vps.cjs`.
No incluye contraseñas, claves ni hashes.

## Datos generales

### Sistema

```text
srv1490510
2026-11-26 15:08:10 UTC
Linux 6.8.0-90-generic
Ubuntu 24.04.4 LTS
```

### Uptime / carga

```text
15:08:10 up 40 days,  2:03,  1 user,  load average: 0.32, 0.18, 0.06
```

### Disco

```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        48G   13G   36G  26% /
/dev/sda16      881M   64M  756M   8% /boot
/dev/sda15      105M  6.2M   99M   6% /boot/efi
overlay          48G   13G   36G  26% /var/lib/docker/overlay2/e5316a7839fac2f0008ff9ae887f6daf6811a03438e054ed845c91000dcf0ed7/merged
overlay          48G   13G   36G  26% /var/lib/docker/overlay2/dd4eb012996f4c86722acb946055ff4d5bdb74395cbc2731adcaa35b777b898c/merged
overlay          48G   13G   36G  26% /var/lib/docker/overlay2/e82ea0748e7802ad33837c7f59e2b7c67461bdc6dfaced2328ebc2fde78d9260/merged
```

### Memoria

```text
total        used        free      shared  buff/cache   available
Mem:           3.8Gi       948Mi       467Mi       115Mi       2.7Gi       2.9Gi
Swap:          4.0Gi       256Ki       4.0Gi
```


## Servicios

### Servicios principales

```text
nginx        active
postgresql   active
postgrest    active
ssh          active
sshd         inactive
-
docker       active
pm2          inactive
-
```

### Servicios activos

```text
UNIT                                 LOAD   ACTIVE SUB     DESCRIPTION
containerd.service                   loaded active running containerd container runtime
cron.service                         loaded active running Regular background program processing daemon
dbus.service                         loaded active running D-Bus System Message Bus
docker.service                       loaded active running Docker Application Container Engine
fail2ban.service                     loaded active running Fail2Ban Service
fwupd.service                        loaded active running Firmware update daemon
getty@tty1.service                   loaded active running Getty on tty1
ModemManager.service                 loaded active running Modem Manager
nginx.service                        loaded active running A high performance web server and a reverse proxy server
polkit.service                       loaded active running Authorization Manager
postgresql@16-main.service           loaded active running PostgreSQL Cluster 16-main
postgrest-cliente@ecosistema.service loaded active running SiuMax API cliente ecosistema (PostgREST)
postgrest.service                    loaded active running Micro-Supabase API (PostgREST)
postgrest_siuhub.service             loaded active running SiuHub API (PostgREST) - base siuhub
qemu-guest-agent.service             loaded active running QEMU Guest Agent
rsyslog.service                      loaded active running System Logging Service
serial-getty@ttyS0.service           loaded active running Serial Getty on ttyS0
siudemo-api.service                  loaded active running /usr/local/bin/postgrest /etc/postgrest/siudemo.conf
siuhub-panel.service                 loaded active running SiuMax Panel de Control
siumax-facturador.service            loaded active running SiuMax facturador electronico (boletas y facturas SUNAT)
ssh.service                          loaded active running OpenBSD Secure Shell server
systemd-journald.service             loaded active running Journal Service
systemd-logind.service               loaded active running User Login Management
systemd-networkd.service             loaded active running Network Configuration
systemd-resolved.service             loaded active running Network Name Resolution
systemd-timesyncd.service            loaded active running Network Time Synchronization
systemd-udevd.service                loaded active running Rule-based Manager for Device Events and Files
udisks2.service                      loaded active running Disk Manager
unattended-upgrades.service          loaded active running Unattended Upgrades Shutdown
user@0.service                       loaded active running User Manager for UID 0

Legend: LOAD   → Reflects whether the unit definition was properly loaded.
        ACTIVE → The high-level unit activation state, i.e. generalization of SUB.
        SUB    → The low-level unit activation state, values depend on unit type.
```

### Docker

```text
evidiary-api-prueba | evidiary-api-prueba:nuevo | Up 9 hours | 
evidiary-api | evidiary-api | Up 4 weeks | 
creditaltoque-api | creditaltoque-api | Up 5 weeks |
```

### Puertos escuchando

```text
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess                                                       
LISTEN 0      400        127.0.0.1:5432       0.0.0.0:*    users:(("postgres",pid=1189777,fd=7))                        
LISTEN 0      2048       127.0.0.1:3200       0.0.0.0:*    users:(("postgrest",pid=1094732,fd=11))                      
LISTEN 0      2048       127.0.0.1:3199       0.0.0.0:*    users:(("postgrest",pid=306353,fd=11))                       
LISTEN 0      2048         0.0.0.0:3000       0.0.0.0:*    users:(("postgrest",pid=39522,fd=11))                        
LISTEN 0      4096   127.0.0.53%lo:53         0.0.0.0:*    users:(("systemd-resolve",pid=763622,fd=15))                 
LISTEN 0      511        127.0.0.1:3121       0.0.0.0:*    users:(("node",pid=1189829,fd=19))                           
LISTEN 0      511        127.0.0.1:3120       0.0.0.0:*    users:(("node",pid=239640,fd=19))                            
LISTEN 0      5          127.0.0.1:3090       0.0.0.0:*    users:(("python3",pid=1189379,fd=3))                         
LISTEN 0      4096         0.0.0.0:22         0.0.0.0:*    users:(("sshd",pid=1189745,fd=3),("systemd",pid=1,fd=258))   
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*    users:(("nginx",pid=1180840,fd=5),("nginx",pid=1178359,fd=5))
LISTEN 0      511          0.0.0.0:443        0.0.0.0:*    users:(("nginx",pid=1180840,fd=6),("nginx",pid=1178359,fd=6))
LISTEN 0      4096      127.0.0.54:53         0.0.0.0:*    users:(("systemd-resolve",pid=763622,fd=17))                 
LISTEN 0      4096       127.0.0.1:34965      0.0.0.0:*    users:(("containerd",pid=763644,fd=23))                      
LISTEN 0      512          0.0.0.0:8081       0.0.0.0:*    users:(("dotnet",pid=1256,fd=149))                           
LISTEN 0      2048       127.0.0.1:3001       0.0.0.0:*    users:(("postgrest",pid=310857,fd=11))                       
LISTEN 0      400            [::1]:5432          [::]:*    users:(("postgres",pid=1189777,fd=6))                        
LISTEN 0      4096            [::]:22            [::]:*    users:(("sshd",pid=1189745,fd=4),("systemd",pid=1,fd=259))   
LISTEN 0      511             [::]:80            [::]:*    users:(("nginx",pid=1180840,fd=8),("nginx",pid=1178359,fd=8))
LISTEN 0      511             [::]:443           [::]:*    users:(("nginx",pid=1180840,fd=7),("nginx",pid=1178359,fd=7))
```


## Organización de carpetas web

### /var/www (nivel 1 y 2)

```text
/var/www
/var/www/clientes
/var/www/creditaltoque.duckdns.org
/var/www/creditaltoque.duckdns.org/html
/var/www/ecosistema123
/var/www/ecosistema123/html
/var/www/evi.siumax.duckdns.org
/var/www/evi.siumax.duckdns.org/html
/var/www/evi.siumax.duckdns.org/html.old
/var/www/evicamp
/var/www/evicamp.duckdns.org
/var/www/evicamp.duckdns.org/html
/var/www/evicamp.duckdns.org/html.bak_1790889792
/var/www/evidiary.duckdns.org
/var/www/evidiary.duckdns.org/descargas
/var/www/evidiary.duckdns.org/descargas.old
/var/www/evidiary.duckdns.org/html
/var/www/evidiary.duckdns.org/html.old
/var/www/html
/var/www/prueba.evidiary.duckdns.org
/var/www/prueba.evidiary.duckdns.org/html
/var/www/prueba.evidiary.duckdns.org/html.old
/var/www/servic
/var/www/servic/html
/var/www/siuhub
/var/www/siuhub-app
/var/www/siuhub-app/descargas
/var/www/siuhub-app/html
/var/www/siuhub/html
/var/www/siumax-panel
```

### Bundles activos por sitio (los que sirve index.html)

```text
/var/www/creditaltoque.duckdns.org/html | | Creditos al Toque

/var/www/ecosistema123/html | /assets/index-D-gYUBB1.js /assets/index-DRCSlWbD.css | SiuMax Nego

/var/www/evi.siumax.duckdns.org/html.old | /assets/index-BARua9Ag.js /assets/index-DpTRecTw.css | EviDiary

/var/www/evi.siumax.duckdns.org/html | /assets/index-DKHgAqKA.js /assets/index-BVHFpzRW.css | SiuMax Nego

/var/www/evicamp.duckdns.org/html.bak_1790889792 | /assets/logo-CDQx5Ud3.png /assets/index-Db4xzpG5.js /assets/index-C11HGGuu.css | Evicamp

/var/www/evicamp.duckdns.org/html | /assets/index-D-gYUBB1.js /assets/index-DRCSlWbD.css | SiuMax Nego

/var/www/evidiary.duckdns.org/html.old | /assets/index-BARua9Ag.js /assets/index-DpTRecTw.css | EviDiary

/var/www/evidiary.duckdns.org/html | /assets/index-CbBjb4Ak.js /assets/index-BJN3NwJK.css | EviDiary

/var/www/prueba.evidiary.duckdns.org/html.old | /assets/index-BeGUUR8R.js /assets/index-B9KwbRHl.css | EviDiary

/var/www/prueba.evidiary.duckdns.org/html | /assets/index-KRwSNQBE.js /assets/index-DoEhEzrs.css | EviDiary

/var/www/servic/html | /assets/index-BuZ_X1Nf.js /assets/index-CXjlqYes.css | SiuMax Servic

/var/www/siuhub-app/html | /assets/index-DxoorOrB.js /assets/index-Bo7VCcsX.css | SiuMax Nego

/var/www/siuhub/html | /assets/index-C7Sz-l91.js /assets/index-DRCSlWbD.css | SiuMax Nego
```

### Sites de nginx

```text
000-desconocidos
creditaltoque
ecosistema123
evi.siumax.duckdns.org
evicamp
evidiary.duckdns.org
nego
prueba.evidiary.duckdns.org
siuhub-panel
---
```

### Certificados SSL

```text
base-evicamp.duckdns.org | Feb  8 22:08:53 2027 GMT
creditaltoque.duckdns.org | Feb 15 00:41:13 2027 GMT
demo.siumax.duckdns.org | Jan 14 14:36:59 2027 GMT
ecosistema123.duckdns.org | Feb 17 02:43:22 2027 GMT
evi.siumax.duckdns.org | Jan 20 13:19:13 2027 GMT
evicamp.duckdns.org | Feb  7 19:17:29 2027 GMT
evidiary.duckdns.org | Jan 20 18:42:04 2027 GMT
nego.siumax.duckdns.org | Feb 11 02:34:07 2027 GMT
prueba.evidiary.duckdns.org | Jan 25 12:01:20 2027 GMT
siumax.duckdns.org | Jan 14 14:36:47 2027 GMT
```


## Bases de datos PostgreSQL

Bases encontradas (8): creditaltoque, ecosistema, evidiary, evidiary_prueba, postgres, servic, siudemo, siumax

| Base | Tamaño | Tablas |
|---|---|---|
| creditaltoque | 38 MB | 43 |
| ecosistema | 30 MB | 74 |
| evidiary | 10 MB | 7 |
| evidiary_prueba | 8471 kB | 8 |
| postgres | 63 MB | 55 |
| servic | 12 MB | 55 |
| siudemo | 11 MB | 36 |
| siumax | 16 MB | 58 |


## Base creditaltoque — tablas y filas

| Tabla | Filas |
|---|---|
| tlog_inserts_updates | 567 |
| tmc_credito_generacion_historial | 2 |
| tmc_cuaderno_cobranza_generacion_historial | 233 |
| tmm_aval | 0 |
| tmm_cliente | 487 |
| tmm_cliente_documento | 135 |
| tmm_cliente_seguimiento | 5 |
| tmm_moneda | 1 |
| tmm_tipo_cliente | 2 |
| tmm_tipo_credito | 4 |
| tmm_tipo_documento_cliente | 2 |
| tmm_tipo_entrega_credito | 4 |
| tmm_tipocliente_tipodocumento | 3 |
| tms_accesos_nivel1 | 6 |
| tms_accesos_nivel2 | 19 |
| tms_accesos_nivel3 | 0 |
| tms_perfil | 3 |
| tms_perfil_accesos_nivel1 | 15 |
| tms_perfil_accesos_nivel2 | 42 |
| tms_perfil_accesos_nivel3 | 0 |
| tms_permisos | 3 |
| tms_permisos_perfil | 5 |
| tms_personal | 5 |
| tms_personal_cobranza | 6 |
| tms_personal_usuario | 4 |
| tms_personal_usuario_perfil | 4 |
| ttc_cierre_diario | 176 |
| ttc_cierre_diario_resumen_cobranza_oficina | 450 |
| ttc_cierre_diario_resumen_gastos | 806 |
| ttc_cierre_diario_resumen_lista_cobranza | 478 |
| ttc_cierrecaja | 2 |
| ttc_cierrecaja_detalle | 298 |
| ttc_cierrecaja_utilidad | 0 |
| ttc_cierrecaja_utilidad_detalle | 0 |
| ttc_credito | 3508 |
| ttc_credito_cronograma | 72704 |
| ttc_credito_entrega | 3588 |
| ttc_credito_personal_cobranza | 2780 |
| ttc_cuaderno_cobranza | 269 |
| ttc_cuaderno_cobranza_detalle | 51147 |
| ttc_cuaderno_cobranza_efectivo_deposito | 49982 |
| ttc_cuaderno_cobranza_efectivo_deposito_historial | 47776 |
| ttc_cuaderno_cobranza_notas | 4 |


## Base ecosistema — tablas y filas

| Tabla | Filas |
|---|---|
| activos | 54 |
| agenda_trabajadores | 0 |
| agenda_trabajos | 0 |
| almacenes | 1 |
| batches | 618 |
| bienes_cliente | 0 |
| calendario_evento_empleados | 0 |
| calendario_eventos | 0 |
| cambios_productos | 0 |
| cash_movements | 0 |
| cash_sessions | 0 |
| categories | 2 |
| compras | 37 |
| compras_detalle | 157 |
| compras_historial | 0 |
| contrato_cobros | 0 |
| contrato_consumos | 0 |
| contrato_visitas | 0 |
| contratos | 0 |
| cotizacion_detalles | 195 |
| cotizacion_pagos | 0 |
| cotizaciones | 62 |
| cpe_correlativos | 0 |
| customers | 463 |
| debt_payments | 0 |
| empleados | 3 |
| empresa_config | 1 |
| facturacion_config | 0 |
| fiados | 0 |
| grupos_clientes | 0 |
| herramientas | 53 |
| herramientas_prestamos | 0 |
| inventory_movements | 4836 |
| mantenimientos_activos | 1 |
| migracion_eco_log | 0 |
| notas_credito | 0 |
| notas_credito_lineas | 0 |
| pedido_detalles | 0 |
| pedidos_clientes | 0 |
| piscina_consumos | 0 |
| piscina_materiales | 0 |
| piscina_pagos | 0 |
| piscinas | 0 |
| product_recipes | 0 |
| product_variants | 0 |
| products | 515 |
| proveedores | 16 |
| providers | 0 |
| purchase_items | 157 |
| purchases | 37 |
| respaldo_fase1_unidades | 0 |
| sale_details | 0 |
| sale_items | 195 |
| sales | 62 |
| salida_devoluciones | 1255 |
| salida_items | 3042 |
| salida_trabajadores | 22 |
| salidas | 417 |
| sesiones | 86 |
| store_transfer_items | 0 |
| store_transfers | 0 |
| stores | 1 |
| sync_outbox | 17587 |
| sync_state | 0 |
| sync_tombstones | 8 |
| taller_ordenes | 0 |
| taller_pagos | 0 |
| taller_repuestos | 0 |
| trabajadores | 11 |
| usuarios | 3 |
| vehiculos | 1 |
| vehiculos_mantenimientos | 0 |
| waste | 0 |
| yape_notifications | 0 |


## Base evidiary — tablas y filas

| Tabla | Filas |
|---|---|
| config | 2 |
| intentos_login | 1 |
| paginas | 98 |
| recordatorios | 8 |
| sesiones | 9 |
| suscripciones_push | 1 |
| usuarios | 1 |


## Base evidiary_prueba — tablas y filas

| Tabla | Filas |
|---|---|
| config | 2 |
| intentos_login | 0 |
| llaves_huella | 0 |
| paginas | 19 |
| recordatorios | 8 |
| sesiones | 5 |
| suscripciones_push | 0 |
| usuarios | 1 |


## Base postgres — tablas y filas

| Tabla | Filas |
|---|---|
| agenda_trabajadores | 0 |
| agenda_trabajos | 0 |
| batches | 5257 |
| bienes_cliente | 0 |
| cambios_productos | 0 |
| cash_movements | 750 |
| cash_sessions | 330 |
| categories | 9 |
| compras | 3 |
| compras_detalle | 9 |
| compras_historial | 8 |
| contrato_cobros | 0 |
| contrato_consumos | 0 |
| contrato_visitas | 0 |
| contratos | 0 |
| cotizacion_detalles | 1 |
| cotizacion_pagos | 0 |
| cotizaciones | 1 |
| cpe_correlativos | 0 |
| customers | 73 |
| debt_payments | 784 |
| empleados | 2 |
| empresa_config | 1 |
| facturacion_config | 1 |
| fiados | 768 |
| grupos_clientes | 0 |
| herramientas | 0 |
| herramientas_prestamos | 0 |
| inventory_movements | 45964 |
| notas_credito | 0 |
| pedido_detalles | 0 |
| pedidos_clientes | 0 |
| product_recipes | 0 |
| product_variants | 0 |
| products | 1296 |
| providers | 2 |
| respaldo_fase1_unidades | 1296 |
| sale_details | 31338 |
| sales | 4887 |
| salida_devoluciones | 0 |
| salida_items | 0 |
| salida_trabajadores | 0 |
| salidas | 0 |
| sesiones | 10 |
| store_transfer_items | 0 |
| store_transfers | 0 |
| stores | 1 |
| taller_ordenes | 0 |
| taller_pagos | 0 |
| taller_repuestos | 0 |
| trabajadores | 0 |
| vehiculos | 0 |
| vehiculos_mantenimientos | 0 |
| waste | 48 |
| yape_notifications | 2 |


## Base servic — tablas y filas

| Tabla | Filas |
|---|---|
| agenda_trabajadores | 0 |
| agenda_trabajos | 0 |
| batches | 0 |
| bienes_cliente | 0 |
| cambios_productos | 0 |
| cash_movements | 0 |
| cash_sessions | 1 |
| categories | 0 |
| compras | 0 |
| compras_detalle | 0 |
| compras_historial | 0 |
| contrato_cobros | 0 |
| contrato_consumos | 0 |
| contrato_visitas | 0 |
| contratos | 0 |
| cotizacion_detalles | 0 |
| cotizacion_pagos | 0 |
| cotizaciones | 0 |
| cpe_correlativos | 0 |
| customers | 1 |
| debt_payments | 0 |
| empleados | 1 |
| empresa_config | 1 |
| facturacion_config | 0 |
| fiados | 0 |
| grupos_clientes | 0 |
| herramientas | 0 |
| herramientas_prestamos | 0 |
| inventory_movements | 2 |
| notas_credito | 0 |
| pedido_detalles | 0 |
| pedidos_clientes | 0 |
| product_recipes | 0 |
| product_variants | 0 |
| products | 2 |
| providers | 0 |
| respaldo_fase1_unidades | 0 |
| sale_details | 0 |
| sales | 0 |
| salida_devoluciones | 0 |
| salida_items | 0 |
| salida_trabajadores | 0 |
| salidas | 0 |
| sesiones | 113 |
| store_transfer_items | 0 |
| store_transfers | 0 |
| stores | 1 |
| taller_ordenes | 0 |
| taller_pagos | 0 |
| taller_repuestos | 0 |
| trabajadores | 1 |
| vehiculos | 4 |
| vehiculos_mantenimientos | 4 |
| waste | 0 |
| yape_notifications | 0 |


## Base siudemo — tablas y filas

| Tabla | Filas |
|---|---|
| _bk_fiados_cap6 | 9 |
| batches | 42 |
| cambios_productos | 1 |
| cash_movements | 12 |
| cash_sessions | 13 |
| categories | 7 |
| compras | 1 |
| compras_detalle | 2 |
| compras_historial | 2 |
| cotizacion_detalles | 3 |
| cotizaciones | 1 |
| cpe_correlativos | 2 |
| customers | 7 |
| debt_payments | 8 |
| empleados | 2 |
| empresa_config | 1 |
| facturacion_config | 1 |
| fiados | 9 |
| grupos_clientes | 1 |
| inventory_movements | 305 |
| notas_credito | 1 |
| pedido_detalles | 2 |
| pedidos_clientes | 1 |
| product_recipes | 5 |
| product_variants | 3 |
| products | 39 |
| providers | 3 |
| respaldo_fase1_unidades | 39 |
| sale_details | 255 |
| sales | 100 |
| sesiones | 115 |
| store_transfer_items | 0 |
| store_transfers | 0 |
| stores | 1 |
| waste | 3 |
| yape_notifications | 0 |


## Base siumax — tablas y filas

| Tabla | Filas |
|---|---|
| agenda_trabajadores | 0 |
| agenda_trabajos | 0 |
| batches | 615 |
| bienes_cliente | 0 |
| cambios_productos | 0 |
| cash_movements | 0 |
| cash_sessions | 1 |
| categories | 34 |
| compras | 37 |
| compras_detalle | 157 |
| compras_historial | 0 |
| contrato_cobros | 0 |
| contrato_consumos | 0 |
| contrato_visitas | 0 |
| contratos | 50 |
| cotizacion_detalles | 195 |
| cotizacion_pagos | 43 |
| cotizaciones | 63 |
| cpe_correlativos | 4 |
| customers | 505 |
| debt_payments | 0 |
| empleados | 1 |
| empresa_config | 1 |
| facturacion_config | 1 |
| fiados | 0 |
| grupos_clientes | 0 |
| herramientas | 53 |
| herramientas_prestamos | 29 |
| inventory_movements | 1815 |
| migracion_eco_log | 7713 |
| notas_credito | 0 |
| pedido_detalles | 100 |
| pedidos_clientes | 50 |
| product_recipes | 0 |
| product_variants | 0 |
| products | 513 |
| providers | 16 |
| respaldo_fase1_unidades | 0 |
| sale_details | 52 |
| sales | 51 |
| salida_devoluciones | 0 |
| salida_fusion_items | 2 |
| salida_fusiones | 1 |
| salida_items | 2895 |
| salida_trabajadores | 415 |
| salidas | 395 |
| sesiones | 1056 |
| store_transfer_items | 0 |
| store_transfers | 0 |
| stores | 2 |
| taller_ordenes | 50 |
| taller_pagos | 0 |
| taller_repuestos | 0 |
| trabajadores | 16 |
| vehiculos | 13 |
| vehiculos_mantenimientos | 1 |
| waste | 50 |
| yape_notifications | 0 |


## Usuarios de base (sin contraseñas ni hashes)

### Roles

```text
anon | login=false | super=false
creditaltoque_app | login=true | super=false
evidiary | login=true | super=false
evidiary_prueba | login=true | super=false
postgres | login=true | super=true
web_anon | login=false | super=false
```


## Respaldos

### Archivos de respaldo

```text
2026-11-26 03:30 | 417023 bytes | /var/backups/evidiary/evidiary-2026-11-26.dump
2026-11-26 03:00 | 796684 bytes | /var/backups/siuhub/servic/servic-20261126-0300.dump
2026-11-26 03:00 | 74273 bytes | /var/backups/siuhub/evidiary_prueba/evidiary_prueba-20261126-0300.dump
2026-11-26 03:00 | 584628 bytes | /var/backups/siuhub/siudemo/siudemo-20261126-0300.dump
2026-11-26 03:00 | 417023 bytes | /var/backups/siuhub/evidiary/evidiary-20261126-0300.dump
2026-11-26 03:00 | 3605132 bytes | /var/backups/siuhub/creditaltoque/creditaltoque-20261126-0300.dump
2026-11-26 03:00 | 23343582 bytes | /var/backups/siuhub/postgres/postgres-20261126-0300.dump
2026-11-26 03:00 | 2185759 bytes | /var/backups/siuhub/ecosistema/ecosistema-20261126-0300.dump
2026-11-26 03:00 | 1301389 bytes | /var/backups/siuhub/siumax/siumax-20261126-0300.dump
2026-11-25 21:35 | 1300650 bytes | /root/backups/siumax-antes-fusiones-20261125213542.dump
2026-11-25 21:32 | 1300423 bytes | /root/backups/siumax-antes-restaurar-ejemplo-20261125213221.dump
2026-11-25 21:30 | 1300287 bytes | /root/backups/siumax-antes-restaurar-ejemplo-20261125213045.dump
2026-11-25 21:14 | 1298373 bytes | /root/backups/siumax-antes-fusiones-20261125211431.dump
2026-11-25 21:03 | 1297399 bytes | /root/backups/siumax-antes-restaurar-grupo-20261125210258.dump
2026-11-25 20:05 | 1268836 bytes | /root/backups/siumax-antes-fusiones-20261125200545.dump
2026-11-25 03:30 | 417023 bytes | /var/backups/evidiary/evidiary-2026-11-25.dump
2026-11-25 03:00 | 796684 bytes | /var/backups/siuhub/servic/servic-20261125-0300.dump
2026-11-25 03:00 | 74271 bytes | /var/backups/siuhub/evidiary_prueba/evidiary_prueba-20261125-0300.dump
2026-11-25 03:00 | 584628 bytes | /var/backups/siuhub/siudemo/siudemo-20261125-0300.dump
2026-11-25 03:00 | 417023 bytes | /var/backups/siuhub/evidiary/evidiary-20261125-0300.dump
2026-11-25 03:00 | 3605132 bytes | /var/backups/siuhub/creditaltoque/creditaltoque-20261125-0300.dump
2026-11-25 03:00 | 23331943 bytes | /var/backups/siuhub/postgres/postgres-20261125-0300.dump
2026-11-25 03:00 | 2169380 bytes | /var/backups/siuhub/ecosistema/ecosistema-20261125-0300.dump
2026-11-25 03:00 | 1256873 bytes | /var/backups/siuhub/siumax/siumax-20261125-0300.dump
2026-11-24 15:09 | 1217718 bytes | /root/backups/siumax-antes-cliente-nota-20261124150937.dump
2026-11-24 05:58 | 33572 bytes | /var/backups/ecosistema_salidas_pre_2026-11-24T05-58-44-846Z.dump
2026-11-24 05:58 | 14554 bytes | /var/backups/ecosistema_salidas_pre_2026-11-24T05-58-03-128Z.dump
2026-11-24 05:57 | 14554 bytes | /var/backups/ecosistema_salidas_pre_2026-11-24T05-57-15-604Z.dump
2026-11-24 05:55 | 14554 bytes | /var/backups/ecosistema_salidas_pre_2026-11-24T05-55-34-534Z.dump
2026-11-24 05:21 | 800663 bytes | /var/backups/ecosistema_pre_migracion_2026-11-24T05-21-40-472Z.dump
2026-11-24 03:30 | 417023 bytes | /var/backups/evidiary/evidiary-2026-11-24.dump
2026-11-24 03:00 | 796684 bytes | /var/backups/siuhub/servic/servic-20261124-0300.dump
2026-11-24 03:00 | 74272 bytes | /var/backups/siuhub/evidiary_prueba/evidiary_prueba-20261124-0300.dump
2026-11-24 03:00 | 584628 bytes | /var/backups/siuhub/siudemo/siudemo-20261124-0300.dump
2026-11-24 03:00 | 417023 bytes | /var/backups/siuhub/evidiary/evidiary-20261124-0300.dump
2026-11-24 03:00 | 3605132 bytes | /var/backups/siuhub/creditaltoque/creditaltoque-20261124-0300.dump
2026-11-24 03:00 | 23002614 bytes | /var/backups/siuhub/postgres/postgres-20261124-0300.dump
2026-11-24 03:00 | 1216629 bytes | /var/backups/siuhub/siumax/siumax-20261124-0300.dump
2026-11-24 03:00 | 1210507 bytes | /var/backups/siuhub/ecosistema/ecosistema-20261124-0300.dump
2026-11-24 01:27 | 912621 bytes | /root/respaldos_creditaltoque/20261123_cuaderno/cuaderno.dump
2026-11-23 18:38 | 1211332 bytes | /root/backups/siumax-antes-secuencia-salidas-20261123183819.dump
2026-11-23 18:07 | 1210739 bytes | /root/backups/siumax-antes-tienda-id1-20261123180724.dump
2026-11-23 18:07 | 1210739 bytes | /root/backups/siumax-antes-tienda-id1-20261123180709.dump
2026-11-23 16:34 | 1200172 bytes | /root/backups/siumax-antes-carga-datos-20261123163407.dump
2026-11-23 16:32 | 1200172 bytes | /root/backups/siumax-antes-carga-datos-20261123163254.dump
2026-11-23 16:30 | 846997 bytes | /root/backups/siumax-antes-carga-datos-20261123163033.dump
2026-11-23 15:58 | 1208749 bytes | /root/backups/ecosistema-antes-usuarios-20261123155832.dump
2026-11-23 15:57 | 855888 bytes | /root/backups/ecosistema-antes-carga-datos-20261123155706.dump
2026-11-23 15:43 | 855810 bytes | /root/backups/ecosistema-antes-quitar-admins-20261123154334.dump
2026-11-23 15:29 | 845756 bytes | /root/backups/siumax-antes-quitar-admins-20261123152942.dump
2026-11-23 15:22 | 1212055 bytes | /root/backups/ecosistema-antes-limpieza-20261123152155..dump
2026-11-23 15:21 | 1203743 bytes | /root/backups/siumax-antes-limpieza-20261123152155..dump
2026-11-23 15:21 | 1203731 bytes | /root/backups/siumax-antes-limpieza-20261123152142..dump
2026-11-23 03:30 | 410021 bytes | /var/backups/evidiary/evidiary-2026-11-23.dump
2026-11-23 03:00 | 796684 bytes | /var/backups/siuhub/servic/servic-20261123-0300.dump
2026-11-23 03:00 | 74269 bytes | /var/backups/siuhub/evidiary_prueba/evidiary_prueba-20261123-0300.dump
2026-11-23 03:00 | 584628 bytes | /var/backups/siuhub/siudemo/siudemo-20261123-0300.dump
2026-11-23 03:00 | 410021 bytes | /var/backups/siuhub/evidiary/evidiary-20261123-0300.dump
2026-11-23 03:00 | 3601703 bytes | /var/backups/siuhub/creditaltoque/creditaltoque-20261123-0300.dump
2026-11-23 03:00 | 22815073 bytes | /var/backups/siuhub/postgres/postgres-20261123-0300.dump
```


## Espacio por carpeta web

### du -h

```text
4.0K	/var/www/clientes
4.0K	/var/www/evicamp
8.0K	/var/www/html
8.0K	/var/www/siumax-panel
1.6M	/var/www/prueba.evidiary.duckdns.org
22M	/var/www/evi.siumax.duckdns.org
91M	/var/www/creditaltoque.duckdns.org
159M	/var/www/evidiary.duckdns.org
196M	/var/www/servic
198M	/var/www/siuhub-app
234M	/var/www/evicamp.duckdns.org
269M	/var/www/ecosistema123
2.1G	/var/www/siuhub
3.2G	/var/www
```
