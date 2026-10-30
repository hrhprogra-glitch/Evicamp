# Resumen de las conversaciones con el dueño

> Lo que se habló, se pidió y se decidió, por fecha. Lo más nuevo va al final.
> No incluye contraseñas: el chat original tenía claves pegadas por el dueño, que viven solo en `.env.vps`.
> **Al terminar cada conversación, agrega aquí lo nuevo.** También anota en `docs/BITACORA.md` y actualiza
> "Dónde estamos" en `docs/PLAN-SIUMAX-COMERC.md`.

---

## 15–20/10/2026: la base del producto (antes de SiuMax Comerc)
- **Marca:**
  - El sistema se llamó SiuHub y luego **SiuMax** (16/10): "Hub" no se pronuncia bien en Perú.
  - Evicamp es la primera clienta.
- **Se armó todo esto:**
  - sitio de pruebas (siumax) y app instalable (PWA);
  - app de PC (Electron) con actualización automática;
  - alta de clientes por subdominio con respaldos;
  - panel de control con cobro por **Mercado Pago (cobro real activado el 17/10)**.
- **Seguridad (16/10):** antes la API se podía usar sin login. Se agregó la sesión obligatoria (`x-sesion`), permisos por acción en el servidor, roles (Administrador, Encargado, Cajero, Almacenero), límite de logins y fail2ban.
- **17/10:** el hosting reinició el VPS unos 25 minutos y Evicamp no pudo vender. El dueño pidió que el sistema **funcione sin internet**: se hicieron las fases 1-5 del modo sin internet.
- **19-20/10:**
  - Avisos propios en lugar de `alert` (el .exe perdía el teclado).
  - Cierre de caja a ciegas.
  - Anular con la clave del admin.
  - Compras (pedidos a proveedores, recibir y devolver).
  - Permiso "Recibir pedidos".
- **Regla que nació aquí (19/10):** se subió algo sin volver a preguntar y el dueño pidió **"siempre espera a que te avise para subir"**.

## 21/10/2026: SiuMax Comerc y el plan de fases
- **Carpeta:** el proyecto se movió a `D:\Programación\siumax\comercio`.
- **Nombre:** el sistema pasa a llamarse **SiuMax Comerc**. El dueño probó "Siumaxcomer" y "comers"; se desaconsejaron porque se leen como "comer".
- **Visión:**
  - **un sistema separado por cada familia de negocio** (7 familias: Comercio, Restaurantes, Talleres, Citas, Membresías, Alquileres, Hospedaje);
  - Comerc debe servir a **todo minorista y también a clientes con empresa**.
- **Panel de control:** no se toca hasta que haya 2 familias.
- **Competencia y SUNAT:** se explicó que la desventaja es la factura electrónica. Camino A (un proveedor PSE con "enchufe") y luego B (directo a SUNAT). El dueño dijo **"mejor más adelante, hay que hacerlo"** → en pausa.
- **Ticket:** decía "Boleta Electrónica" sin enviar a SUNAT. Se cambió a **"Nota de Venta"** y se subió.
- **Fases:** se armó el plan de **12 fases (0-11)**, validado con tesis peruanas (librería y ferretería) y sistemas como Odoo y Zoho. El dueño: "me encanta cómo tienes tus fases".
- **Eco-Sistema** (otro sistema del dueño, para un cliente de riego y piscinas): se analizó y **no es de Comerc**; sería la base de una futura familia "Servicios". Primero se termina Comerc.
- **Forma de trabajo acordada:** "todo lo haremos primero en las pruebas, reviso, si doy visto bueno lo subimos".

## 22/10/2026: Fase 0 y comienzo de la Fase 2
- **Lotes borrados con saldo en Evicamp:** el dueño pidió no borrarlos sin investigar. Se encontró un **evento del 01/04** que volvió a descontar ventas.
  - El cliente confirmó que los productos estaban bien → se corrigieron los lotes.
  - Se agregó una **protección contra el doble descuento**, subida **sin cortar las ventas** (el dueño pidió "sin afectar a mi cliente ahora que lo está usando").
- **Lotes agotados:** idea del dueño: no hace falta borrarlos.
  - El lote agotado se ve mientras sea el último de su producto.
  - El botón del reloj abre el **Historial** con todos los lotes.
- **Tab en cualquier ventana** hacía desaparecer el selector → arreglado para todas las ventanas.
- **Fase 0 cerrada y subida** ("sí súbelo, ya lo probé todo bien").
- **Fase 2 (control de inventario), decisiones:**
  - el **kardex** va como 2.ª pestaña del reloj;
  - el **conteo es a ciegas**;
  - sin límite de diferencia, pero con **motivo y justificación obligatorios** y anotando quién, cuándo y en qué turno.
- **Estilo:** todas las ventanas con listas al estilo del **"Directorio de clientes"**. Se hizo el Historial y Proveedores; faltan otras 6 ventanas.
- **Sin internet en todo** ("haz que funcione todo, que el cajero siga trabajando hasta que vuelva el internet"): se hicieron SI-1, SI-2 y SI-3.

## 23/10/2026: Fase 2 completa y Fase 1 completa
- **Conteo:**
  - el botón **Contar** pasó a la sección Mermas;
  - en un conteo **solo se corrigen el motivo y la justificación**, nunca la cantidad.
- **2.3 Vencimientos:** el dueño preguntó si hacía falta, y se eligió la **versión mínima** (filtros "Vencidos" y "Vencen en 30 días").
- **2.4 "Sugerir pedido"** en Compras:
  - ajustes: "vendió X en 30 días" en vez de "1.5/día", filtros de categoría y de qué sugerir, y "Limpiar lista" en rojo;
  - la opción "General" que se pidió era un "seleccionar todo" y **no hace falta**.
- **2.5 Etiquetas:** el dueño prefirió un **ícono por producto**. Su cliente imprime en A4 o en ticketera.
- **Subida:** fase 2 + sin internet a Evicamp y GitHub ("vamos por la 1" / "súbelo").
- **Fase 1, con la condición** "si no me gustó, ya tienes que estar preparado para revertir":
  - **1.4:** el cajero sin permiso pide la **clave del administrador** para cambiar un precio.
  - **1.1:** unidades SUNAT (preguntó por qué SUNAT tiene más unidades: se tomó el Catálogo 03).
  - **1.3:** precios por cantidad.
  - **1.2:** cajas y paquetes.
