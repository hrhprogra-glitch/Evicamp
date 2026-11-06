# Plan de SiuMax Comerc: estado, fases y forma de trabajo

> Documento para continuar el trabajo con **cualquier IA o programador**. Léelo completo antes de tocar el código.
> Última actualización: 27/10/2026.

## ▶ DÓNDE ESTAMOS AHORA (actualizar después de cada paso)
- **Última actualización:** 06/11/2026 (118), Claude: Producir › Categoría crea y borra categorías como Nuevo producto. Solo siumax.
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
| **Videos tutoriales del sistema** (9 videos; grabados contra la base demo `siudemo`, fuera de Comerc) | **Muestra hecha (02 venta, 29/10); falta OK del dueño para los demás** |
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
es **siumax** (https://siumax.duckdns.org).

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
