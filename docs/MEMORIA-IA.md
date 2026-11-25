# Memoria del proyecto para cualquier IA

> Esto es lo que Claude aprendió trabajando con el dueño desde octubre de 2026: cómo es él, cómo está armado todo,
> cómo se trabaja, cómo se prueba y **los errores que ya se cometieron, para no repetirlos**.
> Léelo junto con `AGENTS.md`, `docs/BITACORA.md` y `docs/PLAN-SIUMAX-COMERC.md`.
> Si aprendes algo nuevo importante, agrégalo aquí.
> **Nunca escribas aquí contraseñas ni claves:** viven en `.env.vps`, que no se sube a git.

---

## 25/11/2026 — Fusionar salidas: badge en la lista y clic en la fila sin romper el teclado
- El badge de una salida ya fusionada se arma con el `fusion` que `fetchSalidas` adjunta a cada `Salida`; no hace falta una consulta nueva en la ventana. Ponerlo junto al código (`badge-fusion-lista-${id}` + `data-fusion-codigo-lista`) deja que la prueba lo encuentre sin depender del texto que el CSS pone en mayúsculas.
- Si el `<tr>` recibe `onClick` para elegir, el `<button>` de la casilla debe llamar `e.stopPropagation()`: si no, un solo clic alterna dos veces y parece que el cuadrito no funciona.
- **Trampas de la prueba ampliada:** el id interno de `SAL-1547` es **398** y el de `SAL-1548` es **399**; buscar `tr[data-fila-fusion="1547"]` no encuentra nada. Buscar la fila por su código y sacar de ella el `id` y el `id` del botón. Después de `page.click`, el foco queda en el cuadro, no en el buscador: volver a `page.focus('#buscador-fusionar-salidas')` antes de probar ↑/↓ o la prueba mide el movimiento desde el lugar equivocado y acusa un fallo que no existe.
-Estado: `npx tsc -b` EXIT 0, build **`index-C2jeYVUH.js`**, deploy solo Nego, prueba **158/158** con teclado, sin internet externo y 390/768/1366/1920. Commit local sin push; Evicamp, ecosistema, panel y GitHub esperan un OK nuevo. El grupo de ejemplo `FUS-0001 (398, 399)` se dejó intacto.

## 25/11/2026 — Persistencia del GENERAL: copiar la definición de permisos en vivo y no perder el grupo al recargar
- Para tocar `fn_permisos_servicios` en Nego, **copiar primero `pg_get_functiondef()` desde la base en vivo** y añadir solo las rutas nuevas. Las copias en `servidor/sql/seguridad-sesion.sql` y en `eliminar-devolucion-salida.sql` están desactualizadas: sobrescribir con ellas borra permisos que hoy sí existen. En Nego **no hay rol `authenticated`**: los GRANT van solo a `anon`.
- `setval(seq, 0, true)` falla porque el mínimo de la secuencia es 1: para un SQL repetible con tabla vacía usar `setval(seq, 1, false)`; si ya hay filas, `setval(seq, max, true)`.
- El badge y el botón de la tabla necesitan el grupo **en el objeto `Salida`**, no solo en estado aparte: `fetchSalidas` consulta `salida_fusiones` con el join a `salida_fusion_items`, arma `salida_ids`/`salida_codigos` y lo adjunta a cada salida. Un `ref` (`fusionesRef`) evita que el `onReload` del detalle —que recarga **una sola** salida— le quite el grupo al objeto mostrado.
- **Trampa de teclado encontrada por la prueba:** si el `<tr>` con `tabIndex` hace `preventDefault()` en `Enter`, el navegador **no genera el clic del `<button>` hijo**. En `alTeclearFila`, saltar cuando `(e.target as HTMLElement).closest('button')` para que «Ver» y «General» respondan a Enter.
- `useCerrarConEscape` ya apila ventanas: abrir el GENERAL desde el detalle y dar Escape cierra solo la fusión. La prueba debe comprobar ambos contenedores.
- Para probar persistencia sin internet externo: `setRequestInterception(true)` y dejar pasar solo el dominio del sitio; a diferencia del modo offline, esto **sí permite las RPC** de guardar/desvincular.
- Estado: SQL aplicado solo en `siumax`, build `index-Pavf8IjW.js`, deploy solo Nego, pruebas **48/48 + 142/142 + 66/66**, commit local sin push. Grupo de ejemplo **FUS-0001 (SAL-1547, SAL-1548)** dejado en la base para la revisión visual.

## 25/11/2026 — Fusionar salidas: GENERAL de solo vista, y trampas de la prueba que lo valida
- El dueño eligió **«Solo vista»** y **«En Nueva salida»** y aprobó con **«empieza»**. Eso significa: **no crear salida, no descontar stock dos veces**; el GENERAL es una `Salida` sintética de código `GENERAL` armada en memoria con la lista ya cargada. Reutilizar `VistaPreviaSalida` evita hacer otro comprobante.
- «Devolver todo» no es una RPC global: hay que **agrupar por salida** y llamar `fn_registrar_devoluciones_lote` una vez por cada una, con cantidades `Math.min(escrito, pendiente)`. Así lo ya devuelto no se cuenta dos veces. Una sola confirmación y, en la prueba, **cancelarla** (`#dialogo-sistema-cancelar`) para no tocar datos ni stock.
- El botón nuevo comparte cabecera con el de cerrar: hay que apilar Escape (`useCerrarConEscape(isOpen && !salidaParaPrevia && !fusionOpen, ...)`) o Escape cerraría el formulario de atrás en vez de la ventana de arriba.
- **Trampas de la prueba nueva**, todas detectadas antes de culpar al código: (1) `.ventana-cabecera__subtitulo` sin prefijo encuentra la ventana de **atrás**; (2) `input[data-nav-fusion]` incluye fecha y motivo, no solo las cantidades, así que «la flecha no cambia el valor» leía el motivo; (3) si no se escribe cantidad, «Devolver todo» avisa «Escribe la cantidad…» y **no abre confirmación**; (4) el CSS `uppercase` convierte «Elige» en «ELIGE», mejor contar `aria-pressed`/el contador que comparar texto.
- El alcance era **solo Nego**: no Evicamp, ecosistema, panel ni GitHub, y sin tocar los 4 `MAL` preexistentes de `select-bien-salida`. `.env.vps` del repo principal (`8562F26AD7`) sigue sin autenticar; usar la copia conocida (`BBF98048CC`). Verificar marcadores **dentro del JS servido**, porque otro agente puede sobrescribir el bundle.

## 25/11/2026 — Salidas en pantallas pequeñas: medir antes, aislar el worktree y verificar el bundle servido
- El dueño pide **adaptar a distintos tamaños de pantalla**, no hacer scroll horizontal. En 1366 px la lista medía **1547 px** y `VER`/`ESTADO` quedaban fuera; en 1920 px entraba. Medir con Puppeteer antes de cambiar CSS evita adivinar anchos.
- El repo principal tiene **WIP ajeno en `TablaSalidas.tsx`**: no sobrescribirlo. Se trabajó en un worktree nuevo desde `d0d4549` (commit del bundle que servía Nego), con `node_modules` junction y copia conocida de `.env.vps` (MD5 corto `BBF98048CC`); la del repo principal (`8562F26AD7`) no autentica.
- **Trampa real:** el primer deploy se hizo bien pero otro trabajo desplegó después desde `pase-todos` y el sitio sirvió su bundle viejo (`C9Qd50Qv`), aunque local existía el nuevo (`CJhKMreh`). Siempre comprobar `index.html` en vivo y comparar el nombre del bundle con `dist/index.html` antes de creer una prueba fallida. La prueba debe usar `page.setCacheEnabled(false)`.
- Arreglo que funcionó: tabla `table-layout: fixed` con porcentajes entre 1101–1366 px y tarjetas con `td::before { content: attr(data-etiqueta) }` hasta 1100 px; se conservan ids, teclado, columnas y lógica. Prueba `verificar-salidas-pantalla-pc.mjs`: **51 OK, 0 fallos** en 390/768/1024/1280/1366/1920.
- El dueño autorizó **«si»** solo para Nego. Ecosistema, Evicamp, clientes y push requieren un OK nuevo en esa tanda; el oficial además necesita reponer iconos después de desplegar. Después dijo **«tienes que actualizarlo a evicamp y ecosistema y github y panel para mis clientes que pagan»**: ese OK cubre los cuatro destinos y el push en la misma tanda.
- Si el VPS pone fail2ban y cierra el puerto 22 (`Test-NetConnection` da falso mientras la web responde 200), **no insistir**: cada intento fallido solo consume tiempo; esperar a que se abra. Con SSH frágil conviene `node ai-scripts/deploy.cjs todos` (explícito, un solo build y una sola conexión) y después reponer iconos del oficial. Nunca `deploy.cjs` sin argumento.
- Los clientes nuevos no tienen URL propia: su frontal es la carpeta compartida `/var/www/siuhub-app/html`; verificarla por SSH con `grep` sobre su `index.html` y sus assets (script `verificar-bundle-clientes.cjs`). Bundle final de esta tanda: **`index-BeIFa2v-.js` / `index-CnaKqhb9.css`** en Nego, Evicamp, ecosistema y clientes.

## 25/11/2026 — «No sale ningún usuario» puede ser una vista que falta, no usuarios que faltan
- El dueño avisó de urgencia que en Gestión de Usuarios no aparecía nadie. **Antes de crear usuarios**, mirar la API: en ecosistema daba `HTTP 404 relation "public.empleados_publico" does not exist`; la tabla `empleados` tenía 3 filas. La pantalla (`TablaUsuarios.tsx`) lee la **vista** `empleados_publico`, no la tabla. Crear usuarios «para que salga algo» habría sido inventar datos y ocultar la causa real.
- Esa vista existe en `siumax`, `postgres`, `servic` y `siudemo`; en `evidiary` y `creditaltoque` no hay tabla `empleados`. Revisar **todas las bases (solo lectura)** antes de escribir: el arreglo fue **solo ecosistema**.
- La vista debe exponer `id, nombre, email, rol, estado, permisos, created_at` y **nunca** `password` ni `password_hash`, con `GRANT SELECT` a `anon` y `web_anon`, `SET lock_timeout='5s'`, respaldo `pg_dump -Fc` previo y `NOTIFY pgrst, 'reload schema'` (nunca reiniciar la API). Quedó en `servidor/sql/crear-vista-empleados-publico.sql`.
- **Firmas de las RPC de usuarios (para pruebas):** `fn_editar_empleado` y `fn_eliminar_empleado` devuelven **boolean**; `fn_crear_empleado` devuelve el **uuid nuevo**. Asignarlas a `jsonb` o a `boolean` según corresponda; si no, dan `invalid input syntax for type json/jsonb` o `invalid input syntax for type boolean` y parece que la función está rota.
- Probar siempre dentro de `BEGIN; … ROLLBACK;` y verificar al final los conteos originales: se editó/borró/creó un usuario temporal y después quedaron los 3 originales. No guardar claves de prueba en la base ni en docs.
- «Soluciona eso urgente» autorizó corregir la base, **no** hacer push ni desplegar: commit local y avisar al dueño para que revise con **Ctrl+F5**. Además, Nego solo tiene `admin@siumax.com`: no crear usuarios allí sin su lista, roles y claves.

## 25/11/2026 — Llevar un cambio a todos: comparar permisos antes de copiar SQL, y parametrizar las pruebas
- Un «sube todo» del dueño autoriza **los cuatro destinos y el push** a la vez; no hace falta volver a preguntar por GitHub. Aun así, **primero Nego y luego los demás con destino explícito** (`deploy.cjs siumax|ecosistema|evicamp|clientes`), nunca `deploy.cjs` sin argumento. Después de ecosistema, reponer los iconos (`restaurar-iconos-ecosistema.cjs`, md5 `c159d216…`).
- **No copiar SQL de permisos a ciegas:** `fn_permisos_servicios` se reescribe completo; antes de aplicar el mismo archivo en otra base, comparar `pg_get_functiondef('public.fn_permisos_servicios(text,text)'::regprocedure)` contra Nego. En ecosistema y Evicamp solo difería la ruta nueva. Revisar también qué bases tienen las tablas: `servic` (API apagada), `siudemo` (sin `salida_devoluciones`), `creditaltoque` y `evidiary` (sin tablas de Salidas) quedaron intactos. Los clientes nuevos comparten la API `postgrest-cliente@ecosistema` (base `ecosistema`), así que no hay una base por cliente que parchear.
- **Una prueba escrita para un sitio debe parametrizarse antes de repetirla:** `verificar-eliminar-devolucion.cjs` pasó a aceptar `siumax|ecosistema|postgres`, y `verificar-x-devolucion-nego.mjs` acepta `nego|ecosistema` con URL, base, usuario y limpieza propios (incluida la eliminación de `inventory_movements` con `"user" = <marca>`). En Evicamp no hay material con stock: reportar `SIN DATOS` (función y permiso verificados) en vez de marcar `MAL`, para no confundir «sin datos» con «roto».
- **Cifras fijas en pruebas viejas:** `verificar-cambios-ecosistema.mjs` exigía `1430 M` para el `100322`, pero el stock real pasó a `1875 M` por devoluciones legítimas (`SAL-MIG-00391`, `+444` y `+1` el 25/11 a las 05:08). Verificar el movimiento en `inventory_movements` **antes** de culpar al cambio; la aserción debe comprobar la unidad (`Stock: N M`), no un número congelado. No se corrigió el stock.
- Estado: X probada **13/13 en Nego y 13/13 en ecosistema**, base TODO OK en Nego/ecosistema y SIN DATOS en Evicamp, regresiones 23/23 y 26/26, bundle `index-DbHORBcM.js` en los 4 destinos, respaldos con fecha en ecosistema y Evicamp, commit y push autorizados a `origin/fase-11-sunat`.

## 25/11/2026 — Si el dueño dice «solo una X», quita hasta la palabra del texto del botón
- El dueño necesita **borrar una devolución ya registrada por error para volver a hacerla**. Dijo *"que no diga anular que solo sea una x mas sencillo"*: en pantalla solo la **X** (`btn-eliminar-devolucion-${d.id}`) y la confirmación dice «eliminar devolución». El nombre interno `fn_eliminar_devolucion` y el movimiento `ANULACION` en negativo son **de la base**, no del texto visible. Cumplir el estilo pedido literalmente, igual que se hizo con «solo lectura» en la 228.
- Deshacer una devolución son **tres escrituras a la vez**: bajar `cantidad_devuelta` del ítem, descontar `products.quantity` y `batches.quantity`, y borrar la fila de `salida_devoluciones`. Dejar además un movimiento de inventario en negativo para no borrar el historial real del almacén. Bloquear la devolución y el ítem con `FOR UPDATE`, validar que `cantidad_devuelta >= cantidad` y dar error claro si la fila ya se fue (evita el doble clic).
- La ruta `/rpc/fn_eliminar_devolucion` entra en `fn_permisos_servicios` con **`salidas_crear`** y `GRANT EXECUTE ... TO anon` (en Nego **no existe** el rol `authenticated`). Recrear la función de permisos copiando **el CASE completo vigente** y agregando la ruta: si se copia un SQL viejo se pierden reglas de clientes, caja y cotizaciones. Solo `NOTIFY pgrst, 'reload schema'`, nunca reiniciar la API.
- Siempre con respaldo `pg_dump -Fc` previo y `SET lock_timeout='5s'`; en esta tanda el respaldo fue `/var/lib/postgresql/respaldo-siumax-antes-eliminar-devolucion-2026-11-25T05-33-45-365Z.dump`.
- **Trampa de la prueba de pantalla:** tras filtrar por código en el buscador de Salidas hay que pulsar **`ArrowDown` dos veces** antes de `Enter` para abrir el detalle (con una sola no aparece `#btn-abrir-devoluciones`). Los avisos de la app se cierran con `Enter` en `#dialogo-sistema-aceptar`, no con `window.alert`.
- **No toda prueba que falla es una regresión:** `prueba-detalle-salida-228.mjs` sigue contando `#buscador-materiales-detalle` como campo editable y exigiendo 0 desbordes donde el footer usa `overflow-x-auto` en 390 px. Son 4 `MAL` preexistentes (la prueba quedó en `1cae9a4`, antes de ese buscador). Verificar la fecha del test y el marcador del código antes de atribuir un fallo al cambio nuevo; si el dueño lo pide, actualizar la prueba, no el sistema.
- Estado de aquella primera tanda: hecho, probado y desplegado **solo en Nego** (bundle `index-DbHORBcM.js`); con el OK *"sube todo"* del dueño se completó el pase a los cuatro sitios (ver lección de arriba). Regla permanente: primero Nego, luego los demás sitios con OK en cada tanda.

## 24/11/2026 — El 409 de devoluciones en ecosistema NO era del front: era el default de `store_id`
- Síntoma: `POST /rest/v1/rpc/fn_registrar_devoluciones_lote` → **409 Conflict** y `Error registrando devoluciones: Object`. Los 404 de `suscripcion.json` y `empleados_publico` y el aviso `beforeinstallprompt` son **ruido**, no la causa.
- **Regla de oro aprendida:** PostgREST convierte un `23503` (foreign key) o `23505` (único) en **409**. Para saber la causa exacta, no mirar solo la consola: reproduce la llamada en `psql` dentro de `BEGIN; … ROLLBACK;` y lee `SQLSTATE` y `SQLERRM`. Así se vio `inventory_movements_store_id_fkey`.
- Causa: `inventory_movements.store_id` tenía **DEFAULT 2** en ecosistema, pero `stores` solo tiene el id **1**. En Nego el default es 1; por eso las pruebas en Nego pasaban y el error solo salía en el sitio del cliente. **Una prueba en Nego no prueba la configuración de la base de ecosistema**: hay que revisar defaults/FK en cada base (por eso se creó `ai-scripts/pruebas/verificar-generales-devoluciones.cjs`, que compara defaults contra `stores`).
- Segundo fallo: con `store_id=2` huérfano en filas viejas, la **primera** actualización de un lote en una transacción pasa pero la **segunda** falla (PostgreSQL vuelve a validar la FK). Reparar también las filas antiguas, no solo el default.
- Corrección en `servidor/sql/corregir-default-store-inventario.sql`: `SET lock_timeout='5s'`, default a la primera tienda activa y `UPDATE … WHERE NOT EXISTS (SELECT 1 FROM stores …)` en `batches`, `inventory_movements`, `sales` y `cash_sessions`. Siempre con `pg_dump -Fc` previo. **No reiniciar la API.**
- Cuidado con `ROW_COUNT()`: es variable de psql, **no función de PL/pgSQL**; dentro de un `DO` usar `GET DIAGNOSTICS v_n = ROW_COUNT;`.

## 24/11/2026 — Salidas debe ser igual que Caja: el rollo se elige en el buscador y se guarda en metros
- El dueño preguntó si Caja y Salidas eran iguales y, al explicarle que Caja ofrecía `M` y `(ROLLO x100/400/500)` pero Salidas solo `M`, dijo **«quiero que sea igual»** y eligió **«Salidas también con ROLLO»**. Con **«si empieza»** se hizo primero solo en Nego.
- En `ModalNuevaSalida.tsx` se usa **`conPresentaciones`** (la misma utilidad de Caja): el buscador y el escáner ofrecen el producto base y los clones `(ROLLO xN)`, con stock en rollos y foto del producto real (`productoId`). Ojo con el tipado: el clon tiene `id` tipo string (`"<id>::<i>"`), por eso `fotoProducto` necesita `Number(...)` y los campos del producto crudo (`image_path`, `cost_price`) requieren cast a `any`.
- Al agregar, **lo escrito son rollos**: se multiplica por `presentacion.factor` y se guarda con `unidad='M'` y el **`product_id` real**, no el id del clon. Así `fn_registrar_salida` descuenta metros sin tocar SQL. Si `metros > stock` se avisa. No se mezclan unidades en stock ni historial.
- Los 6 productos de manguera **solo existen en ecosistema**: en Nego da **23/23** pero no se puede probar el rollo ahí. La prueba `verificar-cambios-ecosistema.mjs` se amplió para exigir `(ROLLO x100)`, `3 ROLLO`, elección con flechas y `1 = 100 M`, además de `327 M` / `1430 M`: en ecosistema dio **26/26** después del deploy.
- Con el OK del dueño se publicó el mismo bundle **`index-CrlGja93.js`** en **Nego, ecosistema, Evicamp y clientes** (destino explícito, 22 archivos por sitio); ecosistema con iconos repuestos (`c159d216…`). Push a `origin/fase-11-sunat`. Recordar Ctrl+F5 para verlo.
- Ajuste posterior (mismo día): el dueño pidió que el `100` del rollo dijera su unidad; eligió **`ROLLO x100 MT`**. Se agregó `nombreRolloConUnidad` en `src/utils/presentaciones.ts` (solo para clones `ROLLO`; M/MTR/METRO → MT). Como Caja y Salidas comparten esa utilidad, los dos muestran `MANGUERA… (100MT) (ROLLO x100 MT)`. **`nombrePresentacion` de Compras NO se tocó** para no romper las opciones guardadas. Bundle **`index-DdYWVHW4.js`**, primero solo Nego (23/23) y, con el OK del dueño, ecosistema (+ iconos), Evicamp y clientes; ecosistema **26/26** y push a `origin/fase-11-sunat`. En Inventario sigue el texto guardado `ROLLO x100`: el cambio es solo del nombre que se busca en Caja/Salidas.

## 24/11/2026 — «3» nunca significa 3 M: stock e historial se convierten al factor del nombre
- El dueño se enojó con razón: *"como que 3 metros carajo si estaba en unidad y dice 1 pero dice en el nombre 500 metros osea 3 son 1500 metros"*. Si el producto dice `(500MT)`, el `3` guardado son **3 rollos = 1500 M**, no 3 M. Con su «arregla todo eso» se convirtió **todo**, no solo la etiqueta.
- Factores **según el nombre**, no un 500 genérico: `100282=100`, `100298=100`, `100313=400`, `100315=400`, `100322=500`, `100432=100`. Stock final: `327, 50, 1081, 985, 1430, 300 M`.
- Antes de escribir, buscar **todas** las tablas con `product_id` y columnas de cantidad. En ecosistema solo había filas en `products` (6), `batches` (8), `inventory_movements` (`change_amount`, `previous_quantity`, `new_quantity`: 91), `salida_devoluciones` (`cantidad`: 20) y `salida_items` (`cantidad`, `cantidad_devuelta`: 59). Las demás están vacías. **`salida_items` no tiene `precio_unitario`**: la columna monetaria es `costo_unitario`.
- Regla de oro: **multiplicar cantidades ⇒ dividir costos unitarios** (`products.cost_price`, `batches.cost_unit`, `salida_items.costo_unitario`) para no mover ningún total. `cost_total` de lotes se deja intacto. Poner `unidad='M'` en las 59 líneas. Revisar siempre totales antes/después.
- Script `ai-scripts/patch-stock-metros-ecosistema.cjs`: modos `backup`/`apply`, precheck del nombre (regex `<factor>\s*M`) y del estado (viejo vs nuevo) para ser idempotente, `SET lock_timeout='5s'`, una transacción y un `DO $$ … $$` que hace rollback si falta algo. Si los productos ya están en metros, **no vuelve a escribir** (y ojo: en modo `apply` sobrescribe los respaldos, por eso no ejecutarlo dos veces).
- Prueba en vivo ampliada: `verificar-cambios-ecosistema.mjs` **22/22** exige `327 M` en el sugerido de 100282, `1430 M` en el de 100322 y `327 M` en la lista de Inventario. Nego **23/23** sin cambio de código. Como solo cambió la base, **no hubo rebuild ni deploy**; el bundle `index-BAV_WNoL.js` sigue en Nego, ecosistema, Evicamp y clientes. Tras ecosistema, si se despliega código, reponer iconos (`c159d216…`).

## ⚠️ REGLA PERMANENTE (24/11/2026) — Flujo de código: primero Nego, luego TODOS
- El dueño pidió: *"ya para la proxima si modificas codigo primero nego siumax y luego subelo a todos eso es para que todos esten siempre actualizados"*. **De ahora en adelante, cada cambio de código se despliega primero en Nego/Siumax (pruebas) y, una vez revisado, se sube a TODOS: Nego, Evicamp, ecosistema y GitHub**, para que ningún sitio se quede atrás.
- Esta regla **no borra** la de siempre: Evicamp y GitHub requieren que el dueño lo autorice **en ese momento**; Nego es el sitio de pruebas. En esta tanda sí lo autorizó con *"actualizalo a todos entonces"*.
- Forma segura (aprendida hoy): los 3 sitios comparten el mismo `dist/`, compilado **una vez** desde un worktree limpio. Publicar con destino explícito: `node ai-scripts/deploy.cjs siumax`, `... evicamp`, `... ecosistema`; **nunca** `deploy.cjs` sin argumento (por defecto publica en Evicamp). Después de ecosistema, **siempre** `node ai-scripts/restaurar-iconos-ecosistema.cjs` (si no, el logo vuelve al de Nego). `deploy.cjs todos` también toca la carpeta compartida de clientes: usar solo si el dueño dice «todos los clientes».
- Los bundles se publican igual en los 3 sitios; la diferencia del azul de ecosistema va por dominio (`sitio-ecosistema`), no por bundle distinto: no «corregir» esa diferencia permanente.

## 24/11/2026 — Tanda final: manguera en metros, rollo en presentaciones y sin «1 UND = 500 M»
- El dueño **rechazó** la etiqueta «1 UND = 500 M»: *"no quiero que pongas 1 unidad = 500 metros"*. La manguera se ingresa con unidad base **M** (código SUNAT **MTR**) y el rollo va en **Opciones avanzadas** como presentación (`presentaciones`). No se arregla «desde Inventario» a base de equivalencias: se corrige el dato del producto y ya.
- Decisión expresa sobre los metros del rollo: **seguir el nombre** del producto, no el `ref_qty=500` genérico que tenían todos. Quedó: 100282/100298/100432 → `ROLLO x100`; 100313/100315 → `ROLLO x400`; 100322 → `ROLLO x500`.
- No hay precios (*"no hay precios asi que ntp"*). Para que el rollo se vea, `presentacionesValidas` acepta **`precio >= 0`**; antes exigía `> 0` y descartaba el rollo. Es un cambio global pequeño y consentido, no un precio inventado.
- Base: **solo ecosistema**, con respaldo de las 6 filas y de los 510 productos + `SET lock_timeout='5s'` en una transacción. Script `ai-scripts/patch-mangueras-ecosistema.cjs` con modos `backup`/`apply`. Se limpiaron `ref_unit`, `ref_qty` y `unit_weight`; se mantuvieron `quantity`, `price`, `cost_price`, stock e historial. **Nunca escribir en Nego ni Evicamp** para estos productos.
- El panel de los clientes que pagan se actualiza con `node ai-scripts/deploy.cjs clientes` → `/var/www/siuhub-app/html`. Es un destino explícito distinto de los otros tres; No usar `deploy.cjs todos` salvo pedido literal.
- Pruebas que dejaron huellas: `verificar-flechas-y-buscador-nego.mjs` **23/23** y `verificar-cambios-ecosistema.mjs` **19/19**, con teclado, sin internet y 390/768/1366/1920. En vivo comprobar el bundle **`index-BAV_WNoL.js`** en Nego, ecosistema, Evicamp y clientes (en clientes se lee el `index.html` remoto). Tras ecosistema, **siempre** restaurar iconos.