- **Preguntas del dueño:**
  - La clienta borraba el lote viejo con sobrante y lo sumaba al nuevo. Se puede, pero ensucia el kardex: mejor ingresar solo lo que llegó.
  - Sí se pueden editar lotes antiguos.
- **Pedidos durante la fase 1:**
  - "Registrar merma" y "Contar" eran lo mismo → se **fusionaron** y la sección pasó a llamarse **Conteos** (el dueño eligió el nombre; "Ajustes" no, porque ya existe).
  - **Campo SKU** en el producto.
  - **Desplegable de lotes** con día y hora, que se cierra al elegir.

## 24/10/2026: arreglos, subida de la Fase 1 y propuesta de la Fase 4
- **Historial:** botones **Editar y Eliminar** en cada lote.
- **Error de paquetes:** 8 paquetes + 200 sueltas pasaban con 200 en stock → corregido.
- **Editar lote desde el Historial** abría sin producto → corregido.
- **Datos de prueba:** pidió borrar y crear datos nuevos, y luego **se arrepintió** ("olvídalo").
- **Botón x6+** en la línea de la Caja para **apagar el precio por cantidad**.
- **¿Cajas en el lote en vez del producto?** Primero dijo que sí; luego **"déjalo como está"**.
- **Fase 1 terminada y subida** a Evicamp, siumax y GitHub ("sí súbelo a Evicamp y a GitHub y a mis clientes").
- **Propuesta de la Fase 4 (Clientes y empresas):**
  - el dueño quiere que **Créditos se convierta en "Clientes"**, pero que **Créditos se mantenga** como pestaña;
  - preguntó cómo no complicar a las **vecinas que fían** → todo opcional;
  - el "Cliente (opcional)" en la Caja es uno para todos;
  - los **pedidos** van aparte de la **ESPERA**, que sigue igual, con nombre y "Pasar a pedido".
- **Ferreterías:** con la fase 4 cubre lo principal; faltan factura (fase 11), marca/medidas (fase 3) y garantía (fase 6).
- **SUNAT:** es para facturar. Se explicó qué necesita el negocio (RUC en un régimen correcto, ojo con el Nuevo RUS; Clave SOL; proveedor PSE) y qué le falta al sistema.

## 27/10/2026: IAs gratis y memoria compartida
- **Pregunta del dueño:** quiere una IA para seguir cuando se acabe el límite de Claude.
  - Usa **Antigravity** (editor de Google) con Gemini 3.8 Flash; también tiene Claude Sonnet/Opus 4.6 y GPT-OSS ahí.
  - Su plan es estudiantil y **no aparece Gemini Pro**.
- **Opciones explicadas:**
  - OpenCode (solo terminal);
  - Cline o Kilo Code dentro de Antigravity, con **clave gratis de Gemini (AI Studio)** o modelos gratis de OpenRouter;
  - modelo local: su PC tiene una RTX 3050 de 6 GB, que **no alcanza para un modelo listo**.
- **Pedido:** que la otra IA continúe donde se queda Claude y tenga **toda la memoria**. Se crearon:
  - `AGENTS.md`;
  - `docs/PLAN-SIUMAX-COMERC.md`;
  - `docs/BITACORA.md`;
  - `docs/MEMORIA-IA.md`;
  - este resumen;
  - las pruebas en `ai-scripts/pruebas/`.
- **Regla nueva del dueño:** guardar también lo conversado, las fases, en qué parte se quedó y las propuestas, y **actualizar siempre lo último**.

## 28/10/2026: Fase 4.1 (sección Clientes)
- **"Continuemos con lo que dejamos":** Claude lo tomó como el OK y empezó la 4.1a.
  - El dueño reclamó: **"no te dije que lo hagas, muéstrame primero lo que planeamos"**.
  - Lección guardada: "continuemos" no es aprobar; primero se muestra el plan y se pregunta "¿empiezo?".
- **Preguntó** "¿ya terminaste la 4.1?" y pidió ver las partes de la 4.1 y todas las fases.
- **"Ya haz la fase 4.1":** aprobó la 4.1a y pidió la 4.1b.
  - Detalle del cliente (resumen, lo que más lleva, créditos).
  - Unir clientes repetidos.
  - "Ver historial" del estado de cuenta abre el detalle nuevo.
  - Se quitó la ventana vieja del directorio.
- **"Encontré un error gravísimo":** no estaba el historial de pagados y pendientes (era de la ventana vieja del directorio).
  - Se recuperó dentro del detalle del cliente: pestañas, buscador, fecha, y productos y abonos al dar Enter.
