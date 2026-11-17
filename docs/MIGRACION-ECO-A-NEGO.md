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

## Fase 2 · Comparar y mapear (siguiente)

- Comparar cada tabla de Eco con las tablas de Nego (Comerc + partes de Servic ya integradas):
  `customers`, `trabajadores`, `bienes_cliente`, `products`, `batches`, `providers`, `compras`, `movimientos`,
  `salidas`/`salida_items`, `agenda_trabajos`, `contratos`, `contrato_*`, `cotizaciones`, `taller_*`, `herramientas`,
  `vehiculos`, etc.
- Entregable: cuadro **tabla de Eco → tabla de Nego**, qué pasa directo, qué se convierte y qué falta.
- Preguntas a resolver: ¿`contactos` son clientes y proveedores a la vez? ¿qué campos de `activos` son piscinas?
  ¿`usuarios` de Eco se migran o se crean usuarios nuevos en Nego? ¿qué hacer con `sync_*`?
- Nada se carga todavía en Nego.

## Fase 3 · Carga de prueba en Nego (después)

- Cargar en el entorno de pruebas de Nego (a confirmar por el dueño) y comparar números clave: clientes, stock por
  producto/lote, saldos/deudas, ventas, activos, mantenimientos.
- Repetible: se puede limpiar y volver a cargar.

## Fase 4 · Ajustes y veredicto

- Corregir diferencias, repetir hasta tener un reporte claro: **listo para lanzar** o **falta X**.

## Fase 5 · Paso oficial (solo con aviso del dueño)

- Destino oficial de Nego / ECO SISTEMAS URH. Respaldo previo, validación y aviso explícito.
