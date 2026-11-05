# Bitácora compartida (Claude ↔ Antigravity ↔ cualquier IA)

> **Al EMPEZAR:** lee este archivo, `AGENTS.md` y `docs/PLAN-SIUMAX-COMERC.md`.
> **Al TERMINAR, o si te vas a quedar sin uso:** escribe arriba una entrada nueva con lo que hiciste, lo que quedó a
> medias y el siguiente paso, y haz `git commit` (sin push, salvo que el dueño lo pida).
> Escribe en español simple. Lo más nuevo va primero.

---

## 05/11/2026 (113) · Claude — Editar producto: la imagen ya se ve con su X y no se borra al guardar (solo siumax)
- **Dueño:** *"agregué una imagen; si es la incorrecta, al volver a entrar al producto la X para quitarla desapareció; solo puedo reemplazarla"*.
- **Causa (grave):** `ModalProducto` cargaba la foto de `initialData.image`, pero la lista de Inventario la trae en `imageUrl` → al editar la foto no se veía (ni su X) y **al guardar se enviaba `image_url: ` y se BORRABA**.
- **Arreglo:** `image: initialData.imageUrl || initialData.image_url || initialData.image || `; la X tiene id `btn-quitar-imagen-producto`. De paso: el panel avanzado ya no dice "Recetas" (se arman en Producir).
- **¿Se perdieron fotos en Evicamp?** Comparados los 14 respaldos de Evicamp (23/10 → 05/11 17:33) con la base actual (solo lectura, `/tmp/vps-imagenes-perdidas.cjs` con /opt/node22/bin/node): **0 productos** tenían imagen en un respaldo y hoy no. Hoy: 223 con imagen; las 523 vacías nunca tuvieron.
- Probado en siumax: editar COCA COLA ORIGINAL 500ML → vista previa y X visibles; guardar sin cambios → imagen igual (md5). 0 errores. Solo siumax; **Evicamp tiene el error hasta el próximo pase** (cada vez que editan y guardan un producto con foto, la foto se borra): recomendado subirlo pronto.

---

## 05/11/2026 (112) · Claude — Combos y recetas se arman en el botón Producir, con tope por insumo (solo siumax)
- **Dueño:** *"¿no sería mejor que combo/receta esté en el botón Producir? entro, busco los productos y los junto"*, *"primero el nombre, luego escoger los productos"*, *"que esté guardar o ir a lotes"* y *"debe haber un tope: si tengo 1 kilo de harina y 2 huevos, el tope lo pone la cantidad de huevos"* → eligió **quitar la sección de Nuevo producto** → *"empieza"*.
- **`ModalProduccion.tsx` reescrita** (3 vistas): **Lista** de combos y recetas (cuántos alcanzan, Producir para recetas, Cambiar) · **Formulario** 1. nombre → 2. productos que usa (buscador + cantidad por unidad, tabla con costo y stock, "alcanza para N · lo limita X") → 3. Combo o Receta (+ costo adicional por unidad) → 4. precio y categoría (cuesta armarlo / ganancia y %) → Guardar · Guardar y producir ahora · Guardar e ir a Lotes (las dos últimas solo receta) · **Producir** con TOPE: "Puedes producir hasta N · lo limita X (hay S, cada uno usa F)"; escribir más lo deja en el tope y avisa; con tope 0 no produce. Al terminar pregunta "¿Ver sus lotes?" (pestaña Lotes buscando el producto).
- **Arreglos de paso:** (1) el costo adicional se guardaba POR UNIDAD pero Producir lo mandaba como total del lote → ahora × cantidad. (2) Nuevo producto borraba y reescribía `product_recipes` al guardar (si se guardaba antes de que cargaran, la receta se perdía) → ya no los toca. (3) `p_usuario` era siempre "Administrador" → el nombre del empleado.
- **`ModalProducto.tsx`:** quitada "Tipo de producto y composición" (estado, buscador de insumos y escritura de recetas). Los nuevos se crean ESTÁNDAR; al editar no se toca `tipo_compuesto`/`costo_adicional_produccion`. Si es combo/receta sale `btn-cambiar-composicion` "Cambiar sus productos en Producir" (abre el formulario, prop `paraCambiar`). Teclado: ↑ desde Guardar va a Tienda Web / ese botón.
- **`Inventario/index.tsx`:** `onIrALotes` (pestaña Lotes + búsqueda), `onAbrirProduccion` y `produccionParaCambiar`.
- **Después** (captura): *"parece atrapado en un fondo dentro de otro fondo; se desaprovecha espacio; en vez de «Combos y recetas» que diga «Volver»"* → sin recuadro interior (el contenido va directo sobre el fondo de la ventana), la ventana se acomoda a su contenido (alto fijo solo en la lista) y el botón dice "← Volver". Revisado con captura en modo oscuro.
- **Después:** *"agregué un producto por kilo y sale 1; no sé si es unidad o kilo"* → al lado de la cantidad sale la unidad del producto elegido (`unidad-cant-insumo-prod`, ej. KG) y debajo la frase "CADA PAN LLEVA 0.25 KG DE POLLO" (`frase-cant-insumo-prod`), con la ayuda de decimales si es KG/G/L/ML. Probado con POLLO (KG).
- **Después:** *"hay 3 botones; mejor solo Guardar y Guardar e ir a Lotes"* → quitado "Guardar y producir ahora" (para hacer un lote: «Producir» en la lista; el aviso al guardar una receta lo dice). Botones sin partir el texto.
- **Después:** *"aquí el selector no hace clic, pasa al siguiente; va contra las reglas"* (Combo/Receta) → Enter = clic: elige y el selector se queda (antes saltaba al costo adicional o al precio). De paso: quitar un producto con Enter dejaba el selector en Nombre → ahora queda en el producto que sigue o en el buscador. Probado con teclado: Enter Combo (se queda), → (no cambia), Enter Receta (se queda), ↓ costo adicional, quitar → buscador. 0 errores.
- **Después** (captura, Precio/Categoría): *"cuando selecciono y presiono Enter pasa abajo; el Enter tiene que ser como el clic; sigue cometiendo el mismo error"* → en TODA la ventana Enter ya no mueve el selector: Nombre, Precio, Categoría, Costo adicional, ¿Cuántos? y su costo se quedan; el buscador con Enter elige el primero y se queda (→ a la cantidad); la cantidad con Enter agrega y se queda. Regla 9 escrita en MEMORIA-IA. Probado con teclado: 9/9 se quedan, 0 errores.
- Probado en siumax con productos de prueba (huevo 2, harina 5; receta 1+1, adicional 0.50, precio 5): tope "alcanza para 2 · lo limita HUEVO", resumen S/ 3.00 / 5.00 / 2.00 (40 %), escribir 5 → queda 2 con aviso, producido lote de 2 a S/ 3.00 (= (2×0.5 + 2×2 + 2×0.5)/2), huevo 0, harina 3; Editar receta → botón → abre "Cambiar combo o receta". 0 errores; datos de prueba borrados. En siumax y Evicamp no había combos ni recetas. Solo siumax.

---

## 05/11/2026 (111) · Claude — Inventario › Compras: ↓ desde la cabecera ya baja (solo siumax)
- **Dueño** (captura): en Compras, con el selector en Nuevo producto/Ingresar lote/Producir/Traspasos/Proveedores (o en la pestaña Compras estando en otra vista), ↓ no bajaba.
- **Causa:** el ↓ de cada botón iba fijo a los filtros de Productos (`filtro-categoria/estado/orden-inventario`) y el de las pestañas al buscador, que no existen en la vista Compras; la pestaña Compras en Productos/Lotes iba a `inicioCompras()` (null).
- **Arreglo** (`Inventario/index.tsx`): `bajarACompras(origen)` → en la vista Compras baja al botón de la fila Pendientes · Recibidas · Todas · Nueva lista más cercano en horizontal; la pestaña Compras en otra vista baja al buscador.
- Probado (8 botones × 3 vistas): Productos y Lotes igual que antes; Compras: pestañas, Nuevo producto, Ingresar lote, Producir → Pendientes, Traspasos → Recibidas, Proveedores y pestaña Compras → Nueva lista. 0 errores. Solo siumax.

---

## 05/11/2026 (110) · Claude — Nuevo ajuste sin escoger "Merma" o "Conteo" (solo siumax)
- **Dueño:** *"no es necesario escoger merma o conteo; si es menos ya se sabe que es merma, si sobra es conteo"*. Claude avisó lo que Merma hacía y Conteo no (registrar unos pocos sin contar todo; consumo en soles) → el dueño eligió **enlace pequeño**.
- **`ModalAjuste.tsx`:** quitada la pregunta "¿Qué pasó?" (y `MODOS`). Al elegir el producto se CUENTA (`input-contado`): falta → merma (motivos de faltante), sobra → sobrante, cuadra → se guarda solo (sin cambios en `fn_registrar_conteo`). Debajo del campo, enlace `btn-modo-salida` "↳ Solo salieron unos pocos (se rompió, venció, se usó…)" pasa a la salida de antes (lote + cuántos salieron + motivo); allí `btn-modo-conteo` "↳ Mejor contar lo que hay" vuelve. Productos de consumo y quien solo puede sacar van directo a la salida; quien solo puede contar no ve el enlace (conteo a ciegas igual). Subtítulo: "Cuenta lo que hay: si falta es merma, si sobra es sobrante".
- Teclado: ↓ desde el campo o Continuar → enlace; ↑ vuelve; Enter cambia (en la salida el selector va al lote al cargar).
- Probado en siumax con teclado (sin guardar): elegir → foco en ¿Cuántos hay?; sin "¿Qué pasó?"; ↓ enlace, Enter → lote; ↓ → ← … → "Mejor contar" → contar 1 → "Faltan 98" y foco en el motivo; 0 errores. Solo siumax.

---

## 05/11/2026 (109) · Claude — Conteos y fiados: el buscador ya no muestra productos eliminados (solo siumax)
- **Dueño** (captura de Conteos › Nuevo ajuste): *"en el buscador de productos me salen productos que ya han sido eliminados"*.
- **Causa:** eliminar un producto lo deja con `is_active = 0`. Caja, Inventario, Traspasos y Cambio de producto filtran `is_active = 1`; Conteos (`fetchProducts`) y Clientes (lista para el fiado) cargaban todos.
- **Arreglo:** se siguen cargando todos (el historial de ajustes usa la unidad del producto y "Editar salida" abre salidas viejas), pero llevan `activo` (nuevo campo opcional de `Product`) y los buscadores los ocultan: Nuevo ajuste (`elegibles`), Editar salida (`filteredProducts`) y Nuevo fiado (`prodFiltrados`).
- Probado en siumax: buscar "COLA" en Nuevo ajuste → solo COCA COLA ORIGINAL 500ML (COCA COLA e INKA COLA, eliminados, ya no salen), 0 errores. Solo siumax; Evicamp/clientes/GitHub con aviso.

---

## 05/11/2026 (108) · Claude — Al guardar un lote el sistema sacaba al usuario (arreglado en siumax)
- **Dueño:** *"guardé los datos de un producto recién creado y al presionar Guardar el sistema me botó… ya me sucedió como 2 veces"*.
- **Causa:** en la base siumax, `fn_edit_batch` (editar lote, ModalLote) y `fn_soft_delete_batch` (retirar lote) no tenían permiso EXECUTE para `anon` (solo postgres; no se sabe quién lo quitó, el SQL nunca lo revoca). PostgREST respondió 401 (log nginx 20:22 y 20:27 UTC, log PostgreSQL "permission denied for function fn_edit_batch") y `supabase.ts` trata TODO 401 como sesión vencida → login. Evicamp revisado: todas las funciones que llama el sistema tienen permiso.
- **Arreglo:** GRANT EXECUTE a `anon` aplicado en siumax y escrito en `seguridad-sesion.sql` (tras las dos funciones). `src/db/supabase.ts`: solo cierra la sesión si la respuesta trae `code: PT401` (o no se puede leer); otro 401 queda como error en la pantalla.
- Probado en siumax con sesión real: editar y retirar lote → 204; sesión falsa → 401 PT401 (sigue funcionando la salida al login). Desplegado solo en siumax. **Evicamp/clientes/GitHub: esperar aviso** (el cambio de supabase.ts aún no está allí; Evicamp no tenía el problema de permisos).
- Los 2 guardados que fallaron NO cambiaron el lote: volver a guardarlos.

---

## 05/11/2026 (107) · Claude — PASE a Evicamp, clientes, siumax y GitHub (Utilidades › Gráficos y detalles y todo lo de 105–106)
- **Dueño:** *"así súbelo todo a evicamp, a mi github y siumax para mis clientes que pagan"*.
- **SQL:** solo Evicamp lo necesitaba (no existen bases cli_*; siumax ya lo tenía). Ensayo en copia (`ensayo-fases8-11-evicamp.cjs`): 0 errores, 3658 ventas y 1259 productos intactos. Real (`aplicar-fases8-11-evicamp.cjs`): respaldo `respaldo-evicamp-pase-fases8-11-2026-11-05T17-33-09-831Z.dump`, `seguridad-sesion.sql` código 0 en 1.8 s, 0 errores, sin reiniciar la API, la caja abierta siguió abierta. Nueva columna `empresa_config.gastos_fijos_mes` verificada. Facturación de Evicamp sigue apagada (SIMULADO).
- **Deploy:** `deploy.cjs todos` (evicamp, siumax, clientes: 21 archivos c/u, `index-Dig5_IVd.js`).
- **Verificado:** Evicamp y siumax HTTP 200, login sin errores JS, sin `/suscripcion.json` (Evicamp sin Mercado Pago), Tienda Web carga sin errores, API `/rest/v1` 401 sin sesión.
- **GitHub:** merge `--no-ff` de `fase-11-sunat` a `main` y push.
- Cajeros: Ctrl+F5 o volver a abrir el .exe para ver la versión nueva.
- Pendiente del dueño: probar Gráficos y detalles y avisar errores; decidir el ↓ de "Exacto tarjeta/yape" en el cobro.

---

## 05/11/2026 (105) · Claude — Dos reglas más del selector: las flechas nunca cambian una opción y Enter en una casilla = clic (solo siumax)
- **Dueño** (capturas de Nuevo producto): *"con la flecha izquierda cambia la unidad… debería solo cambiar cuando presiono Enter para desplegarlo"* y *"al darle check al número de serie con Enter no se pone check, pasa al siguiente… el Enter es como un clic"*.
- **Reglas universales** en `src/utils/flechasEspaciales.ts` (`alTeclearPrimero`, captura de window, registrada al abrir la app → corre antes que el teclado de cualquier ventana):
  1. **Lista desplegable cerrada:** las flechas NUNCA cambian el valor (se anula lo del navegador); mueven el selector (las flechas propias de la pantalla mandan; si no hay, las de respaldo, que ahora también salen de las listas). **Enter la despliega** si la pantalla no lo atendió (`alSoltarEnter` → showPicker).
  2. **Enter en una casilla (checkbox/radio) = clic:** la marca o desmarca y el selector se queda (stopImmediatePropagation para que el "Enter pasa al siguiente" de los formularios no la salte).
  - Para saber si una pantalla atendió la flecha de una lista se envuelve `preventDefault` del evento (`otraPantallaLoUso`).
- **Quitado lo que cambiaba opciones con flechas a propósito:** Nuevo producto (→ en Unidad de venta pasaba a la siguiente unidad), Conteos › Nuevo ajuste (← → cambiaban el tipo de ajuste), Nuevo grupo (Familia/Empresa) y Ajustes › Sugerencias (tipo). Ahora ← → solo mueven y Enter elige.
- Probado con teclado en siumax: Nuevo producto 9/9 (unidad no cambia con ← → ↓, ↓ propia sigue, casilla de serie con Enter se marca/desmarca y el selector se queda, filtro de Inventario mueve sin cambiar), Nuevo grupo y Sugerencias 4/4, 0 errores. Nuevo ajuste revisado por código.
- **Después:** *"en talla, combo o recetas el selector no funciona"* (Nuevo producto › opciones avanzadas). El selector SÍ llegaba (flechas de respaldo) pero no se veía: los campos de variantes y la casilla no cambiaban al seleccionarse y Combo/Receta solo tenían un brillo tenue. Regla en index.css para TODAS las ventanas: campo/lista/texto con foco → contorno verde por dentro; botón/casilla/opción con foco → contorno verde por fuera; la casilla ilumina su recuadro (`label:has(...)`). Capturas en modo oscuro: Talla, Variantes activadas y Combo se ven seleccionados.
- **Después (capturas de Nuevo producto):** el selector quedaba atrapado en Precio de la variante, cantidad del combo/receta y Costo adicional (campos de NÚMERO: el navegador usa ↑↓ para cambiar el valor). Regla universal ampliada: en campos de número las flechas tampoco cambian el valor (como en las listas) y las flechas de respaldo salen de ellos. Conectado el teclado de variantes (`teclasVar` existía sin usarse): Talla · Color · Precio · Barras, ↑ al tachito, ↓ a la siguiente/Agregar variante. Flechas de respaldo ↑↓: ahora van a la FILA siguiente aunque esté corrida (antes desde el "+" del combo saltaba a Guardar por encima de las casillas de Tienda Web). Probado 15/15. `revisar-selector.mjs` ahora, si hay una caja abierta de verdad, salta las pantallas de Caja/caja abierta en vez de detenerse: 27/29 sin saltos (los 2 de siempre, a propósito).
- **Después:** *"en Compras el selector no se nota"* (Pendientes/Recibidas/Todas/Nueva lista). Contorno verde también en las piezas de las secciones (pestañas, botones de cabecera, filtros, limpiar, paginación). En las pestañas no se veía porque la regla general de modo oscuro (`html[data-theme=dark] button:focus-visible`, de Antigravity) lo ponía POR FUERA y el contenedor con overflow lo recortaba: la regla de pestañas va por dentro (-3px) con la clase repetida para ganarle en fuerza. Verificado con captura en modo oscuro.
- **Después:** *"quiero que quites el sugerir pedido y el mensaje; que ahí se enfoque exclusivamente en el pedido"* (Nueva lista de compras). Quitados de la ventana: botón "Sugerir pedido", "para N días", la fila "Sugerir de" (categoría y qué sugerir), el mensaje explicativo y el resumen de lo sugerido. Quedan proveedor, nota, buscador, Limpiar lista (ahora al lado del buscador, `data-nav=1,1`), la lista y Guardar. La lógica `sugerirPedido` quedó en el código sin usarse (por si el dueño la quiere de vuelta). Teclado 6/6. **Obsoleta:** `ai-scripts/pruebas/prueba-compra-sugerida.mjs`.
- **Después:** *"en el desplegable las letras en negro no se ven bien"* (Categoría de Nuevo producto, modo oscuro). Color fijo `text-[#1E293B]` → `text-[var(--color-ink)]` en la lista de categorías (ModalProducto) y en las de productos y proveedores de Ingresar lote (ModalLote). Ya no queda ningún `#1E293B` de texto fijo.
- **Después:** *"cuando estoy en categoría y pongo Escape no se sale, se queda atrapado"*. Dos fallas en ModalProducto: (1) el teclado de la ventana (efecto con `handleFormKeyDown`) no tenía `showCatDropdown` en sus dependencias → veía un estado viejo: o cerraba TODA la ventana con el primer Escape o cerraba la lista y (2) el `onFocus` del campo la volvía a abrir al instante. Arreglo: `showCatDropdown` en las dependencias y `catCerradaConEscape` (no reabrir 400 ms tras Escape). Probado: 1er Escape cierra la lista y el selector queda en Categoría; escribir la reabre; 2do Escape cierra la ventana.
- Rama `fase-11-sunat`. NO subido a Evicamp ni GitHub (esperar aviso del dueño).

---

## 05/11/2026 (106) · Claude — Utilidades: "Gráficos y detalles" (tablero de ganancias y pérdidas) en lugar de "Top 5 rentables" (solo siumax)
- **Dueño:** pidió cambiar Top 5 por gráficos y detalles "como tienen las empresas para ver sus ganancias y pérdidas"; luego *"busca tesis o sistemas de empresas"* y *"fórmulas que usan"* → Claude investigó (tesis UOC/UNT/UPeU/TecNM, Shopify, Square, Odoo, guías de KPIs de retail) → *"mejora, ya empieza"*.
- **Nuevo:** `src/sections/Utilidades/components/TableroGanancias.tsx` (ventana grande, estilo de ventanas, teclado por recuadros, Escape cierra y vuelve al botón). Secciones: cifras clave con ▲▼ vs. período anterior del mismo largo (ingresos, costo, ganancia bruta y margen, gastos de caja, ganancia neta y margen con referencia 5–15 %, mermas y % con alerta >2 %, n.º de ventas, ticket promedio, por cobrar, mercadería parada); cascada de cómo se forma la ganancia; punto de equilibrio y margen de seguridad (con los gastos fijos del mes); ventas y ganancia por día (línea de equilibrio diario); ganancia por categoría con tabla de margen, stock al costo, rotación/año, días de stock y GMROI; ABC 80/15/5; productos que más ganan y que hacen perder (bajo costo / mermas); cómo te pagan; cuándo vendes más (día de semana y hora); plata fuera de caja (fiados por antigüedad 0–30/31–60/>60 y mercadería parada).
- **Mismos números que la tabla:** el cálculo de Utilidades se movió TAL CUAL a `src/sections/Utilidades/calcularAnalisis.ts` (index.tsx ahora lo llama); el tablero lo usa también para el período anterior.
- **SQL (siumax aplicado, Evicamp PENDIENTE con ensayo):** `empresa_config.gastos_fijos_mes numeric default 0` (seguridad-sesion.sql; lo cambia quien tiene gerencia_configuracion_sistema).
- **Gráficos:** Recharts; colores propios `.tablero-graficos` (--g-ventas azul, --g-resta naranja, --g-ganancia verde agua, rojo solo para pérdidas con texto) validados con la guía de gráficos (claro y oscuro PASS; en claro el verde agua pide valores escritos y tablas: los tiene). Sin esquinas redondeadas.
- Probado en siumax: capturas claro y oscuro, teclado, 0 errores. `VentanaTopsFlotante.tsx` quedó sin uso.
- **Después:** *"solo falta que me permita escoger días anteriores, un calendario desde y hasta, predeterminado para este mes"*. El tablero ahora tiene su propio rango (Desde/Hasta, por defecto del 1 del mes a hoy) y calcula sus datos con `calcularAnalisis` (ya no recibe los de la tabla). Calendarios con la regla: Enter abre, el selector se queda; ← → entre Desde y Hasta; ↓ a Cifras clave; ↑ a la X; las flechas no cambian la fecha. Probado 11/11. Luego, a pedido del dueño, Desde/Hasta pasaron a la cabecera al lado de la X (→ desde Hasta a la X, ← vuelve, ↓ a Cifras; 14/14).
- Rama `fase-11-sunat`. NO subido a Evicamp ni GitHub.

---

