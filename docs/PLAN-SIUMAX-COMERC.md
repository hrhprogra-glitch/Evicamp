# Plan de SiuMax Comerc: estado, fases y forma de trabajo

> Documento para continuar el trabajo con **cualquier IA o programador**. Léelo completo antes de tocar el código.
> **⚠️ Cambio de plan (17/11/2026): todo será un solo sistema, SiuMax Nego (`negosiumax`).** La visión original de
> "un sistema por tipo" está en `D:/Programación/siumax/TIPOS-DE-NEGOCIO.md` y hoy es **histórica**. Memoria principal
> y fuente de verdad: `D:/Programación/siumax/CLAUDE.md`. Este plan queda como referencia del origen de Nego.
> Última actualización: 18/11/2026.

## ▶ DÓNDE ESTAMOS AHORA (actualizar después de cada paso)
- **19/11/2026 (188) — Un solo buscador de cliente con nota dentro del desplegable, probado solo en Nego:** el dueño insistió en que *"todo tiene que ser dentro del buscador"* y que no salga ningún botón ni campo aparte. Se quitaron el botón «+ Cliente no registrado» y su campo; la lista flotante (que no mueve el formulario) incluye ahora una última opción «Registrar "<nombre>" como nota», que se elige con clic o flechas + Enter. La nota queda dentro del cuadro y se guarda en observaciones, **sin crear cliente en la base** (la salida sigue necesitando un cliente registrado como referencia). Desplegado **solo en Nego** (22 archivos); prueba adaptiva **115/115, 0 fallos** con teclado y sin internet en 390/768/1366/1920. El dueño aclaró que seguimos **en pruebas**: no publicar en el oficial, él actualiza Evicamp, ecosistema y siumax desde el Panel y hace el push. Sin base, sin credenciales.
- **19/11/2026 (187) — Desplegable de cliente flotante en Nueva salida, probado solo en Nego:** el dueño dijo que al escribir *"se mueve todo, no está como encima"*. La lista estaba en flujo normal dentro del scroll del modal y empujaba el formulario. Ahora se dibuja como capa fija (`createPortal` en `document.body`) anclada al cuadro del buscador, sin mover nada; conserva ids, flechas, Enter, Escape, foco y estilo sobrio. Desplegado **solo en el sitio de pruebas Nego** (22 archivos); prueba adaptiva **103/103, 0 fallos** con teclado y sin internet en 390/768/1366/1920 (5 comprobaciones nuevas por tamaño). El dueño aclaró que primero se prueba y luego **él actualiza Evicamp, ecosistema y siumax desde el Panel cuando crea clientes**: no desplegar esos sitios ni hacer push. Sin base, sin credenciales.
- **19/11/2026 (186) — Nombre de arriba `ECO SISTEMAS URH` solo en el sitio oficial:** el dueño vio que la pestaña decía `SiuMax Nego` y pidió cambiarlo; entre las opciones eligió **`ECO SISTEMAS URH`**. `index.html` cambia título, meta de app instalada y manifiesto solo cuando el dominio es `ecosistema123.duckdns.org`; nuevo `public/manifest-ecosistema.json`; `offline.html` y el respaldo del menú también usan ese nombre. Desplegado solo en ecosistema (22 archivos + iconos repuestos). Prueba oficial **35/35, 0 fallos** (4 comprobaciones nuevas de nombre) con teclado y sin internet en 390/768/1366/1920. Nego, Evicamp y Panel siguen igual; sin base, sin credenciales y sin push. Sigue pendiente la confirmación visual del logo.
- **18/11/2026 (185) — Apariencia Océano predeterminada solo en el sitio oficial:** el dueño pidió *"que esté como predeterminado el océano"* (la apariencia) y eligió que sea **solo en `ecosistema123.duckdns.org`** y **respetando el tema que cada dispositivo ya eligió**. Nuevo `src/utils/tema.ts`; `index.html` detecta el dominio y pone Océano como tema inicial, mientras Nego y Evicamp siguen en Clásico. `App.tsx` y `ThemeSwitcher.tsx` usan la misma fuente; la etiqueta «(Por defecto)» y el autofoco apuntan al tema correcto. Desplegado **solo en ecosistema** (21 archivos + iconos repuestos). Prueba oficial **31/31, 0 fallos** (2 comprobaciones nuevas de tema) con teclado y sin internet en 390/768/1366/1920; sitios ajenos siguen 200. Sin Evicamp, sin base, sin push.
- **18/11/2026 (184) — Administrador del sitio oficial con correo de ecosistema:** el dueño pidió que en `ecosistema123.duckdns.org` el usuario sea `admin@ecosistema.com` y la clave nueva (no el de Nego). Se cambió **solo en la base `ecosistema`** el empleado administrador `be9159d6-…`: correo nuevo, hash bcrypt nuevo y sesiones viejas borradas. `fn_login` compara correo exacto y `password_hash`; el campo viejo `password` no se usa para entrar. La prueba del sitio oficial pasó a leer las credenciales desde `.env.vps` (`ECOSISTEMA_ADMIN_USUARIO` / `ECOSISTEMA_ADMIN_CLAVE`, sin valores en docs) y volvió a dar **29/29, 0 fallos** con teclado y sin internet en 390/768/1366/1920. Nego, Evicamp, Panel y los otros administradores siguen igual. Sin deploy, sin push, sin clave en docs ni commits. Sigue pendiente la confirmación visual del logo de 183.
- **18/11/2026 (183) — Sitio oficial de ECO SISTEMAS URH HECHO en `https://ecosistema123.duckdns.org/`:** el dueño creó el dominio, dijo que es **oficial y especial para su cliente ECO SISTEMAS URH (el primero, NO paga, igual que Evicamp)** y que el logo `icon-192.png` es de ecosistema. Se creó en el VPS la base propia `ecosistema` (copia limpia de la de pruebas: 492 clientes, 518 productos, 374 salidas, 5 empleados, sin filas de prueba) con los datos reales (RUC `20502059751`) y el logo incrustado, su API en el puerto 3200 con la misma seguridad de sesión, y su sitio HTTPS sin `/suscripcion.json` (404) → **sin aviso de plan ni botón de pago, y no está en el Panel**. El logo también está en los 5 iconos del sitio y hay un script para reponerlos tras cada deploy. Pruebas: **83/83** de teclado y **29/29** de logo/sin internet/sin cobro en 390/768/1366/1920. Evicamp, Panel, `/actualizaciones/` y `nego.siumax` siguen igual. Falta que el dueño confirme el logo visualmente. Sin push.
- **18/11/2026 (183) — Dominio propio `ecosistema123.duckdns.org` para Nego/Eco-Sistema + logo del dueño: PROPUESTA esperando el OK:** el dueño pidió *"pasarlo a ecosistema"*, crear ese dominio y poner el logo `D:/Programación/eco-sistema/public/icons/icon-192.png`. Investigado sin cambios: Nego sigue solo en `nego.siumax` (base `siumax`, API 3001); el VPS es `72.60.242.133`; **no hay token de DuckDNS en `.env.vps`**, así que el alta del dominio la hace el dueño en su cuenta o deja su token en ese archivo. Propuesta: sitio propio con Nginx + HTTPS y una copia del Nego actual; base/API propias cargadas desde la copia de pruebas de Eco (7.328 filas) previo respaldo; logo en `empresa_config.logo_url` y en `public/icons/`; prueba con teclado y sin internet en cuatro tamaños; docs, graphify y commit local. Faltan dos decisiones del dueño: quién crea el dominio y si esto ya es la **pasada oficial** o solo un sitio de prueba. Sin Evicamp, sin push, sin tocar otros clientes ni bases ajenas. No se cambió código ni se desplegó nada.
- **18/11/2026 (182) — Buscador desplegable de cliente y botón de cliente no registrado en Nueva salida HECHOS (aprobado con "empieza"):** el dueño pidió que el cliente se ingrese en un buscador desplegable y que, si el nombre no está registrado, se pueda poner como nota con un botón. El `<select>` se cambió por `buscar-cliente-salida`: escribes nombre/DNI/RUC, salen coincidencias y eliges con ↑ ↓ + Enter o clic; el foco se queda en el cuadro. El botón `+ Cliente no registrado (como nota)` abre el campo libre, que se sigue guardando como `CLIENTE: NOMBRE` en observaciones; no crea clientes en la base (la salida necesita uno registrado como referencia por FK). Se restauró la excepción `data-permitir-salto-enter` en `flechasEspaciales.ts`, perdida al volver a 177. Prueba adaptiva ampliada: **83/83, 0 fallos, 0 sin datos** en 390/768/1366/1920; `build` limpio y desplegado solo en Nego (21 archivos). Sin Evicamp, sin push, sin pasada oficial ni Fase 5. SQL y base intactos. El pedido pospuesto de salidas pendientes en Agenda sigue en espera.
- **18/11/2026 (181) — Volvimos al comienzo: Nueva salida queda como en 177 (178, 179 y 180 RECHAZADAS):** el dueño vio la fase 180 y dijo *"no me gusto dejalo como estaba antes"*; preguntado, eligió **"Ventana flotante original (177)"** y añadió **"desde el comienzo"**. Se restauraron los 8 archivos tocados por 178/179/180 a su versión de `fc1aae3` (`git diff fc1aae3` = 0). No hay pasos, stepper, sub sesión ni tres apartados: vuelve la ventana flotante de siempre sobre la lista, con el buscador en su flujo anterior. Se conservan las mejoras de 177 (nombres libres, producto arriba, cámara sin internet, borrador, F10, ids, flechas, teclado, estilo sobrio, Caja y Agenda adaptivas). Prueba de 177 restaurada: **47/47, 0 fallos, 0 sin datos** en 390/768/1366/1920; `build` limpio y desplegado solo en Nego (21 archivos). Sin Evicamp, sin push, sin pasada oficial ni Fase 5. SQL y base intactos. El pedido pospuesto de salidas pendientes en Agenda sigue en espera.
- **18/11/2026 (178) — Pedido nuevo: "Nueva salida" debe ser una sub sesión grande, no una ventana; propuesta esperando el OK (RECHAZADA en 181):** el dueño dijo que la mejora de 177 estuvo bien, pero que la salida se siente "muy comprimida" y la quiere como **una sub sesión grande que se vea claro todo**, en vez de una ventana flotante. Investigado con graphify y lectura: hoy `Salidas/index.tsx` monta `ModalNuevaSalida` como capa `fixed inset-0` con `max-w-5xl` y `max-h-[calc(90dvh/var(--ui-zoom))]`, con scroll interno; la lógica, ids, borrador, cámara y guardado viven en el componente y se pueden reutilizar. Propuesta: modo `sesion` dentro de Salidas (se ocultan cabecera y tabla), cabecera con "← Volver a la lista", ancho completo y scroll normal de página, columnas 1/2/3, foco al volver, ids/atajos/flechas/cámara/guardado intactos y prueba adaptiva en 390/768/1366/1920. No se cambió código, no se probó, no se desplegó; sin Evicamp, sin push, sin pasada oficial ni Fase 5. SQL y base intactos. El pedido pospuesto de salidas pendientes en Agenda sigue en espera.
- **18/11/2026 (177) — Salida rápida, teclado de Caja y Agenda adaptiva HECHOS (aprobado con "si"):** con el plan de 176 ejecutado, la Salida trae todos los bienes del cliente, acepta nombres libres de cliente y de "lo que se atiende" como nota en `observaciones`, pone el material nuevo arriba, fija el buscador en celular y usa la cámara sin internet. En Caja, tocar/deslizar los resultados guarda el teclado y el botón "✓ Listo" evita que el imán general lo reabra. Agenda abre a pantalla completa en celular con campos grandes, sin teclado ni scroll forzados al entrar; tablet/laptop/PC conservan su forma. Prueba con teclado y sin internet en 390/768/1366/1920: **47/47, 0 fallos**. `build` limpio y desplegado solo en Nego (21 archivos). Sin Evicamp, sin push, sin pasada oficial ni Fase 5. SQL y base intactos (`{servicios}`). El pedido pospuesto de salidas pendientes en Agenda sigue en espera.
- **18/11/2026 (176) — Pedido nuevo: salida rápida, teclado de Caja, nombres libres y Agenda incómoda en celular, propuesta esperando el OK (hecha en 177):** el dueño pidió: más opciones en "Lo que se atiende" (sale una sola), escribir cualquier nombre de cliente si no está registrado (al menos como nota), que el producto nuevo entre arriba, que el teclado del celular se esconda al mover/ver productos en Caja, que el registro de salida sea rápido y amplio en celular/tablet/laptop/PC, y que la ventana de Agenda sea cómoda en celular (al ingresar un trabajo nuevo "intento bajar y como que intenta subir"). Exige un **enfoque adaptivo al celular y la tablet** (laptop y PC son similares), con todo claro y bien acomodado. Ya se investigó con graphify y se entregó el plan de 5 pasos con Agenda incluida. No se cambió código, no se probó, no se desplegó; sin Evicamp, sin push, sin pasada oficial ni Fase 5. Base y SQL intactos. El pedido pospuesto de salidas pendientes en Agenda sigue en espera.
- **18/11/2026 (175) — Todas las tablas de Nego a 50 filas por página:** con el *"si"* del dueño, las que paginaban de 10/15/20/25 pasaron a 50 (Herramientas, Compras, Pedidos, Contratos, Taller, Salidas, Historial de cajas y Movimientos) y se agregó `PaginacionSobrio` de 50 a Cotizaciones, Usuarios y Rentabilidad / Técnicos / Materiales / Cobranzas. Franja siempre visible, búsqueda/filtro/período vuelven a la página 1, ids y atajos intactos. Prueba con teclado y sin internet **48/48, 0 fallos, 1 tabla sin datos** (Cobranzas). `build` limpio y desplegado solo en Nego. Sin Evicamp, sin push, sin pasada oficial ni Fase 5. Base sin tocar (`{servicios}`).
- **17/11/2026 (174) — Clic en cualquier fila abre el detalle, como Inventario > Productos:** con el "hazlo" del dueño, las tablas que no lo tenían ya abren detalle con clic o Enter: Herramientas, Vehículos y Salidas (se agregó el clic), Utilidades (Rentabilidad, Técnicos, Materiales, Cobranzas y Ranking) y Contratos (Visitas y Cobros), con un modal sobrio de solo lectura nuevo (`ModalDetalleFila.tsx`). Botones internos no abren el detalle; ids, atajos, flechas y paginación intactos. Prueba con teclado y sin internet **12/12, 0 fallos** (3 tablas vacías en Nego, "sin datos"). `npm run build` limpio y desplegado solo en Nego. Sin Evicamp, sin push, sin pasada oficial ni Fase 5. Base sin tocar (`{servicios}`).
- **17/11/2026 (173) — Dueño dejó en espera lo de salidas pendientes en Agenda:** dijo *"mejor olvidalo ya tengo otra dia
  para eso"*. No se implementó nada, no se probó nada y no se desplegó nada. La propuesta sigue guardada (172) por si la
  pide otro día; no adelantarla. Sin Evicamp, sin push, sin pasada oficial ni Fase 5.
