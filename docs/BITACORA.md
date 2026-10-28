# Bitácora compartida (Claude ↔ Antigravity ↔ cualquier IA)

> **Al EMPEZAR:** lee este archivo, `AGENTS.md` y `docs/PLAN-SIUMAX-COMERC.md`.
> **Al TERMINAR, o si te vas a quedar sin uso:** escribe arriba una entrada nueva con lo que hiciste, lo que quedó a
> medias y el siguiente paso, y haz `git commit` (sin push, salvo que el dueño lo pida).
> Escribe en español simple. Lo más nuevo va primero.

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
