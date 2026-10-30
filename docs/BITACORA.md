# Bitácora compartida (Claude ↔ Antigravity ↔ cualquier IA)

> **Al EMPEZAR:** lee este archivo, `AGENTS.md` y `docs/PLAN-SIUMAX-COMERC.md`.
> **Al TERMINAR, o si te vas a quedar sin uso:** escribe arriba una entrada nueva con lo que hiciste, lo que quedó a
> medias y el siguiente paso, y haz `git commit` (sin push, salvo que el dueño lo pida).
> Escribe en español simple. Lo más nuevo va primero.

---

## 29/10/2026 (noche, 37) · Antigravity
- **Pase Oficial a Producción de la Fase 4 Completa (Evicamp y GitHub) e Inicio de Fase 3:**
  - El dueño confirmó: *"perfecto ya no tengo mas pruebas ya quedo ahora en que fase estamos ???"* y dio autorización explícita para subir a producción: *"si hazlo y vamos a las fase 3"*.
  - **1. Base de datos de producción (Evicamp - base `postgres`):**
    - Se ejecutó script seguro `ai-scripts/pruebas/aplicar-fase4-completa-evicamp.cjs`.
    - Respaldo previo creado: `/var/lib/postgresql/respaldo-evicamp-antes-fase4-completa-2026-10-30T00-48-26-051Z.dump` (1.9 MB).
    - `servidor/sql/seguridad-sesion.sql` aplicado con `psql` y `SET lock_timeout = '5s'`. ERRORES: (ninguno).
    - Tablas creadas y verificadas: `cotizaciones`, `cotizacion_detalles`, `pedidos_clientes`, `pedido_detalles`.
    - Columnas creadas y verificadas: `customers.es_mayorista`, `customers.descuento_porcentaje`, `grupos_clientes.descuento_porcentaje`, `products.precio_mayorista`.
    - PostgREST recargó el esquema sin reiniciar la API ni interrumpir ventas en Evicamp.
  - **2. Despliegue de aplicación web a producción (Evicamp):**
    - `node ai-scripts/deploy.cjs evicamp`: compilación limpia y 20 archivos subidos exitosamente a `evicamp.duckdns.org`.
  - **3. Git y GitHub:**
    - Fusión limpia de la rama `fase-4-completa` a `main`.
    - `git push origin main` completado con éxito (`b8a2c9a..bd3780f`).
  - **4. Fase que sigue:** Fase 3 (Búsqueda avanzada por Marca, Modelo, Medidas y Laboratorio).

## 29/10/2026 (tarde, 36) · Antigravity
- **Selector en Modales ("Pausar Ticket en Espera" y "Detalle de Proforma / Pedido") y Corrección de Color Claro en Filas:**
  - **1. Modal "Pausar Ticket en Espera" (`ModalNombreEspera.tsx`):**
    - El dueño reportó: *"el selector no funciona ahi"*.
    - Se agregó navegación 2D por teclado con flechas:
      - En el campo de texto `input-nombre-espera`: `ArrowDown` salta a los botones de acción (`btn-confirmar-espera`), `ArrowUp` sube al botón cerrar `[ X ]`.
      - En los botones inferiores: `ArrowLeft` / `ArrowRight` alternan entre `[ Cancelar (Esc) ]` y `[ Guardar (Enter) ]`, `ArrowUp` regresa al campo de texto.
      - En el botón cerrar `[ X ]`: `ArrowDown` regresa al campo de texto.
    - Se implementó Focus Trap determinístico con `Tab` / `Shift+Tab`.
    - Se añadieron anillos de foco de alto contraste (`focus:ring-4 focus:ring-amber-400 focus:border-amber-400 focus:outline-none`) visibles tanto en tema claro como en modo oscuro.
  - **2. Corrección del color de selección claro ("otro error el color es muy claro") en Cotizaciones y Pedidos:**
    - El dueño reportó que en modo oscuro la fila seleccionada se veía con un fondo beige/amarillo claro (`bg-amber-100`) deslumbrante donde el texto blanco no se leía.
    - Se corrigieron `PestanaCotizaciones.tsx` y `PestanaPedidos.tsx` para usar variables CSS nativas del tema:
      - Fila no seleccionada: `bg-[var(--color-surface)] border-transparent hover:bg-[var(--color-bg-2)]`.
      - Fila seleccionada: `bg-[var(--color-bg-2)] border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] shadow-[2px_2px_0_0_black]` con texto nítido de alto contraste.
      - Insignias de estado adaptadas con variables CSS (`var(--color-accent-bg)`, `var(--color-warning-bg)`, etc.) eliminando fondos blancos fijos.
  - **3. Selector por teclado en modal "Detalle de Proforma" y "Detalle de Pedido" ("el selector no funciona aqui"):**
    - En `PestanaCotizaciones.tsx` y `PestanaPedidos.tsx`:
      - Autofoco inicial inmediato al abrir el modal en el primer botón disponible (`[ Convertir en Venta ]` o `[ WhatsApp Cliente ]`).
      - Navegación bidireccional completa con flechas:
        - `ArrowRight` / `ArrowLeft` entre botones de la misma fila (`[ Convertir en Venta ]` ↔ `[ Compartir WhatsApp ]`, `[ Imprimir ]` ↔ `[ Anular Cotización ]`).
        - `ArrowDown` / `ArrowUp` entre la fila superior e inferior, y hacia el botón cerrar `[ X ]`.
      - Focus Trap con `Tab` / `Shift+Tab` para que el cursor no escape ni abra el Sidebar.
      - Botones con anillo de foco dorado brillante de alto contraste (`focus:ring-4 focus:ring-amber-400 focus:border-white focus:brightness-110`).
      - Cuadros de Total y Cuentas adaptados a variables de tema (`bg-[var(--color-bg-2)] border-[var(--color-border)]`) para lectura limpia en modo oscuro.
  - **Validación y despliegue:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (4.03s).
    - `node ai-scripts/deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`). Evicamp y GitHub intactos.
    - `graphify update .` ejecutado.
- **Selector Completo en Cotizaciones, Pedidos y Recuperación de Foco Global tras Modales/Ventanas:**
  - **1. Selector de Grilla en Pestaña Cotizaciones (`PestanaCotizaciones.tsx`):**
    - El selector ya no queda atrapado en el buscador: desde `buscador-cotizaciones`, `ArrowDown` o `Enter` bajan de inmediato a la lista de cotizaciones (`coti-row-0`), y `ArrowRight` pasa a los filtros.
    - Filtros de estado (`TODAS`, `VIGENTE`, `CONVERTIDA`, `VENCIDA`, `ANULADA`): navegación con flechas `ArrowLeft` / `ArrowRight`, `ArrowDown` baja a la primera fila, `ArrowUp` regresa a la barra de pestañas.
    - Filas de cotizaciones (`coti-row-${idx}`): atributo `data-row="true"`, anillo de selector de alto contraste (`focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-100/90 focus:border-[var(--color-ink)]`), flechas `ArrowDown` y `ArrowUp` para recorrer las filas, `ArrowRight` salta al botón `[Ver Detalle]`, y `Enter` abre el modal.
    - Botón `[Ver Detalle]`: `ArrowLeft` devuelve el foco a la fila, `ArrowDown`/`ArrowUp` pasan a los botones de filas contiguas.
  - **2. Selector de Grilla en Pestaña Pedidos (`PestanaPedidos.tsx`):**
    - Exactamente la misma experiencia fluida: `buscador-pedidos` con `ArrowDown` baja a las filas de pedidos y `ArrowRight` a los filtros de estado (`TODOS`, `PENDIENTE`, `ENTREGADO`, `CANCELADO`).
    - Filas con `data-row="true"`, resaltado visual nítido y navegación completa ↑ ↓ ← → y Enter.
  - **3. Recuperación Universal del Selector al Cerrar Modales y Cambiar de Ventana ("si entro y salgo de la ventana no funciona el selector no marca nada"):**
    - En `ventanas.ts`: se expandió `FILA` para reconocer `[id^="coti-row-"]`, `[id^="ped-row-"]`, etc. Al cerrar cualquier modal (`devolver`), si el elemento guardado no existe o el foco quedó en el body, se activa automáticamente el callback de restauración de foco de la sesión activa (`programarRestauracionFoco`).
    - En `App.tsx`:
      - `recordarSeleccionEnVentanas` ahora recibe como fallback universal la restauración de la sesión activa.
      - Se añadió detector de foco de ventana (`window.addEventListener('focus', ...)`) y de clics en vacío (`document.addEventListener('click', ...)`): si el usuario sale a otra aplicación (Alt-Tab / otra ventana de Windows) o hace clic fuera y regresa, el selector se reactiva inmediatamente en la sesión activa sin dejar nada en blanco.
    - En `navegacionSesion.ts`: se añadieron `buscador-cotizaciones` y `buscador-pedidos` y la primera fila activa al orden de prioridad de foco para la sección Clientes.
    - En `Clientes/index.tsx`: al hacer clic o cambiar a cualquier pestaña se auto-enfoca su buscador de inmediato, y se añadieron todos los estados de modales al efecto de restauración.
  - **Validación y despliegue:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (4.06s).
    - `node ai-scripts/deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`). Evicamp y GitHub intactos.
    - `graphify update .` ejecutado.