- **17/11/2026 (172) — Salidas pendientes en Agenda: propuesta esperando el OK:** el dueño pidió que las salidas
  `EN_PROCESO` se vean en Agenda como las finalizadas. Hoy el detalle del trabajo muestra el mismo aviso verde para
  ambas y la tarjeta no muestra nada. Propuesta: traer el estado de la salida, etiqueta amarilla para pendiente en
  tarjeta y detalle, verde para finalizada; sin tocar ids, atajos, estilo, stock ni Taller; prueba con teclado y sin
  internet. No se cambió código; sin Evicamp, sin push, sin pasada oficial ni Fase 5.
- **17/11/2026 (171) — Visitas de Contratos arregladas y prueba del Taller reforzada:** con el "empieza" del dueño,
  `fn_generar_visitas_contrato` ya crea visitas cuando el contrato empieza a mitad de mes; SQL aplicado solo en Nego
  con respaldo y `lock_timeout`. Pruebas con teclado y sin internet: Contratos todo OK (30/30) y Taller todo OK
  (42/42). No se tocó la lógica de stock ni se desplegó frontend. Base `{servicios}`. Sin Evicamp, sin push, sin
  pasada oficial ni Fase 5.
- **17/11/2026 (170) — Diagnosticados los 2 fallos nuevos, propuesta esperando el OK:** Contratos genera 0 visitas
  porque la función SQL solo mira días 1 y 15 (o `dia_cobro`) y el contrato empieza el 17; por eso no aparece
  "Insumos". Taller sí devuelve el stock: el trigger está en la base y la prueba pasó 41/41 dos veces. No se cambió
  código ni se desplegó; base `{servicios}`. Sin Evicamp, sin push, sin pasada oficial ni Fase 5.
- **17/11/2026 (169) — Se respeta solo Servicios y las pruebas devuelven la elección del dueño:** `tiposNegocio.ts` ya
  no cae a Comercio con valores vacíos; 9 pruebas guardan y restauran el tipo inicial en vez de forzar Comercio.
  Nueva prueba **7/7** (al entrar, visibilitychange, tras 60 s, sin internet y base final). Tablas de Cotizaciones,
  Salidas, Compras y Utilidades al molde; secuencia `salidas_id_seq` corregida (374/374). Base final `{servicios}`.
  Sin Evicamp, sin push, sin pasada oficial ni Fase 5.
- **17/11/2026 (168) — Paginación siempre visible y tablas iguales a Inventario:** nueva franja compartida
  (`PaginacionSobrio.tsx`) en Herramientas, Vehículos, Compras, Contratos, Taller, Utilidades y Pedidos; se muestra
  aunque diga "Página 1 de 1". Salidas, Contratos, Taller y Utilidades se restilizaron al molde de Inventario.
  Arreglado el teclado (↑ a la paginación, salto doble en Herramientas/Vehículos) y la regresión de Encargos: con solo
  Servicios ya no sale la pestaña Pedidos. Pruebas: **29/29, 13/13, 17/17, 9/9, 11/11, 50/50 y 28/28**. Base limpia
  (36|34, 0 de prueba) y tipo `{comercio}`. Solo en Nego.
- **17/11/2026 (167) — Tablas de Herramientas y Vehículos idénticas a Inventario:** mismo marco, cabecera oscura,
  columnas en 12, padding y **alto de fila de 79 px**; se quitaron los cuadros de "Flota de vehículos / Alertas SOAT /
  Alertas Rev. Técnica" (el dueño cambió de opinión: *"cambie de opinion los cuadros si borralos"*). Medido 50/50
  idéntico; probado con teclado y sin internet (13/13, salida 17/17, sidebar 9/9, Fase 4 11/11). Solo en Nego.
