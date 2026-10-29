# Memoria del proyecto para cualquier IA

> Esto es lo que Claude aprendió trabajando con el dueño desde octubre de 2026: cómo es él, cómo está armado todo,
> cómo se trabaja, cómo se prueba y **los errores que ya se cometieron, para no repetirlos**.
> Léelo junto con `AGENTS.md`, `docs/BITACORA.md` y `docs/PLAN-SIUMAX-COMERC.md`.
> Si aprendes algo nuevo importante, agrégalo aquí.
> **Nunca escribas aquí contraseñas ni claves:** viven en `.env.vps`, que no se sube a git.

---

## 1. El dueño y cómo le gusta trabajar
- **Español siempre**, también en los avances cortos y los resúmenes de pruebas. Se molesta mucho si respondes en inglés.
- **No es programador:** explica simple, sin jerga y con tablas cortas. Si dice "respóndeme nomás", contesta directo y corto.
- **Muestra la propuesta antes de construir** (qué pantallas cambian) y espera su OK. Si da varias opciones, recomienda una.
- **Nunca subas a Evicamp ni hagas push a GitHub sin que lo diga EN ESE MOMENTO.** Un "súbelo" anterior no vale para los
  cambios siguientes. siumax (pruebas) sí se puede actualizar.
- **Prueba él mismo en siumax** y manda capturas con los errores marcados en rojo. Lee la captura con calma: lo marcado
  es lo que hay que arreglar.
- **Cambia de idea, y está bien:** si dice "olvídalo" o "déjalo como está", no lo hagas y no insistas.
- **Su cliente Evicamp vende todos los días:** nada debe cortar sus ventas (ver la sección 3).
- **Estándar de pantallas:**
  - 100% teclado (← → ↑ ↓, Enter, Esc) y el selector nunca desaparece;
  - sin botón "Cancelar" (bastan la X y Esc);
  - avisos propios (`avisar` / `confirmar`);
  - listas en TABLA (no tarjetas), letra de tamaño normal, ventanas con borde 2 y sombra de 8 px;
  - las ventanas con listas usan el estilo del "Directorio de clientes" (`src/components/ListaVentana.tsx`).
- **Pestañas:** ← → solo mueven el selector; la pestaña cambia con Enter.
- **Barras con fechas:** una sola fila; ← → recorre, ↓ baja a la lista y **Enter en una fecha abre el calendario**.
- **Al cerrar cualquier ventana o submodal**, el selector debe volver explícitamente a lo que estaba elegido (regla global en `src/utils/ventanas.ts`). Si un submodal se desmonta (como la ficha de nuevo cliente dentro del selector del POS), el foco debe enviarse a un botón del modal padre (`btn-cliente-pos-nuevo`), de lo contrario el navegador envía el foco a `document.body` y el selector desaparece.
- **Scrollbars estilizados:** todo contenedor con scroll (`overflow-y-auto` u `overflow-auto`) debe incluir la clase `.custom-scrollbar` (5px, sin botones de flechas) para evitar la barra gris nativa gruesa de Windows.
- **Exige usar graphify** (si está instalado) antes de leer código y `graphify update .` después de cambiarlo.

## 2. El producto
- **SiuMax** es la marca. Este sistema es **SiuMax Comerc** (minoristas + venta a empresas).
  - Habrá un sistema separado por familia: Restaurantes, Talleres, Citas, Membresías, Alquileres y Hospedaje.
  - No proponer el selector de familia en el panel hasta que exista una segunda familia.
- **Evicamp** es la primera clienta (no es el nombre del producto). Sitio: `evicamp.duckdns.org`.
- **siumax** es el sistema de pruebas: `siumax.duckdns.org`, usuario `admin@siumax.com`. La clave está en `.env.vps` (`SIUMAX_ADMIN_CLAVE`).
- **Clientes nuevos:** `<slug>.siumax.duckdns.org`, cada uno con su base `cli_<slug>`. Al 27/10/2026 no hay ninguno.
- **Panel de control:** `panel.siumax.duckdns.org` (`servidor/panel/panel.py`).
  - Da de alta clientes y cobra con **Mercado Pago (cobro REAL activado)**.
  - Suspende a los 5 días de vencido. No tocarlo por ahora.
