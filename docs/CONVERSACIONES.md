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