- **17/11/2026 (166) — Arreglado el Coca Cola borrado en Nueva salida:** el catálogo del modal ahora trae solo
  productos activos (`is_active = 1`) y, cuando se quitan todos los materiales, se borra el borrador guardado para que
  no reaparezcan al reabrir. Probado con teclado y sin internet: **17/17**; siguen bien el sidebar (**9/9**) y la
  Fase 4 (**11/11**). Solo en Nego.
- **17/11/2026 (165) — Arreglado el sidebar:** al abrir el menú con Tab, el selector volvía al **primer botón** en vez de
  a la sesión abierta (pasaba tras recargar, porque `currentView` se reiniciaba en `'pos'`). `App.tsx` ahora recuerda la
  sesión al recargar y usa la misma sesión corregida que el sidebar. Probado con teclado y sin internet: **9/9**; la
  Fase 4 sigue **11/11**. Solo en Nego.
- **17/11/2026 (164) — Fase 4 de la migración Eco → Nego HECHA SOLO EN PRUEBAS (nego.siumax.duckdns.org):** 33 PDF + 1
  foto comprimida en el VPS; 34 enlaces en `compras.archivos` (base `siumax`, con respaldo previo); el detalle de Compra
  ya tiene **Ver factura / Ver foto** y **Adjuntar PDF o foto**. Probado con teclado y sin internet: **11/11**.
  **NO es la pasada oficial**: sin Evicamp, sin push y sin Fase 5 hasta que el dueño lo diga.
- **⚠️ 17/11/2026 (163) — CAMBIO DE PLAN:** el dueño decidió que **no habrá sistemas separados**: todo es
  **negosiumax**. Comerc y Servic son referencia histórica. La copia de Eco a la VPS **ya se hizo como prueba**
  (7.328 filas en `siumax`); la pasada oficial y la Fase 4 (PDF/fotos) siguen esperando su OK. El **500 de Eco de hoy**
  (clave vieja en Vercel) ya está resuelto. No volver a preguntar ni decir que está desactualizado.
