# Migración de Eco-Sistemas (Supabase) a SiuMax Nego

> Objetivo del dueño (16/11/2026): *"conectarnos al supabase de ecosistemas, copiaremos cada tabla de ecosistemas y sus
> datos, haremos prueba, pasaremos todos sus datos a Nego siuMax para ver si ya está listo para lanzarlo oficial"*.
> Cada paso se anota aquí y en la bitácora. **Nunca** se escribe en el Supabase de Eco (lo usan en vivo) y **nada**
> se pasa a producción sin el aviso del dueño en ese momento.

> ⭐ **MEMORIA PRINCIPAL (17/11/2026): el dueño decidió que todo será un solo sistema, SiuMax Nego (`negosiumax`).**
> Comerc y Servic son **referencia histórica**; la fuente de verdad es `D:/Programación/siumax/CLAUDE.md`. Esta
> migración ya se hizo como **prueba** (7.328 filas en `siumax`); la **Fase 4 también se hizo en pruebas** (17/11).
> La pasada oficial y la Fase 5 esperan el OK del dueño.
> El 500 de Eco en Vercel (clave vieja en `SUPABASE_DATABASE_URL`) ya está resuelto. No digan que está desactualizado.

## Datos de trabajo (privados, NO se suben a git)

| Qué | Dónde |
|---|---|
| Cadena de conexión | `D:\Programación\siumax\.env.ecosistema` (variable `ECOSISTEMA_DB_URL`) |
| Respaldo completo (esquema + datos) | `D:\Programación\siumax\respaldo-ecosistema-2026-11-16.sql` (28 MB, UTF-16LE) |
| Scripts y reportes | `D:\Programación\siumax\migracion-eco\` (fuera de los repositorios) |

**Estado:** Fase 1 ✅ (16/11) · Fase 2 ✅ (17/11) · Fase 3 ✅ cargada y comprobada (17/11) · Fase 4 ✅ **hecha SOLO EN PRUEBAS** (17/11, 11/11 con teclado y sin internet) · Fase 5 ⏸ pendiente del dueño.

- El respaldo incluye los esquemas `public`, `auth`, `storage` y `realtime` de Supabase. **Contiene datos sensibles**
  (usuarios/tokens): no compartirlo ni subirlo a git.
- Conexión: pooler de Supabase, base `postgres`, **solo lectura** en esta fase.

## Fase 1 · Inventario y respaldo ✅ (16/11/2026)

- `migracion-eco/inventario.mjs`: se conectó y listó todas las tablas/vistas (solo `select`).
  - Resultado: **24 tablas en `public`**, **22.985 filas** en total.
  - Otros esquemas: `auth` (25 tablas), `storage` (7), `realtime` (3). No son datos de negocio.
- `migracion-eco/verificar-respaldo.mjs`: comparó el respaldo con la base en vivo tabla por tabla.
  - **24 de 24 tablas iguales · 0 diferencias.** El respaldo está completo.
- Reportes: `migracion-eco/reporte-tablas.md` y `migracion-eco/reporte-verificacion.md`.

### Tablas de negocio (`public`) y filas

| Tabla | Filas | Nota |
|---|---:|---|
| `activos` | 54 | vehículos y herramientas (con `cantidad`, `cantidad_en_uso`, SOAT) |
| `almacenes` | 1 | |
| `calendario_eventos` | 0 | agenda vacía al momento del respaldo |
| `calendario_evento_empleados` | 0 | |
| `contactos` | 228 | clientes/proveedores de Eco |
| `empleados` | 11 | |
| `entradas` | 35 | compras/ingresos de mercadería |
| `entrada_lineas` | 137 | detalle de las entradas |
| `lotes` | 589 | lotes de stock |
| `mantenimientos_activos` | 1 | |
| `movimientos_stock` | 4.355 | kardex |
| `notas_credito` / `notas_credito_lineas` | 0 | |
| `piscinas` y sus 3 tablas | 0 | en Eco las piscinas parecen vivir en `activos`/`contactos`; revisar en la Fase 2 |
| `productos` | 508 | |
| `proveedores` | 16 | |
| `sync_outbox` | 16.977 | **técnica** (cola de sincronización de la app); no es dato de negocio |
| `sync_state` | 0 | técnica |
| `sync_tombstones` | 8 | técnica (borrados) |
| `usuarios` | 3 | usuarios de Eco |
| `ventas` | 62 | |

## Fase 2 · Comparar y mapear ✅ (17/11/2026)

**Solo lectura.** Se leyeron los esquemas reales (no se cambió nada):

- Eco: 24 tablas de negocio (`migracion-eco/esquema-eco.json`, `reporte-esquema-eco.md`).
- Nego: 55 tablas en la base de pruebas **`siumax`** del VPS (`migracion-eco/esquema-vps.json`,
  `reporte-esquema-vps.md`). Se comprobó que la API `postgrest_siuhub` apunta a esa base, y que `servic` tiene el
  mismo esquema (55 tablas). También se sacaron muestras de Eco (`muestras-eco.txt`, `detalle-salidas.txt`).

### Cuadro Eco → Nego (propuesta)

| Eco (filas) | Destino en Nego | Cómo pasa |
|---|---|---|
| `almacenes` (1) | `stores` | Casi directo: `nombre`, `ubicacion`→`direccion`; marcar principal y activo. |
| `proveedores` (16) | `providers` | Directo: `nombre`→`razon_social`/`nombre_comercial`, `ruc`, `telefono`, `email`. ⚠️ `providers` no tiene `notas`. |
| `contactos` (228, todos `tipo=cliente`) | `customers` | Convertir: `nombre`→`name`; `identificaciones` (jsonb) → `dni`/`ruc`/`tipo_doc`; `email`→`correo`; `telefono`→`telefono`; `direccion.calle`→`direccion`; `persona_contacto`; `activo=true`. ⚠️ Nego no tiene "es empresa". |
| `empleados` (11) | `trabajadores` (11) | Convertir: `nombre`, `dni`, `puesto`→`cargo`, `telefono_trabajo`→`telefono`, `estado`→"activo". ⚠️ Nego no guarda `area`, `monto_pago`, `foto_url` (irían a `notas`). |
| `usuarios` (3) | `empleados` (acceso al sistema) | Convertir: `username`→`email`, clave nueva; `permisos` de Eco (`piscina.*`, `resumen.*`) → permisos de Nego por tipo de negocio. **Decisión del dueño.** |
| `productos` (508) | `products` | Convertir: `nombre`→`name`, `sku`→`code`, `codigo_barras`→`barcode`, `precio`→`price`, `costo`→`cost_price`, `stock`→`quantity`, `categoria`/`categoria_general`→`category`, `unidad`→`unit`, `foto_url`→`image_url`, `limite_stock`→`min_stock`, `presentacion`→`presentaciones`. ⚠️ Unidad "Metro" (5 productos) hay que decidir cómo se controla. |
| `lotes` (589) | `batches` (589) | Directo: `cantidad_inicial`→`initial_quantity`, `cantidad_actual`→`quantity`, `costo_unitario`→`cost_unit`, `fecha_vencimiento`→`expiration_date`, `almacen_id`→`store_id`. |
| `entradas` (35) | `compras` (35) | Convertir: `numero`→`documento`, `proveedor_id`, `estado`, `fecha`→`created_at`, `total`, `incluye_igv`, `flete`, `notas`. ⚠️ Nego no tiene `moneda` (11 entradas en USD) ni `fotos_urls`. |
| `entrada_lineas` (137) | `compras_detalle` (137) | Convertir: `producto_id`, `cantidad`, `costo_unitario`→`costo_unit`, `subtotal`; enlazar con su `batch`. |
| `movimientos_stock` (4.355) | `inventory_movements` **y** `salidas`+`salida_items` | **Dividir:** los 2.749 con `grupo_id` forman **374 salidas** (servicio/obra, con cliente, trabajador y `materiales`=herramientas) → `salidas` + `salida_items` (+ préstamos de herramientas); los 1.606 restantes (entradas y ajustes) → `inventory_movements`. |
| `activos` (54 = 53 herramientas + 1 vehículo) | `herramientas` (53) + `vehiculos` (1) | Convertir según `tipo`: `cantidad`→`cantidad_total`, `cantidad_en_uso`, `estado`, `notas`; el vehículo `nombre`→`placa`, `soat_vencimiento`→`vencimiento_soat`. |
| `mantenimientos_activos` (1) | `vehiculos_mantenimientos` (1) | Convertir: `tipo_mantenimiento`→`tipo`, `fecha_programada`/`fecha_realizada`→`fecha`, `costo`, `descripcion`. |
| `ventas` (62, todas `estado_cuenta`) | `cotizaciones` + `cotizacion_detalles` (+ pagos) | Convertir: `cliente` (texto) → buscar en `customers`; `lineas` (jsonb) → detalles; `total`; `estado` (pagado/pendiente) → adelanto/saldo. **Decisión del dueño** (ver preguntas). |
| `calendario_eventos` (0) y `calendario_evento_empleados` (0) | `agenda_trabajos` / `agenda_trabajadores` | Vacías: nada que migrar. |
| `notas_credito`, `notas_credito_lineas` (0) | `notas_credito` | Vacías: nada. |
| `piscinas`, `piscina_consumos`, `piscina_materiales`, `piscina_pagos` (0) | `bienes_cliente` (tipo piscina) + `contratos` + `contrato_visitas` + `contrato_cobros` | Vacías: nada. En Nego una piscina sería un "bien" del cliente con contrato de mantenimiento. |
| `sync_outbox` (16.977), `sync_state` (0), `sync_tombstones` (8) | — | **No se migran:** es la cola de sincronización de la app de Eco, no es dato de negocio. |

**Volumen real a migrar: unos 6.000 registros** (22.985 − 16.985 de `sync_*`).

### Respuestas del dueño (17/11/2026)

| # | Pregunta | Respuesta del dueño |
|---|---|---|
| 1 | Base de prueba | **`nego.siumax`** → base de datos **`siumax`**. |
| 2 | Usuarios | Crear **los mismos 3 usuarios** en Nego, **con clave nueva**. |
| 3 | `ventas` (62 estados de cuenta) | Van a **Cotizaciones**. |
| 4 | Herramientas en uso (26) | Crear **préstamos abiertos** (`herramientas_prestamos`). |
| 5 | Kardex | Migrar **los 4.355 movimientos completos**. |
| 6 | Entradas en dólares (11) | **Sí, anotarlo** en las notas de la compra. |
| 7 | Fotos y PDF | **Copiarlos también** y **agregar la opción en el sistema** para que existan o se puedan agregar nuevos. |

### Puntos que faltan resolver al cargar (decididos por el sistema, no por el dueño)

- **Ids:** se reservan ids nuevos desde `max(id)+1` de cada tabla de Nego (los ids de Nego son tipo marca de tiempo).
- **Orden de carga (por dependencias):** `stores` → `categories` → `providers` → `customers` → `trabajadores` →
  `empleados` (usuarios) → `products` → `batches` → `compras` + `compras_detalle` → `inventory_movements` →
  `herramientas` + `vehiculos` + `vehiculos_mantenimientos` → `herramientas_prestamos` →
  `salidas` + `salida_items` + `salida_trabajadores` → `cotizaciones` + `cotizacion_detalles`.
- **Rollback exacto:** cada fila migrada se anota en una tabla `migracion_eco_log` (tabla destino + id destino +
  tabla de origen + id origen) para poder borrar exactamente lo cargado y volver a empezar.

## Fase 3 · Carga de prueba en Nego ✅ (17/11/2026)

- **Dueño:** *"empieza fase 3"* + las 7 respuestas de arriba.
- **Antes de tocar nada:** respaldo de `siumax` en el VPS
  `/root/backups/siumax-antes-migracion-eco-20261117-013054.dump` (838 KB).
- Se leyó cómo estaba `siumax` (`migracion-eco/nego-actual.txt`) para no chocar con sus ids ni sus valores.
- **Herramientas creadas:** `migracion-eco/etl.mjs` (genera el SQL), `negocios/comercio/ai-scripts/migrar-eco.cjs`
  (lanza la prueba en seco, la carga real o el borrado). Todo el SQL va en **una transacción**.
- **Prueba en seco primero:** `migrar-eco.cjs carga-nego.sql dry` ejecuta todo y termina en `ROLLBACK`. Encontró 4
  errores reales antes de tocar la base (un valor de menos en `products`, un `null` suelto, la palabra reservada
  `user`, y un cliente que se creaba después de insertar los clientes). Todos corregidos.
- **Carga real:** 17/11/2026, `COMMIT` correcto. **7.328 filas** cargadas en 21 tablas + `migracion_eco_log`.
- **Comprobado:** `sum(products.quantity)` = `sum(batches.quantity)` = **25.394,10**; 374 salidas; 2.745 ítems;
  1.606 movimientos de kardex; 53 herramientas; 28 préstamos; 62 cotizaciones. Cuadro completo y decisiones en
  **`migracion-eco/reporte-carga.md`**.
- **Repetible:** `migrar-eco.cjs rollback-nego.sql borrar` borra exactamente las 7.328 filas y deja `siumax` como estaba.

## Fase 4 · Archivos de compras (fotos y PDF) — HECHA EN PRUEBAS (17/11/2026, NO oficial)

**Lo que pidió el dueño (pregunta 7):** copiar los archivos de Eco y **agregar la opción en el sistema** para verlos y
subir nuevos. **Respuestas del dueño a la propuesta (17/11/2026):**

| # | Pregunta | Respuesta del dueño |
|---|---|---|
| 1 | ¿Dónde guardar los archivos? | **En nuestro VPS** (recomendado). |
| 2 | ¿Qué copiar? | **Solo los archivos de compras** (no las fotos de productos ni nada más). |
| 3 | ¿Comprimir las fotos? | **Sí, comprimirlas** (se ven igual). |

> El dueño pidió esperar al principio y después autorizó: **"sí pero ojo todavía no es el oficial"**. Por eso la Fase 4 se
> hizo **solo en Nego** (`nego.siumax.duckdns.org`): sin pasada oficial, sin Evicamp y sin push.

### Qué archivos hay en Eco (medido solo lectura, 17/11/2026)

- Columnas de archivos en Eco: `entradas.factura_pdf_url`, `entradas.fotos_urls`, `productos.foto_url`,
  `empleados.foto_url` / `dni_foto_url`, `contactos.ubicacion_url`, `ventas.documento_original_url` / `archivo_origen`.
- **De compras (`entradas`): 35 entradas → 33 con PDF de factura y 1 con foto (1 foto).** Eso es lo que se copiará.
- Los enlaces son **relativos** (`/api/uploads/factura/<uuid>.pdf`). **Pendiente comprobar** en qué host responde
  `/api/uploads/...` (probablemente el sitio de Eco, no Supabase) antes de descargar.
- **No se copiarán** los documentos de `ventas` (estados de cuenta) ni fotos de productos: el dueño pidió solo compras.

### Plan propuesto (para cuando el dueño diga "empieza")

- **A. Traer los archivos:** descargar de Eco los 33 PDF + 1 foto (solo lectura), **comprimir las fotos**, y guardarlos
  en el VPS de Nego (carpeta propia, servida por nginx en `/archivos/compras/...`). Anotar en Nego el enlace de cada compra.
- **B. Opción en el sistema:** en el detalle de una **compra**, poder **ver y adjuntar** el PDF y las fotos de la factura
  del proveedor (con teclado y sin internet).
- **C. Verificación:** que las 33 compras muestren su PDF y que la app siga funcionando.

### Resultado (hecho el 17/11, solo en la base de pruebas `siumax`)
- **Archivos:** 33 PDF + 1 foto en `/var/www/siuhub/html/archivos/compras` (34 archivos; HTTP 200 en PDF y JPEG).
- **Foto comprimida:** 42.128 → 26.881 bytes (737 x 543). No había PIL/ImageMagick/cwebp/sharp: se comprimió con
  Edge + Puppeteer usando un `canvas`, sin instalar nada.
- **Base:** respaldo previo de `compras` en `/root/backups/compras-antes-fase4-<fecha>.dump`. Columna nueva
  `compras.archivos jsonb` (también agregada a `servidor/sql/seguridad-sesion.sql` con `ADD COLUMN IF NOT EXISTS`):
  34 enlaces guardados, 34 compras con archivos, `NOTIFY pgrst, 'reload schema'`.
- **Pantalla:** el detalle de Compra muestra "Archivos de la compra" con botones **Ver factura / Ver foto** y
  **Adjuntar PDF o foto**. Los archivos nuevos se guardan dentro de la base (base64) porque el VPS no tiene servidor
  de archivos; los migrados se abren desde nuestro VPS. Todo con teclado (`data-nav`) y sin internet.
- **Prueba:** 11/11 correctas con Puppeteer/Edge. La base quedó limpia: 36 compras, 34 archivos, 0 archivos de prueba.
- **Pendiente:** revisión del dueño en Nego. La pasada oficial y la Fase 5 **no** se tocan sin su aviso.

## Fase 5 · Ajustes, veredicto y paso oficial (solo con aviso del dueño)

- Corregir diferencias, repetir hasta tener un reporte claro: **listo para lanzar** o **falta X**.
- Destino oficial de Nego / ECO SISTEMAS URH. Respaldo previo, validación y aviso explícito.
