# Bitácora compartida (Claude ↔ Antigravity ↔ cualquier IA)

> **Al EMPEZAR:** lee este archivo, `AGENTS.md` y `docs/PLAN-SIUMAX-COMERC.md`.
> **Al TERMINAR, o si te vas a quedar sin uso:** escribe arriba una entrada nueva con lo que hiciste, lo que quedó a
> medias y el siguiente paso, y haz `git commit` (sin push, salvo que el dueño lo pida).
> Escribe en español simple. Lo más nuevo va primero.

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