- **Última actualización anterior:** 17/11/2026 (162), Claude: migración Eco → Nego. **Fase 3 hecha** (7.328 filas cargadas y comprobadas en `siumax`; detalle en `migracion-eco/reporte-carga.md`). **Fase 4 DECIDIDA** (antecedente; ver (164), ya hecha en pruebas): copiar **solo los archivos de compras** (33 PDF + 1 foto) al VPS, comprimir las fotos, y agregar en el detalle de Compra la opción de ver/adjuntar el PDF y las fotos.
- (161) 17/11/2026, Claude: migración Eco → Nego, **Fase 3 hecha** (carga de prueba en la base `siumax`): **7.328 filas** cargadas y comprobadas (493 clientes, 519 productos, 603 lotes, 374 salidas con 2.745 ítems, 1.680 movimientos, 53 herramientas, 28 préstamos, 63 cotizaciones, 8 usuarios). Se puede deshacer con `ai-scripts/migrar-eco.cjs`.
- (160) 17/11/2026, Claude: migración Eco → Nego, **Fase 2 hecha** (comparación y mapeo, solo análisis): Eco 24 tablas → Nego 55; cuadro completo y 7 preguntas para el dueño en `docs/MIGRACION-ECO-A-NEGO.md`. Volumen real a migrar: ~6.000 registros.
- (159) 16/11/2026, Claude: migración Eco-Sistemas → Nego, **Fase 1 hecha** (inventario y respaldo, solo lectura): 24 tablas, 22.985 filas, respaldo de 28 MB verificado con 0 diferencias. Detalle: `docs/MIGRACION-ECO-A-NEGO.md`.
- (158) 14/11/2026, Claude: Nueva salida muestra la foto de cada material y letras más grandes (lista con foto, elegida por el dueño). Solo siumax.
- (157) 13/11/2026, Claude: compresión (gzip) activada en Evicamp con el OK del dueño (solo Nginx; programa de 2,6 MB a 0,66 MB). Sigue pendiente, con su aviso, subir el sistema a Evicamp.
- (156) 13/11/2026, Claude: calendario sin atrapar el selector; carga más rápida: Utilidades sin las fotos (en Evicamp pesaban 27 MB), tablas grandes en paralelo y compresión en nego.siumax (de 3 MB a 0,76 MB). Para Evicamp falta su aviso: compresión (solo Nginx) y subir el sistema. Solo siumax.
- (155) 13/11/2026, Claude: ↑ ↓ ya se mueven en las líneas de la cotización y en el buscador / la cantidad de la salida (tablas de campos con `data-tabla-campos`). Probado 25/25. Siguiente: lo que diga el dueño.
- (154) 13/11/2026, Claude: se borraron `comerc.siumax` y `servic.siumax` (pruebas solo en `nego.siumax`; copia de Servic guardada); Compras con buscador y filtro en una fila; Nueva cotización con "Seleccionar producto del inventario". Probado 22/22 y 7/7. Siguiente: lo que diga el dueño.
- (153) 12/11/2026, Claude: **SiuMax Nego, fase 4**: link de pruebas `nego.siumax.duckdns.org` (el mismo sistema de pruebas; `comerc.siumax` sigue) y el Panel crea clientes `<negocio>.nego.siumax.duckdns.org` eligiendo sus tipos de negocio. Probado en el VPS con un cliente temporal (crear, cambiar link, suspender, borrar). Mercado Pago y Evicamp sin tocar. Antes del primer cliente real hay que subir Nego a producción. Siguiente: lo que diga el dueño (ECO SISTEMAS URH espera: no proponer pasarlo, 13/11/2026).
- (152) 12/11/2026, Claude: sección **Encargos** (Cotizaciones + Pedidos; nombre elegido por el dueño) y avisos "Cotizaciones" y "Pedidos" en la Caja, acomodados en celular, tablet, laptop y PC. Probado 28/28 y 40/40. Siguiente: fase 4 (Panel y links nego), esperando su OK. Solo siumax.
- (151) 12/11/2026, Claude: **SiuMax Nego, paso 3h (parte 2)**: Utilidades de servicios (Rentabilidad, Técnicos, Materiales, Cobranzas, con el Taller) junto a Productos; cálculos de Servic corregidos. Probado 19/19. **Fase 3 terminada.** Siguiente: fase 4 (Panel y links nego), esperando su OK. Solo siumax.
- (150) 12/11/2026, Claude: **SiuMax Nego, paso 3h (parte 1)**: una sola pantalla de Cotizaciones (Comercio + Servicios; se quitó la pestaña de Clientes), con 3 errores de Servic corregidos en los abonos. Probado 40/40. Falta la parte 2: informes de servicios en Utilidades. Solo siumax.
- (149) 12/11/2026, Claude: **SiuMax Nego, paso 3g**: Contratos (de Servic) y stock: los repuestos del taller y los consumos de contratos descuentan stock por lotes (se corrigió un error de Servic con el costo). Probado 30/30 y 41/41. Siguiente: 3h, Cotizaciones y Utilidades (esperando su OK). Solo siumax.
- (148) 12/11/2026, Claude: **SiuMax Nego, paso 3f**: Agenda y Taller (de Servic), probadas con teclado (38/38) y con Enter que se queda. Pendiente de decidir: que los repuestos del taller descuenten stock. Siguiente: 3g, Contratos (esperando su OK). Solo siumax.
- (147) 12/11/2026, Claude: Enter en las ventanas traídas de Servic ahora deja el selector en su sitio (regla 7; decidido por el dueño, para siempre). Siguiente: 3f, Agenda y Taller (esperando su OK). Solo siumax.
- (146) 12/11/2026, Claude: **SiuMax Nego, paso 3e**: Salidas a obras y servicios (de Servic), probada con material externo y con producto del inventario (descuenta stock). Pendiente de decidir: Enter en sus formularios (regla de Nego vs. la de Servic). Siguiente: 3f, Agenda y Taller. Solo siumax.
- (145) 12/11/2026, Claude: cabecera de Inventario en una fila con la pestaña Herramientas (medido en todas las secciones a 1920 y 1366 con `medir-cabeceras-nego.mjs`). Siguiente: 3e, Salidas. Solo siumax.
- (144) 12/11/2026, Claude: **SiuMax Nego, paso 3d**: Inventario con la pestaña Herramientas y vehículos (de Servic, solo con Servicios); Nuevo producto ya tenía Marca/Modelo/Ubicación. Siguiente: 3e, Salidas. Solo siumax.
- (143) 12/11/2026, Claude: **SiuMax Nego, paso 3c**: Clientes con pestaña Trabajadores, lo que se atiende en el detalle y correo/contacto/notas en la ficha (solo con Servicios); sin Comercio no salen las cosas de tienda. Siguiente: 3d, Inventario. Solo siumax.
- (142) 12/11/2026, Claude: **SiuMax Nego, paso 3b**: menú, atajos y permisos según el tipo de negocio (grupo Servicios con secciones "Pronto"; solo-servicios sin Caja ni Finanzas; solo Comercio queda igual). Siguiente: 3c, Clientes con Trabajadores. Solo siumax.
- (141) 12/11/2026, Claude: **SiuMax Nego, paso 3a**: la base de Servic (20 tablas, 13 funciones) entra en `seguridad-sesion.sql`, con permisos propios que no tocan los de Comerc; aplicada solo en siumax. Solo-servicios no ve Caja ni Finanzas. Siguiente: 3b, prender y apagar secciones por tipo. Solo siumax.
- (140) 12/11/2026, Claude: **SiuMax Nego, fase 2**: Ajustes → "Tipo de negocio" (7 tipos, uno o varios, "Próximamente" los que no existen; columna `empresa_config.tipos_negocio` solo en la base siumax). Siguiente: fase 3, partes de Servic (espera OK). Solo siumax.
- (139) 12/11/2026, Claude: **SiuMax Nego, fase 1**: el nombre visible "SiuMax Comerc" pasa a "SiuMax Nego" (plan: final de `siumax/TIPOS-DE-NEGOCIO.md`). Siguiente: fase 2, "Tipo de negocio" en Ajustes (espera OK). Solo siumax.
- (138) 12/11/2026, Antigravity: **Escáner de códigos de barras por cámara EXCLUSIVO para celular (`< 768px`)** en todos los buscadores y registros de productos de SiuMax Comerc (Caja, Conteos, Nuevo ajuste, Inventario Productos/Lotes, Nuevo producto, Ingresar lote, Compras, Armar producto, Traspasos, Utilidades, Créditos y Tienda Web). Funciona 100 % sin internet (`BarcodeDetector` nativo + decodificador propio `EAN-13`/`UPC-A`/`EAN-8`/`CODE-128`), con estilo SiuMax Sobrio (`0px` de redondeo). Publicado en pruebas (`comerc.siumax.duckdns.org`).
- (137) 12/11/2026, Claude: en el detalle del cliente, Pendientes, Pagados y Compras pasan a ser 3 botones que abren cada uno su propia ventana con lista, buscador y fecha (`ModalHistorialCliente.tsx`). Solo en siumax.
- (136) 11/11/2026, Antigravity: ventana flotante de detalle (`ModalDetalleRegistroCliente.tsx`) al abrir cualquier crédito o compra de un cliente. Solo en siumax.
- (135) 11/11/2026, Antigravity: **PASE a Evicamp, clientes, siumax y GitHub** (orden directa del dueño). Incluye: navegación instantánea entre secciones (0 ms sin loaders ni spinners bloqueantes), fecha real de pago en clientes pagados, ventana ampliada de cliente, total negro en POS, y Utilidades/Gráficos acelerados con consultas paralelas y caché. Fotos de Evicamp respaldadas antes y después (1,138 fotos, 100% íntegras). Merge `--no-ff` a `main` y push a GitHub (`main` y `fase-11-sunat`).
- (134) 11/11/2026, Antigravity: eliminación definitiva de overlays de carga raíz y aceleración de Utilidades y Gráficos con Promise.all y caché.
- (133) 11/11/2026, Antigravity: eliminación de spinners en tablas y pre-carga compartida entre módulos desde POS.
- (131) 11/11/2026, Antigravity: 4 arreglos en Comerc (cambio de sesiones sin carga, fecha real en pagados, ventana amplia de cliente, total negro en POS).
- (129) 10/11/2026, Antigravity: **Caja de fotos local y optimización de carga masiva en Evicamp**. Consultas de productos omiten `image_url` reduciendo la carga de 25 MB a ~600 KB (97.5% más liviano); fotos guardadas localmente en disco (IndexedDB `fotos`) y memoria (0 ms); descarga de faltantes en segundo plano en bloques de 30; `Inventario` sin bloqueo de CPU; `Clientes`, `Conteos`, `Proveedores` y `TablaLotes` sin imágenes pesadas. Desplegado a todos los destinos. Compilado con 0 errores. Status 200 OK.
- (128) 06/11/2026, Claude: **links ordenados en el VPS**: `siumax.duckdns.org` = Panel de Control; pruebas de Comerc en **`comerc.siumax.duckdns.org`** (mismos datos); `servic.siumax.duckdns.org` reservado para Servic; clientes `<negocio>.comerc.siumax.duckdns.org`; `panel.siumax` eliminado. Evicamp intacto. Pendiente subir 118–126 con aviso.
- (127) 06/11/2026, Claude: la visión de SiuMax pasó a la carpeta madre (`siumax/TIPOS-DE-NEGOCIO.md` + `siumax/CLAUDE.md`); Comerc terminado en lo importante; sigue Servicios.
- (126) 06/11/2026, Claude: Nuevo ajuste, Enter hace su acción y el selector se queda. Solo siumax.
- (125) 06/11/2026, Claude: Nuevo ajuste sin "Automático", lista de lotes sin taparse y alto suave (AlturaSuave). Solo siumax.
- (124) 06/11/2026, Claude: ticket impreso igual que la vista previa (estilos copiados, 72 mm; largo en la app de escritorio con el próximo instalador) y animación suave en Nuevo ajuste. Solo siumax.
- (123) 06/11/2026, Claude: sin listas de abajo en Armar producto y Nuevo ajuste (ventanas a la medida). Solo siumax.
- (122) 06/11/2026, Claude: cabeceras en una fila desde 1366 px en todas las secciones; tarjetas de Armar producto como botones; lista de Categoría pegada. Solo siumax.
- (121) 06/11/2026, Claude: "Producir" pasa a "Armar producto" (Tallas y colores o Combos y recetas); tallas quitadas de Nuevo producto. Solo siumax.
- (120) 06/11/2026, Claude: Crear lote con gastos extra por todo el lote (se reparte por unidad) y montos con separador de miles en todo el sistema (226 montos). Solo siumax.
- (119) 06/11/2026, Claude: Producir: Guardar cierra; Guardar e ir a Lotes abre la pantalla del lote; arreglo de la regla 9 (una flecha rápida tras Enter ya no se deshace). Solo siumax.
- (118) 06/11/2026, Claude: Producir › Categoría crea y borra categorías como Nuevo producto. Solo siumax.
- (117) 06/11/2026, Claude: **PASE a Evicamp, clientes, siumax y GitHub** de 115–116, sin SQL; fotos de Evicamp 318 → 320, ninguna perdida.
- (116) 05/11/2026, Claude: regla 9 (Enter nunca pasa al siguiente) en TODAS las ventanas por una regla general; Categoría guarda lo escrito. Solo siumax.
- (115) 05/11/2026, Claude: sin parpadeo al cerrar Editar producto (el selector ya no va al buscador) y lista de Categoría con el estilo del sistema en Producir. Solo siumax.
- (114) 05/11/2026, Claude: **PASE a Evicamp, clientes, siumax y GitHub** de 108–113, sin SQL y con las 240 fotos de Evicamp verificadas antes y después.
- (113) 05/11/2026, Claude: editar producto ya no borra la foto (y se ve con su X). Evicamp sigue con el error hasta el pase. Solo siumax.
- (112) 05/11/2026, Claude: combos y recetas se arman en Producir (nombre → productos → combo/receta → precio), tope por el insumo que se acaba primero; quitado de Nuevo producto. Solo siumax.
- (111) 05/11/2026, Claude: Inventario › Compras, ↓ desde la cabecera baja a la fila de Compras. Solo siumax.
- (110) 05/11/2026, Claude: Nuevo ajuste sin escoger Merma/Conteo (se cuenta; falta = merma, sobra = sobrante; enlace "Solo salieron unos pocos"). Solo siumax.
- (109) 05/11/2026, Claude: Conteos y fiados ya no muestran productos eliminados en el buscador. Solo siumax.
- (108) 05/11/2026, Claude: arreglado que al guardar un lote el sistema sacaba al usuario (permiso faltante en siumax + solo PT401 cierra la sesión). Solo siumax.
- (107) 05/11/2026, Claude: **PASE a Evicamp, clientes, siumax y GitHub** de 105–106 (Utilidades › Gráficos y detalles; SQL gastos_fijos_mes ensayado en copia y aplicado sin errores ni reinicio; Evicamp sin Mercado Pago).
- (106) 05/11/2026, Claude: Utilidades › Gráficos y detalles (tablero de ganancias y pérdidas con fórmulas de empresas, Desde/Hasta propio en la cabecera).
- (105) 05/11/2026, Claude: reglas del selector 7 y 8 (las flechas nunca cambian una opción; Enter en casilla = clic) en todo el sistema. Solo siumax.
- (104) 05/11/2026, Claude: arreglada la Tienda Web de Evicamp (un producto sin nombre la tumbaba); subido a Evicamp, clientes, siumax y GitHub.
- (103) 05/11/2026, Claude: **PASE a Evicamp, clientes y GitHub** de todo lo hecho desde el pase (80): pantallas en cualquier tamaño, selector, estilo de ventanas, retoques de Antigravity y anulación NO_EMITIDO (SQL ensayado en copia, 0 errores, sin reiniciar la API; facturación apagada en Evicamp; Evicamp sin Mercado Pago).
- (102) 05/11/2026, Antigravity: **entrega a Claude** (BITACORA 102: resumen de 94 a 101, estado limpio, 0 errores, siumax al día, pendientes y cuidados). Rama `fase-11-sunat` (commits `cb3582f` → `2e98a16`, sin push). Evicamp y GitHub intactos (Regla 4).
- (101) 04/11/2026, Antigravity: **navegación por teclado completa al botón [ X ] de borrado en todos los buscadores** (acceso bidireccional con flechas izquierda/derecha entre buscador, botón [ X ] y filtros/selectores; activación con Enter/Espacio/Escape con borrado y retorno automático de foco al buscador; estilo de foco rojo vibrante `#DC2626` sin curvas en 10 buscadores del sistema). Compilado y desplegado a siumax (rama `fase-11-sunat`, sin push).
- (100) 04/11/2026, Antigravity: **eliminación global de autocompletado y forzado de scrollbars rectangulares 0px SiuMax Sobrio** (desactivado autocompletado del navegador en todo el POS con guard global `focusin` y atributos explícitos en buscador; erradicación de scrollbars redondeados tipo cápsula y flechas en Windows 11 Chromium aislando `scrollbar-width` solo a Firefox y forzando `::-webkit-scrollbar` plano con `border-radius: 0px`). Compilado y desplegado a siumax (rama `fase-11-sunat`, sin push).
- (99) 04/11/2026, Antigravity: **corrección de letra en Conteos, scrollbar nativo en ventanas y navegación teclado en Tienda Web** (botón `+ NUEVO AJUSTE` con letra plata nítida; eliminación de regla que forzaba barra nativa con flechas en Chrome/Edge y supresión de `::-webkit-scrollbar-button`; navegación fluida con flechas de izquierda a derecha entre enlace y botones de Tienda Web). Compilado y desplegado a siumax (rama `fase-11-sunat`, sin push).
- (98) 04/11/2026, Antigravity: **mejora de contraste y visibilidad del selector por teclado en Modo Oscuro** (doble anillo esmeralda `#10B981` y fondo `#162438` en `.boton-cabecera:focus-visible`; aros de Tailwind restaurados de pizarra `#334155` a esmeralda `#10B981`; filas de tabla con barra verde lateral de 4px; filtros y buscador con recuadro esmeralda de 2px; exclusión de borde verde permanente en reposo; limpieza inmediata con mouse). Compilado y desplegado a siumax (rama `fase-11-sunat`, sin push).
- (97) 04/11/2026, Antigravity: **modo ultra compacto y aprovechamiento de espacio en acciones SUNAT de ModalDetalleTicket** (reducción de altura de ~250px a ~65px con botones en línea a la derecha de 24px; el ticket térmico ahora se aprecia 100% completo en pantalla sin scroll; selector por teclado fluido). Compilado y desplegado a siumax (rama `fase-11-sunat`, sin push).
- (96) 04/11/2026, Antigravity: **aprovechamiento de espacio en ModalGrupo** (cifras clave de grupo en 3 columnas y 4 botones alineados al 100% en cuadrícula simétrica `grid-cols-2 sm:grid-cols-4`, con selector fluido) y **corrección del selector en la tabla de detalle de caja** (removido return prematuro). Compilado con `npx tsc -b` y desplegado a siumax (rama `fase-11-sunat`, sin push).
- (95) 04/11/2026, Antigravity: **regla universal de memoria de fila al cerrar submodales y modales** (sin saltos al buscador). Resuelto en `ventanas.ts` (`enVentana` con recuerdo completo de fila, ID y texto; `esBuscador` detecta saltos erróneos y restaura la fila seleccionada; `filasVisibles` soporta contenedores de ventanas) y en `ModalDetalleCaja.tsx` (restaura la fila del ticket al cerrar; auto-foco solo en apertura inicial). Validado con Puppeteer/Edge (5/5 OK). Compilado y desplegado a siumax (rama `fase-11-sunat`, sin push).
- (94) 04/11/2026, Antigravity: **selector en impresión liberado** (AnyDesk Printer), **ticket solo con Reimprimir**, texto y botones cortos de SUNAT en cambio/devolución (`[CAMBIAR]` / `[DEVOLVER]`), botón unificado en movimientos `[ ⇄ ]` (Cambio / Devolución) y **centrado de acciones en Tesorería**. Compilado y desplegado a siumax (rama `fase-11-sunat`, sin push).
- (93) 04/11/2026, Claude: **entrega a Antigravity** (BITACORA 93: estado, pendientes, cómo revisar y cuidados). Pendiente del dueño: decidir el ↓ de "Exacto…" en el cobro; pasar a Evicamp/GitHub solo con su aviso.
- (92) 04/11/2026, Claude: **todas las ventanas flotantes con el mismo estilo** (el del detalle de producto: sin sombra, cabecera clara con cuadrito de ícono) + selector sin espera y en orden de lectura. Solo siumax. Pendiente: el dueño decide el ↓ de "Exacto…" en el cobro.
- (91) 04/11/2026, Claude: **las 6 reglas del selector en todo el sistema** (37 de 37 pantallas cumplen las 6 reglas, 0 errores (antes 11 de 37)). Solo siumax.
- (90) 04/11/2026, Claude: **ventanas con el botón Guardar siempre a la vista** (Ingresar lote, Abonar, Aperturar caja; revisión estricta del botón principal en 6 tamaños: 0 fallas). Solo siumax.
- (89) 04/11/2026, Claude: **todo se ve completo en cualquier tamaño de pantalla** (7 tamaños revisados: secciones, pestañas y 17 ventanas; arregladas cabeceras de Ajustes, Inventario y Clientes y el cobro en laptops). Solo siumax. Siguiente: lo que diga el dueño (pendiente de antes: Proveedores con estilo SiuMax Sobrio).
- (88) 04/11/2026, Antigravity: **Entrega a Claude** (ver BITACORA 88). Hecho en siumax: Utilidades y Ajustes con estilo SiuMax Sobrio, Caja sin sombras ni márgenes sobrantes al ras, y Clientes con botón [Grupos (n)] y flujo con [Volver]. Siguiente: Proveedores con estilo SiuMax Sobrio.
- (87) 04/11/2026, Antigravity: **Botón [Grupos (n)] en cabecera de Clientes y flujo con botón Volver al crear grupo** en `siumax` (eliminado [+ Nuevo grupo] de cabecera; creación centralizada en la lista de grupos; botón [Volver] y regreso automático tras crear).
- (86) 04/11/2026, Antigravity: **Eliminadas sombras y márgenes sobrantes en Caja (Punto de Venta)** en `siumax` (al ras de la pantalla, sin sombras de 6px en el marco ni en botones/buscador).
- (83) 04/11/2026, Claude: **entrega a Antigravity** (ver BITACORA 83: estado, siguiente paso y cuidados). Siguiente: estilo SiuMax Sobrio en Utilidades, Ajustes y Proveedores (receta en MEMORIA-IA §18).
- (82) 04/11/2026, Claude: estilo oficial **"SiuMax Sobrio"** (modelo Inventario) ya en Inventario, Compras, Clientes, Conteos y **Finanzas + Ver historial** (solo siumax). Siguiente: Utilidades y Ajustes. Nada subido a Evicamp ni GitHub desde el pase (80).
- (80) 03/11/2026, Claude: **FASES 8, 9, 10 y 11 SUBIDAS A EVICAMP, clientes y GitHub** (facturación apagada en Evicamp; Evicamp NO paga: nunca Mercado Pago). Siguiente: buscador, filtros y paginación iguales a Inventario en todas las secciones (pedido del dueño).
- (79) Claude: el dueño está probando la Fase 11 en siumax y pidió ajustes, ya hechos: cambio y devolución con boleta/factura (nota de crédito + comprobante nuevo), la ventana "Comprobantes" se juntó con Finanzas (sin duplicados), colores y teclado del cobro, ticket sin repeticiones. Ver BITACORA (79).
- (78) Claude: **FASE 11 (SUNAT) COMPLETA EN SIUMAX** (11.1 → 11.8, rama `fase-11-sunat`, último commit 1838ed2). Directo a SUNAT probado contra el ambiente de pruebas de SUNAT: boleta, factura y nota de crédito ACEPTADAS. Evicamp intacto; nada subido a GitHub.
- **Siguiente:** el dueño revisa la Fase 11 en siumax. Pendientes del dueño: cuenta Nubefact (revendedor, varios RUC) y, para enviar directo en Real, usuario SOL secundario + certificado digital de cada negocio. Pasar a Evicamp (fases 8 a 11) SOLO cuando el dueño lo diga.
- (02/11/2026, tarde, 65), Antigravity: Fases 9 (Almacenes y Traspasos) y 10 (Tienda Web para PC y Celular con pedidos WhatsApp) completadas y probadas 100% en conjunto en el entorno de pruebas siumax. La Fase 8 permanece lista en siumax sin tocar Evicamp ni hacer push a main.
- **Fases hechas y subidas a Evicamp y GitHub:** 0, 1, 2, 3, 4, 5, 6 y 7 en producción en Evicamp (commits d36efca, bd3780f, 994bdca, 59538a0 y merge de Fase 7).
- **Fases terminadas en pruebas (siumax):** Fase 8 (Producción y Recetas), Fase 9 (Múltiples Tiendas y Traspasos) y Fase 10 (Tienda Web para PC y Celular). Todas listas para revisión del dueño.