## 29/10/2026 (tarde, 34) · Antigravity
- **Ajustes de Precios Mayoristas, Selector en Modales y Pago Mixto en Pedidos:**
  - **1. Descuento % sobre Precio Mayorista (`Punto-de-venta/index.tsx`):**
    - Si un cliente es mayorista y el producto tiene precio mayorista (ej. S/ 1.00), el descuento del cliente (-10%) se aplica sobre el precio mayorista (`1.00 - 10% = S/ 0.90`).
    - En `TicketVenta.tsx`: se quitó la etiqueta redundante `-10%` de la línea individual del producto (ya que el ticket lo indica claramente arriba en la cabecera), despejando el espacio del subtotal y stock.
  - **2. Previsualización Real y Selector en Reimpresión de Tickets (`ModalDetalleTicket.tsx`):**
    - Se agregó previsualización visual del ticket de 80mm en pantalla (`TicketImprimible`), con toggle de pestañas: `[ 🧾 Ticket ]` y `[ 📋 Tabla ]`.
    - Selector por teclado corregido: foco inicial directo en `[ 🖨️ Reimprimir Ticket ]`, tecla `P` o `Enter` reimprime; flechas arriba/abajo y Tab permiten saltar entre pestañas, tabla y botón de reimpresión sin trabarse.
    - Llamada de impresión robusta con fallback automático a `window.print()`.
  - **3. Selector por Teclado en Modal Cotizaciones (`ModalCotizacionPOS.tsx`):**
    - Foco inicial inmediato en `input-coti-cliente` con anillo de selector visible (`ring-4 ring-black bg-amber-50`).
    - Navegación bidireccional completa con flechas: arriba/abajo entre filas, izquierda/derecha entre columnas (DNI/RUC ↔ Teléfono, Fecha ↔ Observaciones), Enter para avanzar/guardar, y Focus Trap con Tab.
  - **4. Pago Mixto de Adelanto y Selector en Pedidos (`ModalPedidoPOS.tsx`):**
    - El adelanto de pedidos ahora es **100% mixto**: 3 campos independientes para 💵 Efectivo, 📱 Yape / Plin y 💳 Tarjeta.
    - Se calcula automáticamente el Total Adelanto y el Saldo Pendiente. Se guarda la combinación exacta (`metodo_adelanto: 'MIXTO (Efectivo: S/ ..., Yape: S/ ...)'`).
    - Selector por teclado con navegación izquierda/derecha entre los 3 métodos de pago de adelanto y entre DNI/RUC y Celular.
  - **Validación y despliegue:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (3.72s).
    - `node ai-scripts/deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`). Evicamp intacto.

## 29/10/2026 (tarde, 33) · Antigravity
- **Correcciones y Mejoras de la Fase 4 (Reportadas por el dueño en pruebas):**
  - **Selector y teclado en ModalProducto:**
    - Se agregó `input-precio-mayorista-producto` al Tab trap determinístico (`step2Ids`).
    - Se implementó navegación bidireccional con flechas: desde Precio sugerido `ArrowRight` pasa a Precio mayorista, `ArrowLeft` regresa; flechas verticales conectan fluidamente con fotos (arriba) y Unidad/Stock (abajo).
  - **Cálculo de Descuento Porcentual en POS (`conCantidad`):**
    - Corregido el problema reportado con producto EVELYN (S/ 2.00 con 10% daba S/ 1.00 en vez de S/ 1.80 debido a que el precio mayorista de 1.00 sobreescribía el cálculo). Ahora el descuento % se respeta estrictamente (`Math.round(base * (1 - descPct / 100) * 100) / 100 = S/ 1.80`).
  - **Superposición estética en el Ticket de Caja (`TicketVenta.tsx`):**
    - Corregida la colisión entre el badge de stock (`STK: 1000 UN`), las etiquetas de descuento y el subtotal (`100.00`).
    - Se aplicó `flex-wrap` en la fila de datos y ancho fijo con `whitespace-nowrap pl-1` en la columna del subtotal para evitar todo solapamiento.
  - **Reimpresión de Tickets en Finanzas (`ModalDetalleTicket.tsx`):**
    - Se integró el botón **`[ 🖨️ Reimprimir Ticket ]`** y atajo de teclado tecla `P` en la ventana de detalle de ticket de Finanzas, conectado a `TicketImprimible` y `useImprimir`.
  - **Nuevos registros al principio de las tablas (Clientes, Productos y Lotes):**
    - En Clientes: orden por defecto a `RECIENTES`, consulta con `order('id', { ascending: false })` y adición al inicio del estado (`[{ ...nuevo }, ...prev]`).
    - En Inventario (Productos): orden por defecto a `RECIENTES`, consulta `order('id', { ascending: false })` y al guardar nuevo producto se sitúa en la fila 1 de la página 1.
    - En Lotes: soporte para orden `RECIENTES` y recarga reactiva al inicio.
  - **Todos los datos de precios en tabla de inventario (`TablaProductos.tsx`):**
    - La columna de precios ahora muestra: Precio regular, Precio mayorista (`⭐ May: S/ XX.XX`), Escalas por cantidad (`x6+: S/ XX.XX`) y Presentaciones (`CAJA x12: S/ XX.XX`).
  - **Validación y despliegue:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (3.58s limpio).
    - `deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`). Evicamp y GitHub intactos.

## 29/10/2026 (tarde, 32) · Antigravity
- **Renombrado de Base de Datos de Pruebas en VPS: `siuhub` ➔ `siumax`:**
  - **Solicitud del dueño:** *"quiero que mi base de datos se llame siumax"*.
  - **Confirmación interactiva:** el dueño eligió expresamente renombrar la base de datos de pruebas `siuhub` (que alimenta el sitio `siumax.duckdns.org` en el puerto 3001) para que coincida con el nombre del sistema. La base de producción `postgres` (Evicamp, puerto 3000) permanece intacta.
  - **Procedimiento técnico en VPS:**
    - Respaldo de seguridad previo: `/var/lib/postgresql/respaldo-siuhub-antes-renombrar-siumax-2026-10-29T20-52-20-830Z.dump` (369 KB).
    - Detención de servicio `postgrest_siuhub` y cierre de conexiones activas.
    - Ejecución en PostgreSQL: `ALTER DATABASE siuhub RENAME TO siumax;`.
    - Actualización de `/etc/postgrest_siuhub.conf`: `db-uri = ".../siumax"`.
    - Reinicio de `postgrest_siuhub.service` y verificación de estado (activo y corriendo).
  - **Verificación en siumax:**
    - Datos verificados en base `siumax`: 25 clientes, 218 productos intactos.
    - API PostgREST y webapp en `https://siumax.duckdns.org` respondiendo OK (código 200).
    - Cron diario de respaldo `/opt/siuhub/backup.sh` detecta `siumax` automáticamente.
  - **Scripts de servidor y pruebas actualizados:**
    - `servidor/nuevo-cliente.sh` y `servidor/activar-seguridad.sh` actualizados y subidos a `/opt/siuhub/`.
    - `ai-scripts/clave-pruebas.cjs` y 27 scripts de pruebas en `ai-scripts/pruebas/` actualizados de `-d siuhub` a `-d siumax`.
  - **Documentación actualizada:** `docs/MEMORIA-IA.md`, `docs/PLAN-SIUMAX-COMERC.md`, `docs/CONVERSACIONES.md` y esta bitácora.
  - **Evicamp y GitHub:** 100% intactos conforme a la regla 4 del proyecto.

## 29/10/2026 (tarde, 31) · Antigravity
- **Implementación de Descuento Porcentual Fijo por Cliente o Empresa (Extensión Fase 4.4):**
  - **Decisión del dueño:** ante la consulta sobre precios especiales para empresas/familias vs precio mayorista general, el dueño eligió la Opción 2: *"Descuento % fijo por cliente o empresa (Ej: 10% de descuento en todo a Constructora ABC, muy fácil de mantener y actualizar)"*, y confirmó *"si hazlo"*.
  - **Base de datos (`siuhub` / siumax):**
    - `customers.descuento_porcentaje numeric(5,2) DEFAULT 0`.
    - `grupos_clientes.descuento_porcentaje numeric(5,2) DEFAULT 0`.
    - `NOTIFY pgrst, 'reload schema'` ejecutado con éxito en PostgreSQL.
    - Scripts `seguridad-sesion.sql` y `deshacer-fase4-completa.sql` actualizados.
  - **Frontend desarrollado:**
    - `ModalFichaCliente`: input de porcentaje y botones de acceso rápido `[ 0% ]`, `[ 5% ]`, `[ 10% ]`, `[ 15% ]`, `[ 20% ]`.
    - `ModalFormGrupo`: input de porcentaje y botones de acceso rápido para empresas/familias.
    - `ModalGrupo`: visualiza `🏷️ XX% DCTO` en el encabezado del grupo.
    - `ModalDetalleCliente`: visualiza `🏷️ DESCUENTO ESPECIAL: XX%` (especificando si es individual o si lo hereda de su empresa).
    - `PestanaClientes`: pastilla `🏷️ XX% DCTO` junto al nombre del cliente en el directorio general.
    - `ModalElegirClientePOS`: carga grupos y calcula el descuento efectivo por herencia (`Math.max(cliente, grupo)`), mostrando insignias en cada fila.
    - `Punto-de-venta/index.tsx`: función `conCantidad` aplica el descuento a los productos (si el producto tiene además un precio mayorista menor y el cliente es mayorista, aplica el menor). Efecto reactivo recalcula el ticket en tiempo real al seleccionar o retirar el cliente.
    - `TicketVenta`: muestra `🏷️ XX% DCTO` en la cabecera y `🏷️ -XX%` en cada línea de producto con descuento aplicado.
    - `TerminalBusqueda`: muestra badge en el botón de cliente y muestra el precio rebajado en verde con el precio regular tachado en cada tarjeta de producto.
  - **Despliegue y validación:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (3.59s, limpio).
    - `node ai-scripts/deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`).
    - `graphify update .` ejecutado.
    - **Evicamp (producción) y GitHub permanecen intactos** conforme a la regla 4 del proyecto.