## 05/11/2026 (104) · Claude — Arreglo: la Tienda Web de Evicamp no cargaba (subido a todos)
- **Dueño:** pegó el error de la consola (`Cannot read properties of null (reading 'trim')` en /#/tienda) → *"en evicamp no carga la tienda web"*.
- **Causa:** el catálogo público de Evicamp tiene 1 producto SIN NOMBRE (de 1259) e `iniciales()` de `src/sections/TiendaWeb/formato.ts` hacía `.trim()` sobre null. En siumax no había ninguno así.
- **Arreglo:** `iniciales()` acepta vacío (muestra •). Probado ANTES de subir con los datos reales de Evicamp (el navegador de prueba cargó el build nuevo desde la PC): 1259 productos, 0 errores. Con el OK del dueño (*"súbelo"*): `deploy.cjs todos`, tienda y login de Evicamp sin errores, merge a main y push.
- Recomendado al dueño: ponerle nombre a ese producto en el Inventario de Evicamp.

---

## 05/11/2026 (103) · Claude — PASE a EVICAMP, clientes y GitHub (todo lo de las entradas 81 a 102)
- **Dueño:** *"ya quedó todo, ahora sí quiero que lo subas todo a evicamp, a siumax, para mis clientes y para mi github"*.
- **SQL** (solo cambió la anulación de comprobantes no aceptados, entrada 81: estados ANULANDO/NO_EMITIDO, `fn_confirmar_anulacion`, `fn_anular_venta` con `sin_emitir`):
  - Ensayo en copia (`ai-scripts/pruebas/ensayo-fases8-11-evicamp.cjs`): 0 errores, 3643 ventas y 1259 productos intactos, copia borrada.
  - Pase real (`aplicar-fases8-11-evicamp.cjs`): respaldo `/var/lib/postgresql/respaldo-evicamp-pase-fases8-11-2026-11-05T14-26-57-943Z.dump` → seguridad-sesion.sql completo con ON_ERROR_STOP y lock_timeout 5s, SIN reiniciar la API (2,6 s, 0 errores) → NOTIFY pgrst. Verificado: `fn_confirmar_anulacion` existe y la restricción acepta NO_EMITIDO. **Facturación sigue APAGADA en Evicamp** (SIMULADO, no está en el facturador).
- **Pantallas:** `deploy.cjs todos` → evicamp, siumax y clientes con el mismo build (index-B0SRUco2.js). Evicamp: página 200, API 401 sin sesión, login sin errores JS, **sin /suscripcion.json** (no ve avisos ni Mercado Pago).
- **GitHub:** `main` = merge de `fase-11-sunat` (pantallas en cualquier tamaño, reglas del selector, estilo de ventanas, retoques de Antigravity 94-102, anulación NO_EMITIDO, Excel del contador) y push.
- Falta: el dueño o sus cajeros recargan Evicamp (Ctrl+F5 / reabrir el .exe) para ver lo nuevo.
- Pendiente del dueño: el ↓ de "Exacto…" en el cobro; Proveedores con estilo SiuMax Sobrio.

---

## 05/11/2026 (102) · Antigravity — ENTREGA A CLAUDE: resumen de sesión, estado y pendientes
El dueño pidió: *"alista todo para pasar a claude para que claude siga"*.
Todo está listo, limpio y funcionando en la rama `fase-11-sunat` (commits `cb3582f` → `2e98a16`, sin push) y desplegado en `siumax` (`siumax.duckdns.org`).
**IMPORTANTE (Regla 4):** Nada de esto está subido a Evicamp ni a GitHub. Evicamp NO paga (nunca Mercado Pago). Solo subir cuando el dueño lo ordene explícitamente en el momento.

### 1. Resumen de lo realizado en este turno por Antigravity (entradas 94 a 101):
1. **(94) AnyDesk Printer, ticket y textos SUNAT:** Selector liberado para impresoras virtuales; modal de ticket simplificado a solo "Reimprimir"; textos de cambio/devolución simplificados a `[ CAMBIAR ]` y `[ DEVOLVER ]`; botón único unificado `[ ⇄ ]` en la tabla de movimientos; centrado del botón del ojo en Tesorería.
2. **(95) Regla universal de memoria de fila al cerrar modales/submodales:** Implementado WeakMap `enVentana` en `src/utils/ventanas.ts` que memoriza la fila activa previa de cada nivel; al presionar Escape o cerrar un submodal (ej. ticket sobre detalle de caja, o detalle de caja sobre historial), el foco regresa exactamente a la fila que estaba seleccionada y NUNCA salta al buscador.
3. **(96) Aprovechamiento de espacio en ModalGrupo y tabla detalle de caja:** Cifras clave de grupo en 3 columnas y 4 botones alineados al 100% en cuadrícula simétrica `grid-cols-2 sm:grid-cols-4` con altura uniforme (44px) y selector fluido; corregido return prematuro en el selector de la tabla de detalle de caja.
4. **(97) Acciones SUNAT ultra compactas en ModalDetalleTicket:** Altura de cabecera reducida de ~250px a ~65px con botones en línea a la derecha de 24px (`[ ↗ PDF ]`, `[ ↗ XML ]`, `[ 🗎 NOTA ]`, `[ 🔄 REENVIAR ]`); el ticket térmico ahora se visualiza completo en pantalla sin scroll innecesario.
5. **(98) Contraste y visibilidad del selector por teclado en Modo Oscuro:** Doble anillo esmeralda `#10B981` y fondo `#162438` en `.boton-cabecera:focus-visible`; anillos de Tailwind en modo oscuro restaurados de pizarra `#334155` a esmeralda `#10B981`; filas de tabla seleccionadas con fondo `#162438` y barra lateral izquierda verde de 4px; buscador y filtros con recuadro esmeralda de 2px; exclusión de borde verde estático permanente en reposo; limpieza instantánea de foco con clic de mouse.
6. **(99) Letra legible en Conteos, scrollbar sin flechas y teclado en Tienda Web:** Botón `+ NUEVO AJUSTE` con letra plata clara `#CBD5E1` en modo oscuro (no negra); eliminación de `::-webkit-scrollbar-button` para erradicar flechas nativas de Windows; navegación horizontal con flechas `ArrowLeft`/`ArrowRight` entre `input-tienda-web-enlace` ↔ `[ COPIAR ENLACE ]` ↔ `[ VER TIENDA ]` y vertical con `ArrowDown`/`ArrowUp` hacia el resto del formulario.
7. **(100) Desactivación global de autocompletado y scrollbars rectangulares 0px SiuMax Sobrio:** Guard global en `focusin` (`src/main.tsx`) que aplica automáticamente `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"` y `spellcheck="false"` a todo input o textarea del sistema (evita globos flotantes de sugerencias anteriores como '308'); en `src/index.css`, se removió `scrollbar-width` de Chromium (Windows 11) para evitar que el navegador use la barra redondeada Fluent con flechas, forzando `::-webkit-scrollbar` plano con `border-radius: 0px` (esquinas 100% rectas a 90°).
8. **(101) Acceso por teclado al botón `[ X ]` (borrado) en todos los buscadores:** Ahora cuando se escribe en cualquier buscador del sistema, presionar `ArrowRight` al final del texto posa el selector en el botón `[ X ]` (`#btn-borrar-buscador-...`), iluminándolo con fondo rojo vivo `#DC2626` sin curvas; `Enter`/`Space`/`Escape` borra la búsqueda y regresa el foco al buscador; `ArrowLeft` devuelve el cursor al texto; `ArrowRight` avanza al primer filtro; y `ArrowLeft` desde el primer filtro regresa a la `[ X ]` si hay texto. Aplicado a los 10 buscadores del sistema.

### 2. Estado técnico actual:
- Rama: `fase-11-sunat`.
- Compilación: `npx tsc -b` pasa limpio con 0 errores.
- Servidor de pruebas: `siumax` actualizado con el último build (`node ai-scripts/deploy.cjs siumax`).
- Base de conocimiento: `graphify` actualizado (`graphify update .`).
- Documentación: `BITACORA.md`, `PLAN-SIUMAX-COMERC.md`, `CONVERSACIONES.md` y `MEMORIA-IA.md` 100% al día.

### 3. Qué sigue / Pendientes para Claude:
1. **Atender el siguiente pedido que traiga el dueño:** El dueño está probando exhaustivamente en `siumax` y suele enviar capturas marcando detalles visuales o de teclado con flechas rojas.
2. **Pendiente del dueño:** Decidir el comportamiento de la tecla ↓ en "Exacto tarjeta/yape" dentro del cobro (si debe ir a Efectivo o a su campo de pago).
3. **Proveedores:** Llevar la sección Proveedores al estilo oficial SiuMax Sobrio (cuando el dueño lo indique).
4. **Subir a Evicamp / GitHub:** **SOLO cuando el dueño lo diga expresamente en ese momento.**

---

## 04/11/2026 (101) · Antigravity — Navegación por teclado completa al botón [ X ] (borrar búsqueda) en todos los buscadores (solo siumax)
- **Problema reportado por el dueño:** *"me di cuenta de algo que no seleciona cuando escribo algo en el buscador no se seleciona el x y eso en muchos busacadores arregla eso"* con captura de Inventario > Lotes con texto "AMOR" y píldora `[ 0 MATCH ] [ X ]` encerrada en rojo.
- **Causas raíz detectadas:**
  1. Todos los botones de borrado `buscador-sobrio__borrar` se renderizaban con `tabIndex={-1}`, sin ID único, sin manejador `onKeyDown` y sin estilos `:focus` / `:focus-visible`.
  2. En el input del buscador, al pulsar `ArrowRight` al final del texto, el selector saltaba directamente al primer select/filtro (ej. `#filtro-categoria-inventario`), ignorando por completo el botón `[ X ]`.
  3. En sentido inverso, pulsar `ArrowLeft` en el primer filtro saltaba de regreso al input de texto, ignorando también el botón `[ X ]`.
- **Soluciones aplicadas:**
  1. **Estilo visual de foco de borrado (`src/index.css`):**
     - Se añadió `.buscador-sobrio__borrar:focus` y `:focus-visible` con fondo rojo vibrante `#DC2626`, texto blanco nítido, doble anillo de foco y bordes 100% rectos sin esquinas redondeadas (`border-radius: 0px`).
  2. **Navegación espacial bidireccional por teclado en todos los buscadores del sistema:**
     - **Inventario (Productos y Lotes):** `FiltrosInventario.tsx` (`#btn-borrar-buscador-inventario`).
     - **Conteos (Ajustes de inventario):** `FiltrosConteos.tsx` (`#btn-borrar-buscador-conteos`).
     - **Clientes:** `PestanaClientes.tsx` (`#btn-borrar-buscador-clientes`).
     - **Créditos / Fiados agrupados:** `TablaFiadosAgrupados.tsx` (`#btn-borrar-buscador-fiados`).
     - **Pedidos:** `PestanaPedidos.tsx` (`#btn-borrar-buscador-pedidos`).
     - **Cotizaciones:** `PestanaCotizaciones.tsx` (`#btn-borrar-buscador-cotizaciones`).
     - **Finanzas (Movimientos):** `Finanzas/index.tsx` (`#btn-borrar-buscador-finanzas`).
     - **Finanzas (Historial de cajas):** `TablaHistorial.tsx` (`#btn-borrar-buscador-historial-cajas` y `FiltroFechas.tsx`).
     - **Configuraciones (Usuarios):** `TablaUsuarios.tsx` (`#btn-borrar-buscador-usuarios-ajustes`).
     - **Utilidades (Análisis de productos):** `TablaAnalisisProductos.tsx` (`#btn-borrar-buscador-utilidades`).
  3. **Comportamiento interactivo de `[ X ]`:**
     - `ArrowRight` (al final del texto) entra en `[ X ]`.
     - `Enter` / `Espacio` / `Escape`: borra la búsqueda y regresa el foco al buscador.
     - `ArrowLeft`: vuelve al buscador con el cursor al final del texto.
     - `ArrowRight`: avanza al siguiente selector o filtro.
     - `ArrowLeft` desde el primer filtro: regresa a `[ X ]` si hay texto escrito (o al input si está vacío).
     - `ArrowDown` / `ArrowUp`: desciende a la tabla/paginación o asciende a las pestañas/cabecera.
- **Verificación:** validado con Edge/Puppeteer en `siumax` (`ai-scripts/pruebas/verificar-selector-x.mjs`):
  - Foco llega con `ArrowRight` a `btn-borrar-buscador-inventario`.
  - Captura `buscador_x_enfocado.png` confirma fondo rojo de foco sin curvas.
  - `ArrowRight` avanza a categoría, `ArrowLeft` regresa a `[ X ]`, `Enter` borra y devuelve el foco al buscador.
- Compilado con `npx tsc -b` (0 errores) y desplegado a `siumax`.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (100) · Antigravity — Eliminación global de autocompletado y forzado de scrollbars rectangulares 0px SiuMax Sobrio (solo siumax)
- **Problemas reportados por el dueño:**
  1. *"no quiero que haya un autocompletado"*: En los buscadores (como `#buscador-detalle-caja` en el modal de detalle de caja) aparecía el globo/burbuja flotante de sugerencias e historial del navegador (ej. '308') estorbando la selección con teclado y tapando filas de datos.
  2. *"te ewnvie una imagen te marque con rojo el scrool se sigue viendo igual no es cuadrado tipo rectangulo"*: En el modal de previsualización de ticket (`ModalDetalleTicket.tsx`) la barra de desplazamiento vertical en Windows 11 / Edge seguía viéndose con el diseño redondeado Fluent (thumb tipo cápsula/pastilla con extremos curvos y botones de flecha en los extremos), sin respetar las esquinas cuadradas tipo rectángulo.
- **Causas raíz detectadas:**
  1. Los inputs de búsqueda carecían de atributos explícitos anti-autocompletado, permitiendo que el navegador ofrezca valores anteriores del historial.
  2. En Chromium 121+ (Edge/Chrome en Windows 11), cuando un elemento tiene las propiedades CSS estándar `scrollbar-width` o `scrollbar-color`, el motor del navegador apaga los pseudoelementos `::-webkit-scrollbar*` y recurre a la barra nativa Fluent de Windows 11 (cápsula con bordes curvos y flechas).
- **Soluciones aplicadas:**
  1. **Autocompletado desactivado en todo el sistema (`src/main.tsx` y `ModalDetalleCaja.tsx`):**
     - En `src/sections/Finanzas/components/ModalDetalleCaja.tsx`: se añadieron `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="off"` y `spellCheck={false}` al input `#buscador-detalle-caja`.
     - En `src/main.tsx`: se instaló un guard global en `document.addEventListener('focusin', ...)` que intercepta cualquier input/textarea del sistema y le aplica `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"` y `spellcheck="false"`, erradicando por completo globos y burbujas de autocompletado del navegador en todo el POS.
  2. **Scrollbars rectangulares y cuadrados (0 curvas, 0 flechas) (`src/index.css`):**
     - Se eliminaron `scrollbar-width` y `scrollbar-color` para Chromium/WebKit y se envolvieron exclusivamente dentro de `@supports not selector(::-webkit-scrollbar)` como fallback de Firefox.
     - Se forzó `border-radius: 0px !important;` y `border: none !important;` en `::-webkit-scrollbar-thumb` y `::-webkit-scrollbar-track` globalmente y dentro de `.ventana-sobria`, garantizando un rectángulo plano de 6px de ancho con esquinas 100% rectas/cuadradas, sin botones de flecha (`display: none !important; width: 0; height: 0;`).
- **Verificación:** validado con Microsoft Edge en `siumax` (reglas CSS cargadas y comprobadas en vivo, atributo `autocomplete="off"` validado).
- Compilado con `npx tsc -b` (0 errores) y desplegado en `siumax`.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (99) · Antigravity — Corrección de letra en Conteos, scrollbar nativo en ventanas y navegación teclado en Tienda Web (solo siumax)
- **Problemas reportados por el dueño:**
  1. *"en conteo lo marque con rojo la letra es negra no se puede ver que dice arregla eso"*: El botón `+ NUEVO AJUSTE` en Conteos tenía texto negro fijo (`#030712`) sobre fondo carbón `#111827` en modo oscuro.
  2. *"si te das cuenta donde marque el scrooll no es el estilo que siempre usamos cambia eso"*: En `ModalDetalleTicket.tsx` aparecía la barra de desplazamiento nativa gruesa de Windows con flechas `▲` y `▼`.
  3. *"cuando estoy seleccionando el enlace no me puedo mover de izquierda a derecha solo de arriba y abajo arregla eso"*: En Ajustes > Tienda Web, el input del enlace público no permitía moverse horizontalmente con `ArrowLeft` / `ArrowRight` a los botones `[ COPIAR ENLACE ]` y `[ VER TIENDA ]`.
- **Soluciones aplicadas:**
  1. **Conteos (`HeaderConteos.tsx` y `src/index.css`):**
     - Se limpió el botón `#btn-nuevo-ajuste` adoptando el estándar SiuMax Sobrio (`.boton-cabecera` con `--icono: var(--color-warning)`).
     - Se añadió `:not(.boton-cabecera)` en las reglas de `bg-[var(--color-warning)]` de `src/index.css` para evitar que se fuerce color negro `#030712` a botones sobrios. En modo oscuro ahora muestra letra blanco/plata nítida.
  2. **Scrollbar en ventanas (`src/index.css`):**
     - Se eliminó la regla que aplicaba `scrollbar-width: auto !important;` en Chrome/Edge.
     - Se añadió `*::-webkit-scrollbar-button { display: none !important; width: 0 !important; height: 0 !important; }` para suprimir todas las flechas nativas de Windows.
     - Se consolidó la barra oficial sobria de 5px (track `#0B0F17`, thumb `#334155` en modo oscuro; track `#F8FAFC`, thumb `#CBD5E1` en claro).
  3. **Tienda Web (`PestanaTiendaWeb.tsx`):**
     - Se implementó navegación espacial fluida con `onKeyDown` en toda la franja del enlace: `input-tienda-web-enlace` (ArrowRight → `btn-copiar-enlace-tienda` → `btn-ver-tienda-web`; ArrowLeft en sentido inverso).
     - Se conectaron también los saltos con `ArrowDown` y `ArrowUp` hacia los checkboxes de estado, WhatsApp, precios, mensaje y botón guardar.
- **Verificación:** validado con Edge/Puppeteer en `siumax` (script `ai-scripts/pruebas/verificar-3-ajustes.mjs`):
  - Captura `conteo_nuevo_ajuste_ok.png`: botón `+ NUEVO AJUSTE` con letra plata nítida y legible.
  - Captura `ticket_scrollbar_sobrio_ok.png`: ticket limpio sin barras gruesas ni flechas nativas.
  - Captura `tienda_web_teclado_enlace_ok.png`: foco pasando de input a `[ COPIAR ENLACE ]` y `[ VER TIENDA ]`.
- Compilado con `npx tsc -b` (0 errores) y desplegado a `siumax`.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (98) · Antigravity — Mejora de contraste y visibilidad del selector por teclado en Modo Oscuro (solo siumax)
- **Problema reportado por el dueño:** *"bien echo ya quedo ahora me e dado cuenta que en el modo oscuro el selector no se aprecia bien arregla eso"* (captura de Inventario > Productos en Modo Oscuro encerrando en rojo los botones de la cabecera: `+ NUEVO PRODUCTO`, `INGRESAR LOTE`, `PRODUCIR`, `TRASPASOS`, `PROVEEDORES`). El botón seleccionado (`INGRESAR LOTE`) se perdía sobre el fondo oscuro y no se distinguía con claridad qué elemento tenía el foco del selector por teclado.
- **Causas raíz detectadas en `src/index.css`:**
  1. La regla `html[data-theme="dark"] [class*="focus:ring-[var(--color-ink)]"]:focus` forzaba `--tw-ring-color: #334155 !important;` (gris pizarra oscuro), lo cual apagaba los aros de foco sobre fondos carbón `#0B0F17` / `#111827`.
  2. La regla `html[data-theme="dark"] button.bg-[var(--color-ink)]` aplicaba `border-color: var(--color-accent) !important;` de forma estática permanente a botones como `INGRESAR LOTE`, haciendo que pareciera tener borde verde incluso sin foco y confundiendo al usuario.
  3. El foco general tenía apenas 1px con opacidad 0.35 (`rgba(..., 0.35)`), casi invisible en modo oscuro.
- **Solución integral aplicada en `src/index.css`:**
  1. **Botones de cabecera (`.boton-cabecera:focus-visible`):** doble anillo de alto contraste (borde verde esmeralda `#10B981` con anillo separador de 2px negro `#0B0F17`, aro exterior de 4px verde esmeralda y resplandor de 12px), fondo iluminado `#162438`, texto blanco `#FFFFFF` e ícono en verde esmeralda brillante.
  2. **Exclusión de botones en reposo:** `button.bg-[var(--color-ink)]:not(.boton-cabecera)` para que todos los botones de la cabecera tengan su borde sobrio idéntico y homogéneo en reposo, y solo el enfocado resalte.
  3. **Selector de Grilla / Filas de tabla (`.tabla-fila:focus-visible`, `tr:focus-visible`, `[data-row="true"]:focus-visible`):** fondo destacado `#162438`, barra lateral izquierda gruesa de 4px verde esmeralda (`#10B981`) y borde perimetral verde nítido.
  4. **Filtros y Buscador (`.filtro-sobrio:focus`, `.buscador-sobrio:focus-within`, `.limpiar-sobrio:focus-visible`):** marco esmeralda brillante de 2px con sombra de acento.
  5. **Pestañas y Paginación (`.pestanas-sobrias > button:focus-visible`, `.paginacion-sobria__boton:focus-visible`):** realce interior esmeralda de 2px y texto claro.
  6. **Limpieza con mouse:** se añadió `.boton-cabecera:focus:not(:focus-visible)` a la regla de limpieza para que los clics con ratón no dejen ningún resalte ni aro pegado.
- **Verificación:** validado con Edge/Puppeteer en `siumax` con 3 capturas:
  - `selector_modo_oscuro_inventario.png`: botón `INGRESAR LOTE` brilla inconfundiblemente con doble anillo esmeralda.
  - `selector_modo_oscuro_tabla.png`: fila de producto con barra esmeralda de 4px y resalte nítido.
  - `selector_modo_oscuro_filtro.png`: select de categoría con borde esmeralda de 2px.
- **Compilado:** `npx tsc -b` (0 errores) y desplegado con éxito a `siumax`.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (97) · Antigravity — Aprovechamiento de espacio y modo ultra compacto en acciones SUNAT de ModalDetalleTicket (solo siumax)
- **Problema 1 reportado por el dueño:** *"TE FALTA COMODAR ESTO TAMBIEN"* (botones SUNAT rotos en 2 filas con espacio desperdiciado a la derecha).
- **Problema 2 reportado por el dueño:** *"ESTA PERFECTO PERO ES MUY GRANDE TODO PODRIA OCUPAR MENOS ESPACIO PARA APRECIAR MEJOR EL TICKET"* (el bloque ocupaba casi la mitad de la pantalla, tapando los detalles del ticket térmico).
- **Solución ultra compacta aplicada:**
  1. **Boleta en 1 línea con botones a la derecha:**
     - Izquierda: `Boleta {numero}` con su insignia de estado.
     - Derecha: `[ ↗ PDF ]` y `[ ↗ XML ]` compactos (24px de alto) en la misma fila horizontal.
     - Subtítulo mínimo: modo prueba, estado de anulación y mensaje en una sola línea `text-[10px]`.
  2. **Nota de Crédito en franja horizontal delgada:**
     - Izquierda: `Nota de crédito {numero} · S/ {total}` con su insignia de estado.
     - Derecha: `[ 🗎 VER NOTA ]` y `[ 🔄 REENVIAR ]` (24px de alto).
  3. **Resultado visual:**
     - La cabecera SUNAT se redujo de ~250px a ~65px (75% menos de altura).
     - El ticket térmico ahora se aprecia completo en pantalla (incluyendo productos, importes, impuestos, método de pago y código QR) sin necesidad de scroll.
  4. **Teclado:** selector fluido en orden de lectura: Cabecera → Botones de Boleta (`ArrowDown`) → Botones de Nota de Crédito (`ArrowDown`) → Botón Reimprimir (`ArrowDown`); y en sentido inverso con `ArrowUp`.
- **Verificación:** validado con Edge/Puppeteer en ticket real (#308406 de siumax, script `ai-scripts/pruebas/ver-modal-ticket-sunat.mjs`), captura actualizada `ticket_sunat_sobrio.png`. Compilado con `npx tsc -b` (0 errores) y desplegado a `siumax`.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (96) · Antigravity — Aprovechamiento de espacio en ModalGrupo y corrección de selector en detalle de caja (solo siumax)
- **Problema 1 (Caja):** *"EL SELECTOR YA FUNCIONA DENTRO DE LA TABLA"*. Se detectó que un `return () => clearTimeout(timer);` colocado prematuramente dentro de un `useEffect` en `ModalDetalleCaja.tsx` dejaba inaccesible el registro de `handleModalKeyDown`. Se eliminó el retorno temprano manteniendo la limpieza al final del hook. El selector por teclado en la tabla de movimientos de caja navega ahora al 100%.
- **Problema 2 (Grupos):** *"AQUI TIENE ESPACIO QUE NO APROVECHAN ajusta eso"* (captura de `ModalGrupo.tsx` con enorme espacio en blanco a la derecha).
- **Solución aplicada (Opción 1 elegida por el dueño):**
  1. **Panel de Cifras Clave (SiuMax Sobrio):** cuadrícula superior de 3 columnas (`Miembros`, `Descuento` y `Deuda del Grupo`) con números mono limpios y estado claro (`Al día · Sin deuda` o `Créditos pendientes` en rojo).
  2. **Bolsa de 4 botones de acción al 100% de ancho:** los botones `[ 💼 Cobrar al grupo ]`, `[ 👤+ Agregar cliente ]`, `[ ✏️ Editar grupo ]` y `[ 🗑️ Eliminar grupo ]` organizados en `grid grid-cols-2 sm:grid-cols-4` con altura uniforme (44px), bordes nítidos y cero espacio desperdiciado.
  3. **Teclado:** selector `teclas` funcionando entre los 4 botones, la X de cierre y la lista de clientes hacia abajo.
- **Verificación:** validado con Puppeteer/Edge (`ai-scripts/pruebas/ver-modal-grupo.mjs`), captura generada `grupo_cifras_sobrio.png`. Compilado con `npx tsc -b` (0 errores) y desplegado a `siumax`.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (95) · Antigravity — Regla universal: memoria de fila al cerrar submodales y modales (sin saltos al buscador)
- **Problema reportado por el dueño:** *"cuando selecciono una tabla y presiono enter entro ahi todo normal pero cuando pongo x el selector se va arriba al buscador y no se queda donde seleccioné obligándome a bajar y volver a seleccionar la tabla quiero que eso no pase como también que eso no pase en otras tablas que sea como una regla"*.
- **Causas identificadas:**
  1. En `ModalDetalleCaja.tsx`: el `useEffect` de auto-foco escuchaba `ticketSeleccionado`. Al cerrar el ticket (`ticketSeleccionado` pasando a `null`), a los 60ms ejecutaba forzosamente `searchInputRef.current?.focus()`, quitando el selector de la fila.
  2. En `src/utils/ventanas.ts`: `enVentana` guardaba solo una referencia plana de elemento (`HTMLElement`) que no recordaba ID ni texto si la tabla re-renderizaba o si el foco estuvo en un botón de la fila; además `devolverEnVentana` abortaba si el foco ya estaba dentro de la ventana (`v.contains(a)`), sin notar que había caído erróneamente en el buscador. Y `filasVisibles` excluía elementos dentro de ventanas.
- **Solución universal aplicada:**
  1. `src/utils/ventanas.ts`:
     - `FILA` selector ampliado con `[id^="mov-row-"]` y `[id^="caja-row-"]`.
     - `filasVisibles(contenedor?)` ahora permite buscar filas dentro de cualquier ventana contenedora.
     - `enVentana` ahora almacena `WeakMap<HTMLElement, Recuerdo>` con `{ el, id, fila, texto }` para cada nivel de ventana anidada.
     - Regla universal: si el foco actual `a` es un buscador (`esBuscador`) y había una fila guardada, tanto `devolverEnVentana` como `devolver` no se conforman con el buscador y devuelven el selector a la fila seleccionada.
     - En `alEnfocar`, un auto-focus incidental a un buscador no sobrescribe la fila recordada.
  2. `ModalDetalleCaja.tsx`:
     - Se añadieron `ultimoTicketRef` y `yaEnfocoInicialRef`. El auto-foco al buscador ocurre únicamente en la apertura inicial. Al cerrarse un ticket, se restaura inmediatamente el foco a la fila del ticket (`mov-row-${idTicket}`).
  3. `TablaMovimientos.tsx` y `TablaHistorial.tsx`:
     - Agregados `id={`mov-row-${item.id}`}` e `id={`caja-row-${caja.id}`}` a los `<tr>`, así como IDs a sus botones de acción.
- **Verificación en siumax:** prueba automatizada con Puppeteer / Edge (`ai-scripts/pruebas/prueba-selector-cierre-submodal.mjs`):
  - 5 de 5 checks aprobados con 0 errores: al cerrar ticket el selector se mantiene en la fila (`#mov-row-1793809269661`), y al cerrar caja regresa a la fila de caja (`#caja-row-1793633990774`). Captura guardada: `submodal_foco_fila_restaurado.png`.
- Rama `fase-11-sunat`. Desplegado a `siumax`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (94) · Antigravity — Selector al imprimir, ticket solo con reimprimir, unificación de cambio/devolución y centrado de acciones (solo siumax)
- **Selector al imprimir (AnyDesk Printer / navegador):** al abrir la ventana de impresión, `recordarSeleccionEnVentanas` (`ventanas.ts`) le quitaba el foco a la ventana de la impresora en milisegundos para forzarlo a SiuMax, impidiendo escoger entre "Imprimir" y "Cancelar" con el teclado. Solución: en `src/utils/impresion.ts` se escucha `beforeprint` / `afterprint` y en `useReactToPrint` (`onBeforePrint`/`onAfterPrint`) gestionando el estado `estaImprimiendo()`. Cuando está imprimiendo, `ventanas.ts` y el `handleKeyDown` del ticket pausan la trampa de teclado, permitiendo navegar libremente con `Tab`/flechas/Enter/Escape en el diálogo nativo de la impresora. Al cerrarse, el foco regresa suavemente al botón de reimprimir.
- **Previsualización de ticket (`ModalDetalleTicket.tsx`):** a pedido del dueño, se eliminaron los botones redundantes de `[C] CAMBIAR PRODUCTO` y `[D] DEVOLVER` del pie, dejando únicamente `[ENTER / P] REIMPRIMIR` junto al total facturado. Se limpiaron los atajos correspondientes del foco y teclado.
- **Cambio y Devolución (`ModalCambioProducto.tsx`):** texto largo de SUNAT simplificado a una sola línea clara (`{tipoCpe} {numero} (SUNAT) · Se emitirá con nota de crédito.`) y botones simplificados a `[ CAMBIAR ]` y `[ DEVOLVER ]` (en vez de "CAMBIAR POR OTRO PRODUCTO" y "SOLO DEVOLVER").
- **Tabla de movimientos (`TablaMovimientos.tsx`):** unificados los dos botones en uno solo `[ ⇄ ]` con `title="Cambio / Devolución"`, eliminando el icono duplicado de anulación (`RotateCcw`).
- **Centrado de acciones en Tesorería (`TablaHistorial.tsx`):** la celda de acciones tenía `hidden md:flex`, lo que rompía el display de tabla HTML (`table-cell`) y desalineaba el botón del ojo hacia la derecha. Se corrigió a `hidden md:table-cell` envolviendo el botón en un contenedor centrado. Comprobado con captura `historial_cajas_centrado.png`.
- Rama `fase-11-sunat`. Todo compilado con `npx tsc -b`, desplegado a `siumax` y probado. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (93) · Claude — ENTREGA A ANTIGRAVITY: pantallas, selector y ventanas
El dueño pidió: *"alista todo para que Antigravity siga lo que dejaste"*. Todo está en la rama `fase-11-sunat` (commits
cb3582f → 106502f, sin push) y en siumax. **Nada de esto está en Evicamp ni en GitHub**: solo cuando el dueño lo diga en ese
momento (Evicamp NO paga: nunca Mercado Pago).

**Lo hecho en esta sesión (ver entradas 89 a 92):**
1. **Pantallas en cualquier tamaño (89-90):** cabeceras que bajan de fila (pestañas `pestanas-sobrias` en cuadrícula), cobro compacto en laptops (`[@media(max-height:820px)]`), botón Guardar siempre visible en ventanas (pie fijo, medio con `flex-1 min-h-0 overflow-y-auto`).
2. **Las 6 reglas del selector (91-92):** `src/utils/ventanas.ts` (con una ventana abierta el selector nunca se pierde ni sale), `src/utils/flechasEspaciales.ts` (flechas de respaldo en orden de lectura, sin espera; `filaEnMedio()` para cabeceras que bajan de fila), `src/sections/Punto-de-venta/tecladoCaja.ts` (mapa de flechas de la Caja), calendarios con Enter que no saltan.
3. **Estilo de TODAS las ventanas (92):** el del detalle de producto de Utilidades — piezas `ventana-sobria`, `ventana-cabecera` (+ `--icono`), `ventana-cabecera__titulo`, `ventana-cerrar`, `ventana-cifras`, `ventana-recuadro` en `src/index.css`. 49 ventanas + avisos (`dialogos.tsx`), clave del admin (`autorizacion.tsx`), Compras (molde `Ventana` de PanelCompras) y cobro.
4. **Retoques pedidos después:** resaltado suave en Proceder/Cotización/Pedido; barra de scroll de siempre (5 px sin flechas) también en Chrome/Edge nuevos y en toda ventana; Nuevo grupo con una sola flecha de volver; Reporte contador con ← → entre Mes y Descargar; letra blanca de botones oscuros en cabeceras.

**Pendientes (esperan al dueño, NO hacer sin su OK):**
- **Cobro:** "Exacto tarjeta/yape" con ↓ baja a SU campo de pago (salta Efectivo). Se le preguntó si debe ir siempre a Efectivo; no respondió.
- Ventanas que se abren desde filas (detalle de cliente, fiado, ticket, caja pasada, historial de lotes, etiquetas…) tienen el estilo por las clases pero no se pudieron revisar con datos (siumax casi vacío). Si el dueño manda captura de alguna distinta, arreglarla igual que las demás.
- Pasar todo a Evicamp y GitHub solo con su aviso (hay SQL de la fase 11 ya en Evicamp; estos cambios son solo de pantallas: `deploy.cjs evicamp` + push).
- Otros de antes: Cotizaciones/Pedidos como tablas; modo real de Nubefact; plan revendedor y certificado.

**Cómo revisar después de tocar pantallas (todo en `ai-scripts/pruebas/estilo/`, ver LEEME):**
- `revisar-tamanos.mjs`, `revisar-ventanas.mjs`, `revisar-ventanas-caja.mjs` (que nada se corte; botón principal visible).
- `revisar-selector.mjs [filtro]` (~15 min; las 6 reglas + saltos de orden). Los 3 "saltos" que quedan son a propósito: Exacto→su campo (pendiente), lista de sugerencias abierta en Ingresar lote, régimen tributario cae en la opción elegida.
- `ver-ventanas.mjs` (capturas de 19 ventanas) y `../../estilo-ventanas.cjs` (sin --aplicar: qué ventanas no tienen las piezas del estilo).
- **OJO:** varias pruebas abren una caja y un producto de prueba por SQL y los borran; **se detienen solas si hay una caja abierta de verdad** (el dueño estaba probando ventas en siumax). No forzarlas. No correr dos pruebas a la vez (usan los mismos ids de prueba).

**Cuidados aprendidos (también en MEMORIA-IA):** reglas CSS de "letra clara → oscura" deben excluir elementos con fondo propio; en Chrome/Edge 121+ `scrollbar-width`/`scrollbar-color` anulan el diseño `::-webkit-scrollbar`; un control desactivado no recibe el selector (saltar al primero activo); los "rescates" globales de teclado deben respetar `e.defaultPrevented`; nunca presionar Enter en una prueba sin saber dónde está el selector.

---

## 04/11/2026 (92) · Claude — Todas las ventanas flotantes con el mismo estilo + selector más rápido y en orden (solo siumax)
- **Selector:** el dueño notó que "cuando muevo rápido el selector es muy lento" → las flechas de respaldo (`flechasEspaciales.ts`) ya no esperan 90 ms (actúan apenas termina la tecla). Orden de lectura: `filaEnMedio()` hace que las flechas pasen por la fila de botones que baja entre pestañas y buscador en laptops (Inventario, Lotes, Compras, Clientes); Finanzas/Ver historial ↑ al primer botón; pestañas de Ajustes sin ícono en laptops para caber en una fila; Nuevo usuario ← a Estado; Empresa ↑/↓ sin saltos; Tienda web: el texto largo deja salir con ↓ en su última línea (llega a Guardar) y la pestaña entra por el enlace. El "rescate" de Inventario ya no pisa las flechas de las pestañas (`if (e.defaultPrevented) return`). Revisión de saltos: 34/37 sin saltos; los 3 restantes son a propósito (cobro: cada "Exacto" va a su campo — pendiente que el dueño decida; lista de sugerencias abierta en Ingresar lote; régimen tributario cae en la opción elegida).
- **Ventana de empleado:** scroll delgado, panel izquierdo angosto, permisos en columnas que se acomodan (4 en pantalla grande, 3 en laptop) sin cortar palabras.
- **Detalle de producto (Utilidades)** sin sombra → el dueño: *"me gustó, quiero ese estilo igual en todas las ventanas flotantes"* → plan → *"empieza"*.
- **Estilo de ventanas** (piezas en `src/index.css`, sección "VENTANAS SiuMax Sobrio"): `ventana-sobria` (marco borde 2, SIN sombra; dentro también se apagan las sombras desplazadas sin tocar el resaltado del selector: `--tw-shadow`), `ventana-cabecera` (clara; `--icono` = color del cuadrito), `ventana-cabecera__titulo` (el primer ícono del título se vuelve el cuadrito de color), `ventana-cerrar` (X con borde fino; también se aplica sola a cualquier botón con la X en la cabecera), `ventana-cifras`, `ventana-recuadro`.
- Aplicado a **49 ventanas** con `ai-scripts/estilo-ventanas.cjs` (agrega clases, NO toca teclado ni lógica; sin `--aplicar` solo informa) + a mano: cobro, avisos del sistema (`dialogos.tsx`: Aviso verde / Confirmar amarillo) y clave del administrador (`autorizacion.tsx`, candado amarillo). El color que tenía cada cabecera pasó al cuadrito: cierre de caja rojo, movimiento/detalle de caja/balanza azul, precio de consumo y editar salida amarillo, el resto verde. Sin tocar: Tienda Web pública y menú del celular.
- Revisado: capturas de 19 ventanas + aviso; `revisar-ventanas.mjs` y `revisar-ventanas-caja.mjs` sin fallas (botón principal visible en 6 tamaños), 0 errores, siumax con sus 11 ventas.
- No se pudieron abrir con datos (siumax vacío): las ventanas que salen de una fila (detalle de cliente, fiado, ticket, caja pasada, historial de lotes…); reciben el mismo estilo por las clases.
- **Después (mismo día):** Caja: Proceder al pago, Cotización y Pedido con un resaltado suave (borde de acento) cuando el selector está en ellos. **Barra de scroll:** Chrome/Edge 121+ ignoran el diseño de 5 px sin flechas si hay `scrollbar-width`/`scrollbar-color` (salía la barra fina con flechas, p. ej. en la vista previa del ticket); en index.css se dejan en `auto` con `@supports selector(::-webkit-scrollbar)` y toda zona con scroll dentro de `.ventana-sobria` usa la barra del sistema aunque le falte `custom-scrollbar`.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub.

---

## 04/11/2026 (91) · Claude — Las 6 reglas del selector en todo el sistema (solo siumax)
- **Dueño:** pidió confirmar si el sistema cumple sus reglas del selector y luego *"sí, empieza y hazlo todo de una"*. Reglas:
  1. el selector llega a TODOS los botones, buscadores y campos; 2. calendario: Enter lo abre y al elegir el selector se queda en la fecha (Enter no pasa al siguiente cuadro); 3. moverse ← → (y ↑ ↓); 4. al salir del sistema y volver, algo queda seleccionado; 5. en una ventana el selector nunca se pierde; 6. con una ventana abierta, el selector nunca sale de ella.
- **Revisión automática nueva** `ai-scripts/pruebas/estilo/revisar-selector.mjs` (37 pantallas: secciones, pestañas y ventanas; recorre con flechas desde donde arranca, prueba Tab, clic en el fondo, salir y volver, y cada calendario). Abre caja y producto de prueba por SQL y los borra; **frena si se crea una venta**.
- **Antes:** 11 de 37 cumplían. **Arreglos:**
  - `src/utils/ventanas.ts` (`recordarSeleccionEnVentanas`): con una ventana abierta, si el selector se pierde (clic en el fondo, volver de otro programa) vuelve a lo último que tenía en esa ventana; si intenta salir, vuelve adentro; si una ventana se abre con el selector afuera (Producir, Traspasos), se pone en su primer campo/botón.
  - `src/utils/flechasEspaciales.ts` (nuevo, activado en App.tsx): **flechas de respaldo** — si una flecha no hizo nada (nadie la atendió y el selector sigue igual a los 90 ms), el selector pasa al control más cercano en esa dirección dentro de la ventana o sección. No actúa en filas de tablas, líneas del ticket, listas desplegables, fechas, horas, números ni textos largos. Las flechas propias de cada pantalla siempre mandan.
  - Caja: `src/sections/Punto-de-venta/tecladoCaja.ts` (mapa de flechas): Cliente, ✕, Por cobrar, Caja actual, monto, ojo, barra de montos, Espera, Vaciar, Proceder (↓ Cotización), Cotización y Pedido. ↑ desde el buscador sube a Cliente.
  - Calendarios: Cotización y Pedido de la Caja (fecha y hora) — Enter abre el calendario y se queda; ↓ sigue. Cobro: si el calendario del fiado no se puede abrir, el selector se queda en la fecha (antes saltaba a "Confirmar pago").
  - Ingresar lote: con el formulario vacío la fecha y "Guardar" están desactivados; las flechas ahora saltan al primero activo (llega a "Cancelar").
- **Resultado final:** 37 de 37 pantallas cumplen las 6 reglas, 0 errores (antes 11 de 37).
- **Incidente:** la primera corrida de la revisión creó por accidente una venta de prueba de S/ 5 en siumax (Enter cayó en "Confirmar pago" porque el navegador de prueba no abre calendarios). Se borró (venta + movimiento de inventario); siumax quedó con sus 11 ventas. La revisión ahora frena si aparece una venta.
- No probado con datos: ventanas que se abren desde filas (siumax casi vacío) y la Tienda Web pública.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub.

---

## 04/11/2026 (90) · Claude — Ventanas: el botón Guardar siempre a la vista (solo siumax)
- **Dueño** (captura de "Ingresar lote de stock"): *"¿adaptaste bien las ventanas flotantes? En la ventana de lote el botón guardar no sale"*.
- **Causa:** el medio de `ModalLote` tenía `sm:overflow-visible` (en PC no hacía scroll), así que el contenido empujaba el pie con "Guardar lote" fuera de la pantalla. Esa ventana no estaba en la revisión (89), y la revisión daba por buena una ventana si el botón se alcanzaba bajando con scroll.
- **Arreglos:**
  - `ModalLote`: medio con `flex-1 min-h-0 overflow-y-auto`; cabecera y pie fijos → "Guardar lote" siempre visible (1280×720: y 628→672).
  - `ModalAbono` y `ModalApertura`: antes hacía scroll TODA la ventana (el botón se escondía abajo en pantallas bajas); ahora cabecera y pie fijos y scroll solo en el medio.
  - `ModalBalanza` y `ModalPrecioConsumo` siguen con scroll de toda la ventana (el botón va dentro del medio), pero son muy cortas.
- **Revisión más estricta** (`revisar-ventanas.mjs` y `revisar-ventanas-caja.mjs`): el botón principal (Guardar, Registrar, Confirmar, Crear, Finalizar, Ingresar…) tiene que verse ENTERO sin bajar con el mouse. Ventanas nuevas en la revisión: Ingresar lote, Producir, Traspasos, Nueva compra, Aperturar caja. Nuevo producto revisado también en el formulario completo (paso 2: "Guardar" y "Guardar e ir a lotes" visibles).
- **Resultado:** 0 fallas en 6 tamaños (1920 a celular), 0 errores JS, siumax como estaba.
- **Revisión por código** de las 52 ventanas: las que se abren desde filas (detalle de cliente, grupos, historial de lotes, etiquetas, proveedores, corregir conteo…) usan `CuerpoVentana` de `ListaVentana` (ya con scroll en el medio); ModalFormGrupo, nombre de espera y autorización son de pocos campos. No se pudieron abrir con datos porque siumax está vacío.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub.

---

## 04/11/2026 (89) · Claude — Todo se ve completo en cualquier tamaño de pantalla (solo siumax)
- **Dueño:** *"el sistema tiene que ajustarse a cualquier tamaño de pantalla para que todos los botones, sesiones y ventanas aparezcan bien y completos, no topados por la ventana"* (captura de Ajustes) → propuesta → *"sí, empieza"*.
- **Revisión automática** en 7 tamaños (1920×1080, 1600×900, 1366×768, 1280×720, 1024×768, tablet 768×1024, celular 390×844), con scripts nuevos en `ai-scripts/pruebas/estilo/`:
  - `revisar-tamanos.mjs`: las 7 secciones y TODAS sus pestañas (Lotes, Compras, Créditos, Cotizaciones, Pedidos, Ver historial, cada pestaña de Ajustes). Marca página más ancha que la pantalla, botones/pestañas/campos fuera de la pantalla (sin scroll que los alcance) y títulos tapados.
  - `revisar-ventanas.mjs`: 10 ventanas (nuevo producto, proveedores, nuevo cliente, grupos, nuevo ajuste, reporte contador, nuevo usuario, nueva tienda…).
  - `revisar-ventanas-caja.mjs`: cobro, cliente, espera, cotización, pedido, nuevo movimiento y cierre de caja. Abre una caja y un producto de prueba por SQL (no vende nada) y los borra al final; si hay una caja abierta de verdad, no hace nada.
- **Encontrado y arreglado:**
  - Pestañas de **Ajustes** salían por la derecha desde 1600 px (en 1024 se perdían 4) y el título quedaba pegado; botón **Proveedores** de Inventario cortado en 1600; pestañas de **Clientes** fuera de la pantalla en tablet y celular.
  - **Regla nueva (index.css `.pestanas-sobrias`):** si no caben, las pestañas bajan a otra fila formando una cuadrícula de bordes finos (el marco pone borde arriba/izquierda y cada pestaña derecha/abajo; `flex: 1 1 auto`). En pantallas grandes se ven igual que antes.
  - **Cabeceras** de Ajustes, Clientes e Inventario: contenedor `flex flex-wrap justify-between items-center` (los botones pasan abajo si no entran al lado), título con `shrink-0`, pestañas y botones con `min-w-0` (sin `shrink-0`), botones de Inventario con `sm:flex-wrap`.
  - **Cobro (ModalCobro):** el modo compacto se activaba solo con menos de 700 px de alto; ahora con menos de 820 px. En laptops de 720/768 de alto la fila Nota de venta / Boleta / Factura salía cortada a la mitad; ahora entra completo.
- **Resultado:** 0 cosas cortadas en los 7 tamaños (secciones + pestañas + 17 ventanas), 0 errores JS, siumax quedó como estaba (caja y producto de prueba borrados). Capturas revisadas a ojo.
- Ventanas largas (nuevo producto, pedido por encargo) en pantallas bajas se bajan con scroll dentro de la ventana: nada queda fuera.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub.

---

## 04/11/2026 (88) · Antigravity — ENTREGA A CLAUDE: estado actual, lo avanzado y qué sigue
El dueño pidió: *"perfecto alista todo porque nos pasaremos a claude"*. Todo queda guardado en la rama `fase-11-sunat` (sin push a GitHub ni Evicamp) y completamente desplegado y probado en el servidor de pruebas `siumax`.

**Estado exacto de lo avanzado en esta sesión por Antigravity:**
1. **Utilidades (84):** Estilo SiuMax Sobrio completo idéntico a Inventario (`boton-cabecera` en `[ Top 5 Rentables ]`, `tarjeta-sobria` sin saltos ni sombras 3D, buscador sobrio fuera del marco con MATCH y Escape, selects de categoría/rotación y fechas nativas con `filtro-sobrio`, botón `limpiar-sobrio`, `tabla-marco`, `paginacion-sobria` arriba y abajo que se oculta si no hay registros, `vacio-sobrio` y teclado 100%). Captura `utilidades_sobrio.png`.
2. **Ajustes / Configuraciones (85):** Estilo SiuMax Sobrio completo (pestañas sobrias con acento verde inferior, `TablaUsuarios.tsx` con buscador fuera, filtro de rol, botón `[ + Nuevo Usuario ]` en `boton-cabecera`, tiendas en `boton-cabecera`, tarjetas sobrias en facturación, tienda web y empresa, sin sombras 3D, teclado 100%). Captura `ajustes_sobrio.png`.
3. **Punto de Venta / Caja (86):** Eliminadas sombras y márgenes sobrantes a pedido del dueño (en `src/App.tsx` padding `p-0` cuando está en `pos` para quedar al ras sin marco perimetral blanco; eliminada la sombra exterior de 6px en el contenedor de Caja `lg:shadow-[6px_6px_0_0_var(--color-ink)]` y las sombras en buscador y botones de cobro/espera/ticket). Captura `pos_limpio.png`.
4. **Clientes y Grupos (87):**
   - El dueño notó que no había botón para gestionar o crear grupos sin tener un cliente previo.
   - Se añadió el botón `[ Grupos ({grupos.length}) ]` en la cabecera al lado de `[ + Nuevo cliente ]` con estilo `boton-cabecera` (el dueño pidió eliminar `[ + Nuevo grupo ]` para centralizarlo dentro de la lista).
   - En `ModalElegir` (lista de grupos), se limpió el texto a `Crear grupo nuevo` (sin duplicar el `+`).
   - En `ModalFormGrupo` se agregó el botón `[ ← Volver ]` en el pie y la flecha en la cabecera.
   - Si se cancela o pulsa Volver (o Escape), regresa suavemente a la lista de grupos.
   - Al crear el grupo con `[ Crear grupo ]`, se guarda en PostgreSQL y **regresa automáticamente a la lista de grupos** mostrando el grupo recién creado.
   - Teclado 100% probado en Edge (16/16 checks ✅). Capturas `clientes_cabecera_sobria.png`, `modal_form_grupo_con_volver.png` y `lista_grupos_tras_crear.png`.

**Siguiente paso (lo que sigue en la lista del dueño):**
1. **Proveedores** (`src/sections/Proveedores/`): aplicar la receta oficial de **SiuMax Sobrio** (cabecera con `boton-cabecera`, buscador grande fuera del marco de la tabla con "N MATCH" y Escape, filtros sobrios, paginación arriba y abajo, estado vacío compartido y navegación por teclado fluida). Receta completa en `docs/MEMORIA-IA.md` §18.
2. Si el dueño lo pide: tablas dentro de ventanas emergentes (preguntarle siempre antes).
3. **Regla 4 permanente:** NADA se sube a Evicamp (producción) ni a GitHub sin que el dueño lo ordene explícitamente en ese momento. Evicamp NO paga (nunca Mercado Pago).

---

## 04/11/2026 (87) · Antigravity — Botón Grupos (n) en cabecera y flujo con botón Volver al crear grupo (solo siumax)
- **Clientes (`src/sections/Clientes/index.tsx` y `ModalFormGrupo.tsx`):**
  1. **Ajuste pedido por el dueño:** eliminar el botón `[+ Nuevo grupo]` de la cabecera dejando únicamente `[Grupos (N)]` (al lado de `[+ Nuevo cliente]`), ya que dentro de la ventana de grupos ya existe la opción para crearlos.
  2. **Botón "Volver" en creación de grupos:**
     - En `ModalFormGrupo`: se agregó el botón `[ ← Volver ]` en el pie y la flecha `[ ← ]` en la cabecera.
     - Si el usuario hace clic en Volver o presiona Escape, regresa suavemente a la lista de grupos (`ModalElegir`).
     - Al crear el grupo con `[ Crear grupo ]`, se guarda en la base de datos y regresa automáticamente a la lista de grupos, mostrando el grupo recién creado de inmediato.
  3. **Limpieza visual:** se corrigió la opción extra en `ModalElegir` para decir `Crear grupo nuevo` sin duplicar el símbolo `+` (antes salía `+ +`).
  4. **Navegación 100% por teclado:**
     - Desde la pestaña Clientes: `→` pasa a `btn-nuevo-cliente` → `btn-ver-grupos`.
     - `←` regresa entre ellos y vuelve a las pestañas.
     - `↓` desde cualquiera baja a `buscador-clientes`.
     - En `ModalFormGrupo`: `ArrowLeft` desde "Crear grupo" pasa a "Volver", y `ArrowRight` regresa a "Crear grupo".
  5. **Verificado en siumax:** prueba automatizada con Puppeteer / Edge (`ai-scripts/pruebas/prueba-botones-grupos-clientes.mjs`) pasó 16/16 checks con 0 errores JS. Capturas guardadas: `clientes_cabecera_sobria.png`, `modal_form_grupo_con_volver.png` y `lista_grupos_tras_crear.png`.
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (86) · Antigravity — Eliminación de sombras y ajuste al ras en Caja / Punto de Venta (solo siumax)
- **Punto de Venta / Caja (`src/sections/Punto-de-venta/` y `App.tsx`):**
  1. **Espacio sobrante eliminado:** en `src/App.tsx` la sección principal ahora usa `p-0` cuando la vista activa es `pos` (en lugar de `p-2`), eliminando el marco blanco perimetral y dejando la caja al ras de la pantalla.
  2. **Sombras eliminadas:**
     - Eliminada la sombra exterior de 6px en el contenedor de caja (`lg:shadow-[6px_6px_0_0_var(--color-ink)]`).
     - Eliminada la sombra inferior del banner de caja cerrada (`shadow-[0_4px_0_0_var(--color-ink)]`) y del botón de aviso de comprobantes.
     - Eliminada la sombra del buscador (`shadow-[4px_4px_0_0_var(--color-ink)]`), botón de cliente, "Por cobrar", botón "Espera", "Proceder al pago", "Cotización" y "Pedido".
  3. **Verificado en siumax:** prueba visual automatizada (`ai-scripts/pruebas/estilo/ver-pos.mjs`) ejecutada en Edge con 0 errores JS y captura guardada (`pos_limpio.png`).
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).

---

## 04/11/2026 (85) · Antigravity — Estilo oficial "SiuMax Sobrio" aplicado en Ajustes (solo siumax)
- **Ajustes / Configuraciones (`src/sections/Configuraciones/`):** adaptado idéntico al modelo de Inventario > Productos.
  1. **Cabecera sobria:** fondo liso con borde inferior de 2px, ícono verde con sombra sutil, título `AJUSTES`, y pestañas sobrias (`pestanas-sobrias` con borde fino, sin sombras, y pestaña activa subrayada con acento verde).
  2. **Gestión de Usuarios (`TablaUsuarios.tsx`):**
     - Buscador sobrio (`buscador-sobrio`) fuera del marco de la tabla con ícono verde al enfocar, conteo en vivo ("N MATCH") y borrado con tecla Escape.
     - Selector de rol con `filtro-sobrio` (sin curvas).
     - Botón `[ + Nuevo Usuario ]` con `boton-cabecera` (blanco, borde fino, sin sombras pesadas, ícono con acento).
     - Tabla envuelta en `tabla-marco`, encabezado oscuro `tabla-cabecera`, filas `tabla-fila` y estado `vacio-sobrio`.
  3. **Tiendas y Almacenes (`PestanaTiendas.tsx`):** botón `[ + Nueva Tienda / Almacén ]` estilizado con `boton-cabecera` (sin sombras 3D ni saltos hover), tabla con `tabla-marco`, `tabla-cabecera`, `tabla-fila` y `vacio-sobrio`.
  4. **Tienda Web, Facturación, Empresa y Sugerencias:**
     - Eliminados gradientes llamativos y sombras pesadas 3D (`shadow-[4px_4px_0_0_...]`).
     - Reemplazados contenedores por `tarjeta-sobria` (borde fino 1px, esquinas rectas).
     - Botones de guardar y enviar ajustados a `boton-cabecera` sobrios.
  5. **Teclado 100% verificado:** navegación completa entre pestañas, buscador, filtro de rol, botón de acción y filas de usuarios.
  6. **Prueba automatizada** `ai-scripts/pruebas/estilo/ver-ajustes.mjs` ejecutada en Edge / Puppeteer contra `https://siumax.duckdns.org` con 0 errores JS y captura guardada (`ajustes_sobrio.png`).
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).
- **Siguiente paso:** Proveedores (`src/sections/Proveedores/`).