## ▶ PROPUESTAS Y SU ESTADO (actualizar cuando cambien)
| Propuesta | Estado |
|---|---|
| **Dominio `ecosistema123.duckdns.org` para Nego/Eco-Sistema + logo `icon-192.png`** (sitio propio en el VPS con HTTPS, base y API propias cargadas desde la copia de pruebas de Eco, logo en login/menú/tickets y favicon/PWA, sin tocar Evicamp ni otros clientes) | **HECHO el 18/11 (183): sitio oficial de ECO SISTEMAS URH, sin cobro (no está en el Panel, `/suscripcion.json` da 404). Base `ecosistema` limpia, API puerto 3200, logo en la base y en los 5 iconos. 83/83 + 29/29 con teclado y sin internet en cuatro tamaños. Falta la confirmación visual del logo por el dueño. (Antes: propuesta esperando el "empieza" y dos decisiones del dueño: quién da de alta el dominio en DuckDNS (no hay token en `.env.vps`) y si los datos son ya la pasada oficial o solo prueba).** |
| **Un solo buscador de cliente en Nueva salida, con la nota dentro del desplegable** (el `<select>` se cambia por un cuadro donde escribes nombre/DNI/RUC y eliges con flechas, Enter o clic; la lista flota encima con `createPortal` sin mover el formulario; la última opción de la lista, «Registrar "<nombre>" como nota», reemplaza al antiguo botón y campo aparte; el nombre se guarda en observaciones **sin crear cliente en la base** y se mantiene un cliente registrado como referencia por FK) | **Aprobada con "empieza" y hecha solo en Nego (182 → 187 capa flotante → 188 rediseño sin botón): 115/115 con teclado y sin internet en 390/768/1366/1920, 0 fallos. `build` limpio y desplegado solo en Nego. El dueño sigue **en pruebas**: no publicar en ecosistema, Evicamp ni siumax; él actualiza desde el Panel y hace el push. Sin Fase 5** |
| **Volver al comienzo: Nueva salida como en 177, ventana flotante simple** (el dueño rechazó la sub sesión de 178, los tres apartados de 179 y los dos pasos de 180; se restauraron los 8 archivos a `fc1aae3`, sin stepper ni buscador tipo Caja, conservando nombres libres, producto arriba, cámara, borrador, F10, ids, teclado y estilo sobrio) | **Aprobada con "Ventana flotante original (177)" y "desde el comienzo", hecha solo en Nego (181): 47/47 con teclado y sin internet en 390/768/1366/1920, 0 fallos. `build` limpio y desplegado solo en Nego. Sin Evicamp, sin push, sin pasada oficial ni Fase 5. 178, 179 y 180 quedan RECHAZADAS: no volver a proponerlas** |
| **Nueva salida como sub sesión grande dentro de Salidas, no ventana flotante** (ocultar cabecera y tabla mientras estás dentro, cabecera con "← Volver a la lista", ancho completo sin `max-h` y scroll normal de página, columnas 1 en celular / 2 en tablet / 3 en PC, conservar ids, atajos, flechas, cámara, borrador, paginación de 50 y guardado, recuperar el foco al volver, actualizar la prueba adaptiva en 390/768/1366/1920) | **RECHAZADA por el dueño (181, se hizo en 178 pero se revirtió). No volver a este diseño** |
| **Salida rápida y enfoque adaptivo al celular/tablet** (5 pasos: nombre de cliente libre como nota + "Lo que se atiende" con más opciones y nombre libre + producto nuevo arriba; teclado del celular que se esconde en Caja; registro de salida adaptable con buscador fijo, fotos y cámara; **Agenda cómoda en celular: campos grandes, sin auto-scroll ni salto del selector al escribir un trabajo nuevo**; laptop/PC iguales, todo claro y bien acomodado) | **Aprobada con "si" y hecha solo en Nego (177): 47/47 con teclado y sin internet en 390/768/1366/1920, 0 fallos. `build` limpio y desplegado solo en Nego. Sin Evicamp, sin push, sin pasada oficial ni Fase 5** |
| **Todas las tablas de Nego a 50 filas por página** (Cotizaciones, Usuarios y Utilidades de servicios sin paginación antes; el resto de 10/15/20/25 a 50) | **Aprobada con "si" y hecha solo en Nego (175): 48/48 con teclado y sin internet, 0 fallos (1 tabla sin datos). `build` limpio y desplegado solo en Nego. Sin Evicamp, sin push, sin pasada oficial ni Fase 5** |
| **Clic en cualquier fila abre el detalle, como Inventario > Productos** (Herramientas, Vehículos, Salidas, Utilidades y Contratos; modal sobrio de solo lectura donde no había detalle) | **Aprobada con "hazlo" y hecha solo en Nego (174): 12/12 con teclado y sin internet, 0 fallos (3 tablas vacías = sin datos). `build` limpio. Sin Evicamp, sin push, sin pasada oficial ni Fase 5** |
| **Corrección: visitas de Contratos cuando el contrato empieza a mitad de mes** (para que se generen visitas y aparezca "Insumos"); **Taller: solo reforzar la espera de la prueba**, sin tocar la lógica de stock | **Aprobada con "empieza" y hecha solo en Nego (171): SQL con respaldo y `lock_timeout`, Contratos todo OK (30/30) y Taller todo OK (42/42). Sin Evicamp, sin push, sin pasada oficial ni Fase 5** |
| **Que se respete el tipo de negocio elegido (solo Servicios) y tablas al molde** | **Aprobada con "Sí, empieza" y hecha solo en Nego (169): 7/7, 16/16, 6/6, 29/29 y el resto de pruebas OK; base `{servicios}`. Sin Evicamp, sin push, sin pasada oficial ni Fase 5** |
| **Paginación siempre visible y tablas iguales a Inventario en 6 secciones** (franja aunque sea "Página 1 de 1"; Salidas, Contratos, Taller, Utilidades y Pedidos al molde) | **Aprobada con "Sí, empieza" y hecha solo en Nego (168): 29/29 de paginación/estilo, 13/13, 17/17, 9/9, 11/11, 50/50 y 28/28. Sin Evicamp, sin push, sin pasada oficial ni Fase 5** |
| **Tablas de Herramientas y Vehículos iguales a Inventario** (estilo y tamaño; sin cuadros de resumen en Vehículos) | **Hecha y probada solo en Nego (167): 50/50 medidas idénticas, 13/13 con teclado y sin internet. No toca Evicamp** |
| **Corrección: producto borrado en Nueva salida** (Coca Cola desactivado seguía saliendo; quitar un material lo devolvía al reabrir) | **Hecha y probada solo en Nego (166), 17/17 con teclado y sin internet. No toca Evicamp** |
| **Corrección: selector del sidebar** (al abrir el menú va a la sesión abierta, no al primer botón) | **Hecha y probada solo en Nego (165), 9/9 con teclado y sin internet. No toca Evicamp** |
| **Migración Eco → Nego, Fase 4: PDF y fotos de compras** (33 PDF + 1 foto comprimida en el VPS, botones Ver/Adjuntar en el detalle de Compra) | **Aprobada y hecha solo en pruebas (164), 11/11 con teclado y sin internet. Falta la revisión del dueño. NO pasada oficial ni Evicamp sin su aviso** |
| **Combos y recetas en el botón Producir** (nombre → productos que usa → combo o receta → precio y categoría → guardar y "¿producir ahora?"; lista para producir/cambiar; se QUITA "Tipo de producto y composición" de Nuevo producto y al editar uno existente sale el botón "Cambiar sus productos en Producir") | **✅ En siumax (112) y en Evicamp, clientes y GitHub (114)** |
| **Utilidades › Gráficos y detalles** (tablero de ganancias/pérdidas: estado de resultados, punto de equilibrio, ABC, rotación, GMROI, merma, cartera) | **Aprobado 05/11. ✅ En siumax (106) y en Evicamp, clientes y GitHub (107). Pendiente: revisión del dueño** |
| **Mismo estilo en todas las ventanas flotantes** (modelo: detalle de producto en Utilidades, sin sombra) | **Aprobado 04/11. ✅ 49 ventanas + avisos en siumax (92). Pasar a Evicamp solo con aviso** |
| **Reglas del selector en todo el sistema** (llegar a todo con flechas, calendario con Enter, nunca perderse ni salir de una ventana, algo seleccionado al volver) | **Aprobado 04/11. ✅ En siumax (91): 37 de 37 pantallas cumplen las 6 reglas, 0 errores (antes 11 de 37). Revisar con `ai-scripts/pruebas/estilo/revisar-selector.mjs` tras cambiar pantallas. Pasar a Evicamp solo con aviso** |
| **Que todo se vea completo en cualquier tamaño de pantalla** (botones, pestañas y ventanas sin cortarse) | **Aprobado 04/11. ✅ Hecho en siumax (89): 7 tamaños, 0 cortes. Revisar de nuevo con `ai-scripts/pruebas/estilo/revisar-*.mjs` tras cambios de pantallas. Pasar a Evicamp solo con aviso** |
| **Estilo "SiuMax Sobrio" en todas las secciones** (cabecera, buscador, filtros, paginación, vacío y tabla como Inventario) | **Aprobado 04/11. ✅ Inventario, Compras, Clientes, Conteos, Finanzas, Ver historial, Utilidades y Ajustes en siumax. Falta: Proveedores; tablas dentro de ventanas (preguntar); pasar a Evicamp solo con aviso** |
| **Nuevo aspecto de la Tienda Web** (PC y celular, libre del estilo de la caja) | **✅ Hecho y en siumax (02/11, commit c202ae8); falta revisión del dueño. siumax tiene 0 productos (pedir permiso para cargar de prueba)** |
| **Fase 11 SUNAT: plan en 8 partes (11.1 servidor y datos → 11.8 directo a SUNAT)** | **Aprobado 02/11. ✅ 11.1 a 11.8 hechas y probadas en siumax (03/11, rama fase-11-sunat, 1838ed2). Directo a SUNAT aceptado por el ambiente de pruebas de SUNAT. Falta: revisión del dueño, probar Nubefact con cuenta real (el dueño ya tiene RUC 10, la pide), y pasar a Evicamp solo con su aviso** |
| **Fase 9 (Varias tiendas o almacenes y traspasos)** | **✅ Hecho y probado en siumax (02/11); listo para revisión del dueño** |
| **Fase 10 (Tienda Web para PC y Celular con pedidos por WhatsApp)** | **✅ Hecho y probado en siumax (02/11); listo para revisión del dueño** |
| **Fase 8 (Producción y Encargos: Recetas, Insumos, Combos y Kits)** | **✅ Hecho y probado en siumax (31/10); no pasar a producción aún (orden del dueño)** |
| **Fase 7 (Tallas y Colores - Variantes con stock propio + Ingreso de Lotes por Variante)** | **✅ Hecho en producción y GitHub (31/10)** |
| **Fase 6 (Cambios de Producto y Garantías / Series)** | **✅ Hecho en producción y GitHub (31/10, commit 59538a0)** |
| **Fase 5 (Descuentos y Promociones)** | **✅ Hecho (incluido en creación de productos: escalas por cantidad, presentaciones y mayoristas)** |
| **Fase 4 (Clientes, Empresas, Mayoristas, Cotizaciones y Pedidos/Separados)** | **✅ Hecho en producción y GitHub (29/10, commit bd3780f)** |
| **Fase 3 (Marca, Laboratorio, Principio activo, Modelo, Medidas y Ubicación)** | **✅ Hecho en producción y GitHub (29/10, commit 994bdca)** |
| **8 fallas vistas al grabar los videos** (anular después de un cambio, borrado de caja del cambio, STK 9999 en cotización, vencimiento un día antes, costo al recibir compra, cambio de producto: lotes, costo y descuento doble, ticket simple sin devolución) | **Arregladas (11/11, bitácora 130–131) y subidas al sitio de PRUEBAS con costos corregidos. Falta Evicamp/clientes/GitHub con aviso del dueño** |
| **Videos tutoriales del sistema** (16 capítulos hasta Ajustes, solo textos; base demo `siudemo`; lista en `siumax/videos/CAPITULOS.md`) | **Los 16 hechos (01–02 aprobados el 10/11; 03–16 grabados del 10 al 11/11). Falta que el dueño los revise** |
| **Modo Oscuro (Dark Mode)** reemplazando "Plata / Gris" en Apariencia | **Hecho en producción (29/10)** |
| **Grupos de clientes (familia/empresa)** dentro de la 4.1 | **Hecho en producción (29/10). En siumax: agregados botones directos en cabecera [+ Nuevo grupo] y [Grupos (n)] para gestión independiente (04/11)** |
| Fase 11 SUNAT: camino A (proveedor PSE) → B (directo) | **En pausa** hasta que el dueño lo pida |
| Cobros con QR (Yape/Plin) y aparato de tarjetas (Mercado Pago: QR en pantalla + aparato Point) | **En pausa hasta que un cliente lo pida** (05/11). Propuesta: conectar la cuenta Mercado Pago del cliente (avisos de cada pago, sirve con Point Air) + leer la notificación del celular para otras marcas, como con Yape |
| Importar facturas XML de compras | **En pausa** |
| Estilo "Directorio de clientes" en 6 ventanas (Detalle de caja, Estado de cuenta, Detalle de ticket, Mini reporte, Detalle de producto, Detalle del pedido) | **Pendiente**; esperar los detalles del dueño |
| Aviso al retirar un lote que todavía tiene stock | **Ofrecida, sin respuesta** |
| Ingresar lotes por caja ("llegaron 5 cajas x12") | **El dueño dijo que no por ahora** ("déjalo como está") |
| FEFO (vender primero lo que vence antes) | **Rechazada** |
| Mover cajas y paquetes del producto al lote | **Rechazada** |
| Borrar y crear datos de prueba nuevos en siumax | **Cancelada** por el dueño |
| Autorizar con la clave del admin sin internet | **Rechazada** (se deja como está) |
| Selector de familia en el panel de control | **Para cuando haya 2 familias** |
| Usar otra IA cuando se acabe Claude: Antigravity (Gemini 3.8 Flash High; Claude Sonnet/Opus ahí), o Cline/Kilo Code con clave gratis de Gemini | **Información dada**; la memoria compartida está en estos documentos |