- **App de PC:** Electron (`escritorio/`), con actualización automática (`node ai-scripts/build-escritorio.cjs generico --nueva-version`). Carga el sistema desde el servidor, así que los cambios de pantalla no necesitan un .exe nuevo. No cambiar el `name` del manifest ("SiuMax"): la app lo verifica.
- **También existe como app instalable (PWA)** y funciona en una pestaña normal del navegador.
- **Ticket:** dice "Nota de Venta". **No hay facturación SUNAT todavía** (fase 11, en pausa).

## 3. El servidor (VPS) y cómo tocarlo sin romper nada
- **Un VPS (Hostinger)** con varias apps:

| Sitio | Base de datos | API |
|---|---|---|
| Evicamp | `postgres` | PostgREST en el puerto 3000 |
| siumax (pruebas) | `siuhub` | PostgREST en el puerto 3001 |
| CreditAltoque (otro sistema de la clienta, .NET) | `creditaltoque` | Docker. **No tocarlo** |

- **Nombres internos viejos que NO se cambian:** `/opt/siuhub`, base `siuhub`, servicios `postgrest_siuhub` y `siuhub-panel`.
- **Conexión:** `ai-scripts/vps.cjs` + `.env.vps`. Para SQL desde Node: `node-ssh` → `runuser -u postgres -- psql -d <base>`.
- **Seguridad de la API:**
  - Cada pedido lleva la cabecera `x-sesion` (`src/db/supabase.ts`) y el servidor la revisa con `fn_verificar_peticion`.
  - **Permisos por acción:** `fn_permisos_requeridos(método, ruta)` + `fn_tiene_permiso`, y triggers como `fn_proteger_precios` y `fn_proteger_borrados`.
  - Las sesiones vencen a los 30 días sin uso; hay límite de logins y fail2ban.
- **Respaldos:**
  - cron diario de todas las bases a las 3:00 (`/var/backups/siuhub`, 14 días) + la configuración;
  - copia a la PC del dueño (`D:\Backups-SiuMax`, tarea de Windows a las 8:00);
  - antes de cada pase: `pg_dump -Fc` a `/var/lib/postgresql/respaldo-evicamp-antes-<fase>-<fecha>.dump`.
- **Comandos:**
  - pantallas: `node ai-scripts/deploy.cjs siumax | evicamp | todos`;
  - clientes: `node ai-scripts/cliente.cjs listar | nuevo | backup | panel | seguridad <sitio>`.
- **⚠️ La regla más importante con Evicamp:**
  - `cliente.cjs seguridad evicamp` y `activar-seguridad.sh` **reinician la API** y cortan la caja. **NO usarlos en Evicamp.**
  - Para cambios de base: respaldo → subir `servidor/sql/seguridad-sesion.sql` → `psql -c "SET lock_timeout = '5s'" -f archivo.sql` (repetible) → revisar columnas y funciones → recién ahí `deploy.cjs`.
  - Script modelo: `ai-scripts/pruebas/aplicar-fase1-evicamp.cjs`.
- **Orden de un pase:** SQL primero, luego las pantallas (si la pantalla nueva llega antes que las columnas, las ventas fallan).
  Al final: revisar que el sitio sirve el `index-XXXX.js` nuevo, que la API responde 401 sin sesión y que el login abre sin errores.

## 4. El código (dónde está cada cosa)
- **Pantallas:** React + Vite + TypeScript, en `src/sections/`:

| Carpeta | Qué es |
|---|---|
| `Punto-de-venta` | La Caja (`index.tsx` con el carrito y el teclado; `TicketVenta`, `TerminalBusqueda`, `ModalCobro`, `ModalBalanza`) |
| `Inventario` | Productos, Lotes, Compras (`PanelCompras`), `ModalProducto`, `ModalLote`, `ModalHistorialLotes` (reloj: lotes + kardex), `ModalEtiqueta` |
| `Conteos` | Antes "Mermas". `ModalAjuste` = "Nuevo ajuste": Salió del stock / Conté lo que hay; `ModalEditarSalida`, `ModalEditarConteo` |
| `Fiados` | Créditos. En la fase 4 pasa a `Clientes` |
| `Finanzas` | Cajas, movimientos, anular |
| `Utilidades` | Ganancias por producto |
| `Configuraciones` | Usuarios y permisos (`ModalUsuario.tsx`, `types.ts`), empresa |