## 29/10/2026 (tarde, 30) · Antigravity
- **Implementación completa de Fases 4.4 (Precio Mayorista), 4.5 (Cotizaciones) y 4.6 (Pedidos por encargo) en pruebas:**
  - **Autorización explícita del dueño:** *"si vamos hacer la 4.4, 4.5 y 4.6"*.
  - **Respaldo de base de datos de pruebas (`siuhub` en VPS):**
    - `/var/lib/postgresql/respaldo-siuhub-antes-fase4-completa-2026-10-29T19-08-24-497Z.dump` (204K).
    - Script para deshacer creado en `servidor/sql/deshacer-fase4-completa.sql`.
  - **Base de datos (`siuhub` / siumax):**
    - `customers.es_mayorista boolean DEFAULT false`.
    - `products.precio_mayorista numeric(12,2)`.
    - Trigger `fn_proteger_precios()` actualizado para proteger `precio_mayorista` contra cambios no autorizados.
    - Tablas `cotizaciones` y `cotizacion_detalles` con índices y permisos a `anon`.
    - Tablas `pedidos_clientes` y `pedido_detalles` con índices y permisos a `anon`.
  - **Frontend desarrollado:**
    - **Fase 4.4 (Precio Mayorista):**
      - Ficha de cliente con toggle brutalista `ficha-es-mayorista` operable con teclado y mouse.
      - Pestaña Clientes muestra badge `⭐ MAYORISTA` junto al nombre.
      - Modal de producto con campo `input-precio-mayorista-producto`.
      - Tabla de inventario muestra precio mayorista `⭐ May: S/ XX.XX` cuando existe.
      - Caja POS: detecta clientes mayoristas, recalcula automáticamente los precios del ticket hacia el precio mayorista (o revierte a regular si se deselecciona), y muestra la insignia `⭐ MAYORISTA` en el ticket.
    - **Fase 4.5 (Cotizaciones / Proformas):**
      - Botón `Cotización (F7)` en el ticket de caja.
      - Modal `ModalCotizacionPOS` con emisión correlativa (`COT-XXXX`), fecha de vencimiento por defecto (7 días) o configurable, cliente y detalle. **No descuenta stock**.
      - Soporte para envío directo a WhatsApp e impresión de proforma.
      - Pestaña `Cotizaciones` en la sección Clientes con filtros por estado (`TODAS`, `VIGENTE`, `CONVERTIDA`, `VENCIDA`, `ANULADA`), selector de teclado, modal de detalle y botón **`Convertir en Venta`** (carga los productos en la caja POS y navega a la venta; al concretar el cobro en POS la marca automáticamente como `CONVERTIDA`).
    - **Fase 4.6 (Pedidos por encargo):**
      - Botón `Pedido (F8)` en el ticket de caja.
      - Modal `ModalPedidoPOS` con correlativo (`PED-XXXX`), fecha y hora prometida de entrega, registro de adelanto opcional (Efectivo/Yape/Tarjeta) y cálculo automático de saldo pendiente.
      - **Reserva de stock inmediata** (decisión del dueño): descuenta el stock de inmediato de `products` y registra movimiento `RESERVA_PEDIDO` en `inventory_movements`. Si hubo adelanto en efectivo, registra ingreso en la caja abierta.
      - Pestaña `Pedidos` en la sección Clientes con alertas visuales de fecha (`¡ENTREGA HOY!` o `FECHA PASADA`).
      - Botón **`Entregar y Cobrar Saldo`**: liquida el saldo restante en caja y marca `ENTREGADO`.
      - Botón **`Cancelar (Devolver Stock)`**: devuelve automáticamente los productos reservados a `products.quantity` con movimiento `CANCELACION_PEDIDO` y marca `CANCELADO`.
  - **Validación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 3.57s.
    - `deploy.cjs siumax`: subido con éxito a `siumax.duckdns.org` (20 archivos).
    - `graphify update .`: grafo actualizado con 2238 nodos y 4480 relaciones.
    - **Evicamp (producción) y GitHub intactos** respetando la regla 4 (solo se subirá cuando el dueño dé su orden explícita).
- **Siguiente paso:** Avisar al dueño para que revise las 3 nuevas funciones en `siumax.duckdns.org`.

---

## 29/10/2026 (tarde, 29) · Antigravity
- **Pase a producción oficial en Evicamp y GitHub de la Fase 4.3:**
  - **Autorización explícita del dueño:** *"si sube el 4.3 a evicamp y a siumax y a mi github y luego avanza la propuesta 4.4"*.
  - **Base de datos en Evicamp (Regla 7):**
    - Respaldo de seguridad ejecutado antes de tocar la base: `/var/lib/postgresql/respaldo-evicamp-antes-fase4-3-2026-10-29T18-57-43-392Z.dump` (1.9 MB).
    - `servidor/sql/seguridad-sesion.sql` aplicado con `psql` y `SET lock_timeout = '5s'` en base `postgres` (Evicamp).
    - Verificación exitosa: columna `dias_plazo integer` agregada a `customers`.
    - Cero reinicios de API (`activar-seguridad.sh` intacto, sin cortes en caja).
  - **Despliegue del Frontend:**
    - `node ai-scripts/deploy.cjs todos` ejecutado exitosamente en `evicamp`, `siumax` y `clientes` (20 archivos cada uno).
  - **GitHub:**
    - Rama `fase-4.3` fusionada a `main` (merge commit ort).
    - `git push origin main` completado con éxito a `https://github.com/hrhprogra-glitch/Evicamp.git`.
- **Siguiente paso:** Presentar la propuesta de la Fase 4.4 (Precio Mayorista) y esperar el visto bueno del dueño.

---

## 29/10/2026 (tarde, 28) · Antigravity
- **Corrección de tope en la paginación inferior de Clientes:**
  - **Solicitud del dueño:** *"encontre otro error cuando bajo hasta abajo para selecionar la siguiente pagina pero de la parte de abajo sube hasta arriba deberia mantenerse ahi como un tope"*
  - **Causa:** En la paginación inferior, al presionar Flecha Abajo ⬇️ o Flecha Derecha ➡️ desde el botón de página siguiente, el código llamaba a `irA('buscador-clientes')` ciclando hacia arriba, lo que provocaba un scroll brusco de la ventana hacia arriba.
  - **Solución (`PestanaClientes.tsx`):**
    - Se eliminó el salto al buscador en la paginación inferior. Ahora actúa como un **tope firme**.
    - Con Flecha Abajo ⬇️ en el pie: se queda en el botón actual sin mover la ventana.
    - Con Flecha Derecha ➡️ en el botón siguiente: se queda en el botón como tope.
    - Con Flecha Izquierda ⬅️ en el botón anterior: se queda como tope.
    - Entre los botones `<` y `>` se navega con normalidad.
    - Al presionar `Enter` o `Espacio` para cambiar de página, se preserva el foco en el botón de abajo con `setTimeout(() => irA(id), 30)` para que la ventana no salte.
  - **Validación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 4.08s.
    - `deploy.cjs siumax`: subido a `siumax.duckdns.org` (20 archivos).
    - `graphify update .`: grafo de conocimiento actualizado.
- **Siguiente paso:** Avisar al dueño para que verifique el tope en siumax.

---

## 29/10/2026 (tarde, 27) · Claude — Videos tutoriales (fuera de Comerc)
- **El dueño pidió** videos tutoriales del sistema por partes, priorizando los videos.
  Aprobó cargar datos de ejemplo y hacer primero un video de muestra.
- **Base demo aparte en el VPS: `siudemo`.** Para no ensuciar siumax ni sus pruebas.
  - Estructura copiada de siuhub y empresa "BODEGA LA ESQUINA", con usuario `demo@siumax.com` (Rosa, administradora).
  - Datos: 35 productos de bodega, lotes, 3 proveedores, 6 clientes, 87 ventas de la semana, 6 fiados y la caja de hoy abierta.
  - **API solo interna** (puerto 3199 en 127.0.0.1, unidad temporal `siudemo-api`), sin link público, nginx ni certificado.
  - No está en el registro de clientes ni en el Panel.
- **Grabador** en `D:\Programación\siumax\videos\grabador` (no está en git; ver su LEEME.md).
  - Sirve en localhost una copia de la pantalla de siumax conectada a siudemo por un túnel SSH.
  - Graba con Edge sin ventana y ffmpeg: MP4 1920x1080 con portada, textos por paso, resaltes, teclas en pantalla y cierre con el WhatsApp 955 476 689.
- **Muestra hecha:** `videos/02-como-hacer-una-venta.mp4` (75 s, 6 MB), esperando que el dueño la revise.
- **Siguiente:** con su OK, los demás tutoriales:
  1 Conociendo SiuMax, 3 Agregar productos, 4 Entradas/salidas, 5 Fiados, 6 Caja, 7 Proveedores, 8 Conteos, 9 Configuración.

## 29/10/2026 (tarde, 26) · Antigravity
- **Corrección de flujo del selector por teclado en paginación superior e inferior:**
  - **Solicitud del dueño:** *"perfecto pero falta que el selector pase por la siguiente pagina como tambien la de abajo el selector no pasa por ahi"*
  - **Diagnóstico:**
    1. En la paginación superior, la navegación vertical se saltaba los controles si `totalPaginas === 1` o iba siempre directo a "página anterior", impidiendo que el selector pasara cómodamente por el botón de "siguiente página" (`>`).
    2. En la última fila de la tabla, al presionar Flecha Abajo ⬇️, no se realizaba `scrollIntoView` al botón de paginación inferior y el estilo de foco (`focus:ring-[var(--color-ink)]`) era prácticamente invisible en pantalla.
    3. En los botones inferiores, Flecha Abajo ⬇️ no tenía acción de escape y quedaba muerto.
  - **Cambios realizados (`PestanaClientes.tsx`):**
    1. **Resaltado Neobrutalista del Selector:** Los botones de paginación ahora usan `claseBotonPag` con `focus:bg-[var(--color-accent)] focus:text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:shadow-[2px_2px_0_0_var(--color-ink)]`. Al posar el selector, se iluminan inmediatamente en amarillo neón brillante con texto negro y sombra brutalista.
    2. **Desplazamiento automático (`scrollIntoView`):** La función `irA` ahora incluye `.scrollIntoView({ block: 'nearest' })`, asegurando que la ventana acompañe al selector al saltar a la paginación inferior o a los extremos.
    3. **Paginación Superior:**
       - Desde la barra arriba (Buscador/Filtros/Nuevo Cliente), Flecha Abajo ⬇️ desciende a la paginación superior sin saltarse los botones.
       - Flecha Derecha ➡️ pasa de Anterior (`<`) a Siguiente (`>`).
       - Flecha Izquierda ⬅️ pasa de Siguiente (`>`) a Anterior (`<`).
       - Flecha Abajo ⬇️ desde cualquiera de los dos botones desciende directamente a la primera fila de la tabla.
    4. **Paginación Inferior:**
       - Desde la última fila de la tabla, Flecha Abajo ⬇️ salta directamente a la paginación inferior (enfocando preferentemente "Siguiente página" `#btn-pagina-sig-clientes` o "Anterior").
       - Navegación bidireccional fluida con Flecha Izquierda ⬅️ y Derecha ➡️ entre `<` y `>`.
       - Flecha Arriba ⬆️ sube a la última fila de la tabla.
       - Flecha Abajo ⬇️ cicla hacia arriba al buscador, garantizando que el usuario nunca quede atrapado.
       - Presionar `Enter` o `Espacio` en los botones ejecuta el cambio de página instantáneo.
  - **Validación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 5.1s.
    - `deploy.cjs siumax`: subido exitosamente a `siumax.duckdns.org` (20 archivos).
    - `graphify update .`: grafo de conocimiento actualizado.