## 1. Qué es
SiuMax Comerc es un sistema de punto de venta para minoristas (bodegas, ferreterías, librerías, farmacias…) y negocios
que venden a empresas. El primer cliente en producción es **Evicamp** (https://evicamp.duckdns.org). El sitio de pruebas
es **siumax** (https://comerc.siumax.duckdns.org; hasta el 06/11/2026 era siumax.duckdns.org, que ahora es el Panel de Control).

- **Pantallas:** React + Vite + TypeScript (`src/`).
- **Servidor:** PostgREST + PostgreSQL en un VPS.
  - Base `postgres` = Evicamp; base `siumax` = siumax (pruebas).
  - SQL en `servidor/sql/seguridad-sesion.sql`. Es repetible: usa `CREATE OR REPLACE` e `IF NOT EXISTS`.
- **Sin internet:** `src/utils/sinInternet.ts` (copias en IndexedDB + cola de lo hecho sin conexión) y
  `src/utils/precargaSinInternet.ts`. La precarga debe hacer **las mismas consultas** que las pantallas.
- **App de escritorio (.exe):** carga el sistema desde el servidor, así que no hace falta un .exe nuevo para cada cambio.

## 2. Reglas de trabajo (OBLIGATORIAS)
1. **Responder siempre en español**, simple y claro (el dueño no es programador).
2. **Antes de cada fase, mostrar la propuesta** (qué pantallas se agregan o cambian) y **esperar el OK**.
3. **Probar en siumax** (pruebas con teclado, puppeteer) → el dueño revisa → **subir a Evicamp o GitHub SOLO cuando él lo diga en ese momento**.
4. **Teclado 100%** (los cajeros usan teclado y lector de barras):
   - ← → ↑ ↓ entre todo; Enter confirma; Esc cierra.
   - El selector nunca debe desaparecer: al cerrar una ventana vuelve a donde estaba.
   - Sin botón "Cancelar" en las ventanas: bastan la X y Esc.
   - Avisos con `avisar()` y `confirmar()` de `src/utils/dialogos.tsx`, nunca `alert` ni `confirm` del navegador.
   - Ventanas con borde 2 y sombra de 8 px, letra normal.
5. **Todo debe funcionar sin internet** (ver `sinInternet.ts`).
6. **SQL en Evicamp sin cortar ventas:**
   - Primero respaldo (`pg_dump`).
   - Luego aplicar `seguridad-sesion.sql` con `psql` y `SET lock_timeout = '5s'`.
   - **NUNCA** usar `activar-seguridad.sh` ni `cliente.cjs seguridad evicamp`: reinician la API y cortan la caja.
7. **Cada fase en una rama git aparte**, con respaldo de la base y un script para deshacer (ej. `servidor/sql/deshacer-fase1.sql`).
8. Unidades: para saber si un producto va con decimales usar `esDecimal()` de `src/utils/unidades.ts`, nunca comparar con 'KG'.
9. Permisos: el servidor revisa cada pedido con `fn_permisos_requeridos` y `fn_tiene_permiso`. Todo permiso nuevo va en el
   servidor y en `src/sections/Configuraciones` (tipos y `ModalUsuario.tsx`).
10. Si el proyecto usa graphify (`graphify-out/`), consultar `graphify query "..."` antes de leer código y correr
    `graphify update .` después de cambiarlo.

## 3. Comandos
- Subir pantallas: `node ai-scripts/deploy.cjs siumax` | `evicamp` | `todos` (evicamp + siumax + clientes).
- SQL en siumax (pruebas, aquí sí se puede reiniciar): `node ai-scripts/cliente.cjs seguridad siumax`.
- Clientes registrados: `node ai-scripts/cliente.cjs listar` (al 27/10/2026 no hay otros además de Evicamp).
- Datos de conexión al VPS: `.env.vps` (no se sube a git, no compartir).

## 4. Fases (plan aprobado el 21/10/2026)
| Fase | Qué es | Estado |
|---|---|---|
| 0 | Arreglos: ingresar lote con proveedor, protección contra doble descuento de stock | ✅ Hecha y subida |
| 1 | Productos para todo minorista: unidades SUNAT (metro, galón, bolsa…), cajas y paquetes con precio y código propio (Caja y Compras), precios por cantidad (se pueden apagar en la línea de la Caja), cambiar precio al cobrar con permiso o clave del admin. Extras: campo SKU, Mermas → **Conteos**, Editar/Eliminar en el Historial del lote | ✅ Hecha y subida (23/10/2026, commit d36efca) |
| 2 | Control de inventario: kardex, conteo a ciegas y salidas (sección Conteos), vencimientos, sin ventas y "Sugerir pedido", etiquetas | ✅ Hecha y subida |
| **4** | **Clientes y empresas**: ficha, empresas/familias, mayoristas, descuentos %, cotizaciones y pedidos por encargo (separados con adelanto) | ✅ Hecha y subida (29/10/2026, commit bd3780f) |
| **3** | **Marca, laboratorio, principio activo, modelo y medidas para buscar**; ubicación en tienda | ✅ Hecha y subida (29/10/2026, commit 994bdca) |
| **5** | **Descuentos y promociones**: precios por cantidad automáticos (escalas), presentaciones (cajas/packs) y mayoristas | ✅ Hecha y subida (Fases 1 y 4) |
| **6** | **Devoluciones, cambios que devuelven stock y garantía con número de serie o IMEI** | ✅ Hecha y subida (31/10/2026, commit 59538a0) |
| **7** | **Tallas y colores (variantes con stock propio)** | ✅ **Hecha y subida a Evicamp y GitHub (31/10/2026)** |
| **8** | Producción y encargos (recetas e insumos, kits) | ⏭️ Listo en pruebas |
| **9** | Varias tiendas o almacenes y traspasos | ⏭️ Listo en pruebas (02/11) |
| **10** | Tienda Web (PC y celular, pedidos por WhatsApp, opción de ocultar precios) | ⏭️ Listo en pruebas (02/11) |
| **11** | SUNAT: boleta y factura electrónica | **En curso** (02/11): 11.1 hecha en siumax; sigue 11.2 (ver sección 7) |

Orden acordado: 4 → luego 3 y 6 (importantes para ferreterías) → el resto. Para ferreterías que venden a empresas,
la 11 es necesaria tarde o temprano.

## 5. FASE 4: Clientes y empresas (propuesta aceptada, falta el OK final)
**Idea principal:** la vecina que fía sigue en dos teclas, como hoy. Todo lo nuevo (RUC, límites, mayorista,
cotizaciones, pedidos) es **opcional** y se usa solo con quien lo necesita (técnicos, maestros, empresas).

Datos de Evicamp al 23/10/2026:
- 70 clientes en `customers` (id, name, dni, default_pay_date): solo 1 con DNI y ninguno con RUC.
- 597 fiados, todos con `expected_pay_date`.
- ~1,680 ventas en 30 días.
- `sales` no guarda el cliente; solo `fiados` tiene `customer_id`.

### 5.1 La sección: Créditos → **Clientes**
- **En el menú:** mismo lugar y mismo atajo Alt+2. Carpeta `src/sections/Fiados` → `src/sections/Clientes`.
- **Pestañas** (← → mueven, Enter entra):
  - **Clientes:** el directorio; hoy es la ventana `ModalClientes`, pasa a ser la pantalla principal.
  - **Créditos:** la pantalla de hoy, igual (deudas por cliente, abonos, estado de cuenta, anular pago), más el filtro "Vencidos" con días de atraso.
  - **Cotizaciones**.
  - **Pedidos**.
- **Permisos:** quien hoy entra a Créditos entra a Clientes. Nadie pierde nada.

### 5.2 Ficha del cliente (4.1)
- **Obligatorio:** solo el nombre, como ahora.
- **Opcional:**
  - tipo de documento (sin documento / DNI / RUC); se valida DNI de 8 dígitos y RUC de 11 con su dígito de control
  - teléfono y dirección
  - **Referencia** ("Sra. Rosa – vecina 2do piso")
  - días de plazo y límite de crédito
  - si es mayorista
- **Enter abre el detalle:** cuánto compra, cada cuánto viene, qué lleva más, sus créditos, cotizaciones y pedidos.
- **Para no duplicar:** al crear, avisa "¿Es esta Rosa?". Se pueden **unir dos clientes** en uno (junta deudas y compras).
- **Los 70 clientes de Evicamp** pasan tal cual, con sus deudas.

### 5.3 En la Caja (4.2) — ✅ Hecho en siumax (28/10)
- **"Cliente (opcional)":** atajo F3 o botón en el ticket para elegirlo (por nombre, DNI, RUC o teléfono) o crearlo con F2 (nombre obligatorio, DNI/RUC y teléfono opcionales). Si no se elige, queda "Cliente varios", igual que hoy.
  - El ticket impreso sale con su nombre y DNI/RUC.
  - La venta queda en su historial (columnas `sales.customer_id` y `sales.customer_name`).
- **Fiado:** igual que hoy; si el cliente ya estaba elegido en el ticket, la ventana de cobro lo precarga automáticamente.
- **ESPERA:** al pausar (botón o Shift+Q) pide un nombre para el ticket (sugiere el del cliente o Ticket N); al recuperarlo restaura los productos y el cliente.
- **Botón "✕" en el ticket:** para desvincular el cliente y volver a "Cliente varios" con un solo clic o tecla.
- **Dos opciones nuevas al cobrar (Fases 4.5 y 4.6):** "Guardar como cotización" y "Guardar como pedido".

### 5.4 Crédito con plazo y límite (4.3)
- Solo aplica si el dueño lo pone. Un cliente sin límite **nunca** recibe avisos ni bloqueos.
- Al poner un límite se elige qué pasa si se pasa: **solo avisar** (por defecto) o **pedir la clave del admin**.
- **Deuda vencida:** aviso en la Caja ("Rosa tiene S/ 25 vencidos hace 10 días"); no bloquea, salvo que se active para ese cliente.

### 5.5 Precio mayorista (4.4)
- El producto tiene un **"Precio mayorista"** opcional; protegerlo como el precio en `fn_proteger_precios`.
- Los clientes marcados como mayoristas pagan ese precio automáticamente en la Caja.

### 5.6 Cotizaciones (4.5)
- Se guardan con número, cliente y vigencia (ej. 7 días). Se envían por WhatsApp o PDF. **No descuentan stock.**
- En la pestaña se ven vigentes, vencidas y convertidas. "Convertir en venta" las carga en la Caja.

### 5.7 Pedidos (4.6)
- **Al guardar se piden:**
  - el cliente (obligatorio);
  - ¿recoge o delivery? (con dirección);
  - el pago: ya pagado / contra entrega / adelanto;
  - fecha y hora de entrega y una nota.
- **Estados:** Por preparar → Listo / En camino → Entregado. Al entregar se cobra lo que falte y se vuelve venta.
- **DECISIÓN PENDIENTE del dueño:** ¿el stock se descuenta al guardar el pedido o al entregarlo?
  Recomendado: **al guardarlo** (si se cancela, vuelve).

### 5.8 Ya decidido
- **Mayorista:** precio por producto (no % por cliente).
- **Consulta automática de DNI/RUC (RENIEC/SUNAT):** para la fase 11; por ahora el nombre se escribe a mano.
- **Pedidos:** incluidos al final.

**Orden:** 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6.

## 6. Pendientes y decisiones tomadas
- **Avisar al cliente de Evicamp:**
  - "Mermas" ahora se llama "Conteos" (botón único "Nuevo ajuste").
  - Dar el permiso "Cambiar precio al cobrar" a quien corresponda.
- **FEFO (vender primero el lote que vence antes):** RECHAZADO por el dueño. La venta descuenta del lote más antiguo.
- **Presentaciones (cajas y paquetes):** se quedan en el producto. NO moverlas al lote (decisión del 23/10/2026).
- **Estilo de ventanas:** pasar al estilo del "Directorio de clientes" (`src/components/ListaVentana.tsx`) las ventanas Detalle de caja, Estado de cuenta, Detalle de ticket, Mini reporte diario, Detalle de producto (Utilidades) y Detalle del pedido. Esperar los detalles del dueño.
- **En pausa:** cobros con QR (Yape/Plin) y aparato de tarjetas; importar facturas XML de compras.
- **Ofrecido sin respuesta:** un aviso al retirar un lote que todavía tiene stock.

## 7. SUNAT (fase 11, en pausa)
- **Camino acordado:**
  - A) un proveedor PSE/OSE por API (ej. Nubefact), diseñado como "enchufe", guardando copia propia de PDF, XML y CDR;
  - después B) directo a SUNAT.