## 24/11/2026 — PASE A TODOS: 6 cambios + equivalencia 500 M en Nego, Evicamp y ecosistema, con push
- El dueño pidió: *"pues actualizalo a todos entonces ya para la proxima si modificas codigo primero nego siumax y luego subelo a todos"*. Con ese OK se publicó **el mismo código** en los 3 sitios y se hizo **push a `origin/fase-11-sunat`**. **No se tocó `main`.**
- Worktree limpio `pase-todos` desde `fase-11-sunat`, con los 2 commits de código portados (`2e79ad0` = 6 cambios, `265752f` = equivalencia desde Inventario). El repo principal quedó intacto con su WIP ajeno. Se compiló una vez (`tsc --noEmit` + `npm run build` OK) y se publicó en este orden: **Nego → Evicamp → ecosistema** (22 archivos por sitio) + iconos repuestos (MD5 `c159d216…`). Bundle en vivo en los 3: **`index-A3_4Ri3U.js` / `index-Cf4OlVIC.css`** (antes Nego y Evicamp tenían la 228 `index-Bp6aQKRr.js`).
- **No hubo cambios de base en Nego ni Evicamp:** se consultó solo lectura y ninguno de los 5 productos de metro existe ahí (0 productos con unidad «Metro» en `siumax` y en `postgres`). La corrección de las 5 filas sigue siendo **solo ecosistema**. No se inventaron datos ni se escribió en bases de producción.
- Pruebas con teclado, sin internet y 390/768/1366/1920: ecosistema **25/25**, marquita/limpiador **12/12**, tema azul **14/14**, sitio **35/35**, devoluciones del detalle **6/6**, 228 sin SSH **11/11**; Nego **20/20** (prueba nueva `verificar-6-cambios-nego.mjs`, adaptada a sus propios datos porque no tiene productos de metro); Evicamp login **11/11** sin avisos de pago. 0 errores JS.
- Push confirmado: `c53f160..265752f  pase-todos -> fase-11-sunat`. La prueba antigua `prueba-salidas-nego.mjs` falla por selectores de la interfaz anterior (228), **no** por este cambio: para Nego usar la nueva.
- Falta solo la revisión visual del dueño en los 3 sitios con **Ctrl+F5**.

## 24/11/2026 — Inventario es la fuente de la unidad: 5 productos de metro ya son UND = 500 M
- Si Salidas sigue mostrando «Metro», **corrige el producto en Inventario**, no solo la etiqueta del componente. Los 5 afectados son los ids 100282, 100298, 100313, 100315, 100322: antes `unit='Metro'`, `weight_unit='Metro'`, `ref_unit='Metro'`, `ref_qty=1`, con el rollo (100/400/500) solo en `unit_weight`/el nombre.
- Con OK del dueño (**«Sí, empieza»**) se guardó respaldo de las filas completas y se hizo un `PATCH` de **solo esas 5 filas**: `unit='UND'`, `weight_unit='UND'`, `ref_unit='METRO'`, `ref_qty=500`, `unit_weight='500.00'`. Respaldo: `C:/Users/User/AppData/Local/Temp/opencode/respaldo-productos-metro-2026-11-24.json`. **Nunca** tocar stock, precios, lotes ni historial para arreglar una etiqueta.
- `UnidadMaterial` recibe ahora `equivalenciaM`; la equivalencia se lee de `products.ref_qty/ref_unit` en `ModalDetalleSalida`, `ModalDevolucionesSalida` y `ModalNuevaSalida`. El texto fijo «1 UND = 500 M» queda **solo** como respaldo de las 39 líneas antiguas que aún traen `unidad='Metro'`: no se reescriben.
- Comprobación rápida: `unit=ilike.*metro*` debe dar **0 productos**, y el stock de los 5 debe seguir en `3.27, 0.5, 2.7025, 2.4625, 2.86`. Esas 3 aserciones ya están en `verificar-6-cambios-salidas.mjs` (**25/25**); regresiones **12/12, 14/14, 35/35, 6/6, 11/11**. Deploy solo ecosistema + iconos; bundle `index-CNDCe1Qi.js`, sin push.
- Para responder si faltan más: el catálogo tiene **511 productos**; solo esos 5 tenían/ten unidad de metro y **ninguno** está en kilos (`unit`, `weight_unit`, `ref_unit`, `control_type` y `presentaciones` revisados). En `salida_items` (2910 filas) solo 59 decían `Metro`, todas de esos 5 ids (6+2+14+2+35); el resto es `Unidad` o `UND`.
- **No confundir el nombre con la unidad:** hay 12 tubos con «3/5 MTS» en el nombre (ids 100336–100348) que se venden por unidad (`ref_qty=1`), y «MANOMETRO» da falso positivo por la palabra «metro». No se corrigen sin decisión expresa del dueño.
- Si el dueño pregunta si estos cambios pasaron por Nego/Evicamp/GitHub: **no**. Se trabajó en el workspace aparte `C:/Users/User/AppData/Local/Temp/opencode/salidas-6-cambios` (base `D:/Programación/eco-sistema`) y se desplegó con `node ai-scripts/deploy.cjs ecosistema` + iconos. Nego y Evicamp solo recibieron la 228 en un pedido anterior (`a88002a`); de esta tanda hay **commits locales, sin push**. Antes de responder, confirmar con `git status -sb`, `git log` y `git branch -vv`.

## 24/11/2026 — Salidas: 6 cambios hechos, y dos trampas de las pruebas
- Con el OK del dueño, la equivalencia de metros es **solo etiqueta**: `UnidadMaterial.tsx` muestra `UND` + `1 UND = 500 M` para **M, METRO, METROS, MTR, MT y ML** (en vivo las devoluciones traían `METRO`, no `M`). Aplica a **todos** los de metro aunque el nombre diga 100MT/400MT, decisión expresa del dueño. **Nunca multiplicar cantidades, stock ni las 1213 devoluciones.**
- La cantidad de «Nueva/Continuar salida» se arregla controlando el texto mientras se edita (`cantidadEditando` con clave por producto) y soltándolo en `onBlur`; así se puede borrar el `1` y escribir directo. El id queda `input-cantidad-item-p<product_id>` (o `d<descripcion>` si no hay producto).
- **Trampa 1:** un `<button class="sr-only">` como ancla de foco **desborda** (`scrollWidth` 46 vs `clientWidth` 1) y mete la palabra «Inicio» en el texto. Mejor usar el primer panel visible con `id="inicio-detalle-salida"` y `tabIndex={-1}`, enfocarlo con `focus({ preventScroll: true })` al abrir; el imán de `ventanas.ts` recuerda ese panel y vuelve a él tras un clic afuera. No hace falta `preventDefault` en el fondo para que el scroll quede en 0.
- **Trampa 2:** `verificar-228-ecosistema-sin-ssh.mjs` cuenta `input,select,textarea`; el **buscador nuevo** (`#buscador-materiales-detalle`) hace que marque 1 campo aunque el detalle siga siendo solo lectura. Excluir **solo ese id** en el conteo y exigir que exista; mantener 0 X de materiales. Las tablas con `overflow-x-auto` pueden desplazarse a propósito: no cuentan como desborde (filtrar por `getComputedStyle(e).overflowX !== 'auto'`).
- Foco tras cerrar la ventana de Devolver vuelve a `btn-abrir-devoluciones` (abajo, scroll ~1040): es correcto. En la prueba, medir el foco/scroll de **apertura del detalle antes** de abrir Devolver, si no dará un falso fallo.
- El buscador de salidas sigue necesitando **dos ArrowDown** antes de Enter; para inputs controlados por React usa siempre el setter nativo de `HTMLInputElement.prototype.value` + eventos `input`/`change`.
- Si el dueño dice que desapareció la marquita `dev.` justo después de un deploy, revisa primero si ese worktree tenía el cambio local de la celda de Items: el commit `b3aac1f` aún no lo traía. Portar **solo esa celda**, sin copiar el WIP ajeno de `TablaSalidas.tsx`.
- **`.env.vps`:** el del repo principal cambió el 24/11 a las 14:40 (MD5 corto `8562F26AD7`) y falla con «All configured authentication methods failed». La copia de `nego-detalle-228` (`BBF98048CC`) sí autentica como root. No imprimir credenciales ni pegarlas en docs.
- Prueba nueva: `verificar-6-cambios-salidas.mjs` **22/22**. Regresiones: marquita/limpiador **12/12**, tema azul **14/14**, sitio **35/35**, devoluciones del detalle **6/6**, 228 **11/11**. Deploy solo ecosistema + iconos; bundle `index-CAHNHzOH.js`.

## 24/11/2026 — Salidas: cantidad que no cambia y unidades migradas de metros/kilos (diagnóstico, no ejecutado)
- Si el dueño dice que «la cantidad no cambia», preguntar **en qué ventana**: el **detalle** es solo lectura desde la 228 (lo pidió él), en «Nueva/Continuar salida» `handleModificarCantidad` descarta `NaN` y `<= 0` (borrar el cuadro para reescribir lo devuelve al valor anterior), y en «Devolver» el «Monto a devolver» es calculado y `input-devolver-*` se deshabilita con `pendiente <= 0`.
- Los productos migrados de Eco con metro quedaron con `unit='M'`, `control_type='UND'`, `sunat_unit_code='NIU'` y `presentaciones={"unidad":"Metro","presentacion":"UN"}`. Ese JSON **no tiene `factor`**, así que `presentacionesValidas()` lo ignora. El tamaño del rollo (500/400/100 m) solo está en el **nombre** y las cantidades de `salida_items`/stock cuentan **rollos** (2.86, 0.76…). No multiplicar lo guardado por 500 sin respaldo y OK explícito: cambiaría stock, montos e historial de 1213 devoluciones.
- El dueño confirmó que en el sistema anterior **1 unidad = 500 m** y que pasa con muchos productos. Su queja de cantidad es concreta: al ingresar un producto no puede borrar el `1` para escribir otro número (`handleModificarCantidad` ignora vacío). Los buscadores deben **filtrar los materiales ya puestos en esa salida**, no buscar en el catálogo.
- Antes de corregir el catálogo, **hacer la lista de productos afectados y mostrarla al dueño**. Las cantidades guardadas ya cuentan rollos: corregir la unidad etiqueta no requiere multiplicar stock ni historial. Nunca inventar el factor leyendo solo el nombre sin validarlo.