- **Utilidades clave** (`src/utils/`):
  - `sinInternet.ts`, `precargaSinInternet.ts`, `almacenLocal.ts`: todo el modo sin internet.
  - `dialogos.tsx`: `avisar` y `confirmar`. **`window.alert` está redirigido a `avisar`, NO es nativo.**
  - `ventanas.ts`: `ventanaSuperior`, `enfocablesDe`, `recordarSeleccionEnVentanas`.
  - `navegacionSesion.ts`: a dónde vuelve el foco. Con una ventana abierta se queda en ella.
  - `permisos.ts`: `usePermiso`, `avisarSinPermiso` y qué permiso abre cada sección.
  - `autorizacion.tsx` (`conAutorizacion`): pide la clave del admin.
  - `unidades.ts` (`unidadDe`, `esDecimal`, `nombreUnidad`), `presentaciones.ts`, `preciosCantidad.ts`, `vencimiento.ts` y `formato.ts`.
- **Modelo de stock:**
  - `products.quantity` es el total y `batches` son los lotes.
  - **La venta descuenta sola** por un trigger (`fn_reduce_stock_from_sales`), del lote **más antiguo**. FEFO fue rechazado por el dueño.
  - **Registrar una merma o salida en `waste` baja el stock del producto sola** (trigger `tr_waste_reduce`). **No mandes además "stock = X".**
  - Borrar una merma lo devuelve (`fn_restore_stock_on_waste_delete`, con signo: borrar un sobrante resta).
  - Kardex: `inventory_movements`. El autor lo pone el servidor (`trg_autor_movimiento`, `trg_autor_merma`).
- **Funciones del servidor que se usan:** `fn_registrar_conteo`, `fn_editar_conteo`, `fn_anular_venta`, `fn_edit_batch`,
  `fn_soft_delete_batch`, `fn_soft_delete_product`, `fn_recibir_compra`, `fn_devolver_compra`, `fn_ventas_por_producto`
  y `fn_empleado_de_sesion()`. Esta última ya existe: **no crear otra con el mismo nombre**.

## 5. Modo sin internet (cómo funciona)
- **Las copias:** cada lectura se guarda como "copia" en IndexedDB. Sin internet se responde con la copia.
  - `copiaFiltrada` arma el resultado desde copias más grandes que tengan las columnas de los filtros.
  - `filaEnCopias` usa la copia **más reciente**.
- **La cola:** lo hecho sin internet entra en una cola en disco y se sube en orden al volver la conexión, sin duplicar (`ref_local` o ids hechos en la PC).
- **Stock:** en cualquier PATCH de stock se guarda como **diferencia** (`CON_STOCK`), para no pisar ventas de otra caja.
- **Funciones del servidor sin internet:** se imitan en la PC (`IMITAR_RPC`) y se preparan al subir (`PREPARAR_RPC`).
- **La precarga** (`precargaSinInternet.ts`) debe hacer **exactamente las mismas consultas** que las pantallas; si no, no hay copia.
- **Regla de choque:** gana el último en subirse.
- **Autorizar con la clave del admin necesita internet** (decidido; no volver a proponerlo).

