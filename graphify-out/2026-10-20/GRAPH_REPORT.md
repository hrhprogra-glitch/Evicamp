# Graph Report - evicamp  (2026-10-20)

## Corpus Check
- 262 files · ~780,984 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 2)

## Summary
- 1376 nodes · 2773 edges · 171 communities (75 shown, 96 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb753649`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fix-fetch.cjs
- escritorio/package.json
- main.js
- Finanzas/index.tsx
- descargar-backups.cjs
- CLAUDE.md (Evicamp project rules)
- build
- package.json
- compilerOptions
- compilerOptions
- devDependencies
- check-fiados.cjs
- test-vps-insert-v2.cjs
- ModalProducto.tsx
- fix-pill-debug2.cjs
- Patrón "Selector" de Tablas (Grid Navigation)
- Navegación Espacial de Filtros y Botones
- fix-desc.cjs
- fix-index.cjs
- Memoria de Errores y Aciertos (Lecciones Aprendidas)
- Modal Focus Trap (Jaula de Foco)
- fix-estado-bugs.cjs
- fix-finanzas-tabs.cjs
- fix-search.cjs
- fix-tabs.cjs
- fix-themes.cjs
- force-bw.cjs
- force-gray.cjs
- force-light-gray.cjs
- ref_fs
- apply-matrix.cjs
- fix-contrast.cjs
- fix-dark-mode.cjs
- fix-filters.cjs
- fix-flash.cjs
- fix-font-size.cjs
- fix-inventory.cjs
- fix-jump-historial.cjs
- fix-locations.cjs
- fix-movs.cjs
- fix-queries.cjs
- fix-styles.cjs
- fix-transicion.cjs
- force-matrix.cjs
- replace-map.cjs
- revert.cjs
- replace-merma.cjs
- inventario.jpg (Inventory Carousel Photo)
- proyectos.jpg (Business Analytics Meeting Photo)
- Fiados/index.tsx
- Utilidades/index.tsx
- add-filters.cjs
- fix-abonos-badge.cjs
- sugerencias-servidor.cjs
- fix-aesthetics.cjs
- fix-aesthetics2.cjs
- fix-block.cjs
- fix-blue.cjs
- dependencies
- nsis
- sw.js
- main.tsx
- fix-end.cjs
- fix-estado-cuenta-ui.cjs
- fix-estado-cuenta-ui-2.cjs
- fix-fiados.cjs
- fix-color.cjs
- fix.cjs
- scripts
- fix-general.cjs
- fix-giant-text.cjs
- fix-global-anim.cjs
- fix-header.cjs
- fix-final.cjs
- SideBar.tsx
- sinInternet.ts
- Inventario/index.tsx
- ThemeSwitcher.tsx
- fix-inventario-index.cjs
- fix-compress.cjs
- fix-layout-effect.cjs
- fix-layout-finanzas.cjs
- sesion.ts
- fix-historial-tabs.cjs
- cliente.cjs
- fix-map.cjs
- activar-seguridad.sh
- fix-phantom.cjs
- react
- dialogos.tsx
- deploy.cjs
- ModalUsuario.tsx
- fix-tot.cjs
- devDependencies
- Punto-de-venta/index.tsx
- fix-header2.cjs
- fix-pos-cliente.cjs
- ref_path
- fix-abonos-cards.cjs
- fix-pill-final.cjs
- fix-right-panel2.cjs
- fix-save-cliente.cjs
- scratch_auto.cjs
- fix3.cjs
- instalar-fail2ban.sh
- fix-tabla.cjs
- fix-modal.cjs
- siuhub-lib.sh
- cambiar-link.sh
- manifest.json
- purge-inventario-colors.cjs
- limitar-login.sh
- fix-delete.cjs
- restore-lotes.cjs
- revert-badge.cjs
- fix-caja-tickets.cjs
- vite.config.ts
- fix-right-panel.cjs
- update-modal-clientes.cjs
- fix-historial-rectangles.cjs
- finanzas.jpg (Finance Carousel Image)
- tsconfig.json
- fix-pill-unconditional.cjs
- fix-ref-error.cjs
- panel.py
- scratch_inventario.tsx
- Vite Logo (favicon)
- Evicamp Logo
- seguridad-sesion.sql
- replace-modal.cjs
- fix-layout.cjs
- fix-revert-tab.cjs
- build-escritorio.cjs
- restore-aesthetics.cjs
- fix-partial.cjs
- electron
- fix-index-modal.cjs
- remove-metrics.cjs
- setup-siuhub.sh
- .claude/CLAUDE.md (graphify trigger)
- fix-ts.cjs
- fix-historial-sort.cjs
- fix-scroll.cjs
- remove-history.cjs
- update-modal-actions.cjs
- fix-historial-abonos-tab.cjs
- nuevo-cliente.sh
- backup.sh
- estado-cliente.sh
- instalar.sh
- listar-clientes.sh
- fix-ts-2.cjs
- PanelCompras.tsx
- instalar-panel.sh
- borrar-cliente.sh
- fix-partial2.cjs
- probar-restauracion.cjs
- fix-modal2.cjs
- fixtable.cjs
- migrar-dominio.sh
- fix-pill-debug3.cjs
- update.cjs
- imagenes-servidor.cjs
- ajustar-conexiones.sh
- vps.cjs
- fix-filter.cjs
- fix-pill-debug.cjs
- fix-syntax-error.cjs

## God Nodes (most connected - your core abstractions)
1. `react` - 76 edges
2. `lucide-react` - 63 edges
3. `supabase` - 37 edges
4. `coincideBusqueda()` - 32 edges
5. `useCerrarConEscape()` - 31 edges
6. `confirmar()` - 27 edges
7. `usePermiso()` - 27 edges
8. `Product` - 26 edges
9. `App()` - 23 edges
10. `PanelCompras()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `2. Requisitos Previos` --references--> `clicConTeclado()`  [INFERRED]
  .agents/skills/selector/SKILL.md → src/utils/clicConTeclado.ts
- `Props` --references--> `Product`  [EXTRACTED]
  src/sections/Inventario/components/PanelCompras.tsx → src/sections/Inventario/types.ts
- `Props` --references--> `Product`  [EXTRACTED]
  src/sections/Punto-de-venta/components/ModalPrecioConsumo.tsx → src/sections/Inventario/types.ts
- `App()` --calls--> `AvisoSuscripcion()`  [EXTRACTED]
  src/App.tsx → src/layout/AvisoSuscripcion.tsx
- `App()` --calls--> `BarraConexion()`  [EXTRACTED]
  src/App.tsx → src/layout/BarraConexion.tsx

## Import Cycles
- None detected.

## Communities (171 total, 96 thin omitted)

### Community 1 - "escritorio/package.json"
Cohesion: 0.12
Nodes (15): allowScripts, electron@33.2.1, author, dependencies, electron-updater, description, main, name (+7 more)

### Community 2 - "main.js"
Cohesion: 0.21
Nodes (15): { app, BrowserWindow, Menu, ipcMain, shell, dialog }, archivoConfig(), { autoUpdater }, buscarActualizacionManual(), cargarSistema(), construirMenu(), crearVentana(), DESTINO_FIJO (+7 more)

### Community 3 - "Finanzas/index.tsx"
Cohesion: 0.12
Nodes (32): ModalDetalleTicket(), Props, usarSesionAutorizada(), FiltroFechas(), Props, ModalApertura(), Props, BloqueArqueo() (+24 more)

### Community 4 - "descargar-backups.cjs"
Cohesion: 0.12
Nodes (11): { conexionVps }, { NodeSSH }, ssh, { conexionVps }, { NodeSSH }, ssh, { conexionVps }, fs (+3 more)

### Community 6 - "build"
Cohesion: 0.20
Nodes (10): build, appId, directories, files, productName, publish, win, output (+2 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (21): name, private, type, version, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks (+13 more)

### Community 8 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 10 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, node-ssh (+10 more)

### Community 11 - "check-fiados.cjs"
Cohesion: 0.33
Nodes (5): { createClient }, env, envFile, fs, supabase

### Community 12 - "test-vps-insert-v2.cjs"
Cohesion: 0.20
Nodes (5): { createClient }, supabase, { createClient }, supabase, @supabase/supabase-js

### Community 13 - "ModalProducto.tsx"
Cohesion: 0.24
Nodes (16): ModalProducto(), ProductNature, Props, TechnicalAlert(), achicarImagen(), buscarImagenes(), deCommons(), dePixabay() (+8 more)

### Community 15 - "Patrón "Selector" de Tablas (Grid Navigation)"
Cohesion: 0.25
Nodes (7): 1. El Objetivo, 2. Requisitos Previos, 3. Implementación en Código (handleGlobalKeyDown), 4. Puntos Importantes, Auto-Focus Magnet (El punto de partida), Lógica del Selector de Filas:, Patrón "Selector" de Tablas (Grid Navigation)

### Community 16 - "Navegación Espacial de Filtros y Botones"
Cohesion: 0.29
Nodes (6): 1. El Problema a Evitar, 2. La Solución (Patrón Evicamp), 3. Implementación en Código, 4. Patrón para Botones Superior (ej. "Nuevo Cliente"), 5. Patrón para Calendarios / Inputs de Fecha (`<input type="date">`), Navegación Espacial de Filtros y Botones

### Community 17 - "fix-desc.cjs"
Cohesion: 0.33
Nodes (4): contentModal, fs, insertIndexModal, linesModal

### Community 18 - "fix-index.cjs"
Cohesion: 0.33
Nodes (5): chunk1Target, chunk2Target, code, fs, lines

### Community 19 - "Memoria de Errores y Aciertos (Lecciones Aprendidas)"
Cohesion: 0.40
Nodes (4): Memoria de Errores y Aciertos (Lecciones Aprendidas), Navegación con Flechas en Inputs Nativos, â, â Errores a NO REPETIR (Lo que hicimos mal)

### Community 20 - "Modal Focus Trap (Jaula de Foco)"
Cohesion: 0.40
Nodes (4): Contexto, Importante: Fase de Captura, Modal Focus Trap (Jaula de Foco), Patrón de Implementación

### Community 22 - "fix-estado-bugs.cjs"
Cohesion: 0.40
Nodes (4): fs, indexCode, modalCli, modalEC

### Community 23 - "fix-finanzas-tabs.cjs"
Cohesion: 0.40
Nodes (4): content, fs, iEnd, iStart

### Community 25 - "fix-tabs.cjs"
Cohesion: 0.40
Nodes (4): content, endOfBlock, fs, startIndex

### Community 26 - "fix-themes.cjs"
Cohesion: 0.40
Nodes (4): fs, invCode, modalClientesCode, themeCode

### Community 27 - "force-bw.cjs"
Cohesion: 0.40
Nodes (4): cssCode, fs, startIndex, tsCode

### Community 28 - "force-gray.cjs"
Cohesion: 0.40
Nodes (4): cssCode, fs, startIndex, tsCode

### Community 29 - "force-light-gray.cjs"
Cohesion: 0.40
Nodes (4): cssCode, fs, startIndex, tsCode

### Community 30 - "ref_fs"
Cohesion: 0.09
Nodes (14): code, fs, code, fs, code, fs, code, fs (+6 more)

### Community 31 - "apply-matrix.cjs"
Cohesion: 0.50
Nodes (3): cssCode, fs, tsCode

### Community 32 - "fix-contrast.cjs"
Cohesion: 0.50
Nodes (3): cssCode, fs, startIndex

### Community 33 - "fix-dark-mode.cjs"
Cohesion: 0.50
Nodes (3): cssCode, fs, tsCode

### Community 35 - "fix-flash.cjs"
Cohesion: 0.50
Nodes (3): fs, indexCode, modalCode

### Community 36 - "fix-font-size.cjs"
Cohesion: 0.50
Nodes (3): fs, modalCli, modalEC

### Community 37 - "fix-inventory.cjs"
Cohesion: 0.50
Nodes (3): fs, modalCode, sidebarCode

### Community 38 - "fix-jump-historial.cjs"
Cohesion: 0.50
Nodes (3): fs, modalCli, modalEC

### Community 39 - "fix-locations.cjs"
Cohesion: 0.50
Nodes (3): codeClientes, codeEstado, fs

### Community 40 - "fix-movs.cjs"
Cohesion: 0.50
Nodes (3): fs, idx, tm

### Community 42 - "fix-styles.cjs"
Cohesion: 0.50
Nodes (3): fs, modalCli, modalEC

### Community 43 - "fix-transicion.cjs"
Cohesion: 0.50
Nodes (3): fs, indexCode, modalCode

### Community 44 - "force-matrix.cjs"
Cohesion: 0.50
Nodes (3): cssCode, fs, startIndex

### Community 45 - "replace-map.cjs"
Cohesion: 0.50
Nodes (3): c, fs, lines

### Community 46 - "revert.cjs"
Cohesion: 0.50
Nodes (3): content1, content2, fs

### Community 48 - "inventario.jpg (Inventory Carousel Photo)"
Cohesion: 0.83
Nodes (4): inventario.jpg (Inventory Carousel Photo), Evicamp Login Screen Carousel, Inventario (Inventory) Module, Warehouse Worker with Tablet Scene

### Community 49 - "proyectos.jpg (Business Analytics Meeting Photo)"
Cohesion: 0.83
Nodes (4): Business Analytics / Team Reporting Theme, proyectos.jpg (Business Analytics Meeting Photo), Evicamp Login Screen Carousel, "Proyectos" (Projects) Slide

### Community 51 - "Fiados/index.tsx"
Cohesion: 0.10
Nodes (35): supabase, NotificacionYape, ModalAbono(), Props, ModalAnularPago(), Props, ModalClientes(), Props (+27 more)

### Community 52 - "Utilidades/index.tsx"
Cohesion: 0.12
Nodes (27): FiltrosUtilidades(), Props, formatearFecha(), ModalDetalleProducto(), Props, Props, TablaAnalisisProductos(), Props (+19 more)

### Community 55 - "sugerencias-servidor.cjs"
Cohesion: 0.14
Nodes (11): { conexionVps }, crypto, fs, { NodeSSH }, path, { conexionVps }, crypto, fs (+3 more)

### Community 60 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, html2canvas-pro, jspdf, lucide-react, react, react-dom, react-to-print, recharts (+2 more)

### Community 61 - "nsis"
Cohesion: 0.29
Nodes (7): nsis, artifactName, createDesktopShortcut, createStartMenuShortcut, oneClick, perMachine, shortcutName

### Community 63 - "main.tsx"
Cohesion: 0.24
Nodes (8): Evicamp (project name), index.html (Evicamp app entry), README.md (Evicamp), react-dom, abreTeclado(), esPantallaTactil(), instalarProteccionTecladoTactil(), TIPOS_CON_TECLADO

### Community 70 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 76 - "SideBar.tsx"
Cohesion: 0.19
Nodes (18): abrirPago(), AvisoSuscripcion(), fechaPe(), Suscripcion, useSuscripcion(), SideBar(), SideBarProps, avisar() (+10 more)

### Community 77 - "sinInternet.ts"
Cohesion: 0.07
Nodes (63): customFetch(), mostrarSuspendido(), necesitaInternet(), renovarSesion(), sesionVencida(), vigilarSuspension(), BarraConexion(), useConexion() (+55 more)

### Community 78 - "Inventario/index.tsx"
Cohesion: 0.13
Nodes (29): FiltrosInventario(), Props, FILA_ARRIBA, FiltroEstado, FILTROS, ModalGestionProveedores(), Props, ModalLote() (+21 more)

### Community 79 - "ThemeSwitcher.tsx"
Cohesion: 0.21
Nodes (15): App(), handleNavigate(), NOMBRES_SESIONES, AlertaYape(), ATAJOS_SESIONES, Tema, TEMAS, ThemeSwitcher() (+7 more)

### Community 84 - "sesion.ts"
Cohesion: 0.16
Nodes (14): DatosEmpresa, PermisosUsuario, carouselSlides, LoginProps, PERMISOS_POR_MODULO, SesionContext, EmpleadoSesion, empleadoSinInternet() (+6 more)

### Community 86 - "cliente.cjs"
Cohesion: 0.18
Nodes (7): [accion, ...args], { conexionVps }, DIR_LOCAL, { execSync }, fs, { NodeSSH }, path

### Community 90 - "react"
Cohesion: 0.12
Nodes (24): lucide-react, react, EtiquetaStock(), Props, Props, Props, ModalMerma(), Props (+16 more)

### Community 91 - "dialogos.tsx"
Cohesion: 0.18
Nodes (17): Autorizacion, Pedido, pedirAutorizacion(), VentanaAutorizacion(), abrir(), cola, Dialogo, instalarDialogos() (+9 more)

### Community 92 - "deploy.cjs"
Cohesion: 0.22
Nodes (6): { conexionVps }, { execSync }, { NodeSSH }, path, pedido, { SITIOS, normalizar }

### Community 93 - "ModalUsuario.tsx"
Cohesion: 0.17
Nodes (18): achicarLogo(), FormularioEmpresa(), COLUMNAS_PERMISOS, ModalUsuario(), ModalUsuarioProps, PERMISOS_DEFAULT, permisosDeRol(), ROLES (+10 more)

### Community 95 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, electron, electron-builder

### Community 96 - "Punto-de-venta/index.tsx"
Cohesion: 0.15
Nodes (22): MiniReporteDiario(), ModalBalanza(), FiadoData, ModalCobro(), Props, ModalPrecioConsumo(), Props, TerminalBusqueda() (+14 more)

### Community 99 - "ref_path"
Cohesion: 0.15
Nodes (8): filesToUpdate, fs, path, fs, path, walkDir(), fs, path

### Community 104 - "scratch_auto.cjs"
Cohesion: 0.50
Nodes (3): fs, path, walk()

### Community 109 - "siuhub-lib.sh"
Cohesion: 0.16
Nodes (5): agregar_redireccion(), escribir_nginx(), escribir_nginx_redireccion(), host_cliente(), siuhub-lib.sh script

### Community 111 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 112 - "purge-inventario-colors.cjs"
Cohesion: 0.50
Nodes (4): fs, path, processDir(), replaceInFile()

### Community 119 - "vite.config.ts"
Cohesion: 0.25
Nodes (3): @tailwindcss/vite, vite, @vitejs/plugin-react-swc

### Community 123 - "finanzas.jpg (Finance Carousel Image)"
Cohesion: 1.00
Nodes (3): finanzas.jpg (Finance Carousel Image), Finanzas Login Carousel Slide, Finance Module Branding/Marketing Imagery

### Community 127 - "panel.py"
Cohesion: 0.06
Nodes (42): api_activa(), archivar_pagos(), base_cliente(), borrar_cliente(), cambiar_estado(), cambiar_estado_sugerencia(), cambiar_link(), cliente_registrado() (+34 more)

### Community 131 - "seguridad-sesion.sql"
Cohesion: 0.09
Nodes (24): cash_movements_ref_local, compras_detalle_compra, compras_historial_compra, debt_payments_ref_local, inventory_movements_ref_local, public.compras, public.compras_detalle, public.compras_historial (+16 more)

### Community 135 - "build-escritorio.cjs"
Cohesion: 0.10
Nodes (20): archivoPaquete, carpeta, { destino: buscarDestino }, { execSync }, fs, instalador, mb, nuevaVersion (+12 more)

### Community 157 - "PanelCompras.tsx"
Cohesion: 0.13
Nodes (35): react-to-print, ACCIONES, Compra, DetalleCompra(), EditorCompra(), enfocar(), esc(), esPeso() (+27 more)

### Community 161 - "probar-restauracion.cjs"
Cohesion: 0.33
Nodes (5): { conexionVps }, fs, LOCAL, { NodeSSH }, path

### Community 171 - "imagenes-servidor.cjs"
Cohesion: 0.25
Nodes (7): clave, { conexionVps }, env, fs, { NodeSSH }, path, sitios

### Community 173 - "vps.cjs"
Cohesion: 0.25
Nodes (6): { conexionVps }, fs, { NodeSSH }, path, archivo, path

## Knowledge Gaps
- **16 isolated node(s):** `electron-builder`, `recharts`, `@tailwindcss/postcss`, `@types/node`, `@types/react` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 669 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **96 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `test-vps-insert-v2.cjs` to `Fiados/index.tsx`, `check-fiados.cjs`, `package.json`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **What connects `electron-builder`, `recharts`, `@tailwindcss/postcss` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `escritorio/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `node-ssh` connect `descargar-backups.cjs` to `probar-restauracion.cjs`, `build-escritorio.cjs`, `package.json`, `imagenes-servidor.cjs`, `vps.cjs`, `cliente.cjs`, `sugerencias-servidor.cjs`, `deploy.cjs`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Should `Finanzas/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1207897793263647 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `scratch_inventario.tsx`, `Punto-de-venta/index.tsx`, `Finanzas/index.tsx`, `package.json`, `SideBar.tsx`, `sinInternet.ts`, `Inventario/index.tsx`, `ThemeSwitcher.tsx`, `ModalProducto.tsx`, `Fiados/index.tsx`, `sesion.ts`, `Utilidades/index.tsx`, `PanelCompras.tsx`, `dialogos.tsx`, `ModalUsuario.tsx`, `main.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `descargar-backups.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._