## 24/11/2026 — Salidas ecosistema: marquita `dev.` y limpiador FilterX (URGENTE, ya hecho)
- Si el dueño dice que «se borran meses de devoluciones» en Salidas: **no se borraron**. Antes de tocar la base, revisa si la **marquita `dev.` aparece en la lista** (`TablaSalidas.tsx`, celda de Items). El 24/11 el bundle desplegado en ecosistema venía de un worktree con `TablaSalidas.tsx` anterior y no la tenía; por eso el cliente se asustó, aunque el detalle sí mostraba las devoluciones.
- La marquita se pone con `s.devoluciones?.length || items con cantidad_devuelta > 0` y el texto `N dev.`. **Ojo:** el repo principal tiene WIP ajeno en `TablaSalidas.tsx` (rediseño responsive). No copies ese archivo completo al worktree: edita SOLO la celda de Items en el worktree limpio.
- El limpiador de fecha es `id="btn-filtro-fecha-todas"`, `title="Ver salidas de todos los días"`, clase **`limpiar-sobrio`** y contenido **`<FilterX size={16}/>`**, nunca la palabra «TODAS». No cambiar el id ni la función `onFiltroFechaChange('')` (teclado/ids ya probados).
- **lucide-react actual dibuja `FilterX` con la clase `lucide-funnel-x`** (antes `lucide-filter-x`). En pruebas, acepta ambos; no cambies el componente porque el nombre de clase haya cambiado.
- Para cambiar un `input type="date"` controlado por React en puppeteer, usa el setter nativo (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(...)`) y dispara `input`/`change`; asignar `input.value` directamente NO actualiza el estado y la prueba dará un falso fallo. `innerText` de la marquita sale en MAYÚSCULAS por CSS (`21 DEV.`).
- Pruebas: `verificar-devoluciones-y-limpiador-ecosistema.mjs` (**12/12**), `verificar-tema-oscuro-ecosistema.mjs` (**14/14**), `prueba-sitio-ecosistema.mjs` (**35/35**), `ver-devoluciones-ecosistema.mjs` (**6/6**) y `verificar-228-ecosistema-sin-ssh.mjs` (**11/11**). Si la VPS rechaza SSH («All configured authentication methods failed»), usa la variante sin SSH en vez de insistir.
- Deploy solo ecosistema (`node ai-scripts/deploy.cjs ecosistema`) y siempre `node ai-scripts/restaurar-iconos-ecosistema.cjs` después.

## 24/11/2026 — Devoluciones históricas de ecosistema (pregunta del dueño, no tocar)
- Si el dueño pregunta por «todas las devoluciones de ecosistema»: **están todas**. Comparar contra `/var/lib/postgresql/respaldo-ecosistema-antes-salidas-228-*.dump`: **1213** filas en `salida_devoluciones`, total `5188.726`, **259** salidas con devoluciones, **2910** items y **395** salidas, idénticos antes y después de la 228.
- El SQL `detalle-salida-edicion.sql` **no borra devoluciones**: solo `ADD COLUMN IF NOT EXISTS trabajador_id` + índice + funciones nuevas. La columna nueva quedó **NULL en las 1213 históricas** (vienen de la migración con `usuario='Migración Supabase'`); **no rellenar nombres inventados**. Las devoluciones nuevas sí guardan fecha y trabajador.
- Para comprobarlo sin escribir: `diagnostico-devoluciones-ecosistema.cjs` (respaldo vs producción), `diag-fk-devoluciones-ecosistema.cjs`, `diag-codigos-devoluciones.cjs` y `ver-devoluciones-ecosistema.mjs` (**6/6** con `SAL-MIG-00243`, 21 filas con «Devuelto»). Ojo: el buscador de salidas necesita **dos ArrowDown** antes de Enter (con uno no abre); es fallo del guion, no del sistema.
- `src/sections/Salidas/index.tsx` trae `devoluciones:salida_devoluciones(*, trabajador:trabajadores(id, nombre))`; si esa consulta fallase, el `catch` reintenta sin devoluciones y la pantalla las ocultaría. Al tocar Salidas, verificar siempre que la respuesta de la API incluya `"devoluciones"`.

## ⚠️ REGLA PERMANENTE — Ecosistema es AZUL, no verde (24/11/2026)
- **NO CAMBIAR NI “CORREGIR”:** el dueño decidió que el sitio oficial `ecosistema123.duckdns.org` tiene una diferencia permanente: en el **Modo Oscuro** su acento es **azul Océano `#0EA5E9`**, no verde esmeralda `#10B981`, porque el color de su empresa es azul. Nego y Evicamp **sí** siguen con verde. Esta diferencia es querida, **no es un error**: no la “arregles” ni la copies a otros sitios.
- Cómo está hecho (no desarmar): `index.html` agrega la clase `sitio-ecosistema` solo si el hostname es `ecosistema123.duckdns.org`; al final de `src/index.css` hay un bloque con el encabezado **«DIFERENCIA PERMANENTE SOLO DEL SITIO OFICIAL ECOSISTEMA»** que aplica el azul solo con `html.sitio-ecosistema.theme-monochrome` / `html.sitio-ecosistema[data-theme="dark"]` (variables de acento, marca, éxito y focos/anillos en azul); `ThemeSwitcher.tsx` usa `ES_SITIO_OFICIAL` para que la muestra del Modo Oscuro también salga azul. El resto de colores (negro `#0B0F17`, grafito `#111827`, grises, rojo, ámbar) y el arranque en Océano quedan intactos.
- Prueba que lo cubre: `ai-scripts/pruebas/verificar-tema-oscuro-ecosistema.mjs` (**15/15**). Si se toca el CSS de temas, correrla junto con `prueba-sitio-ecosistema.mjs` y `verificar-228-ecosistema.mjs`.
- Aquí solo se despliega ecosistema con `node ai-scripts/deploy.cjs ecosistema` y **siempre** se corre `ai-scripts/restaurar-iconos-ecosistema.cjs` después; si no, el logo vuelve al de Nego.

## 24/11/2026 — Tema oscuro de ecosistema (solo aclaración)
- Si el dueño pregunta por el verde del modo oscuro: **es intencional**. En `ThemeSwitcher.tsx` el «Modo Oscuro» es `monochrome` y sus muestras son `#0B0F17`, `#111827`, `#10B981` y `#64748B`; en `src/index.css`, `html.theme-monochrome, html[data-theme="dark"]` pone `--color-brand-accent: #10B981` y `--color-accent: #10B981`. No es un error ni un cambio reciente.
- `index.html` decide el tema inicial por dominio: ecosistema = `oceano` (azul), los demás = `classic`. Si el dispositivo tiene `gestorpro_theme`, se respeta; para `monochrome`/`dark` se agregan la clase `theme-monochrome` y `data-theme="dark"`. Por eso en ecosistema el verde oscuro se ve recién después de elegir «Modo Oscuro» en Configuraciones.
- Preguntas como esta se responden con lectura (`graphify query` + archivos), sin tocar código/base/sitio ni hacer push.

## 24/11/2026 — PUNTO AL DÍA (228 también en ecosistema, sitio oficial)
- El dueño dio el OK para ecosistema: *"ya tiene su base de datos solo es actualizarlo como envicamp y nego nada mas"*.
- **Aprendizaje importante:** el `seguridad-sesion.sql` completo **no se puede aplicar a ecosistema**: esa base tiene una tabla `notas_credito` de **Compras** (`uuid`, `entrada_id`, `numero_factura_proveedor`) distinta de la de SUNAT (`sale_id`) de Nego/Evicamp, y el SQL se detiene creando un índice. Para cambios de Salidas basta **`detalle-salida-edicion.sql`**, que es repetible y trae toda la 228. No aplicar SQL ajeno «porque sí».
- **Aprendizaje importante:** al hacer `pg_dump`/`pg_restore` de ecosistema, fallan 3 FK porque `stores` está vacía pero hay filas que apuntan a la tienda 2. Son errores históricos conocidos; en la copia se permiten solo esos 3 y cualquier otro error aborta.
- **ecosistema (HECHO):** base con respaldo y `lock_timeout`, solo el SQL de Salidas, tienda principal y cliente interno `990001`; sin reiniciar la API. Deploy de 22 archivos y **siempre** correr `restaurar-iconos-ecosistema.cjs` después, si no el logo vuelve al de Nego. Sitio en vivo con `index-Bp6aQKRr.js` / `index-BzLRfRHr.css`, API 401 y `suscripcion.json` 404. Pruebas **35/35** y **11/11** con login real (credenciales de `.env.vps`, nunca impresas). Falta revisión del dueño con Ctrl+F5.

## 24/11/2026 — PUNTO AL DÍA (228 subida completa: pruebas, Evicamp y GitHub)
- El dueño autorizó subir la 228 a **Evicamp, Nego y GitHub**, pero pidió probar antes salidas, devoluciones y eliminación. Todo pasó: stock **4/4**, eliminar **11/11**, interfaz **30/30** y login de Evicamp **11/11**, con teclado, sin internet y 390/768/1366/1920.
- **Aprendizaje importante:** en este sistema **Tab abre el menú lateral** con prioridad absoluta; para pasar de usuario a clave en el login se usa **Enter o flechas**, no Tab. Un guion que pruebe Tab como si fuera navegación de campos da un falso fallo.
- **Aprendizaje importante:** `fn_eliminar_salida` guarda el movimiento con el **usuario de la sesión** (`Administrador SiuHub`), no con el `p_usuario` pasado; para localizar o limpiar movimientos de prueba hay que filtrar por `reason='Devolución de Salida <código>'`.
- **Evicamp:** los dos SQL (`seguridad-sesion.sql` y `detalle-salida-edicion.sql`) se ensayaron primero en una **copia** de `postgres`; solo después se respaldó y aplicó en producción con `ON_ERROR_STOP` + `lock_timeout`, sin reiniciar la API. Evicamp no tenía ninguna tabla de salidas y ahora las tiene con las mismas RPC y permisos que Nego. Sin credenciales de admin de Evicamp en `.env.vps`: no inventar claves para probar login real.
- Bundles en vivo en los dos sitios: **`index-Bp6aQKRr.js` / `index-BzLRfRHr.css`**. Push confirmado solo a `origin/fase-11-sunat` (`a88002a`); no tocar `main`. Detalle completo en la bitácora de arriba.

## 24/11/2026 — PUNTO AL DÍA (pedido 228: detalle solo para ver, edición en «Continuar salida»)
- El dueño revisó la 227 y primero pidió traer materiales al continuar, pasar la tabla editable del detalle a Nueva salida y poder poner fecha + trabajador al devolver. Después aclaró: *"ya no quiero que se pueda editar en detalle de salida eso ya lo hace continuar salida"*.
- Regla nueva para la 228: el **detalle queda solo para ver y usar botones**; la edición (cliente, bien, dirección, ubicación, fecha, nota, responsable, trabajadores y materiales) pasa a **«Continuar salida»**, que abre Nueva salida con los materiales copiados y la tabla editable con X. El dueño confirmó que esa salida nueva **descuenta stock otra vez**.
- En **Devolver**: fecha y trabajador editables; sin trabajador elegido queda en blanco.
- **228 (propia, HECHA):** el dueño dio el **«empieza»**. Detalle solo lectura, edición en «Continuar salida», fecha y trabajador al devolver. SQL en `siumax` con respaldo y `lock_timeout`, deploy solo Nego con bundles `index-Bp6aQKRr.js` / `index-BzLRfRHr.css`, prueba real de stock OK e interfaz **30/30**. Detalle completo en la **sección 70** al final de esta memoria. Falta revisión del dueño con **Ctrl+F5**. Sin Evicamp, ecosistema, credenciales ni push.

## 24/11/2026 — PUNTO AL DÍA (detalle de Salida con X para quitar y Devolver flotante, solo Nego)
- El dueño revisó la 226 y pidió: *"no puedo eliminar los productos que agregue otra cosa mas el devolver que sea una ventana flotante mejor y el estilo del detalle de la salida tiene que ser igua al de nueva salida"*. Aprobó la propuesta con **«si empieza»**.
- **227 (propia, HECHA):** X en todas las filas (quita el material y devuelve al almacén lo pendiente con la RPC `fn_quitar_material_salida`); «Devolver» abre una ventana flotante con todos los materiales y un solo botón; detalle con el mismo estilo `ventana-sobria` / `max-w-5xl` / botones cuadrados que `ModalNuevaSalida`. Base `siumax` con respaldo y `lock_timeout`, sin reiniciar la API.
- Desplegado **solo Nego**: bundles en vivo `index-DxUWIDB0.js` / `index-BkExumB9.css`. Prueba real de stock OK e interfaz **29/29** con teclado, sin internet y 390/768/1366/1920. Detalle completo en la **sección 69** al final de esta memoria. Falta revisión del dueño con **Ctrl+F5**. Sin Evicamp, ecosistema, credenciales ni push.

## 24/11/2026 — PUNTO AL DÍA (la nota ya basta en Nueva salida, solo Nego)
- El dueño pidió: *"solo debe registrar la nota, no debe hacerme escoger un cliente ya creado, me entiendes??"* y luego dio el **«empieza»**.
- **224 (propia, HECHA):** commit local `70c7faf`, sin push. En la base de pruebas `siumax` se creó el cliente interno `CLIENTE NO REGISTRADO (NOTA)`, id **`990001`**, `activo=false` (respaldo y `lock_timeout`). En `ModalNuevaSalida.tsx`, «REGISTRAR COMO NOTA» pone ese id por detrás y ya no pide cliente de la lista; el nombre sigue guardándose como `CLIENTE: <NOMBRE>` y sale en el comprobante. No se tocó `fn_registrar_salida`.
- Desplegado **solo Nego**: bundles en vivo `index-25yvKBon.js` / `index-DFRVNc6v.css`. Probado con teclado en 390/768/1366/1920 y con navegador sin internet. Guardado de prueba **SAL-1547** (`customer_id=990001`, nota `ZZZ NOTA DIAG 224`). Queda esa salida de prueba en Nego por si el dueño quiere verla o borrarla.
- Detalle completo en la **sección 66** al final de esta memoria. Falta revisión del dueño con **Ctrl+F5** en `https://nego.siumax.duckdns.org`. Sin Evicamp, ecosistema, credenciales ni push.

## 23/11/2026 — PUNTO AL DÍA (lo último de la Caja en Nego)
- El dueño pidió: *"pon todo en la memoria y guarda todo lo que hicimos para siempre estar al día"*.
- **214 (propia):** vuelta al comienzo, commit local `ff9a933`, sin push. Desplegada con bundles `index-BFssEZh6.css` / `index-BqBmmYfE.js`.
- **215 (ajena, SIN commit):** otra IA desplegó después la vista previa de Caja = impresión, margen del ticket y letra de Salida. Hoy el sitio sirve **`index-Cnjs-E2Y.css` / `index-BX-k9rmP.js`**, pendiente de que el dueño la revise. No atribuirla ni incluirla en commits propios.
- **Regla fija:** "el comienzo" = respaldo `2301848e…`, con 8 fallos viejos del selector de empleado de Salidas que **no se arreglan por iniciativa propia**.
- Detalle completo en la sección 60 al final de esta memoria.

## 0. ⭐ Memoria principal y cambio de plan (17/11/2026) — LEER PRIMERO
- **El dueño decidió: todo será un solo sistema, SiuMax Nego (`negosiumax`).** Comerc y Servic pasan a ser
  **referencia histórica**. Fuente de verdad: `D:/Programación/siumax/CLAUDE.md`. Si otra IA dice que la memoria está
  desactualizada, se equivoca: el dueño ya lo explicó varias veces.
- **Copia Eco → VPS: HECHA como prueba el 17/11** (base `siumax`, 7.328 filas, respaldo y rollback disponibles).
  Detalle canónico: `docs/MIGRACION-ECO-A-NEGO.md`. **Fase 4 hecha en pruebas el 17/11** (33 PDF + 1 foto en el VPS y
  botones Ver/Adjuntar en el detalle de Compra; 11/11 con teclado y sin internet). **Pasada oficial y Fase 5: pendientes del OK.**
- **500 de Eco-Sistema resuelto el 17/11:** clave desactualizada en `SUPABASE_DATABASE_URL` en Vercel; el dueño
  actualizó el Value, hizo Redeploy y confirmó *"LISTO YA FUNCIONA"*. No era Supabase ni el código.
- Nunca escribir claves ni cadenas de conexión aquí (viven en `.env.vps` / `.env.ecosistema`, fuera de git).

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
- **Las 6 reglas del selector (04/11/2026, en todo el sistema):** llegar con flechas a TODO botón/buscador/campo; calendario: Enter
  lo abre y el selector se queda (Enter NUNCA pasa al siguiente cuadro, ↓ sí); ← → ↑ ↓ siempre mueven; al volver de otro programa algo
  queda seleccionado; en una ventana el selector nunca se pierde (ni con un clic en el fondo) y nunca sale de ella. Ya lo garantizan
  `ventanas.ts` (ventanas) y `flechasEspaciales.ts` (flechas de respaldo); al hacer una pantalla nueva, poner flechas propias donde
  importe el orden y correr `ai-scripts/pruebas/estilo/revisar-selector.mjs`. Ojo: un control desactivado no recibe el selector:
  las flechas deben saltar al primero ACTIVO.
- **Regla 9 (05/11/2026, el dueño la repitió dos veces en Producir):** **Enter = clic y el selector SE QUEDA, en TODO** (botones,
  opciones, campos de texto y de número). Enter NUNCA pasa al siguiente cuadro; para moverse están las flechas. En un campo, Enter
  solo hace su acción si tiene una (elegir el primer resultado de un buscador, "Agregar" en la cantidad) y el selector no se mueve.
  Si el elemento desaparece (lista que se cierra, fila quitada), el selector vuelve a de donde salió o al vecino más cercano.
  No programar `Enter → enfocar(siguiente)` en pantallas nuevas. **Ya lo garantiza `flechasEspaciales.ts` (guardiaEnter +
  focusin) en TODAS las ventanas:** si tras un Enter en un campo el selector va a otro campo/botón de la misma ventana,
  vuelve al de origen (no actúa si el Enter abrió/cerró una ventana, si el campo desapareció o entró a una lista; cualquier otra tecla del usuario termina la vigilancia al instante).
  **Categorías:** Enter sin elegir de la lista guarda LO ESCRITO (no la primera parecida); de la lista se elige con ↓ + Enter.
- **Reglas 7 y 8 (05/11/2026):** las flechas NUNCA cambian una opción (listas desplegables, grupos de opciones tipo radio, unidades…):
  solo mueven el selector; **Enter despliega o elige**. **Enter en una casilla = clic** (se marca y el selector se queda). Lo garantiza
  `alTeclearPrimero` en `flechasEspaciales.ts`; no programar "← → cambia la opción" en ninguna pantalla. Vale también para
  campos de NÚMERO (↑↓ no suben/bajan la cantidad: el selector se queda atrapado si no).
- **El selector tiene que VERSE** (05/11/2026): "no funciona" a veces es que llega pero no se nota. En ventanas lo garantiza
  index.css (contorno verde con outline en campos, botones y casillas); al revisar, sacar captura en MODO OSCURO (el dueño lo usa).
  Ojo: un contorno POR FUERA se recorta si el contenedor tiene overflow (pasó en las pestañas de Compras); y las reglas de
  modo oscuro de `index.css` (sección "SELECTOR DE NAVEGACIÓN CON TECLADO EN MODO OSCURO") tienen mucha fuerza: revisar el
  estilo calculado (getComputedStyle) si un cambio "no se ve".
- **Barras con fechas:** una sola fila; ← → recorre, ↓ baja a la lista y **Enter en una fecha abre el calendario**.
- **Al cerrar cualquier ventana o submodal**, el selector debe volver explícitamente a lo que estaba elegido (regla global en `src/utils/ventanas.ts`). Si un submodal se desmonta (como la ficha de nuevo cliente dentro del selector del POS), el foco debe enviarse a un botón del modal padre (`btn-cliente-pos-nuevo`), de lo contrario el navegador envía el foco a `document.body` y el selector desaparece.
- **Scrollbars estilizados:** todo contenedor con scroll (`overflow-y-auto` u `overflow-auto`) debe incluir la clase `.custom-scrollbar` (5px, sin botones de flechas) para evitar la barra gris nativa gruesa de Windows.
- **Opciones avanzadas en modales complejos:** no poner múltiples botones, ni botones flotantes laterales, ni botones duplicados en cabecera o footer. Usar **un único botón desplegable claro** bajo los datos básicos que abra las opciones hacia abajo dentro del mismo cuerpo scrolleable del formulario.
- **Tienda Web (Fase 10):** el dueño indicó expresamente llamarla **"Tienda Web"** (en vez de "Catálogo") y que su diseño esté totalmente adaptado tanto para **PC** (pantalla completa, filtros visuales y carrito accesible) como para **celular**.
- **Modelos de Base de Datos y Columnas:** en la tabla `products`, la columna de costo es `cost_price` (no `cost`). La tabla de locales es `stores` con columnas `nombre`, `codigo`, `direccion`, `telefono`, `whatsapp`, `es_almacen_principal`, `activo`.
- **Avisos internos del sistema (`avisar`):** `avisar()` despliega un diálogo propio en pantalla con el botón `#dialogo-sistema-aceptar` que atrapa el foco y los clics para evitar pérdida de teclado en la app de escritorio; siempre debe ser descartado con Enter o clic para que las pantallas detrás respondan.
- **Caché en memoria entre sesiones (11/11/2026):** al cambiar de sección (Punto de Venta, Inventario, Clientes, Finanzas, Utilidades), nunca poner `loading = true` bloqueando la pantalla si ya se descargaron los datos en la sesión actual. Mantener una variable `cache[Modulo]Memoria` fuera del componente, iniciar el estado con ella y recargar en segundo plano silencioso para entrada instantánea (0 ms).
- **Créditos pagados de un cliente (11/11/2026):** en el detalle del cliente, la pestaña "PAGADOS" debe ordenarse por la fecha del último pago (`fechaUltimoPago`), no por la fecha antigua de emisión, y el filtro de fecha debe buscar por la fecha del abono.
- **Accesibilidad y visión (11/11/2026):** el "TOTAL A COBRAR" en POS debe ser negro (`text-[var(--color-ink)]`), nunca verde claro, para clientes con baja visión.
- **Exige usar graphify** (si está instalado) antes de leer código y `graphify update .` después de cambiarlo.

## 2. El producto
- **SiuMax** es la marca. Este sistema es **SiuMax Comerc** (minoristas + venta a empresas).
  - Habrá un sistema separado por familia: Restaurantes, Talleres, Citas, Membresías, Alquileres y Hospedaje.
  - **La visión completa (los 7 tipos con todos sus negocios) está en la carpeta madre: `D:/Programación/siumax/TIPOS-DE-NEGOCIO.md`** (y las reglas comunes a todos los sistemas en `D:/Programación/siumax/CLAUDE.md`). El dueño: *"en sí SiuMax va a ser eso"*.
  - No proponer el selector de familia en el panel hasta que exista una segunda familia.
- **Evicamp** es la primera clienta (no es el nombre del producto). Sitio: `evicamp.duckdns.org`.
- **Orden de los links (desde el 06/11/2026, `servidor/ordenar-links.sh`):** `siumax.duckdns.org` = Panel de Control;
  `<tipo>.siumax.duckdns.org` = pruebas de cada sistema; `<negocio>.<tipo>.siumax.duckdns.org` = clientes. `panel.siumax`
  ya NO existe. `evi.siumax.duckdns.org` es EviDiary (proyecto aparte del dueño, `D:\Programación\evi`): no tocarlo.
- **Nego/SiuMax de pruebas (donde el dueño revisa TODO en celular y PC antes de aprobar):** **`nego.siumax.duckdns.org` / `comerc.siumax.duckdns.org`** (base `siumax`, API 3001, carpeta `/var/www/siuhub/html`, nginx `sites-available/comerc`), usuario `admin@siumax.com`. La clave está en `.env.vps` (`SIUMAX_ADMIN_CLAVE`). **Cada cambio visual/UI se debe subir siempre a Nego/siumax para que el dueño lo revise; no esperar a que lo pida.** No confundir con Evicamp ni ecosistema. En scripts se llama `siumax` (también acepta `comerc`): `deploy.cjs siumax`.
- **Pruebas de SiuMax Servic:** `servic.siumax.duckdns.org` (por ahora solo una página "en preparación", `/var/www/servic/html`).
- **Clientes nuevos:** `<slug>.comerc.siumax.duckdns.org`, cada uno con su base `cli_<slug>`. Al 06/11/2026 no hay ninguno.
- **Panel de control:** `siumax.duckdns.org` (`servidor/panel/panel.py`; nginx `sites-available/siuhub-panel`).
  - **`siumax.duckdns.org/actualizaciones/` debe seguir sirviéndose SIEMPRE:** las apps de PC instaladas (también las de
    Evicamp) buscan ahí sus actualizaciones. Lo sirve el bloque del panel (`instalar-panel.sh`).
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
| siumax (pruebas) | `siumax` | PostgREST en el puerto 3001 |
| CreditAltoque (otro sistema de la clienta, .NET) | `creditaltoque` | Docker. **No tocarlo** |

- **Nombres internos en el servidor:** `/opt/siuhub`, servicios `postgrest_siuhub` y `siuhub-panel` (la base de datos de pruebas ahora se llama `siumax`, renombrada desde `siuhub` el 29/10/2026 por pedido del dueño).
- **Conexión:** `ai-scripts/vps.cjs` + `.env.vps`. Para SQL desde Node: `node-ssh` → `runuser -u postgres -- psql -d <base>`.
- **No hay servidor de archivos en el VPS** (el logo de empresa se guarda dentro de la base). Por eso en la Fase 4 los
  archivos migrados se sirven como estáticos desde `/var/www/siuhub/html/archivos/compras`, pero los **adjuntos nuevos**
  se guardan como base64 dentro de `compras.archivos` (columna `jsonb`, agregada con `ADD COLUMN IF NOT EXISTS`).
- **Comprimir imágenes sin librerías:** en el VPS/PC no hay PIL, ImageMagick, `cwebp` ni `sharp`. Se logró con
  **Edge + Puppeteer**: abrir la imagen en un `canvas` y guardarla como JPEG con calidad reducida (42.128 → 26.881 bytes).
  No hace falta instalar nada.
- **Respaldo antes de tocar `compras`:** `pg_dump` lo escribe el usuario `postgres` en `/tmp` y se copia a `/root/backups`
  con el usuario del VPS (postgres no puede escribir directo en `/root/backups`).
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
0b. **Creer que una tabla "parecida" a Inventario está lista, y medir solo el padding** (17/11/2026): el dueño pide que
    sea **idéntica en estilo y tamaño**, no parecida. Comparar con `getComputedStyle` en el navegador: marco 1 px, fondo
    blanco, sin sombra ni radio, cabecera `#1E293B` con letra blanca 14 px / peso 900 / espaciado 2,8 px / padding
    16 px, filas padding 16 px y borde inferior 1 px. **El alto de fila de Inventario es 79 px** (lo marca la celda
    "Inversión" de 46 px + 32 px de padding + 1 px de borde); las tablas nuevas sin ese contenido quedaban en 71 px y
    hubo que fijar `min-h-[79px]`. Medir siempre las 3 tablas juntas antes de dar por terminado.
0c. **Borrar o no borrar un bloque que el dueño dijo "no quiero quitalo" sin confirmar justo antes** (17/11/2026): el
    dueño primero pidió quitar los cuadros de vehículos, luego dijo *"eso no quiero quitalo"* y al preguntarle eligió
    dejarlos; después cambió de opinión (*"cambie de opinion los cuadros si borralos"*). Si el contexto trae señales
    contrarias sobre borrar contenido, **preguntar una sola vez y esperar**; no dar por hecho la versión más reciente.
0a. **Traer productos sin filtrar `is_active` en un buscador, y dejar un borrador viejo en `localStorage`** (17/11/2026):
    el dueño borra un producto en Inventario (`is_active = 0`) y ese producto seguía saliendo en Nueva salida; además, al
    quitar el último material con la basura el borrador no se borraba y el material reaparecía al reabrir. Todo buscador
    de productos debe filtrar activos (`.eq('is_active', 1)` o `is_active !== 0`, como Inventario/Caja) y el autoguardado
    debe **quitar** la clave del borrador cuando ya no queda ningún dato que guardar. "Limpiar borrador" por sí solo no
    arregla un catálogo mal filtrado: hay que revisar las dos cosas.
0. **Inicializar `currentView` en `'pos'` fijo y guardarlo en `evicamp_last_view` al cargar** (17/11/2026): en Nego no
   existe la sesión Caja, así que al recargar se perdía la sesión real; `App` buscaba `sidebar-btn-pos`, no lo encontraba
   y el selector del sidebar caía en el primer botón. Además `SideBar` usa `vista` (sesión corregida) y `App` usaba
   `currentViewRef` sin corregir: dos efectos peleaban por el foco. Leer siempre la sesión guardada al iniciar y
   sincronizar `currentViewRef` con la sesión realmente visible.
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
33. **Búsqueda de tickets por ID vs. Número mostrado (6 dígitos) y columnas de ventas (`sunat_status`)** (30/10/2026): En `sales`, el `id` es un timestamp de 13 dígitos (`Date.now()`, ej: `1793398623154`), pero en tickets impresos y tablas se muestra solo los últimos 6 dígitos (`String(id).slice(-6)`, ej: `623154` o `#623154`). Al crear buscadores de tickets o cambios, NUNCA buscar solo con `eq('id', Number(input))`, porque el usuario escribe lo que ve en su ticket impreso (6 dígitos). La búsqueda debe coincidir sufijos (`endsWith` o `slice(-6) === input`). Además, en `sales` el estado se llama `sunat_status`, NO `status` (pedir `status` causa error 400 Bad Request en PostgREST).
34. **Columnas reales en PostgreSQL (`batches`, `sales`, `sale_details`)** (31/10/2026): La tabla `batches` NO tiene columna `batch_code`; el código del lote se guarda en `document_ref`. En `sales`, el total cobrado se almacena en la columna `total` (no `total_amount`), y en `sale_details` el precio se almacena en `price_at_moment` (no `unit_price`).
35. **Manejo de Stock de Combos y Kits (Fase 8)** (31/10/2026): Un producto de tipo 'COMBO' no almacena stock físico propio en lotes; su disponibilidad en la Caja se calcula dinámicamente según el insumo más limitante: `min(stock_insumo / cant_requerida)`. Al venderse en Caja, el trigger `fn_reduce_stock_from_sales` descuenta automáticamente de los lotes de sus insumos por FIFO y registra los movimientos en el Kardex (`movement_type = 'VENTA'`).
39. **`String.replace` con un texto que tiene `$$`** (03/11/2026): en JavaScript `$$` en el reemplazo se vuelve UN `$`, y rompió las funciones SQL (`$$` → `$`: "unterminated dollar-quoted string"). Al insertar SQL o cualquier texto con `$` usar `s.replace(a, () => b)`.
38. **Escapes en `node -e "…"` desde bash** (03/11/2026): `\b` terminó como carácter "retroceso" invisible dentro de un archivo de prueba y la expresión nunca coincidía (y el Edit no encontraba la línea). Para editar código, escribir el script en un archivo con la herramienta Write (como dice el n.º 17), nunca dentro de `node -e`.
37. **Cargar en un formulario el texto de relleno de la lista como si fuera un dato** (03/11/2026): Inventario/Caja/Conteos/Proveedores ponen `code: p.code || 'NO-SKU'` para mostrar. ModalProducto lo cargaba como código real y, con dos productos sin código, editar uno daba "ya existe en otro producto" y no guardaba. Al cargar un formulario, convertir los rellenos ('NO-SKU', 'SIN CATEGORÍA'…) en vacío.
36. **🚨 URGENTE · Contar como "Cobrado" de un período todo lo abonado de un fiado, sin mirar CUÁNDO se abonó** (02/11/2026, lo encontró un cliente real): en Utilidades, si un cliente pagaba HOY deudas de ventas de otros días, esas ventas viejas entraban COMPLETAS al "Cobrado" de hoy. Ejemplo: LATON PILSEN mostraba S/ 90 cobrados (5 ventas fiadas de sept-oct) que no se cobraron en ese período. Causa: `fraccionPagada` usaba `fiado.paid_amount` (todo lo abonado, de cualquier fecha). **Regla de dinero cobrado en un rango (siempre, en cualquier pantalla):** = lo pagado al momento de la venta (efectivo + yape + tarjeta + transferencia) **solo si la venta es del rango** + los abonos (`debt_payments`) **con fecha dentro del rango**. Nunca usar `fiados.paid_amount` para ingresos de un período (sirve solo para saber cuánto debe hoy). Es el mismo criterio del motor único `utils/ingresos.ts`. Arreglo: rama `fix/cobrado-utilidades` (commit 98b2961, sobre `main`); la ventana del producto marca "Venta anterior · cobrado en el período". **Ya está en `main`, en Evicamp, en clientes y en siumax (rama `fase-9-10-almacenes-catalogo`, commit b0bb2a8), subido el 02/11/2026.** Probado en la base demo `siudemo`: antes S/ 41.60, ahora S/ 21.60 (lo abonado hoy).
40. **Un script de edición que no encuentra el texto por espacios invisibles** (04/11/2026): algunos archivos tienen líneas "vacías" con espacios (ej. 13 espacios en Finanzas/index.tsx) y otros fin de línea CRLF; la herramienta Write puede quitar esos espacios del patrón y el reemplazo falla ("no encontré…"). Normalizar `\r\n` → `\n` en el archivo y en el patrón, y para líneas solo con espacios usar `' '.repeat(n)` o buscar desde un ancla única (`indexOf`) en vez del bloque completo. Si el script lanza error antes de `writeFileSync`, no se guardó nada: corregir y volver a correr.
47. **Colores de texto fijos (`text-[#1E293B]`, `text-black`…) en listas o tarjetas** (05/11/2026): en modo oscuro quedan oscuros sobre fondo oscuro (el dueño no leía las categorías). Usar siempre las variables del tema (`text-[var(--color-ink)]`, `text-[var(--color-muted)]`).
46. **Confiar en que los datos de siumax son como los de Evicamp** (05/11/2026): la Tienda Web andaba en siumax pero en Evicamp se caía por UN producto sin nombre. Todo texto que viene de la base puede ser null: nunca `.trim()`/`.split()` sin `(x || '')`. Para probar un arreglo con datos reales de Evicamp sin subirlo: puppeteer con intercepción de `/` y `/assets/*` sirviendo el `dist` local.
45. **Una regla CSS general que pinta de oscuro la letra blanca de las cabeceras** (04/11/2026): también tomó el botón oscuro "Ticket" del detalle del ticket y quedó letra oscura sobre fondo oscuro (el dueño: "no se ve la palabra ticket"). Toda regla general de colores debe excluir elementos con fondo propio (`:not([class*="bg-"])`) y revisarse con capturas.
44. **La barra de scroll "de siempre" no salía en Chrome/Edge nuevos** (04/11/2026): desde Chrome 121, si un elemento tiene `scrollbar-width` o `scrollbar-color`, se ignora `::-webkit-scrollbar` y sale una barra fina CON flechas. En `index.css` se dejan en `auto` dentro de `@supports selector(::-webkit-scrollbar)`. No volver a poner `scrollbar-width: thin` sin ese cuidado.
43. **Presionar Enter en una prueba automática sin saber dónde está el selector** (04/11/2026): la revisión del selector dio Enter en el calendario del cobro, el navegador de prueba no abre calendarios, el selector saltó a "Confirmar pago" y el siguiente Enter creó una venta real en siumax (se borró). En pruebas: después de cada tecla, comprobar dónde quedó el selector antes de dar Enter, y frenar si cambia el número de ventas.
42. **Dar por buena una ventana porque el botón "se alcanza con scroll"** (04/11/2026): el dueño vio "Ingresar lote" sin su botón Guardar (el medio tenía `sm:overflow-visible` y el pie quedaba fuera de la pantalla). Para él la ventana está bien solo si el botón principal se ve sin bajar. Las revisiones `revisar-ventanas*.mjs` ya lo exigen; agregar a su lista cada ventana nueva.
41. **Cambiar una tabla compartida sin mirar quién más la usa** (04/11/2026): `TablaMovimientos` la usan Finanzas (caja actual) y `ModalDetalleCaja` (detalle de una caja pasada). Al darle paginación hay que revisar el teclado en los dos lugares (`graphify explain "TablaMovimientos"` muestra quién la importa).
46. **La trampa de foco de ventanas bloqueaba el teclado en la ventana de impresión nativa (AnyDesk Printer / Chromium)** (04/11/2026): `ventanas.ts` escucha `focusout` y en `luego(0)` forzaba el foco a la web de SiuMax. Al abrirse la ventana de impresión, Chromium perdía el foco y el selector no dejaba presionar Imprimir o Cancelar. Solución: sincronizar flag `estaImprimiendo()` con `beforeprint` y `afterprint` para pausar la trampa de foco durante la impresión.
47. **No usar `display: flex` directo sobre un `<td>` en tablas HTML (`hidden md:flex`)** (04/11/2026): convierte la celda en contenedor flex perdiendo su display `table-cell`, lo que desalinea la celda respecto al `<th>` de la cabecera (el botón de acciones salía pegado a la derecha). Usar siempre `hidden md:table-cell` y envolver el botón dentro de `<div className="flex items-center justify-center">`.
49. **Cambiar de link un sitio que tenía la app guardada sin internet** (06/11/2026): el navegador guarda el sistema
    (service worker `sw.js`) por link; si en ese link se pone otra cosa, seguiría mostrando la copia vieja. Al pasar
    `siumax.duckdns.org` a Panel se sirve un `sw.js` que borra esa copia y se da de baja solo (`instalar-panel.sh`).
    El navegador también pide iniciar sesión de nuevo en el link nuevo (las sesiones y copias van por link).
48. **Un 401 que no era de sesión sacaba al usuario** (05/11/2026): en siumax `fn_edit_batch` y `fn_soft_delete_batch` no tenían EXECUTE para `anon` (en Evicamp sí); PostgREST responde 401 a "permission denied" del rol anon y `supabase.ts` cerraba la sesión con cualquier 401 → al guardar un lote el dueño salía al login. Arreglo: GRANT en `seguridad-sesion.sql` y solo el código `PT401` cierra la sesión. Para buscar algo así: `grep " 401 " /var/log/nginx/access.log` y `permission denied` en el log de PostgreSQL; revisar con `has_function_privilege('anon', oid, 'EXECUTE')` las funciones que llama el sistema.
49. **Unidades de un costo: por unidad vs. por lote** (05/11/2026): `products.costo_adicional_produccion` es POR UNIDAD, pero `fn_producir_receta(p_costo_adicional)` lo recibe por TODO el lote; la ventana vieja mandaba el de una unidad. Al pasar un costo entre pantalla y función, revisar qué unidad espera cada lado.
50. **No reescribir datos hijos que se cargan aparte** (05/11/2026): Nuevo producto borraba y volvía a insertar `product_recipes` con lo que tenía en memoria; si se guardaba antes de que terminaran de cargar, la receta quedaba vacía. Una pantalla solo debe escribir lo que de verdad edita.
51. **Nombres de campos entre la lista y la ventana** (05/11/2026): la lista de Inventario arma el producto con `imageUrl` y Nuevo producto lo leía como `image` → al editar la foto quedaba vacía y al guardar se borraba. Al cargar `initialData`, aceptar los dos nombres (`imageUrl || image_url`) y probar que "editar y guardar sin cambios" deja la fila igual.
52. **Montos en pantalla: `formatearMonto()`** (06/11/2026): todo monto que se MUESTRA con "S/" usa `formatearMonto(x)` de `src/utils/formato.ts` (S/ 16,200.00), no `x.toFixed(2)`. Para cálculos, campos de número y SUNAT, números sin formato.
53. **Cabeceras: nunca forzar una segunda fila** (06/11/2026): no usar `w-full 2xl:w-auto` ni `flex-col 2xl:flex-row` en la cabecera de una sección (el dueño quiere UNA fila en laptops); usar `flex-wrap` + `max-w-full` para que baje solo cuando no entra. Los botones/pestañas se compactan solos de 1024 a 1700 px (`index.css`). Medir con `scratchpad/medir-cabeceras.mjs`.
54. **Imprimir en otra ventana: copiar los estilos, no enlazarlos** (06/11/2026): el CSS de Vite lleva `crossorigin` y el servidor no manda CORS; un documento armado aparte (data:, about:blank) NO carga ese `<link>` y sale sin diseño. Copiar `document.styleSheets` en un `<style>`. Y en tickets: imprimir a 72 mm (lo que imprime una ticketera de 80 mm). Para revisar: el PDF del documento en modo impresión.
55. **Animaciones de aparecer y alto suave** (06/11/2026): `.aparecer` (index.css, con `backwards`: nunca `both`/`forwards`, porque deja capa propia y tapa listas flotantes) y `<AlturaSuave>` (src/components) para que una ventana no salte de tamaño. Dentro de AlturaSuave, las listas van en el flujo (no `absolute`).
56. **Funciones SQL repetidas: vale la ÚLTIMA** (11/11/2026): `fn_proteger_precios` está 4 veces en `seguridad-sesion.sql` (la de la fase 4.4 es la que queda). Antes de cambiar una función: `grep -n "FUNCTION public.<nombre>"` y cambiar la última; comprobar en la base con `prosrc like '%...%'`. Para que el servidor cambie algo que el trigger protege, marcar el permiso con `set_config('siumax.<algo>', '1', true)` dentro de la función (como `siumax.cpe_interno` y `siumax.costo_de_compra`).
57. **Stock de ventas: siempre por el servidor y con la nota `Ticket #N`** (11/11/2026): el trigger de `sale_details` descuenta FIFO salvo que ya haya salidas `VENTA` con nota exacta `Ticket #<id completo>`. Si una pantalla mueve stock a mano (`products.quantity`), los lotes no cuadran y una línea nueva se descuenta dos veces. Usar funciones como `fn_mover_stock_cambio`.
58. **Botón Guardar con `disabled` mientras guarda = el selector se pierde** (12/11/2026, Tipo de negocio). Al desactivarse, el navegador saca el foco del botón. Al cerrar el aviso, el sistema lo devuelve a otro lado (la primera pestaña). Usar `aria-disabled` + `if (guardando) return;` en la función. Probar siempre: después del aviso, el selector sigue en Guardar.
59. **Al armar SQL con JavaScript, `String.replace` con un texto de reemplazo cambia los signos `$`** (12/11/2026, paso 3a): `$$` se vuelve `$` (las funciones `$$ … $$` quedan rotas: error de sintaxis) y `$` seguido de comilla invertida mete TODO el texto anterior (así se rompió esta misma nota: el archivo quedó con 661 líneas repetidas, arreglado en la bitácora 149). Usar `slice` o una función como reemplazo (`s.replace(a, () => b)`), también al editar estos documentos. Aplicar el SQL siempre con `-v ON_ERROR_STOP=1` para ver el primer error.
60. **Al traer funciones SQL de Servic a Nego, revisar los nombres de columnas** (12/11/2026, bitácora 149): `fn_registrar_consumo_visita` leía `products.cost`, que en Nego es `cost_price`. plpgsql no avisa al crear la función: falla recién al usarla. Probar cada función con datos reales (una transacción con ROLLBACK sirve). Para sacar o devolver stock en Nego, usar `fn_nego_descontar_stock` / `fn_nego_devolver_stock` (lotes por FIFO + movimiento de inventario), no restar `products.quantity` a mano.
61. **Panel del VPS: no usar `node ai-scripts/cliente.cjs panel` solo para actualizarlo** (12/11/2026, bitácora 153): ese comando también reconfigura Mercado Pago (sin `MP_COBRAR=si` lo pasa a modo prueba con `MP_ACCESS_TOKEN_PRUEBA`, aunque hoy esté "Cobrando"). Para subir cambios del panel: respaldar `/opt/siuhub/panel`, subir los archivos y `systemctl restart siuhub-panel` (así lo hace `cliente.cjs nego`). Antes de subir scripts del servidor, comparar con lo que hay en `/opt/siuhub` (ignorando `\r`): en el repositorio puede haber cambios que nunca se subieron y que pueden estar rotos (probar con `bash -n`).
62. **Tablas con campos para escribir: `data-tabla-campos`** (13/11/2026, bitácora 155): `flechasEspaciales.ts` trata toda fila `tbody tr` como una lista con su propio teclado (no deja salir ni entrar con flechas). Si una tabla tiene inputs (líneas de cotización, materiales, etc.), marcar el `<table data-tabla-campos>` para que las flechas se muevan como en un formulario. Y un buscador con lista propia solo debe usar ↑ ↓ cuando su lista está abierta.
63. **Nunca pedir `products` con `*` en listas o cálculos** (13/11/2026, bitácora 156): en Evicamp 1.140 productos tienen la foto DENTRO de `image_url` (data: base64, 27 MB en total). Usar `COLUMNAS_PRODUCTO` (`src/utils/cacheFotos.ts`, sin la foto); las fotos se cargan aparte con `cacheFotos`. Tablas grandes: `traerTodo` con `.order('id')` (bloques en paralelo). El VPS no comprime JSON ni JS salvo en los sitios con `compresion.sh`; medir con `ai-scripts/pruebas/medir-carga-secciones.mjs`.
64. **Flechas = mover el selector, Enter = elegir; el foco programático lo devuelve el imán** (20/11/2026, fase 194): en la vista previa del comprobante de salida las flechas ←→↑↓ solo resaltan el botón; el formato (hoja/ticket) cambia con **Enter**. Una prueba que esperaba que `→` cambiara el formato directamente estaba mal planteada. Tampoco sirve `boton.focus()` para llevar el foco a un trabajador: el imán global lo devuelve al campo anterior; en la prueba se llega con `Tab` real hasta `[data-prueba-trabajador]`. Ojo con «Lo que se atiende» en tablet/laptop/PC: una flecha desde ese select cae en la fecha y el Enter abre el calendario, que atrapa el foco y hace que el trabajador no se marque; mejor no tocar ese campo en la prueba (es opcional). Entre tamaños de prueba, limpiar `siumax_servic_borrador_salida` y `salidas_formato_impresion`: el borrador restaura cliente/trabajador/material y el formato se recuerda, y un Enter de más desmarca lo restaurado o la previa abre en otro formato del esperado.
65. **Comprobante de salida: ticket por defecto y sin firma** (20/11/2026, fase 195): el dueño quiere que la vista previa abra en **ticket de 80 mm** y que no aparezca el bloque de firmas («Responsable técnico» / «Recibido / conforme»); se quitó de los dos formatos. La hoja A4 sigue disponible y se recuerda si la elige (`salidas_formato_impresion`). Al cambiar el formato inicial, revisar la prueba: las aserciones que daban por hecho que abría en hoja quedan mal y hay que invertirlas (`←` + Enter para ir a hoja, `→` + Enter para volver a ticket).

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
- **Descuentos especiales (%):** `customers.descuento_porcentaje` y `grupos_clientes.descuento_porcentaje`. En la caja POS se calcula como `Math.round(base * (1 - pct / 100) * 100) / 100`. Si el cliente pertenece a una empresa o familia con descuento, se toma el mayor (`Math.max(cliente.descuentoPorcentaje, grupo.descuentoPorcentaje)`). Si además el producto tiene un precio mayorista aún más bajo y el cliente es mayorista, se le otorga el precio menor.

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

## 12. Lecciones Técnicas de Automatización y Base de Datos (Fase 7)
- **Tablas con ID autoincremental en PostgreSQL para PostgREST:** al crear tablas hijas como `product_variants`, siempre definir `id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`. Si se define solo `id bigint PRIMARY KEY`, PostgreSQL no genera la secuencia y los inserts desde PostgREST/Supabase fallan con `null value in column "id"`.
- **Avisos propios del sistema en pruebas con Puppeteer (`dialogos.tsx`):** `window.alert()` está interceptado por `avisar()` y abre un modal en el DOM (`<div data-dialogo-sistema>`) con el botón `#dialogo-sistema-aceptar`. Mientras está visible, secuestra todo el teclado (`stopImmediatePropagation`) hasta cerrarse. No activa el evento nativo `page.on('dialog')` de Puppeteer; se debe esperar y pulsar `#dialogo-sistema-aceptar` o enviar `Enter`.
- **Probar funciones seguras por SQL desde scripts (`fn_anular_venta`):** revisa `fn_empleado_de_sesion()`, el cual lee la cabecera `x-sesion`. Para probarlas por `psql`, se debe ejecutar antes: `SELECT set_config('request.headers', json_build_object('x-sesion', token::text)::text, false) FROM sesiones ORDER BY ultimo_uso DESC LIMIT 1;`.
- **Desacoplamiento y sincronización de lotes con variantes (`batches.variant_id`):** en la fase 7, para que los lotes se adapten a productos con tallas/colores, `batches` cuenta con `variant_id bigint` y `variant_name text`. Cuando un lote tiene `variant_id`, representa el ingreso específico de esa variante. El trigger de ventas `fn_reduce_stock_from_sales` descuenta primero de los lotes de esa variante (`WHERE variant_id = NEW.variant_id`), y si no hay lotes o se agotan, descuenta directamente de `product_variants.quantity`. Además, las funciones `fn_edit_batch` y `fn_soft_delete_batch` detectan si el lote editado o borrado pertenece a una variante y sincronizan tanto `products.quantity` como `product_variants.quantity` automáticamente (con su respectivo movimiento Kardex).
- **Recarga de esquema en PostgREST tras alterar columnas:** tras agregar `variant_id` y `variant_name` a `batches` mediante `ALTER TABLE`, PostgREST debe recargar su caché de esquema ejecutando `NOTIFY pgrst, 'reload schema';` para permitir insertar o seleccionar dichas columnas sin error 400.
- **Separación de responsabilidades: Identidad y Precios vs. Stock en Lotes:** en productos con tallas/colores, la ventana de creación/edición de producto (`ModalProducto`) es para definir la identidad (tallas, colores, códigos de barras) y el precio de venta individual de cada variante (ya que varían por prenda o talla). El stock inicial de mercadería no debe pedirse en esa ventana: se alimenta de forma limpia y transparente mediante el botón `[ Ingresar Lote ]`, asociando su costo de compra unitario, comprobante y proveedor.
## 13. Lecciones Técnicas de Producción y Recetas (Fase 8)
- **Inicialización de modales con lista de opciones:** Cuando un modal de acción general (como `[ + Producir ]`) se abre desde una cabecera global sin un elemento preseleccionado, **nunca** debe autoseleccionar el primer registro del array por defecto (`array[0]`). Debe iniciar con estado vacío `""`, mostrar la opción `-- SELECCIONA UN PRODUCTO --` y una tarjeta informativa con instrucciones claras. La preselección automática solo debe ocurrir cuando el usuario hace clic en el botón específico de una fila (`productoInicial`).
- **Limpieza rigurosa de datos en pruebas automatizadas:** Al ejecutar tests con Puppeteer o scripts SQL que inserten datos de prueba con nombres aleatorios o prefijos (ej. `P8`), todo el flujo debe envolverse en un bloque `try ... finally` que garantice la eliminación de los registros (productos, recetas, lotes) en la base de datos de pruebas `siumax`, evitando que queden elementos residuales visibles cuando el dueño entre a probar manualmente.

## 14. Diseño de Modales Complejos: Ventana Principal Fija + Panel Lateral Adosado
- **Separación de datos básicos y datos avanzados:** Para evitar abrumar al usuario con decenas de campos en una sola pantalla, la ventana principal del modal debe contener únicamente los datos esenciales e inmediatos (Nombre, Categoría, SKU, Barras, Foto, PVP en Caja, Mayorista opcional, Stock Mínimo).
- **Cómo mantener la ventana central 100% inmóvil al abrir un panel lateral:**
  - Si se usa `flex` y se inserta un panel hermano dentro del flujo flex normal, el contenedor recalcula el centrado y la ventana principal "salta" hacia la izquierda.
  - Para evitar cualquier movimiento:
    1. El modal central se envuelve en un contenedor con `relative` y tamaño fijo (`max-w-2xl`).
    2. La pestaña o flechita vertical se adosa al borde exterior derecho con `absolute -right-10 top-16` (o botón en cabecera).
    3. El panel lateral de opciones avanzadas se posiciona adosado a la derecha mediante `fixed xl:absolute xl:left-[calc(100%+12px)] top-10 xl:top-0 bottom-10 xl:bottom-0 max-w-[490px]`.
    4. De esta manera, el modal central conserva su posición exacta a nivel de pixel (comprobado con `getBoundingClientRect` en Puppeteer: `x, y, width` idénticos antes y después de abrir el panel).

## 15. Preferencia de Usuario: Despliegue Vertical vs Paneles Múltiples
- **Un solo botón claro y directo:** Si una funcionalidad avanzada puede desplegarse en la misma vista, es preferible evitar saturar la interfaz con múltiples botones de acceso (por ejemplo en cabecera, lateral y footer simultáneamente). Cuatro botones para una misma acción se perciben redundantes e invasivos.
- **Despliegue vertical hacia abajo (Acordeón):** Cuando el usuario prefiera no tener paneles flotantes o adosados, colocar un único botón banner al final de los datos básicos (`#btn-toggle-opciones-avanzadas`) que alterne entre `"Desplegar ▼"` y `"Ocultar ▲"`. Al desplegarse hacia abajo dentro del contenedor con scroll `.custom-scrollbar`, permite al usuario ingresar o saltarse las opciones avanzadas de manera natural y sin distracciones visuales.

## 17. Facturación electrónica (Fase 11)
- **`sales.sunat_status` NO es de SUNAT:** es el estado interno ACEPTADO/ANULADO que filtran TODOS los reportes. El estado real del comprobante va en `cpe_estado` (PENDIENTE, ENVIANDO, ACEPTADO, OBSERVADO, RECHAZADO, ERROR). No mezclarlos.
- **`doc_type`:** NULL = nota de venta, 1 = factura, 3 = boleta. La serie y el número los pone SOLO el trigger `trg_asignar_comprobante` (la pantalla no los manda). La venta se guarda antes que sus productos: el facturador espera 4 s y, si no hay productos, espera hasta 2 min sin gastar intento.
- **La clave del proveedor** está en el esquema `privado` (sin permisos para la API). Se escribe con `fn_guardar_credenciales_facturacion` y se ve enmascarada con `fn_estado_credenciales_facturacion`. Nunca ponerla en una tabla de `public`: cualquier sesión puede LEER cualquier tabla de public (fn_verificar_peticion solo revisa permisos al escribir).
- **Funciones internas** (ej. `fn_siguiente_correlativo`): `REVOKE EXECUTE ... FROM PUBLIC`, porque por defecto la API las puede llamar.
- **El facturador** corre en el VPS como usuario postgres (por eso salta las protecciones de la API). Se actualiza con `node ai-scripts/facturador-servidor.cjs <bases...>` (no corta ventas). Ver sus mensajes: `journalctl -u siumax-facturador -f`.
- **Los datos del negocio (RUC, razón social, dirección, ubigeo, régimen) están SOLO en `empresa_config` (Ajustes > Datos de la empresa)** (02/11/2026, pedido del dueño: "un solo lugar, para tener el orden"). Facturación los lee de ahí; no duplicar datos de la empresa en otras tablas o pestañas.
- **RUC de prueba:** usar uno con dígito verificador correcto (ej. 20601234565); la pantalla valida con `rucValido()`.
- **Directo a SUNAT (11.8):** en PRUEBA el usuario es `{RUC}MODDATOS` / `moddatos` y sirve cualquier certificado (se autogenera uno); en REAL va el usuario SOL SECUNDARIO del negocio (nunca la Clave SOL principal del dueño) + su certificado .pfx. Todo eso vive SOLO en `privado.facturacion_credenciales`. Probar sin tocar bases: `prueba-sunat-beta.mjs` en el VPS.
- **Firma del XML:** la firma va dentro de `ext:UBLExtensions` (enveloped) con C14N; si se cambia el XML DESPUÉS de firmar, SUNAT lo rechaza (error 2335). Montos siempre con 2 decimales y la leyenda 1000 en letras.
- **Una boleta/factura aceptada NUNCA se edita** (03/11/2026): cambio = `fn_cambiar_con_nota_credito` (NC + comprobante nuevo); devolución = `fn_devolver_con_nota_credito`. No hay ventana "Comprobantes": el estado SUNAT vive en las tablas de Finanzas y en el detalle del ticket (`#bloque-sunat`); los problemas, en `ModalComprobantesProblema` (el dueño no quiere ventanas que repitan datos).
- **Finanzas: recargar SIEMPRE con `cargarDatosCaja(true)` mientras hay una ventana abierta**: sin `true` muestra "Calculando Bóveda…", desmonta todo y la ventana pierde su estado.
- **Un manejador de teclado en captura que hace `stopPropagation()` de Escape mata `useCerrarConEscape`** (escucha en burbuja en window): la ventana del cambio nunca se cerraba con Escape. Dejar pasar Escape y que cada lista lo detenga solo cuando cierra algo suyo.
- **Anular un comprobante NO aceptado (04/11/2026):** nunca nota de crédito si el proveedor no lo generó: `ANULANDO` → el facturador confirma → `NO_EMITIDO`. Con **Nubefact las boletas quedan PENDIENTE con PDF** hasta el resumen diario de SUNAT: eso es EMITIDO (no es problema; se anula con NC). Usar `comprobanteEmitido(estado, pdf)` para decidir. Series de la cuenta demo de Nubefact: BBB1 y FFF1 (también para sus NC).
- **Molde único de tablas (03/11/2026, pedido del dueño: "todas iguales"):** toda tabla de sección usa las clases `tabla-marco` (borde fino, fondo blanco, SIN sombra), `tabla-cabecera` (oscura, letra 0.875rem, espaciado 0.2em) y `tabla-fila` de `src/index.css`. Modelo: Inventario > Productos. El fondo de cada sección es `bg-[var(--color-bg)]` (no `surface`). Una tabla nueva NO inventa sombras ni cabeceras propias.
- **CRLF en este repo:** algunos .tsx tienen CRLF y `grep -c $'\r$'` en Git Bash dice 0 igual. Revisar con node (`texto.includes('\r\n')`), y en scripts de reemplazo normalizar con `.replace(/\r\n/g, '\n')` al leer y devolver CRLF al guardar. Los scripts escritos con Write pueden quedar con CRLF también.

## 16. Lecciones Técnicas y Reglas de Diseño de Fases 9 y 10 (Almacenes y Tienda Web)
- **La Tienda Web NO debe verse como la caja** (02/11/2026, el dueño la vio "fea"): `index.css` tiene `* { border-radius: 0 !important }`, letra agrandada y el tema oscuro del dueño. La tienda va envuelta en `.tienda-web`, que pone la letra normal y quita la animación de botones. **Las esquinas siguen RECTAS: el dueño NO quiere nada con curvas en ningún lado, ni en la tienda pública** (02/11/2026: "todo cuadrado, recuerda no usamos nada con curvas en las esquinas"). No usar `revert-layer` ni quitar el `* { border-radius: 0 }`. La tienda quita `data-theme` mientras está abierta. Cualquier página PÚBLICA nueva debe ir dentro de `.tienda-web` o algo igual.
- **Link de WhatsApp:** usar `numeroWhatsapp()` de `TiendaWeb/formato.ts` (pone 51 una sola vez). Nunca inventar un número si el negocio no configuró el suyo.
- **Menú lateral de operaciones:** El dueño rechazó tajantemente tener el botón "TIENDA WEB" en el menú lateral bajo Operaciones ("no quiero eso"). El menú de operaciones debe mantenerse limpio y enfocado a la caja física (únicamente `Caja` y `Clientes`). La Tienda Web no es una sección operativa interna: se configura en **Ajustes > Tienda Web** y los clientes externos acceden mediante el enlace público `#/tienda`. **No volver a agregar Tienda Web al Sidebar.**
- **Nombre de columna de costo en PostgREST:** En la tabla `products`, la columna se llama `cost_price`. Hacer `select=...,cost,...` devuelve error HTTP 400 Bad Request. Siempre usar `cost_price`.
- **Estructura de la tabla `stores`:** Usa nombres de columnas en español: `nombre`, `codigo`, `direccion`, `telefono`, `whatsapp`, `es_almacen_principal`, `activo`.
- **Acceso público sin JWT a funciones RPC de Tienda Web:** PostgREST valida sesiones mediante `fn_verificar_peticion()`. Toda función destinada a clientes externos anónimos (`fn_catalogo_publico`, `fn_crear_pedido_web`) debe ser explícitamente exceptuada (whitelist) en dicha función para permitir llamadas POST sin token `x-sesion`.
- **Campo de dirección en checkout:** En el modal de pedidos de Tienda Web (`TiendaModalPedido`), el input de dirección (`#input-pedido-direccion`) solo se renderiza si la modalidad elegida es Delivery (`#btn-entrega-delivery`). Por defecto está en Recojo en tienda (`#btn-entrega-recojo`).


## 17b. Utilidades › Gráficos y detalles (05/11/2026)
- El cálculo de Utilidades vive en `src/sections/Utilidades/calcularAnalisis.ts` (tabla y tablero usan el mismo). Fórmulas del tablero (en la cabecera de `TableroGanancias.tsx`): ganancia bruta = ingresos − costo; neta = bruta − gastos de caja − mermas; margen = ÷ ingresos; ticket = vendido ÷ n.º ventas; punto de equilibrio = gastos fijos del mes ÷ margen bruto; margen de seguridad = (ventas del mes − PE) ÷ ventas del mes; rotación = costo anualizado ÷ stock al costo; días de stock = 365 ÷ rotación; GMROI = ganancia bruta anualizada ÷ stock al costo (<1 = plata parada); merma % = mermas ÷ costo (>2 % alerta); ABC 80/15/5 por ganancia.
- Gráficos: guía dataviz (cargar el skill antes), colores `.tablero-graficos` en index.css validados con su script; un solo eje; valores escritos; sin esquinas redondeadas.

## 18. Estilo oficial "SiuMax Sobrio" (04/11/2026) — receta para continuar
El dueño eligió el aspecto de **Inventario > Productos** y lo llamamos **SiuMax Sobrio** ("el contenido primero"). Sus
palabras: *"la tabla la resaltan los botones y el buscador, y el fondo no me distrae"*. Revisa que sea **idéntico** a
Inventario, no parecido, y manda capturas con lo distinto marcado en rojo.

**Ya hecho (solo siumax):** Inventario (Productos, Lotes, Compras), Clientes (Clientes, Créditos, Cotizaciones, Pedidos),
Conteos, Finanzas (caja actual), Ver historial, Utilidades y Ajustes. **Falta:** Proveedores y, si el dueño quiere, las tablas dentro de ventanas (preguntarle primero).

**Piezas compartidas (en `src/index.css`, alrededor de la línea 760; no inventar estilos nuevos):**
- Tabla: `tabla-marco` (contenedor), `tabla-cabecera` (thead oscuro), `tabla-fila`; filas con `border-b` fino, sin rayas verticales gruesas.
- Cabecera de sección: `bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-4 sm:py-6`,
  ícono w-10 h-10 verde (`--color-accent`) con su sombra, h1 `text-xl lg:text-2xl font-black uppercase tracking-widest`;
  el subtítulo va como `title` del bloque, no como texto.
- Botones de la cabecera: `boton-cabecera` (blanco, borde fino, letra oscura, sin sombra) y el color SOLO en el ícono:
  `style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}`. "Nuevo X" va en la cabecera con `<Plus/>`.
- Pestañas: contenedor `pestanas-sobrias` + `data-activa` en el botón elegido. Filtros de estado como pestañas: `pestanas-filtro`.
- Tarjetas de métricas: `tarjeta-sobria` (sin sombra ni salto al pasar el mouse; nada de bloques negros o de color).
- Buscador (FUERA del marco de la tabla):
  `<div className="buscador-sobrio w-full xl:flex-1 shrink-0"><div className="buscador-sobrio__icono"><Search size={18}/></div><input …/>`
  y, si hay texto, `<div className="buscador-sobrio__match"><span className="buscador-sobrio__conteo">{n} MATCH</span><button className="buscador-sobrio__borrar"><X size={14}/></button></div>`.
  Escape borra la búsqueda.
- Fila buscador + filtros: `flex flex-col xl:flex-row gap-3 sm:gap-4 shrink-0 items-stretch xl:items-center justify-between`;
  filtros en `grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto`, cada select/fecha con
  `filtro-sobrio w-full sm:w-auto` y al final el botón `limpiar-sobrio` con `<FilterX size={16}/>`.
- Paginación arriba Y abajo de la tabla: `paginacion-sobria` + `border-b`/`border-t`, texto `paginacion-sobria__texto`
  ("Página X de Y") y flechas `paginacion-sobria__boton` con `aria-disabled`. **Regla desde el 17/11: se dibuja
  SIEMPRE**, aunque no haya filas y diga "Página 1 de 1" (el dueño lo aprobó; antes se ocultaba).(componente compartido
  `src/components/PaginacionSobrio.tsx`: ids `btn-pag-${prefijo}-ant/sig` arriba y `btn-pag-bottom-${prefijo}-ant/sig`
  abajo; admite ids propios para no romper secciones ya probadas como Salidas y Utilidades).
- Tabla vacía: `<div className="vacio-sobrio"><Search size={32}/>No se registran … con esos parámetros.</div>`.
- Margen lateral del contenido: `px-2 sm:px-3` (la tabla usa casi todo el ancho).
- Las VENTANAS (modales) siguen con su borde 2 y sombra de 8 px: este estilo es para las secciones.

**Teclado (obligatorio, probarlo con puppeteer):** ↑ desde buscador/filtros va a un botón de la cabecera; → recorre
buscador → filtros → limpiar (en el buscador solo si el cursor está al final); ↓ baja a la paginación de arriba y de ahí a
la primera fila; ↑ desde la primera fila vuelve a la paginación de arriba; ↓ desde la última fila va a la paginación de
abajo. Conservar SIEMPRE los `id` y los `onKeyDown` que ya existían (otras partes y pruebas los usan).

**Ventanas flotantes (04/11/2026):** TODAS con el estilo del detalle de producto de Utilidades: `ventana-sobria` en el marco (sin
sombra), `ventana-cabecera` clara con `style={{ '--icono': color }}` (el color va solo en el cuadrito del ícono), `ventana-cabecera__titulo`
en el h2 (su primer ícono se vuelve el cuadrito) y `ventana-cerrar` en la X; cifras en `ventana-cifras`, listas en `ventana-recuadro`.
En una ventana nueva usar estas clases (ver `src/sections/Utilidades/components/ModalDetalleProducto.tsx`); nada de cabeceras de color ni
sombras desplazadas. `ai-scripts/estilo-ventanas.cjs` (sin --aplicar) lista qué ventanas no las tienen.

**Que se vea completo en cualquier pantalla (04/11/2026, pedido del dueño):** nada puede quedar cortado por la ventana,
de un celular a un monitor grande.
- Cabecera: contenedor `flex flex-wrap justify-between items-center gap-4`; título con `shrink-0`; pestañas y grupos de
  botones con `min-w-0` (NUNCA `shrink-0` ni `overflow-x-auto` en las pestañas) y `flex-wrap` en los botones. Las
  `pestanas-sobrias` ya bajan solas a otra fila.
- Ventanas: alto máximo con `--alto-pantalla`, cabecera y pie fijos (`shrink-0`) y el medio con `flex-1 min-h-0 overflow-y-auto`.
  El botón principal (Guardar…) va en el PIE y se ve siempre sin bajar. NUNCA `overflow-visible` en el medio (aunque sea para que
  un desplegable no se corte) ni `overflow-y-auto` en toda la ventana (el pie se va con el scroll). Si la
  ventana debe verse entera en laptops (720-768 de alto), modo compacto con `[@media(max-height:820px)]:…`.
- Después de tocar pantallas, correr `ai-scripts/pruebas/estilo/revisar-tamanos.mjs`, `revisar-ventanas.mjs` y
  `revisar-ventanas-caja.mjs` (7 tamaños; ❌ = algo cortado, con captura).

**Ejemplos para copiar:** `src/sections/Conteos/components/FiltrosConteos.tsx` (buscador + filtros + teclado con el
helper `teclas(izq, der)`), `src/sections/Finanzas/components/TablaMovimientos.tsx` (paginación con `paginacion(pos)`),
**Regla universal de memoria de fila al cerrar ventanas o submodales (04/11/2026, orden del dueño):**
Al presionar Escape o X para cerrar cualquier ventana o submodal (ej. detalle de ticket sobre detalle de caja, o detalle de caja sobre historial), el selector NUNCA debe saltar arriba al buscador ni a otro elemento. Siempre debe regresar exactamente a la fila que estaba seleccionada.
Técnica obligatoria:
1. En componentes con submodales (`ModalDetalleCaja.tsx`, etc.): NO poner auto-focus al buscador en `useEffect` que dependa del estado del submodal (`ticketSeleccionado`). Guardar el ID en `ultimoTicketRef` y, al cerrar, restaurar el foco directo a `mov-row-${id}`. El auto-foco al buscador solo debe ocurrir en la apertura inicial (`yaEnfocoInicialRef`).
2. En `src/utils/ventanas.ts`: `enVentana` es un `WeakMap<HTMLElement, Recuerdo>` que guarda `{ el, id, fila, texto }` para cada nivel de ventana. Si el foco cayó en un buscador (`esBuscador`) por algún imán o efecto residual, `devolverEnVentana` y `devolver` detectan que había una fila recordada y la restauran inmediatamente.
3. Todas las filas de tablas interactivas deben tener `data-row="true"` y su ID único (ej. `mov-row-${id}`, `caja-row-${id}`) para que el selector las localice sin ambigüedad.

**Aprovechamiento de espacio en ventanas flotantes anchas (04/11/2026):**
En ventanas grandes (`max-w-4xl` o más) como `ModalGrupo.tsx`:
- Nunca dejar botones sueltos en `BarraFiltros` que generen 50-60% de espacio en blanco lateral o botones huérfanos en segunda fila.
- Patrón estándar: Cifras clave arriba en cuadrícula sobria (`grid grid-cols-2 sm:grid-cols-3 gap-px bg-[var(--color-border)]`) con números mono y estado claro, y debajo los botones de acción alineados al 100% en cuadrícula simétrica (`grid grid-cols-2 sm:grid-cols-4 gap-2`) con altura uniforme (44px) y navegación por teclado fluida.

**Acciones de Comprobante y Notas de Crédito en ModalDetalleTicket (04/11/2026):**
- Nunca mezclar botones de Boleta/Factura con los de Nota de Crédito en una sola franja desordenada con etiquetas largas (`Nota de crédito BBB1-...`) que se desbordan dejando botones solos en la fila 2.
- Patrón: Dos bloques separados claramente. Arriba, las acciones de la Boleta/Factura (`[ ↗ PDF ]`, `[ ↗ XML ]`) en cuadrícula simétrica (50% cada una). Abajo, la Nota de Crédito en recuadro sobrio punteado con su cabecera y sus 2 botones directos (`[ 🗎 VER NOTA ]`, `[ 🔄 REENVIAR ]`, 50% cada una, altura 36px, 100% de ancho).
- Selector por teclado: `ArrowDown` baja en orden de lectura: Cabecera → Boleta → Nota de Crédito → Botón Reimprimir; `ArrowUp` sube en sentido inverso; `ArrowLeft` / `ArrowRight` navega entre los botones de cada fila.

**Visibilidad del selector por teclado en Modo Oscuro (04/11/2026, orden del dueño):**
- En Modo Oscuro (`html[data-theme="dark"]`, `html.theme-monochrome`), el selector por teclado NUNCA debe usar aros oscuros pizarra (`#334155`) ni opacidades tenues (`0.35`) que se camuflen con el fondo carbón `#0B0F17` / `#111827`.
- Reglas obligatorias en `src/index.css`:
  1. `.boton-cabecera:focus-visible`: Doble anillo esmeralda brillante (`box-shadow: 0 0 0 2px #0B0F17, 0 0 0 4px #10B981, 0 0 12px rgba(16, 185, 129, 0.55)`), fondo iluminado `#162438`, texto `#FFFFFF` e ícono verde.
  2. Ningún botón en reposo debe tener bordes verdes que se confundan con el foco (usar `:not(.boton-cabecera)` en reglas que agreguen acentos fijos).
  3. Filas de tabla (`.tabla-fila:focus-visible`, `[data-row="true"]:focus-visible`): fondo `#162438`, barra lateral izquierda gruesa de 4px verde esmeralda `#10B981` y marco perimetral esmeralda nítido.
  4. Filtros y buscador: marco esmeralda brillante de 2px.
  5. Clic con el ratón: siempre limpiar con `:focus:not(:focus-visible)` para que no quede ningún resalte ni aro pegado.

**Scrollbar 100% rectangular cuadrado SiuMax Sobrio y sin flechas (04/11/2026, orden del dueño):**
- En Chromium 121+ (Edge y Chrome en Windows 11), si un elemento tiene declaradas las propiedades CSS estándar `scrollbar-width` o `scrollbar-color`, el navegador ignora por completo los pseudoelementos `::-webkit-scrollbar*` y recurre al motor nativo Fluent de Windows 11, mostrando una cápsula redondeada con flechas en los extremos.
- Regla obligatoria: NUNCA aplicar `scrollbar-width` ni `scrollbar-color` directamente en Chromium. Esas propiedades deben ir ÚNICAMENTE dentro de `@supports not selector(::-webkit-scrollbar)` como fallback de Firefox.
- Para WebKit/Blink: definir `*::-webkit-scrollbar` (6px), `*::-webkit-scrollbar-button { display: none !important; width: 0; height: 0; }` y `*::-webkit-scrollbar-thumb { border-radius: 0px !important; border: none !important; }`. La barra debe ser estrictamente rectangular plana, con esquinas en ángulo recto de 90° (cero curvas), sin botones de flechas.

**Desactivación Global de Autocompletado y Sugerencias del Navegador (04/11/2026, orden del dueño):**
- En un POS y sistema de tablas con teclado, los globos de sugerencias/historial del navegador (ej. '308') tapan las filas de datos.
- En `src/main.tsx` se instaló un listener global en `document.addEventListener('focusin', ...)` que aplica automáticamente `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"` y `spellcheck="false"` a todo input o textarea que reciba foco.
- En inputs de búsqueda principales (como `#buscador-detalle-caja`) se agregan explícitamente estos 4 atributos en el JSX.

**Navegación espacial en enlaces y formularios (04/11/2026):**
- Cuando haya un campo de texto con botones a sus lados (ej. enlace público con `[ Copiar Enlace ]` y `[ Ver Tienda ]` en Tienda Web), implementar `onKeyDown`: `ArrowRight` salta del input a los botones; `ArrowLeft` regresa al input; y `ArrowDown` / `ArrowUp` se desplazan entre los campos del formulario.

**Navegación por teclado y foco al botón [ X ] de borrado en buscadores (04/11/2026, orden del dueño):**
- En todo buscador del sistema que muestre el botón `[ X ]` (`buscador-sobrio__borrar`) cuando hay texto:
  1. NUNCA ponerle `tabIndex={-1}` ni omitir un ID único. Siempre debe tener `id="btn-borrar-buscador-..."` para que el selector por teclado lo reconozca.
  2. En el input de búsqueda, al pulsar `ArrowRight` (cuando el cursor está al final del texto), si hay texto, el foco debe pasar inmediatamente al botón `[ X ]` en lugar de saltarse directamente a los filtros.
  3. En el botón `[ X ]`:
     - `Enter`, `Espacio` o `Escape`: borra el texto de la búsqueda y devuelve el foco automáticamente al input del buscador.
     - `ArrowLeft`: devuelve el foco al input del buscador con el cursor al final del texto (`setSelectionRange`).
     - `ArrowRight`: avanza al primer select o filtro a la derecha.
     - `ArrowDown`: desciende a la tabla de datos o controles inferiores.
     - `ArrowUp`: asciende a las pestañas o botones de la cabecera.
  4. En el primer filtro adyacente: al pulsar `ArrowLeft`, si el buscador tiene texto, el foco debe volver al botón `[ X ]`; si no tiene texto, vuelve directo al input del buscador.
  5. Estilo visual de foco en `src/index.css`: `.buscador-sobrio__borrar:focus` y `:focus-visible` deben mostrar fondo rojo vibrante `#DC2626`, texto blanco, doble anillo de foco y bordes 100% rectos sin esquinas redondeadas (`border-radius: 0px`).

**Escáner de códigos de barras por cámara EXCLUSIVO para celular (`BotonEscanerCelular.tsx` + `decodificarBarras.ts`, 12/11/2026):**
- El dueño pidió un botón `[ 📷 ]` que solo aparezca en celular (`< 768px`, clase `.solo-celular-escaner` con `display: none !important` en `>= 768px`) y nunca en PC, laptop ni televisor.
- Funciona 100 % sin internet: combina `BarcodeDetector` nativo del navegador con un decodificador propio en TypeScript (`EAN-13`, `UPC-A`, `EAN-8`, `CODE-128`) sobre `<canvas>`, más opción de linterna (`torch`) y botón de respaldo `"Tomar foto del código"`.
- Cuando se escanea en un buscador de selección de producto (`ModalAjuste`, `ModalLote`, `PanelCompras`, `ModalProduccion`, `ModalTraspaso`, `ModalFiado`, `ModalEditarSalida` o `TerminalBusqueda` en Caja), `buscarProductoPorCodigo(productos, codigo)` busca coincidencia exacta por `barcode`, `code`, presentaciones y variantes y **elige o agrega el producto al instante** sin que el usuario tenga que tocar la lista.
- En pruebas con Puppeteer: al cambiar de vista de PC a celular con `page.setViewport({ width: 390, height: 844 })`, NO alternar `isMobile: true` en caliente porque Chromium recarga la página automáticamente y reinicia `App.tsx` a la vista inicial (`pos`).
- Al editar archivos desde la IA: hacer siempre todos los cambios de un mismo archivo en **un solo paso** (una sola llamada de edición por archivo) para evitar que el editor del dueño muestre conflicto de guardado (*"El contenido del archivo en el disco es más reciente"*) si tiene esas pestañas abiertas.

## 19. Git: "fatal: not a git repository" al correr `git status` (16/11/2026)

**Síntoma:** en `negocios/comercio`, `git log`, `git rev-parse` y `git ls-files` funcionaban, pero **`git status`
fallaba siempre** con:
`fatal: not a git repository: D:/Programación/siumax/comercio/.git/worktrees/finanzas-historial`
(una ruta vieja, de cuando el repo estaba en `siumax/comercio` antes de moverse a `siumax/negocios/comercio`).

**Causa:** las 4 carpetas viejas de worktrees (`.worktrees/finanzas-historial`, `pruebas-aisladas`, `reportes-search`,
`todo-junto`) quedaron **dentro del repo** y en algún momento se agregaron al control de versiones: están en el índice y en
el commit como **gitlinks** (`git ls-files -s .worktrees` muestra modo `160000`). Cada una tiene un archivo `.git` con
`gitdir: D:/Programación/siumax/comercio/.git/worktrees/<nombre>` (ruta vieja, ya inexistente). Al calcular el estado,
git entra a esos "submódulos", no encuentra su gitdir y muere. Por eso `status` falla pero `log`/`ls-files` no.

**Solución aplicada:** quitar esas 4 entradas del índice sin borrar archivos, con
`git update-index --force-remove ".worktrees/<nombre>"` (con `git rm --cached` NO funciona: también intenta entrar al
submódulo y falla), y agregar `.worktrees/` a `.gitignore`. Los 4 commits a los que apuntaban
(`fd00063`, `7f96f78`, `bd8c81e`, `65e45cf`) siguen existiendo y son alcanzables desde `main`, así que no se perdió nada.
Las carpetas físicas siguen en el disco; se pueden borrar cuando el dueño lo diga.

**Regla para el futuro:** nunca dejar carpetas de worktrees dentro de la carpeta del repo, ni hacer `git add -A` con
worktrees adentro. Si `git status` falla con una ruta de `worktrees/`, revisar `git ls-files -s` en busca de entradas
`160000` que no correspondan.

## 20. Bases de datos del VPS y cómo leer un esquema (17/11/2026)

- El VPS (ver `ai-scripts/vps.cjs` + `.env.vps`) tiene estas bases: **`siumax`** (14 MB) = **Nego, entorno de pruebas**
  (`nego.siumax.duckdns.org`, la API `postgrest_siuhub` apunta ahí), **`servic`** (12 MB, mismo esquema que Nego),
  `siudemo`, `creditaltoque`, `evidiary`, `evidiary_prueba`, `postgres`. **No existen** bases llamadas `evicamp` ni
  `siuhub` (la de Evicamp es `postgres`, servida por `/etc/postgrest.conf`).
- **Para leer un esquema sin tocar nada:** el endpoint OpenAPI de PostgREST (`/rest/v1/`) **no está disponible**
  (devuelve 500/401), así que se usa SSH con `node ai-scripts/run-remote.cjs <script.sh>` y dentro un
  `sudo -u postgres psql -d <base> -At -F'|' -c "select ... from information_schema.columns ..."` (solo SELECT).
- **Cuidado con la codificación:** `comando > archivo.txt` en PowerShell escribe **UTF-16LE** y Node lo lee como basura;
  usar `| Set-Content -Encoding utf8` (y quitar el BOM al leer). También cuidado con `| Select-Object -First N`: corta
  la tubería y mata a Node con EPIPE antes de que guarde su archivo.
- El esquema de Nego (`siumax`) tiene **55 tablas**; el de Eco-Sistemas, **24**. El cuadro de mapeo de la migración
  está en `docs/MIGRACION-ECO-A-NEGO.md`.

## 21. Cargar datos de Eco a Nego: trampas que ya aparecieron (17/11/2026)

- **Siempre prueba en seco primero.** El SQL de la carga va en una transacción; para probar sin dejar nada, se cambia el
  `COMMIT` final por `ROLLBACK` y se corre. Así aparecieron 4 errores antes de tocar la base. Está en
  `ai-scripts/migrar-eco.cjs` (modo `dry`). Para cargar de verdad, modo `real`; para deshacer, `borrar`.
- **Errores que ya salieron (y hay que evitar):**
  - `INSERT has more target columns than expressions` → contar los valores de cada fila; el ETL ahora **lanza error** si
    una fila no tiene tantos valores como columnas.
  - Un `null` de JavaScript dentro de un array que se une con comas se convierte en **vacío** y rompe el SQL
    (`... , 1.0, , NULL ...`). Hay que convertirlo a la palabra `NULL`.
  - `user` es **palabra reservada** en PostgreSQL: las columnas del `INSERT` van entre comillas dobles (`"user"`).
  - Un cliente nuevo que se crea **después** de insertar `customers` no existe para la foránea. Hay que crear **todos**
    los clientes (incluido el genérico "sin nombre") **antes** de insertar salidas/cotizaciones.
- **`setval` y `nextval` NO se deshacen** al hacer `ROLLBACK` (las secuencias no son transaccionales). Por eso la prueba
  en seco deja el contador de `salidas.codigo` corrido; es inofensivo, pero hay que saberlo.
- **El trigger `trg_historial_compras`** escribe historial al insertar `compras`. Para no crear historial falso de las
  compras importadas, se **desactiva** al inicio de la carga y se **reactiva** al final (dentro de la transacción).
- **`products.id`, `customers.id`, `stores.id`, `trabajadores.id`, `salidas.id`… no tienen default**: la app genera esos
  ids sola (tipo marca de tiempo). Los ids migrados se sacan de `max(id)+1` y no chocan con los futuros de la app.
  Las que sí usan secuencia (`cotizaciones`, `compras_detalle`, `salida_items`…) se ajustan con `setval` al terminar.
- **Los "Metro" de Eco** se guardan como unidad `M` en Nego (el original queda en `products.presentaciones`). Nego no
  tiene esa unidad, pero no hay restricción que lo impida.

## 22. Migración Eco → Nego: dónde quedó (17/11/2026)

- **Estado:** Fase 1 (inventario/respaldo), Fase 2 (mapeo) y **Fase 3 (carga de prueba en `siumax`) HECHAS**. Fase 4
  **hecha SOLO EN PRUEBAS el 17/11** (33 PDF + 1 foto en el VPS, botones Ver/Adjuntar, 11/11; ver bitácora 164).
  Fase 5 (veredicto y paso oficial) pendiente del OK del dueño.
- **La Fase 3 cargó 7.328 filas** en `siumax` y se comprobó que cuadran. Reporte: `migracion-eco/reporte-carga.md`.
  Documento maestro y decisiones: `docs/MIGRACION-ECO-A-NEGO.md`. Paso a paso: bitácora 159–162.
- **Herramientas:** `migracion-eco/etl.mjs` (lee Eco y genera el SQL) y `ai-scripts/migrar-eco.cjs` (`dry` = prueba en
  seco, `real` = carga, `borrar` = deshace). Lo privado vive en `D:\Programación\siumax\migracion-eco\` y en
  `.env.ecosistema` / `.env.vps` (nunca a git).
- **Fase 4 (archivos), decidida por el dueño:** guardar **en el VPS**, copiar **solo lo de compras** (33 PDF de factura
  + 1 foto), **comprimir** las fotos, y agregar en el detalle de **Compra** la opción de ver/adjuntar el PDF y las fotos.
  **Ya hecha en pruebas (164); la pasada oficial sigue esperando su OK.**
- **Regla que el dueño repite:** guardar **todo** en la memoria (bitácora, plan, conversaciones, memoria-IA) después de
  cada paso, para que si se borra la IA se sepa cuál fue lo último hecho.

## 23. Paginación y teclado: errores que ya aparecieron (17/11/2026, bitácora 168)

- **Dos handlers peleando por el mismo ↓:** al poner paginación en Herramientas/Vehículos, sus filas llevaron
  `data-row="true"` y `role="button"`, y el listener global de `Inventario/index.tsx` (que recorre TODAS las filas
  `data-row` de la pantalla) también movía el foco: desde la fila 0 el ↓ caía en la fila 2. **Arreglo:** llamar
  `e.stopPropagation()` además de `e.preventDefault()` en los `onKeyDown` de las filas de esas dos tablas. Si se crea
  otra tabla dentro de Inventario con `data-row="true"`, hacer lo mismo.
- **↑ desde la primera fila:** en Salidas y Compras debe volver a la franja de paginación, no al buscador. En Compras
  hay que `stopPropagation` en los extremos porque el panel tiene su propia grilla (`moverEnGrilla`).
- **Franja siempre visible:** el dueño aprobó que se muestre aunque no haya filas ("Página 1 de 1"). Las secciones
  vacías (Contratos, Taller, Pedidos) también deben mostrarla; no condicionar el render a `datos.length > 0`.
- **Regresión de Encargos:** el 12/11 se decidió que Pedidos es de Comercio y Cotizaciones de los dos tipos. Si
  `Encargos/index.tsx` deja `pestanas = ['cotizaciones','pedidos']` fijo, con solo Servicios sale la pestaña Pedidos.
  Debe calcularse con `useTiposNegocio()`; `CabeceraEncargos` ya oculta las pestañas cuando solo hay una.
- **Pruebas que miden estilo:** para tablas HTML (Salidas/Utilidades) hay que medir el `th`/`td`, no el `thead`/`tr`,
  y el borde de la fila está en el `tr`. Para tablas vacías solo se pueden comparar ~5 medidas del marco; no exigir 18.

## 24. Tipo de negocio: no volver a Comercio y pruebas que restauran (17/11/2026, bitácora 169)
- **El dueño probaba solo Servicios y veía cómo volvía a Comercio.** Causa: `leerTiposNegocio()` caía a `['comercio']`
  y `App.tsx` relee cada 60 s y en `visibilitychange`. Además `cargarTiposNegocio()` pisaba la elección si la base
  devolvía vacío/nulo/inválido. Arreglado con `parsearTiposNegocio` y sin forzar Comercio con valor vacío.
- **Toda prueba que cambie `tipos_negocio` debe guardar el valor al empezar y devolverlo al terminar**, pase lo que pase.
  Helper: `ai-scripts/pruebas/lib-tipo-negocio.mjs` (`tipoInicial`, `restaurarTipo`, `tipoActual`). Antes 9 pruebas
  forzaban Comercio en el `finally` y por eso el dueño veía el cambio solo. No confundir esos `elegir(['comercio'])`
  del cuerpo de la prueba (sí se necesitan para probar el menú de Comercio) con el del final (se debe quitar).
- **Secuencias desincronizadas tras una migración:** si al guardar sale `duplicate key ... "_pkey"`, comparar
  `max(id)` con `last_value` de la secuencia. En `salidas` estaban 374 vs 10; se arregló con `setval` y
  `lock_timeout`. Es un dato de la base, no un error del código.
- **Expectativas viejas en pruebas:** tras cambiar Encargos y las secciones de "Pronto" a reales, el menú incluye
  `encargos`, Finanzas es Alt + 9 (no Alt + 0), Salidas/Taller abren de verdad, y Clientes tiene
  `CLIENTES,CRÉDITOS` (más `TRABAJADORES` con Servicios). Actualizar la prueba, nunca los ids ni los atajos reales.
- **Contratos con fecha_inicio a mitad de mes (arreglado 17/11):** `fn_generar_visitas_contrato` solo miraba los días
  1 y 15 (QUINCENAL) o `dia_cobro` (MENSUAL); con inicio el 17 devolvía 0 visitas y no aparecía "Insumos". Ahora arma
  una lista de fechas y usa la primera válida desde `fecha_inicio`. Copia en
  `servidor/sql/arreglo-visitas-contrato-medio-mes.sql` y aplicador con respaldo en
  `ai-scripts/pruebas/aplicar-arreglo-visitas-contratos.cjs`.
- **Taller, MAL que no se reproducía (17/11):** `trg_taller_repuesto_stock` sí descuenta y devuelve el stock. La
  prueba ahora compara por número (10.00|10.000 = 10|10), espera hasta 10 s y verifica que exista el botón de quitar.
  No se cambió la lógica de stock. Lección: antes de culpar al trigger, comparar valores numéricos y esperar a que
  termine la operación; una prueba puede dar un MAL falso por formato o por tiempo.

## 25. Agenda y salidas: cómo se vinculan (17/11/2026, bitácora 172)
- `fn_registrar_salida` **siempre inserta `estado = 'EN_PROCESO'`** y devuelve `{id, codigo}`. Desde Agenda,
  `handleSalidaCreada` guarda ese id en `agenda_trabajos.salida_id` (hay FK a `salidas(id) ON DELETE SET NULL`).
- Ojo con el significado: "salida pendiente" para el dueño es **`EN_PROCESO`**, no "trabajo sin salida", no "salida
  sin trabajo" y no "pendiente de subir por sin internet". Preguntar siempre cuál de los cuatro cases puede ser.
- Hoy `ModalDetalleTrabajo` muestra el mismo aviso verde para cualquier `salida_id` (no mira el estado) y
  `TarjetaTrabajo` no muestra ningún aviso de salida. Para distinguir pendiente de finalizada hay que traer
  `salida:salidas(id, codigo, estado)` en el `select` de `Agenda/index.tsx` y usarlo en tarjeta y detalle.
- El color de Salidas para `EN_PROCESO` es **ámbar** (`bg-amber-100 ... border-amber-300`) y para `FINALIZADO` es
  **verde esmeralda**; mantener ese lenguaje visual y `rounded-none` (SiuMax Sobrio).
- **Decisión del dueño (17/11, bitácora 173):** *"mejor olvidalo ya tengo otra dia para eso"*. El cambio quedó **en
  espera, no aprobado**. No preguntar otra vez ni adelantarlo; solo hacerlo si él lo pide en otro momento.

## 26. Clic en la fila abre el detalle, en todo el sistema (17/11/2026, bitácora 174)
- El molde es **Inventario > Productos**: la fila (div o tr) lleva `onClick` → abre el modal del registro, además del
  `onKeyDown` con Enter/Espacio que ya existía. El dueño quiere que eso pase en **todas** las tablas, no solo en Productos.
- **Ojo:** en Herramientas, Vehículos y Salidas Enter ya abría el detalle pero **faltaba el clic**; en otras tablas
  (Utilidades, visitas/cobros de Contratos) no había detalle alguno. Para el segundo caso se creó
  `src/components/ModalDetalleFila.tsx`: modal de solo lectura, `rounded-none`, cabecera oscura, campos etiqueta/valor,
  cierre con `useCerrarConEscape` y `z-[100]` para poder abrirse encima del detalle de Contratos.
- **Regla importante:** los botones dentro de la fila (Insumo, Listo, Cobrar, Prestar, etc.) deben llevar
  `e.stopPropagation()` en su `onClick`, si no, al pulsarlos se abre también el detalle de la fila.
- Las tablas de Utilidades ya tenían flechas ↑↓ y ↑ al buscador en `teclaFila`; se agregó Enter al mismo handler sin
  quitar las flechas. Cobranzas, Visitas y Cobros están vacíos en Nego: una prueba que espere filas ahí dará "sin datos",
  no es un fallo del código; el modal genérico se verificó con Rentabilidad (413 filas), Técnicos y Materiales.
- Si el detalle se abre dentro de otro modal, la pila de `useCerrarConEscape.ts` hace que Escape cierre primero el de
  arriba; por eso el modal nuevo usa ese hook y no un `useEffect` propio de Escape.

## 27. Todas las tablas a 50 filas por página (18/11/2026, bitácora 175)
- El dueño quiere **50 filas por página en TODAS las tablas de Nego**, tanto en Comercio como en Servicios. Si una tabla
  ya paginaba con otro número, solo se cambia la constante; si no paginaba, se agrega `PaginacionSobrio` arriba y abajo.
- `src/components/PaginacionSobrio.tsx` dibuja la franja **siempre** (aunque sea "Página 1 de 1") y ya resuelve las
  flechas: en la franja de arriba ↓ va a la primera fila; en la de abajo ↑ va a la última; ←/→ cambian de flecha y
  Enter/Espacio cambia de página. No hace falta reimplementar ese teclado en cada tabla.
- Al agregar paginación hay que: (1) slicear las filas en la pantalla, (2) volver a la página 1 cuando cambie búsqueda,
  filtro o período, (3) conectar la última fila con la franja de abajo en `ArrowDown` y (4) mantener los ids y el
  `↑` de la primera fila al buscador. En Cotizaciones el id `fila-coti-${id}` y el foco al volver de un modal se
  recalculan con la página que contiene ese id.
- En Utilidades de servicios, las pestañas se montan con una `key` que incluye búsqueda, filtro, período y fechas:
  así cualquier cambio reinicia la página sin `useEffect` extra.
- Ojo con las pruebas: `innerText` de la franja sale en **mayúsculas y con acento** (`PÁGINA 1 DE 9`); usar regex
  `/P[AÁ]GINA\s+\d+\s+DE\s+\d+/i`. Cobranzas está vacía en Nego: esperar filas ahí dará "sin datos", no un fallo.

## 28. Visión del dueño: trabajadores usando el sistema desde su dispositivo (18/11/2026, bitácora 176)
- El dueño quiere que los trabajadores **entren en el sistema desde celular/tablet/laptop/PC y trabajen rápido**; por eso el foco ahora es que buscar y registrar productos sea rápido y que nada tape la vista.
- **Caja, teclado del celular:** en `TerminalBusqueda.tsx` el área de resultados (`overflow-y-auto`) no quita el foco al buscador (`#buscador-global-pos`) y además `handleGlobalClick → enforceFocus` lo vuelve a enfocar 50 ms después de cada clic. Solución: hacer `blur()` al tocar/desplazar los resultados y excluir esa zona del imán de foco; el usuario con teclado no debe notar cambio. Botón de respaldo "✓ Listo" para esconder el teclado.
- **Salida, nombres libres:** `fn_registrar_salida` exige `customer_id` (RAISE si es NULL) y `bienes_cliente.customer_id` es FK. Un cliente o "bien" que no esté registrado **no se puede inventar en esas columnas sin tocar SQL**: se guarda el nombre escrito dentro de `observaciones` como nota (el dueño aceptó "al menos como nota"). `ModalNuevaCotizacion.tsx` ya tiene el patrón "Cliente casual / fuera de la lista" + campo de nombre libre para copiar.
- **Salida, una sola opción:** `ModalNuevaSalida.tsx` filtra `bienes_cliente` por `estado = ACTIVO` y auto-selecciona `data[0]`; si el cliente tiene un solo bien, sale una sola opción. Para dar más opciones sin migrar datos: traer todos los bienes del cliente (mostrando MANTENIMIENTO/BAJA) y agregar "Otro: escribir el nombre" como nota.
- **Salida, orden:** `handleAgregarItem` usa `setItems(prev => [...prev, ...])`; para que entre arriba hay que anteponer (`[nuevo, ...prev]`) y, si el producto ya estaba, subirlo a la primera fila. Aplica igual a producto de inventario y a material externo.
- **Ojo con el escáner de cámara:** ya existe `BotonEscanerCelular` y se usa en Caja; en Nueva salida todavía no está. Al agregarlo, hay que usar `buscarProductoPorCodigo` igual que en los otros buscadores para que funcione 100 % sin internet.
- **Enfoque adaptivo (pedido del dueño, 18/11):** prioridad **celular y tablet**; laptop y PC se consideran similares. Todo debe verse claro, bien acomodado y entenderse. No es solo hacerlo más pequeño: hay que revisar tamaño de letras, espaciado, botones y que nada tape la vista con el teclado del celular.

## 29. Agenda en celular: la sensación de "bajar y como que subir" (18/11/2026, bitácora 176)
- El dueño dijo: *"usado la ventana agenda pero es incomodo mas cuando ingreso un nuevo trabajo ya que cuando ingreso e intento bajar como que intenta subir ojo eso pasa en celular"*.
- `ModalNuevoTrabajo.tsx` tiene un `<form className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">` con campos `text-xs`, labels `text-[11px]` y `px-2.5 py-1.5`. Al abrir, hace `document.getElementById('input-titulo-trabajo')?.focus()` a los 60 ms: en celular eso abre el teclado y el navegador hace scroll para dejar el campo visible.
- `flechasEspaciales.ts` mueve el selector con `masCercano` y luego `destino.scrollIntoView({ block: 'nearest' })`. Con el teclado virtual abierto, el área visible cambia y el scroll puede ir hacia arriba mientras el usuario intenta bajar: coincide con lo que reportó el dueño. **No cambiar las flechas globales a ciegas**: primero reproducirlo en la prueba móvil y arreglar el modal (campos grandes, evitar el auto-scroll innecesario y el foco automático que abre el teclado al entrar), conservando ids, flechas, Enter y estilo sobrio.
- Los ids a conservar en ese modal: `input-titulo-trabajo`, `select-cliente-trabajo`, `select-bien-trabajo`, `input-direccion-trabajo`, `input-ubicacion-trabajo`, `input-fecha-trabajo`, `input-hora-inicio-trabajo`, `input-hora-fin-trabajo`, `select-prioridad-trabajo`, `select-estado-trabajo`, `chip-trabajador-${id}`, `input-descripcion-trabajo`, `input-notas-trabajo`, `btn-cancelar-trabajo`, `btn-guardar-trabajo` y `btn-cerrar-modal-trabajo`.

## 30. Lo que enseñó la implementación adaptiva (18/11/2026, bitácora 177)
- **Quitar un auto-focus no basta si hay reglas globales de foco.** En `ventanas.ts` (`asegurarEnVentana`, disparado a los 150 y 400 ms al abrir un modal) y en `navegacionSesion.ts` (`restaurarFocoSesion`, si hay una ventana abierta) se ponía el foco en el primer campo aunque `ModalNuevoTrabajo.tsx` ya hubiera decidido NO enfocarlo en celular. Se agregó la marca `data-evitar-foco-auto` en el formulario de Agenda y ambos utilitarios la respetan. Para diagnosticarlo sirvió envolver `HTMLElement.prototype.focus` desde la prueba y guardar la pila de llamadas: así se supo que el foco no venía del modal sino de esos dos módulos.
- **El imán del buscador de Caja tiene dos dueños.** `TerminalBusqueda.tsx` tiene su propio `enforceFocus` (se bloqueó con una ref al tocar resultados), pero `App.tsx` tiene otro clic global que, 60 ms después, si `activeElement` es `body`, llama a `programarRestauracionFoco` y devuelve el foco al buscador. Se marcó `#resultados-caja` y el botón "✓ Listo" con `data-evitar-iman-teclado` y el clic global de la App ignora esos elementos. Si solo se arregla el componente de Caja, el teclado vuelve a abrirse igual.
- **Cuidado con `Number(e.target.value)` en un `<select>` con opciones no numéricas:** convertía `'otro'` en `NaN` y la condición `bienId === 'otro'` nunca se cumplía, así que no aparecía el campo de nombre libre. Siempre comparar la cadena antes de convertir.
- **En pruebas Puppeteer con viewport chico, `matchMedia('(pointer: coarse)').matches` puede ser `false`** aunque el ancho sea 390. Para decidir comportamiento móvil en la app conviene usar también `window.innerWidth < 768`; para simular el tacto en la prueba hay que construir un `Touch` real y despachar `touchstart` en el elemento correcto (`#resultados-caja`, no cualquier `.custom-scrollbar`).
- **Resultado:** prueba adaptiva `ai-scripts/pruebas/prueba-adaptiva-salida-caja-agenda.mjs` con **47/47, 0 fallos** en 390/768/1366/1920. `build` limpio, despliegue solo en Nego, sin Evicamp, sin push, sin pasada oficial ni Fase 5.

## 31. Pedido de sub sesión grande para Nueva salida (18/11/2026, bitácora 178)
- El dueño aceptó 177 pero dice que la salida se siente **"muy comprimida"**: quiere que "en vez de una ventana sea como una sub sesión grande que se vea claro todo". El problema no es el tamaño de letra ni el color: es la **forma**. `ModalNuevaSalida.tsx` se monta hoy dentro de una capa `fixed inset-0` con `max-w-5xl` y `max-h-[calc(90dvh/var(--ui-zoom))]`, así que todo el formulario cabe a la fuerza en ese rectángulo con scroll interno.
- Molde a seguir: `Salidas/index.tsx` controla `modalNuevoOpen`; `HeaderSalidas.tsx` tiene `btn-nueva-salida` y la ruta "Continuar" del detalle; la lógica, ids, borrador (`CLAVE_BORRADOR_SALIDA`), cámara y guardado (`fn_registrar_salida`) están en `ModalNuevaSalida.tsx`. Conviene agregar una prop `modo` y reutilizar ese componente, **sin tocar SQL ni la base**.
- Al convertirlo en sub sesión: ocultar cabecera y tabla mientras estás dentro; quitar `max-h` y dejar scroll normal de página; ancho completo con columnas 1/2/3 (celular/tablet/PC); cabecera con "← Volver a la lista" y aviso de F10/Ctrl+Enter; conservar todos los ids y atajos y devolver el foco al botón o a la fila de origen al salir. Ojo con las reglas globales de foco (`ventanas.ts`, `navegacionSesion.ts`, imán de `App.tsx`): si al entrar o volver se enfoca un campo, en celular puede volver a abrirse el teclado; hay que respetar `data-evitar-foco-auto` y `data-evitar-iman-teclado`.
- La prueba adaptiva actual (47/47) da por hecha una ventana flotante: habrá que ajustarla para verificar también que ya no exista esa capa, que ocupe todo el ancho y que Volver/Escape regresen a la lista, sin perder las comprobaciones de teclado y sin internet en 390/768/1366/1920.
- **Estado:** propuesta entregada, esperando el "empieza" del dueño. No se cambió código ni se desplegó. Sin Evicamp, sin push, sin pasada oficial ni Fase 5. El pedido de salidas pendientes en Agenda sigue en espera; no volver a preguntar por él. **(RECHAZADA el 18/11, fase 181: el dueño pidió volver al comienzo. No volver a este diseño.)**

## 33. Tres rediseños rechazados seguidos: volver al comienzo y no adivinar (18/11/2026, bitácora 181)
- El dueño rechazó **178** (sub sesión grande), **179** (tres apartados en celular) y **180** (ventana flotante con dos pasos + buscador tipo Caja). Su última frase fue *"no me gusto dejalo como estaba antes"*, y al preguntarle cuál "antes" eligió **"Ventana flotante original (177)"** y añadió **"desde el comienzo"**.
- **Lección 1 — "antes" es ambiguo cuando hubo varios cambios:** no restaurar a ciegas. Con tres versiones recientes, preguntar con opciones concretas y nombrarlas por su número de fase y por cómo se ve ("ventana flotante simple", "tres apartados", "dos pasos"). El dueño respondió sin problema al verlas escritas así.
- **Lección 2 — revertir limpio, no parchear:** para volver al comienzo se usó `git checkout fc1aae3 -- <8 archivos>` y se comprobó con `git diff --stat fc1aae3` que diera **0**. Nunca `git show > archivo` (UTF-16) ni `Out-File -Encoding utf8` (BOM): rompen acentos y ensucian el diff. Los 8 archivos eran modal, `Salidas/index.tsx`, `flechasEspaciales.ts`, la prueba adaptiva y los 4 docs; verificar antes con `git status --short` que ninguno tuviera trabajo ajeno sin commitear.
- **Lección 3 — la prueba también se revierte:** la prueba de 180 comprobaba el stepper de dos pasos y ya no servía; al restaurar 177 se restauró su prueba (47/47). Ejecutarla de nuevo contra Nego después del deploy para confirmar que el regreso quedó bien.
- **Lección 4 — dejar constancia del rechazo:** aunque el código volvió a 177, los docs deben quedar con una entrada nueva (181) que diga explícitamente que **178, 179 y 180 están rechazadas y no se volverán a proponer**. Si solo se restauran los archivos, esa memoria se pierde y otra IA puede repetir el error.
- Resultado: **47/47, 0 fallos** en 390/768/1366/1920; `build` limpio; despliegue solo en Nego (21 archivos). Sin Evicamp, sin push, sin pasada oficial ni Fase 5; SQL y base intactos. El pedido de salidas pendientes en Agenda sigue en espera; no volver a preguntar por él.

## 34. Buscador desplegable de cliente en Nueva salida (18/11/2026, bitácora 182)
- El dueño pidió sustituir el `<select>` de cliente por un buscador y agregar un botón para los nombres no registrados. Aprobó con **"empieza"** después de ver la propuesta.
- **Un buscador desplegable no es un `<select>`:** es un `<input>` con sugerencias; el bloque lleva `role="listbox"` y cada sugerencia `role="option"`; la Regla 9 ya ignora el foco dentro de esos roles. La lista sale con `onFocus` y con el primer carácter; se recorre con ↑ ↓ y se elige con Enter o clic. Usar `coincideBusqueda([name, dni, ruc], q)` para tolerar tildes, como en Caja.
- **⚠️ Esta decisión quedó corregida en la fase 187 (19/11/2026):** aquí se puso la lista *en flujo normal* para que no la cortara el `overflow-y-auto`, pero el dueño rechazó que empujara el formulario. La solución correcta es la de la lección 40: capa flotante con portal. No volver a la versión en flujo normal.
- **Tras una reversión, revisar las excepciones del teclado:** al restaurar 177 en la fase 181 se perdió `data-permitir-salto-enter` en `flechasEspaciales.ts` (se había agregado en una fase posterior). Sin esa marca, la Regla 9 devuelve el foco al buscar cliente con Enter. Si se revierte a una base antigua, comprobar qué utilidades también deben volver a su versión nueva.
- **El botón de "cliente no registrado" no crea nada en la base:** solo muestra el campo `input-cliente-libre-salida`, que se guarda como `CLIENTE: NOMBRE` en `observaciones`. La base exige `customer_id` por FK, así que la validación debe pedir un cliente registrado como referencia cuando se usa el nombre libre. No quitar esa validación para "hacer más fácil" el alta.
- **Prueba con teclado de verdad:** para limpiar y reescribir un campo en Puppeteer usar Ctrl+A + Backspace + `type()`; asignar `el.value` directamente no actualiza el estado de React. Probar que el foco sigue en el buscador tras elegir y que el desplegable se cierra, además de que el campo libre esté oculto hasta pulsar el botón.
- Resultado: **83/83, 0 fallos** en 390/768/1366/1920; `build` limpio; despliegue solo en Nego (21 archivos). Sin Evicamp, sin push, sin pasada oficial ni Fase 5; SQL y base intactos. El pedido de salidas pendientes en Agenda sigue en espera; no volver a preguntar por él.

## 35. Dominio nuevo y logo de cliente (18/11/2026, bitácora 183 — propuesta, no ejecutada)
- Un dominio DuckDNS **no se crea con los scripts del proyecto**: hay que darlo de alta en la cuenta de DuckDNS del dueño (apuntando al IP del VPS) o tener el token en `.env.vps`. Revisado: `.env.vps` solo tiene VPS, Panel, Mercado Pago y contraseñas de Nego; **no hay token de DuckDNS**. No inventar uno ni pedirlo por chat: si hace falta, que el dueño lo ponga él en `.env.vps`.
- Para un dominio propio de cliente conviene **sitio + base + API propios** (como hace `nuevo-cliente.sh`), no apuntar al sitio de pruebas `nego.siumax`. Respaldo de Nginx antes y verificar después que Evicamp, el Panel, `/actualizaciones/` y `nego.siumax` siguen respondiendo.
- El logo visible en login/menú/tickets no vive en el código: se lee de `empresa_config.logo_url` (`Login.tsx`, `SideBar.tsx`, `PanelCompras.tsx`, `TicketImprimible.tsx`). Los iconos de pestaña/PWA están en `public/icons/` y se declaran en `index.html` (`favicon-32.png`, `apple-touch-icon.png`, `manifest.json`). Cambiar uno no cambia el otro: hay que hacer las dos cosas si el dueño quiere "el logo en todo".
- Este modelo no puede ver imágenes; si el dueño manda un PNG, copiarlo tal cual y decirle explícitamente que no se pudo revisar visualmente. Para cambios de logo conviene confirmar con él que el archivo es el correcto antes de tocar la base.

## 36. Sitio oficial de un cliente (ecosistema123) — cómo se hizo sin romper nada (18/11/2026, bitácora 183)
- **Clonar la base con `pg_dump`, no con `nuevo-cliente.sh`:** ese script crea la estructura **vacía** y un administrador nuevo; aquí se querían los datos de Eco ya migrados. Se hizo `sudo -u postgres createdb ecosistema` + `sudo -u postgres pg_dump siumax | sudo -u postgres psql -d ecosistema`, que copia también las funciones de seguridad (`fn_verificar_peticion`), los grants al rol `anon` y todos los passwords. Después se borraron solo las filas de prueba. Ojo: antes de borrar, revisar las FK (los empleados de prueba tenían 1 `sesiones` y 1 `trabajadores` cada uno; borrar esas referencias primero).
- **La seguridad se hereda con el `pg_dump`:** verificado que `empresa_config` se lee sin sesión (200, lo necesita el login para nombre y logo) y `customers`, `products`, `empleados`, `sales` devuelven **401**. La config PostgREST nueva se sacó con `sed` de `/etc/postgrest_siuhub.conf` cambiando solo la base y el puerto (`db-pre-request` se queda igual), y se levantó con la plantilla que ya existía: `systemctl enable --now postgrest-cliente@ecosistema` → `/etc/postgrest/clientes/ecosistema.conf`. **No se reinició la API de nadie más.**
- **`location / { try_files ... /index.html; }` sirve el `index.html` con 200 para CUALQUIER ruta que no exista**, incluido `/suscripcion.json`. Aunque el frontend ignora la respuesta porque no es JSON, conviene blindar con `location = /suscripcion.json { return 404; }` antes del `location /`. Además, tras `systemctl reload nginx` el cambio puede tardar un instante en notarse: el primer `curl` dio 200 y el siguiente 404; **repetir la comprobación antes de darla por fallida**.
- **Los iconos se sobrescriben en cada deploy:** `deploy.cjs` sube el `dist/` compartido, que trae los iconos de SiuMax. Para el sitio del cliente hay que correr después `bash /opt/siuhub/ecosistema-iconos.sh` (deja el logo en los 5 archivos). El logo de la base es un **data URL base64** (`achicarLogo` en `FormularioEmpresa.tsx`), no una ruta: por eso funciona en login, menú, tickets y PDF sin archivos extra. Se comprobó con MD5 que el PNG de la base y el de los 5 iconos son el mismo.
- **Cliente sin cobro = dos cosas:** no servir `/suscripcion.json` (404) **y** no agregarlo a `/opt/siuhub/clientes.tsv` (si no, el Panel lo ve y podría cobrarle). Es la misma idea que Evicamp.
- **Prueba nueva guardada:** `ai-scripts/pruebas/prueba-sitio-ecosistema.mjs` verifica logo (con y sin internet), 404 de suscripción, ausencia de aviso/botón de pago y navegación con Enter en 390/768/1366/1920. 29/29. La prueba adaptiva de la fase 182 también pasó 83/83 apuntando al sitio nuevo. Ojo al armar aserciones de "sin aviso de plan": buscar por texto `vence` da **falso positivo** porque el menú de Inventario tiene "Vencimientos"; usar selectores concretos (`[role="alert"]` y `button[aria-label*="Pagar plan"]`).

## 37. Cambiar la clave del sitio oficial sin tocar Nego (18/11/2026, bitácora 184)
- `fn_login` compara `empleados.email` **exacto** (minúsculas) y `password_hash` con `crypt(p_password, e.password_hash)`. Para cambiar correo y clave de un usuario hay que actualizar **esas dos columnas** en la base correcta. El campo antiguo `password` no valida el login: se usa solo para pasar la clave nueva a `fn_crear_empleado` / `fn_editar_empleado`, así que no hace falta tocarlo.
- **Una base por sitio = un administrador distinto.** El sitio oficial usa la base `ecosistema` y su administrador es `admin@ecosistema.com`; Nego usa `siumax` y `admin@siumax.com`. Un `UPDATE` sin `-d ecosistema` cambiaría el usuario equivocado. Siempre confirmar la base en el comando y comprobar después con el login del sitio correspondiente.
- Al cambiar la clave, borrar también las `sesiones` de ese empleado: los tokens antiguos siguen siendo válidos 30 días y si no se borran parece que "la clave vieja aún funciona".
- Las credenciales del sitio oficial viven en `.env.vps` como `ECOSISTEMA_ADMIN_USUARIO` y `ECOSISTEMA_ADMIN_CLAVE`; las de Nego siguen en `SIUMAX_ADMIN_*`. La prueba `prueba-sitio-ecosistema.mjs` las lee de ahí y falla temprano si faltan, para no entrar con la cuenta de otro sitio por accidente. **Nunca poner los valores en docs, pruebas ni commits.**

## 38. Tema predeterminado distinto por sitio (18/11/2026, bitácora 185)
- El tema se decide en **tres puntos** y hay que mantenerlos de acuerdo: el `<script>` de `index.html` (define el color antes del primer dibujo, evita el destello), el `useEffect` de `App.tsx` (lo reaplica al cargar la app) y `ThemeSwitcher.tsx` (marca y enfoca el tema activo). La fuente única es `src/utils/tema.ts`.
- `index.html` no puede importar TypeScript: por eso calcula el dominio y deja `window.SIUMAX_TEMA_PREDETERMINADO`. El módulo TS lo lee y cae a `classic` si no existe (por ejemplo, en pruebas locales). No duplicar la lista de dominios en el TS.
- **Predeterminado ≠ obligatorio:** `leerTema()` devuelve `localStorage.gestorpro_theme` si existe, aunque sea `classic`. El dueño eligió expresamente respetar lo que cada dispositivo ya eligió. Nunca borrar ni reescribir esa clave para "forzar" el tema nuevo.
- Como el `dist` es compartido, el cambio llega a todos los sitios que se desplieguen; el dominio es lo que lo limita. Por eso se desplegó **solo en ecosistema**: Nego sigue con su build anterior y, aunque se desplegara después, su hostname no coincide y seguiría en Clásico. Verificar siempre con `fetch` del HTML que el sitio ajeno no contenga el dominio oficial en su script.
- Tras cualquier deploy de `ecosistema`, correr `bash /opt/siuhub/ecosistema-iconos.sh`; si no, el logo vuelve al de Nego (el build compartido sobrescribe los 5 iconos).

## 39. Nombre visible distinto por sitio (19/11/2026, bitácora 186)
- «Arriba» para el dueño es el **título de la pestaña del navegador**, no el menú: comprobarlo con `document.title` antes de suponer dónde está el texto. En el sitio oficial debe decir `ECO SISTEMAS URH` (sin `S.A.C.`); en Nego sigue `SiuMax Nego`.
- `index.html` es el único lugar que decide el nombre por dominio y lo deja en `window.SIUMAX_NOMBRE_SITIO`. El bundle lo lee desde `src/utils/tema.ts` (`NOMBRE_SITIO`) para el respaldo del menú; no repetir la lista de dominios en los componentes.
- El nombre aparece en cuatro sitios distintos y hay que revisarlos todos: `<title>`, `meta[name="apple-mobile-web-app-title"]`, el `<link rel="manifest">` y el propio archivo de manifiesto. Por eso se creó `public/manifest-ecosistema.json` en vez de editar el `manifest.json` compartido: así Nego no cambia aunque se despliegue con este código.
- `public/offline.html` tiene su propio `<title>` y texto; lleva un script que solo cambia el nombre cuando el hostname es el oficial. Es un archivo estático compartido, pero el cambio es inofensivo en los demás dominios.
- El service worker incluye automáticamente los archivos nuevos de `public/` en su lista (`vite.config.ts` recorre `dist`), así que el manifiesto nuevo queda disponible sin internet tras el primer deploy.

## 40. Desplegable que flota de verdad dentro de un modal con scroll (19/11/2026, bitácora 187)
- «Que esté como encima» para el dueño significa **que no se mueva nada del formulario**, no solo que se vea encima. La lista en flujo normal siempre empuja el contenido; medir la posición del botón de abajo antes y después de abrir la lista es la prueba que lo detecta.
- `position: absolute` **no basta**: el cuerpo del modal tiene `overflow-y-auto` y el overlay `backdrop-blur-sm`, así que la capa se recorta o se comporta como relativa al modal. La solución que funciona es `createPortal(..., document.body)` + `position: fixed` con coordenadas de `getBoundingClientRect()` del cuadro de búsqueda (no del input: el icono `w-10` lo hace 42 px más ancho a la izquierda).
- Hay que recalcular la posición al abrir, al cambiar el número de sugerencias, en `resize` y en `scroll` con `addEventListener('scroll', fn, true)` (el `true` detecta también el scroll interior del modal). Recordar quitar el listener con el mismo flag `true`.
- El overlay está en `z-50`; la capa del portal necesita `zIndex: 60`. El portal se desmonta solo porque el componente hace `return null` cuando `isOpen` es falso.
- Al comparar en pruebas, medir el **cuadro** (`input.parentElement`), no el input. Mi primera versión de la prueba comparó contra el input y dio 4 fallos falsos (lista 26-364 vs input 68-362) aunque el arreglo era correcto.
- Orden de trabajo del dueño: **primero desplegar y probar en Nego**, y después **él actualiza Evicamp, ecosistema y siumax desde el Panel cuando crea clientes**. No desplegar esos sitios ni hacer push por iniciativa propia; él sube a GitHub.

## 41. Un solo buscador, sin botón de «cliente no registrado» (19/11/2026, bitácora 188)
- Cuando el dueño dice *"todo dentro del buscador"*, quiere **desaparecer el botón y el campo aparte**, no solo recolocarlos. La opción de registrar el nombre debe vivir como una opción más del desplegable (`#sugerencia-cliente-nota`), al final, y se elige con clic o con ↑↓ + Enter.
- El recorrido de flechas debe contar también esa opción: `total = clientesFiltrados.length + 1` cuando hay texto. Si se deja `clientesFiltrados.length`, Enter nunca puede registrar la nota.
- La nota elegida se muestra **dentro del cuadro** del buscador (`#nota-cliente-salida`, hijo del mismo borde que contiene el icono y el input) y se guarda como `CLIENTE: <NOMBRE>` en observaciones. No crea cliente en la base: la FK `customer_id` sigue obligatoria, así que el aviso al guardar debe pedir un cliente registrado de referencia.
- Al vaciar el input hay que limpiar la nota (`setClienteLibre('')`), y al restaurar un borrador hay que poner la nota también en `busquedaCliente` para que se vea en el cuadro. Si se quita un estado (`modoClienteLibre`), buscar todas sus referencias antes de compilar: quedó un `setModoClienteLibre` en el `useEffect` de apertura y dio `TS2552`.
- Si el dueño dice que «sigue moviendo todo», **medir antes de suponer**: puede estar mirando otro dominio con build antiguo. Comparar el JS servido (`/assets/index-*.js`) y la posición del campo antes/después en cada sitio. En Nego el arreglo ya funcionaba; el defecto estaba en ecosistema123, que no se desplegó a petición del dueño.

## 42. «El selector se queda atrapado» en un buscador con desplegable (19/11/2026, bitácora 189)
- Un desplegable de sugerencias que hace `preventDefault()` en ↑↓ **siempre** que está abierto deja al selector encerrado: las flechas globales de `flechasEspaciales.ts` nunca reciben la tecla. La salida correcta es en los **bordes** de la lista: ↓ en la última opción y ↑ en la primera cierran la lista y **no** frenan la tecla, para que el módulo global mueva el foco como en cualquier otro campo.
- Ojo con los `setTimeout(() => input.focus(), 30)` tras elegir una opción: aunque el usuario haya pulsado ↓ justo después, el temporizador devuelve el foco y parece que el teclado no funciona. Quitarlos.
- En la prueba no fijar un id único como destino de ↓: con `grid-cols-3` los campos «Tipo de trabajo / Cliente / Lo que se atiende» están en la misma fila en tablet y PC, así que ↓ baja a «Dirección», mientras que en celular (una columna) baja a «Lo que se atiende». Comprobar que el foco **sale del buscador** y cae en otro campo del formulario, no un id concreto.

## 43. «No me gusta el diseño» hay que convertirlo en una opción concreta (19/11/2026, bitácora 190)
- El dueño dijo primero *"el diseño no me gusta como"* y, al preguntar qué parte, eligió «Todo el cuadro del buscador». Aun así eso no bastaba para cambiar código: dio una lista de opciones visuales y eligió **«Como un campo normal»**. Ante un feedback vago de diseño, ofrecer 3–4 opciones concretas en vez de adivinar.
- «Campo normal» aquí significa quitar el bloque negro con la lupa y usar las mismas clases de borde/fondo que los demás campos (`border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] bg-[var(--color-surface)]`), sin bajar la altura mínima en celular (legibilidad). La nota se pinta como hermana del input con `border-x-2 border-b-2` para seguir pareciendo parte del mismo cuadro.
- Al comparar estilos en pruebas, **no medir un campo enfocado**: `focus:border-[var(--color-ink)]` lo pone oscuro y parece que no coincide. Tampoco comparar fondo contra un campo sin clase `bg-*`: es transparente (`rgba(0,0,0,0)`) aunque se vea blanco. Comparar solo el borde contra otro campo sin enfocar.

## 44. Elegir en un desplegable debe mover el foco al campo siguiente (19/11/2026, bitácora 191)
- Cerrar la lista y resetear el índice **no basta**: si no se enfoca otro campo, el selector se queda en el buscador y el dueño siente que «no puede ver lo que continúa». La fase 189 arregló solo los bordes con ↓/↑; faltaba la elección misma (Enter o clic).
- Helper reutilizable: `setTimeout(30)` → `document.getElementById(id)` → comprobar `!disabled` → `focus({ preventScroll: true })` → `scrollIntoView({ block: 'nearest' })`. El `preventScroll` evita un doble salto; el `block: 'nearest'` es el mismo criterio que usa `flechasEspaciales.ts`.
- **Esperar al render antes de enfocar**: `#select-bien-salida` lleva `disabled={!customerId}`; si se enfoca en el mismo evento en que se hace `setCustomerId`, el campo todavía está deshabilitado y `.focus()` no hace nada. Por eso el `setTimeout`, no por costumbre.
- Si la elección es solo una nota (sin cliente), el select de «Lo que se atiende» sigue deshabilitado: el destino es «Dirección». Enfocar un deshabilitado falla silenciosamente y parece que el arreglo no funciona.
- El buscador lleva `data-permitir-salto-enter`, así que el guardia de la Regla 9 (`alEnfocar` en `flechasEspaciales.ts`) no devuelve el foco al origen. Quitar ese atributo rompería el salto.
- En la prueba, comprobar el id destino **y** que el campo queda dentro de `window.innerHeight`; si solo se comprueba el foco, un `focus` sin scroll puede dejar el campo fuera de la vista y el dueño seguirá quejándose.

## 45. Borrador: «si lo borro que se borre, si no lo borre que se mantenga» (19/11/2026, bitácora 192)
- El dueño no distingue entre «borrar el input» y «limpiar el borrador guardado»: para él, borrar el texto con el teclado debe borrar también la copia persistida, o el nombre vuelve al recargar. Guardar «todo» no puede ganarle a lo que el usuario ve en el campo.
- Un `useEffect` que rellena un campo desde el catálogo (por ejemplo nombre del cliente a partir de `customerId`) es un imán silencioso: aunque limpies el texto, si el id sigue ahí y el catálogo cambia, el nombre vuelve. Para que un borrado sea definitivo hay que limpiar **la referencia** (`customerId`) y la copia persistida, no solo el texto.
- Guardar el texto visible (`busquedaCliente`) en el borrador y hacerlo mandar sobre `clienteLibre` evita que un nombre escrito a secas se pierda al recargar, y que una nota vieja resucite. En la carga: si el texto guardado está vacío, no recuperar ni cliente ni nota.
- Probar con **recarga real** (`page.reload`) y reabrir el modal. Las pruebas que solo cierran/abren el modal no detectan este bug, porque el estado de React se conserva; el defecto solo aparece al reconstruir el estado desde localStorage.
- El mismo helper sirve para tres casos: nombre escrito y borrado, nombre escrito y no borrado, cliente elegido y borrado. Los tres deben pasar en los cuatro tamaños.

## 51. Tablas pegadas al borde: medir, no adivinar, y revisar también las pestañas (23/11/2026, bitácora 200)
- Para dejar una tabla pegada al borde como Clientes no basta con quitar el padding del contenedor principal: hay **encabezados y pestañas propios** (`Header*`, `Filtros*`, `vacio-sobrio`, etc.) que vuelven a meter 24 o 12 px. Clientes no los tiene, por eso era el único en 0.
- El medidor simple de sesiones no ve las pestañas. Hay que recorrerlas con un escáner y, cuando aparezca un margen, subir por los padres del elemento (`paddingLeft`, `marginLeft`) para encontrar el contenedor exacto, en vez de ir tanteando clases a ciegas.
- Quitar padding **solo en X**: donde era `p-2 sm:p-4`, usar `py-2 sm:py-4` para conservar el espacio vertical. No tocar paddings internos de botones ni de celdas, ni las tablas dentro de ventanas emergentes.
- Al editar solo clases de Tailwind, el **CSS no cambia** (las clases se siguen usando en otros lados) pero el **JS sí cambia** por el hash del build: no alarmarse si el "JS nuevo" no trae el CSS nuevo. Verificar siempre el resultado en pantalla, no por el nombre del archivo.
- Un fallo de prueba por "0 clientes", "sin tienda", id duplicado o una FK que impide borrar, es estado de la base de pruebas, **no** un problema del ancho. No limpiar ni cargar datos sin permiso.

## 50. Cargar la migración Eco en ecosistema sin traer usuarios ajenos (23/11/2026, bitácora 199)
- `migracion-eco/etl.mjs` siempre regenera `carga-nego.sql` con **3 líneas de usuarios** (`UPDATE harry@…`, `INSERT billy@siumax.com`, `INSERT jhon@siumax.com`) que usan `crypt(:'clave_usuarios', …)`. Antes de aplicar ese SQL en `ecosistema` hay que quitar esas 3 líneas y su comentario; si no, psql pide la variable y vuelven correos del dominio de pruebas. Las referencias a esos UUID en `migracion_eco_log` son texto, no FK: se pueden dejar.
- El helper `migracion-eco/filtrar-para-ecosistema.mjs` hace ese filtro y avisa si quedó `siumax.com` o `clave_usuarios`. El script `ai-scripts/cargar-datos-ecosistema.cjs` se niega a aplicar un SQL que contenga esas cadenas.
- `fn_login` compara `password_hash = crypt(p_password, password_hash)`; la receta de `servidor/nuevo-cliente.sh` (`crypt(:'clave', gen_salt('bf'))`) es la correcta. Para no escribir la clave en archivos, mandarla por `stdin` a un `read -r CLAVE` y pasarla a psql con `-v clave="$CLAVE"`.
- PostgREST del sitio oficial lee la base `ecosistema` (`/etc/postgrest/clientes/ecosistema.conf`) y exige `x-sesion`; por eso un `curl` sin sesión da 401 aunque los datos estén cargados. Para comprobar datos, entrar por la UI y esperar: justo después del login la lista dice "CARGANDO..." y parece vacía; a los ~3 s aparecen los clientes. Una aserción sobre `innerText` hecha demasiado pronto da falso fallo.

## 51. La limpieza de bases también vació `stores` (23/11/2026, bitácora 203)
- Tras la Fase 1 (196) no existe la tienda id 1 en `siumax`; la carga de datos (201) solo insertó la id 2 de Eco. Como `inventory_movements.store_id`, `batches.store_id`, `sales.store_id` y `cash_sessions.store_id` tienen `DEFAULT 1`, cualquier consumo de insumos/repuestos fallaba con `inventory_movements_store_id_fkey`.
- El SQL del proyecto ya trae el arreglo en `servidor/sql/seguridad-sesion.sql:2276-2280`: INSERT condicional de la tienda id 1. Si se vuelve a limpiar una base, ejecutarlo otra vez (o conservar `stores` entre las tablas).
- En el VPS, `sudo -u postgres pg_dump -f /root/backups/...` da Permission denied: `/root/backups` lo escribe root. Patrón que funciona: `sudo sh -c "sudo -u postgres pg_dump -Fc -d siumax > /root/backups/archivo.dump"`.
- Al mandar SQL con `psql -c` desde Node, `JSON.stringify` convierte los saltos de línea en `\n` literales y psql da error de sintaxis: poner la sentencia en UNA sola línea.

## 50. Medir el cuadro del buscador, no el input, y revisar TODAS las pestañas (23/11/2026, bitácora 202)
- Al medir "buscadores pegados al borde", hay que medir el **cuadro completo** (`.buscador-sobrio`, o el `id` propio si no usa esa clase), no el `<input>`. El input lleva icono y `pl-3/pr-3` internos: medirlo da 49 px de margen aunque el cuadro esté en `izq=0` y sea falso aviso. En Inventario el cuadro es `#caja-buscador-inventario` y el input `buscador-global-inventario`.
- Si el medidor solo mira `.buscador-sobrio`, un buscador con otro marco queda como `buscador=null` y **parece que no existe**: eso pasó en Inventario y por eso se le escapó al arreglo general (200). Un `null` en el medidor es una señal de alerta, no de "no aplica".
- El verificador de pestañas debe buscar también `[id^="btn-tab-"]` y `[id^="btn-subtab-"]`, no solo `[role="tab"]` e `[id^="tab-"]`: Inventario y Herramientas usan esos prefijos y antes no se revisaban. Tras ampliarlo encontró el buscador de Herramientas detrás de las subtabs.
- Un escáner amplio que busque **cualquier** input con id/placeholder de búsqueda, más tablas, es la forma de cerrar puntos ciegos. Los avisos de tabla en `izq=1, der=1` son el borde de 1 px del marco, no margen real: no "arreglar" eso quitando bordes.
- Al reordenar controles para pegar el buscador al borde, conservar ids y atajos (↑ desde la subtab, ↓ al buscador) y correr la prueba de teclado de esa sección. Aquí `prueba-herramientas-nego.mjs` confirmó *"↓ desde la pestaña baja a su buscador"* tras mover el buscador antes de las subtabs.

## 49. Iconos del sitio oficial tras un deploy (23/11/2026, bitácora 198)
- Los iconos del cliente no están en la raíz sino en `/var/www/ecosistema123/html/icons/`. El script `/opt/siuhub/ecosistema-iconos.sh` copia `/opt/siuhub/ecosistema-logo.png` a los 5 nombres y hace `chown`. Verificar con `md5sum /var/www/ecosistema123/html/icons/icon-192.png /opt/siuhub/ecosistema-logo.png`: deben coincidir.
- El helper `ai-scripts/restaurar-iconos-ecosistema.cjs` hace las dos cosas (reponer y comparar MD5) para no olvidarlo después de cada `node ai-scripts/deploy.cjs ecosistema`.

## 48. Login corto por sitio (23/11/2026, bitácora 197)
- `normalizarEmail` tenía un dominio histórico `@gestorpro.com`; por eso escribir solo `admin` no entraba en Nego ni en ecosistema. La corrección decide el dominio por `window.location.hostname`: `ecosistema*` → `@ecosistema.com`, `nego.*` → `@siumax.com`, el resto conserva `@gestorpro.com` para no romper Evicamp ni los clientes. Los correos completos nunca se tocan.
- Quitar administradores es un borrado: primero respaldo, luego borrar `sesiones` de esos ids y después los `empleados` (FK `sesiones -> empleados`, `trabajadores -> empleados`). Mantener la clave del admin que queda.
- En la prueba de login, el texto de error de `Login.tsx` es **"CREDENCIALES INVÁLIDAS O CUENTA INACTIVA."**, no "incorrectos": una aserción con `/incorrectos/i` da falso fallo. Para probar "sin internet" conviene **no recargar** (la página offline cae en `chrome-error` y `localStorage` queda inaccesible): poner offline, esperar y navegar dentro de la SPA. Para escenarios con distinto usuario, usar `nav.createBrowserContext()` por escenario en vez de limpiar `localStorage` a mitad de prueba.

## 47. Limpieza de bases en dos fases (23/11/2026, bitácora 196)
- El dueño pidió **dos fases** para un borrado grande: primero limpiar y dejar que él revise; después, con su OK, cargar los datos reales. No juntar las dos aunque él diga "antes de subir los reales": la revisión intermedia es parte del pedido.
- "Mantener la cuenta admin como siempre" significa **no borrar los empleados con `rol='Administrador'` ni sus sesiones**, además de `empresa_config` (RUC/logo), `facturacion_config` y `cpe_correlativos`. El resto de tablas se trunca. Ojo con el FK `trabajadores -> empleados` y `sesiones -> empleados`: hay que borrar las sesiones de los no administradores antes de borrar esos empleados, o truncar `trabajadores` primero.
- En `.env.vps` **no existe** `SIUMAX_ADMIN_USUARIO`: el usuario de Nego es fijo `admin@siumax.com` y solo está `SIUMAX_ADMIN_CLAVE`. Para el sitio oficial sí están `ECOSISTEMA_ADMIN_USUARIO` y `ECOSISTEMA_ADMIN_CLAVE`. Nunca imprimir estos valores.
- Al armar helper de `psql` desde Node, llevar **`-tA`** (o `-tAc`): sin esas banderas la salida trae encabezado y el nombre de columna (`tablename`) se toma como si fuera una tabla y el TRUNCATE falla. El error apareció antes de borrar nada; por eso el respaldo se hizo dos veces y no hubo daño.
- Las contraseñas son del dueño, pero la regla prohibe compartir `.env.vps`: responder con la **ruta y los nombres de variable**, nunca con los valores.

## 46. Un desplegable con resaltado debe desplazarse solo (19/11/2026, bitácora 193)
- Mover el índice resaltado con ↑↓ **no basta** cuando la lista tiene `max-h-* overflow-y-auto`: si la opción activa cae fuera del área visible, el dueño dice que «no puede ver lo que seleccionó». Falta `scrollIntoView({ block: 'nearest' })` sobre el botón activo en un `useEffect` de `[indice, listaAbierta, total]`.
- En `ModalNuevaSalida` el buscador de productos ya lo hacía (línea 117) pero la capa flotante de clientes, no. Al copiar patrones entre dos buscadores de la misma pantalla, revisar los dos: uno puede quedar sin scroll.
- La comprobación de la prueba debe medir `scrollTop` **antes y después** de varias flechas (15 ↓ sobre 61 opciones) y verificar que el elemento con `aria-selected="true"` queda dentro del `getBoundingClientRect()` de la lista. Probar solo el índice o el foco no detecta este defecto.

## 52. En `Promise.all` el orden manda, y una secuencia desfasada bloquea los guardados (23/11/2026, bitácora 204)
- Al agregar una consulta nueva a un `Promise.all` con destructuring (`const [resCli, resTrab, resProd, resEmp] = ...`), hay que insertarla **en el mismo lugar del array** que su variable. La puse tercera y los productos cuarta: `resProd` recibió empleados y `resEmp` productos. El `<select>` existía y era `required`, así que una prueba superficial de "presencia" pasaba; los valores reales estaban mal (~100 opciones vacías y el admin fusionado). La prueba adaptiva con 8 fallos fue la que lo destapó.
- Regla para selectores nuevos: comprobar `value`, `selectedOptions[0].textContent`, número de opciones y que el texto de las opciones no esté vacío. Que el elemento exista no prueba que esté cargado.
- En la base de pruebas `siumax`, cargar filas con `id` explícito deja la secuencia atrás: `salidas_id_seq` quedó en 3 con `max(id)=392`, así que cualquier salida nueva muere con `duplicate key value violates unique constraint "salidas_pkey"`. Es un problema de **datos**, no del empleado ni del código. Con el OK del dueño (bitácora 205) se respaldó la base y se corrigió con `setval('salidas_id_seq', (select max(id) from salidas))`, con `lock_timeout`; quedó 392/392. Si se vuelven a cargar datos con ids explícitos, revisar **todas** las secuencias, no solo salidas.
- Para probar un cambio posterior sin crear salidas ni usuarios: buscar una salida ya guardada con otro empleado, ver el `(anterior)` en el selector, cambiarlo al activo, comprobar la base y el ticket, y devolver el valor original. La fila de la tabla puede necesitar dos ↓ desde el buscador; conviene dejar respaldo de clic por si el foco no cae en la fila.

## 53. Cambio estético con regreso exacto y compilación aislada cuando hay WIP ajeno (23/11/2026, bitácora 206)
- Cuando el dueño pide "volver al comienzo", guardar **antes** de tocar código un respaldo del `src` completo, `index.html`, el HEAD (`git rev-parse HEAD`), el `git status` y los SHA256 de cada archivo, con un `COMO-VOLVER.txt` en español simple. Así el regreso se puede comprobar con hashes, no a ojo. En esta pasada: `respaldos-estetica-caja/2026-11-23-inicio/`.
- Si el proyecto real no compila por trabajo ajeno en curso (aquí `TablaConteos.tsx` con dos `</div>` de más), **no lo corrijas**: copia el proyecto a una carpeta temporal (sin `node_modules`, luego junction), restaura desde el backup **solo** los archivos ajenos modificados y deja los archivos propios con el cambio nuevo. Compila ahí y copia el `dist` al proyecto real. `git add -A` está prohibido: el árbol tiene mucho WIP ajeno.
- Ojo con el orden de los commits: un build intermedio que no incluía 204/205 dio 8 fallos en la prueba adaptiva (el selector de empleado). Siempre verificar en vivo el nombre del bundle (`curl` al index y `link[rel=stylesheet]`) y correr la regresión **después** del deploy; un "0 fallos" anterior no prueba el bundle actual.
- Para estética sobria en Caja: selection con `shadow-[inset_0_0_0_2px_var(--color-accent)]`, sin `ring-*`, sin `shadow-xl`, sin `scale`/`translate`, sin `border-dashed`, sin emojis en etiquetas y sin `bg-white`/`text-white` fijos (usar `--color-surface`). Verificar con estilos calculados (`getComputedStyle`) porque el modelo no siempre puede ver las capturas PNG.
- El script de deploy propio (`deploy-solo-nego.cjs`) necesita `createRequire` apuntando a `package.json` del proyecto para encontrar `node-ssh` cuando está en la carpeta temporal. Nunca usar `deploy.cjs` sin argumento: por defecto publica en Evicamp.

## 54. `git worktree`, no backup viejo, para compilar con WIP ajeno (23/11/2026, bitácora 208)
- El dueño revisa que la estética sea **idéntica** a las otras sesiones, no parecida. Si dice *"cambia la estética a la que ya vamos llevando"*, copia el molde de **Inventario > Productos** con las clases compartidas de `src/index.css` (`tabla-marco`, `tabla-fila`, `boton-cabecera`, `buscador-sobrio`, `vacio-sobrio`, `tarjeta-sobria`); no te quedes en quitar sombras y emojis.
- El respaldo del "punto de regreso" sirve para **volver**, no para **compilar**. Restaurar desde él los archivos ajenos modificados puede traer una versión anterior a commits ya hechos: aquí revirtió el arreglo de `empleados_publico` de la bitácora 204 y el selector de Salida salió vacío (12 fallos). Para compilar sin el WIP ajeno, usa `git worktree add --detach <temp> HEAD`, junta `node_modules` con un junction y copia **solo los archivos propios** encima. Verifica con `git -C <worktree> status --short -- src` que aparezcan solo esos archivos.
- Un fallo en una prueba después del deploy puede venir del código que **sí** desplegaste, no de tu cambio: compara siempre el bundle en vivo y lee el mensaje del fallo. Aquí 8 fallos eran del commit 204 revertido por el backup y 4 quedaron del WIP ajeno (prueba 207 + fix de Enter en `ModalNuevaSalida.tsx`), que no se incluyó por regla. Documentar la diferencia evita que otra IA "corrija" trabajo ajeno.
- Si `graphify update .` termina con warnings de BOM en `tsconfig.app.json` o de `lecciones-aprendidas.md`, el grafo igual se actualiza; revisa la última línea (*"Code graph updated"*) antes de darlo por hecho.
- Otra IA puede desplegar en Nego mientras tú estás documentando (aquí a las 14:10). Antes de dar el parte final, vuelve a leer el bundle del HTML en vivo y repite la regresión: si el cambio propio sigue presente, **no re(despliegues) para "ganar"**: reporta el estado final y deja el WIP ajeno intacto.

## 55. Enter en un `<select>`: no frenes el evento si quieres que se despliegue (23/11/2026, cierre del pendiente 207)
- Las reglas 7/8/9 conviven: en un desplegable, Enter **abre la lista** y el selector se queda en el campo; en los demás campos Enter es como un clic y no avanza. `src/utils/flechasEspaciales.ts` llama a `showPicker()` solo si el evento **no** tiene `defaultPrevented`. Si un handler de la pantalla hace `preventDefault()` en todos los Enter (como hacía `handleKeyDownForm` de `ModalNuevaSalida.tsx`), la regla global ve el evento frenado y la lista nunca abre. El arreglo mínimo es: `if (e.target instanceof HTMLSelectElement) return;` antes del `preventDefault()`.
- Para probarlo sin abrir la lista nativa (que no se cierre la prueba) se espía `HTMLSelectElement.prototype.showPicker` y se comprueban tres cosas: `e.defaultPrevented === false`, `showPicker > 0` y foco final en el `<select>`. Ojo con la vigilancia de 400 ms de la regla 9: si la prueba toca otro campo justo después del Enter, la regla devuelve el foco y rompe las comprobaciones siguientes; esperar ~500 ms antes de seguir.
- Si el bundle en vivo cambia mientras working (aquí `4I2N0oaS` → `CKwv0Jvk` → `CPCi-8PQ`), verifica el **contenido**, no el nombre: descarga el JS del `<script type="module">` del index y busca el patrón del fix. El que servía al final (`CPCi-8PQ`) ya traía el arreglo, así que no hizo falta volver a desplegar: repetir la regresión contra el bundle final dio 196/196.
- Al copiar un archivo a una carpeta de compilación aislada, confirma el SHA256 **después** de `Copy-Item -LiteralPath`. Aquí la copia se perdió y el build siguiente salió sin el fix; el bundle servido dio 4 fallos hasta que se recopió y se verificó el patrón en el JS compilado. Un `Copy-Item` sin `-LiteralPath` puede no reemplazar lo que crees.

## 56. "Cajata actual" también es MiniReporteDiario; el molde sobrio va por capas (23/11/2026, bitácora 211)
- Cuando el dueño nombra varias etiquetas juntas (*"fiado yape/plin efectivo tarjeta caja actual"*), busca **todos** los componentes que las renderizan, no solo el más obvio. Aquí "Caja Actual" no era el título de `TicketVenta.tsx` (ya cambiado en 208): era la barra de `MiniReporteDiario.tsx` (`#btn-caja-actual-pos`, `#btn-montos-caja-pos`) y su ventana «Rendimiento de Caja Actual», con tarjetas de Efectivo, Yape/Plin, Tarjeta y Fiados.
- Aplicar el molde por capas: `tabla-marco` para contenedores/filas de pago, `boton-cabecera` para TODO botón (incluidos "Exacto", "Comprobante", "Nuevo Cliente" y "Confirmar"), `tarjeta-sobria` para montos y métricas, `vacio-sobrio` para estados vacíos. El color queda solo en el ícono (`--icono`) o en la línea de la pestaña elegida; nunca en el fondo del botón.
- Ojo: `.boton-cabecera` de `src/index.css` tiene `background`, `border`, `box-shadow` y `transform` con `!important`; un `shadow-[inset_...]` añadido al mismo botón **no se ve**. Para marcar la opción elegida usa un hijo con línea de color (como en los botones de comprobante), no una sombra.
- Las regresiones adaptivas pueden pasar sin abrir el modal de cobro: además de ellas, verifica con `getComputedStyle` los elementos nuevos (fondo, borde, sombra, radio y transform) y confirma en el HTML en vivo el nombre del bundle. Aquí 196/196 y estilos calculados: botones/tarjetas blancos, borde 1 px, `box-shadow: none`, `border-radius: 0`, `transform: none`.

## 57. Otra IA puede commitear mientras compilas: parte siempre del HEAD actual (23/11/2026, bitácora 212)
- El número de bitácora no es fijo: mientras se hacía el espera directo, otra sesión tomó la 211 (cobro sobrio) y dejó un commit nuevo. Antes de numerar, mira `git log -3` y busca el número en `docs/`; si ya está usado, sigue con el siguiente (aquí 212) y cambia también los comentarios del código y de las pruebas.
- **Nunca compiles desde un hash guardado a mano.** El worktree se creó desde `3dbb99a` (visto al empezar) y, al desplegar, el sitio perdió el cobro sobrio que otra IA había commiteado en `9a1f95e` mientras trabajábamos. La regla es `git worktree add --detach <temp> HEAD` justo antes de compilar, y confirmar `git -C <temp> rev-parse --short HEAD`. Con WIP ajeno en el proyecto real, el worktree limpio es la única forma de incluir lo ya commiteado sin arrastrar lo que no está.
- Para detectar un revert así, compara **marcadores de texto del bundle**, no solo su nombre: «Deudas vencidas» estaba ausente en el bundle viejo y presente en el nuevo; «input-nombre-espera» al revés. Un mismo código fuente produce el mismo hash, así que si el bundle servido coincide con el compilado, el deploy fue correcto.
- Una regresión puede fallar por datos y arreglarse sola: una corrida dio 1 fallo y 1 «sin datos» en Salida laptop (tabla no encontrada y un cliente borrado que reapareció); repetir sin cambiar nada dio **208/208**. Repite antes de tocar código por un fallo aislado.
- En celular/tablet el `innerText` de los botones del panel sale en mayúsculas (`PRODUCTOS`, `TICKET\n1\nS/ 0.00`). Para encontrar el botón con `startsWith` hay que comparar `.trim().toLowerCase().startsWith(n.toLowerCase())`; si no, la prueba cree que el panel no existe y el botón de Espera queda fuera de pantalla.

## 58. Estilo alternativo de Caja: capa única, reversible y sin tocar lógica (23/11/2026, bitácora 213)
- Cuando el dueño dice *"no me gustó la estética, probá con otro"* y además fija el regreso *"como era al comienzo"*, no hay que adivinar varios estilos ni preguntar otra vez: él ya autorizó la prueba. Conviene elegir **uno distinto y concreto**, decir cuál se probó y dejar la puerta abierta a su revisión.
- La forma más segura de cambiar mucho aspecto sin romper Caja fue **una clase en el contenedor + un bloque CSS al final de `src/index.css`**, no editar los 5 componentes. Así se conservan ids, manejadores de teclado, lógica de cobro/fiado/comprobante y el modo sin internet; el WIP ajeno en `TerminalBusqueda.tsx`/`TicketImprimible.tsx` queda fuera.
- El bloque redefine variables `--color-*` **solo dentro de `.caja-estilo-neon`** y luego ajusta cabeceras, total, tarjetas y botones. Ojo con las reglas globales de `src/index.css`: `.boton-cabecera`, `.tarjeta-sobria`, `.tabla-marco` y `html:root ... :focus-visible` usan `!important`; para ganar hay que usar selectores más específicos (por ejemplo `html:root .caja-estilo-neon .boton-cabecera:focus-visible`) y mantener el foco visible.
- Antes de desplegar, limpiar `dist` del proyecto real: `putDirectory` **sube pero no borra** archivos viejos. Si no, quedan bundles anteriores en el VPS aunque el `index.html` apunte al nuevo.
- Si el dueño rechaza este estilo, **"el comienzo" no es el commit 211 ni el 212**: es el respaldo original `D:/Programación/siumax/respaldos-estetica-caja/2026-11-23-inicio/` con HEAD `2301848e34930e04e405e9ff4dfee20b2863139e`. Para quitar solo la prueba alcanza con borrar la clase y el bloque CSS; para volver al comienzo hay que seguir `COMO-VOLVER.txt` completo.

## 59. Volver "al comienzo" sin borrar el WIP ajeno (23/11/2026, bitácora 214)
- El dueño rechazó la prueba azul eléctrica con *"no me gusto vuelvo al comienzo"*. No hay que ofrecer otro estilo ni preguntar: ya estaba acordado que "el comienzo" es el respaldo original, no el commit anterior.
- **No conviene copiar `src` completo del respaldo.** Ese respaldo tiene 237 archivos, pero otros agentes modificaron después 35 de ellos (App, Clientes, Finanzas, TablaConteos, TicketImprimible…). Copiar todo borraría su trabajo. La regla es: identificar solo los archivos que tocaron los commits posteriores al HEAD original (`git log --name-only 2301848e..HEAD`), comparar sus hashes con `hashes-iniciales.txt` y restaurar **solo esos**.
- Si alguno de esos archivos tiene además WIP ajeno encima (aquí pasó en `Punto-de-venta/index.tsx`, `TerminalBusqueda.tsx` y `VistaPreviaSalida.tsx`), guardarlo antes con `git stash push -- <archivos>`, restaurar la base original, hacer el commit y después `git stash pop` para que el trabajo ajeno vuelva a quedar encima como modificación sin commitear. Así el commit queda limpio y nadie pierde su trabajo.
- Ojo: `git diff` contra el respaldo muestra 45 diferencias, pero **no todas son de la estética**: 35 son WIP ajeno. Restaurar de más es tan malo como restaurar de menos. Verificar siempre con `hashes-iniciales.txt` al final.
- El respaldo **no es un estado perfecto**: la prueba original da 188 comprobaciones, 8 fallos y 4 sin datos. Los 8 fallos son del selector de empleado de Salidas (en el `ModalNuevaSalida.tsx` del respaldo, `empleados_publico` y `products` están intercambiados en el `Promise.all`; la pasada 204 lo arregló después). Cuando el dueño pida "al comienzo", hay que devolver ese estado **con sus fallos** y avisarle, no arreglarlo por iniciativa propia.
- Al reaplicar el WIP ajeno con `git stash pop` pueden salir conflictos si ese WIP se apoyaba en código de las pasadas revertidas (aquí pasó en el `handlePrint` de Caja y en el encabezado de `TerminalBusqueda`). Resolverlos a favor del trabajo ajeno, agregando los imports/`ref` que necesite para que siga compilando, y dejarlos **sin commitear**. El deploy se compila desde el `HEAD` limpio, no desde ese árbol de trabajo.

## 60. Puesta al día de memoria (23/11/2026, pedido del dueño)
- El dueño pidió dejar **todo guardado y al día** para que otra IA pueda seguir sin preguntar. Esto resume el estado final de las pasadas 213, 214 y 215.
- **213 (propia, commit `f3f7bbe`):** prueba de estilo azul eléctrico en Caja, solo en Nego, con bundles `index-cWWmYyiI.css` / `index-BMpblSY3.js`. Regresión 208/208, 0 fallos. **Rechazada** por el dueño: *"no me gusto vuelvo al comienzo"*.
- **214 (propia, commit local `ff9a933`, sin push):** vuelta al respaldo original `2301848e34930e04e405e9ff4dfee20b2863139e`. Solo 10 archivos de `src` más la prueba adaptiva, verificados con `hashes-iniciales.txt`. Vuelve `ModalNombreEspera.tsx`. WIP ajeno de 35 archivos intacto; los 3 con WIP encima se guardaron con `git stash` y se reaplicaron con conflictos resueltos a favor del trabajo ajeno, sin commitear. Build limpio desde el HEAD de la 214 (worktree aparte, sin WIP), bundle `index-BFssEZh6.css` / `index-BqBmmYfE.js`, deploy solo Nego (22 archivos). En vivo: sin `caja-estilo-neon`, sí `input-nombre-espera`. Prueba original: **188 comprobaciones, 8 fallos, 4 sin datos**; los 8 son viejos del selector de empleado de Salidas y **no se arreglaron** porque el pedido fue volver al comienzo, no reparar Salidas.
- **215 (ajena, SIN commit, pendiente de revisión del dueño):** vista previa de Caja = mismo HTML de impresión (`generarTicketVentaHtml` dentro de un `iframe`), `padding: 3mm 4mm 5mm 6mm` en el HTML del ticket para el corte izquierdo en ticketera 80 mm, y Salida vuelve a `Courier New` en negrita. Tocó `Punto-de-venta/index.tsx`, `Punto-de-venta/components/TicketImprimible.tsx` y `Salidas/components/VistaPreviaSalida.tsx`. Desplegada solo en Nego; bundles en vivo **`index-Cnjs-E2Y.css` / `index-BX-k9rmP.js`**. Trae aparejada la entrada 215 de `docs/BITACORA.md`, también sin commitear: **no hacer `git add docs/BITACORA.md`** en un commit propio.
- **Cómo no confundirse:** si el sitio sirve `index-BFssEZh6.css` / `index-BqBmmYfE.js`, está en el comienzo (214); si sirve `index-Cnjs-E2Y.css` / `index-BX-k9rmP.js`, está con la 215 de otra IA. Consultar siempre el `index.html` en vivo con `curl` antes de dar por hecho un estado.
- **Commits propios hasta hoy:** 214 = `ff9a933` (HEAD local), 213 = `f3f7bbe`, 212 = `a8678ef`, 211-bis = `0c2fdd1`, 211 = `9a1f95e`. Sin push en ninguno.
- Esta puesta al día es solo documentación: no se tocó código, ni Evicamp, ecosistema, base ni credenciales.

## 61. Impresión de tickets 80mm en Nego (Caja y Salida) — NO TOCAR sin pedido (23/11/2026, bitácora 217)

- **Referencia eco-sistema (`D:\Programación\eco-sistema`, Salidas):** `src/components/salidas/components/Comprobante.module.css` y `SalidaPOS.tsx`/`HistorialComprobanteModal.tsx`. Patrón: `@page { size: 80mm auto; margin: 3mm; }`; ticket en pantalla `max-width:320px; padding:12px 10px; border`; en impresión `max-width:100%; border:none; padding:4px 6px;`; se imprime con `window.print()` y CSS `@media print` que oculta `body *` con `visibility:hidden` y muestra solo `.printArea`. En Electron mide alto y usa `printSilent`. **Ventas de eco-sistema no tiene ticket térmico POS igual a Nego.**

- **Nego — configuración que quedó funcionando (confirmada por el dueño):**
  - **HTML del ticket 80mm (Caja `generarTicketVentaHtml` y Salida `ticketHtml`):** `@page { size: 80mm auto; margin: 3mm; }`; `* { box-sizing: border-box; overflow-wrap: break-word; word-break: break-word; }`; `body { width: 100%; margin: 0; padding: 4px 6px; }`; fuente `700 12px/1.35 'Courier New', Courier, monospace`. En Caja la tabla de productos lleva `table-layout: fixed`. **No usar `max-width: 80mm; margin: 0 auto` en body junto con `@page margin 3mm`: puede desplazar el contenido a la derecha en la impresora térmica.**
  - **Caja imprime así:** genera el HTML con `generarTicketVentaHtml`, intenta `imprimirEnTicketera` (app de escritorio), y si es navegador crea un iframe dinámico de **tamaño real** (no 0x0): `position:fixed;left:0;top:0;width:80mm;height:100vh;border:0;opacity:0;pointer-events:none;z-index:-1;`, pone `srcdoc`, en `onload` espera ~300ms y llama `contentWindow.print()`, luego elimina el iframe. **No usar iframe 0x0/visibility:hidden 0x0: puede cortar/desplazar en Chrome/Epson.**
  - **Salida imprime así:** en ticket 80mm (navegador, sin ticketera de escritorio) usa el **mismo iframe dinámico de tamaño real** que Caja (`width:80mm;height:100vh;opacity:0;pointer-events:none;z-index:-1`, srcdoc, onload ~300ms print, remove). En Hoja A4 sigue usando el iframe visible de vista previa (`marco.current?.contentWindow?.print()`). No volver a imprimir ticket 80mm desde el iframe visible de vista previa: en Epson TM-T20IV salía corrido a la derecha.
  - **Vista previa Caja:** no tocarla; sigue siendo el componente `TicketImprimible`.
  - **Vista previa Salida Hoja A4:** iframe con `w-full max-w-[210mm] mx-auto` para que no se vea alargado en pantallas anchas.

- **Lo que NO funcionó (no repetir):**
  - `@page margin 0` + `body width:72mm; margin-left:3mm; padding:2mm 0 4mm 0`: hizo borroso el lado izquierdo en Salida y Caja siguió cortada a la derecha.
  - Iframe oculto 0x0 para imprimir: puede cortar/mover contenido en la impresora.
  - PrintArea portal con `TicketImprimible` React duplicado + `window.print()` con `visibility:hidden` en body: hizo desaparecer los productos del ticket impreso. Si se reintenta el patrón eco-sistema de printArea, usar contenido HTML/DOM ya renderizado y verificar que cart/productos estén presentes.
  - Cambiar Salida “porque sí”: Salida ya imprimía bien; solo alinear CSS de ticket.

- **Diagnóstico útil:** si el PDF de Chrome sale completo pero pegado a un lado y el papel sale cortado, es posición/margen físico del driver; comparar siempre con Salida en la misma impresora/config. Probar con Ctrl+F5 en `nego.siumax.duckdns.org`. Desplegar solo con `node ai-scripts/deploy.cjs siumax`.
- **Logo en tickets (23/11/2026, 218):** Caja y Salida deben mostrar logo siempre. Si `empresa_config.logo_url` está vacío, usar fallback `src/assets/logo.png`. En HTML impreso por `srcdoc`, convertir la URL del logo a absoluta con `new URL(logo, location.href).href`; una ruta relativa puede no cargar en `about:srcdoc`.
- **Claridad de letra en tickets 80mm (23/11/2026, 218):** base `12px/1.35 'Courier New', Courier, monospace`, negrita, negro sobre blanco; textos pequeños mínimo `11px`; evitar grises/fondos débiles en térmica. Mantener el mismo criterio en Caja y Salida.
- **IMPRESIÓN 80mm (Caja/Salida) - NO QUITAR / RECORDAR SIEMPRE (confirmado por el dueño 23/11/2026, Epson TM-T20IV, Chrome, 80x3276mm, márgenes Ninguno, escala 100%):**
  - **Síntoma que ocurrió:** cabecera del ticket salía corrida a la derecha en papel físico; en PDF se veía centrado. Pruebas con PNG/raster (grande, pequeño, optimizado, B/N, logo de ecosistema) salían corridas en papel. Logo SVG salió centrado. La prueba que salió centrada en papel fue el estilo tipo ecosistema.
  - **Formato que SÍ funciona (NO CAMBIAR):** fuente `ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace`; cabecera `display:flex; flex-direction:column; align-items:center; text-align:center;`; logo simple `width:52px; height:52px; object-fit:contain; display:block; margin-bottom:6px;` **sin** filtros CSS complejos; **sin** tablas envolviendo la cabecera; separadores con `border-bottom: 1px dashed #000`.
  - **Logo:** antes de generar el ticket 80mm, redimensionar en canvas (máx. 240px) e incrustar como data URL PNG pequeño, con caché por URL y fallback al logo local (`logoSiumax`) si la conversión falla. Aplicado en Caja `generarTicketVentaHtml` y Salida `ticketHtml`.
  - **Impresión:** Caja y Salida ticket 80mm imprimen por iframe oculto dinámico de tamaño real (`width:80mm; height:100vh; opacity:0; pointer-events:none; z-index:-1`), `srcdoc`, `onload` ~300ms `print()`, limpiar en `afterprint` + fallback 60s, y guard `yaMandoImprimir` para evitar doble diálogo. **No** usar iframe 0x0.
  - **@page/body:** `@page { size: 80mm auto; margin: 3mm; }`, `body { width: 100%; margin: 0; padding: 4px 6px; }`. **No** usar `max-width: 80mm; margin: 0 auto` en body con `@page margin 3mm`.
  - **Texto centrado:** no usar `letter-spacing` compensado con `padding-left`; mantener centrado simple.
  - **Cualquier cambio futuro en impresión/ticket 80mm:** revisar esta sección antes de tocar; probar en papel físico y PDF en la Epson TM-T20IV. No volver a la estructura vieja de tabla/wrappers/filtros pesados en cabecera.

## 62. Letra de tablas: medir antes, arreglar en un solo bloque de CSS (24/11/2026, bitácora 219)
- El dueño quiere **la misma letra en todas las tablas**, con Inventario y las ventanas flotantes como referencia. No basta con "verla bien": hay que **medir en vivo** (`getComputedStyle().fontSize`) y proponer un número concreto antes de tocar. Aquí la escala compartida es `--text-xs` (14 px, cabeceras) y `--text-sm` (15 px, datos), definida en `src/index.css`.
- La causa de las tablas chicas no era el tema ni el zoom: eran clases fijas `text-[8px]`…`text-[12px]` escritas en los componentes. No hay que editar decenas de TSX: un bloque al final de `src/index.css` con variables `--text-tabla-cabecera` / `--text-tabla-dato` y selectores `main .tabla-cabecera`, `main [data-row="true"]` y `.ventana-sobria` resuelve el cambio sin tocar ids, teclado ni lógica.
- **Punto ciego encontrado:** dentro de las ventanas hay tablas sin `.tabla-cabecera` ni `data-row`. El tamaño puede estar en `<thead>`, en `<th>`/`<td>` **o en la propia `<table>`** (ej. `className="w-full text-left text-[11px]"` en el detalle de Salidas). Hay que cubrir los 3 sitios; si no, la medición sigue dando 11/12 px aunque el bloque "parezca" aplicado. El medidor debe mirar `th` y `td` calculados, no solo buscar clases.
- **Ojo con las alturas fijas:** al subir la letra, las filas con `md:h-[79px]` (Salidas) pueden cortar contenido. Antes de atribuirlo al cambio, comparar `scrollHeight` con la letra vieja inyectada por devtools. Aquí ya había 1 px de corte antes y 3 filas pasaron a 85–87 px; se cambió la altura por `min-height: 79px` **solo en `#tabla-salidas-lista` y dentro de `@media (min-width: 768px)`**, no en todas las tablas.
- La paginación (`PaginacionSobrio`) queda en 10 px en **todas** las sesiones, incluso en Inventario: no es un olvido y no se debe "arreglar".
- Verificación mínima antes de dar por hecho: medición de frecuencias por sesión, revisión de `scrollWidth - clientWidth` y de `scrollHeight > clientHeight` en PC y celular, y medición de `th`/`td` dentro de ventanas abiertas. No dar por bueno un selector sin medir su resultado calculado.

## 63. Un bundle desplegado puede estar peor que el código (24/11/2026, bitácora 220)
- Síntoma: en Nueva salida, «Empleado responsable» salía grande y vacío. **No era la base ni la vista `empleados_publico`**: la consulta devolvía 1 fila válida. El sitio servía `index-CEaqKh-L.js`, donde `cargarCatalogos` guardaba `ye.data` (empleados) como productos y `Be.data` (productos) como empleados; por eso el desplegable tenía 513 productos sin texto. El fuente y los commits ya estaban bien. **Antes de culpar a la base, mirar el `index.html` en vivo y buscar marcadores dentro del JS servido.**
- Arreglo que conviene: nombrar las variables del `Promise.all` **exactamente en el orden de las consultas** (`resEmpleados` para la consulta de empleados, `resProductos` para productos) y usar los mismos nombres al guardar. Así una futura reordenación se ve en el diff y no se cruza sin querer. No haría falta tocar teclado ni lógica.
- Como el error estaba en el bundle, bastó con corregir el nombre, compilar y redeployar Nego. En vivo pasó a `index-Bg54mEgM.js` y el desplegable quedó con 2 opciones y el valor del usuario que ingresa. **Los bundles viejos siguen accesibles por URL**: que `index-hrvuvns5.js` responda 200 no prueba que sea el que usa la página; siempre leer el `<script src>` del `index.html`.
- Trampa de las pruebas sin interfaz: `showPicker()` no abre una lista nativa real en headless, y la regla global de `flechasEspaciales.ts` mueve el foco al siguiente campo. Que ArrowDown saque el foco en el robot **no prueba** que falle en el navegador del dueño. No cambiar la regla global sin confirmación en pantalla real.
- Deploy con WIP ajeno: el CSS servido `index-BeqeeMQO.css` incluía `.siumax-print-area` de trabajo ajeno. Compilar desde un worktree limpio dio `index-0iI_CigW.css` **sin** ese bloque; compilar desde el árbol de trabajo lo conservó. No es regla fija: antes de elegir, comparar el CSS en vivo con el que se va a subir para no borrar trabajo ajeno ni arrastrar algo no deseado. El commit propio fue selectivo; el WIP se dejó sin commitear.

## 64. Filtro de fecha en Salidas y devoluciones que "ya no se ven" (24/11/2026, bitácora 221)
- Cuando el dueño dice que **ya no ve las devoluciones** en la tabla de Salidas, primero **contar en la base**: la marquita `dev.` solo aparece si hay filas en `salida_devoluciones` o ítems con `cantidad_devuelta > 0`. En Nego había 393 salidas y **0** en ambas consultas (estado 200, 0 filas): el código no se había borrado. Comparar también los marcadores del bundle servido («Registrar Devolución», `salida_devoluciones`, `dev.`) antes de tocar componentes. **Pedir una salida/fecha concreta** en vez de "arreglar" a ciegas.
- El filtro de fecha que eligió fue **una fecha + TODAS**, con `filtroFecha === ''` como "todos los días". Comparar `String(s.fecha || '').slice(0, 10)` evita problemas si la fecha viene con hora. Cambiar la fecha debe volver a la página 1 (regla ya usada en los demás filtros).
- **Teclado del `input type="date"`:** con el calendario **cerrado**, `ArrowDown`/`ArrowUp` deben mover el selector (↓ a paginación, ↑ a «Nueva salida») y `ArrowLeft`/`ArrowRight` recorrer la barra, sin cambiar el valor; esto ya lo logra `e.preventDefault()` en `teclasFecha`. Con el calendario **abierto**, el navegador se queda con las flechas y las usa para navegar días/meses: **no es un fallo** y no hay que "arreglarlo" (es justo cómo se elige la fecha). Una prueba headless que aprieta flechas justo después de `showPicker()` puede mostrar un cambio de fecha: eso es el calendario, no el filtro.
- Otra IA desplegó encima después de nuestro deploy. El bundle final en vivo pasó a `index-BEC4TPfN.css` / `index-CImqQUqO.js` y **sí traía el filtro**. Regla: antes de dar por hecho qué bundle está sirviendo Nego, leer el `index.html` en vivo y buscar marcadores; si otro agente desplegó después, **no redeployar solo para "recuperar" nuestros bundles**.
- El árbol principal no compilaba por `src/sections/Utilidades/components/AnalisisSalidasProductos.tsx` (WIP ajeno, sin commitear). No se tocó: se compiló en un worktree limpio copiando solo los 2 TSX propios y `src/index.css` (para conservar `.siumax-print-area`, que ya estaba en vivo). Commit selectivo, sin push.

## 65. El aviso «elige un cliente de referencia» no es un error nuevo (24/11/2026, bitácora 222)
- Mensaje exacto: *"La nota ya está registrada; elige un cliente de la lista como referencia para guardar la salida"*, en `handleGuardarSalida` de `ModalNuevaSalida.tsx`. El dueño lo leyó como *"debo volver a registrarlo como nota"*, pero dice lo contrario: la nota **ya está**; lo que falta es un `customerId`.
- **No quitar esta validación para \"hacer más fácil\" el alta.** `fn_registrar_salida` hace RAISE si `customer_id` es NULL y la columna es FK (sección 40). El dueño aprobó en 182/188 que el nombre no registrado se guarde solo como `CLIENTE: ...` en observaciones, sin crear cliente. Cualquier cambio para que solo la nota baste implica **proponer antes** un cliente genérico de referencia y tocar base/SQL: esperar OK explícito.
- Orden correcto para el dueño: escribir el nombre → elegir «+ REGISTRAR … COMO NOTA» → **sin borrar el nombre**, volver a abrir el buscador y elegir cualquier cliente de la lista → completar trabajador/materiales → Guardar. Verificado en vivo: la nota se conserva (`NOTA: ...`) y `#select-bien-salida` deja de estar deshabilitado.
- Ojo con `onChange` del buscador: solo limpia `clienteLibre`/`customerId` cuando el texto queda **vacío**. Cambiar el texto por un cliente real no borra la nota; borrar todo sí. En Nego hay **504 clientes activos**, así que siempre hay referencia disponible.
- Este diagnóstico fue solo lectura: no se cambió código, no se guardó salida de prueba, no se desplegó y no se hizo push. Si el dueño insiste en que solo con nota se guarde, mostrar la propuesta y esperar el «empieza».
- **El dueño insistió (24/11, bitácora 223): quiere que la nota baste y no tener que elegir cliente creado.** La propuesta es un cliente interno `CLIENTE NO REGISTRADO (NOTA)` con id fijo `990001` y `activo = false` en Nego, asignado automáticamente por `elegirClienteNota`. No han dado el «empieza»: **no ejecutar todavía**. Ojo: no conviene usar un cliente real como referencia silenciosa porque ensucia los reportes por cliente; por eso el cliente debe ser propio e inactivo para el desplegable.

## 66. Cliente interno para que la nota baste (24/11/2026, bitácora 224)
- Con el «empieza» del dueño se creó en `siumax` el cliente `CLIENTE NO REGISTRADO (NOTA)`, id fijo **990001**, `activo=false`. Ese `activo=false` es clave: no sale en el buscador y no ensucia los reportes por cliente. **Nunca usar un cliente real como referencia silenciosa.** El nombre que escribe el dueño sigue yendo solo en observaciones como `CLIENTE: <NOMBRE>`; no se crea cliente nuevo por salida.
- Patrón reutilizable cuando una FK pide id pero el dueño quiere solo texto: cliente interno invisible con **id fijo** + `INSERT ... ON CONFLICT (id) DO UPDATE` en `servidor/sql/seguridad-sesion.sql`, respaldo previo y `SET LOCAL lock_timeout = '5s'`. No hace falta tocar `fn_registrar_salida`.
- En `ModalNuevaSalida.tsx`, `elegirClienteNota` pone el id y baja el foco a `#select-bien-salida` (antes no lo habilitaba). Los borradores viejos que guardaron nota sin id y los `datosIniciales` con nota reciben el mismo id; la vista previa usa el nombre escrito en vez de `NO REGISTRADO`. Comparar ids con `String(...)` porque vienen mezclados número/texto.
- **Lección de pruebas (fallos del robot, no del cambio):** los avisos de la app son de la página (`[data-dialogo-sistema]`, con Enter en `#dialogo-sistema-aceptar`), **no `window.alert`**: el robot debe cerrarlos con Enter antes de seguir. La etiqueta «Personal Técnico Asignado» sale en **MAYÚSCULAS**: buscar con `toUpperCase().includes('PERSONAL')`. En el buscador de productos, Enter abre las sugerencias (`sugerencia-salida-*`) y el foco sigue en `#input-buscar-producto-salida`; recién después baja a cantidad. Primera prueba: 27/31 por esos tres detalles; corregida, guardó SAL-1547.
- Verificado con teclado en 390/768/1366/1920 y con navegador sin internet; guardado real **SAL-1547** (`customer_id=990001`, `CLIENTE: ZZZ NOTA DIAG 224`) y nombre visible en el comprobante. Compilado en worktree limpio por el WIP ajeno del árbol principal; CSS idéntico al vivo para conservar la impresión. Commit selectivo, sin push, sin Evicamp.

## 67. Análisis de salidas: letra de datos y regreso desde Salidas (24/11/2026, bitácora 225)
- El análisis usaba `text-xs` (14 px) en datos; el molde de Inventario usa `text-sm` (15 px). La corrección fue **solo CSS**, en el bloque compartido de `src/index.css`: `main [data-row="true"] [class*="text-xs"]`, `.ventana-sobria .tabla-fila [class*="text-xs"]` y `.ventana-sobria .tabla-fila [class*="text-[10px]"]` → `var(--text-tabla-dato)` (15 px). **No tocar pestañas**: miden 10 px igual que Clientes (`.pestanas-sobrias`), es estándar. No tocar cabeceras, botones, ids ni teclado.
- El detalle de salidas dentro de `.ventana-sobria` no tenía `data-row="true"`; por eso la regla incluye `.ventana-sobria .tabla-fila`. Antes de dar por bueno un arreglo de tamaño, medir `getComputedStyle().fontSize` en vivo.
- **Bug encontrado al probar:** “Volver a Utilidades” desde Salidas volvía, pero el efecto de `salidaIdInicial` reabría el detalle porque `navState.salidaId` seguía en App. Arreglo: al volver, pasar `salidaId: undefined` en el nav state, y en `Utilidades` hacer `useEffect` que sincronice `vista` con `vistaInicial`.
- Comprobación: 0 desbordes en 12 vistas a 1366×900 y 390×844; teclado y sin internet OK sobre dist local. **No desplegado**: Nego sirve bundles ajenos anteriores; falta OK explícito “OK, despliega a Nego”.
- **Ya desplegado en la 226:** el mismo cambio se subió a Nego junto con el detalle nuevo. En vivo: `index-Bu0LLh2p.js` / `index-oL8QgGmu.css`; medido 15 px en datos y 14 px en cabeceras.

## 68. Detalle de Salida editable, devoluciones en filas y botones en una sola fila (24/11/2026, bitácora 226)
- El dueño quiere **arreglar todo desde el detalle**, sin volver a la ventana de nueva salida: cliente, bien, dirección, ubicación, fecha, nota, responsable, trabajadores y materiales. «Eliminar» significa **borrar la salida y devolver todo el stock pendiente**; «Cerrar» se quitó porque está la **X**. Dejó claras las etiquetas en una sola fila, también en celular.
- La regla de medición de botones: dar altura **fija `h-10` (40 px)** a todos y `flex-nowrap`, con `overflow-x-auto` en el contenedor. Agrupar filas por `Math.round(y / 8)` daba **2 filas falsas** por una diferencia de 2 px entre botones; comparar con `y - anterior > 4` mide la fila real. En 390 px conviene etiquetas cortas (`Imprimir`, `Continuar`, `Finalizar`) y esconder los iconos con `hidden sm:block`.
- **Trampa del modo sin internet:** `setOfflineMode(false)` no reactiva `hayConexion()` al instante; el vigilante tarda hasta **15 s** en confirmar. Mientras tanto el sistema bloquea escrituras a propósito y la nota parece "no guardarse". La prueba debe esperar a que desaparezca «SIN INTERNET» del texto de la página antes de editar; no cambiar la lógica de conexión por un fallo del robot.
- Otras trampas de la prueba de interfaz: cargar `.env.vps` con `process.loadEnvFile`; insertar `customers` y `trabajadores` **antes** de `fn_registrar_salida` (FK); cerrar paréntesis en la consulta de `salida_devoluciones`; y al limpiar usar `fn_eliminar_salida` en vez de `DELETE` directo para recuperar stock si la prueba se cortó.
- En Nego **no existe el rol `authenticated`**: ponerlo en los `GRANT` da `role "authenticated" does not exist`. Los permisos nuevos se dieron solo a `anon`. Respaldo, `lock_timeout` y `NOTIFY pgrst, 'reload schema'`; **nunca reiniciar la API**.
- Antes de sobrescribir `ModalDetalleSalida.tsx`, revisar el WIP ajeno: here solo agregaba la sección «Devoluciones registradas», que quedó incluida en la reescritura. Compilar siempre desde un worktree limpio cuando el árbol principal tenga WIP ajeno; conservar el CSS de impresión que ya estaba en vivo.

## 69. Quitar materiales, Devolver flotante y estilo de Nueva salida (24/11/2026, bitácora 227)
- **Quitar ≠ editar cantidad:** `fn_editar_salida` **no borra** ítems que falten en el JSON (para no dañar lo que se carga aparte). Por eso hace falta una RPC propia `fn_quitar_material_salida(salida, item, usuario)`: calcula `cantidad - cantidad_devuelta`, llama a `fn_devolver_stock_salida` solo si queda algo y luego `DELETE` del ítem. Bloquear la salida con `FOR UPDATE` y repetir la comprobación de pertenencia del ítem.
- `salida_devoluciones` tiene FK `salida_item_id ... ON DELETE CASCADE`: la fila de devolución desaparece con el ítem, pero el `inventory_movements` con `operation_type='DEVOLUCION'` **queda**. Es correcto: el movimiento es el histórico real del almacén; la prueba debe medir `sum(change_amount)` en movimientos, no contar devoluciones.
- **Trampa grave de la interfaz:** un `<button type="submit" form="...">` **fuera** del form + un `onClick={onConfirmar}` hace que la acción se ejecute **dos veces** (click y submit). La primera prueba registró 4 devoluciones / 6 unidades en vez de 2 / 3. Regla: **un solo camino** (o `onClick` con `type="button`, o `type="submit"` con `onSubmit` en el form), y además un guardia `if (procesando) return;` al inicio de la acción.
- Para ventanas sobre ventanas, `useCerrarConEscape` mantiene una **pila**: Escape cierra solo la de arriba. La ventana flotante de devoluciones se renderiza como **hermana** del contenedor del detalle (no dentro de `overflow-hidden`) con `z-[60]` frente al `z-50` del detalle; así no se recorta y el historial de atrás sigue visible.
- **Igualar estilo no es "parecido":** copiar literalmente de `ModalNuevaSalida` las clases `ventana-sobria`, `max-w-5xl`, `border-2 border-[var(--color-ink)]`, cabecera `ventana-cabecera` con `px-4 sm:px-6 py-3 sm:py-4`, cuerpo `p-4 sm:p-6` y footer `bg-[var(--color-bg)] p-3 sm:p-4 border-t-2`. Medir `getComputedStyle(boton).borderRadius === '0px'` en los cuatro tamaños. Mantener `h-10` y `flex-nowrap` en el footer para no romper la fila única.
- En la prueba de interfaz, los botones por fila llevan id `btn-quitar-material-detalle-${idx}`; la X abre un `confirmar()` (se cierra con Enter en `#dialogo-sistema-aceptar`) y después viene un `avisar()` que también hay que cerrar. Si quedan avisos en la cola, el siguiente `page.focus()` parece no funcionar: son los diálogos, no el código.

## 70. Detalle solo para ver, Continuar con materiales y fecha/trabajador al devolver (24/11/2026, bitácora 228)
- **Cumplir el cambio de regla del dueño literalmente:** si dice que ya no quiere editar en el detalle, **reescribir** `ModalDetalleSalida.tsx` sin `input`/`select`/`textarea` ni X de materiales. No basta con esconderlos: la prueba debe contar 0 campos y 0 `btn-quitar-material-detalle-*` dentro del contenedor. Conservar los 6 botones, la X de cierre, el historial y el mensaje que dice que es solo lectura.
- «Continuar salida» pasa por `onContinuar` → `setSalidaParaContinuar` + `setModalNuevoOpen`. En `ModalNuevaSalida`, copiar `salidaRaiz.items` a `items` **dentro del efecto que ya carga el salidaRaiz** (no en otro efecto: se pierde el orden). El guardado ya manda `salida_raiz_id`, así que no hace falta tocar el RPC: es salida nueva y **debe** descontar stock otra vez. La tabla editable de Nueva salida no tiene ids en las cantidades: localizar con `[data-tabla-campos] input[type=number]` y los botones por `title="Quitar material"`.
- **Cambiar la firma de una RPC:** crear la nueva con los parámetros extra al final y `DEFAULT NULL`, dar `GRANT` **a la firma nueva** y recién entonces `DROP FUNCTION` de la vieja. Si se hace al revés se pierde el permiso. Las llamadas con 5/4 argumentos siguen resolviendo a la nueva firma; verificar con `has_function_privilege('anon','public.fn_...(tipos nuevos)','EXECUTE')` y `fn_permisos_requeridos`.
- La fecha de la devolución se manda como ISO con `new Date(\`${fechaDev}T12:00:00\`).toISOString()` (mediodía para no cambiar de día con la zona horaria) y se guarda con `coalesce(p_fecha, now())`. El trabajador es opcional: `NULL` cuando no se elige, con FK `ON DELETE SET NULL`. Hay que pedir el join `trabajador:trabajadores(id, nombre)` en el `select` de `salida_devoluciones`, si no la columna del historial sale vacía.
- **Trampas de la prueba 228:** `cantidad` es `numeric(12,3)` y psql devuelve `3.000`, no `3` (comparar con regex que acepte decimales). `fn_registrar_salida` exige **al menos un trabajador**: si la salida de prueba se crea por SQL sin `trabajadores`, el guardado de la continuación falla con *"Asigna al menos un trabajador a la salida"*. Y a 390 px el footer tiene **1 desborde intencional** (`overflow-x-auto`) para mantener los botones en una sola fila: no exigir 0 desbordes ahí.
- La prueba real de stock debe terminar con el stock igual al inicial y sin filas de prueba: borrar las salidas con `fn_eliminar_salida`, los movimientos con `"user" = 'PRUEBA 228'` y el cliente/técnico creados. COMPLETADO: 4 comprobaciones de stock y 30/30 de interfaz; deploy solo Nego `index-Bp6aQKRr.js` / `index-BzLRfRHr.css`.

## 71. Nombre de la nota en Salidas: pase a todos, panel y push (25/11/2026, bitácora 229)
- Para una nota, `customer_id = 990001` es solo referencia interna: el nombre real vive en la **última** etiqueta `CLIENTE:` de `observaciones` (puede haber más de una). Normalizar al cargar lista y detalle en `Salidas/index.tsx` y conservar `clienteLibre` en «Continuar salida»; así tabla, buscador, comprobante y formulario coinciden sin tocar la base ni los componentes con WIP ajeno.
- **Verificar siempre un marcador de texto dentro del JS en vivo**, no solo el nombre del archivo: otro agente desplegó encima `index-BeIFa2v-.js` y luego `index-DRqv6GXc.js` y el cambio desapareció aunque el sitio seguía respondiendo 200. Volver a subir y confirmar que `CLIENTE NO REGISTRADO (NOTA)` esté en el bundle servido (`index-4DjJ7A18.js`).
- `deploy.cjs siumax` publica en **Nego** (`nego.siumax.duckdns.org`), aunque el destino interno se llame `siuhub`; `comerc.siumax.duckdns.org` dio error SSL/TLS al verificar, no es el sitio que revisa el dueño. Para ecosistema, reponer siempre los iconos después (`restaurar-iconos-ecosistema.cjs`, md5 `c159d216…`).
- Para actualizar el panel usar **`cliente.cjs nego`** (respalda panel y Nginx, reinicia y valida los links). **Nunca `cliente.cjs panel` solo para eso**: también reconfigura Mercado Pago y puede pasar cobrando a modo prueba.
- Push con rama limpia sobre `origin/fase-11-sunat`: aplicar **solo las líneas propias**, porque los dos archivos ya tenían cambios nuevos en GitHub y un parche directo no aplicaba. La documentación se agrega sobre la rama publicada, **sin copiar los documentos locales** (son de la rama anterior y sobrescribirían entradas de otros agentes). Después `git fetch origin` + `git reset --mixed origin/fase-11-sunat` en el repo principal deja el WIP ajeno intacto.
- La regresión adaptiva quedó en **188 comprobaciones, 4 fallos** (`Salida ... al elegir nota el foco baja a Dirección — select-bien-salida`). Es del camino de Nueva salida, no de la corrección de la nota ya registrada; no modificarlo sin pedirlo. La prueba genérica `verificar-deploy-nego.mjs` espera `#tabla-analisis-salidas`, que ya no está en el recorrido actual: no sirve de regresión aquí.

## 72. Fusionar salidas: ubicación literal, X de desvinculación y botón duplicado (25/11/2026)
- **Si el dueño dice «al costado a la izquierda del botón Nueva salida», va ahí, no dentro del modal.** Corregir de verdad: mover el control a `HeaderSalidas.tsx`, dejar `ModalNuevaSalida.tsx` como estaba antes y abrir el GENERAL desde `Salidas/index.tsx`. Dejar el botón viejo dentro del formulario produce **dos ids `btn-fusionar-salidas`** y un modal dentro de otro; la prueba no lo ve si `getElementById` devuelve el primero del DOM. Añadir siempre `document.querySelectorAll('#btn-fusionar-salidas').length === 1`.
- La posición se comprueba con `closest('#modal-nueva-salida-container')`, `parentElement === btn-nueva-salida.parentElement` y `getBoundingClientRect()` (`rb.right <= rn.left + 2`); no basta con que el botón exista ni con mirar el lado derecho de la pantalla.
- «Desvincular salidas» significó, por decisión del dueño, **quitar una salida del GENERAL** (X por salida), no quitar todas ni desmarcar en la lista. Es solo memoria: sacar de `elegidas`, borrar del mapa `devolver` los ítems de esa salida, recalcular resumen y volver a la lista si no queda ninguna; la salida real sigue en la tabla. Sin SQL.
- El CSS pone los textos en mayúsculas: comparar el subtítulo con `.toLowerCase().includes('1 salida(s)')`, no con el texto en minúsculas.
- Escape del GENERAL vuelve a la lista de Salidas (ya no hay formulario debajo). ← de «Nueva salida» y → de «Fusionar salidas» se devuelven el foco entre los dos botones de la cabecera.
- Otra vez el sitio fue sobrescrito durante la tanda (`index-CyFtSW6H.js` sin marcadores, `index-Cy7XoMwt.js` con botón pero sin X); la regresión falló antes en `#input-login-usuario` por ese bundle ajeno. **Verificar marcadores dentro del JS servido inmediatamente antes de dar el parte**, no solo el nombre del bundle. Bundle final **`index-CdbIQmqK.js`**; pruebas **142/142** y **66/66**.


  