## 6. Errores que ya se cometieron (NO repetir)
1. **Responder en inglés.** El dueño no entiende. Siempre en español.
2. **Subir a Evicamp o GitHub sin un aviso nuevo**, tras un "súbelo" anterior. Siempre preguntar.
3. **Saltarse graphify** antes de leer código. El dueño lo exige.
4. **Reiniciar la API de Evicamp** con `activar-seguridad.sh`. Corta ventas. Usar `psql` con `lock_timeout`.
5. **Handler de teclado con closure viejo:** en `ModalProducto` el teclado (window, capture) usa `handleSave` de su closure. Todo estado nuevo que use `handleSave` debe ir en las dependencias del efecto; si no, guarda valores viejos (pasó con las escalas: se guardaba null).
6. **Comparar ids con `===`:** un id que llega como texto ("123") no es igual al número 123. Comparar con `String(a) === String(b)`. Pasó al editar un lote desde el Historial: no encontraba el producto.
7. **Mandar "stock = X" después de registrar una salida.** El trigger ya baja el stock; además, sin internet la copia vieja dejaba un stock equivocado y en línea podía pisar una venta simultánea.
8. **Leer stock de una consulta estrecha sin internet** (`select('id, quantity').eq('id')`). Esa copia puede estar vieja aunque otra esté al día.
9. **Tomar una copia VACÍA como "no hay copia"** en `copiaFiltrada`. Una caja recién abierta dejaba de verse sin internet.
10. **Revisar el stock línea por línea en la Caja.** Hay que sumar las sueltas y los paquetes del mismo producto: antes 8 paquetes x25 + 200 sueltas pasaban con 200 en stock.
11. **Poner un hook después de un `return null`.** Todos los hooks (useState, useEffect, propios) van antes del `if (!isOpen) return null`.
12. **Llamar un hook dentro de `a || usePermiso(...)`.** Es un hook condicional: llamarlos siempre.
13. **Selector CSS inválido:** `querySelector('.bg-[var(--x)]')` lanza error en cada tecla. Usar `CSS.escape(...)`.
14. **Clases `dark:` de Tailwind:** con Windows en modo oscuro dejaban las filas oscuras e ilegibles. No usar `dark:focus:bg-...` en filas.
15. **JsBarcode** pisa el estilo del svg: centrarlo con `Object.assign(svg.style, {...})` después de dibujar.
16. **Unidades de presentaciones:** se guardan con el código CORTO (`PAQ`, `CAJA`), no con el nombre ("PAQUETE"). Si no, se ignoran.
17. **Editar archivos con comandos de shell que tienen `\`, `$` o comillas** (heredoc, `node -e`, `sed`). Se pierden caracteres. Usar el editor de archivos. Los archivos pueden tener fin de línea CRLF.
18. **Un `restaurarFocoSesion` que mandaba el foco a la sección de atrás con una ventana abierta.** Ya corregido: se queda en la ventana.
23. **Revisar tipos con `npx tsc --noEmit -p .`** (28/10/2026): en este proyecto NO revisa nada, porque tsconfig.json solo tiene "references". Usar **`npx tsc -b`**. El build de Vite tampoco revisa tipos.
22. **Quitar una ventana vieja sin revisar todo lo que hacía** (28/10/2026): al reemplazar el "Directorio de clientes" se perdió su historial de créditos Pendientes | Pagados y el dueño lo reportó como error grave. Antes de borrar algo, listar cada función que tiene y comprobar que sigue en otro lado.
20. **Tomar "continuemos" o "seguimos" como el OK de una fase con propuesta pendiente** (28/10/2026). El OK tiene que ser explícito. Ante la duda, primero muestra el plan de esa parte y pregunta "¿empiezo?".
21. **Poner `onKeyDown` en un botón dentro de una fila que también tiene `onKeyDown`:** la tecla se atiende dos veces (Enter en Eliminar abría la ficha). Un solo oyente en la fila, usando `e.target`.
19. **Asumir que Escape en un desplegable no cierra la ventana:** `useCerrarConEscape` escucha en `window`. En el desplegable hay que hacer `e.stopPropagation()` en su `onKeyDown`.
24. **Fiados huérfanos sin cliente en `customers`** (28/10/2026): si un cliente fue borrado o fiado sin ficha previa en `customers`, su deuda no salía en la lista de Clientes aunque sí en Créditos. Al mapear clientes, incluir automáticamente a cualquiera que tenga fiados en la base, y al vincular fiados comparar siempre tanto por ID (`String(f.clienteId) === String(c.id)`) como por nombre normalizado (mayúsculas/trim).
25. **Pérdida de foco al eliminar filas de forma asíncrona** (28/10/2026): al borrar una fila (proveedor, cliente, etc.), `confirmar()` intenta restaurar el foco al botón original a los 80ms mientras la petición al servidor aún está en curso. Luego, cuando React elimina el elemento del DOM, el navegador pasa el foco a `document.body` y el selector desaparece. Para evitarlo: guardar el índice de la fila antes del borrado y, tras actualizar el estado de React, programar el foco (`setTimeout ~120ms`) hacia la fila contigua (`rows[Math.min(idx, rows.length - 1)]`) o al buscador si la lista quedó vacía.
26. **Selector atrapado en la paginación inferior (< y >)** (28/10/2026): buscar filas con `document.querySelectorAll('div[data-row="true"]')` sin acotar por el ID del contenedor o sin filtrar `.hidden` incluye filas de pestañas o tablas inactivas (ej. TablaLotes cuando está abierta la pestaña Productos). Como el último elemento encontrado está oculto (`display: none`), `rows[rows.length - 1].focus()` falla silenciosamente y el selector queda atrapado en el botón inferior. Siempre acotar al contenedor (`#tabla-productos-inventario`) y filtrar `!el.closest('.hidden') && el.offsetParent !== null`. Además, proteger cualquier listener global para que `id?.includes('bottom')` no sea bloqueado como control superior.
27. **En modales con búsqueda, separar las filas de resultados de las acciones superiores** (28/10/2026): si botones de acción (como "Cliente Varios" o "Crear nuevo") comparten el selector genérico con las filas de resultados, presionar Flecha Abajo o Enter tras escribir un término de búsqueda enfoca el botón de acción en lugar del primer resultado coincidente. Separar las acciones superiores (`data-cliente-accion="true"`) de los resultados (`data-fila-cliente="true"`), y hacer que presionar Flecha Abajo o Enter desde el buscador salte directamente a la primera coincidencia.
28. **Selectores CSS con subcadena `[class*="..."]` en estilos globales** (29/10/2026): un selector como `[class*="bg-[var(--color-warning)]"]` coincide con clases de pseudo-estados como `hover:bg-[var(--color-warning)]` o `focus:bg-[var(--color-warning)]` porque `class*=` busca la subcadena en todo el atributo `class` de HTML. Esto forzaba texto negro permanente (`color: #030712 !important`) en botones o ítems de clientes sin estar en hover. Siempre usar selectores de clase exactos con punto (`.bg-\[var\(--color-warning\)\], button.bg-...`).
29. **Oyente de teclado en modales con múltiples vistas (ej. ModalDetalleCaja)** (29/10/2026): si el `useEffect` de navegación por teclado tiene un guardia `if (vista !== 'DETALLE') return;`, cuando el modal cambia de vista a `TICKET` el efecto no escucha teclas y el selector queda congelado en el botón. El listener debe escuchar en todas las vistas del modal (`DETALLE` y `TICKET`), controlando flechas y Escape para moverse libremente entre los botones activos (`btn-imprimir-ticket-caja`, `btn-descargar-ticket-caja`, etc.).
30. **Colores de texto en Modo Oscuro (`text-[#475569]` o `text-[var(--color-surface)]`)** (29/10/2026): en modo oscuro, `--color-surface` es pizarra oscuro (`#111827`), por lo que poner `text-[var(--color-surface)]` en tarjetas o modales oscuros produce texto casi negro sobre fondo negro. Igualmente, colores hardcodeados como `text-[#475569]` en etiquetas de roles quedan ilegibles. Siempre usar `text-[var(--color-ink)]` (que en modo oscuro es plata suave `#CBD5E1`), o definir fondos y bordes con `bg-[var(--color-bg-2)]` y `border-[var(--color-border)]`.
31. **Fondos claros y pasteles en tablas en Modo Oscuro (`bg-[#F8FAFC]`, `bg-[#F1F5F9]`, `bg-[#ECFDF5]`, `bg-red-50`)** (29/10/2026): el dueño rechaza cualquier contraste blanco en tablas ("en las tablas hay mucho blanco arregla eso"). Clases utilitarias como `bg-[#F8FAFC]` en paginación o `bg-[#ECFDF5]` / `bg-red-50` en pastillas de stock quedaban como cajas blancas llamativas. Siempre usar variables semánticas (`bg-[var(--color-surface)]`, `bg-[var(--color-bg-2)]`, `bg-[var(--color-accent-bg)]`, `bg-[var(--color-danger-bg)]`) y proteger en `index.css` mapeando cualquier fondo neutro o pastel suave a superficies oscuras con acentos translúcidos y bordes definidos.
32. **Campos que requieren Enter para validar o calcular (ej. ModalAjuste)** (29/10/2026): si un paso requiere presionar Enter para calcular la diferencia o avanzar, un texto pequeño y gris ('Enter para revisar la diferencia') no es suficiente y el usuario piensa que el sistema está roto o no responde. Siempre incluir: (a) texto indicador en ámbar en la cabecera ('ENTER PARA CONTINUAR'), (b) un botón visible y clickeable al lado del campo ('[ CONTINUAR | ENTER ↵ ]') para usuarios de mouse o pantalla táctil, y (c) un banner de aviso visual claro debajo del campo ('[AVISO] Escribe la cantidad contada y presiona ENTER ↵ o el botón Continuar para revisar la diferencia').