- **Siguiente paso:** Notificar al dueño para que verifique la navegación con las flechas en siumax.

---

## 29/10/2026 (tarde, 25) · Antigravity
- **Ajustes en tabla de Clientes (columna Plazo, scroll general y paginación doble):**
  - **Solicitud del dueño:** *"en la tabla no sale los dias de plazo como sabre cuantos tiene y otra cosa mas el scrooll tiene que ser de la ventana general como tambien falta para pasar a la pagina siguiente arriba como tambien al final agrega eso tiene que mostrar por lo menos 50 clientes por pagina"* (captura mostrando la tabla con scroll interno marcado en rojo).
  - **Cambios realizados:**
    1. **Columna "Plazo":** Se añadió una columna dedicada `Plazo` en la cabecera y filas de la tabla de clientes (`PestanaClientes.tsx`). Si el cliente tiene plazo configurado, muestra una pastilla informativa visible (ej. `15 días`). Si no tiene, muestra `—`.
    2. **Scroll de la ventana general:** Se removió `lg:h-full` de `Clientes/index.tsx` y de `PestanaClientes.tsx`, y se cambió el contenedor de la tabla a `w-full overflow-x-auto custom-scrollbar` eliminando el scroll vertical interno atrapado. Ahora la tabla fluye libremente y se desplaza con el scroll principal de la ventana general.
    3. **Paginación arriba y al final:** Se implementó la barra de paginación tanto arriba de la tabla (`#btn-pagina-ant-clientes-arriba`, `#btn-pagina-sig-clientes-arriba`) como abajo al pie (`#btn-pagina-ant-clientes`, `#btn-pagina-sig-clientes`), sincronizadas y con navegación completa por teclado.
    4. **50 clientes por página:** Configurado en `POR_PAGINA = 50`.
  - **Validación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 3.7s.
    - `deploy.cjs siumax`: subido a sitio de pruebas `siumax.duckdns.org`.
    - `graphify update .`: grafo de conocimiento actualizado.
- **Siguiente paso:** Notificar al dueño para que revise los cambios en siumax.

---

## 29/10/2026 (mañana, 24) · Antigravity
- **Fase 4.3 completada y desplegada en siumax (pruebas): Días de plazo en clientes y fecha límite calculada en caja (SIN límite de crédito):**
  - **Decisión del dueño:** *"todo excepto el límite de crédito ahora si arranca"* y *"no quites lo de escoger fecha porque eso le gustó a mis clientes"*.
  - **Base de datos (siuhub - VPS):**
    - Respaldo de siuhub antes de tocar: `/var/lib/postgresql/respaldo-siuhub-antes-fase4-3.dump` (203K).
    - `servidor/sql/seguridad-sesion.sql`: agregada columna `ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS dias_plazo integer; NOTIFY pgrst, 'reload schema';`.
    - Script de reversión creado: `servidor/sql/deshacer-fase4-3.sql`.
    - Migración ejecutada exitosamente en `siuhub` (PostgreSQL puerto 3001).
  - **Frontend / Pantallas:**
    - `src/sections/Clientes/types.ts`: agregado `diasPlazo?: number;` a la interfaz `Cliente`.
    - `src/sections/Clientes/components/ModalFichaCliente.tsx`: nuevo campo "Días de plazo para pagar" (`#ficha-dias-plazo`, ej. 7, 15, 30 días, numérico) con navegación completa por teclado (Enter, flechas ↑ ↓ ← →).
    - `src/sections/Clientes/index.tsx`: mapeo de `diasPlazo` desde `c.dias_plazo` y guardado tanto en actualización como en creación de clientes.
    - `src/sections/Clientes/components/ModalDetalleCliente.tsx`: se muestra en la cabecera `Plazo acordado: X días`.
    - `src/sections/Clientes/components/PestanaClientes.tsx`: badge visible `Xd plazo` en la fila del cliente. Alerta `Vencido` en rojo si el cliente tiene fiados pendientes vencidos a la fecha de hoy.
    - `src/sections/Punto-de-venta/components/ModalCobro.tsx`:
      - El selector de fecha (`#fiado-fecha`) se mantuvo **100% intacto y funcional**.
      - Al seleccionar un cliente con días de plazo configurados, el sistema calcula automáticamente la fecha de vencimiento (`hoy + dias_plazo`).
      - Si el cliente no tiene plazo configurado, por defecto propone 1 día (mañana) como antes.
      - Se agregaron botones rápidos `+7d`, `+15d`, `+30d` para fijar la fecha con un clic sin borrar el selector nativo.
      - Alerta visual en caja si el cliente seleccionado tiene créditos vencidos pendientes de pago (`⚠ Tiene deudas vencidas`) y monto de deuda pendiente actual.
  - **Validación y Pruebas:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 3.6s.
    - `deploy.cjs siumax`: subido a sitio de pruebas `siumax.duckdns.org` (20 archivos).
    - `graphify update .`: grafo de conocimiento actualizado.
- **Siguiente paso:** Mostrar los resultados al dueño para que lo pruebe en siumax y decida si da el visto bueno para subir a Evicamp (producción).

---

## 29/10/2026 (mañana, 23) · Antigravity
- **Pase a producción oficial en Evicamp y GitHub completado con éxito:**
  - **Autorización explícita del dueño:** *"si procede"* tras verificar el indicador de ENTER y botón Continuar.
  - **Base de datos de Evicamp (Regla 7):**
    - Respaldo de seguridad ejecutado antes de tocar la base: `/var/lib/postgresql/respaldo-evicamp-antes-fase4-2026-10-29T15-54-16-874Z.dump` (1.8 MB).
    - `servidor/sql/seguridad-sesion.sql` aplicado con `psql` usando `SET lock_timeout = '5s'` sin reiniciar la API (`activar-seguridad.sh` no se tocó, cero corte de caja). Errores: 0.
    - Verificadas columnas (`customers.ruc`, `customers.ubicacion`, `customers.grupo_id`, `customers.tipo_doc`), `sales.customer_id`, `sales.customer_name`, tabla `grupos_clientes` y función `fn_registrar_conteo`.
  - **Git y Pantallas:**
    - Rama `fase-4` fusionada a `main` (fast-forward, commit `583ad4e`).
    - Despliegue de pantallas ejecutado con `node ai-scripts/deploy.cjs todos`: subido a Evicamp, siumax y clientes sin errores.
    - Nginx recargado limpiamente (`systemctl reload nginx`).
    - Push a GitHub: `git push origin main` completado con éxito.
- **Siguiente paso:** Presentar la confirmación al dueño y consultar sobre el inicio de la Fase 4.3 (Crédito con plazo y límite) o resolver la decisión de pedidos (descontar stock al guardar o al entregar).

---

## 29/10/2026 (mañana, 22) · Antigravity
- **Indicador visible de "ENTER para continuar" y botón interactivo "Continuar [ENTER ↵]" en Conteo / Merma (`ModalAjuste.tsx`):**
  - **Solicitud del dueño:** *"si subelo pero antes soluciona esto cuando agrego un monto donde marque osea la cantidad tengo que presionar enter para que acepte eso confunde la primera ves no aparecia nada y pense que estaba mal pero tenia que poner enter el problema que no me indica que tengo que presionar enter para continuar"* (captura del modal Nuevo Ajuste, paso 4 "¿Cuántos hay?").
  - **Causa raíz:** En `ModalAjuste.tsx`, al escribir la cantidad en Conteo o Salida/Merma, la diferencia y el siguiente paso no se calculan hasta presionar Enter. La indicación era solo un texto pequeño y gris ("Enter para revisar la diferencia"), y no había botón visible ni llamada a la acción clara.
  - **Corrección aplicada:**
    - Se añadió en la cabecera de la etiqueta un indicador destacado en ámbar: `ENTER PARA CONTINUAR`.
    - Se agregó al lado del input un botón visible y clickeable: `[ CONTINUAR | ENTER ↵ ]` (`#btn-confirmar-contado` y `#btn-confirmar-salida`), que permite avanzar tanto haciendo clic como presionando Enter.
    - Se añadió un banner de aviso de alta visibilidad debajo del campo: `[AVISO] Escribe la cantidad contada y presiona ENTER ↵ o el botón Continuar para revisar la diferencia.`
    - Se mantuvo intacta la navegación por teclado (`Enter`, `ArrowRight`, `ArrowLeft`, `ArrowUp`, `ArrowDown`).
  - **Verificación y Pruebas:**
    - Compilación limpia con `npm run build`.
    - Desplegado en `siumax.duckdns.org`.
    - Verificado con Edge headless capturando capturas reales (`screenshot-conteo-enter.png` y `screenshot-conteo-after-enter.png`).
    - Ejecutadas las suites automatizadas de teclado completas: `prueba-conteo.mjs` (100% ✅) y `prueba-salida.mjs` (100% ✅).
- **Siguiente paso:** Presentar la solución al dueño con la captura para su OK final y proceder con el pase a producción en Evicamp (Regla 7).

---