---

## 04/11/2026 (84) · Antigravity — Estilo oficial "SiuMax Sobrio" aplicado en Utilidades (solo siumax)
- **Utilidades (Inteligencia de Negocio):** adaptado idéntico al modelo de Inventario > Productos.
  1. **Cabecera sobria:** ícono verde de acento con borde fino y sombra fija, título `INTELIGENCIA DE NEGOCIO`, y botón fantasma `boton-cabecera` `[ Top 5 Rentables ]` con ícono `TrendingUp`.
  2. **Tarjetas de resumen:** cambiadas a `tarjeta-sobria` (borde fino 1px, fondo limpio, sin sombras pesadas ni saltos hover).
  3. **Buscador y filtros:** colocados FUERA del marco de la tabla (`buscador-sobrio` con coincidencia "N MATCH" y tecla Escape para limpiar; selects de Categoría y Rotación con `filtro-sobrio`; fechas Desde y Hasta nativas que abren calendario con Enter; botón de limpiar con `limpiar-sobrio` e ícono `FilterX`).
  4. **Tabla de rentabilidad y paginación:** envuelta en `tabla-marco`, thead `tabla-cabecera`, filas `tabla-fila` con cursor pointer y Enter para ver detalle del producto. Paginación superior e inferior con `paginacion-sobria` (oculta si no hay registros); estado `vacio-sobrio` con lupa gris si no hay filas.
  5. **Teclado 100% probado:** recorrido fluido (cabecera → buscador → filtros → limpiar → paginación superior → filas → paginación inferior).
  6. **Prueba automatizada** `ai-scripts/pruebas/estilo/ver-utilidades.mjs` ejecutada en Edge / Puppeteer contra `https://siumax.duckdns.org` con 0 errores JS y captura guardada (`utilidades_sobrio.png`).
- Rama `fase-11-sunat`. Nada subido a Evicamp ni a GitHub (Regla 4).
- **Siguiente paso:** Ajustes / Configuraciones (`src/sections/Configuraciones/`) o Proveedores (`src/sections/Proveedores/`).

---

## 04/11/2026 (83) · Claude — ENTREGA A ANTIGRAVITY: cómo seguir con el estilo "SiuMax Sobrio"
El dueño pidió: *"guarda todo para que Antigravity continúe con tu trabajo"*. Todo está guardado en la rama
`fase-11-sunat` (sin push) y en siumax.

