# Migración de Eco-Sistemas (Supabase) a SiuMax Nego

> Objetivo del dueño (16/11/2026): *"conectarnos al supabase de ecosistemas, copiaremos cada tabla de ecosistemas y sus
> datos, haremos prueba, pasaremos todos sus datos a Nego siuMax para ver si ya está listo para lanzarlo oficial"*.
> Cada paso se anota aquí y en la bitácora. **Nunca** se escribe en el Supabase de Eco (lo usan en vivo) y **nada**
> se pasa a producción sin el aviso del dueño en ese momento.

## Datos de trabajo (privados, NO se suben a git)

| Qué | Dónde |
|---|---|
| Cadena de conexión | `D:\Programación\siumax\.env.ecosistema` (variable `ECOSISTEMA_DB_URL`) |
| Respaldo completo (esquema + datos) | `D:\Programación\siumax\respaldo-ecosistema-2026-11-16.sql` (28 MB, UTF-16LE) |
| Scripts y reportes | `D:\Programación\siumax\migracion-eco\` (fuera de los repositorios) |

**Estado:** Fase 1 ✅ (16/11) · Fase 2 ✅ (17/11) · Fase 3 pendiente de "empieza" del dueño.

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

### Preguntas para el dueño (antes de la Fase 3)

1. **¿La base de prueba es `siumax`** (la que usa `nego.siumax.duckdns.org`)? ¿O prefieres otra?
2. **Usuarios:** Eco tiene 3 usuarios con sus permisos (incluye menús de "piscina" que Nego no tiene). ¿Creamos los
   mismos usuarios en Nego (con clave nueva) o se empieza con usuarios nuevos?
3. **`ventas` (62 "estados de cuenta"):** ¿van a **Cotizaciones** (con sus pagos) o a **Pedidos de clientes**?
4. **Herramientas en uso:** 26 activos están `en_uso` con un trabajador asignado. ¿Se crean **préstamos abiertos**
   en Nego (Herramientas > Préstamos) o solo se deja el estado?
5. **Kardex histórico:** ¿migramos los 4.355 movimientos completos (para que el historial cuadre) o solo el **stock
   final** (`productos.stock` + `lotes.cantidad_actual`)?
6. **Entradas en dólares (11 de 35):** Nego no guarda moneda en las compras. ¿Se anota en `notas`?
7. **Fotos y PDF:** las fotos de productos y los PDF (facturas, documentos de venta) están dentro de Eco
   (`/api/uploads/...`). ¿También copiamos esos archivos, o solo los datos por ahora?

Nada se cargó en Nego todavía.

## Fase 3 · Carga de prueba en Nego (después)

- Cargar en el entorno de pruebas de Nego (a confirmar por el dueño) y comparar números clave: clientes, stock por
  producto/lote, saldos/deudas, ventas, activos, mantenimientos.
- Repetible: se puede limpiar y volver a cargar.

## Fase 4 · Ajustes y veredicto

- Corregir diferencias, repetir hasta tener un reporte claro: **listo para lanzar** o **falta X**.

## Fase 5 · Paso oficial (solo con aviso del dueño)

- Destino oficial de Nego / ECO SISTEMAS URH. Respaldo previo, validación y aviso explícito.