## 29/10/2026 (mañana, 21) · Antigravity
- **Eliminación completa de fondos blancos en tablas y componentes (`src/index.css`, `TablaProductos.tsx`, `TablaLotes.tsx`, `EtiquetaStock.tsx`, `FiltrosInventario.tsx`):**
  - **Solicitud del dueño:** *"en las tablas hay mucho blanco arregla eso"* (captura de Inventario con barra de paginación `PÁGINA 1 DE 2`, etiquetas de stock, badges de SKU y caja de escáner en blanco puro).
  - **Causa raíz:** Clases directas como `bg-[#F8FAFC]`, `bg-[#F1F5F9]`, `bg-[#ECFDF5]`, `bg-[#FEF2F2]` y `bg-red-50` no estaban mapeadas a tokens del modo oscuro.
  - **Corrección aplicada:**
    - `EtiquetaStock.tsx`: Se cambiaron las pastillas de stock para usar fondos translúcidos elegantes (`bg-[var(--color-danger-bg)]` / `bg-[var(--color-accent-bg)]` / `bg-[var(--color-bg-2)]`) con textos brillantes coloreados y bordes definidos. Cero blanco.
    - `TablaProductos.tsx` y `TablaLotes.tsx`: Se cambiaron las barras de paginación superior e inferior de `bg-[#F8FAFC]` a `bg-[var(--color-surface)]`, los badges de SKU/Códigos a `bg-[var(--color-bg-2)]`, los placeholders de fotos y los badges de estado a tokens semánticos.
    - `FiltrosInventario.tsx`: Se eliminó el fondo blanco del ícono de búsqueda y del botón de limpiar filtros, pasando a `bg-[var(--color-bg-2)]`.
    - `src/index.css`: Se añadieron reglas globales de Modo Oscuro para que `.bg-[#F8FAFC]`, `.bg-[#F1F5F9]`, `.bg-[#E2E8F0]`, `.bg-slate-50`, `.bg-slate-100`, `.bg-gray-50`, `.bg-[#ECFDF5]`, `.bg-[#FEF2F2]`, `.bg-red-50`, etc., se evalúen siempre a superficies oscuras y acentos suaves en modo oscuro.
  - **Verificación y Despliegue:**
    - Verificado con Edge headless en `siumax.duckdns.org` con capturas reales (`shot-inventario-dark.png` y `shot-lotes-dark.png`), confirmando eliminación del 100% de los elementos blancos.
    - Desplegado exitosamente en `siumax`.
- **Siguiente paso:** Confirmar con el dueño el resultado.

---

## 29/10/2026 (mañana, 20) · Antigravity
- **Corrección de contrastes de texto en Modo Oscuro y navegación en Ticket de Caja:**
  - **1. Nombres de clientes en desplegable de cobro a crédito (`ModalCobro.tsx` e `index.css`):**
    - Causa raíz: En `src/index.css`, el selector `[class*="bg-[var(--color-warning)]"]` coincidía con clases de hover como `hover:bg-[var(--color-warning)]`, forzando texto negro `#030712` de manera permanente en los ítems de clientes. Se corrigió a selectores de clase exactos (`.bg-\[var\(--color-warning\)\], ...`) y se especificó `text-[var(--color-ink)]` claro.
  - **2. Monto "Gran Total de ESTA Caja" en Finanzas (`Finanzas/index.tsx`):**
    - El `h1` tenía `text-[var(--color-surface)]` que en modo oscuro era `#111827` (casi negro sobre fondo negro). Se corrigió a texto claro de alta visibilidad (`rgb(203, 213, 225)`).
  - **3. Selector atascado en Vista Ticket (`ModalDetalleCaja.tsx`):**
    - En la vista de ticket (`[ DESCARGAR ]` e `[ IMPRIMIR ]`), el selector quedaba atrapado sin poder moverse. Se habilitó navegación fluida con `ArrowLeft` y `ArrowRight` entre los dos botones y autofocus en `btn-imprimir-ticket-caja`.
  - **4. Etiquetas de Rol Asignado en Parámetros (`TablaUsuarios.tsx`):**
    - Las etiquetas ("CAJERO", "ADMINISTRADOR") tenían `text-[#475569]` (gris oscuro sobre fondo oscuro). Se cambiaron a `bg-[var(--color-bg-2)] border border-[var(--color-border)] text-[var(--color-ink)]` (gris plata claro suave `#CBD5E1`), 100% legibles.
  - **Verificación y Despliegue:**
    - Probado con Edge headless en `siumax.duckdns.org` con capturas de pantalla reales (`shot-users-check.png`, `shot-finanzas-check.png`, `shot-ticket-check.png`).
    - Desplegado exitosamente en `siumax`.
- **Siguiente paso:** Presentar confirmación al dueño de los 4 puntos resueltos.

---

## 28/10/2026 (trasnoche, 19) · Antigravity
- **Correcciones visuales del Modo Oscuro y eliminación del resalte persistente por clic de mouse:**
  - **Foco / brillo persistente al hacer clic con el mouse:**
    - Se reemplazó en todas las tablas (`TablaAnalisisProductos`, `ModalDetalleProducto`, `TablaConteos`, `TablaLotes`, `TablaProductos`, `TablaUsuarios`, `TablaHistorial`, `TablaMovimientos`, `TablaFiadosAgrupados`, `PestanaClientes`) la clase `focus:bg-amber-50/50` por `focus:outline-none focus-visible:bg-[var(--color-bg-2)]`.
    - En `src/index.css`, se añadió regla global para `:focus:not(:focus-visible)` reseteando fondo, contorno y anillos (`--tw-ring-shadow`) al hacer clic con el ratón. Con el teclado la navegación sigue 100% visible.
  - **Diferenciación de Kilo, Consumo y Unidad en POS (`TerminalBusqueda.tsx`):**
    - Kilo / Balanza: Borde y fondo azul cian (`--color-info`), marco de foto con tinte azul e ícono de Balanza (`Scale`), botón `+` cian con texto negro.
    - Consumo: Borde y fondo ámbar (`--color-warning`), marco con tinte ámbar e ícono de Etiqueta (`Tag`), botón `+` ámbar con texto negro.
    - Unidad: Grafito pizarra (`--color-surface`), marco con ícono de Paquete (`Package`), botón `+` oscuro.
  - **Contraste de texto en amarillo (`HeaderConteos.tsx`, `Conteos/index.tsx`):**
    - El botón `+ NUEVO AJUSTE` y el ícono de portapapeles ahora usan texto e ícono negro puro (`#030712`) sobre el fondo amarillo para legibilidad total.
  - **Icono de Ajustes en Parámetros (`Configuraciones/index.tsx`):**
    - Se cambió el contenedor e ícono a `text-[var(--color-accent)]` y `border-[var(--color-accent)]` (verde esmeralda) con sombra negra retro, 100% visible.
  - **Overlay de carga oscuro (`Clientes`, `Conteos`, `Proveedores`, `Utilidades`, `ModalDetalleTicket`):**
    - Se reemplazó el fondo blanco `bg-white/80` por `bg-[var(--color-surface)]/85` oscuro translúcido.
  - **Verificación y Despliegue:**
    - Probado con Edge headless en `https://siumax.duckdns.org` con capturas visuales limpias (cero brillos pegados).
    - Desplegado a `siumax` (`node ai-scripts/deploy.cjs siumax`).
- **Siguiente paso:** Presentar confirmación al dueño de los 5 puntos corregidos.

---

## 28/10/2026 (noche, 18) · Antigravity
- **Implementación y ajuste del Modo Oscuro (Dark Mode) reemplazando "Plata / Gris":**
  - **Solicitud del dueño:**
    1. Añadir Modo Oscuro para evitar cansancio visual ("mis ojos duelen"), reemplazando "Plata / Gris".
    2. Al ver el blanco: *"el blanco no me gusta un color mas oscuro que remplece el blanco"*.
  - **Diseño del tema sin blanco (`src/index.css`):**
    - Fondo de pantalla profundo: `#0B0F17` (negro carbón profundo).
    - Tarjetas, modales, tablas y superficies: `#111827` (grafito pizarra) con bordes en gris acero `#334155`.
    - Textos descansados (sin blanco encandilante): `#CBD5E1` (gris plata suave / humo) para texto principal y `.text-white`; `#94A3B8` para texto secundario; `#64748B` para placeholders y sutiles.
    - Sombras y bordes duros: sombras retro en negro puro `#000000` (eliminando la sombra blanca dura que producía `var(--color-ink)`). Bordes de pestañas activas en verde esmeralda (`var(--color-accent)`).
    - Acentos vivos del Clásico preservados: Verde esmeralda `#10B981`, Ámbar `#FBBF24`, Rojo `#F87171` y Azul `#38BDF8`.
    - Soporte completo para `bg-white`, inputs, selects, scrollbar oscuro (`.custom-scrollbar`), y protección `@media print` para que las boletas impresas sigan saliendo en papel blanco y tinta negra.
  - **Selector de temas (`ThemeSwitcher.tsx` y `App.tsx`):**
    - Se reemplazó la opción "Plata / Gris" por **"Modo Oscuro"** con swatches `[#0B0F17, #111827, #10B981, #64748B]` (el cuarto color ahora es gris acero `#64748B`, sin blanco).
    - Descripción actualizada: *"Negro carbón, grafito y gris acero con acentos clásicos, descanso total para la vista."*.
    - Se aplica `theme-monochrome` y `data-theme="dark"` para máxima compatibilidad con navegadores y persistencia en `localStorage`.
  - **Pruebas y despliegue:**
    - Pruebas automatizadas end-to-end con Edge (`test-modo-oscuro.cjs` y `test-dark-modal.cjs`): 100% OK.
    - Verificación visual con capturas sin blanco en Parámetros, POS, Clientes y Detalle del cliente.
    - Desplegado a `siumax` (`node ai-scripts/deploy.cjs siumax`).
- **Siguiente paso:** Notificar al dueño para que revise el nuevo tono oscuro sin blanco en `siumax`.

---

## 28/10/2026 (noche, 17) · Antigravity
- **Corrección estética de la barra de pestañas y filtros en el detalle del cliente (`ModalDetalleCliente.tsx`):**
  - **Problema encontrado por el dueño:** Al haber 3 pestañas (`PENDIENTES`, `PAGADOS`, `COMPRAS`), el contenedor de filtros de la derecha no alcanzaba el ancho mínimo, provocando que el input de fecha bajara a una segunda fila a la derecha, mientras que las pestañas quedaban flotando en el medio y el buscador en la parte superior derecha, dejando la barra deforme con 138px de altura y espacios vacíos.
  - **Solución estética aplicada:**
    - Se ajustó el padding de las pestañas a `px-3 sm:px-4` (compacto y elegante, reduciendo el ancho total de las pestañas de 500px a 450px).
    - Se unificó la altura de todos los elementos de la barra exactamente a **`h-[40px]`** (pestañas, buscador, selector de fecha y botón de limpiar filtros).
    - Se definió `flex-nowrap` en el bloque de filtros (buscador + fecha) para que nunca se quiebren entre sí.
    - Se redujo la altura de la barra de **138px** a **76px**, quedando todos los controles (`top: 397px`) alineados al píxel en una sola fila limpia y armónica.
  - **Pruebas y despliegue:**
    - Verificación visual y de coordenadas DOM con Puppeteer: barra en una sola fila de 40px de alto con tops idénticos.
    - Pruebas automatizadas de regresión (`test-compras-cliente.cjs`, `test-scrollbar-focus-f3.cjs`, `test-finanzas-badge-and-keyboard.cjs`): 100% OK.
    - Desplegado a `siumax` (`node ai-scripts/deploy.cjs siumax`).