- **Nombres en Nuevo ajuste:** el dueño pidió palabras claras. Eligió **MERMA / CONTEO**; en CONTEO, quien tiene Conteos completo elige a qué lote va la diferencia y el cajero cuenta a ciegas.
- **Pregunta:** ¿los ajustes dentro de Inventario registran quién? Sí: quién y cuándo, en el kardex, pero sin motivo.
- **Preferencia:** "solo revisa si lo que modificaste está bien" (no más tandas de pruebas sin pedirlas).
- **Error al cobrar un crédito:** la deuda no desaparecía y había que cobrar dos veces. Era un error antiguo (la lista se recargaba antes de guardar); se arregló. Falta revisar si en Evicamp quedaron créditos pagados dos veces.
- **Tabla de clientes:** debe mostrar DNI/RUC, teléfono y dirección, y la ficha de "nuevo cliente" debe permitir llenarlos (opcionales y editables). Hecho: columnas siempre visibles; la ficha ya los tenía.
- **Selector** perdido al volver de Editar, Estado de cuenta o Unir en el detalle del cliente: arreglado (regla global).
- **Unir clientes:** no quiere que la otra cuenta desaparezca; deben compartir deuda y mostrar con quién. También agrupar por familia o empresa (técnicos de una empresa). Preguntó si es para otra fase. Se le dio la propuesta de "Grupos de clientes" (4.1c).
- **Ficha:** "tiene que mostrar el DNI y RUC para llenarlos sin escoger nada" → hecho; además pidió el **link de ubicación** → hecho.
- **Unir y grupos:** quitar "Unir"; un solo grupo por cliente con la opción de sacarlo; hacerlo como parte de la 4.1 → hechos los **Grupos de clientes** (familia o empresa).
- **Ajustes en la 4.1 (con Antigravity):** el dueño revisó en siumax y reportó 4 puntos:
  1. En Editar cliente, el selector solo se movía arriba y abajo: permitir moverse izquierda/derecha entre columnas (DNI <-> RUC, Teléfono <-> Dirección).
  2. En la tabla de Clientes, no había columna de "Grupo": crear la columna dedicada "GRUPO" para ver a qué grupo pertenece cada cliente y quitar la etiqueta de debajo del nombre.
  3. "CLIENTE PRUEBA PLAYWRIGHT" aparecía en Créditos con S/ 2.00 de deuda pero en Clientes no salía: se descubrió que el cliente 1 no existía en `customers`. Se protegió el sistema para que clientes con deuda siempre salgan en Clientes y se vinculen por ID o nombre, y se restauró en `siuhub`.
  4. Poner como predeterminado en el filtro de Clientes "MAYOR DEUDA" para ver primero a quienes deben dinero.
  5. Al crear y borrar un proveedor el selector desaparecía: el elemento activo se destruía tras la eliminación asíncrona; se arregló programando el foco hacia la fila contigua o el buscador en `ModalGestionProveedores`, `Proveedores` y `Clientes`.
  6. Al seleccionar las flechas de cambiar de página de la parte inferior en Inventario (Productos), no permitía subir con flecha arriba (el selector quedaba atrapado): se acotó la búsqueda de filas a `#tabla-productos-inventario`, se filtró que no estén en pestañas `.hidden` y se protegió el listener global para botones `bottom`.
  - El dueño dio el OK a la propuesta, se aplicó en siumax y se validó con Edge y `prueba-grupos`.

- **Bot de WhatsApp 24 h:** el dueño quiere tenerlo en el VPS; ya tiene un número aparte con WhatsApp Business. Se revisó el código y el VPS y se le mostró el plan. Esperando su OK.
- **Bot 24 h:** el dueño dio el OK ("si empieza usa graphify!"). Se arreglaron los 5 puntos, la lista de interesados quedó en un archivo en el VPS y el bot quedó como servicio. Falta su prueba escribiéndole.
- **Bot:** "funciona, aunque no quiero que diga que es un asistente virtual" → ahora habla como el equipo de Siumax, sin mentir si le preguntan directamente.
- **Bot:** "que responda corto y haga preguntas con opciones, y si va al grano mejor, porque así sabemos que quiere el sistema" → hecho en `conversacion.js`; el interés queda en la lista.
- **Bot:** "me gustaría que fuera para marcar como una encuesta" → hecho con encuestas nativas de WhatsApp.
- **Bot:** "falta una presentación… que no diga que es asesor virtual o bot… corta… ¿qué pasa si presiona una y otra vez el voto?" → presentación de una línea y un solo voto por encuesta (eligió "Encuesta, 1 voto"). Se le avisó del límite de 20 respuestas al día de Gemini gratis.

## 28/10/2026: Fase 4.2 (Cliente opcional en la Caja)
- **El dueño preguntó:** "perfecto ahora que tenemos que haces ?=:3"
- **Se le presentó el plan de la Fase 4.2 (Cliente opcional en la Caja):**
  - Barra de cliente en el ticket (F3 o clic), por defecto "Cliente varios".
  - Búsqueda en tiempo real o creación rápida con F2.
  - Nombre en tickets en espera (Shift+Q), restaurando cliente y carrito al recuperar.
  - Guardado en `sales.customer_id` y `sales.customer_name` y visualización en la boleta impresa.
- **El dueño respondió:** "ok".
- **Desarrollo y pruebas completadas:**
  - Migración SQL aplicada en `siuhub` (`sales.customer_id`, `sales.customer_name`).
