# Capturas y teclado del estilo "SiuMax Sobrio"

Scripts para revisar una sección después de darle el estilo (receta en `docs/MEMORIA-IA.md`, sección 18).
Entran a **siumax** como admin (la clave sale de `.env.vps`, `SIUMAX_ADMIN_CLAVE`), sacan capturas y recorren el
buscador, los filtros, la paginación y las filas con el teclado, imprimiendo dónde quedó el selector en cada tecla.

    node ai-scripts/pruebas/estilo/ver-finanzas.mjs <carpeta-para-las-capturas>

- `ver-inventario.mjs`: el modelo (Inventario > Productos).
- `ver-clientes.mjs`, `ver-conteos.mjs`, `ver-finanzas.mjs` (caja actual + Ver historial).
- Para una sección nueva, copiar `ver-conteos.mjs` y cambiar el botón del menú (`#sidebar-btn-…`) y los `id`.
- Usan puppeteer-core con Microsoft Edge en modo headless. No despliegues mientras corren.

## Tamaños de pantalla (que nada se corte)
- `revisar-tamanos.mjs <carpeta>`: todas las secciones y pestañas en 7 tamaños (de 1920 a celular 390).
- `revisar-ventanas.mjs <carpeta>`: las ventanas principales en 6 tamaños.
- `revisar-ventanas-caja.mjs <carpeta>`: ventanas de la Caja y de la caja abierta. Abre una caja y un producto de prueba por
  SQL (sin vender) y los borra al final; si hay una caja abierta de verdad, no hace nada.
- Cada línea ❌ dice qué quedó fuera de la pantalla y guarda la captura en la carpeta.

## Selector (teclado)
- `revisar-selector.mjs [filtro]`: las 6 reglas del dueño en 37 pantallas (flechas a todo, calendarios con Enter, Tab, clic en el fondo,
  salir y volver). Abre caja y producto de prueba por SQL (sin vender) y los borra; si se crea una venta, se detiene.
  Tarda ~15 min; con un filtro (ej. `inventario`) solo revisa esas pantallas.

## Ventanas
- `ver-ventanas.mjs <carpeta> [filtro]`: capturas de 19 ventanas (abre caja y producto de prueba por SQL y los borra; frena si se crea una venta).
- `../../estilo-ventanas.cjs` (sin --aplicar): dice qué ventanas tienen o no las piezas del estilo.