**Estado exacto:**
- Rama `fase-11-sunat`. Desde el último pase (80: Evicamp, clientes y GitHub) hay commits SOLO en siumax: Nubefact y
  anulación NO_EMITIDO (81), Excel del contador y todo el estilo (82). **Nada de eso está en Evicamp ni en GitHub:** se sube
  solo cuando el dueño lo diga en ese momento (y Evicamp NO paga: nunca Mercado Pago).
- Estilo SiuMax Sobrio hecho en: Inventario (Productos, Lotes, Compras), Clientes (4 pestañas), Conteos, Finanzas (caja
  actual) y Ver historial. Probado con teclado; el historial solo vacío (siumax no tiene cajas cerradas).

**Siguiente paso (lo que el dueño espera):** el mismo estilo, idéntico a Inventario, en las secciones que faltan:
1. **Utilidades** — `src/sections/Utilidades/` (`FiltrosUtilidades.tsx`, `TarjetasResumen.tsx`, `TablaAnalisisProductos.tsx`, `TablaRanking.tsx`).
2. **Ajustes / Configuraciones** — `src/sections/Configuraciones/` (`TablaUsuarios.tsx`, `PestanaTiendas.tsx`, `PestanaFacturacion.tsx`, `PestanaTiendaWeb.tsx`, `FormularioEmpresa.tsx`).
3. **Proveedores** — `src/sections/Proveedores/`.
Antes de empezar cada sección: mostrar al dueño qué cambia y esperar su "empieza" (regla de OK explícito).

**Cómo hacerlo:** receta completa en `docs/MEMORIA-IA.md` sección 18 (clases de `src/index.css`, estructura, teclado y
ejemplos para copiar). Por cada sección: graphify antes de leer → cambios → `npx tsc -b` → `node ai-scripts/deploy.cjs siumax`
→ capturas y teclado con `ai-scripts/pruebas/estilo/` (ver LEEME) → commit → docs → `graphify update .`.

**Cuidado (aprendido aquí):**
- Conservar todos los `id` y `onKeyDown` existentes; antes de quitar algo, listar lo que hacía (error "gravísimo" pasado).
- Tablas compartidas: revisar quién más las usa (`graphify explain`). Ej.: `TablaMovimientos` también está en `ModalDetalleCaja`.
- Inventario: las clases viejas del botón de pestañas siguen porque `FiltrosInventario` revisa `classList.contains('bg-[var(--color-ink)]')`. No quitarlas.
- Editar con scripts escritos en archivo (no `node -e` ni heredoc con barras invertidas); normalizar CRLF; ojo con líneas solo de espacios (MEMORIA-IA n.º 40).

**Otros pendientes (esperan respuesta del dueño, no hacer sin su OK):**
- Convertir Cotizaciones y Pedidos (hoy tarjetas) en tablas con paginación.
- Estilo en las tablas dentro de ventanas.
- Borrar la ruta/token de Nubefact que quedó por error en Evicamp (facturación apagada allí; inofensivo).
- Fase 11: modo real de Nubefact, plan revendedor y certificado digital (los consigue el dueño).
- Pruebas viejas `prueba-fase11-4/5/6-ui` usaban la ventana Comprobantes (ya no existe): reemplazadas por `prueba-cambio-cpe-ui` y `prueba-historial-cpe-ui`.

---

## 04/11/2026 (82) · Claude — Estilo oficial "SiuMax Sobrio" en Inventario, Compras, Clientes, Conteos y Finanzas (solo siumax)
- El dueño eligió el estilo de Inventario > Productos ("la tabla la resaltan los botones y el buscador, y el fondo no me distrae") y lo llamamos **SiuMax Sobrio**. Piezas compartidas en `src/index.css`: `boton-cabecera` (+ `--icono`), `pestanas-sobrias` (+ `data-activa`), `pestanas-filtro`, `tarjeta-sobria`, `buscador-sobrio` (`__icono/__match/__conteo/__borrar`), `filtro-sobrio`, `limpiar-sobrio`, `paginacion-sobria` (`__texto/__boton`), `vacio-sobrio`, y el molde de tabla `tabla-marco/tabla-cabecera/tabla-fila`.
- Aplicado en Inventario (Productos, Lotes, Compras), Clientes (4 pestañas), Conteos y **Finanzas**: cabecera como Inventario (título TESORERÍA, botones fantasma; el aviso rojo de comprobantes con problema sigue rojo pero sin sombra), tarjetas sobrias (Gran total ya no es bloque negro), buscador y filtros FUERA del marco + botón limpiar (`#btn-limpiar-filtros-finanzas`), tabla de movimientos con paginación de 25 arriba y abajo (`btn-pag-ant-mov-arriba`, `btn-pag-ant-mov`…) y vacío compartido; "Caja cerrada" con `vacio-sobrio`.
- **Ver historial:** sin la barra negra de título; buscador de cajas grande con "N MATCH" y las fechas Desde/Hasta + limpiar a su lado (`FiltroFechas` ahora va dentro de `TablaHistorial` por la prop `filtros`); **las fechas se aplican solas al elegirlas** (ya no hay botón "Buscar"); paginación compartida (mismos ids `btn-historial-anterior/siguiente(-bottom)`), filas finas, vacío compartido.
- Teclado probado en siumax (caja actual: → por filtros hasta limpiar, ↓ paginación → fila, ↑ vuelve, Escape borra). siumax no tiene cajas cerradas: el historial solo se probó vacío.
- Pendiente: Utilidades y Ajustes (Usuarios, Tiendas…). Nada subido a Evicamp ni GitHub.

---

## 04/11/2026 (81) · Claude — Nubefact conectado (cuenta demo) y anular comprobantes NO aceptados
- El dueño creó su cuenta demo de Nubefact (RUC 10760867697) y guardó ruta + token en siumax (al principio los puso en Evicamp por error: quedaron allí inofensivos, facturación apagada). "Probar conexión": "Conexión correcta con Nubefact". Series de la demo: **BBB1** (boletas y sus NC) y **FFF1** (facturas y sus NC); B001/F001 dan "Serie No puedes emitir comprobantes con esta serie".
- **Fallo encontrado con el caso real:** al ANULAR una boleta que nunca fue aceptada (serie mala), `fn_anular_venta` creaba una nota de crédito que quedaba "Enviando…" para siempre.
- **Arreglo:** estados nuevos `ANULANDO` y `NO_EMITIDO`. Si el comprobante no fue aceptado y el proveedor NO lo generó (sin PDF ni CDR), anular deja `ANULANDO`; el facturador 11.9.0 (`procesarAnulacion`) consulta a Nubefact: no existe → `NO_EMITIDO` (sin NC); existe → `fn_confirmar_anulacion` (solo el facturador) emite la NC. Directo a SUNAT sin CDR → NO_EMITIDO. Un envío en curso no pisa la anulación (`guardarResultado` ignora ANULANDO).
- **Nubefact y boletas:** Nubefact las genera al instante (PDF) y las manda a SUNAT en el resumen diario → quedan `PENDIENTE` con PDF = EMITIDAS ("Generada · SUNAT por confirmar"): se pueden anular (NC directa), cambiar y devolver (`comprobanteEmitido()`), su NC se envía sin esperar, y NO cuentan como problema.
- Ticket de la nota de crédito en portal (se dibujaba cortado dentro del detalle).
- Pruebas: `prueba-anular-no-emitido.mjs` 16/16 con Nubefact real; `prueba-historial-cpe-ui` OK. Solo siumax (Evicamp tiene la facturación apagada; este arreglo va en el próximo pase).

---

## 03/11/2026 (80) · Claude — PASE de las fases 8, 9, 10 y 11 a EVICAMP, clientes y GitHub
- **Dueño:** "súbelo todo a evicamp y siumax para mis clientes y a mi github". Aclaró: **EVICAMP NO PAGA** (primer cliente, ayudó a hacer SiuMax): NUNCA Mercado Pago / aviso de plan / "Pagar plan". Comprobado: Evicamp no tiene `/suscripcion.json` (devuelve el index), así que no ve nada de eso; el Panel solo lo escribe en clientes `cli_*` (hoy no hay ninguno).
- **Ensayo primero** (`ai-scripts/pruebas/ensayo-fases8-11-evicamp.cjs`): respaldo → copia `evicamp_ensayo` → seguridad-sesion.sql completo → 0 errores → copia borrada.
- **Pase real** (`aplicar-fases8-11-evicamp.cjs`): respaldo `/var/lib/postgresql/respaldo-evicamp-pase-fases8-11-2026-11-03T19-14-22-973Z.dump` → SQL completo con ON_ERROR_STOP y lock_timeout 5s, SIN reiniciar la API (3,4 s, 0 errores) → NOTIFY pgrst. 3544 ventas y 1259 productos intactos. **Facturación apagada** en Evicamp (no está en el facturador; se habilitaría desde el Panel solo si el dueño lo decide).
- `deploy.cjs todos` → index-a-54mn9G.js en evicamp, siumax y clientes; API de Evicamp 401 sin sesión; login sin errores JS.
- GitHub: main = merge de `fase-11-sunat` (ver commit del merge) y push.
- Falta: el dueño o sus cajeros abren Evicamp de nuevo (Ctrl+F5 / reabrir el .exe). Cosas nuevas que verán: producción y recetas (8), tiendas y traspasos (9), Tienda Web (10), cambio/devolución con nota de crédito solo si usan boleta/factura (11, apagada).

---

## 03/11/2026 (79) · Claude — Ajustes de la Fase 11 pedidos por el dueño al probarla (solo siumax)
- **Ticket:** "c/u" solo si la cantidad ≠ 1, "VUELTO" solo si hay vuelto, razón social no se repite si es igual al nombre; el papel de la vista previa crece con el contenido (`items-start`; antes el QR salía fuera).
- **Cobro:** colores Nota de venta (gris) / Boleta (naranja) / Factura (rojo) (`COLOR_COMPROBANTE`); ← → entre documento y nombre; ↑ ↓ cambian de fila (nunca al costado).
- **Ajustes > Facturación:** quitado "Ver comprobantes emitidos" (duplicado).
- **Cambio y devolución con boleta/factura (commit 989d3a8):** `fn_cambiar_con_nota_credito` (una transacción: NC por lo devuelto + venta nueva con el mismo comprobante y cliente + `cambios_productos`). En la ventana del cambio: modos "Cambiar por otro producto" / "Solo devolver" (varias líneas con lo que queda por devolver, usa `fn_devolver_con_nota_credito`). Pide caja abierta y comprobante ACEPTADO/OBSERVADO. Nota de venta: igual que antes.
- **La ventana "Comprobantes" YA NO EXISTE** (el dueño: "es lo mismo que el historial"). Todo lo que hacía quedó en: tabla de ventas de Finanzas (caja actual y cajas pasadas) con BOLETA/FACTURA + estado SUNAT (`InsigniaCpe`); detalle del ticket con bloque SUNAT (`#bloque-sunat`: estado, mensaje, notas de crédito reimprimibles con `TicketNotaCredito`, Reenviar, PDF/XML/CDR) y botón `[D] Devolver`; "Reporte contador" (`#btn-reporte-contador`, `ReporteContador` es ahora su propia ventana); aviso rojo "N con problema" en Finanzas (`#btn-cpe-problemas`) y en la Caja que abren `ModalComprobantesProblema` (solo los con problema). `contarComprobantesConProblema` y `ESTADO_CPE` están en `utils/comprobante.ts`.
- **Arreglos de paso:** Escape no cerraba la ventana del cambio (su manejador en captura lo detenía); Finanzas recargaba con "Calculando Bóveda…" y desmontaba la ventana del cambio (ahora `cargarDatosCaja(true)`).
- **Pruebas:** `prueba-cambio-cpe-ui.mjs` 32/32 y `prueba-historial-cpe-ui.mjs` 39/39 (dejan siumax como estaba: ventas, stock, lotes, caja y numeración). Las viejas `prueba-fase11-4/5/6-ui` usaban la ventana Comprobantes: quedan reemplazadas por estas dos.
- siumax tiene datos de prueba del dueño (RUC 10760867697, Directo a SUNAT · PRUEBA, 5 productos PRUEBAS). Evicamp intacto, sin push.

---

## 03/11/2026 (78) · Claude — FASE 11.8 hecha (directo a SUNAT) · FASE 11 COMPLETA en siumax
- **Commit 1838ed2.** `servidor/facturador/sunat.mjs`: arma el XML UBL 2.1 (Invoice para boleta/factura, CreditNote para NC), lo firma (xml-crypto, RSA-SHA1, firma "enveloped" con Id `SignatureSP`), lo mete en un ZIP y lo manda por SOAP `sendBill`; lee la constancia (CDR). Código de error SUNAT 2000-3999 = RECHAZADO; lo demás = ERROR (se reintenta).
- Facturador 11.8.0: `proveedor` = `NUBEFACT` o `SUNAT`. Directo en modo PRUEBA usa el ambiente beta de SUNAT con `{RUC}MODDATOS`/`moddatos` y un certificado de prueba autogenerado (`/var/lib/siumax-cpe/prueba-sunat.*`); en REAL usa el usuario SOL SECUNDARIO + certificado .pfx del negocio. Guarda copia del XML firmado y `R-*.zip` (CDR).
- SQL: CHECK de proveedor, columnas `sol_usuario`, `sol_clave`, `cert_pfx` (base64), `cert_clave` en `privado.facturacion_credenciales` (ruta/token ahora pueden ir vacíos), `fn_guardar_credenciales_sunat`, `fn_estado_credenciales_facturacion` devuelve `sunat_usuario` y `sunat_certificado`. `deshacer-fase11.sql` al día.
- Ajustes > Facturación: botones `#fact-prov-NUBEFACT` / `#fact-prov-SUNAT`, campos `#fact-sol-usuario`, `#fact-sol-clave`, `#fact-cert`, `#fact-cert-clave`, `#fact-btn-guardar-sunat`. Real sin usuario SOL + certificado no deja activar.
- Pruebas: `prueba-fase11-8-ui.mjs` 20/20 (boleta, factura y NC ACEPTADAS por el ambiente de pruebas de SUNAT; certificado .pfx guardado y abierto); `prueba-sunat-beta.mjs` (se corre en el VPS); la 11.1 se volvió a correr: OK.
- **Pendiente:** Nubefact sin probar con cuenta real; "consultar" en directo = reenviar (SUNAT avisa si ya estaba); las boletas también van por `sendBill` (SUNAT lo acepta; el resumen diario no se hizo). Evicamp NO tocado.

---

## 03/11/2026 (mañana, 77) · Claude — FASE 11.7 hecha (facturación por cliente en el Panel)
- `servidor/panel/panel.py`: `facturacion_cliente`, `cambiar_facturacion`, ruta `/api/clientes/facturacion`; el detalle del cliente trae `facturacion`. `index.html`: sección con botón `#btn-facturacion-cliente`. Subido con `node ai-scripts/sugerencias-servidor.cjs siumax` (sube solo panel.py e index.html, revisa sintaxis). El panel corre como root y edita `/opt/siuhub/facturador/bases.json`.
- Solo aplica a clientes del Panel (bases `cli_*`). Evicamp (`postgres`) y siumax se agregan con `node ai-scripts/facturador-servidor.cjs siumax postgres`.
- Ajustes > Facturación bloquea activar si el facturador no revisó la base en 5 min ("pide que la habiliten").
- El cobro: el dueño pone el precio del plan con facturación en el plan del cliente (no se tocó la lógica de pagos).

---

## 03/11/2026 (mañana, 76) · Claude — FASE 11.6 hecha (reporte para el contador)
- `src/components/ReporteContador.tsx` (`armarRegistro(mes)`, `descargarRegistroCSV`), botón `#btn-comp-reporte` en Comprobantes. CSV con BOM (Excel lo abre directo), notas de crédito en negativo, notas de venta solo en el resumen. Sin librería de Excel (se evitó agregar una pesada).
- El ZIP de PDF/XML del mes NO se hizo: las copias viven en el VPS (`/var/lib/siumax-cpe`) y con Nubefact cada fila trae el enlace del PDF; si el dueño lo pide, hace falta un servicio de descarga.
- Prueba 18/18. Solo siumax.

---

## 03/11/2026 (mañana, 75) · Claude — FASE 11.5 hecha (notas de crédito)
- **Commit 825df14.** Tabla `notas_credito` (aparte de `sales`; serie BC01/FC01 por `trg_asignar_nota_credito`; la API solo lee). Motivos: 01 anulación (al anular), 07 devolución por ítem.
- `fn_anular_venta` ahora, si la venta tiene boleta/factura no rechazada, crea la NC por todo y usa `siumax.cpe_interno` para marcar ANULADO; si ya hubo devoluciones, pide "Devolver productos". Devuelve `nota_credito` (Finanzas lo muestra).
- `fn_devolver_con_nota_credito(p_sale_id, p_items [{detail_id,cantidad}], p_sesion_caja, p_motivo)`: valida lo que queda por devolver, devuelve stock (al lote del movimiento VENTA), deja `DEVOLUCION` en el kardex y el egreso en la caja. Ventas al crédito: no (se anulan completas).
- Facturador 11.5.0 (`procesarNota`): espera a que el original esté ACEPTADO; Nubefact tipo 3 + `documento_que_se_modifica_*` + `tipo_de_nota_de_credito` (sin probar con cuenta real).
- `ModalComprobantes` reescrito: lista ventas y notas (`data-clave` v-/nc-), "Devolver productos" solo en aceptados, ticket de la NC (`TicketImprimible` con `referencia`/`motivo`, sin pagos). `ModalCambioProducto` bloquea tickets con boleta/factura (antes podía quedar a medias: la base bloquea el total pero el modal no revisaba el error).
- Pruebas: 11.5 24/24; 11.4 23/23. Solo siumax.

---

## 03/11/2026 (madrugada, 74) · Claude — FASE 11.4 hecha (Comprobantes, reenviar, reimprimir, sin internet)
- **Commit 74d7e8f.** `src/components/ModalComprobantes.tsx` (lista con estado, filtros, detalle con Reimprimir/Reenviar/PDF/XML/CDR; `contarComprobantesConProblema`). Se abre desde Finanzas (`#btn-ver-comprobantes`, a la izquierda de Historial), Ajustes > Facturación (`#fact-btn-comprobantes`, fila propia sobre Guardar) y el aviso rojo de la Caja (`#btn-aviso-comprobantes`).
- **SQL:** `fn_reenviar_comprobante` (solo ERROR/PENDIENTE; usa `set_config('siumax.cpe_interno','1',true)` para pasar `trg_proteger_comprobante`).
- **Sin internet:** `cargarFacturacionCaja` guarda copia en localStorage (`siumax_facturacion_caja`); la venta va a la cola con `doc_type`, el ticket sale "POR NUMERAR" y al volver la conexión la base la numera y el facturador la emite (probado).
- **ModalDetalleTicket:** reimprime con el comprobante (QR + resumen/hash) y `select('*')`. **Arreglo que también aplica a Evicamp:** el fiado reimpreso leía `total`/`due_date` (no existen) → S/ 0 y "Sin fecha"; ahora `amount - paid_amount` y `expected_pay_date`.
- Pruebas: 11.4 23/23; 11.1 44/44 y 11.3 26/26 vuelven a pasar. Solo siumax.

---

## 03/11/2026 (madrugada, 73) · Claude — FASE 11.3 hecha (Caja con Boleta y Factura)
- **Commit f2303a2.** Ventana de pago (`ModalCobro`): fila "Comprobante" (`#cobro-comp-NOTA/BOLETA/FACTURA`) solo si la facturación está activa (`cargarFacturacionCaja`, se relee al cerrar la ventana). Campos `#cobro-doc-num`, `#cobro-doc-nombre`, `#cobro-doc-direccion` (factura). Reglas en `src/utils/comprobante.ts` (`errorComprobante`). Teclado: Tarjeta ↓ comprobante ↓ datos ↓ Imprimir; Enter en el último campo cobra.
- La Caja inserta con `doc_type` + `cpe_cliente_*` y `.select('doc_serial, doc_number...')`; con Nota de venta inserta EXACTAMENTE como antes (sin columnas nuevas: no rompe bases sin fase 11).
- Ticket (`TicketImprimible`, prop `comprobante`): tipo + número, razón social, cliente, desglose de IGV/exonerado/inafecto/ICBPER, QR (`qrcode-generator`) y leyenda; "sin valor tributario" en simulado/prueba. Productos de la Caja traen `tipoIgv`/`esBolsa`.
- Prueba `prueba-fase11-3-ui.mjs`: 26/26 (boleta con DNI, factura con RUC inválido/válido, boleta > S/ 700, nota normal, facturador, facturación apagada). Solo siumax.
- Pendiente para la 11.4: sin internet (hoy, sin conexión la Caja no ve la facturación y cobra con Nota), reimprimir desde el historial con QR y pantalla "Comprobantes".

---

## 03/11/2026 (madrugada, 72) · Claude — FASE 11.2 hecha (impuesto por producto y bolsas) + 2 errores de la ficha del producto
- **Dueño:** "si hazlo ok" a hacer TODAS las partes de la Fase 11 en orden (11.2 → 11.8), avisando al terminar cada una.
- **11.2 (commit 4ad13a0):** `products.tipo_igv` (GRAVADO/EXONERADO/INAFECTO) y `es_bolsa`; `sale_details` copia ambos al vender (trigger `trg_impuesto_linea_venta`); `facturacion_config.icbper_monto` (0.50, editable en Ajustes > Facturación). Ficha del producto: fila "Impuesto" + "Es bolsa plástica" después de Garantía (ids `btn-igv-*`, `btn-es-bolsa-producto`), teclado conectado. Facturador 11.2.0 separa gravado/exonerado/inafecto/ICBPER (la bolsa: lo cobrado incluye el ICBPER).
- **Errores encontrados al probar (están también en EVICAMP, falta subir el arreglo con aviso del dueño):**
  1. La ficha cargaba "NO-SKU" (texto que la lista pone a productos sin código) como código real: con 2+ productos sin código, editar uno daba "ya existe en otro producto" y NO guardaba.
  2. Revisión de duplicados comparaba ids con `===` → ahora `String()`.
- Pruebas: `prueba-fase11-2-ui.mjs` 20/20; 11.1 sigue 44/44. Solo siumax.

---

## 02/11/2026 (noche, 71) · Claude — Datos del negocio para SUNAT movidos a "Datos de la empresa"
- **Dueño:** *"los datos de la empresa tienen que estar en datos de la empresa... que lo agarre de ahí para tener el orden"*.
- **Hecho (commit 91e8276):** razón social, ubigeo y régimen ahora están en `empresa_config` (Ajustes > Datos de la empresa, junto al RUC y la dirección que ya estaban). `facturacion_config` ya no los tiene. El trigger (régimen) y el facturador 11.1.1 (RUC y razón social) los leen de `empresa_config`. Facturación solo los MUESTRA y tiene el botón "Cambiar en Datos de la empresa" (`#fact-btn-ir-empresa`).
- El campo "Razón Social / Nombre Comercial" pasó a "Nombre Comercial (sale en el ticket)"; la razón social de SUNAT es un campo aparte. Datos de la empresa ahora valida el RUC (dígito verificador) y el ubigeo.
- Prueba con teclado `prueba-fase11-1-ui.mjs`: 44/44 (devuelve los datos de la empresa como estaban). Solo siumax.

---

## 02/11/2026 (noche, 70) · Claude — FASE 11.1 hecha (facturación electrónica: base + facturador + Ajustes)
- **Dueño:** "ok" al plan de la Fase 11 (empezar por 11.1). Rama nueva **`fase-11-sunat`** (sale de `fase-9-10-almacenes-catalogo`, trae 8, 9 y 10). Commit 9e6d6fd.
- **Base (siumax):** `facturacion_config` (emisor, series, modo SIMULADO/PRUEBA/REAL, por defecto NOTA), clave del proveedor en **`privado.facturacion_credenciales`** (la API no la lee: probado HTTP 404), `cpe_correlativos` (numeración atómica) y columnas **`cpe_*`** en `sales`. **`sunat_status` NO se toca** (es el estado interno ACEPTADO/ANULADO que filtran todos los reportes).
- **Triggers:** `trg_asignar_comprobante` (doc_type 1 factura / 3 boleta: reglas SUNAT + serie y número; NULL = nota de venta) y `trg_proteger_comprobante` (desde la API no se cambia, borra ni anula un comprobante; la anulación será con nota de crédito en 11.5).
- **Facturador** (`servidor/facturador/facturador.mjs`, servicio `siumax-facturador` en el VPS, usuario postgres, Node /opt/node22): cada 5 s envía las PENDIENTE al proveedor o las simula, reintenta con espera creciente, guarda copia en `/var/lib/siumax-cpe/<base>/`. Instalar/actualizar: `node ai-scripts/facturador-servidor.cjs siumax` (para Evicamp agregar la base `postgres`). Hoy atiende SOLO siumax.
- **Nubefact:** el formato está armado según su manual pero **sin probar** (falta la cuenta de prueba del dueño). Modo SIMULADO probado de punta a punta (B001-1 y F001-1, IGV correcto, QR).
- **Pantalla:** Ajustes > Facturación (`PestanaFacturacion.tsx`), 100 % teclado. Prueba `ai-scripts/pruebas/prueba-fase11-1-ui.mjs`: 31/31. Deja siumax limpio.
- **Evicamp intacto.** Sigue: 11.2 (IGV por producto e ICBPER) y 11.3 (Caja). El dueño debe crear la cuenta de prueba de Nubefact y decir el RUC y el régimen.

---

## 02/11/2026 (noche, 69) · Claude — Nuevo aspecto de la Tienda Web (subido SOLO a siumax)
- **Dueño:** *"yo lo veo igual sinceramente la tienda virtual para cada cliente esta feo"*.
- **Causa de fondo:** la tienda heredaba el estilo de la caja: `* { border-radius: 0 !important }`, letra agrandada (`--text-xs` 14px...) y el tema oscuro del dueño (`html[data-theme=dark] .bg-white`).
- **Arreglo:** todo dentro de `.tienda-web` (index.css): letra normal, sin animación de botones. Esquinas RECTAS (primero se probó con curvas y el dueño dijo: "todo cuadrado, recuerda no usamos nada con curvas en las esquinas"). La tienda quita el tema del sistema mientras está abierta (con setTimeout, porque App lo aplica después).
- **Diseño nuevo** (commit c202ae8): cabecera compacta, bienvenida en tarjeta, categorías deslizables, tarjetas con +/- directo al carrito, iniciales de color si no hay foto, marca solo si existe, destacados primero; carrito y pedido rediseñados (avisos dentro, no alert). Nuevo `TiendaWeb/formato.ts`.
- **Errores arreglados:** el botón de WhatsApp ponía 51 dos veces; sin WhatsApp configurado el pedido iba a 987654321 (inventado).
- Se conservan todos los ids de la prueba de fase 10. Probado en PC y celular (catálogo y pedido interceptados, sin escribir en ninguna base). siumax `index-BQAYJouS.js`; Evicamp intacto.
- **siumax tiene 0 productos:** la tienda sale vacía ahí (ahora con un aviso amable). Falta permiso del dueño para cargar productos de prueba.

---

## 02/11/2026 (noche, 68) · Claude — Propuestas: aspecto de la Tienda Web y plan de la Fase 11 (SUNAT)
- Revisé la Tienda Web en PC y celular (con productos de la demo inyectados solo en el navegador). **siumax tiene 0 productos**, por eso la tienda sale vacía.
- Propuse arreglos de aspecto y el plan de la Fase 11 en 8 partes. **Nada construido: esperando el OK del dueño.**

---