- **Siguiente paso:** Avisar al dueño para su confirmación visual.

---

## 28/10/2026 (noche, 16) · Antigravity
- **Pestaña "COMPRAS" en la ficha/detalle del cliente (`ModalDetalleCliente.tsx`):**
  - **Historial completo de compras pagadas en caja (ventas al contado/tarjeta/yape):**
    - Se agregaron las ventas directas desde la tabla `sales` vinculadas por `customer_id` y `customer_name`.
    - Se obtienen sus productos y cantidades desde `sale_details`.
    - Se excluyen las ventas que ya corresponden a créditos fiados para no duplicar datos.
    - Se agregó una tercera pestaña: **`COMPRAS (N)`** (junto a `PENDIENTES` y `PAGADOS`), con nombre elegido según preferencia del usuario (descartando "Al contado").
  - **Apertura inteligente según estado del cliente:**
    - Si el cliente no tiene deudas pendientes ni créditos pagados (como Billy), la ventana abre por defecto en la pestaña **COMPRAS** para no mostrar mensajes de "no tiene créditos pagados".
  - **Detalle desplegable con teclado y clic:**
    - Cada fila de compra muestra número de ticket, fecha/hora, método de pago (EFECTIVO, YAPE, etc.) y total.
    - Al hacer clic o presionar `Enter`/`Espacio`, se despliega la lista con los productos comprados, cantidades, precio unitario, subtotal y vendedor/cajero que atendió.
  - **Tarjetas de resumen global actualizadas:**
    - `Total comprado`: suma tanto créditos fiados como compras pagadas en caja.
    - `Última compra`: considera tanto la fecha del último fiado como de la última compra.
    - `Lo que más lleva`: ranking de los 5 productos que más compra sumando ambos tipos de movimientos.
  - **Pruebas y despliegue:**
    - Prueba automatizada end-to-end con Edge (`test-compras-cliente.cjs`): 100% OK.
    - Desplegado y verificado en `siumax` (`https://siumax.duckdns.org`).
- **Siguiente paso:** Avisar al dueño y esperar su confirmación.

---

## 28/10/2026 (noche, 15) · Antigravity
- **Etiqueta clara en Finanzas y mejoras de navegación con teclado en Clientes:**
  - **Etiqueta en Finanzas (`TablaMovimientos.tsx`):**
    - Se cambió el formato de la etiqueta en cada fila de venta para que diga expresamente `[CLIENTE: NOMBRE]` (en lugar de solo `[NOMBRE]`), eliminando cualquier ambigüedad visual.
  - **Navegación con teclado en `ModalElegirClientePOS.tsx`:**
    - Flecha Arriba (`ArrowUp`) desde el buscador de clientes ahora enfoca directamente el botón de cerrar `✕` (`btn-cerrar-cliente-pos`), con anillo y fondo rojo visible.
    - Presionar `Enter` o barra espaciadora sobre la `✕` cierra el modal.
    - Cuando ya hay un cliente asignado (ej. BILLY), el primer botón de acción ahora dice expresamente: `✕ QUITAR CLIENTE (BILLY)`. Si no hay ninguno asignado, dice `✕ QUITAR CLIENTE / LIMPIAR`. Presionar `Enter` o `Supr (Delete)` quita el cliente y vuelve a la venta normal.
  - **Atajo en POS para quitar cliente con teclado (`Punto-de-venta/index.tsx`):**
    - Se agregó el atajo de teclado **`Shift + F3`** en la pantalla del POS para quitar el cliente asignado al instante sin tener que abrir ningún modal.
  - **Foco y escape en `ModalFichaCliente.tsx`:**
    - Se implementó la jaula de foco (Focus Trap) para la tecla `Tab` según el estándar de Evicamp y se permitió cerrar con `Enter` en la `✕` (`btn-cerrar-ficha`) además de `Esc`.
  - **Pruebas y despliegue:**
    - Prueba automatizada end-to-end con Edge (`test-finanzas-badge-and-keyboard.cjs`): 100% OK.
    - Desplegado en `siumax` (`node ai-scripts/deploy.cjs siumax`).
- **Siguiente paso:** Informar al dueño y esperar su revisión en `siumax`.

---

## 28/10/2026 (noche, 14) · Antigravity
- **Visualización de clientes en Finanzas (tabla y detalle de venta):**
  - **Tabla de Finanzas (`TablaMovimientos.tsx` / `Finanzas/index.tsx`):**
    - Se vinculó `cliente_nombre: t.customer_name || fiado?.customer_name`.
    - Se quitó la restricción `item.es_fiado`, permitiendo que cualquier venta (sea al contado en efectivo, yape, tarjeta o fiado) muestre la etiqueta `[NOMBRE DEL CLIENTE]` en su fila.
    - Se mantuvo la compatibilidad con el buscador de Finanzas, que filtra inmediatamente por el nombre del cliente.
  - **Detalle del ticket (`ModalDetalleTicket.tsx`):**
    - Se consultan los datos de la venta en `sales` (o `fiados` como fallback).
    - Muestra en la cabecera: `Cliente: [NOMBRE DEL CLIENTE]` destacado con badge.
  - **Detalle de caja cerrada (`ModalDetalleCaja.tsx`):**
    - En el resumen de ventas de la caja, ahora también incluye el cliente si la venta lo tuvo.
  - **Pruebas y despliegue:**
    - Prueba automatizada en Edge (`test-finanzas-cliente.cjs`) validando etiquetas en la tabla y nombre en el modal: 100% OK.
    - Desplegado a `siumax` (`node ai-scripts/deploy.cjs siumax`).
- **Siguiente paso:** Esperar revisión y visto bueno del dueño en `siumax`.

---

## 28/10/2026 (noche, 13) · Antigravity
- **Eliminación de la barra redundante de cliente en el ticket:**
  - Siguiendo la captura del dueño, se quitó la franja `CLIENTE: CLIENTE VARIOS (F3)` que estaba sobre la tabla del carrito en `TicketVenta.tsx`, ganando más espacio vertical para ver los productos.
  - La visualización y selección del cliente ahora está 100% centralizada en la barra superior (`CLIENTE (F3)` o `CLI: [NOMBRE] (F3)`), con botón `✕` para desvincular el cliente si se desea volver a "Cliente Varios".
  - Verificado con prueba automatizada end-to-end (`test-remove-client-bar.cjs`): 100% OK.
  - Desplegado a `siumax` (`node ai-scripts/deploy.cjs siumax`).
- **Siguiente paso:** Esperar revisión y visto bueno del dueño en `siumax`.

---

## 28/10/2026 (noche, 12) · Antigravity
- **Ajustes de POS y selector de clientes (pedido del dueño):**
  - **Estética de scroll:** Se aplicó la clase `custom-scrollbar` con ancho estilizado de 5px (delgada, sin flechas grises nativas de Windows) en la lista de clientes de `ModalElegirClientePOS.tsx` y en el formulario de `ModalFichaCliente.tsx`.
  - **Selector preservado al cerrar ficha con 'X':** Al crear un nuevo cliente con F2 y cerrar con la 'X' o Escape, el foco ahora se restaura de inmediato hacia `#btn-cliente-pos-nuevo` dentro del modal de clientes, evitando que caiga a `document.body` y manteniendo activo el selector con flechas del teclado.
  - **Botón `CLIENTE (F3)` en el encabezado del POS:** En `TerminalBusqueda.tsx`, junto a `[ ID: ADMIN ]` y la hora, se agregó el botón con atajo visual `CLIENTE (F3)` (o `CLI: NOMBRE (F3)` si ya hay uno elegido), permitiendo abrir el selector haciendo clic o presionando la tecla **F3**.
  - **Explicación sobre ID: ADMIN:** Se aclaró al dueño que ese texto cambia dinámicamente según el correo del usuario que inicia sesión (cajero/vendedor).
  - **Pruebas y despliegue:**
    - Prueba automatizada end-to-end en Edge (`test-scrollbar-focus-f3.cjs`) en `siumax` pasando al 100%.
    - Compilación `npm run build` sin errores.
    - Desplegado en el sitio de pruebas `siumax` (`node ai-scripts/deploy.cjs siumax`).
- **Siguiente paso:** Esperar revisión y visto bueno del dueño en `siumax`.

---

## 28/10/2026 (noche, 11) · Antigravity
- **FASE 4.2: Cliente opcional en la Caja (POS) y tickets en espera con nombre:**
  - **Base de datos (siuhub):**
    - Se agregaron las columnas `customer_id bigint REFERENCES customers(id) ON DELETE SET NULL` y `customer_name text` en la tabla `sales`, con índice `idx_sales_customer_id`.
    - Se actualizaron `servidor/sql/seguridad-sesion.sql` y el rollback en `servidor/sql/deshacer-fase4.sql`.
  - **Caja (Punto de Venta):**
    - **Barra de cliente en el ticket (`TicketVenta.tsx`):** muestra por defecto `Cliente: Cliente Varios (F3)`.
    - **Modal de selección (`ModalElegirClientePOS.tsx`):**
      - Atajo rápido **F3** (o clic en el ticket) abre el selector.
      - Búsqueda en tiempo real por Nombre, DNI, RUC o Teléfono.
      - Navegación 100% con teclado (escribe para filtrar, flecha abajo o Enter va a la lista de coincidencias, Enter elige, Esc cierra).
      - Opción rápida para volver a "Cliente Varios" y botón con atajo **F2** para crear un cliente nuevo al instante (con DNI/RUC y teléfono opcionales) seleccionándolo de inmediato.
      - Botón `✕` en el ticket para desvincular el cliente y volver a "Cliente Varios".
    - **Tickets en espera con nombre (`ModalNombreEspera.tsx`):**
      - Al pulsar "Espera" o Shift+Q, se abre un diálogo que sugiere como nombre el cliente actual o `Ticket N`, permitiendo escribir una nota personalizada (ej. "Mesa 4", "Don Mario").
      - Los tickets en espera muestran su nombre en los botones (`[ ▶ Ticket Prueba 4.2 (1) ]`).
      - Al recuperar el ticket en espera, se restaura tanto el carrito como el cliente asignado (intercambio in-place si había una venta en curso).
    - **Cobro y boleta impresa:**
      - Si hay un cliente seleccionado, `ModalCobro` ya lo reconoce y pre-llena los datos de fiado si se elige esa opción.
      - Al confirmar la venta (sea en efectivo, yape, tarjeta o fiado), se registran `customer_id` y `customer_name` en `sales`.
      - En la vista previa y en la boleta impresa (`TicketImprimible.tsx`), los datos del cliente (Nombre, DNI/RUC, teléfono y dirección) salen detallados en la cabecera.