- **Ajustes solicitados por el dueño en siumax (28/10 noche):**
  1. *"el scrooll aruina la estetica cabialo"*: Se reemplazó la barra de desplazamiento nativa de Windows (gris y gruesa) por la estilizada `custom-scrollbar` de 5px en la lista de clientes y modales de ficha.
  2. *"otra cosa cuando pongo nuevo cliente y pongo x el selector desaparece"*: Al cerrar la ficha de nuevo cliente con 'X' o Escape dentro de la selección de clientes del POS, el foco ahora regresa inmediatamente a `+ Nuevo (F2)`, manteniendo activo el selector y la navegación por flechas.
  3. *"en el pos ahi dice id y admin osea dependiendo de que usuario entre cambiara eso no ? asi ahi agrega el boton de clientes y pon ahi f3 para que sepa que si quieres entrar le haces click o f3"*: Se explicó que `ID: ADMIN` cambia según la cuenta del cajero conectada, y se agregó en la barra superior junto al ID el botón `CLIENTE (F3)` (o `CLI: [NOMBRE] (F3)`) que permite abrir la ventana tanto con clic como con la tecla F3.
  5. *"en finanzas sale el cliente?? en la tabla y en el detalle de la venta ??"*: El dueño preguntó por la visibilidad del cliente en Finanzas. Se revisó y se descubrió que anteriormente la tabla solo mostraba el cliente si era fiado, y el modal de detalle del ticket no lo mostraba. Se actualizó la tabla de Finanzas para mostrar `[NOMBRE DEL CLIENTE]` en cualquier venta vinculada a un cliente, y se agregó en la cabecera de `ModalDetalleTicket` la fila `Cliente: [NOMBRE]` con badge.
  - Se probó con scripts automatizados en Edge en `siumax` (`test-finanzas-cliente.cjs` 100% OK) y se desplegó.
  6. *"no puedo selecionar la x como tambien cuando agrego un cliente como puedo cancelarlo con teclado??"*:
     - La `✕` del modal de clientes ahora se enfoca con Flecha Arriba (`ArrowUp`) desde el buscador y se cierra con `Enter` o `Space` (además de `Esc`), con indicador visual rojo y foco activo.
     - Se agregó el atajo **`Shift + F3`** en el POS para desvincular o cancelar el cliente asignado con una sola combinación de teclas.
     - Si ya hay un cliente asignado, el botón de selección ahora dice claramente **`✕ QUITAR CLIENTE (NOMBRE)`**, permitiendo cancelar con `Enter` o `Supr (Delete)`.
  7. *"perfecto si sale el nombre del cliente pero solo sale el nombre nose si ese nombre es del cliente agrega eso"*:
     - Se actualizó la etiqueta en la tabla de Finanzas para que muestre claramente: **`[CLIENTE: NOMBRE]`**.
     - Validado al 100% con script automatizado en Edge (`test-finanzas-badge-and-keyboard.cjs`) y desplegado a `siumax`.
  8. *"no es mejor que diga quitar cliente o "limpiar" algo asi ??"*:
     - Se cambió el texto del botón por el que sugirió el dueño: ahora dice **`✕ QUITAR CLIENTE / LIMPIAR`** (o **`✕ QUITAR CLIENTE (NOMBRE)`** si hay uno puesto) y en el pie **`Sin cliente asignado (Venta normal)`**, eliminando la frase confusa "Cliente Varios (Sin Cuenta)".
  9. *"perfecto una pregunta cuando compro con un cliente selecionado lo que compra se registra en clientes ???"* y *"si si donde dice pendiente pagado ahi falta lo que compra"*:
     - El dueño notó que la ventana de detalle del cliente solo tenía pestañas de fiados (`PENDIENTES` y `PAGADOS`), por lo que las ventas pagadas en caja con cliente seleccionado no se veían en la sección Clientes.
     - Se agregó la pestaña **`COMPRAS (N)`** (cargando las ventas de `sales` y productos de `sale_details` vinculados al cliente y excluyendo las que ya son fiados).
     - El dueño rechazó el nombre "Al contado" ("si si aunque escoge otro nombre al contado no me gusta") por lo que se mantuvo el nombre directo y profesional: **`COMPRAS`**.
     - Se probó la apertura inteligente (si el cliente no tiene deudas abre directo en `COMPRAS`), el desplegable de productos comprados con `Enter` o clic, y las tarjetas de resumen (`Total comprado`, `Última compra`, `Lo que más lleva`).
     - Validado al 100% con script automatizado en Edge (`test-compras-cliente.cjs`) y desplegado en `siumax`.
  10. *"perfecto pero encontre un error estetico lo marque con rojo en la imagen"*:
     - El dueño envió una captura donde la barra de pestañas y filtros del detalle del cliente se quebraba en dos filas asimétricas: el campo de fecha caía a una segunda fila a la derecha, las pestañas quedaban flotando en el medio y el buscador en la esquina superior derecha, estirando la barra a 138px con espacios en blanco vacíos.
     - Se unificó la altura de todos los controles a `h-[40px]`, se ajustó el padding de las pestañas a `px-3 sm:px-4`, se fijó `flex-nowrap` en los filtros y se redujo la altura de la barra a 76px en una sola fila armónica.
     - Validado al 100% con Puppeteer en `siumax`.
  11. *"perfecto ahora vamos agregar el modo dark porque mis ojos duelen me gustaria que sea una convinación del modo clasico pero con tonos negro gris blanco ahi ve tu la mejor paleta"*, *"que rempleaze la plata gris"*, *"si si hazlo que remplece el color plata gris"* y *"el blanco no me gusta un color mas oscuro que remplece el blanco"*:
     - El dueño envió una captura marcando en círculo rojo el tema "PLATA / GRIS" en Parámetros del Sistema -> Apariencia para reemplazarlo por un "Modo Oscuro" para descansar la vista.
     - Al ver la versión con blanco, pidió expresamente reemplazar el blanco por un color más oscuro que no encandile.
     - Se ajustó el tema **Modo Oscuro** eliminando totalmente el blanco:
       - Fondo profundo: `#0B0F17` (carbón profundo).
       - Superficies, tarjetas, modales y tablas: `#111827` (grafito pizarra) con bordes `#334155`.
       - Textos y títulos: `#CBD5E1` (gris plata suave / humo descansado, sin blanco), `#94A3B8` para secundarios y `#64748B` para sutiles.
       - Sombras y bordes duros: sombras retro en negro puro `#000000` (eliminando la sombra blanca de `var(--color-ink)`).
       - Swatches en Apariencia: `[#0B0F17, #111827, #10B981, #64748B]` (el cuarto color es gris acero `#64748B`, sin blanco).
       - Acentos clásicos preservados para total claridad en estados y ventas: verde esmeralda (`#10B981`), ámbar (`#FBBF24`), rojo (`#F87171`) y azul (`#38BDF8`).
       - Mapeo automático de `.bg-white` a grafito, controles oscuros (`color-scheme: dark !important;`), scrollbar oscuro y protección para impresión (`@media print` estrictamente blanco y negro para no gastar tinta).
     - Probado y verificado en `siumax` con pruebas automatizadas en Edge al 100% y desplegado.
   12. **Ajustes y correcciones visuales del Modo Oscuro solicitados por el dueño (28/10 trasnoche):**
      - *"esto tambien modifica el carga el fondo es blanco"*: Fondo oscuro translúcido en el overlay de carga de todas las sesiones.
      - *"esto tambien no se diferencia entre kilo unida o consumo como tambien la parte donde pone la foto no cambia de color si es kilo unidad o consumo arregla eso"*:
        - Kilo: azul cian (`--color-info`), marco con tinte azul e ícono de Balanza (`Scale`), botón `+` en cian con texto negro.
        - Consumo: ámbar (`--color-warning`), marco con tinte ámbar e ícono de Etiqueta (`Tag`), botón `+` en ámbar con texto negro.
        - Unidad: grafito pizarra, marco con ícono de Paquete (`Package`), botón `+` oscuro.
      - *"en la imagen donde marque con rojo las letras no se ven bien"*: En Conteos, botón `+ NUEVO AJUSTE` e ícono en amarillo con texto e ícono negro puro (`#030712`) para contraste total.
      - *"aqui donde marque nisiquiera se ve el icono de ajuste arregla eso"*: En Parámetros, el engranaje de configuración ahora usa `text-[var(--color-accent)]` y `border-[var(--color-accent)]` (verde esmeralda), 100% visible.
      - *"encontre un error cuando hago click con el mouse el color del brillo a la hora de selecionar se mantiene ahi te envie una foto eso no tiene que pasar en ninguna sesión"*:
        - Eliminado el fondo ámbar/crema persistente (`focus:bg-amber-50/50`) en todas las tablas del sistema (`TablaAnalisisProductos`, `ModalDetalleProducto`, `TablaConteos`, `TablaLotes`, `TablaProductos`, `TablaUsuarios`, `TablaHistorial`, `TablaMovimientos`, `TablaFiadosAgrupados`, `PestanaClientes`).
        - En `src/index.css`, regla global para `:focus:not(:focus-visible)` reseteando background-color, outline, shadow y rings al hacer clic con mouse, preservando la navegación por teclado con flechas.
      - Validado en `siumax` con Edge headless y capturas limpias.
    13. **Ajustes de visibilidad y navegación por teclado (29/10 mañana):**
       - *"en la imagen lo que marque con rojo no se ve la letra ya que es negro la letra arregla eso"*: En el desplegable de clientes para cobro a crédito (`ModalCobro.tsx`), los nombres de los clientes se veían negros por la regla `[class*="bg-[var(--color-warning)]"]` en `index.css`. Corregido el selector a clase exacta y colores claros.
       - *"en finanzas tambien no se ve la letra lo marque con rojo la letra es negra por eso no se ve"*: En la tarjeta "Gran Total de ESTA Caja" de Finanzas, el monto `S/ 141.49` tenía `text-[var(--color-surface)]`. Se corrigió para que use color claro de alto contraste (`rgb(203, 213, 225)`).
       - *"encontre un error cuando estoy dentro de ver ticket para imprimir y descargar el selector no se mueve te envie una imagen"*: En el modal de detalle de caja (`ModalDetalleCaja.tsx`), al abrir la vista de ticket (`[ DESCARGAR ]` e `[ IMPRIMIR ]`), el foco quedaba bloqueado en Imprimir. Se añadió soporte de flechas (`ArrowLeft` / `ArrowRight` / `ArrowUp` / `Escape`) y autofocus para que el selector se desplace con total libertad.
       - *"en la parque que marque con rojo no se puede apreciar bien las letras porque tiene un color oscuro"*: En Parámetros del Sistema -> Gestión de Usuarios, los textos de la columna "ROL ASIGNADO" ("CAJERO", "ADMINISTRADOR") tenían un color gris oscuro hardcodeado (`#475569`). Se cambiaron a etiquetas con fondo sutil, borde definido y texto claro (`#CBD5E1`), totalmente nítidas.
       - Todo probado con navegador y desplegado a `siumax`.
    14. **Eliminación de fondos blancos en tablas (29/10 mañana):**
       - *"en las tablas hay mucho blanco arregla eso"*: El dueño envió una captura de Inventario mostrando barras de paginación (`PÁGINA 1 DE 2`), pastillas de stock (`0 UND`, `8 UND`), badges de SKU y caja del buscador en blanco puro.
       - Se adaptaron `TablaProductos.tsx`, `TablaLotes.tsx`, `EtiquetaStock.tsx` y `FiltrosInventario.tsx` a tokens semánticos del tema, y se agregaron reglas globales en `src/index.css` que convierten automáticamente cualquier fondo neutro (`#F8FAFC`, `#F1F5F9`, `#E2E8F0`, slate/gray) o pastel suave (`#ECFDF5`, `#FEF2F2`, `bg-red-50`, `#FFFBEB`) en superficies oscuras y acentos suaves en Modo Oscuro.
       - Validado con capturas en `siumax.duckdns.org` y desplegado.
    16. **Pase a producción oficial en Evicamp y GitHub (29/10 mañana):**
       - El dueño dio su autorización explícita: *"si procede"*.
       - Respaldo de Evicamp `/var/lib/postgresql/respaldo-evicamp-antes-fase4-2026-10-29T15-54-16-874Z.dump` (1.8 MB).
       - `servidor/sql/seguridad-sesion.sql` aplicado con `psql` y `SET lock_timeout = '5s'` en `postgres` (Evicamp) sin reiniciar la API (`activar-seguridad.sh` intacto).
       - Fusión de `fase-4` a `main` (commit `583ad4e`), despliegue con `node ai-scripts/deploy.cjs todos` y `git push origin main`.
    17. **Fase 4.3: Días de plazo en clientes y cálculo automático de fecha en caja (29/10 mañana):**
       - El dueño autorizó: *"vamos por el 4.3"*.
       - Aclaró expresamente: *"no quites lo de escoger fecha porque eso le gustó a mis clientes"* y *"todo excepto el limite de credito ahora si arranca"*.
       - Se acordó NO incluir límite de crédito monetario, mantener 100% funcional el selector/calendario de fecha en caja, y calcular automáticamente la fecha de vencimiento (`hoy + dias_plazo`) cuando se seleccione a un cliente con plazo acordado.
       - Base de datos `siuhub`: columna `dias_plazo integer` agregada a `customers`.
       - Ficha del cliente (`ModalFichaCliente.tsx`): nuevo campo numérico "Días de plazo para pagar" (ej. 7, 15, 30 días) con soporte de teclado completo (Enter, flechas ↑ ↓ ← →).
       - Directorio de clientes (`PestanaClientes.tsx` y `ModalDetalleCliente.tsx`): muestra `Xd plazo` en la fila y en la ficha. Muestra etiqueta roja `Vencido` si el cliente tiene deudas impagas vencidas.
       - Modal de cobro en caja (`ModalCobro.tsx`):
         - Selector de fecha nativo `#fiado-fecha` **100% intacto y disponible** para elegir cualquier día en el calendario.
         - Al seleccionar un cliente con plazo configurado, calcula y propone automáticamente su fecha límite (`hoy + dias_plazo`).
         - Botones rápidos `+7d`, `+15d`, `+30d` agregados para fijar fechas con un solo clic.
         - Aviso visual en caja si el cliente tiene deudas vencidas (`⚠ Tiene deudas vencidas`) y monto total de deuda pendiente actual.
       - Compilado con `npx tsc -b` (0 errores) y desplegado en `siumax.duckdns.org` para validación del dueño.
    18. **Ajustes de tabla de clientes: columna Plazo, scroll general y paginación doble (29/10 tarde):**
       - *"en la tabla no sale los dias de plazo como sabre cuantos tiene y otra cosa mas el scrooll tiene que ser de la ventana general como tambien falta para pasar a la pagina siguiente arriba como tambien al final agrega eso tiene que mostrar por lo menos 50 clientes por pagina"*:
       - El dueño envió una captura marcando con línea roja el scroll vertical que quedaba atrapado dentro del contenedor de la tabla en lugar de fluir con la ventana principal, y señaló que en la tabla no se distinguían los días de plazo de los clientes.
       - Se agregó una columna dedicada **"Plazo"** en la tabla con pastillas legibles (`15 días` o `—`).
       - Se removió `lg:h-full` y el `overflow-y` interno de la tabla, pasando a `overflow-x-auto` para que la tabla se expanda de forma natural y el desplazamiento sea fluido en el scroll de la ventana general.
       - Se agregaron controles de paginación sincronizados tanto arriba como al final de la tabla.
       - Se confirmó la visualización de 50 clientes por página (`POR_PAGINA = 50`).
       - Compilado y desplegado a `siumax.duckdns.org`.
    19. **Corrección de flujo del selector por teclado en paginación superior e inferior (29/10 tarde):**
       - *"perfecto pero falta que el selector pase por la siguiente pagina como tambien la de abajo el selector no pasa por ahi"*:
       - El selector de teclado se saltaba la paginación superior al bajar desde la barra o subir desde la primera fila, y no pasaba fluidamente a "Siguiente página" (>).
       - En la última fila de la tabla, al pulsar Flecha Abajo ⬇️, el selector no realizaba scrollIntoView hacia la paginación de abajo y el foco no tenía contraste evidente.
       - Se estandarizó el selector en ambos bloques de paginación (arriba y abajo):
         - Resaltado brutalista en amarillo neón con sombra negra (focus:bg-[var(--color-accent)] focus:shadow-[2px_2px_0_0_var(--color-ink)]) 100% visible.
         - Desplazamiento automático de pantalla (scrollIntoView) para que la ventana acompañe el foco al ir a la paginación inferior.
         - Tránsito bidireccional fluido: Flecha Abajo ⬇️ desde la barra entra a la paginación superior; Flechas ⬅️ y ➡️ alternan entre anterior y siguiente; Flecha Abajo ⬇️ baja a la fila 0; Flecha Abajo ⬇️ desde la última fila salta al botón de siguiente página inferior; Flecha Arriba ⬆️ sube a la tabla; Flecha Abajo ⬇️ en el pie cicla arriba al buscador.
       - Desplegado a siumax.duckdns.org.