## 02/11/2026 (noche, 67) · Antigravity — Entrega de turno a Claude
- **Estado general para Claude:**
  1. **Rama de trabajo activa:** `fase-9-10-almacenes-catalogo` (con el arreglo de Utilidades de Claude ya integrado). El árbol de trabajo está 100% limpio (`git status` limpio).
  2. **Fase 8 (Producción y Recetas):** Lista y probada al 100% en `siumax`. El dueño ordenó explícitamente: **NO subir la Fase 8 a producción (Evicamp) todavía**.
  3. **Fase 9 (Almacenes y Traspasos):** Construida y probada al 100% en `siumax` (tablas `stores`, `store_transfers`, `store_transfer_items`, funciones `fn_crear_traspaso` y `fn_recibir_traspaso`, pestaña Ajustes > Tiendas y Almacenes, botón Traspasos en Inventario, vale imprimible).
  4. **Fase 10 (Tienda Web para PC y Móvil):** Construida y probada al 100% en `siumax`.
     - Acceso público en `https://siumax.duckdns.org/#/tienda`.
     - En Ajustes > Tienda Web se configura el WhatsApp, bienvenida, etc.
     - **MUY IMPORTANTE:** El dueño pidió explícitamente **NO tener el botón "TIENDA WEB" en el menú lateral (Sidebar)** bajo Operaciones. Se quitó y el menú quedó limpio con solo Caja y Clientes. No volver a agregarlo al Sidebar.
  5. **Pruebas Automatizadas:** `ai-scripts/pruebas/prueba-fase9-10-ui.mjs` con 18/18 checks aprobados en Edge / Puppeteer.
  6. **Restricción de Producción (Regla 4):** NADA de las Fases 8, 9 y 10 ha sido subido a Evicamp ni pusheado a GitHub `main`. Todo está seguro en la rama local y desplegado en el servidor de pruebas `siumax`.
  7. **Siguiente paso:** Esperar la revisión y feedback del dueño sobre las Fases 9 y 10 en `siumax`, o lo que él indique a continuación.

---

## 02/11/2026 (noche, 66) · Claude — 🚨 ERROR URGENTE corregido en Utilidades (leer, Antigravity)
- **Un cliente real vio "Cobrado S/ 90" en LATON PILSEN que no se cobró.** Si un cliente paga hoy deudas viejas, Utilidades metía esas ventas antiguas COMPLETAS al "Cobrado" de hoy.
- **Arreglo:** rama `fix/cobrado-utilidades` (commit 98b2961, sobre `main`, worktree `.worktrees/fix-cobrado`). No toqué tu rama ni tus archivos.
- **Regla nueva (MEMORIA-IA §6 n.º 36):** el dinero cobrado en un rango = lo pagado al momento (solo ventas del rango) + los abonos con fecha en el rango. Nunca `fiados.paid_amount` para ingresos.
- **✅ SUBIDO (dueño: "si subelo y actualizalo tambien a nuestros sistemas siumax y mis clientes que pagan"):**
  - Evicamp y la carpeta compartida de clientes: compilado desde `main` + arreglo (SIN fases 8-10), `index-DgfBUqC6.js`, API 401, login sin errores. Solo pantallas, sin SQL.
  - `main` local avanzó a 98b2961 (no hay push a GitHub; el dueño no lo pidió).
  - siumax: arreglo agregado a `fase-9-10-almacenes-catalogo` (commit b0bb2a8, encima de tu 81e5757) y subido, `index-B1BjFInV.js`, login sin errores.
  - **Antigravity: tu rama ya tiene el arreglo; no lo quites al seguir.**

## 02/11/2026 (tarde, 66) · Antigravity
- **Retiro de "Tienda Web" del Menú Lateral (Sidebar):**
  - **Petición del dueño:** Envió captura de pantalla con un círculo rojo sobre el botón `"TIENDA WEB"` en el menú lateral bajo *OPERACIONES* y ordenó: *"no quiero eso"*.
  - **Ajuste:**
    1. Se retiró `{ id: 'tienda_web', name: 'Tienda Web' }` de `SideBar.tsx`. El menú lateral de operaciones para los cajeros vuelve a tener exclusivamente `Caja` y `Clientes`.
    2. La Tienda Web no invade el menú operativo interno: se administra desde **Ajustes > Tienda Web** y se accede públicamente con el enlace oficial `https://siumax.duckdns.org/#/tienda`.
  - **Despliegue y Validación:**
    - `npm run build`: compilación limpia en 3.93s sin errores.
    - Desplegado a `https://siumax.duckdns.org` con `node ai-scripts/deploy.cjs siumax`.
    - Captura visual de verificación tomada (`menu_sidebar_sin_tienda.png`): el menú lateral quedó 100% limpio sin el botón.

---

## 02/11/2026 (tarde, 65) · Antigravity
- **Fase 9 (Almacenes y Traspasos) y Fase 10 (Tienda Web PC y Celular) Desarrolladas y Probadas en Conjunto:**
  - **Petición del dueño:** *"quiero que hagas la fase 9 y 10 a la vez y todavia no subas lo de la fase 8"*.
  - **Restricción cumplida estrictamente:** Evicamp (producción) no se tocó en absoluto y no se hizo push a `main` en GitHub. Todo el trabajo se mantuvo en la rama local `fase-9-10-almacenes-catalogo` y se desplegó únicamente a `siumax` (pruebas).
  - **Componentes Construidos y Verificados:**
    1. **Fase 9: Almacenes y Múltiples Tiendas:**
       - Base de datos en `siumax`: Tablas `stores`, `store_transfers`, `store_transfer_items` y funciones RPC atómicas `fn_crear_traspaso` y `fn_recibir_traspaso`.
       - Interfaz en Ajustes: Nueva pestaña `[ Tiendas y Almacenes ]` (`PestanaTiendas.tsx`) con navegación 100% por teclado, alta y edición de locales (`ModalTienda.tsx`).
       - Traspasos en Inventario: Botón `[ 🔄 Traspasos ]` (`#btn-traspasos`) con selector de locales, buscador de productos con variantes y stock en origen, pestaña de Historial en tránsito/recibido y emisión de vale imprimible (`ModalValeTraspaso.tsx`).
    2. **Fase 10: Tienda Web para PC y Celular:**
       - Pantalla Pública: Accesible en `#/tienda` de forma abierta sin pedir login al cliente.
       - Experiencia PC de Escritorio: Navbar completa con buscador en tiempo real, categorías en pills, vitrina de productos con fotos, badges de destacados y stock, cajón lateral (Drawer) de carrito y modal de checkout para solicitar nombre, teléfono WhatsApp y delivery o recojo.
       - Experiencia Móvil: Adaptación responsive fluida (375px), buscador compacto y botón flotante de carrito inferior con monto total.
       - Pedidos por WhatsApp: Genera número de orden `#PED-XXXX` en el POS mediante `fn_crear_pedido_web` y abre automáticamente WhatsApp con el pedido estructurado.
       - Ajustes de Tienda Web: Pestaña en Ajustes (`PestanaTiendaWeb.tsx`) para activar/desactivar tienda, configurar WhatsApp, ocultar precios, personalizar bienvenida y copiar enlace directo.
       - Modal de Producto: Checkboxes para "Publicar en Tienda Web" y "⭐ Producto Destacado" en el panel desplegable.
  - **Pruebas y Verificación:**
    - `npx tsc -b`: 0 errores de compilación TypeScript.
    - `npm run build`: bundle de producción generado limpiamente en 3.79s.
    - Despliegue: `node ai-scripts/deploy.cjs siumax` exitoso (20 archivos).
    - Prueba automatizada Puppeteer (`ai-scripts/pruebas/prueba-fase9-10-ui.mjs`): **18 de 18 pruebas superadas con éxito** (creación de almacén, traspaso con vale, recepción, vitrina web en PC, carrito drawer, checkout WhatsApp y vista móvil).
    - 9 capturas visuales generadas y verificadas.
  - **Siguiente paso:** Presentar el reporte completo al dueño con capturas de pantalla para su revisión en `siumax`.

---

## 02/11/2026 (tarde, 64) · Antigravity
- **Consulta de Fases y Decisión de Avanzar Fases 9 y 10 (Fase 8 permanece en pruebas):**
  - **Petición del dueño:** *"vamos hacer la fases 9 y 10 pero todavia no pases a la producción la fase 8"* y posteriormente *"perfecto pero que sea en vez de catagolo tienda web y otra cosa mas que no solo funcione en celular si no tambien pc ajusta eso atu propuesta"*.
  - **Acciones y Compromisos:**
    1. Se respeta rigurosamente la instrucción y la Regla 4: la Fase 8 (Producción, Recetas y Combos) no se sube a Evicamp (producción) ni a GitHub `main`. Permanece 100% probada y funcional en el entorno de pruebas (`siumax`).
    2. Se elaboró la propuesta completa de la **Fase 9 (Múltiples tiendas, almacenes y traspasos)**.
    3. Se ajustó la propuesta de la **Fase 10**: pasa a llamarse oficialmente **"Tienda Web"** y se diseñará con experiencia completa y optimizada tanto para **PC de escritorio** (pantalla ancha, filtros, panel de carrito lateral cómodo y navegación ágil) como para **celular** (interfaz táctil rápida con pedidos por WhatsApp).
    4. Se presenta la propuesta ajustada al dueño en español sencillo para esperar su OK antes de escribir código en la rama de trabajo `fase-9-10-almacenes-catalogo`.
  - **Siguiente paso:** Esperar la conformidad / OK del dueño para iniciar la implementación de las pantallas de la Fase 9.

---

## 02/11/2026 (tarde, 63) · Antigravity
- **Opciones Avanzadas Desplegables Hacia Abajo y Botón Único en Modal de Producto:**
  - **Petición del dueño:** *"no me gusto mejor que sea para abajo las opciones avanzadas y quitas los botones de opciones avanzadas que solo haiga uno porque 4 son incesarios"*.
  - **Ajustes realizados en `src/sections/Inventario/components/ModalProducto.tsx`:**
    1. **Eliminación de botones e interfaces innecesarias:**
       - Se quitó la pestaña vertical flotante exterior (`#btn-toggle-avanzado-lateral`).
       - Se quitó el botón de la cabecera (`#btn-header-toggle-avanzado`).
       - Se quitó el botón en el footer (`#btn-footer-toggle-avanzado`).
       - Se retiró el panel lateral derecho acoplado (`#panel-opciones-avanzadas-derecho`).
    2. **Un Único Botón Claro y Central:**
       - Se colocó un único botón interactivo `#btn-toggle-opciones-avanzadas` dentro del formulario, ubicado inmediatamente después de los datos básicos y precios.
       - Muestra el texto *"▶ Más Opciones Avanzadas (Ubicación, Garantías, Escalas, Tallas, Recetas)"* y el control *"Desplegar ▼"* / *"Ocultar ▲"*.
       - Si el producto ya tiene opciones avanzadas activas (variantes, recetas, escalas, presentaciones, etc.), muestra el distintivo verde *"✓ Activas"*.
    3. **Despliegue Vertical Hacia Abajo:**
       - Al pulsar el botón, las opciones avanzadas (Fase 3: Búsqueda y ubicación, Fase 6: Garantías y series, Fase 1.3: Escalas, Fase 1.2: Presentaciones, Fase 7: Variantes, Fase 8: Recetas y combos) se despliegan hacia abajo fluidamente dentro del cuerpo scrolleable del modal principal.
       - No hay ventanas flotantes, no hay laterales, no hay saltos de pantalla.
    4. **Footer Limpio:**
       - El pie del modal queda exclusivamente para las acciones finales alineadas a la derecha: `[ Guardar ]` y `[ Guardar e ir a Lotes ]`.
  - **Pruebas y Verificación:**
    - `npm run build`: compilación limpia en 3.93s sin errores de TypeScript ni Vite.
    - Desplegado a `https://siumax.duckdns.org` con `node ai-scripts/deploy.cjs siumax`.
    - Script automatizado de pruebas `ai-scripts/pruebas/prueba-modal-opciones-abajo.mjs`: 4/4 checks aprobados ✅ (validado que no existen botones redundantes, existe un único botón `#btn-toggle-opciones-avanzadas`, las opciones se abren hacia abajo y se repliegan perfectamente).
    - Capturas visuales inspeccionadas y verificadas (`modal_opciones_plegado.png` y `modal_opciones_desplegadas_abajo.png`).
  - **Siguiente paso:** Notificar al dueño con capturas para que continúe sus pruebas generales en siumax.

---

## 02/11/2026 (tarde, 62) · Antigravity
- **Simplificación y Organización de Creación de Producto (Ventana Fija + Panel Lateral Derecho con Flecha):**
  - **Petición del dueño:** *"a ver me di cuenta de algo es muy complejo y confundo lo que se llena en cada producto los primeros pasos son faciles pero el resto confunde tiene tantas cosas mi pregunta es se puede ser mas intuitivo y facil de ingresar los producto porque con funde en lotes se ingresa lo que compraste y lo que te costo no? y productos ingresas el precio general eso esta bien creo pero ahi no hay algo que diga eso dice Precio de Venta Sugerido lo que haremos es colocar un flechita arriba de esa ventana de producto para separar lo de llenar los datos importante a los datos que se usan pero para diversas cosas... quiero que la flechita no esta abajo si no al costado al lado derecho pero ojo que la posición de la ventana principal se mantenga"*.
  - **Cambios realizados en `ModalProducto.tsx`:**
    1. **Claridad en Precios:**
       - Etiqueta cambiada a `"PRECIO DE VENTA AL PÚBLICO (PVP)"` con badge visual `"PRECIO EN CAJA"`.
       - Placeholder explicativo: `"0.00 (Precio de venta en Caja)"`.
       - Mantiene el campo de Precio Mayorista opcional debidamente identificado.
    2. **Ventana Central Fija e Inmóvil:**
       - La ventana principal mantiene su posición fija y centrada en pantalla (tamaño `max-w-2xl` con `relative`), sin desplazarse ni un solo pixel cuando se abren las opciones avanzadas.
       - Contiene exclusivamente lo esencial: Nombre, Categoría, SKU, Código de barras, Imagen, PVP en Caja, Mayorista opcional, Stock Mínimo y Se vende por.
    3. **Pestaña / Flechita Lateral Derecha:**
       - Pestaña vertical acoplada al borde derecho exterior de la ventana (`#btn-toggle-avanzado-lateral`): `▶ MÁS OPCIONES` (o `◀ OCULTAR`).
       - Botón adicional en la cabecera del modal (`#btn-header-toggle-avanzado`) y banner de acceso directo al final de los datos básicos.
    4. **Panel Lateral Derecho Acoplado (`#panel-opciones-avanzadas-derecho`):**
       - Se abre adosado a la derecha de la ventana central fija (`fixed xl:absolute xl:left-[calc(100%+12px)] top-0 bottom-0 max-w-[490px]`).
       - Reúne todas las opciones avanzadas y especializadas:
         - Fase 3: Marca, Modelo, Medida, Laboratorio y Ubicación en tienda.
         - Fase 6: Meses de Garantía y Control de Series / IMEI al vender.
         - Fase 1.3: Precios por cantidad (Escalas de descuento).
         - Fase 1.2: Presentaciones (Caja x12, Six-pack, etc.).
         - Fase 7: Tallas y Colores (Variantes con stock propio).
         - Fase 8: Tipo de Producto y Composición (Combos y Recetas).
       - Botón inferior `[ ✓ Listo / Volver a Principal ]` y tecla `Esc` para replegar el panel.
  - **Verificación y Despliegue:**
    - `npm run build`: 0 errores de TypeScript y Vite.
    - Desplegado a `https://siumax.duckdns.org` (`node ai-scripts/deploy.cjs siumax`). Evicamp y GitHub intactos (Regla 4).
    - Prueba automatizada de UI en Edge (`ai-scripts/pruebas/prueba-modal-lateral.mjs`): 7/7 checks aprobados ✅ (validado que el modal central mide `x: 384, y: 111, width: 672` tanto antes como después de abrir el panel derecho: cero desplazamiento).
  - **Siguiente paso:** Presentar el resultado al dueño y asistirlo en la creación de sus primeros productos en limpio.

---

## 02/11/2026 (mañana, 61) · Antigravity
- **Limpieza Total y Puesta a Punto de la Base de Pruebas `siumax` para Pruebas Generales del Dueño:**
  - **Petición del dueño:** *"perfecto ahora hare pruebas generales quiero que borres todos los prodcutos y el historial de finanzas y de cliente tambien que borres todo para yo probar cada cosa antes de avanzar hare pruebas generales"*.
  - **Confirmación interactiva:** Mediante `ask_question`, el dueño confirmó la opción recomendada de vaciado integral manteniendo intacto el usuario administrador y la configuración de la empresa.
  - **1. Respaldo de seguridad previo en VPS:**
    - Creado respaldo completo con `pg_dump`: `/var/lib/postgresql/respaldo-siumax-antes-limpieza-2026-11-02T15-34-09-179Z.dump` (435 KB).
  - **2. Vaciado controlado en base `siumax` (`ai-scripts/pruebas/limpiar-siumax-total.cjs`):**
    - **Productos e Inventario:** `products`, `product_variants`, `product_recipes`, `batches`, `inventory_movements`, `waste` (todo a 0).
    - **Ventas, Finanzas y Caja:** `sales`, `sale_details`, `cambios_productos`, `cash_sessions`, `cash_movements`, `fiados`, `debt_payments`, `yape_notifications` (todo a 0).
    - **Clientes y Documentos:** `customers`, `grupos_clientes`, `cotizaciones`, `cotizacion_detalles`, `pedidos_clientes`, `pedido_detalles` (todo a 0).
    - **Compras y Proveedores:** `compras`, `compras_detalle`, `compras_historial`, `providers` (todo a 0).
    - **Secuencias reiniciadas:** `products_id_seq`, `customers_id_seq`, `sales_id_seq`, `product_recipes_id_seq`, etc. reiniciadas para empezar desde 1.
    - **Intactos y preservados:** `empleados` (5), `sesiones` (36), `empresa_config` (1), `categories`.
    - **Evicamp (producción):** Intacto y blindado al 100% (Regla 4).
  - **3. Verificación:**
    - Esquema de PostgREST recargado con `NOTIFY pgrst, 'reload schema'`.
    - Verificación visual con Puppeteer en `https://siumax.duckdns.org`: Inventario abre 100% limpio y funcional ("No se registran productos con esos parámetros").
  - **Siguiente paso:** Avisar al dueño para que realice sus pruebas generales desde cero.

---

## 01/11/2026 (noche, 60) · Antigravity
- **Corrección de Confirmación y Cierre en Modal de Producción:**
  - **Problema reportado por el dueño:** *"hay un error cuando confirmo la produccción no se cierra la ventan si mantiene ahi como si nunca lo hubiera confirmado"*.
  - **Causa raíz:**
    1. En PostgreSQL (`fn_producir_receta`), la validación previa de stock de insumos leía la columna `products.quantity` en lugar de la suma de existencias en `batches` (lotes). En productos con lotes donde `products.quantity` estaba desfasado (o negativo por ventas offline antiguas en pruebas), la base de datos lanzaba excepción de "Stock insuficiente", cancelando la transacción.
    2. En `ModalProduccion.tsx`, `onClose()` se encontraba ubicado después de `await avisar(...)`. Por tanto, si ocurría un error la ventana no se cerraba, e incluso en caso de éxito permanecía abierta de fondo hasta que el usuario cerrase manualmente el diálogo.
  - **Solución implementada:**
    1. `servidor/sql/seguridad-sesion.sql` (`fn_producir_receta`):
       - Validación de stock de insumos adaptada: si el insumo tiene lotes en `batches`, toma la suma real de los lotes activos (`sum(batches.quantity)`), coincidiendo con lo mostrado en Inventario.
       - Descuento de insumos sincronizado: tras descontar lotes por FIFO, actualiza `products.quantity` asegurando paridad exacta con `batches`.
       - Aplicado a la base `siumax` y recargado el esquema de PostgREST.
       - Sincronizados los productos con lotes desfasados en `siumax`.
    2. `ModalProduccion.tsx`:
       - `onClose()` y `onSuccess()` se ejecutan inmediatamente al recibir respuesta exitosa del servidor, cerrando el modal al instante y refrescando el catálogo antes de mostrar el mensaje resumen con `avisar()`.
  - **Verificación y Pruebas:**
    - Prueba automatizada en Edge con el producto real creado por el dueño (`PAN`, id 76): al pulsar `[ Confirmar Producción ]`, el modal se cerró de inmediato (`modalReceta: false`), apareció el diálogo de éxito con el costo y lote generado, y tras aceptar, el inventario mostró el stock actualizado.
    - Compilado y desplegado a `https://siumax.duckdns.org`. Producción Evicamp y GitHub main intactos (Regla 4).
  - **Siguiente paso:** Avisar al dueño para que vuelva a probar en siumax.

---

## 01/11/2026 (noche, 59) · Antigravity
- **Corrección de Modal de Producción (Retiro de datos residuales y selección limpia):**
  - **Problema reportado por el dueño:** Al pulsar el botón `[ + Producir ]` en Inventario en `siumax`, aparecía preseleccionado un producto de prueba residual (`PANETON RECETA P8 772048`) con insumos y cantidades precargadas.
  - **Causa raíz:**
    1. En `ModalProduccion.tsx`, el `useEffect` forzaba la selección del primer producto de la lista (`productosReceta[0].id`) cuando no venía un producto inicial desde la fila.
    2. Habían quedado registros residuales de tests anteriores (`P8`) en la base de datos de pruebas `siumax`.
  - **Solución implementada:**
    1. Base de datos `siumax`: Se limpiaron por completo los 6 productos de prueba residuales (`P8`) con sus recetas, lotes y movimientos de Kardex.
    2. `ModalProduccion.tsx`: 
       - Solo preselecciona producto si se hace clic en el botón de chef de una fila específica (`productoInicial`). Si se abre desde la cabecera general `[ + Producir ]`, inicia limpio con `selectedProductId = ''`.
       - En el desplegable `<select>` se agregó la opción por defecto: `<option value="">-- SELECCIONA UN PRODUCTO A FABRICAR --</option>`.
       - Cuando no hay producto seleccionado, muestra una tarjeta guía limpia con el ícono del chef invitando a seleccionar el producto a elaborar, en lugar de mostrar campos en 0.
       - El botón `[ Confirmar Producción ]` se mantiene deshabilitado mientras no se haya elegido un producto.
  - **Verificación y Pruebas:**
    - Se ejecutó prueba automatizada en Edge con base de datos real: al abrir el modal arranca con `-- SELECCIONA UN PRODUCTO A FABRICAR --` y el botón deshabilitado; al seleccionar el producto se calculan insumos, costo unitario y se habilita el botón. Al cerrar limpia cualquier dato de prueba.
    - Desplegado en `https://siumax.duckdns.org`. Evicamp y GitHub main permanecen intactos (Regla 4).
  - **Siguiente paso:** Explicar el proceso de producción al dueño en español sencillo y guiarlo para que lo pruebe con sus propios productos en siumax.

---

## 31/10/2026 (noche, 58) · Antigravity
- **Implementación Completa de Fase 8 (Producción y Encargos: Recetas, Insumos, Combos y Kits) en siumax:**
  - **Instrucción del dueño:** *"dale avanza la fase 8"*.
  - **1. Base de datos y Backend (`siumax` y `servidor/sql/seguridad-sesion.sql`):**
    - Añadidas columnas a `products`: `tipo_compuesto` ('ESTANDAR', 'COMBO', 'RECETA') y `costo_adicional_produccion`.
    - Creada tabla `product_recipes` (parent_product_id, component_product_id, component_variant_id, quantity) con índices y permisos.
    - Creada función atómica `fn_producir_receta(p_product_id, p_cantidad, p_costo_adicional, p_usuario)`: valida stock de insumos, descuenta por FIFO de lotes, inserta movimientos Kardex de PRODUCCION, calcula costo unitario del lote final e incrementa stock del producto elaborado.
    - Creado script de reversión: `servidor/sql/deshacer-fase8-recetas-combos.sql`.
    - Modificado trigger `fn_reduce_stock_from_sales()`: si el producto vendido es un 'COMBO', descuenta automáticamente los insumos requeridos por FIFO en Kardex.
    - `prueba-fase8-backend.mjs`: 11 de 11 pruebas pasadas al 100%.
  - **2. Interfaz y Flujo de Teclado (Frontend):**
    - `ModalProducto.tsx`: Configuración de Receta o Combo en Paso 2 con buscador de insumos, tabla de componentes con costo en vivo, costo adicional x lote y navegación 100% por teclado.
    - `ModalProduccion.tsx`: Ventana modal para emitir órdenes de producción con cálculo en tiempo real de insumos necesarios vs disponibles, stock máximo fabricable, costeo unitario y confirmación con tecla Enter.
    - `Inventario/index.tsx`: Añadido botón verde `[ + Producir ]` (`#btn-header-producir`) en la barra de acciones con navegación por flechas, conectado al modal de producción.
    - `TablaProductos.tsx`: Insignias visibles `👨‍🍳 RECETA` y `📦 COMBO` en la lista, y botón rápido `[ Producir ]` con icono de chef en cada producto con receta.
    - `Punto-de-venta/index.tsx` y `TerminalBusqueda.tsx`: Los Combos calculan su stock disponible dinámicamente según la disponibilidad de sus insumos (`min(stock / req)`). En Caja se muestran con insignia `📦 COMBO: N`.
  - **3. Modo Sin Internet:**
    - `precargaSinInternet.ts`: Descarga automática de `product_recipes` en IndexedDB.
    - `sinInternet.ts`: Habilitado `product_recipes` con IDs locales en cola.
  - **4. Despliegue y Pruebas UI:**
    - Build de producción impecable en 4.25s (`npm run build`).
    - Desplegado a `https://siumax.duckdns.org`. Producción Evicamp y GitHub main intactos (Regla 4).
    - `prueba-fase8-ui.mjs`: 12 de 12 pruebas aprobadas al 100% en Edge headless (creación de insumos, apertura de modal, fabricación de unidades, actualización de stock y visualización de combo en POS).
  - **5. Siguiente paso:**
    - Presentar la entrega de Fase 8 al dueño para su revisión en siumax y decisión para pase a producción.
- **Pase Oficial de Fase 7 (Tallas y Colores: Variantes con stock propio y Lotes por variante) a Evicamp y GitHub:**
  - **Instrucción del dueño:** *"perfecto bien echo ya quedo ahora si avnacemos"* (tras confirmación de Opción 1: Subir Fase 7 a Producción Evicamp y GitHub).
  - **1. Respaldo y Base de Datos en Producción (Evicamp):**
    - Se ejecutó `ai-scripts/pruebas/aplicar-fase7-evicamp.cjs`.
    - Respaldo de `postgres` creado en `/var/lib/postgresql/respaldo-evicamp-antes-fase7-2026-10-31T22-29-31-496Z.dump` (1.9 MB).
    - `servidor/sql/seguridad-sesion.sql` aplicado con `psql` y `SET lock_timeout = '5s'`. Cero errores de SQL y cero tiempo de inactividad (sin reiniciar la API).
    - `NOTIFY pgrst, 'reload schema'` ejecutado con éxito. Verificadas columnas en `products`, `sale_details`, `batches`, `inventory_movements` y tabla `product_variants`.
  - **2. Despliegue Frontend a Evicamp:**
    - Build de producción impecable en 4.35s (`npm run build`).
    - Despliegue ejecutado vía `node ai-scripts/deploy.cjs evicamp` (20 archivos subidos, HTTP 200 OK verificado).
  - **3. Git:**
    - Fusión limpia de `fase-7-tallas-colores` a `main` y push a GitHub (`origin main`).
  - **4. Siguiente paso:**
    - Presentar la propuesta de la **Fase 8: Producción y Encargos (Recetas e Insumos, Combos / Kits)** para visto bueno del dueño.