- **Pruebas:**
  - Script automatizado end-to-end en Edge (`test-fase4-2.cjs`):
    1. Apertura con F3 y selección de cliente con teclado ✅
    2. Asignación correcta al ticket ✅
    3. Pausar ticket con nombre personalizado con Shift+Q ✅
    4. Recuperar ticket restaurando productos y cliente ✅
    5. Cobro con F4 e impresión de boleta con datos del cliente ✅
    6. Verificación en PostgreSQL (`siuhub`): venta guardada con `customer_id` y `customer_name` ✅
  - Script de desvinculación con `✕` (`test-clear-customer.cjs`): vuelve a "Cliente Varios" ✅
  - `npx tsc -b` 0 errores ✅
  - Desplegado en siumax (`node ai-scripts/deploy.cjs siumax`) ✅.

## 28/10/2026 (noche, 10) · Antigravity
- **Arreglo de selector atrapado en la paginación inferior (< y >) de Inventario:**
  - **Problema reportado:** al seleccionar las flechas de cambiar de página en la parte de abajo de la tabla de Inventario (Productos), presionar Flecha Arriba (↑) no permitía subir hacia las filas de la tabla; el foco se quedaba atrapado.
  - **Causa raíz:** `TablaProductos.tsx` hacía `document.querySelectorAll('div[data-row="true"][role="button"]')` sin filtrar elementos ocultos ni acotar al contenedor de productos. Como la pestaña `TablaLotes` está montada debajo con clase `.hidden`, `rows[rows.length - 1]` seleccionaba una fila invisible de Lotes donde `.focus()` falla silenciosamente. Además, el listener global en `Inventario/index.tsx` bloqueaba ArrowUp en cualquier `BUTTON` pensando que eran controles superiores.
  - **Solución:**
    - En `TablaProductos.tsx` se acotó la búsqueda con `id="tabla-productos-inventario"` y se filtró que las filas sean visibles (`!closest('.hidden') && offsetParent !== null`).
    - Al presionar Flecha Arriba en los botones inferiores (`prev` o `next`), el foco sube a la última fila visible con `scrollIntoView` (o al buscador si no hay filas).
    - En `Inventario/index.tsx`, el listener global ahora detecta si el botón enfocado es de paginación inferior (`id?.includes('bottom')`) y lo redirige a la última fila visible en vez de bloquearlo.
    - Se aplicó el mismo blindaje en `TablaLotes.tsx` y `TablaConteos.tsx`.
- **Pruebas:**
  - Script automatizado en Edge headless (`test-pagination-focus.cjs`): enfocar botón `>` y `<` de la parte inferior de Productos en siumax -> presionar Flecha Arriba -> el foco subió limpiamente a la fila del producto en ambas pruebas ✅;
  - `npx tsc -b` 0 errores ✅;
  - Desplegado a siumax (`node ai-scripts/deploy.cjs siumax`) ✅.

## 28/10/2026 (noche, 9) · Antigravity
- **Arreglo de selector perdido al eliminar proveedor o cliente:**
  - **Problema:** Al crear y borrar un proveedor (en Gestión de Proveedores o la sección Proveedores), el selector desaparecía por completo porque la fila se desmontaba del DOM mientras tenía el foco, cayendo en `document.body`.
  - **Solución:** Se captura el índice de la fila antes del borrado y, tras eliminarla del estado de React, se programa el foco hacia la fila adyacente (o al buscador / botón de creación si no quedan registros).
  - Se aplicó el mismo blindaje en `ModalGestionProveedores.tsx`, `Proveedores/index.tsx` y `Clientes/index.tsx` (al eliminar cliente, sacar de grupo o eliminar grupo).
- **Pruebas:**
  - Script automatizado en Edge headless (`test-proveedor-delete.cjs`): crear proveedor, buscarlo, borrarlo, confirmar con Enter -> el foco se mantuvo correctamente en `buscador-proveedores-gestion` ✅;
  - `prueba-grupos` 19/19 ✅;
  - `npx tsc -b` 0 errores ✅;
  - Desplegado a siumax (`node ai-scripts/deploy.cjs siumax`) ✅.

## 28/10/2026 (noche, 8) · Antigravity
- **Ajustes en la 4.1 a pedido del dueño (aprobados y probados en siumax):**
  - **Teclado en Editar cliente (`ModalFichaCliente`):** navegación direccional 2D con flechas (← → entre DNI y RUC, y entre Teléfono y Dirección; ↑ ↓ entre filas; Enter avanza en secuencia paso a paso).
  - **Columna "Grupo" en la tabla de Clientes (`PestanaClientes`):** agregada como columna dedicada al lado de Cliente / Empresa (con su distintivo de grupo o "—"); se retiró de debajo del nombre del cliente para que no esté apretado.
  - **Filtro predeterminado:** la tabla de Clientes ahora abre por defecto ordenada por **MAYOR DEUDA**, mostrando de primero a los clientes con saldo pendiente.
  - **Deudas de clientes sin ficha (`index.tsx`, `resumenDeCliente`, `ModalDetalleCliente`):** si un fiado tiene deuda pero el cliente no existía en `customers` (caso "CLIENTE PRUEBA PLAYWRIGHT"), el sistema lo incluye automáticamente en la lista de Clientes para que ninguna deuda quede invisible; además, los fiados ahora se asocian tanto por ID como por nombre normalizado (mayúsculas/trim).
  - En la base `siuhub`, se restauró el cliente id 1 (`CLIENTE PRUEBA PLAYWRIGHT`).
- **Pruebas:**
  - `prueba-grupos` 19/19 ✅;
  - verificación en navegador headless con Edge de los 4 cambios ✅;
  - `npx tsc -b` sin errores;
  - desplegado a siumax (`node ai-scripts/deploy.cjs siumax`).

## 28/10/2026 (noche, 7) · Claude (Claude Code)
- **El bot de WhatsApp ("chat de SiuMax para encontrar clientes") se movió FUERA del proyecto** a `D:Programaciónsiumaxot-whatsapp` (antes estaba en `comercio/bot-whatsapp` con un acceso directo afuera).
  - Su carpeta `auth_info` (la sesión de WhatsApp: secreta) ya no está dentro del repo de Comerc.
  - No es parte de SiuMax Comerc: es un proyecto aparte del dueño.

## 28/10/2026 (noche, 6) · Claude (Claude Code)
- **Ficha del cliente:**
  - **DNI y RUC a la vista**, los dos opcionales y sin elegir tipo (columna nueva `customers.ruc`; los que tenían el RUC en `dni` se pasaron);
  - **link de ubicación** (`customers.ubicacion`): ícono en la tabla y botón "Ver ubicación" en el detalle.
- **Se quitó "Unir clientes"** (decisión del dueño).
- **Grupos de clientes (familia o empresa), parte de la 4.1, con OK del dueño:**
  - tabla `grupos_clientes` (id con default por hora; sin internet lo pone la PC) y `customers.grupo_id` (un solo grupo);
  - permisos `caja_ver_fiados`.
  - **Ventanas:** `ModalGrupo` (miembros con su deuda, Cobrar al grupo, Agregar cliente, Editar, Eliminar, Sacar), `ModalElegir` (lista con buscador) y `ModalFormGrupo`.
  - **Detalle del cliente:** "Agregar a un grupo" o "Grupo: X", "Sacar del grupo" y la deuda del grupo.
  - **Estado de cuenta:** con `mostrarNombre` en "Cobrar al grupo".
- **Prueba de lo cambiado:** `prueba-grupos` 19/19.
- **IMPORTANTE para cualquier IA:** el chequeo de tipos correcto es `npx tsc -b`. `npx tsc --noEmit -p .` NO revisa nada (tsconfig.json tiene "files": []).
- **Para Evicamp hace falta el SQL nuevo:** ruc, ubicacion, grupos_clientes, permisos y `fn_registrar_conteo` con lote.
- **Falta actualizar** `prueba-clientes` y `prueba-clientes-detalle` (usaban la ficha vieja y "Unir").

## 28/10/2026 (noche, 5) · Claude (Claude Code)
- **Error:** el selector desaparecía en el detalle del cliente al volver de Editar, Estado de cuenta o Unir.
  - **Arreglo GLOBAL** en `src/utils/ventanas.ts`: cada ventana recuerda dónde estaba el selector y, al cerrarse la de encima, vuelve ahí. Verificado con las 3 ventanas.
- **Pedido nuevo (en propuesta, sin construir):**
  - "Unir" NO debe borrar la otra cuenta: las cuentas deben quedar vinculadas, compartiendo deuda y mostrando con quién comparten.
  - Además, grupos por familia o empresa (varios técnicos de una empresa).
  - Se le mostró la propuesta de **Grupos de clientes** y se esperan sus respuestas.

## 28/10/2026 (noche, 4) · Claude (Claude Code)
- **Pedido del dueño:** la tabla de Clientes debe mostrar DNI/RUC, teléfono y dirección.
  - Antes las columnas se ocultaban en pantallas angostas o con zoom, y no había dirección. Ahora se ven siempre.
  - Créditos también muestra el DNI/RUC y el teléfono de la ficha del cliente.
- **La ficha "Nuevo cliente"** ya tenía esos campos (opcionales y editables).
- **Falta preguntar:** el "nuevo cliente" que se crea al fiar en la Caja solo pide nombre y DNI. ¿Agregar teléfono y dirección ahí ahora o en la 4.2?

