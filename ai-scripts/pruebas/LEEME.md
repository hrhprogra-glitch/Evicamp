# Pruebas con teclado (siumax)

Pruebas automáticas que usan solo el teclado sobre https://siumax.duckdns.org (nunca sobre Evicamp).

- **Requisitos:** Node, Microsoft Edge y `puppeteer-core` instalado en una carpeta "tools" (`npm i puppeteer-core` dentro de ella).
- **Uso típico:** `node ai-scripts/pruebas/prueba-salida.mjs <carpeta tools> <carpeta del proyecto>`
  - Algunas reciben la ruta de `.env.vps` en vez de la carpeta del proyecto. Mira la primera línea de cada archivo.
  - `prueba-lote.mjs` necesita `PROVEEDORES_ACTIVOS=<n>` (cuántos proveedores activos hay en siuhub).
- **La clave del admin de siumax** se lee de `SIUMAX_ADMIN_CLAVE` en `.env.vps`. Las pruebas no guardan claves.
- **Los `.cjs`** son ayudas: `leer.cjs` (solo lectura en una base), `reset-gaseosa.cjs` (deja la DEMO GASEOSA como en `demo-compras.sql`) y scripts de pases anteriores.
- **Cuidado:** `aplicar-fase*-evicamp.cjs` toca la base REAL de Evicamp. Úsalos solo cuando el dueño pida subir.