## 31/10/2026 (tarde, 56) · Antigravity
- **Selector de Teclado y Retiro de Casillero Stock en ModalProducto (Fase 7):**
  - **Pregunta / reporte del dueño:** *"el selector no funciona ahi como tambien ahi se puede ingresar lotes y precios lo que si esta bien que ahi se tenga que poner el precio del producto de ese polo o talla ya que no habra un presio unico para todos"* (con captura del modal Paso 2 en bloque de Tallas y Colores).
  - **Decisión acordada por pregunta interactiva:** Opción A1: Quitar la columna 'Stock' de esta ventana y dejar solo 'Precio'. El stock se ingresa con el botón [ Ingresar Lote ] con su costo y proveedor.
  - **1. Selector de Teclado (Navegación 100% fluida):**
    - En `ModalProducto.tsx`, se conectó la salida de Presentaciones (`pres-barcode-N`) y Escalas (`escala-precio-N`) hacia `check-tiene-variantes`.
    - En `check-tiene-variantes`, Flecha Abajo baja a las plantillas rápidas (`btn-preset-ropa` / `btn-preset-calzado`) o a `btn-guardar-producto`. Enter activa/desactiva variantes.
    - Se agregaron IDs y navegación horizontal/vertical para las plantillas rápidas y el generador (`input-tallas-generator`, `input-colores-generator`, `btn-generar-combinaciones`).
    - En la tabla de variantes: cada celda (`var-talla-N`, `var-color-N`, `var-nombre-N`, `var-barcode-N`, `var-price-N`, `var-quitar-N`) cuenta con selector bidireccional fluido (`teclasVar`). Al terminar la última fila, Flecha Abajo baja a `btn-agregar-variante-manual` y de ahí a `btn-guardar-producto`. Flecha Arriba desde Guardar regresa directamente al bloque de variantes.
  - **2. Retiro de Stock en Creación de Producto:**
    - Se retiró la columna 'Stock' de la tabla de variantes en `ModalProducto.tsx` (dejando solo Talla, Color, Nombre Variante, Código de Barras y Precio).
    - Las nuevas variantes inician con stock 0 (se alimentan mediante el botón [ Ingresar Lote ] con proveedor y costo real) y las existentes en edición conservan su stock.
  - **3. Pruebas Automáticas 100% OK:**
    - `prueba-modal-variantes-teclado.mjs`: Probó todos los movimientos de teclado (bajada desde presentaciones, activación con Enter, selección de preset, navegación celda a celda en la grilla y regreso desde Guardar con Flecha Arriba). 11 de 11 pasadas.
    - `prueba-lote-variantes-ui.mjs` y `prueba-fase7-ui.mjs` aprobadas.
  - **4. Despliegue:**
    - Desplegado a `siumax.duckdns.org`. Producción Evicamp y GitHub main intactos (Regla 4).

## 31/10/2026 (tarde, 55) · Antigravity
- **Filtrado de Productos con Variantes en Caja (POS):**
  - **Pregunta del dueño:** *"entonces ahora si ingreso un producto como polo nicke y tiene una variante no va aparecer el polo nicke si no la variante no??"*
  - **Ajuste en `src/utils/variantes.ts`:**
    - Al ingresar stock por variante, el stock global de `products.quantity` refleja la suma de las variantes.
    - Se calculó el stock genérico real restante: `stockGenerico = products.quantity - suma(variantes.quantity)`.
    - Si `stockGenerico <= 0` (todo el stock pertenece a tallas o colores), en la Caja **aparecen únicamente las variantes específicas** (`Polo Nike (Talla M)`, `Polo Nike (Talla L)`) y **se oculta el producto genérico padre**, evitando que el cajero venda una prenda sin talla y descuadre el stock de las variantes.
    - Si el producto tiene stock genérico remanente sin clasificar (`stockGenerico > 0`), el genérico sí se muestra con su stock exacto.
  - **Pruebas:** `prueba-fase7-ui.mjs` y `prueba-lote-variantes-ui.mjs` aprobadas al 100%. Desplegado en `siumax.duckdns.org`.

## 31/10/2026 (tarde, 54) · Antigravity
- **Adaptación del Botón [ Ingresar Lote ] por Tipo de Producto (Tallas y Colores / Variantes):**
  - **Pregunta del dueño:** *"no seria mejor que la creación de lotes por tipo de productos este en el boton de lotes ??"*
  - **Decisión acordada:** Opción A1 elegida por el dueño. El botón `[ Ingresar Lote ]` se adapta inteligentemente al producto seleccionado: si el producto tiene tallas/colores, despliega la grilla de variantes para ingresar cuántas unidades llegaron de cada una (ej. 20 M, 30 L) y alimente el stock individual de cada variante.
  - **1. Base de datos (`servidor/sql/seguridad-sesion.sql` y `siumax`):**
    - Agregadas columnas `variant_id bigint` y `variant_name text` a `public.batches`. Creado índice `idx_batches_variant_id`.
    - Actualizado `fn_reduce_stock_from_sales` para descontar por FIFO del lote correspondiente a la variante (`variant_id = NEW.variant_id`) cuando la venta tiene variante, o de los lotes genéricos (`variant_id IS NULL`) cuando es genérico.
    - Creadas/actualizadas funciones `fn_edit_batch` y `fn_soft_delete_batch`: al editar o retirar un lote con `variant_id`, se sincroniza automáticamente tanto el stock de la variante (`product_variants.quantity`) como el del producto (`products.quantity`).
    - Migración aplicada en `siumax` con respaldo previo (`.dump`). Cero errores SQL.
  - **2. Interfaz en `ModalLote.tsx`:**
    - Al buscar y seleccionar un producto con variantes (`tieneVariantes`), la Sección 2 se adapta: oculta el campo único de cantidad y muestra una grilla con las variantes del producto (`Variante (Talla/Color)`, `Stock Actual`, `Cant. a Ingresar`).
    - Foco inteligente: al elegir el producto, el cursor salta automáticamente al primer casillero de variante (`input-lote-var-0`). Con Flechas Arriba/Abajo o Enter se navega rápidamente entre variantes sin usar el mouse.
    - Suma y costo automático: la cantidad total del lote se calcula sola sumando las variantes ingresadas, y el costo unitario (`costoTotal / cantidad`) se calcula al instante.
    - Al guardar: inserta un lote independiente por cada variante con cantidad > 0, actualiza `product_variants.quantity`, genera movimientos en Kardex (`inventory_movements`) y recalcula el stock global de `products`.
    - Si el producto es estándar o a granel (sin variantes), mantiene la entrada clásica de un solo número.
  - **3. Pestaña Lotes (`TablaLotes.tsx`) y Modal de Historial (`ModalHistorialLotes.tsx`):**
    - Mapeadas columnas `variant_id` y `variant_name`.
    - Cada lote de variante muestra una insignia `🏷️ {variant_name}` al lado del nombre del producto.
    - El buscador inteligente de Lotes ahora permite filtrar por talla o color (ej. "M", "Negro", "Polo Blanco").
  - **4. Modo Offline (`sinInternet.ts`):**
    - `fn_edit_batch` y `fn_soft_delete_batch` sincronizan localmente el stock de `product_variants` cuando `variant_id` está presente.
  - **5. Pruebas Automáticas Superadas 100%:**
    - `ai-scripts/pruebas/prueba-lote-variantes-ui.mjs`: Probó login, apertura de modal, búsqueda de producto con variantes, adaptación de sección 2 a variantes, ingreso de unidades en Talla M, cálculo de costo, guardado en base de datos `batches`, aumento de stock en `product_variants` y visualización con insignia `🏷️` en pestaña Lotes. Todo OK.
    - `ai-scripts/pruebas/prueba-fase7-ui.mjs`: Prueba de regresión de interfaz y ventas POS sin errores.
  - **6. Despliegue y Git:**
    - `tsc -b && vite build` limpio. Desplegado en `siumax.duckdns.org`.
    - Rama activa: `fase-7-tallas-colores`.
    - Producción Evicamp y GitHub main intactos (Regla 4).

## 31/10/2026 (tarde, 53) · Antigravity
- **Modelo Híbrido de Stock para Variantes y Lotes Genéricos en Caja (Fase 7):**
  - **Pregunta del dueño:** *"pero que pasa si pongo polo nicke y lo ingreso en lote 100 pero en variantes tengo polo nicket blanco M y pongo 100 deben aparecer los 2 no??"*
  - **Decisión acordada:** Opción A1 recomendada. En Caja aparecen ambos: el 'Polo Nike' genérico (con su stock de lote) y cada variante específica ('Polo Nike Blanco M') con su stock individual. Si el producto genérico no tiene stock de lote (`quantity = 0`), solo aparecen las variantes para no saturar con tarjetas agotadas.
  - **1. Base de datos (`servidor/sql/seguridad-sesion.sql` y `siumax`):**
    - `fn_reduce_stock_from_sales`: Si `NEW.variant_id IS NOT NULL`, descuenta exclusivamente de `product_variants.quantity`, toma el costo de la variante y sale sin tocar `batches` ni `products.quantity`. Si `NEW.variant_id IS NULL`, descuenta de `batches` y `products.quantity` sin tocar variantes.
    - `fn_anular_venta`: Si el movimiento tiene `variant_id`, restaura el stock a `product_variants`; si no tiene `variant_id`, restaura a `batches` y `products`.
    - Respaldo de base de datos realizado y SQL aplicado con cero errores en `siumax`.
  - **2. Lógica Frontend y Modo Offline:**
    - `src/utils/variantes.ts`: `conVariantesYPresentaciones` incluye la variante vendible y, si `Number(p.quantity) > 0`, incluye también el producto base genérico.
    - `src/sections/Punto-de-venta/index.tsx`: mantiene `p.quantity` intacto en `fetchProducts`; en `handleAddToCart` y `setProductos` post-venta separa el conteo y descuento de unidades genéricas (`!i.variantId`) de las variantes.
    - `src/sections/Inventario/index.tsx`: suma el stock global de lotes + variantes en `stockFinal`, y guarda `stockBase` para el tooltip de la tabla.
    - `src/utils/sinInternet.ts`: desacoplamiento de stock offline en `descontarStockLocal` y `IMITAR_RPC.fn_anular_venta`.
  - **3. Verificación Automatizada 100% Exitosa:**
    - `ai-scripts/pruebas/prueba-fase7-hibrido.mjs`: probó el caso exacto del dueño: 100 und en lote de Polo Nike + 100 und en variante Blanco M. Comprobó que en Caja aparecen los 2 ítems, vender 10 Blanco M descuenta variante a 90 dejando el lote intacto en 100; vender 15 genérico descuenta lote a 85 dejando variante intacta en 90; y anular ambas devuelve cada uno a 100.
    - `ai-scripts/pruebas/prueba-fase7-variantes.mjs`: 13/13 pruebas OK.
    - `ai-scripts/pruebas/prueba-fase7-ui.mjs`: prueba de interfaz con Puppeteer Edge OK.
  - **4. Despliegue:** Compilado y desplegado a `siumax.duckdns.org`. Producción Evicamp y GitHub main intactos (Regla 4).

## 31/10/2026 (tarde, 52) · Antigravity
- **Implementación y Pruebas Completas de la Fase 7 (Tallas y Colores: Variantes con stock propio) en `siumax`:**
  - El dueño dio su aprobación para comenzar: *"si dale"*.
  - **1. Base de datos y Triggers (`siumax`):**
    - Respaldo de seguridad creado con `pg_dump`: `/var/lib/postgresql/respaldo-siumax-antes-fase7-2026-10-31T18-30-43-213Z.dump`.
    - Creada tabla `product_variants` con `id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`, `product_id`, `nombre_variante`, `talla`, `color`, `barcode`, `code`, `price`, `cost_price`, `quantity`, `is_active`, `is_synced`.
    - Agregadas columnas a `sale_details` e `inventory_movements`: `variant_id bigint` y `variant_name text`.
    - Columna agregada a `products`: `tiene_variantes boolean DEFAULT false`.
    - Actualizado trigger `fn_reduce_stock_from_sales`: descuenta el stock de la variante específica en `product_variants` si `variant_id` está presente, y registra en Kardex (`inventory_movements`) el `variant_id` y `variant_name`.
    - Actualizada función `fn_anular_venta`: al anular un ticket restaura el stock a la variante respectiva y genera movimiento Kardex `ANULACION` con variante.
    - PostgREST recargó el esquema (`NOTIFY pgrst, 'reload schema'`). Cero errores SQL.
    - Script para deshacer creado: `servidor/sql/deshacer-fase7-tallas-colores.sql`.
  - **2. Soporte Offline (Sin Internet):**
    - Rutas `/product_variants` añadidas a `PERMITIDO_SIN_INTERNET`, `CON_STOCK` e `ID_DESDE_LA_PC` en `src/utils/sinInternet.ts`.
    - Sincronización de anulación offline adaptada para variantes en `src/utils/sinInternet.ts`.
    - Precarga local en `src/utils/precargaSinInternet.ts` configurada para descargar y cachear `product_variants`.
  - **3. Interfaz de Inventario:**
    - `ModalProducto.tsx`: Casilla "Activar Variantes", plantillas rápidas (`#btn-preset-ropa` S, M, L, XL y `#btn-preset-calzado` 36-42), generador combinado por comas, matriz editable con stock independiente por variante, código de barras y precio específico.
    - `TablaProductos.tsx`: Insignia destacada `[ 🏷️ X variantes ]` con tooltip detallando stock por talla/color.
  - **4. Interfaz de Caja (POS):**
    - `src/utils/variantes.ts`: Función `conVariantesYPresentaciones` que desglosa productos con variantes en tarjetas individuales en el catálogo de venta, mostrando stock y código propio.
    - `Punto-de-venta/index.tsx`: Validación de stock por variante en `handleAddToCart`, envío de `variant_id` y `variant_name` en la venta, y descuento instantáneo en memoria.
  - **5. Pruebas Automáticas Superadas 100%:**
    - `ai-scripts/pruebas/prueba-fase7-variantes.mjs`: Probó creación, venta en POS con trigger descontando solo la talla vendida, Kardex con variante y anulación de venta devolviendo stock a la variante. Todo OK.
    - `ai-scripts/pruebas/prueba-fase7-ui.mjs`: Probó navegación real con Edge, creación de producto con variantes mediante plantilla ropa, visualización de insignia en Inventario y búsqueda de las 4 variantes individuales en POS. Todo OK.
  - **6. Estado de Servidores y Git:**
    - Compilación limpia con `tsc -b && vite build` y desplegado en `siumax.duckdns.org`.
    - Rama git: `fase-7-tallas-colores`.
    - **Evicamp (producción) y GitHub main intactos** (Regla 4). A la espera del visto bueno del dueño.
  - Siguiente paso: El dueño prueba en `siumax` y cuando indique *"si subelo"*, pasar la Fase 7 a Evicamp y GitHub.

## 31/10/2026 (mañana, 51) · Antigravity
- **Pase Oficial de la Fase 6 (Cambios de Producto y Garantías / Series) a Producción (Evicamp) y GitHub:**
  - El dueño dio la orden explícita: *"si subelo"*.
  - **1. Base de datos de Producción (`postgres` - Evicamp):**
    - Respaldo de seguridad creado con `pg_dump -Fc`: `/var/lib/postgresql/respaldo-evicamp-antes-fase6-2026-10-31T16-57-56-337Z.dump` (1.9 MB).
    - SQL de seguridad aplicado con `psql` y `SET lock_timeout = '5s'`:
      - Tabla `cambios_productos` creada con índices.
      - Columnas agregadas a `products`: `controla_series boolean DEFAULT false`, `meses_garantia integer DEFAULT 0`.
      - Columnas agregadas a `sale_details`: `numero_serie text`, `garantia_hasta date` e índice.
      - PostgREST recargó el esquema (`NOTIFY pgrst, 'reload schema'`) sin reiniciar la API ni cortar ventas de la clienta.
      - Errores del SQL: (ninguno). Verificaciones de tablas y columnas: 100% OK.
  - **2. Despliegue Web a Evicamp:**
    - Compilación limpia con `tsc -b && vite build` (20 archivos subidos a `evicamp.duckdns.org`).
    - Verificación HTTP en vivo: 200 OK.
  - **3. GitHub y control de versiones:**
    - Rama `fase-6-cambios-garantias` fusionada exitosamente en `main`.
    - `git push origin main` completado hacia GitHub (`fb7bfd9..59538a0`).
  - **4. Aclaración del alcance del Plan con el dueño:**
    - Se constató que **Separados con adelanto** ya estaba 100% hecho y activo desde la Fase 4 (sección Clientes -> pestaña Pedidos, y en Caja -> botón Pedido con adelanto, saldo y reserva de stock).
    - Se constató que las **Promociones** ya estaban resueltas en la creación de productos (precios por cantidad / escalas automáticas, presentaciones de cajas/packs con precio oferta y precios mayoristas).
    - Ambas quedan marcadas como completadas.
  - Siguiente paso: acordar con el dueño el inicio de la siguiente fase (Fase 7: Tallas y Colores, Fase 8: Producción/Recetas, Fase 9: Sucursales/Traspasos, o Fase 10: Catálogo Web WhatsApp).

## 30/10/2026 (noche, 50) · Antigravity
- **Permitir borrar y tipear cualquier número libremente en cantidades de Cambio de Producto:**
  - El dueño reportó: *"aqui no puedo borrar el 1 y poner el numero que quiera se mantiene en 1 arregla eso"* (con captura del modal de cambio de producto mostrando `CANTIDAD A DEVOLVER: 1` y `CANTIDAD A ENTREGAR: 1`).
  - **Causa identificada:**
    1. Los inputs tenían `type="number"` y el evento `onChange` evaluaba `setCantidad(Math.max(1, Number(e.target.value) || 1))`.
    2. Al intentar borrar el `1` con retroceso (Backspace), el input quedaba momentáneamente vacío `""`. En JavaScript, `Number("") || 1` da `1`, por lo que el estado se restablecía inmediatamente a `1`, impidiendo borrarlo o tipear números de varios dígitos con soltura.
  - **Solución implementada:**
    1. **Estado como texto flexible:** `cantidadDevolver` y `cantidadNueva` ahora se almacenan como `string` (`'1'`), permitiendo dejar el campo vacío temporalmente mientras el usuario tipea o borra dígitos.
    2. **Inputs tipo texto numérico:** Se convirtieron a `type="text" inputMode="numeric"`.
    3. **Auto-selección al enfocar/clic:** Se añadió `onFocus={(e) => e.target.select()}` y `onClick={(e) => (e.target as HTMLInputElement).select()}`. Al hacer clic o entrar con el teclado a la casilla, el número queda sombreado de inmediato, permitiendo sobreescribirlo directamente sin necesidad de presionar borrar primero.
    4. **Normalización en onBlur:** Solo cuando el usuario sale del input (`onBlur`), si quedó vacío o con un valor menor a 1, se restablece a `'1'`.
    5. **Tope inteligente:** En la cantidad a devolver, si se escribe un número mayor a las unidades compradas en el ticket original, se normaliza al máximo comprado en `onBlur` y se visualiza claramente `(máx. comprada: X)` en la etiqueta. En la cantidad a entregar se indica `(stock: Y)`.
    6. **Cálculos seguros:** Las operaciones matemáticas y guardados usan `cantDevolverNum` y `cantNuevaNum` evaluados con salvaguardas sin alterar el texto en pantalla.
    7. Se respetó la regla de no saltar campos con Enter (solicitada por el dueño en la entrada 47), manteniendo la navegación por flechas de dirección.
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue exitoso a `siumax.duckdns.org`. Evicamp y GitHub intactos.

## 30/10/2026 (noche, 49) · Antigravity
- **Actualización directa del Ticket al cambiar producto (eliminación de filas extras de diferencia en Finanzas):**
  - El dueño observó: *"a ver veo que el ticket sigue diciendo el mismo producto osea el ticket tiene el producto evelyn pero cuando cambio el producto con el de prueba sigue manteniendo el de evelyn y me sale este mensaje DIFERENCIA POR CAMBIO (TICKET #623154) [EFECTIVO]... no dijimos que eso ya no ?? que solo cambie el producto del ticket nada mas"*.
  - **Causa identificada:**
    1. Anteriormente, el cambio de producto registraba el movimiento en `cambios_productos` y un movimiento de dinero en `cash_movements`, pero **no actualizaba `sale_details` ni `sales`**.
    2. Como resultado, el ticket original seguía mostrando el producto devuelto (ej. "EVELYN") con el total antiguo, y en Finanzas aparecía una fila separada con la "DIFERENCIA POR CAMBIO...".
  - **Solución implementada:**
    1. **Actualización directa en `sale_details`:** Al confirmar el cambio, la línea del producto devuelto se actualiza automáticamente con el nuevo producto seleccionado (nombre, id, nueva cantidad, precio unitario, subtotal y número de serie). Si solo se devolvió parte de la cantidad, se descuenta de la original y se agrega la línea nueva.
    2. **Actualización directa en `sales`:** El total del ticket y los montos pagados (`amount_cash`, `amount_yape`, `amount_card`, `payment_type`) se actualizan absorbiendo la diferencia monetaria.
    3. **Eliminación de filas extras en Finanzas:** Ya no se inserta ningún movimiento en `cash_movements`. La caja de Finanzas cuadra exacta y directamente a través del ticket actualizado. Además, se limpiaron los movimientos residuales creados durante las pruebas y se agregaron filtros de protección en `Finanzas/index.tsx` y `ModalDetalleCaja.tsx`.
    4. El ticket de prueba #623154 fue actualizado en la base de datos de pruebas para reflejar inmediatamente `PRUEBA SIN INTERNET 834743` y un total de S/ 4.50.
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue exitoso a `siumax.duckdns.org`. Evicamp y GitHub intactos.

## 30/10/2026 (noche, 48) · Antigravity
- **Soporte de Pago Mixto en Cobro de Diferencia por Cambio de Producto:**
  - El dueño reportó: *"otro error que pasa si pago mixto ?? el metodo de pago tiene que ser mixto no uno solo"* (mostrando captura del paso 3 Balance y Cuadre de Caja con la diferencia a favor de la tienda y un único selector de método).
  - **Causa identificada:**
    1. El paso 3 solo tenía un `<select>` simple que obligaba a elegir un único método (Efectivo, Yape o Tarjeta).
    2. Si el cliente pagaba una parte en efectivo y otra con Yape o tarjeta (pago mixto), no se podía dividir el monto, impidiendo que el cuadre de caja de Finanzas cuadrara con la realidad.
  - **Solución implementada:**
    - Se reemplazó el `<select>` único por una sección completa de **Pago Mixto** idéntica a `ModalCobro.tsx`:
      - 3 botones de acceso rápido para liquidación total en 1 clic: `[ 💵 Todo Efectivo ]`, `[ 📱 Todo Yape ]`, `[ 💳 Todo Tarjeta ]`.
      - 3 casillas de entrada independientes para montos: `💵 Efectivo (S/)`, `📱 Yape / Plin (S/)` y `💳 Tarjeta (S/)`.
      - Sincronización automática: al calcularse una diferencia a cobrar (`diferencia > 0`), por defecto se precarga el monto total en Efectivo y las demás en 0.
      - Cálculo y validación en vivo:
        - Muestra resumen: *Diferencia requerida: S/ X.XX | Total cubierto: S/ Y.YY*.
        - Alertas dinámicas: indica si *Falta cubrir S/ Z.ZZ* o si *El total ingresado supera la diferencia*.
        - Si el pago no cuadra exactamente con la diferencia, el botón *Confirmar y Realizar Cambio* se bloquea visualmente (`disabled`).
      - En el guardado:
        - En `cambios_productos` se guarda `payment_type` con el detalle completo (ej. `MIXTO (Efectivo: S/ 1.50, Yape: S/ 1.00)` o `EFECTIVO`).
        - En `cash_movements` se inserta un registro de `INGRESO` individual por cada método utilizado con monto > 0, asegurando que las bolsas de dinero (efectivo de cajón, Yape y tarjeta) de Finanzas y el cierre de caja cuadren al 100%.
      - Si la diferencia es a favor del cliente (`diferencia < 0`), se mantiene el aviso y egreso en efectivo.
      - Navegación bidireccional completa con flechas de teclado entre botones rápidos, casillas numéricas, motivo y botón de confirmación.
      - Vale de cambio imprimible actualizado con desglose detallado si el pago fue mixto.
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue exitoso a `siumax.duckdns.org`. Evicamp y GitHub intactos.

## 30/10/2026 (noche, 47) · Antigravity
- **Corrección de Enter (eliminación de saltos indeseados y apertura con showPicker en selects):**
  - El dueño reportó: *"cuando presiono enter no hace la funcion del click osea entrar mas bien cuando presiono enter pasa al siguiente eso no tiene que pasar"* (adjuntando captura en el Paso 1 de Selección de Producto del ticket y número de serie).
  - **Causa identificada:**
    1. Se había asignado `e.key === 'Enter'` en los manejadores `onKeyDown` de los campos (`select-producto-devuelto`, `input-cantidad-devolver`, `input-serie-devuelta`, `input-cantidad-nueva`, etc.) para forzar el foco al siguiente campo.
    2. En el `<select id="select-producto-devuelto">`, al presionar `Enter` para abrir el menú desplegable y elegir un producto, el `e.preventDefault()` cancelaba la apertura nativa y saltaba forzosamente a la cantidad a devolver.
    3. En `btn-cambiar-nuevo`, el `Enter` saltaba a la cantidad nueva en lugar de ejecutar el clic para cambiar el producto.
  - **Solución implementada:**
    - Se eliminó el salto de campo con `Enter` en todos los inputs y selects del modal. Los saltos espaciales entre campos quedan reservados para las flechas (`Flecha Abajo/Arriba/Derecha/Izquierda`).
    - En `<select id="select-producto-devuelto">` y `<select id="select-metodo-diferencia">`, al presionar `Enter` o `Espacio` se invoca `showPicker()` nativo, cumpliendo con la función de click para "entrar" y abrir la lista de opciones sin saltar al siguiente campo.
    - En los botones (`btn-cambiar-nuevo`, `btn-confirmar-cambio`), `Enter` ejecuta su acción natural de click (`onClick`).
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue exitoso a `siumax.duckdns.org`. Evicamp y GitHub intactos.

## 30/10/2026 (noche, 46) · Antigravity
- **Soporte de Enter instantáneo y Selector visible en Catálogo de Cambio de Producto:**
  - El dueño reportó: *"el enter no hace click"* en el modal de cambio de producto al buscar en el catálogo (ej: "EVE").
  - **Causa identificada:**
    1. Si el usuario escribía y presionaba `Enter` antes de que venciera el debounce de 250ms, la lista de resultados aún estaba vacía (`catalogoResultados.length === 0`), por lo que `Enter` era ignorado.
    2. No existía un estado de índice preseleccionado (`indiceSeleccionado`), por lo que ningún producto se mostraba resaltado por defecto al buscar, y el usuario no sabía si estaba seleccionado para Enter.
    3. Los elementos de la lista eran simples `<div>` que no emitían el evento nativo de `click` en los navegadores al pulsar Enter, requiriendo foco manual obligatorio.
  - **Solución implementada:**
    - Se agregó el estado `indiceSeleccionado` (iniciado en `0` por defecto en cada búsqueda).
    - Al presionar `Enter` en `#input-buscar-nuevo`:
      - Si ya hay resultados visibles, selecciona inmediatamente el producto resaltado (`catalogoResultados[indiceSeleccionado]`).
      - Si el usuario o una lectora de código de barras envió `Enter` de inmediato con texto en el input antes de que termine el debounce, se lanza una consulta directa a la base de datos y se selecciona el primer producto coincidente sin esperar el temporizador.
    - Cada elemento de la lista se convirtió en un botón real (`<button type="button">`) con el estilo de selector clásico de Evicamp: fondo negro, texto blanco, anillo contrastado, numeración y etiqueta visual `[ENTER ⏎]` para máxima claridad.
    - `Flecha Abajo` y `Flecha Arriba` navegan suavemente por la lista manteniendo el auto-scroll visible (`scrollIntoView`).
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue exitoso a `siumax.duckdns.org`. Evicamp y GitHub intactos.

