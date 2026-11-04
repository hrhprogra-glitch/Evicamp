# Capturas y teclado del estilo "SiuMax Sobrio"

Scripts para revisar una sección después de darle el estilo (receta en `docs/MEMORIA-IA.md`, sección 18).
Entran a **siumax** como admin (la clave sale de `.env.vps`, `SIUMAX_ADMIN_CLAVE`), sacan capturas y recorren el
buscador, los filtros, la paginación y las filas con el teclado, imprimiendo dónde quedó el selector en cada tecla.

    node ai-scripts/pruebas/estilo/ver-finanzas.mjs <carpeta-para-las-capturas>

- `ver-inventario.mjs`: el modelo (Inventario > Productos).
- `ver-clientes.mjs`, `ver-conteos.mjs`, `ver-finanzas.mjs` (caja actual + Ver historial).
- Para una sección nueva, copiar `ver-conteos.mjs` y cambiar el botón del menú (`#sidebar-btn-…`) y los `id`.
- Usan puppeteer-core con Microsoft Edge en modo headless. No despliegues mientras corren.