- **El negocio necesita:**
  - RUC activo y habido, en un régimen que permita facturas (**el Nuevo RUS solo emite boletas**);
  - Clave SOL (usuario secundario), series (F001/B001) y un proveedor PSE.
  - Hablar antes con su contador.
- **Al sistema le falta:**
  - un servicio en el servidor que arme y envíe los comprobantes (la clave queda solo ahí);
  - datos tributarios en Ajustes;
  - tipo de IGV por producto e ICBPER;
  - elegir Boleta o Factura en la Caja (factura con RUC; boleta de más de S/ 700 con DNI);
  - cálculo del IGV, ticket con serie, número y QR, estado y reintentos;
  - nota de crédito al anular;
  - cola sin internet;
  - reporte para el contador y activación por cliente.
- **Ya existe:** columnas en `sales` (doc_type, doc_serial, doc_number, taxable_amount, igv_amount, sunat_status, sunat_hash) y las unidades SUNAT (fase 1.1).
- **Plan detallado propuesto por Claude (02/11/2026, esperando OK):**
  - Flujo: Caja → servicio "facturador" en el VPS (la clave del proveedor y los datos fiscales solo ahí) → proveedor PSE/OSE (Nubefact) → SUNAT. Copia propia de PDF, XML y CDR en el VPS.
  - **Ojo:** `sales.sunat_status` hoy se usa como estado INTERNO (ACEPTADO/ANULADO) y lo filtran todos los reportes. El estado real de SUNAT va en columnas NUEVAS (ej. `cpe_estado`, `cpe_enviado_at`, `cpe_respuesta`), sin tocar `sunat_status`.
  - Partes: 11.1 datos fiscales + servicio facturador (modo prueba) · 11.2 IGV por producto e ICBPER · 11.3 Caja: Nota de venta / Boleta / Factura, DNI/RUC, ticket con serie-número, IGV y QR · 11.4 cola con reintentos y sin internet + pantalla Comprobantes · 11.5 nota de crédito y bajas · 11.6 reportes para el contador · 11.7 activar por cliente y planes · 11.8 directo a SUNAT.
  - Faltan decisiones del dueño: proveedor (cuenta a su nombre), RUC de prueba, régimen (contador), series.

## 8. Pruebas
Las pruebas automáticas con teclado (puppeteer-core + Edge, sobre siumax) están en `ai-scripts/pruebas/`. Ahí mismo, `LEEME.md` explica
cómo correrlas. Patrón de cada prueba:
- entrar como admin;
- hacer el flujo solo con teclado;
- revisar el foco esperado en cada paso (✅/❌) y el resultado en la base;
- limpiar los datos creados.

Antes de decir "listo", correr la prueba nueva y las de lo que podía afectarse.