- **Pruebas (28/10/2026):** el dueño quiere que se pruebe SOLO lo que se modificó. Las tandas de regresión, solo si él lo pide.

## 7. Cómo se organiza el trabajo
1. **Pregunta del dueño** → investigar el código (graphify si está) → **propuesta corta** con opciones y una recomendación.
2. **Con su OK:**
   - crear una **rama por fase** (`fase-1`, `fase-4`…);
   - **respaldo de siuhub** antes de tocar la base;
   - un script de **deshacer** (ej. `servidor/sql/deshacer-fase1.sql`).
3. **Por cada parte:**
   - código → `npx tsc -b` → `deploy.cjs siumax`;
   - la **prueba con teclado** de esa parte y las pruebas de lo que podía afectarse;
   - **un commit por parte**, con el mensaje en español;
   - `graphify update .`.
4. **Avisar al dueño** qué se agregó y qué se modificó, en lenguaje simple, con el resultado de las pruebas.
5. **Él revisa en siumax.** Con su aviso de subir:
   - fusionar la rama a `main` (fast-forward);
   - pase a Evicamp (sección 3), `deploy.cjs todos` y `git push`.
6. **Anotar en `docs/BITACORA.md`** qué se hizo y qué sigue.

## 8. Cómo se hacen las pruebas
- **Herramienta:** pruebas en `ai-scripts/pruebas/` (ver su `LEEME.md`), con puppeteer-core + Microsoft Edge en modo headless, **siempre contra siumax**.
- **Modo pruebas:** `localStorage.siumax_pruebas = '1'` (puesto con `evaluateOnNewDocument`, **solo en la ventana principal**: `if (window.top === window)`, porque la impresión usa un iframe) expone `window.__siumaxPruebas` (el cliente de supabase) para leer o escribir como la pantalla.
- **Cómo se escribe cada prueba:**
  - **Solo teclado:** `page.keyboard.press(...)` y revisar `document.activeElement.id` en cada paso (✅/❌ con detalle).
  - **Revisar en la base:** SQL por `node-ssh` a `siuhub`.
  - **Crear sus propios datos** (productos "PRUEBA … <timestamp>", ids altos) y **limpiarlos** al final (`is_active = 0`).
  - **Usuarios de prueba** (Cajero Prueba, Contador Prueba): la clave se pone al azar en cada corrida con `crypt()`.