## 30/10/2026 (noche, 45) · Antigravity
- **Implementación de Selector y Navegación 100% Teclado en ModalCambioProducto:**
  - El dueño reportó: *"el selector no funciona en esta pestaña"* (adjuntando captura buscando en el catálogo de productos nuevos).
  - **Causa identificada:**
    1. El input `#input-buscar-nuevo` no contaba con evento `onKeyDown`, por lo que al presionar `Flecha Abajo` o `Enter` no ocurría nada.
    2. La lista de coincidencias del catálogo (`catalogoResultados`) usaba elementos simples sin `role="option"`, sin `tabIndex={0}`, sin navegación entre filas por flechas y sin indicador de selector visual resaltado.
    3. Faltaba navegación 2D continua entre todos los campos del modal (producto devuelto, serie, catálogo, cantidad nueva, método de pago, motivo y botones de confirmación).
  - **Solución implementada:**
    - Se implementó el patrón `selector` de Evicamp en la lista del catálogo:
      - `Flecha Abajo` en el buscador pasa al primer resultado.
      - `Enter` en el buscador selecciona directamente el primer producto.
      - `Flecha Arriba/Abajo` recorre los resultados de la lista con resaltado de selector negro y letras blancas (`focus:bg-[var(--color-ink)] focus:text-white`).
      - `Enter` o `Espacio` selecciona el producto y auto-enfoca la cantidad a entregar con selección de texto (`cantInput.select()`).
      - `Esc` limpia los resultados y devuelve el foco al buscador.
    - Se asignaron IDs y navegación con flechas (Arriba/Abajo/Izquierda/Derecha) para todos los campos: `#select-producto-devuelto`, `#input-cantidad-devolver`, `#input-serie-devuelta`, `#input-buscar-nuevo`, `#btn-cambiar-nuevo`, `#input-cantidad-nueva`, `#input-serie-nueva`, `#select-metodo-diferencia`, `#input-motivo-cambio`, `#btn-confirmar-cambio` y `#btn-cancelar-cambio`.
    - Focus Trap mejorado con fase de captura y `e.stopPropagation()` para proteger contra atajos globales.
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue a `siumax.duckdns.org`. Evicamp y GitHub intactos.

## 30/10/2026 (tarde, 44) · Antigravity
- **Corrección de superposición (z-index) y foco en ModalCambioProducto sobre ModalDetalleCaja:**
  - El dueño reportó: *"cuando pongo cambio de producto dentro de historial de caja en la ventana para ver los ticket de una caja anterior la ventan de cambio de producto sale debajo de esa ventana arreglar eso"*.
  - **Causa identificada:**
    1. `ModalDetalleCaja` tiene `z-[100]` y `ModalDetalleTicket` tiene `z-[200]`.
    2. `ModalCambioProducto` tenía `z-50`, por lo que al invocarse desde una caja del historial, se dibujaba debajo de la ventana de detalle de caja.
    3. `ModalDetalleCaja` tenía captura de teclado `window.addEventListener('keydown', ..., { capture: true })` que interceptaba teclas de dirección y escape cuando el modal de cambio estaba abierto.
  - **Solución implementada:**
    - Se elevó el z-index de `ModalCambioProducto.tsx` y `ModalConsultarGarantia.tsx` a `z-[300]`.
    - Se integró `useCerrarConEscape(isOpen, onClose)` en `ModalCambioProducto.tsx` para sincronizarse correctamente con la pila de modales.
    - Se agregó guardia en `ModalDetalleCaja.tsx` para no interceptar eventos de teclado si `modal-cambio-producto` está abierto.
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue a `siumax.duckdns.org`. Evicamp y GitHub intactos.

## 30/10/2026 (tarde, 43) · Antigravity
- **Simplificación del Flujo de Cambios de Producto, Búsqueda en Historial de Cajas y Cambios desde Cajas Anteriores:**
  - El dueño solicitó:
    1. *"el buscador no es necesario porque en finanzas tengo un buscador de ticket no tiene sentido que si quiero hacer cambio tengo que buscarlo"*: Eliminar la búsqueda manual redundante de tickets para el cambio de producto; el cambio se inicia directamente desde la fila del ticket en Finanzas o desde la vista previa del comprobante.
    2. *"en el historial de cajas no hay un buscador"*: Agregar un buscador rápido en el Historial de Cajas para filtrar sesiones cerradas por fecha, cajero, montos o notas.
    3. *"en cajas anteriores no hay para cambiar productos"*: Permitir realizar cambios de producto sobre tickets pertenecientes a cajas anteriores cerradas.
  - **Cambios realizados:**
    - `Finanzas/index.tsx`: Se eliminó el botón `btn-cambio-producto` de la barra superior. El botón de cambio de producto `[ 🔄 ]` vive directamente en cada fila de ticket en la grilla y dentro del detalle del comprobante.
    - `ModalCambioProducto.tsx`: Se eliminó el Paso 1 (formulario de búsqueda manual por input) y se muestra directamente la cabecera informativa del ticket. Se renumeraron los pasos: Paso 1 (Producto devuelto -), Paso 2 (Producto nuevo +) y Paso 3 (Balance y cuadre de caja =). Si el ticket tiene 1 solo producto, se preselecciona automáticamente y se enfoca el buscador del catálogo.
    - `TablaHistorial.tsx`: Se agregó el buscador `#buscador-historial-cajas` con filtrado en tiempo real por fecha, cajero, monto esperado, monto real, diferencia y notas de cierre, con navegación por teclado accesible (Flecha Abajo pasa a la primera fila, Flecha Arriba vuelve al selector de fechas).
    - `ModalDetalleCaja.tsx`: Se conectó `onCambiarProducto` tanto en la tabla de movimientos como en el modal de detalle del ticket de la caja cerrada, permitiendo abrir el cambio de producto sin importar qué tan antigua sea la caja.
    - `ModalDetalleTicket.tsx`: Se agregó el botón `[ 🔄 [C] CAMBIAR PRODUCTO ]` y el atajo de teclado `c` / `C` para iniciar el cambio directamente mientras se inspecciona el comprobante.
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue a `siumax.duckdns.org` completado con éxito. Evicamp y GitHub intactos.

## 30/10/2026 (tarde, 42) · Antigravity
- **Corrección en Finanzas (ModalCambioProducto): Búsqueda de tickets por 6 dígitos o ID completo y columna sunat_status:**
  - El dueño reportó: *"pues no funciona entonces puse un producto y compre y puse el numero del ticket pero no carga nada"*.
  - **Causa identificada:**
    1. En el sistema, los comprobantes impresos y la tabla de Finanzas muestran los últimos 6 dígitos (ej: `623154` o `#623154`), pero en la base de datos `sales.id` es un número de 13 dígitos (`1793398623154`). Al buscar con `eq('id', Number(rawId))` buscando `623154` exacto, no encontraba la venta.
    2. La consulta SQL pedía la columna `status`, pero en la tabla `sales` la columna real es `sunat_status` (lo que provocaba error 400 de PostgREST al intentar consultar).
    3. `sale_details` se consultaba usando `Number(rawId)` en lugar del `venta.id` real.
    4. La columna `id` de la tabla `cambios_productos` en `siumax` no tenía identity por defecto, por lo que se ajustó con `ALTER TABLE ... ADD GENERATED BY DEFAULT AS IDENTITY` y en código se asegura `id: Date.now()`.
    5. Se sincronizó la actualización directa de stock en `products` (+ al devuelto, - al nuevo) y en `cash_movements`.
  - **Solución implementada:**
    - Se optimizó `cargarTicket` en `ModalCambioProducto.tsx` con búsqueda inteligente:
      - Si tiene 10 o más dígitos, busca por ID exacto.
      - Si tiene 6 dígitos (o menos), busca en las ventas recientes por coincidencia de sufijo (`sid.slice(-6) === rawDigits` o `sid.endsWith(rawDigits)`).
      - Lee `sunat_status` y carga `sale_details` con el ID real de la venta.
    - Se probó por API en vivo con sesión activa en `siumax.duckdns.org`, confirmando que con `623154` carga de inmediato la venta `1793398623154` con el producto vendido (`EVELYN`).
  - Compilación (`npx tsc -b`, `npm run build`), `graphify update .` y despliegue a `siumax.duckdns.org` completado. Evicamp y GitHub intactos.

## 30/10/2026 (mañana, 41) · Antigravity
- **Ajuste en Inventario (ModalProducto y Tabla): Visibilidad de Garantía y diferenciación con Modelo:**
  - El dueño reportó: *"no sale el numero de seria si sale pero dice modelo/serie ahora lo de mese de garantia no sale"*.
  - **Causa identificada:**
    1. En Fase 3 se había puesto la etiqueta `Modelo / Serie`, lo cual generaba confusión entre el modelo del producto (ej: DCD771) y el número de serie individual por unidad física.
    2. El campo `input-meses-garantia-producto` estaba condicionado dentro de `{formData.controlaSeries && ...}`, por lo que al estar desmarcado el checkbox, no se veía en la pantalla.
  - **Solución implementada:**
    1. Se cambió la etiqueta en Fase 3 a `Modelo / Versión` (placeholder `EJ: 50MM, PLUS, X-200, DCD771`) para que sea inconfundible.
    2. Se creó un bloque dedicado **`🛡️ Garantía y Control de Series / IMEI (OPCIONAL)`** con dos campos **siempre visibles**:
       - `Garantía de Fábrica (Meses)`: input numérico visible siempre (ej: 0 si no tiene garantía, 6, 12 meses).
       - `Control de Unidades Físicas`: tarjeta con checkbox `Exigir Nº de Serie / IMEI al vender en Caja`.
    3. En base de datos se guarda `meses_garantia` directamente (independiente de si controla serie o no).
    4. En `TablaProductos.tsx` se agregaron badges visibles `🛡️ N meses` y `🔢 Serie/IMEI` bajo el nombre del producto.
    5. Navegación con teclado en 2D y Focus Trap actualizados con orden exacto.
  - Compilación (`npx tsc -b`, `npm run build`) limpia y despliegue a `siumax.duckdns.org`. Evicamp y GitHub intactos.

## 29/10/2026 (noche, 40) · Antigravity
- **Implementación y Despliegue de la Fase 6 (Cambios de Producto y Garantías / Series) en Pruebas (siumax):**
  - El dueño pidió revisar la Fase 6 porque en Finanzas ya existía anulación de ticket, y aprobó explícitamente: *"perfecto hagamos el 2 y 3 ya que ya tenemos el 1, lo que si quiero que el 2 este dentro de finanzas"* y *"si hazlo"*.
  - Rama activa: `fase-6-cambios-garantias`.
  - **1. Base de datos de pruebas (`siumax`):**
    - Respaldo de seguridad creado antes de migrar: `/var/lib/postgresql/respaldo-siumax-antes-fase6-2026-10-30T03-24-58-158Z.dump` (242 KB).
    - Tabla `cambios_productos` creada para registrar cada sustitución con campos para ticket original, producto devuelto (+ serie), producto nuevo (+ serie), diferencia económica calculada y motivo.
    - Columnas añadidas a `products`: `controla_series boolean DEFAULT false`, `meses_garantia integer DEFAULT 0`.
    - Columnas añadidas a `sale_details`: `numero_serie text`, `garantia_hasta date` e índice `idx_sale_details_numero_serie`.
    - Script de reversión creado en `servidor/sql/deshacer-fase6-cambios-garantias.sql`.
    - Script maestro actualizado en `servidor/sql/seguridad-sesion.sql`.
  - **2. Interfaz y Código:**
    - `ModalProducto.tsx` (Inventario): checkbox "Controla Nº de Serie / IMEI" y campo numérico "Meses de Garantía (opcional)" con Focus Trap y 2D arrow keys.
    - `Inventario/index.tsx`: mapeo de `controlaSeries` y `mesesGarantia` al cargar inventario y guardar producto.
    - `Punto-de-venta/index.tsx`, `TicketVenta.tsx`, `types.ts`:
      - Si el producto controla series, la línea del carrito muestra input destacado para escanear/digitar Nº de Serie o IMEI.
      - Al cobrar la venta, `sale_details` guarda `numero_serie` y la fecha calculada `garantia_hasta` (hoy + meses).
      - `TicketImprimible.tsx` imprime en el ticket físico la serie/IMEI y vencimiento de la garantía de cada producto aplicable.
    - `ModalCambioProducto.tsx` (en Finanzas):
      - Carga el ticket original, permite seleccionar qué producto devuelve el cliente (retorno a stock +1 en `inventory_movements`), qué producto nuevo del catálogo se entrega (salida de stock -1 en `inventory_movements`), calcula automáticamente si el cliente paga diferencia (ingreso en caja) o si la tienda le da vuelto (egreso en caja), o cambio exacto S/ 0.00. Genera vale de cambio oficial imprimible.
    - `ModalConsultarGarantia.tsx` (en Finanzas):
      - Buscador para escanear cualquier serie o IMEI: verifica si fue vendido en la tienda, ticket, fecha, cliente, y muestra badge en tiempo real de si la garantía está VIGENTE (días restantes) o VENCIDA, o si el producto ya fue cambiado previamente.
    - `TablaMovimientos.tsx` y `ModalDetalleTicket.tsx`:
      - Botón `[ 🔄 Cambio ]` en cada fila de venta y botones `[ 🔄 Cambio ]` y `[ 🛡️ Garantías ]` en la barra superior de Tesorería/Finanzas.
  - **3. Compilación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 3.68s.
    - Despliegue a `siumax.duckdns.org` (`node ai-scripts/deploy.cjs siumax`) completado con éxito (20 archivos subidos).
    - Evicamp (producción) y GitHub completamente intactos (Regla 4).
    - `graphify update .` ejecutado.
  - **4. Qué sigue:** El dueño probará en `siumax.duckdns.org` el cambio de producto y la consulta de garantías/series.

## 29/10/2026 (noche, 39) · Antigravity
- **Pase Oficial a Producción de la Fase 3 (Evicamp y GitHub):**
  - El dueño confirmó: *"esta perfecto que fase sigue ya termino las pruebas lo paso"*.
  - **1. Base de datos de producción (Evicamp - base `postgres`):**
    - Script ejecutado: `ai-scripts/pruebas/aplicar-fase3-evicamp.cjs`.
    - Respaldo previo creado: `/var/lib/postgresql/respaldo-evicamp-antes-fase3-2026-10-30T02-05-11-169Z.dump` (1.9 MB).
    - `servidor/sql/seguridad-sesion.sql` aplicado con `psql` y `SET lock_timeout = '5s'`. ERRORES: (ninguno).
    - Columnas confirmadas en `products`: `laboratorio`, `marca`, `medida`, `modelo`, `ubicacion`.
    - Índices confirmados: `idx_products_marca`, `idx_products_modelo`, `idx_products_medida`.
    - Sin reiniciar la API ni cortar las ventas en Evicamp.
  - **2. Despliegue de aplicación web a producción (Evicamp):**
    - `node ai-scripts/deploy.cjs evicamp`: compilación limpia en 3.64s, 20 archivos subidos a `evicamp.duckdns.org`.
  - **3. Git y GitHub:**
    - Fusión limpia de `fase-3-busqueda-especializada` en `main`.
    - `git push origin main` completado con éxito (`84b4761..994bdca`).
  - **4. Fase que sigue:** Fase 6 (Devoluciones, Cambios y Garantías / Series) o Fase 5 (Descuentos y Promociones / Combos).

## 29/10/2026 (noche, 38) · Antigravity
- **Implementación y Despliegue de la Fase 3 en Pruebas (siumax):**
  - El dueño dio luz verde para avanzar: *"si dale vamos !!!! }"*.
  - Rama activa: `fase-3-busqueda-especializada`.
  - **1. Base de datos de pruebas (`siumax`):**
    - Respaldo de seguridad creado antes de migrar: `/var/lib/postgresql/respaldo-siumax-antes-fase3-2026-10-30T01-38-11-069Z.dump` (241 KB).
    - Nuevas columnas añadidas a la tabla `products`: `marca`, `modelo`, `medida`, `laboratorio`, `ubicacion` (todas tipo TEXT, por defecto NULL).
    - Índices creados: `idx_products_marca`, `idx_products_modelo`, `idx_products_medida`.
    - Script de reversión guardado en `servidor/sql/deshacer-fase3.sql`.
    - Script maestro actualizado en `servidor/sql/seguridad-sesion.sql`.
  - **2. Interfaz y Tipado (`types.ts`, `Inventario`, `Punto-de-venta`):**
    - En `src/sections/Inventario/types.ts`: agregados `marca`, `modelo`, `medida`, `laboratorio`, `ubicacion` opcionales en `Product`.
    - En `src/sections/Inventario/index.tsx`: mapeo de los 5 campos en `fetchInventory` y en `onProductSaved`.
    - En `src/sections/Inventario/components/ModalProducto.tsx`:
      - Sección *"🔍 Búsqueda y Ubicación en Tienda (OPCIONAL)"* con campos: Marca / Fabricante, Modelo / Serie, Medida / Capacidad, Laboratorio / Detalle Técnico, y Ubicación en Tienda (📍).
      - Integrado en el lector de códigos de barras (Open Food Facts): si el producto escaneado tiene marca en la base global, se sugiere automáticamente.
      - 100% accesible con teclado: Focus Trap determinístico con `Tab` / `Shift+Tab`, navegación bidireccional con flechas (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`).
      - Inserción y actualización en base de datos con saneamiento en mayúsculas y `null` si están vacíos.
    - En `src/sections/Inventario/components/TablaProductos.tsx`:
      - Etiquetas discretas bajo la categoría con `🏷️ Marca`, `📏 Medida`, `📍 Ubicación` con colores armónicos y alto contraste.
    - En `src/sections/Punto-de-venta/index.tsx`:
      - Paso de los 5 campos en el mapeo de productos para la caja.
    - En `src/sections/Punto-de-venta/components/TerminalBusqueda.tsx`:
      - Motor de búsqueda ultrarrápido multi-término (`coincideBusqueda`) busca instantáneamente combinando Nombre, Código (SKU), Código de barras, Marca, Modelo, Medida, Laboratorio y Ubicación en tienda (ej. buscar "yale 50", "pavco 1/2" o "paracetamol 500").
      - Tarjeta de producto en el POS muestra línea compacta `[ 🏷️ Marca · 📏 Medida · 📍 Ubicación ]`.
    - En `ModalLote.tsx`, `PanelCompras.tsx`, `ModalAjuste.tsx`, `ModalEditarSalida.tsx`, `ModalFiado.tsx`:
      - Buscadores de producto en Lotes, Compras, Ajustes de stock, Mermas y Fiados actualizados para buscar también por Marca, Modelo, Medida, Laboratorio y Ubicación.
  - **3. Compilación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 4.10s.
    - Despliegue completado a `siumax.duckdns.org` (`node ai-scripts/deploy.cjs siumax`).
    - Base de datos y web de Evicamp (producción) y GitHub completamente intactos (Regla 4).
    - `graphify update .` ejecutado.
  - **4. Qué sigue:** Probar en `siumax.duckdns.org` crear/editar productos con Marca, Medida y Ubicación, y verificar las búsquedas multi-palabra tanto en Inventario como en la Caja (POS).

## 29/10/2026 (noche, 37) · Antigravity
- **Pase Oficial a Producción de la Fase 4 Completa (Evicamp y GitHub) e Inicio de Fase 3:**
  - El dueño confirmó: *"perfecto ya no tengo mas pruebas ya quedo ahora en que fase estamos ???"* y dio autorización explícita para subir a producción: *"si hazlo y vamos a las fase 3"*.
  - **1. Base de datos de producción (Evicamp - base `postgres`):**
    - Se ejecutó script seguro `ai-scripts/pruebas/aplicar-fase4-completa-evicamp.cjs`.
    - Respaldo previo creado: `/var/lib/postgresql/respaldo-evicamp-antes-fase4-completa-2026-10-30T00-48-26-051Z.dump` (1.9 MB).
    - `servidor/sql/seguridad-sesion.sql` aplicado con `psql` y `SET lock_timeout = '5s'`. ERRORES: (ninguno).
    - Tablas creadas y verificadas: `cotizaciones`, `cotizacion_detalles`, `pedidos_clientes`, `pedido_detalles`.
    - Columnas creadas y verificadas: `customers.es_mayorista`, `customers.descuento_porcentaje`, `grupos_clientes.descuento_porcentaje`, `products.precio_mayorista`.
    - PostgREST recargó el esquema sin reiniciar la API ni interrumpir ventas en Evicamp.
  - **2. Despliegue de aplicación web a producción (Evicamp):**
    - `node ai-scripts/deploy.cjs evicamp`: compilación limpia y 20 archivos subidos exitosamente a `evicamp.duckdns.org`.
  - **3. Git y GitHub:**
    - Fusión limpia de la rama `fase-4-completa` a `main`.
    - `git push origin main` completado con éxito (`b8a2c9a..bd3780f`).
  - **4. Fase que sigue:** Fase 3 (Búsqueda avanzada por Marca, Modelo, Medidas y Laboratorio).

## 29/10/2026 (tarde, 36) · Antigravity
- **Selector en Modales ("Pausar Ticket en Espera" y "Detalle de Proforma / Pedido") y Corrección de Color Claro en Filas:**
  - **1. Modal "Pausar Ticket en Espera" (`ModalNombreEspera.tsx`):**
    - El dueño reportó: *"el selector no funciona ahi"*.
    - Se agregó navegación 2D por teclado con flechas:
      - En el campo de texto `input-nombre-espera`: `ArrowDown` salta a los botones de acción (`btn-confirmar-espera`), `ArrowUp` sube al botón cerrar `[ X ]`.
      - En los botones inferiores: `ArrowLeft` / `ArrowRight` alternan entre `[ Cancelar (Esc) ]` y `[ Guardar (Enter) ]`, `ArrowUp` regresa al campo de texto.
      - En el botón cerrar `[ X ]`: `ArrowDown` regresa al campo de texto.
    - Se implementó Focus Trap determinístico con `Tab` / `Shift+Tab`.
    - Se añadieron anillos de foco de alto contraste (`focus:ring-4 focus:ring-amber-400 focus:border-amber-400 focus:outline-none`) visibles tanto en tema claro como en modo oscuro.
  - **2. Corrección del color de selección claro ("otro error el color es muy claro") en Cotizaciones y Pedidos:**
    - El dueño reportó que en modo oscuro la fila seleccionada se veía con un fondo beige/amarillo claro (`bg-amber-100`) deslumbrante donde el texto blanco no se leía.
    - Se corrigieron `PestanaCotizaciones.tsx` y `PestanaPedidos.tsx` para usar variables CSS nativas del tema:
      - Fila no seleccionada: `bg-[var(--color-surface)] border-transparent hover:bg-[var(--color-bg-2)]`.
      - Fila seleccionada: `bg-[var(--color-bg-2)] border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] shadow-[2px_2px_0_0_black]` con texto nítido de alto contraste.
      - Insignias de estado adaptadas con variables CSS (`var(--color-accent-bg)`, `var(--color-warning-bg)`, etc.) eliminando fondos blancos fijos.
  - **3. Selector por teclado en modal "Detalle de Proforma" y "Detalle de Pedido" ("el selector no funciona aqui"):**
    - En `PestanaCotizaciones.tsx` y `PestanaPedidos.tsx`:
      - Autofoco inicial inmediato al abrir el modal en el primer botón disponible (`[ Convertir en Venta ]` o `[ WhatsApp Cliente ]`).
      - Navegación bidireccional completa con flechas:
        - `ArrowRight` / `ArrowLeft` entre botones de la misma fila (`[ Convertir en Venta ]` ↔ `[ Compartir WhatsApp ]`, `[ Imprimir ]` ↔ `[ Anular Cotización ]`).
        - `ArrowDown` / `ArrowUp` entre la fila superior e inferior, y hacia el botón cerrar `[ X ]`.
      - Focus Trap con `Tab` / `Shift+Tab` para que el cursor no escape ni abra el Sidebar.
      - Botones con anillo de foco dorado brillante de alto contraste (`focus:ring-4 focus:ring-amber-400 focus:border-white focus:brightness-110`).
      - Cuadros de Total y Cuentas adaptados a variables de tema (`bg-[var(--color-bg-2)] border-[var(--color-border)]`) para lectura limpia en modo oscuro.
  - **Validación y despliegue:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (4.03s).
    - `node ai-scripts/deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`). Evicamp y GitHub intactos.
    - `graphify update .` ejecutado.
- **Selector Completo en Cotizaciones, Pedidos y Recuperación de Foco Global tras Modales/Ventanas:**
  - **1. Selector de Grilla en Pestaña Cotizaciones (`PestanaCotizaciones.tsx`):**
    - El selector ya no queda atrapado en el buscador: desde `buscador-cotizaciones`, `ArrowDown` o `Enter` bajan de inmediato a la lista de cotizaciones (`coti-row-0`), y `ArrowRight` pasa a los filtros.
    - Filtros de estado (`TODAS`, `VIGENTE`, `CONVERTIDA`, `VENCIDA`, `ANULADA`): navegación con flechas `ArrowLeft` / `ArrowRight`, `ArrowDown` baja a la primera fila, `ArrowUp` regresa a la barra de pestañas.
    - Filas de cotizaciones (`coti-row-${idx}`): atributo `data-row="true"`, anillo de selector de alto contraste (`focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-100/90 focus:border-[var(--color-ink)]`), flechas `ArrowDown` y `ArrowUp` para recorrer las filas, `ArrowRight` salta al botón `[Ver Detalle]`, y `Enter` abre el modal.
    - Botón `[Ver Detalle]`: `ArrowLeft` devuelve el foco a la fila, `ArrowDown`/`ArrowUp` pasan a los botones de filas contiguas.
  - **2. Selector de Grilla en Pestaña Pedidos (`PestanaPedidos.tsx`):**
    - Exactamente la misma experiencia fluida: `buscador-pedidos` con `ArrowDown` baja a las filas de pedidos y `ArrowRight` a los filtros de estado (`TODOS`, `PENDIENTE`, `ENTREGADO`, `CANCELADO`).
    - Filas con `data-row="true"`, resaltado visual nítido y navegación completa ↑ ↓ ← → y Enter.
  - **3. Recuperación Universal del Selector al Cerrar Modales y Cambiar de Ventana ("si entro y salgo de la ventana no funciona el selector no marca nada"):**
    - En `ventanas.ts`: se expandió `FILA` para reconocer `[id^="coti-row-"]`, `[id^="ped-row-"]`, etc. Al cerrar cualquier modal (`devolver`), si el elemento guardado no existe o el foco quedó en el body, se activa automáticamente el callback de restauración de foco de la sesión activa (`programarRestauracionFoco`).
    - En `App.tsx`:
      - `recordarSeleccionEnVentanas` ahora recibe como fallback universal la restauración de la sesión activa.
      - Se añadió detector de foco de ventana (`window.addEventListener('focus', ...)`) y de clics en vacío (`document.addEventListener('click', ...)`): si el usuario sale a otra aplicación (Alt-Tab / otra ventana de Windows) o hace clic fuera y regresa, el selector se reactiva inmediatamente en la sesión activa sin dejar nada en blanco.
    - En `navegacionSesion.ts`: se añadieron `buscador-cotizaciones` y `buscador-pedidos` y la primera fila activa al orden de prioridad de foco para la sección Clientes.
    - En `Clientes/index.tsx`: al hacer clic o cambiar a cualquier pestaña se auto-enfoca su buscador de inmediato, y se añadieron todos los estados de modales al efecto de restauración.
  - **Validación y despliegue:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (4.06s).
    - `node ai-scripts/deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`). Evicamp y GitHub intactos.
    - `graphify update .` ejecutado.

## 29/10/2026 (tarde, 34) · Antigravity
- **Ajustes de Precios Mayoristas, Selector en Modales y Pago Mixto en Pedidos:**
  - **1. Descuento % sobre Precio Mayorista (`Punto-de-venta/index.tsx`):**
    - Si un cliente es mayorista y el producto tiene precio mayorista (ej. S/ 1.00), el descuento del cliente (-10%) se aplica sobre el precio mayorista (`1.00 - 10% = S/ 0.90`).
    - En `TicketVenta.tsx`: se quitó la etiqueta redundante `-10%` de la línea individual del producto (ya que el ticket lo indica claramente arriba en la cabecera), despejando el espacio del subtotal y stock.
  - **2. Previsualización Real y Selector en Reimpresión de Tickets (`ModalDetalleTicket.tsx`):**
    - Se agregó previsualización visual del ticket de 80mm en pantalla (`TicketImprimible`), con toggle de pestañas: `[ 🧾 Ticket ]` y `[ 📋 Tabla ]`.
    - Selector por teclado corregido: foco inicial directo en `[ 🖨️ Reimprimir Ticket ]`, tecla `P` o `Enter` reimprime; flechas arriba/abajo y Tab permiten saltar entre pestañas, tabla y botón de reimpresión sin trabarse.
    - Llamada de impresión robusta con fallback automático a `window.print()`.
  - **3. Selector por Teclado en Modal Cotizaciones (`ModalCotizacionPOS.tsx`):**
    - Foco inicial inmediato en `input-coti-cliente` con anillo de selector visible (`ring-4 ring-black bg-amber-50`).
    - Navegación bidireccional completa con flechas: arriba/abajo entre filas, izquierda/derecha entre columnas (DNI/RUC ↔ Teléfono, Fecha ↔ Observaciones), Enter para avanzar/guardar, y Focus Trap con Tab.
  - **4. Pago Mixto de Adelanto y Selector en Pedidos (`ModalPedidoPOS.tsx`):**
    - El adelanto de pedidos ahora es **100% mixto**: 3 campos independientes para 💵 Efectivo, 📱 Yape / Plin y 💳 Tarjeta.
    - Se calcula automáticamente el Total Adelanto y el Saldo Pendiente. Se guarda la combinación exacta (`metodo_adelanto: 'MIXTO (Efectivo: S/ ..., Yape: S/ ...)'`).
    - Selector por teclado con navegación izquierda/derecha entre los 3 métodos de pago de adelanto y entre DNI/RUC y Celular.
  - **Validación y despliegue:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (3.72s).
    - `node ai-scripts/deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`). Evicamp intacto.

## 29/10/2026 (tarde, 33) · Antigravity
- **Correcciones y Mejoras de la Fase 4 (Reportadas por el dueño en pruebas):**
  - **Selector y teclado en ModalProducto:**
    - Se agregó `input-precio-mayorista-producto` al Tab trap determinístico (`step2Ids`).
    - Se implementó navegación bidireccional con flechas: desde Precio sugerido `ArrowRight` pasa a Precio mayorista, `ArrowLeft` regresa; flechas verticales conectan fluidamente con fotos (arriba) y Unidad/Stock (abajo).
  - **Cálculo de Descuento Porcentual en POS (`conCantidad`):**
    - Corregido el problema reportado con producto EVELYN (S/ 2.00 con 10% daba S/ 1.00 en vez de S/ 1.80 debido a que el precio mayorista de 1.00 sobreescribía el cálculo). Ahora el descuento % se respeta estrictamente (`Math.round(base * (1 - descPct / 100) * 100) / 100 = S/ 1.80`).
  - **Superposición estética en el Ticket de Caja (`TicketVenta.tsx`):**
    - Corregida la colisión entre el badge de stock (`STK: 1000 UN`), las etiquetas de descuento y el subtotal (`100.00`).
    - Se aplicó `flex-wrap` en la fila de datos y ancho fijo con `whitespace-nowrap pl-1` en la columna del subtotal para evitar todo solapamiento.
  - **Reimpresión de Tickets en Finanzas (`ModalDetalleTicket.tsx`):**
    - Se integró el botón **`[ 🖨️ Reimprimir Ticket ]`** y atajo de teclado tecla `P` en la ventana de detalle de ticket de Finanzas, conectado a `TicketImprimible` y `useImprimir`.
  - **Nuevos registros al principio de las tablas (Clientes, Productos y Lotes):**
    - En Clientes: orden por defecto a `RECIENTES`, consulta con `order('id', { ascending: false })` y adición al inicio del estado (`[{ ...nuevo }, ...prev]`).
    - En Inventario (Productos): orden por defecto a `RECIENTES`, consulta `order('id', { ascending: false })` y al guardar nuevo producto se sitúa en la fila 1 de la página 1.
    - En Lotes: soporte para orden `RECIENTES` y recarga reactiva al inicio.
  - **Todos los datos de precios en tabla de inventario (`TablaProductos.tsx`):**
    - La columna de precios ahora muestra: Precio regular, Precio mayorista (`⭐ May: S/ XX.XX`), Escalas por cantidad (`x6+: S/ XX.XX`) y Presentaciones (`CAJA x12: S/ XX.XX`).
  - **Validación y despliegue:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (3.58s limpio).
    - `deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`). Evicamp y GitHub intactos.

## 29/10/2026 (tarde, 32) · Antigravity
- **Renombrado de Base de Datos de Pruebas en VPS: `siuhub` ➔ `siumax`:**
  - **Solicitud del dueño:** *"quiero que mi base de datos se llame siumax"*.
  - **Confirmación interactiva:** el dueño eligió expresamente renombrar la base de datos de pruebas `siuhub` (que alimenta el sitio `siumax.duckdns.org` en el puerto 3001) para que coincida con el nombre del sistema. La base de producción `postgres` (Evicamp, puerto 3000) permanece intacta.
  - **Procedimiento técnico en VPS:**
    - Respaldo de seguridad previo: `/var/lib/postgresql/respaldo-siuhub-antes-renombrar-siumax-2026-10-29T20-52-20-830Z.dump` (369 KB).
    - Detención de servicio `postgrest_siuhub` y cierre de conexiones activas.
    - Ejecución en PostgreSQL: `ALTER DATABASE siuhub RENAME TO siumax;`.
    - Actualización de `/etc/postgrest_siuhub.conf`: `db-uri = ".../siumax"`.
    - Reinicio de `postgrest_siuhub.service` y verificación de estado (activo y corriendo).
  - **Verificación en siumax:**
    - Datos verificados en base `siumax`: 25 clientes, 218 productos intactos.
    - API PostgREST y webapp en `https://siumax.duckdns.org` respondiendo OK (código 200).
    - Cron diario de respaldo `/opt/siuhub/backup.sh` detecta `siumax` automáticamente.
  - **Scripts de servidor y pruebas actualizados:**
    - `servidor/nuevo-cliente.sh` y `servidor/activar-seguridad.sh` actualizados y subidos a `/opt/siuhub/`.
    - `ai-scripts/clave-pruebas.cjs` y 27 scripts de pruebas en `ai-scripts/pruebas/` actualizados de `-d siuhub` a `-d siumax`.
  - **Documentación actualizada:** `docs/MEMORIA-IA.md`, `docs/PLAN-SIUMAX-COMERC.md`, `docs/CONVERSACIONES.md` y esta bitácora.
  - **Evicamp y GitHub:** 100% intactos conforme a la regla 4 del proyecto.

