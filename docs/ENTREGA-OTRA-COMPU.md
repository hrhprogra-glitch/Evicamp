# Entrega para continuar en otra computadora (26/11/2026)

> Este archivo se sube a GitHub con el código. Léelo primero en la compu nueva.
> Todo lo importante está **commiteado**; lo que no va en GitHub se indica en la sección 2.

## 1. Qué bajar y por dónde empezar

- Repo: `https://github.com/hrhprogra-glitch/Evicamp.git`
- Rama con todo integrado: **`fase-11-sunat`**. La rama `pase-todos` queda apuntando al mismo commit (por si se quiere ver el historial de integración).
- Commit de la entrega: `b8b67ad6f928eb9caca42c4b18d2a0ad8849e9e4` (`b8b67ad`). Puede haber un commit posterior solo de docs; revisa que `git log` en `fase-11-sunat` incluya ese hash antes de trabajar.
- En la compu nueva:

```bash
git clone https://github.com/hrhprogra-glitch/Evicamp.git
cd Evicamp
git checkout fase-11-sunat
npm install
```

- Antes de tocar código, leer (en orden):
  1. `CLAUDE.md` y `AGENTS.md` de la carpeta **SiuMax** (no viven dentro de este repo: cópialos también a la otra compu; son la fuente de las reglas del dueño).
  2. `docs/BITACORA.md` (lo más reciente arriba).
  3. `docs/PLAN-SIUMAX-COMERC.md` ( dónde estamos y pendientes).
  4. `docs/CONVERSACIONES.md` (decisiones del dueño) y `docs/MEMORIA-IA.md` (errores y reglas).

## 2. Lo que NO está en GitHub (imprescindible)

- **`.env.vps`**: credenciales del VPS y de los sitios (`VPS_HOST`, `VPS_USER`, `VPS_PASSWORD`, `SIUMAX_ADMIN_USUARIO`, `SIUMAX_ADMIN_CLAVE`, `ECOSISTEMA_ADMIN_USUARIO`, `ECOSISTEMA_ADMIN_CLAVE`, `PANEL_CLAVE`, etc.). Git lo ignora a propósito. Cópialo de forma segura de la compu vieja o pídelo; **nunca lo pegues en un doc, commit o chat**.
- **Carpeta de pruebas**: `puppeteer-core` vive en `D:/Programación/siumax/herramientas-pruebas` (fuera del repo). En la otra compu instálalo y pasa la carpeta como argumento; el navegador usado es Edge en `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` (ajusta la ruta si hace falta).
- **Worktrees temporales**: los de `C:/Users/User/AppData/Local/Temp/opencode/` no se clonan. Todo lo que estaba en ellos ya está commiteado en `fase-11-sunat`; si se necesita otro, `git worktree add <ruta> <rama>`.
- **Repo principal de la compu vieja** (`D:/Programación/siumax/negocios/comercio`): quedaron dos archivos modificados sin commit (`TablaProductos.tsx` e `Inventario/index.tsx`). **Ya están integrados y commiteados aquí** en `fase-11-sunat`. También quedaron reportes/scripts de diagnóstico sin commitear en `ai-scripts/` y archivos temporales en `graphify-out/`; no son parte del sistema y no hace falta copiarlos.

## 3. Estado de los sitios al momento del pase

| Sitio | JS en vivo | CSS | Observación |
| --- | --- | --- | --- |
| Nego (`nego.siumax.duckdns.org`) | `index-C7Sz-l91.js` | `index-DRCSlWbD.css` | Incluye «Fusionar» que guarda, impresión corregida y cantidad de arriba con `select()`. Otro worktree puede haber publicado después: **verificar siempre el bundle en vivo**. |
| Evicamp (`evicamp.duckdns.org`) | `index-D-gYUBB1.js` | `index-DRCSlWbD.css` | Tiene la lista de impresión; **no** tiene el cambio de «Fusionar» (quedó solo en Nego). |
| ecosistema (`ecosistema123.duckdns.org`) | `index-D-gYUBB1.js` | `index-DRCSlWbD.css` | Igual que Evicamp; iconos oficiales repuestos (MD5 `c159d2165b6f67ea8c6126f1b49bf4d7`). |

La hoja A4 lleva logo, espacios, leyenda de colores y columna «CANT. A PEDIR» en blanco. Colores: rojo = stock bajo/sin stock, naranja = a punto de agotarse, negro = bien.

## 4. Pruebas ya pasadas (y cómo repetirlas)

```bash
node ai-scripts/pruebas/verificar-imprimir-productos-utilidades.mjs <carpeta-tools> nego
node ai-scripts/pruebas/verificar-imprimir-productos-utilidades.mjs <carpeta-tools> ecosistema
node ai-scripts/pruebas/verificar-cantidad-salida.mjs nego
node ai-scripts/pruebas/verificar-fusionar-salidas.mjs <carpeta-tools>
node ai-scripts/pruebas/verificar-nombre-nota-salidas.mjs <carpeta-tools>
node ai-scripts/pruebas/verificar-persistencia-fusion.mjs <carpeta-tools>
```

- Imprimir: **47/47** en Nego y **47/47** en ecosistema. Evicamp **no se pudo probar con login**: su base `evidiary` solo tiene el usuario `evi` y su clave no está disponible; no se cambió nada. Se verificó allí el JS servido (mismo bundle, con `btn-imprimir-productos-utilidades`, logo, leyenda y colores). Si se entrega la clave, la prueba acepta `EVICAMP_ADMIN_USUARIO` / `EVICAMP_ADMIN_CLAVE`.
- Cantidad: **32 OK / 0 fallos** en Nego (campo de arriba y el de la fila seleccionan todo al clic).
- Fusión: **158/158**; persistencia de grupos: **53/53**; nota de Salidas: **66/66**.
- `npm run build`: OK. El bundle generado es `index-C7Sz-l91.js`, el mismo que sirve Nego.

## 5. Pendientes y reglas que no se cambiaron

- Falta la revisión del dueño con **Ctrl+F5** en los tres sitios.
- «Fusionar» es trabajo **solo de Nego**: no llevarlo a Evicamp/ecosistema ni a GitHub de clientes sin OK.
- **Nunca** hacer push a `main`, panel de clientes ni carpetas de clientes sin aviso del dueño. Para production usar siempre destino explícito: `node ai-scripts/deploy.cjs siumax`, `... evicamp`, `... ecosistema` (nunca sin argumento ni `todos`). Después de desplegar ecosistema, correr `node ai-scripts/restaurar-iconos-ecosistema.cjs`.
- Otras IAs siguen desplegando desde sus propias ramas: antes de publicar, mirar `git log --all`, integrar el commit más nuevo y verificar el DOM en vivo para no subir una versión antigua ni borrar avances ajenos.
- Evicamp no paga: nada de avisos de plan, Mercado Pago ni suscripciones.

## 6. Ramas en GitHub después de esta entrega

- `fase-11-sunat`: rama principal de trabajo con todo lo anterior (la que hay que usar).
- `pase-todos`: mismo contenido, para seguir el hilo de integraciones.
- `salidas-6-cambios`: experimento de Salidas para ecosistema (6 cambios y unidad 500 M); se sube tal cual para no perderlo, **no está fusionado** en `fase-11-sunat`.

Si algo no cuadra al bajar, comparar el commit de `fase-11-sunat` con el último registrado en `docs/BITACORA.md`.