- **Detalles que hacen fallar una prueba aunque el sistema esté bien:**
  - Los avisos son propios (no `dialog` del navegador): leer `#dialogo-sistema-texto` y aceptar con Enter. Si no se aceptan, se acumulan.
  - En la Caja, **lo nuevo entra ARRIBA** del ticket (línea 0).
  - El texto se ve en MAYÚSCULAS por CSS: compara con `/…/i`.
  - Los elementos del DOM no se pueden devolver desde `evaluate`.
  - Antes de escribir en un campo, seleccionar todo (Ctrl+A).
  - Vaciar el carrito antes de cambiar de sección.
  - **Datos que se ensucian:** la "DEMO GASEOSA" la usan varias pruebas; `reset-gaseosa.cjs` la deja como en `demo-compras.sql`.
  - `prueba-lote` necesita `PROVEEDORES_ACTIVOS=<n>`.
  - No despliegues mientras corre una prueba: la página carga a medias.
- **Antes de decir "listo":** correr la prueba nueva y la regresión de lo relacionado:
  - Caja: precio-caja, escalas, presentaciones, escala-off, hist-acciones;
  - inventario: lote, historial, kardex, seleccion;
  - sin internet: si1, si2, si3, dos-cajas;
  - conteos: conteo, contador, salida.

## 9. Historia útil de Evicamp
- **01/04/2026:** un evento volvió a descontar ventas ya descontadas (911 unidades, 277 productos).
  - El cliente corrigió a mano y está bien.
  - Desde entonces `fn_reduce_stock_from_sales` revisa si la venta ya se descontó.
- **Lotes borrados con saldo** (1142, 1281, 1404, 1424): corregidos con un movimiento AJUSTE.
- **La clienta retiraba el lote viejo con sobrante y sumaba ese sobrante al lote nuevo.** El sistema lo permite, pero ensucia el kardex. Se le recomendó ingresar solo lo que llegó.
- **Unidades corregidas en la fase 1:** KGM 211, NIU 971, ZZ 34. Respaldo en la tabla `respaldo_fase1_unidades`.