### 29/10/2026 (tarde) · Claude — Videos tutoriales
- *"quiero crear imagenes de mi sistema y videos tu puedes crearme??"* → se explicó qué se puede (capturas, publicaciones, videos demo y para redes; sin voz).
- *"prioridad son el video puedes grabar como funciona el programa por partes osea crear varios videos tutoriales"* → se propusieron 9 tutoriales y hacer primero el de ventas como muestra.
- *"si hazlo"*:
  - Se creó la base demo `siudemo` (API interna, sin link público) con datos de una bodega ficticia.
  - Se armó el grabador en `D:\Programación\siumax\videos\grabador`.
  - Se grabó la muestra `02-como-hacer-una-venta.mp4`.
     20. **Tope en paginación inferior de Clientes (29/10 tarde):**
        - *"encontre otro error cuando bajo hasta abajo para selecionar la siguiente pagina pero de la parte de abajo sube hasta arriba deberia mantenerse ahi como un tope"*:
        - En la paginación inferior, al estar en el botón de página siguiente y presionar Flecha Abajo o Flecha Derecha, el código saltaba hacia el buscador superior provocando un desplazamiento no deseado de la ventana.
        - Se corrigió para que actúe como un TOPE firme: Flecha Abajo en el pie y Flecha Derecha en siguiente se mantienen en el botón sin saltar ni desplazar la ventana. Al dar Enter o Espacio para cambiar de página, el foco se mantiene en la paginación inferior.
        - Compilado y desplegado a siumax.duckdns.org.
     21. **Pase a producción oficial en Evicamp y GitHub de la Fase 4.3 (29/10 tarde):**
        - El dueño dio su autorización explícita: *"si sube el 4.3 a evicamp y a siumax y a mi github y luego avanza la propuesta 4.4"*.
        - Respaldo de seguridad en Evicamp: `/var/lib/postgresql/respaldo-evicamp-antes-fase4-3-2026-10-29T18-57-43-392Z.dump` (1.9 MB).
        - `seguridad-sesion.sql` aplicado con `psql` y `lock_timeout = '5s'` en `postgres` (Evicamp) sin reiniciar la API. Columna `dias_plazo integer` verificada en `customers`.
        - Despliegue de frontend a `evicamp`, `siumax` y `clientes` con `deploy.cjs todos`.
        - Fusión de `fase-4.3` a `main` y `git push origin main` a GitHub.
     22. **Implementación de Fases 4.4 (Mayorista), 4.5 (Cotizaciones) y 4.6 (Pedidos) en pruebas (29/10 tarde):**
        - El dueño solicitó: *"si vamos hacer la 4.4, 4.5 y 4.6"*.
        - En pregunta interactiva sobre reserva de mercadería, el dueño escogió: *"(Recomendado) Al guardarlo (separa la mercadería de inmediato para que ningún cajero la venda por error)"*.
        - Respaldo previo de `siuhub` en VPS: `/var/lib/postgresql/respaldo-siuhub-antes-fase4-completa-2026-10-29T19-08-24-497Z.dump` (204K).
        - Base de datos actualizada con columnas `es_mayorista` en `customers`, `precio_mayorista` en `products`, y tablas `cotizaciones`, `cotizacion_detalles`, `pedidos_clientes`, `pedido_detalles`. Trigger `fn_proteger_precios()` protege precio mayorista.
        - Frontend completado:
          - Ficha de cliente con toggle interactivo mayorista y badge `⭐ MAYORISTA` en el directorio.
          - Modal de producto con campo precio mayorista y visualización en tabla de inventario.
          - Recálculo automático de precios en la caja (POS) según el cliente sea mayorista o normal, e insignias en el ticket.
          - `ModalCotizacionPOS` (F7) y pestaña `Cotizaciones` con botón `Convertir en Venta`, WhatsApp e impresión.
          - `ModalPedidoPOS` (F8) con fecha de entrega, adelanto y reserva inmediata de stock en inventario (`inventory_movements`), y pestaña `Pedidos` con botón `Entregar y Cobrar Saldo` o `Cancelar (Devolver Stock)`.
        - Compilado y desplegado con éxito en el sitio de pruebas `siumax.duckdns.org` (20 archivos). Evicamp y GitHub intactos para su revisión.
     23. **Descuento porcentual fijo por cliente o empresa (29/10 tarde):**
        - El dueño consultó sobre precios mayoristas: *"en precio mayorista no es mejor poner un precio especial mayorista a cada cliente o familia o empresa que uno general para todos???"*.
        - Se analizaron las alternativas y en la pregunta interactiva el dueño seleccionó la Opción 2: *"Descuento % fijo por cliente o empresa (Ej: 10% de descuento en todo a Constructora ABC, muy fácil de mantener y actualizar)"*, confirmando con *"si hazlo"*.
        - Base de datos (`siuhub` en VPS): columnas `descuento_porcentaje numeric(5,2) DEFAULT 0` agregadas a `customers` y `grupos_clientes` con recarga de PostgREST.
        - Ficha de cliente y grupos: campos de descuento con botones de acceso rápido `[ 0% ]`, `[ 5% ]`, `[ 10% ]`, `[ 15% ]`, `[ 20% ]`.
        - Herencia de descuento: si el cliente pertenece a una empresa o familia con descuento, lo hereda en la caja automáticamente.
        - Caja POS: detecta el descuento, recalcula el carrito, muestra el precio rebajado en verde con el precio regular tachado en las tarjetas de producto, y coloca la insignia `🏷️ -XX%` en el ticket.
        - Compilado y desplegado a `siumax.duckdns.org`. Evicamp y GitHub intactos.
     24. **Renombrar base de datos de pruebas a 'siumax' (29/10 tarde):**
        - El dueño solicitó: *"quiero que mi base de datos se llame siumax"*.
        - Se confirmó mediante pregunta interactiva que se refería a la base de pruebas del sistema (`siuhub` -> `siumax`), manteniendo la de Evicamp (`postgres`) separada en producción.
        - Respaldo previo de seguridad: `/var/lib/postgresql/respaldo-siuhub-antes-renombrar-siumax-2026-10-29T20-52-20-830Z.dump` (369 KB).
        - En PostgreSQL: `ALTER DATABASE siuhub RENAME TO siumax;`.
        - PostgREST en VPS actualizado en `/etc/postgrest_siuhub.conf` apuntando a `siumax`.
        - Scripts del servidor (`activar-seguridad.sh`, `nuevo-cliente.sh`) y 27 scripts de pruebas de `ai-scripts/pruebas/` actualizados a `-d siumax`.
        - Evicamp (producción) y GitHub completamente intactos.
     25. **Ajustes y correcciones de la Fase 4 en pruebas (29/10 tarde):**
        - El dueño probó la fase 4 y reportó varios puntos:
          1. *Selector en ModalProducto*: al crear producto el selector no seleccionaba "Precio mayorista" ni permitía moverse de izquierda a derecha. Se agregó `input-precio-mayorista-producto` al Tab trap y flechas ← → bidireccionales con Precio sugerido, ↑ a fotos y ↓ a Unidad / Stock.
          2. *Cálculo de descuento %*: *"el precio del producto evelyn es 2 soles pero tiene un descuento ya que es mayorista del 10 porciento y sale 1 sol porque 1 sol no deberia ser 1.8 ???"*. Se corrigió `conCantidad` para que aplique el 10% de descuento directo sobre el precio base (2.00 - 10% = S/ 1.80) sin pisarlo con el precio mayorista.
          3. *Error estético en ticket*: el dueño envió captura con círculo rojo mostrando que `STK: 1000 UN` y las etiquetas colisionaban encima del subtotal `100.00`. Se aplicó `flex-wrap` y protección de ancho en la columna de subtotal para evitar cualquier solapamiento.
          4. *Reimprimir ticket en Finanzas*: el dueño señaló que al ver lo comprado en Finanzas no había opción para imprimir el ticket de nuevo. Se integró `[ 🖨️ Reimprimir Ticket ]` (con tecla P) conectado a `TicketImprimible` y `useImprimir`.
          5. *Nuevos registros al inicio de las tablas*: *"cuando creo un cliente nuevo o un producto o un lote nuevo no sale al principio de la tabla arreglar eso tambien"*. Se configuró el orden por defecto a `RECIENTES` y se actualizó la adición de clientes, productos y lotes para que aparezcan siempre al inicio de la tabla (fila 1, página 1).
          6. *Todos los datos de precios en tabla de inventario*: se expandió la columna de precios en `TablaProductos` para mostrar el precio normal, precio mayorista, escalas por cantidad (`x6+: S/ XX.XX`) y presentaciones (`CAJA x12: S/ XX.XX`).
        - `npx tsc -b` (0 errores), `npm run build` limpio y desplegado a `siumax.duckdns.org`. Evicamp y GitHub intactos.
     26. **Selector en Cotización, Pedido, Pago Mixto y Previsualización de Tickets (29/10 tarde):**
        - El dueño realizó pruebas adicionales y solicitó:
          1. *"esta mal comodado quita el -10 porciento de lo que marque con rojo porque ya esta arriba"*: se eliminó la etiqueta de línea individual `-10%` en `TicketVenta.tsx`, dejando el ticket limpio y ordenado con la indicación en la cabecera.
          2. *"ahora lo del precio mayorista del producto es 1 sol pero con el descuento del cliente -10 porciento ceria 0.9"*: se ajustó `conCantidad` para que si el cliente tiene descuento % y el producto tiene precio mayorista, el descuento aplique sobre el precio mayorista (S/ 1.00 - 10% = S/ 0.90).
          3. *"el selector no baja para reimprimir ticket y otr acosa no me sale la previsualisación para imprimir"*: en `ModalDetalleTicket.tsx` se integró la previsualización visual real del ticket de 80mm con pestañas `[ 🧾 Ticket ]` y `[ 📋 Tabla ]`, foco inicial automático en `[ 🖨️ Reimprimir Ticket ]`, navegación fluida con flechas ↑ ↓ y tecla P para reimprimir de inmediato.
          4. *"cuando entro a cotización no sale el selector"*: en `ModalCotizacionPOS.tsx` se agregó selector por teclado completo con flechas ↑ ↓ ← → (moverse entre DNI/RUC y Celular, y Fecha y Observaciones), foco inicial automático y Focus Trap.
          5. *"cuando entro a pedido no sale el selector no te olvides moverme izquierda y derecha"*: en `ModalPedidoPOS.tsx` se habilitó navegación de selector con flechas en 2D (incluyendo ← → entre campos en columnas).
          6. *"me e dado cuenta que el metodo de pago de pedidos no es mixto osea que pasa si el cliente quiere pagar en efectivo una parte y en yape o tarjeta la otra arregla eso"*: se transformó el adelanto de pedidos a **pago mixto en 3 columnas** (Efectivo, Yape/Plin, Tarjeta) con suma automática del total de adelanto y saldo pendiente restante.
        - Todo compilado (`npx tsc -b`, `npm run build`) y desplegado a `siumax.duckdns.org`. Evicamp y GitHub intactos.
     27. **Selector en Cotizaciones/Pedidos y Recuperación de Foco en todas las sesiones/ventanas (29/10 tarde):**
        - El dueño reportó: *"el selector solo funciona en el buscador arregla eso lo mismo en pedido otra cosa si entro y salgo de la ventana no funciona el selector no marca nada arregla eso con todas las sesiones"*.
        - Se implementó la navegación completa del selector de grilla en `PestanaCotizaciones.tsx` y `PestanaPedidos.tsx`:
          - Desde el buscador (`buscador-cotizaciones` / `buscador-pedidos`), flecha Abajo o Enter bajan de inmediato a las filas (`coti-row-0` / `ped-row-0`), y flecha Derecha pasa a los botones de filtro.
          - Botones de filtro de estado navegan con flechas ← →, Abajo salta a la tabla, y Arriba regresa a la barra de pestañas.
          - Filas con atributo `data-row="true"` y resaltado de selector nítido (`focus:ring-4 focus:ring-black focus:bg-amber-100`). Flechas Arriba/Abajo navegan entre filas, y Derecha salta a `[Ver Detalle]` / `[Ver Pedido]`.
          - En `ventanas.ts`, `App.tsx` y `navegacionSesion.ts`: se blindó la recuperación de foco automática. Al cerrar cualquier modal o volver a entrar a la ventana desde otra aplicación o hacer clic fuera, si el foco queda en el vacío (`body`), el sistema re-enfoca automáticamente el elemento primario de la sesión activa, evitando que el selector desaparezca en cualquiera de las sesiones.
        - Compilado y desplegado a `siumax.duckdns.org`. Evicamp y GitHub intactos.
     28. **Selector en Modales y Corrección de Resaltado Claro en Modo Oscuro (29/10 tarde):**
        - El dueño reportó:
          1. *"el selector no funciona ahi"* (captura de modal 'Pausar ticket en espera'): no se podía bajar con flechas desde el texto a los botones. Se agregó navegación con flechas en 2D (Abajo/Arriba entre texto y botones, Izquierda/Derecha entre botones Cancelar y Guardar) y anillo de foco ámbar de alto contraste.
          2. *"otro error el color es muy claro"* (captura de lista de cotizaciones): la fila seleccionada tenía un fondo `bg-amber-100` deslumbrante en modo oscuro que no dejaba leer el texto blanco. Se reemplazó por variables nativas del tema (`bg-[var(--color-bg-2)] border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]`) tanto en Cotizaciones como en Pedidos.
          3. *"el selector no funciona aqui"* (captura de modal 'Detalle de proforma'): los botones no tenían selector ni respondían a flechas de teclado. Se implementó navegación 2D completa con flechas, autofoco inicial al abrir, focus trap con Tab y anillos dorados brillantes de alto contraste en los modales de Cotizaciones y Pedidos.
        - Compilado (`npx tsc -b`, `npm run build`), desplegado a `siumax.duckdns.org`. Evicamp y GitHub intactos.
     29. **Pase Oficial de la Fase 4 a Producción (Evicamp y GitHub) y Decisión de ir a Fase 3 (29/10 noche):**
        - El dueño confirmó: *"perfecto ya no tengo mas pruebas ya quedo ahora en que fase estamos ???"*.
        - Se le explicó la diferencia entre cotización (sin dinero ni reserva de stock) y pedido (con adelanto y reserva de stock).
        - El dueño autorizó explícitamente subir a producción: *"si hazlo y vamos a las fase 3"*.
        - Se aplicó la migración completa de Fase 4 en Evicamp (base `postgres`) con respaldo previo (`.dump` de 1.9 MB), `lock_timeout = '5s'` y sin reiniciar la API.
        - Se desplegó la web a `evicamp.duckdns.org` (20 archivos subidos).
        - Se fusionó la rama `fase-4-completa` a `main` y se hizo `git push origin main`.
        - Se inicia la preparación de la propuesta de la **Fase 3: Búsquedas especializadas por Marca, Modelo, Medidas y Laboratorio**.
      30. **Implementación de la Fase 3 en Pruebas (29/10 noche):**
        - El dueño dio luz verde: *"si dale vamos !!!! }"*.
        - Rama creada y activa: `fase-3-busqueda-especializada`.
        - Respaldo de seguridad en VPS (`siumax`): `/var/lib/postgresql/respaldo-siumax-antes-fase3-2026-10-30T01-38-11-069Z.dump`.
        - Migración aplicada en base de datos `siumax` (columnas `marca`, `modelo`, `medida`, `laboratorio`, `ubicacion` e índices).
        - Implementación completa en `ModalProducto.tsx`, `TablaProductos.tsx`, `TerminalBusqueda.tsx`, `Inventario/index.tsx`, `Punto-de-venta/index.tsx`, `ModalLote.tsx`, `PanelCompras.tsx`, `ModalAjuste.tsx`, `ModalEditarSalida.tsx`, `ModalFiado.tsx`.
        - Compilado (`npx tsc -b`, `npm run build`) y desplegado a `siumax.duckdns.org`. Evicamp y GitHub completamente intactos.


