# Bitácora compartida (Claude ↔ Antigravity ↔ cualquier IA)

> **Al EMPEZAR:** lee este archivo, `AGENTS.md` y `docs/PLAN-SIUMAX-COMERC.md`.
> **Al TERMINAR, o si te vas a quedar sin uso:** escribe arriba una entrada nueva con lo que hiciste, lo que quedó a
> medias y el siguiente paso, y haz `git commit` (sin push, salvo que el dueño lo pida).
> Escribe en español simple. Lo más nuevo va primero.

---

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