## 10. Bot de WhatsApp de SiuMax (fuera de Comerc)
- Carpeta: `D:\Programación\siumax\bot-whatsapp`. Corre 24 h en el VPS como **`siumax-bot.service`**, en `/opt/siumax-bot`, con usuario `siumaxbot` y su propio Node en `/opt/node22`. No toca a Evicamp ni a siumax.
- Actualizarlo: `node subir-al-vps.cjs` (desde la carpeta del bot). Ver cómo está: `node subir-al-vps.cjs estado`.
- **No correrlo a la vez en la PC:** comparten la sesión de WhatsApp.
- `auth_info` (sesión) y `.env` (clave de Gemini) son secretos: nunca a git ni GitHub.
- Si el dueño escribe a mano en un chat, el bot se calla ahí 6 h (`PAUSA_HORAS` en `.env`).
- Si WhatsApp cierra la sesión, el servicio se detiene (código 2) y deja `SESION_CERRADA.txt`: borrar `auth_info` y volver a escanear el QR.
- Lista de interesados en el VPS: `/opt/siumax-bot/interesados.csv` (abre en Excel).
- **Conversación del bot:** se configura en `bot-whatsapp/conversacion.js`. Respuestas cortas, una pregunta con opciones numeradas, y si el cliente va al grano se le responde directo y queda con interés ALTO. Al final de cada respuesta Gemini agrega `[[negocio | interes]]`; el bot la quita antes de enviar y la guarda en las columnas Negocio e Interés de la lista. Para probar sin WhatsApp: `node probar-conversacion.js`.
- **Encuestas del bot:** las preguntas con opciones salen como encuesta nativa de WhatsApp. Gemini escribe `[[encuesta: pregunta | op1 | op2]]` y el bot la envía con `bot-whatsapp/encuestas.js`. Baileys 7.0.0-rc14 **no descifra los votos solo** (ese código está comentado en la librería): `encuestas.js` guarda la clave de cada encuesta en `encuestas.json` (7 días) y descifra el voto probando los ids normal y "@lid". El voto le llega a Gemini como "Elegí: …". Si la encuesta falla, se envían las opciones numeradas en texto.
- **Cupo de Gemini (OJO):** la clave gratis da solo **20 respuestas al día con gemini-2.5-flash** (cada mensaje de cliente gasta 1, y las pruebas también). El bot usa primero `gemini-2.5-flash-lite` y, si se le acaba el cupo (429) o está saturado (5xx), pasa a `gemini-2.5-flash` (`pedirAGemini` en `conversacion.js`; se cambia con `GEMINI_MODELOS` en `.env`). No gastar el cupo con pruebas innecesarias. Para no tener límite, el dueño debe activar la facturación en Google AI Studio.
- **Encuestas:** solo cuenta el PRIMER voto de cada cliente en cada encuesta; si vuelve a marcar, no se responde. La presentación es de una línea: "¡Hola! 👋 Te saluda el equipo de SiuMax…".
- **Cupo medido (28/10):** gemini-2.5-flash-lite gratis = **20 pedidos al día**, igual que gemini-2.5-flash. Total: 40 respuestas al día (unos 10 clientes de 4 mensajes). Se renueva a la **medianoche de California**: 02:00 en Lima con el horario de verano de EE. UU. y **03:00 en Lima desde el 1/11**. Además hay un límite por minuto.

## 11. Videos tutoriales (fuera de Comerc)
- **Se graban contra la base demo `siudemo` del VPS, nunca contra siumax, Evicamp ni clientes.**
  - siumax está llena de productos de prueba; siudemo tiene datos de bodega realistas.
  - Su API es interna: puerto 3199 en 127.0.0.1, unidad temporal `siudemo-api`. Si el VPS se reinicia, hay que levantarla otra vez (ver LEEME del grabador).
- **Herramienta:** `D:\Programación\siumax\videos\grabador` (`servidor-demo.cjs` + `grabar.mjs` + `guiones/`).
  - Graba a 1366x768 escalado a 1920x1080: a 1600x900 la letra se veía muy chica en el celular.
- **El Punto de venta por teclado:**
  - el buscador agrega el primero con Enter (con flechas se elige otro);
  - los productos nuevos entran arriba (`edit-input-0`);
  - el granel abre la balanza (S/ → kilos);
  - **F4 cobra**; Enter confirma; Enter en el ticket empieza una venta nueva.
