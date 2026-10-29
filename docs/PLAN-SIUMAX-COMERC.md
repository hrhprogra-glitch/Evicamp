# Plan de SiuMax Comerc: estado, fases y forma de trabajo

> Documento para continuar el trabajo con **cualquier IA o programador**. Léelo completo antes de tocar el código.
> Última actualización: 27/10/2026.

## ▶ DÓNDE ESTAMOS AHORA (actualizar después de cada paso)
- **Última actualización:** 28/10/2026 (noche, 18), Antigravity.
- **Fases hechas y subidas:** 0, 1 y 2. En producción en Evicamp desde el 23/10/2026 (commit d36efca).
- **Fase actual:** **4, Clientes y empresas.** La **4.1 y la 4.2 hechas y probadas en siumax** (rama `fase-4`):
  - **4.1:** sección Clientes con pestañas Clientes | Créditos, ficha con DNI/RUC directo, detalle del cliente con pestaña **COMPRAS** para compras directas en caja (al contado/tarjeta/yape) además de PENDIENTES y PAGADOS, con detalle de productos desplegables, barra de pestañas y filtros alineada en una sola fila (40px) y grupos de clientes (familia/empresa).
  - **4.2:** cliente opcional en la Caja (POS) con atajos F3 y botón `CLIENTE (F3)` en cabecera del POS, búsqueda y creación rápida con F2, tickets en espera con nombre personalizado (Shift+Q), guardado de cliente en `sales` (`customer_id` y `customer_name`) e impresión de datos del cliente en la boleta. Ajustes estéticos (scrollbar estilizado) y navegación por teclado (flecha arriba a la ✕, Shift+F3 para quitar cliente, botón claro 'Quitar cliente'). Visualización clara del cliente en Finanzas con badge `[CLIENTE: NOMBRE]` en tabla de movimientos para cualquier venta y cabecera en el detalle de la venta/ticket.
  - **Apariencia / Modo Oscuro:** implementado tema Modo Oscuro reemplazando "Plata / Gris" en Parámetros -> Apariencia con paleta de alto contraste (fondo `#0B0F17`, superficies `#111827`, texto `#F8FAFC`, bordes `#334155` y acentos clásicos), con adaptación de `.bg-white`, controles oscuros nativos, scrollbar estilizado e impresión protegida.
  - **Siguiente: esperar visto bueno del dueño y continuar con la 4.3 (Crédito con plazo y límite).**
  - Además falta su decisión para pedidos: **¿el pedido descuenta el stock al guardarlo o al entregarlo?** (recomendado: al guardarlo).
- **Commits locales sin push:** documentación para IAs, fases 4.1 y 4.2 y Modo Oscuro en rama `fase-4`.
- **URGENTE para Evicamp:** el arreglo del cobro de créditos (se cobraba dos veces) y los cambios de la fase 4 están en la rama `fase-4`. Subirlos cuando el dueño lo autorice.
- **Avisos pendientes para el cliente de Evicamp:**
  - "Mermas" ahora es "Conteos";
  - dar el permiso "Cambiar precio al cobrar" a quien corresponda.

## ▶ PROPUESTAS Y SU ESTADO (actualizar cuando cambien)
| Propuesta | Estado |
|---|---|
| **Modo Oscuro (Dark Mode)** reemplazando "Plata / Gris" en Apariencia | **Hecho en siumax (28/10)** |
| **Grupos de clientes (familia/empresa)** dentro de la 4.1; "Unir" se quitó | **Hecho en siumax (28/10)** |
| Fase 4 (sección 5 de este documento) — **4.1 y 4.2 hechas en siumax** | **Aceptada, 4.1 y 4.2 listas en siumax; falta la decisión del stock de pedidos** |
| Fase 11 SUNAT: camino A (proveedor PSE) → B (directo) | **En pausa** hasta que el dueño lo pida |
| Cobros con QR (Yape/Plin) y aparato de tarjetas (Mercado Pago: QR en pantalla + aparato Point) | **En pausa**; faltan dos decisiones (qué procesador y si empezar por el QR) |
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
  - Base `postgres` = Evicamp; base `siuhub` = siumax (pruebas).
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
| **4** | **Clientes y empresas** (propuesta abajo) | ⏭️ **La que sigue**: falta el OK y una decisión del dueño |
| 3 | Marca, laboratorio, principio activo, modelo y medidas para buscar; venta con receta (farmacia) | Pendiente |
| 5 | Descuentos y promociones (2x1, combos, por monto o por cliente) | Pendiente |
| 6 | Devoluciones y cambios que devuelven stock, garantía con número de serie o IMEI, separados con adelanto | Pendiente |
| 7 | Tallas y colores (variantes con stock propio) | Pendiente |
| 8 | Producción y encargos (recetas e insumos, encargos con fecha y adelanto) | Pendiente |
| 9 | Varias tiendas o almacenes y traspasos | Pendiente |
| 10 | Catálogo en línea (el cliente ve productos y pide por WhatsApp, opción de ocultar precios) | Pendiente |
| 11 | SUNAT: boleta y factura electrónica | **En pausa** hasta que el dueño lo pida (ver sección 7) |

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

## 8. Pruebas
Las pruebas automáticas con teclado (puppeteer-core + Edge, sobre siumax) están en `ai-scripts/pruebas/`. Ahí mismo, `LEEME.md` explica
cómo correrlas. Patrón de cada prueba:
- entrar como admin;
- hacer el flujo solo con teclado;
- revisar el foco esperado en cada paso (✅/❌) y el resultado en la base;
- limpiar los datos creados.

Antes de decir "listo", correr la prueba nueva y las de lo que podía afectarse.