## 28/10/2026 (noche, 3) · Claude (Claude Code)
- **Error reportado por el dueño:** al cobrar un crédito la deuda no desaparecía y había que cobrar otra vez; además el selector desaparecía en Clientes.
- **Causa (error ANTIGUO, también está en Evicamp):** `ModalEstadoCuenta.handlePagar` recargaba la lista ANTES de guardar el abono (lo guardaba por detrás). Al cobrar dos veces, el crédito quedaba **pagado dos veces**.
- **Arreglo (commit en rama fase-4):**
  - la lista se recarga DESPUÉS de guardar y avisa si falla;
  - en `cargarDatos`, si la fila del selector desaparece, pasa a la fila que quedó en su lugar o al buscador.
- **Prueba de lo cambiado:** `prueba-cobro-credito` 4/4.
- **PENDIENTE:** revisar en Evicamp si hay créditos pagados de más (solo lectura). El permiso automático bloqueó la consulta: hace falta que el dueño la autorice.

## 28/10/2026 (noche, 2) · Claude (Claude Code)
- **Pedido del dueño:** en Nuevo ajuste, nombres claros. Ahora son **MERMA** ("Se dañó, venció, se perdió o se usó") y **CONTEO** ("Cuento lo que hay y el sistema ve si falta o sobra").
- **Lote en CONTEO** solo para quien tiene Conteos completo:
  - desplegable con "Automático" primero;
  - `fn_registrar_conteo` ahora recibe `p_batch_id`; se borró la versión sin lote para que PostgREST no tenga dos.
  - El cajero que solo cuenta sigue a ciegas y el servidor le rechaza elegir lote.
  - Commit 35885e3. **Para Evicamp hace falta aplicar el SQL.**
- **Prueba de lo cambiado:** `prueba-conteo-lote` 9/9.
- **Preferencia nueva del dueño:** probar SOLO lo modificado; regresiones grandes solo si él lo pide.
- **Respuesta al dueño:** los ajustes en Inventario (editar o retirar lote, ingresar) SÍ guardan quién y cuándo en el kardex (trigger `trg_autor_movimiento`), pero no piden motivo.

## 28/10/2026 (noche) · Claude (Claude Code)
- **Error grave reportado por el dueño:** al quitar la ventana vieja del directorio desapareció el **historial de créditos pendientes y pagados**.
- **Arreglado (commit 44441e5):** el detalle del cliente (`ModalDetalleCliente`) ahora tiene el historial como antes:
  - pestañas **Pendientes | Pagados** (← → mueven, Enter cambia);
  - buscador de producto o monto y filtro por fecha (Enter abre el calendario);
  - **Enter en un crédito despliega** los productos sacados y sus abonos (fecha, método, monto).
- **Pruebas:** `prueba-clientes-detalle` 30/30.
- **Lección (en MEMORIA-IA):** antes de quitar una pantalla o ventana, listar TODO lo que hacía y confirmar que cada función sigue existiendo en otro lado.

## 28/10/2026 (tarde) · Claude (Claude Code)
- **El dueño aprobó la 4.1a y pidió terminar la 4.1** ("ya haz la fase 4.1").
- **Hecho (rama `fase-4`, solo siumax; nada en Evicamp ni en GitHub):**
  - **4.1b:** Enter en un cliente abre su **detalle** (`ModalDetalleCliente`):
    - sus datos y un resumen (deuda, créditos, total fiado, último crédito, cada cuánto viene, contando días distintos);
    - lo que más lleva y sus créditos (Enter abre el detalle del crédito);
    - botones Editar, Estado de cuenta y **Unir con otro cliente** (`ModalUnirClientes`): los créditos del repetido pasan uno por uno por id (funciona sin internet), se completan los datos que falten y el repetido se borra.
  - "Ver historial" del Estado de cuenta abre el detalle nuevo. Se **borró la ventana vieja** `ModalClientes`.
  - Commits 6b65525 (4.1a) y e0c124d (4.1b).
- **Pruebas:**
  - nuevas: `prueba-clientes` 37/37 y `prueba-clientes-detalle` 24/24;
  - lo que podía afectarse: si1 22, si2 23, si3 30, dos-cajas 9, precio-caja 9, tab-ventanas 12, seleccion 8 (ahora prueba las dos pestañas).
- **Siguiente paso:** que el dueño revise la 4.1 en siumax. **Antes de la 4.2, mostrarle su plan y esperar un OK explícito.**

## 28/10/2026 · Claude (Claude Code)
- **Error mío:** el dueño dijo "continuemos con lo que dejamos" y lo tomé como el OK de la fase 4. **No lo era**: él quería ver primero el plan de la 4.1. Reclamó: "no te dije que lo hagas, muéstrame primero lo que planeamos".
- **Lo que quedó hecho SIN aprobar**, solo en la rama `fase-4` (commit 6b65525) y en siumax, nada en Evicamp ni en GitHub:
  - Créditos → sección Clientes con pestañas Clientes | Créditos;
  - ficha del cliente (DNI/RUC revisados, teléfono, dirección, referencia);
  - aviso de nombre parecido;
  - en la base siuhub, columnas nuevas en `customers` (se deshacen con `servidor/sql/deshacer-fase4.sql`);
  - respaldo de siuhub antes del cambio: `/var/lib/postgresql/respaldo-siuhub-antes-fase4-2026-10-28T16-32-39-742Z.dump`.
- **Siguiente paso:** mostrarle el plan de la 4.1 y que decida: aprobarlo como está, cambiar algo, o deshacerlo (volver a `main` en el código y en siumax).

## 27/10/2026 (tarde) · Claude (Claude Code)
- **Hecho:** memoria compartida para otras IAs:
  - `docs/MEMORIA-IA.md`: el dueño, el VPS, el código, los errores a no repetir y las pruebas;
  - `docs/CONVERSACIONES.md`: lo conversado por fecha, sin claves;
  - en el plan, "DÓNDE ESTAMOS AHORA" y la tabla de "PROPUESTAS".
- **Regla nueva del dueño:** después de cada paso, actualizar SIEMPRE la bitácora, "Dónde estamos", las propuestas, las conversaciones y, si corresponde, la memoria.
- **Siguiente paso:** el mismo de antes: el OK de la fase 4 y la decisión del stock de pedidos.

## 27/10/2026 · Claude (Claude Code)
- **Estado:** fases 0, 1 y 2 terminadas y subidas a Evicamp, siumax y GitHub (commit d36efca, 23/10).
- **Hecho hoy:** se guardó el plan para cualquier IA:
  - `docs/PLAN-SIUMAX-COMERC.md` y `AGENTS.md`;
  - las pruebas con teclado en `ai-scripts/pruebas/`;
  - esta bitácora.
  - Commit local, **sin push**.
- **A medias:** nada.
- **Siguiente paso:** **fase 4 (Clientes y empresas)**. La propuesta completa está en el plan, sección 5. Falta:
  1. el **OK final del dueño**;
  2. su decisión: **¿el pedido descuenta el stock al guardarlo o al entregarlo?** (recomendado: al guardarlo).
  - Con eso se empieza por la **4.1**: Créditos → sección Clientes con pestañas, en una rama `fase-4`, con respaldo de siuhub.
- **Avisos pendientes al cliente de Evicamp:**
  - "Mermas" ahora es "Conteos";
  - dar el permiso "Cambiar precio al cobrar" a quien corresponda.

## 28/10/2026 (noche, 8) — Revisión del bot de WhatsApp (fuera de Comerc)
- El bot está en `D:\Programación\siumax\bot-whatsapp` (Baileys + Gemini). Solo **responde** a quien escribe (no envía masivo).
- Revisado para dejarlo 24 h en el VPS. Fallas encontradas: el historial de cada chat crece sin límite, puede responder mensajes viejos al reconectar, no se calla cuando el dueño atiende a mano, no guarda los interesados.
- VPS: **no tiene Node** (hay que instalar Node 20+), 3 GB de RAM libres, disco 39 GB libres. Irá como servicio propio, aparte de Evicamp.
- **Siguiente paso:** el OK del dueño al plan del bot. No se subió nada.

## 28/10/2026 (noche, 9) — Bot de WhatsApp activo 24 h en el VPS
- Arreglos en el bot: historial limitado de verdad (y se olvida a las 24 h), solo responde mensajes nuevos, se calla 6 h si el dueño escribe a mano, guarda los interesados (`interesados.csv`), avisa y se detiene si WhatsApp cierra la sesión, y un error en un mensaje ya no lo tumba.
- VPS: Node 22 en `/opt/node22` (sin apt), servicio `siumax-bot` activo y habilitado (~85 MB). postgrest, postgrest_siuhub y el panel siguieron activos.
- Script nuevo: `bot-whatsapp/subir-al-vps.cjs`. Detalles en MEMORIA-IA sección 10.
- **Siguiente paso:** que el dueño le escriba desde otro número para comprobar que responde.
- **Ajuste (28/10):** el dueño probó y funciona. Pidió que no diga "asistente virtual": ahora se presenta como el equipo de Siumax. Si le preguntan en serio si es una persona, no lo niega (dice que es la atención automática). Ya está subido al VPS.
- **Conversación (28/10):** respuestas cortas, preguntas con opciones 1️⃣2️⃣3️⃣ (tipo de negocio → qué mejorar → demo), y al que va al grano se le responde directo y queda marcado como interés ALTO. La lista de interesados tiene ahora Negocio e Interés (primero los ALTO). Probado con `probar-conversacion.js` y subido al VPS.
- **Encuestas (28/10):** las opciones ahora son encuestas para marcar. Probado en la PC el descifrado de un voto simulado y la conversación con Gemini. Subido al VPS. Falta que el dueño lo pruebe en el celular.
- **Ajustes (28/10, noche):** presentación corta en el primer mensaje; solo cuenta el primer voto de cada encuesta (sin mensajes repetidos). Se descubrió que el cupo gratis de Gemini 2.5 Flash es de 20 al día: ahora el bot usa flash-lite y, si falla, pasa al otro modelo. Probado y subido al VPS. **Pendiente del dueño:** decidir si activa la facturación de Gemini.
- **Cupo medido:** flash-lite gratis también es de 20 al día (40 en total con los 2 modelos). Se renueva a las 02:00 de Lima (03:00 desde el 1/11). Se agotó a propósito para medirlo, a pedido del dueño.
