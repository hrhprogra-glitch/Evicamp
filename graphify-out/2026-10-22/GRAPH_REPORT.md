# Graph Report - comercio  (2026-10-22)

## Corpus Check
- 266 files · ~795,374 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 2)

## Summary
- 1467 nodes · 3040 edges · 174 communities (78 shown, 96 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `22e8fce1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Utilidades/index.tsx
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
- ModalUsuario.tsx
- ModalHistorialLotes.tsx
- fix-abonos-badge.cjs
- sugerencias-servidor.cjs
- fix-aesthetics.cjs
- fix-aesthetics2.cjs
- fix-block.cjs
- fix-blue.cjs
- dependencies
- nsis
- sw.js
- react
- fix-end.cjs
- fix-estado-cuenta-ui.cjs
- fix-estado-cuenta-ui-2.cjs
- main.tsx
- fix-color.cjs
- fix.cjs
- scripts
- fix-general.cjs
- fix-giant-text.cjs
- fix-global-anim.cjs
- fix-header.cjs
- ThemeSwitcher.tsx
- App.tsx
- sinInternet.ts
- PanelCompras.tsx
- supabase
- fix-inventario-index.cjs
- fix-abonos-actuales.cjs
- fix-layout-effect.cjs
- fix-layout-finanzas.cjs
- impresion.ts
- fix-historial-tabs.cjs
- cliente.cjs
- fix-map.cjs
- activar-seguridad.sh
- fix-phantom.cjs
- react
- sesion.ts
- deploy.cjs
- fix-compress.cjs
- fix-tot.cjs
- devDependencies
- Punto-de-venta/index.tsx
- fix-fetch.cjs
- fix-pos-cliente.cjs
- ref_path
- fix-abonos-cards.cjs
- fix-partial.cjs
- fix-right-panel2.cjs
- SideBar.tsx
- scratch_auto.cjs
- fix3.cjs
- instalar-fail2ban.sh
- fix-tabla.cjs
- fix-final.cjs
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
- fix-fiados.cjs
- fix-ts.cjs
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
- fix-old-payments.cjs
- electron
- fix-index-modal.cjs
- fix-modal.cjs
- setup-siuhub.sh
- .claude/CLAUDE.md (graphify trigger)
- fix-pill-unconditional.cjs
- fix-ref-error.cjs
- fix-historial-sort.cjs
- fix-scroll.cjs
- remove-history.cjs
- fix-pill-notofixed.cjs
- fix-historial-abonos-tab.cjs
- nuevo-cliente.sh
- backup.sh
- estado-cliente.sh
- instalar.sh
- listar-clientes.sh
- remove-metrics.cjs
- fix-ts-2.cjs
- update-modal.cjs
- instalar-panel.sh
- borrar-cliente.sh
- fix-partial2.cjs
- probar-restauracion.cjs
- fix-modal2.cjs
- migrar-dominio.sh
- fix-pill-debug3.cjs
- fix-save-cliente.cjs
- fixtable.cjs
- update.cjs
- imagenes-servidor.cjs
- ajustar-conexiones.sh
- vps.cjs
- fix-filter.cjs
- fix-pill-debug.cjs
- fix-syntax-error.cjs

## God Nodes (most connected - your core abstractions)
1. `react` - 79 edges
2. `lucide-react` - 65 edges
3. `supabase` - 39 edges
4. `useCerrarConEscape()` - 35 edges
5. `coincideBusqueda()` - 34 edges
6. `Product` - 28 edges
7. `confirmar()` - 27 edges
8. `usePermiso()` - 27 edges
9. `App()` - 26 edges
10. `PanelCompras()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `2. Requisitos Previos` --references--> `clicConTeclado()`  [INFERRED]
  .agents/skills/selector/SKILL.md → src/utils/clicConTeclado.ts
- `Props` --references--> `Fiado`  [EXTRACTED]
  src/sections/Fiados/components/TablaFiados.tsx → src/sections/Fiados/types.ts
- `App()` --calls--> `AvisoSuscripcion()`  [EXTRACTED]
  src/App.tsx → src/layout/AvisoSuscripcion.tsx
- `App()` --calls--> `BarraConexion()`  [EXTRACTED]
  src/App.tsx → src/layout/BarraConexion.tsx
- `App()` --calls--> `SideBar()`  [EXTRACTED]
  src/App.tsx → src/layout/SideBar.tsx

## Import Cycles
- None detected.

## Communities (174 total, 96 thin omitted)

### Community 0 - "Utilidades/index.tsx"
Cohesion: 0.15
Nodes (20): FiltrosUtilidades(), Props, Props, TarjetasResumen(), Props, TopProduct, VentanaTopsFlotante(), Utilidades() (+12 more)

### Community 1 - "escritorio/package.json"
Cohesion: 0.12
Nodes (15): allowScripts, electron@33.2.1, author, dependencies, electron-updater, description, main, name (+7 more)

### Community 2 - "main.js"
Cohesion: 0.21
Nodes (15): { app, BrowserWindow, Menu, ipcMain, shell, dialog }, archivoConfig(), { autoUpdater }, buscarActualizacionManual(), cargarSistema(), construirMenu(), crearVentana(), DESTINO_FIJO (+7 more)

### Community 3 - "Finanzas/index.tsx"
Cohesion: 0.12
Nodes (29): ModalDetalleTicket(), Props, FiltroFechas(), Props, ModalApertura(), Props, BloqueArqueo(), BloqueArqueoProps (+21 more)

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
Nodes (14): content, fs, codeClientes, fs, code, fs, code, fs (+6 more)

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
Cohesion: 0.14
Nodes (27): react-dom, ModalAbono(), Props, ModalAnularPago(), Props, ModalClientes(), Props, ModalDetalleFiado() (+19 more)

### Community 52 - "ModalUsuario.tsx"
Cohesion: 0.15
Nodes (20): achicarLogo(), FormularioEmpresa(), COLUMNAS_PERMISOS, ModalUsuario(), ModalUsuarioProps, PERMISOS_DEFAULT, permisosDeRol(), ROLES (+12 more)

### Community 53 - "ModalHistorialLotes.tsx"
Cohesion: 0.09
Nodes (47): BarraFiltros(), CajaLista(), claseBotonBarra(), claseBotonIcono(), claseBotonPrincipal, claseBuscadorBarra, claseCampoBarra, CuerpoVentana() (+39 more)

### Community 55 - "sugerencias-servidor.cjs"
Cohesion: 0.14
Nodes (11): { conexionVps }, crypto, fs, { NodeSSH }, path, { conexionVps }, crypto, fs (+3 more)

### Community 60 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, html2canvas-pro, jspdf, lucide-react, react, react-dom, react-to-print, recharts (+2 more)

### Community 61 - "nsis"
Cohesion: 0.29
Nodes (7): nsis, artifactName, createDesktopShortcut, createStartMenuShortcut, oneClick, perMachine, shortcutName

### Community 63 - "react"
Cohesion: 0.24
Nodes (12): react, Props, TablaFiados(), TablaFiadosAgrupados(), formatearFecha(), ModalDetalleProducto(), Props, Props (+4 more)

### Community 67 - "main.tsx"
Cohesion: 0.27
Nodes (7): Evicamp (project name), index.html (Evicamp app entry), README.md (Evicamp), abreTeclado(), esPantallaTactil(), instalarProteccionTecladoTactil(), TIPOS_CON_TECLADO

### Community 70 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 75 - "ThemeSwitcher.tsx"
Cohesion: 0.39
Nodes (7): Tema, TEMAS, ThemeSwitcher(), aplicarTamanoInterfaz(), guardarTamanoInterfaz(), leerTamanoInterfaz(), TamanoInterfaz

### Community 76 - "App.tsx"
Cohesion: 0.25
Nodes (12): App(), NOMBRES_SESIONES, AlertaYape(), NotificacionYape, Login(), SesionContext, SesionProvider(), enfocablesDe() (+4 more)

### Community 77 - "sinInternet.ts"
Cohesion: 0.05
Nodes (93): customFetch(), mostrarSuspendido(), necesitaInternet(), renovarSesion(), sesionVencida(), vigilarSuspension(), BarraConexion(), useConexion() (+85 more)

### Community 78 - "PanelCompras.tsx"
Cohesion: 0.10
Nodes (44): usarSesionAutorizada(), ACCIONES, Compra, DetalleCompra(), EditorCompra(), enfocar(), esc(), esPeso() (+36 more)

### Community 79 - "supabase"
Cohesion: 0.12
Nodes (32): supabase, EtiquetaStock(), Props, FiltrosInventario(), Props, ModalLote(), Props, Props (+24 more)

### Community 84 - "impresion.ts"
Cohesion: 0.39
Nodes (7): react-to-print, armarDocumento(), esAppEscritorio(), imprimirEnTicketera(), puente(), PuenteEscritorio, useImprimir()

### Community 86 - "cliente.cjs"
Cohesion: 0.18
Nodes (7): [accion, ...args], { conexionVps }, DIR_LOCAL, { execSync }, fs, { NodeSSH }, path

### Community 90 - "react"
Cohesion: 0.14
Nodes (14): lucide-react, Props, ModalMerma(), FiltrosMermas(), Props, HeaderMermas(), Props, Props (+6 more)

### Community 91 - "sesion.ts"
Cohesion: 0.20
Nodes (11): PermisosUsuario, carouselSlides, LoginProps, EmpleadoSesion, empleadoSinInternet(), guardarToken(), iniciarSesion(), recordarEmpleado() (+3 more)

### Community 92 - "deploy.cjs"
Cohesion: 0.22
Nodes (6): { conexionVps }, { execSync }, { NodeSSH }, path, pedido, { SITIOS, normalizar }

### Community 95 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, electron, electron-builder

### Community 96 - "Punto-de-venta/index.tsx"
Cohesion: 0.14
Nodes (23): MiniReporteDiario(), Props, ModalBalanza(), FiadoData, ModalCobro(), Props, ModalPrecioConsumo(), TerminalBusqueda() (+15 more)

### Community 99 - "ref_path"
Cohesion: 0.15
Nodes (8): filesToUpdate, fs, path, fs, path, walkDir(), fs, path

### Community 103 - "SideBar.tsx"
Cohesion: 0.15
Nodes (22): handleNavigate(), abrirPago(), AvisoSuscripcion(), fechaPe(), Suscripcion, useSuscripcion(), ATAJOS_SESIONES, SideBar() (+14 more)

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
Cohesion: 0.06
Nodes (35): cash_movements_ref_local, compras_detalle_compra, compras_historial_compra, debt_payments_ref_local, idx_movimientos_producto_tipo, inventory_movements_ref_local, public.compras, public.compras_detalle (+27 more)

### Community 135 - "build-escritorio.cjs"
Cohesion: 0.10
Nodes (20): archivoPaquete, carpeta, { destino: buscarDestino }, { execSync }, fs, instalador, mb, nuevaVersion (+12 more)

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 691 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **96 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `test-vps-insert-v2.cjs` to `check-fiados.cjs`, `sinInternet.ts`, `package.json`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **What connects `electron-builder`, `recharts`, `@tailwindcss/postcss` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `escritorio/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `node-ssh` connect `descargar-backups.cjs` to `probar-restauracion.cjs`, `build-escritorio.cjs`, `package.json`, `imagenes-servidor.cjs`, `vps.cjs`, `cliente.cjs`, `sugerencias-servidor.cjs`, `deploy.cjs`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Should `Finanzas/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12195121951219512 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `scratch_inventario.tsx`, `Utilidades/index.tsx`, `Finanzas/index.tsx`, `package.json`, `ModalProducto.tsx`, `Fiados/index.tsx`, `ModalUsuario.tsx`, `ModalHistorialLotes.tsx`, `main.tsx`, `ThemeSwitcher.tsx`, `App.tsx`, `sinInternet.ts`, `PanelCompras.tsx`, `supabase`, `impresion.ts`, `react`, `sesion.ts`, `Punto-de-venta/index.tsx`, `SideBar.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `descargar-backups.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._