## 29/10/2026 (tarde, 31) · Antigravity
- **Implementación de Descuento Porcentual Fijo por Cliente o Empresa (Extensión Fase 4.4):**
  - **Decisión del dueño:** ante la consulta sobre precios especiales para empresas/familias vs precio mayorista general, el dueño eligió la Opción 2: *"Descuento % fijo por cliente o empresa (Ej: 10% de descuento en todo a Constructora ABC, muy fácil de mantener y actualizar)"*, y confirmó *"si hazlo"*.
  - **Base de datos (`siuhub` / siumax):**
    - `customers.descuento_porcentaje numeric(5,2) DEFAULT 0`.
    - `grupos_clientes.descuento_porcentaje numeric(5,2) DEFAULT 0`.
    - `NOTIFY pgrst, 'reload schema'` ejecutado con éxito en PostgreSQL.
    - Scripts `seguridad-sesion.sql` y `deshacer-fase4-completa.sql` actualizados.
  - **Frontend desarrollado:**
    - `ModalFichaCliente`: input de porcentaje y botones de acceso rápido `[ 0% ]`, `[ 5% ]`, `[ 10% ]`, `[ 15% ]`, `[ 20% ]`.
    - `ModalFormGrupo`: input de porcentaje y botones de acceso rápido para empresas/familias.
    - `ModalGrupo`: visualiza `🏷️ XX% DCTO` en el encabezado del grupo.
    - `ModalDetalleCliente`: visualiza `🏷️ DESCUENTO ESPECIAL: XX%` (especificando si es individual o si lo hereda de su empresa).
    - `PestanaClientes`: pastilla `🏷️ XX% DCTO` junto al nombre del cliente en el directorio general.
    - `ModalElegirClientePOS`: carga grupos y calcula el descuento efectivo por herencia (`Math.max(cliente, grupo)`), mostrando insignias en cada fila.
    - `Punto-de-venta/index.tsx`: función `conCantidad` aplica el descuento a los productos (si el producto tiene además un precio mayorista menor y el cliente es mayorista, aplica el menor). Efecto reactivo recalcula el ticket en tiempo real al seleccionar o retirar el cliente.
    - `TicketVenta`: muestra `🏷️ XX% DCTO` en la cabecera y `🏷️ -XX%` en cada línea de producto con descuento aplicado.
    - `TerminalBusqueda`: muestra badge en el botón de cliente y muestra el precio rebajado en verde con el precio regular tachado en cada tarjeta de producto.
  - **Despliegue y validación:**
    - `npx tsc -b` (0 errores).
    - `npm run build` (3.59s, limpio).
    - `node ai-scripts/deploy.cjs siumax` (20 archivos subidos a `siumax.duckdns.org`).
    - `graphify update .` ejecutado.
    - **Evicamp (producción) y GitHub permanecen intactos** conforme a la regla 4 del proyecto.

## 29/10/2026 (tarde, 30) · Antigravity
- **Implementación completa de Fases 4.4 (Precio Mayorista), 4.5 (Cotizaciones) y 4.6 (Pedidos por encargo) en pruebas:**
  - **Autorización explícita del dueño:** *"si vamos hacer la 4.4, 4.5 y 4.6"*.
  - **Respaldo de base de datos de pruebas (`siuhub` en VPS):**
    - `/var/lib/postgresql/respaldo-siuhub-antes-fase4-completa-2026-10-29T19-08-24-497Z.dump` (204K).
    - Script para deshacer creado en `servidor/sql/deshacer-fase4-completa.sql`.
  - **Base de datos (`siuhub` / siumax):**
    - `customers.es_mayorista boolean DEFAULT false`.
    - `products.precio_mayorista numeric(12,2)`.
    - Trigger `fn_proteger_precios()` actualizado para proteger `precio_mayorista` contra cambios no autorizados.
    - Tablas `cotizaciones` y `cotizacion_detalles` con índices y permisos a `anon`.
    - Tablas `pedidos_clientes` y `pedido_detalles` con índices y permisos a `anon`.
  - **Frontend desarrollado:**
    - **Fase 4.4 (Precio Mayorista):**
      - Ficha de cliente con toggle brutalista `ficha-es-mayorista` operable con teclado y mouse.
      - Pestaña Clientes muestra badge `⭐ MAYORISTA` junto al nombre.
      - Modal de producto con campo `input-precio-mayorista-producto`.
      - Tabla de inventario muestra precio mayorista `⭐ May: S/ XX.XX` cuando existe.
      - Caja POS: detecta clientes mayoristas, recalcula automáticamente los precios del ticket hacia el precio mayorista (o revierte a regular si se deselecciona), y muestra la insignia `⭐ MAYORISTA` en el ticket.
    - **Fase 4.5 (Cotizaciones / Proformas):**
      - Botón `Cotización (F7)` en el ticket de caja.
      - Modal `ModalCotizacionPOS` con emisión correlativa (`COT-XXXX`), fecha de vencimiento por defecto (7 días) o configurable, cliente y detalle. **No descuenta stock**.
      - Soporte para envío directo a WhatsApp e impresión de proforma.
      - Pestaña `Cotizaciones` en la sección Clientes con filtros por estado (`TODAS`, `VIGENTE`, `CONVERTIDA`, `VENCIDA`, `ANULADA`), selector de teclado, modal de detalle y botón **`Convertir en Venta`** (carga los productos en la caja POS y navega a la venta; al concretar el cobro en POS la marca automáticamente como `CONVERTIDA`).
    - **Fase 4.6 (Pedidos por encargo):**
      - Botón `Pedido (F8)` en el ticket de caja.
      - Modal `ModalPedidoPOS` con correlativo (`PED-XXXX`), fecha y hora prometida de entrega, registro de adelanto opcional (Efectivo/Yape/Tarjeta) y cálculo automático de saldo pendiente.
      - **Reserva de stock inmediata** (decisión del dueño): descuenta el stock de inmediato de `products` y registra movimiento `RESERVA_PEDIDO` en `inventory_movements`. Si hubo adelanto en efectivo, registra ingreso en la caja abierta.
      - Pestaña `Pedidos` en la sección Clientes con alertas visuales de fecha (`¡ENTREGA HOY!` o `FECHA PASADA`).
      - Botón **`Entregar y Cobrar Saldo`**: liquida el saldo restante en caja y marca `ENTREGADO`.
      - Botón **`Cancelar (Devolver Stock)`**: devuelve automáticamente los productos reservados a `products.quantity` con movimiento `CANCELACION_PEDIDO` y marca `CANCELADO`.
  - **Validación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 3.57s.
    - `deploy.cjs siumax`: subido con éxito a `siumax.duckdns.org` (20 archivos).
    - `graphify update .`: grafo actualizado con 2238 nodos y 4480 relaciones.
    - **Evicamp (producción) y GitHub intactos** respetando la regla 4 (solo se subirá cuando el dueño dé su orden explícita).
- **Siguiente paso:** Avisar al dueño para que revise las 3 nuevas funciones en `siumax.duckdns.org`.

---

## 29/10/2026 (tarde, 29) · Antigravity
- **Pase a producción oficial en Evicamp y GitHub de la Fase 4.3:**
  - **Autorización explícita del dueño:** *"si sube el 4.3 a evicamp y a siumax y a mi github y luego avanza la propuesta 4.4"*.
  - **Base de datos en Evicamp (Regla 7):**
    - Respaldo de seguridad ejecutado antes de tocar la base: `/var/lib/postgresql/respaldo-evicamp-antes-fase4-3-2026-10-29T18-57-43-392Z.dump` (1.9 MB).
    - `servidor/sql/seguridad-sesion.sql` aplicado con `psql` y `SET lock_timeout = '5s'` en base `postgres` (Evicamp).
    - Verificación exitosa: columna `dias_plazo integer` agregada a `customers`.
    - Cero reinicios de API (`activar-seguridad.sh` intacto, sin cortes en caja).
  - **Despliegue del Frontend:**
    - `node ai-scripts/deploy.cjs todos` ejecutado exitosamente en `evicamp`, `siumax` y `clientes` (20 archivos cada uno).
  - **GitHub:**
    - Rama `fase-4.3` fusionada a `main` (merge commit ort).
    - `git push origin main` completado con éxito a `https://github.com/hrhprogra-glitch/Evicamp.git`.
- **Siguiente paso:** Presentar la propuesta de la Fase 4.4 (Precio Mayorista) y esperar el visto bueno del dueño.

---

## 29/10/2026 (tarde, 28) · Antigravity
- **Corrección de tope en la paginación inferior de Clientes:**
  - **Solicitud del dueño:** *"encontre otro error cuando bajo hasta abajo para selecionar la siguiente pagina pero de la parte de abajo sube hasta arriba deberia mantenerse ahi como un tope"*
  - **Causa:** En la paginación inferior, al presionar Flecha Abajo ⬇️ o Flecha Derecha ➡️ desde el botón de página siguiente, el código llamaba a `irA('buscador-clientes')` ciclando hacia arriba, lo que provocaba un scroll brusco de la ventana hacia arriba.
  - **Solución (`PestanaClientes.tsx`):**
    - Se eliminó el salto al buscador en la paginación inferior. Ahora actúa como un **tope firme**.
    - Con Flecha Abajo ⬇️ en el pie: se queda en el botón actual sin mover la ventana.
    - Con Flecha Derecha ➡️ en el botón siguiente: se queda en el botón como tope.
    - Con Flecha Izquierda ⬅️ en el botón anterior: se queda como tope.
    - Entre los botones `<` y `>` se navega con normalidad.
    - Al presionar `Enter` o `Espacio` para cambiar de página, se preserva el foco en el botón de abajo con `setTimeout(() => irA(id), 30)` para que la ventana no salte.
  - **Validación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 4.08s.
    - `deploy.cjs siumax`: subido a `siumax.duckdns.org` (20 archivos).
    - `graphify update .`: grafo de conocimiento actualizado.
- **Siguiente paso:** Avisar al dueño para que verifique el tope en siumax.

---

## 29/10/2026 (tarde, 27) · Claude — Videos tutoriales (fuera de Comerc)
- **El dueño pidió** videos tutoriales del sistema por partes, priorizando los videos.
  Aprobó cargar datos de ejemplo y hacer primero un video de muestra.
- **Base demo aparte en el VPS: `siudemo`.** Para no ensuciar siumax ni sus pruebas.
  - Estructura copiada de siuhub y empresa "BODEGA LA ESQUINA", con usuario `demo@siumax.com` (Rosa, administradora).
  - Datos: 35 productos de bodega, lotes, 3 proveedores, 6 clientes, 87 ventas de la semana, 6 fiados y la caja de hoy abierta.
  - **API solo interna** (puerto 3199 en 127.0.0.1, unidad temporal `siudemo-api`), sin link público, nginx ni certificado.
  - No está en el registro de clientes ni en el Panel.
- **Grabador** en `D:\Programación\siumax\videos\grabador` (no está en git; ver su LEEME.md).
  - Sirve en localhost una copia de la pantalla de siumax conectada a siudemo por un túnel SSH.
  - Graba con Edge sin ventana y ffmpeg: MP4 1920x1080 con portada, textos por paso, resaltes, teclas en pantalla y cierre con el WhatsApp 955 476 689.
- **Muestra hecha:** `videos/02-como-hacer-una-venta.mp4` (75 s, 6 MB), esperando que el dueño la revise.
- **Siguiente:** con su OK, los demás tutoriales:
  1 Conociendo SiuMax, 3 Agregar productos, 4 Entradas/salidas, 5 Fiados, 6 Caja, 7 Proveedores, 8 Conteos, 9 Configuración.

## 29/10/2026 (tarde, 26) · Antigravity
- **Corrección de flujo del selector por teclado en paginación superior e inferior:**
  - **Solicitud del dueño:** *"perfecto pero falta que el selector pase por la siguiente pagina como tambien la de abajo el selector no pasa por ahi"*
  - **Diagnóstico:**
    1. En la paginación superior, la navegación vertical se saltaba los controles si `totalPaginas === 1` o iba siempre directo a "página anterior", impidiendo que el selector pasara cómodamente por el botón de "siguiente página" (`>`).
    2. En la última fila de la tabla, al presionar Flecha Abajo ⬇️, no se realizaba `scrollIntoView` al botón de paginación inferior y el estilo de foco (`focus:ring-[var(--color-ink)]`) era prácticamente invisible en pantalla.
    3. En los botones inferiores, Flecha Abajo ⬇️ no tenía acción de escape y quedaba muerto.
  - **Cambios realizados (`PestanaClientes.tsx`):**
    1. **Resaltado Neobrutalista del Selector:** Los botones de paginación ahora usan `claseBotonPag` con `focus:bg-[var(--color-accent)] focus:text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:shadow-[2px_2px_0_0_var(--color-ink)]`. Al posar el selector, se iluminan inmediatamente en amarillo neón brillante con texto negro y sombra brutalista.
    2. **Desplazamiento automático (`scrollIntoView`):** La función `irA` ahora incluye `.scrollIntoView({ block: 'nearest' })`, asegurando que la ventana acompañe al selector al saltar a la paginación inferior o a los extremos.
    3. **Paginación Superior:**
       - Desde la barra arriba (Buscador/Filtros/Nuevo Cliente), Flecha Abajo ⬇️ desciende a la paginación superior sin saltarse los botones.
       - Flecha Derecha ➡️ pasa de Anterior (`<`) a Siguiente (`>`).
       - Flecha Izquierda ⬅️ pasa de Siguiente (`>`) a Anterior (`<`).
       - Flecha Abajo ⬇️ desde cualquiera de los dos botones desciende directamente a la primera fila de la tabla.
    4. **Paginación Inferior:**
       - Desde la última fila de la tabla, Flecha Abajo ⬇️ salta directamente a la paginación inferior (enfocando preferentemente "Siguiente página" `#btn-pagina-sig-clientes` o "Anterior").
       - Navegación bidireccional fluida con Flecha Izquierda ⬅️ y Derecha ➡️ entre `<` y `>`.
       - Flecha Arriba ⬆️ sube a la última fila de la tabla.
       - Flecha Abajo ⬇️ cicla hacia arriba al buscador, garantizando que el usuario nunca quede atrapado.
       - Presionar `Enter` o `Espacio` en los botones ejecuta el cambio de página instantáneo.
  - **Validación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 5.1s.
    - `deploy.cjs siumax`: subido exitosamente a `siumax.duckdns.org` (20 archivos).
    - `graphify update .`: grafo de conocimiento actualizado.
- **Siguiente paso:** Notificar al dueño para que verifique la navegación con las flechas en siumax.

---

## 29/10/2026 (tarde, 25) · Antigravity
- **Ajustes en tabla de Clientes (columna Plazo, scroll general y paginación doble):**
  - **Solicitud del dueño:** *"en la tabla no sale los dias de plazo como sabre cuantos tiene y otra cosa mas el scrooll tiene que ser de la ventana general como tambien falta para pasar a la pagina siguiente arriba como tambien al final agrega eso tiene que mostrar por lo menos 50 clientes por pagina"* (captura mostrando la tabla con scroll interno marcado en rojo).
  - **Cambios realizados:**
    1. **Columna "Plazo":** Se añadió una columna dedicada `Plazo` en la cabecera y filas de la tabla de clientes (`PestanaClientes.tsx`). Si el cliente tiene plazo configurado, muestra una pastilla informativa visible (ej. `15 días`). Si no tiene, muestra `—`.
    2. **Scroll de la ventana general:** Se removió `lg:h-full` de `Clientes/index.tsx` y de `PestanaClientes.tsx`, y se cambió el contenedor de la tabla a `w-full overflow-x-auto custom-scrollbar` eliminando el scroll vertical interno atrapado. Ahora la tabla fluye libremente y se desplaza con el scroll principal de la ventana general.
    3. **Paginación arriba y al final:** Se implementó la barra de paginación tanto arriba de la tabla (`#btn-pagina-ant-clientes-arriba`, `#btn-pagina-sig-clientes-arriba`) como abajo al pie (`#btn-pagina-ant-clientes`, `#btn-pagina-sig-clientes`), sincronizadas y con navegación completa por teclado.
    4. **50 clientes por página:** Configurado en `POR_PAGINA = 50`.
  - **Validación y Despliegue:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 3.7s.
    - `deploy.cjs siumax`: subido a sitio de pruebas `siumax.duckdns.org`.
    - `graphify update .`: grafo de conocimiento actualizado.
- **Siguiente paso:** Notificar al dueño para que revise los cambios en siumax.

---

## 29/10/2026 (mañana, 24) · Antigravity
- **Fase 4.3 completada y desplegada en siumax (pruebas): Días de plazo en clientes y fecha límite calculada en caja (SIN límite de crédito):**
  - **Decisión del dueño:** *"todo excepto el límite de crédito ahora si arranca"* y *"no quites lo de escoger fecha porque eso le gustó a mis clientes"*.
  - **Base de datos (siuhub - VPS):**
    - Respaldo de siuhub antes de tocar: `/var/lib/postgresql/respaldo-siuhub-antes-fase4-3.dump` (203K).
    - `servidor/sql/seguridad-sesion.sql`: agregada columna `ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS dias_plazo integer; NOTIFY pgrst, 'reload schema';`.
    - Script de reversión creado: `servidor/sql/deshacer-fase4-3.sql`.
    - Migración ejecutada exitosamente en `siuhub` (PostgreSQL puerto 3001).
  - **Frontend / Pantallas:**
    - `src/sections/Clientes/types.ts`: agregado `diasPlazo?: number;` a la interfaz `Cliente`.
    - `src/sections/Clientes/components/ModalFichaCliente.tsx`: nuevo campo "Días de plazo para pagar" (`#ficha-dias-plazo`, ej. 7, 15, 30 días, numérico) con navegación completa por teclado (Enter, flechas ↑ ↓ ← →).
    - `src/sections/Clientes/index.tsx`: mapeo de `diasPlazo` desde `c.dias_plazo` y guardado tanto en actualización como en creación de clientes.
    - `src/sections/Clientes/components/ModalDetalleCliente.tsx`: se muestra en la cabecera `Plazo acordado: X días`.
    - `src/sections/Clientes/components/PestanaClientes.tsx`: badge visible `Xd plazo` en la fila del cliente. Alerta `Vencido` en rojo si el cliente tiene fiados pendientes vencidos a la fecha de hoy.
    - `src/sections/Punto-de-venta/components/ModalCobro.tsx`:
      - El selector de fecha (`#fiado-fecha`) se mantuvo **100% intacto y funcional**.
      - Al seleccionar un cliente con días de plazo configurados, el sistema calcula automáticamente la fecha de vencimiento (`hoy + dias_plazo`).
      - Si el cliente no tiene plazo configurado, por defecto propone 1 día (mañana) como antes.
      - Se agregaron botones rápidos `+7d`, `+15d`, `+30d` para fijar la fecha con un clic sin borrar el selector nativo.
      - Alerta visual en caja si el cliente seleccionado tiene créditos vencidos pendientes de pago (`⚠ Tiene deudas vencidas`) y monto de deuda pendiente actual.
  - **Validación y Pruebas:**
    - `npx tsc -b`: 0 errores.
    - `npm run build`: compilación limpia en 3.6s.
    - `deploy.cjs siumax`: subido a sitio de pruebas `siumax.duckdns.org` (20 archivos).
    - `graphify update .`: grafo de conocimiento actualizado.
- **Siguiente paso:** Mostrar los resultados al dueño para que lo pruebe en siumax y decida si da el visto bueno para subir a Evicamp (producción).

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
