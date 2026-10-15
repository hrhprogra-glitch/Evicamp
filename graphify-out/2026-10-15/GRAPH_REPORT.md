# Graph Report - evicamp  (2026-10-15)

## Corpus Check
- 238 files · ~714,912 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .css 2, .webmanifest 1)

## Summary
- 955 nodes · 1720 edges · 137 communities (53 shown, 84 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e083188`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- generar-iconos-pwa.cjs
- fix-historial-abonos-tab.cjs
- App.tsx
- Utilidades/index.tsx
- check_db.cjs
- graphify Skill (SKILL.md)
- supabase.ts
- package.json
- compilerOptions
- compilerOptions
- devDependencies
- ref_fs
- check-fiados.cjs
- buscarImagenes.ts
- fix-pill-debug2.cjs
- Patrón "Selector" de Tablas (Grid Navigation)
- Navegación Espacial de Filtros y Botones
- fix-desc.cjs
- fix-index.cjs
- Memoria de Errores y Aciertos (Lecciones Aprendidas)
- Modal Focus Trap (Jaula de Foco)
- check.ts
- fix-estado-bugs.cjs
- fix-finanzas-tabs.cjs
- fix-search.cjs
- fix-tabs.cjs
- fix-themes.cjs
- force-bw.cjs
- force-gray.cjs
- force-light-gray.cjs
- remove-metrics.cjs
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
- check-db.ts
- fix.cjs
- fix3.cjs
- fix-abonos-actuales.cjs
- fix-abonos-badge.cjs
- fix-abonos-cards.cjs
- fix-aesthetics.cjs
- fix-aesthetics2.cjs
- fix-block.cjs
- fix-blue.cjs
- fix-caja-tickets.cjs
- fix-color.cjs
- fix-delete.cjs
- fix-end.cjs
- fix-estado-cuenta-ui.cjs
- fix-estado-cuenta-ui-2.cjs
- react
- fix-fiados.cjs
- fix-filter.cjs
- fix-final.cjs
- fix-general.cjs
- fix-giant-text.cjs
- fix-global-anim.cjs
- fix-header.cjs
- fix-historial-rectangles.cjs
- fix-historial-sort.cjs
- fix-historial-tabs.cjs
- fix-partial2.cjs
- fix-inventario-index.cjs
- fix-layout.cjs
- fix-layout-effect.cjs
- fix-layout-finanzas.cjs
- fix-map.cjs
- fix-modal.cjs
- fix-old-payments.cjs
- fix-partial.cjs
- fix-phantom.cjs
- fix-pill-debug.cjs
- deploy.cjs
- fix-pill-final.cjs
- fix-pill-final-inline.cjs
- fix-pill-ml2.cjs
- fix-pill-notofixed.cjs
- fix-pill-unconditional.cjs
- fix-pos-cliente.cjs
- ref_path
- fix-ts-2.cjs
- fix-right-panel.cjs
- fix-right-panel2.cjs
- fix-save-cliente.cjs
- fix-save-cliente2.cjs
- fix-scroll.cjs
- fix-syntax-error.cjs
- fix-tabla.cjs
- fix-tot.cjs
- run-remote.cjs
- fixtable.cjs
- remove-history.cjs
- purge-inventario-colors.cjs
- dependencies
- restore-aesthetics.cjs
- restore-lotes.cjs
- revert-badge.cjs
- test-vps-insert.ts
- update.cjs
- update-modal.cjs
- update-modal-actions.cjs
- update-modal-clientes.cjs
- scripts
- finanzas.jpg (Finance Carousel Image)
- tsconfig.json
- rules/graphify.md
- workflows/graphify.md
- update.py
- Vite Logo (favicon)
- Evicamp Logo
- vite.config.ts
- fix-modals.cjs
- scratch_auto.cjs
- fix-revert-tab.cjs
- fix-fetch.cjs
- fix-modal2.cjs
- fix-pill-debug3.cjs
- fix-ts.cjs
- setup-siuhub.sh

## God Nodes (most connected - your core abstractions)
1. `react` - 70 edges
2. `lucide-react` - 60 edges
3. `supabase` - 36 edges
4. `useCerrarConEscape()` - 33 edges
5. `coincideBusqueda()` - 28 edges
6. `Product` - 24 edges
7. `graphify Skill (SKILL.md)` - 22 edges
8. `clicConTeclado()` - 21 edges
9. `compilerOptions` - 20 edges
10. `traerTodo()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `2. Requisitos Previos` --references--> `clicConTeclado()`  [INFERRED]
  .agents/skills/selector/SKILL.md → src/utils/clicConTeclado.ts
- `CLAUDE.md (Evicamp project rules)` --conceptually_related_to--> `graphify Skill (SKILL.md)`  [INFERRED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `CLAUDE.md (Evicamp project rules)` --references--> `graphify (knowledge graph CLI/skill)`  [EXTRACTED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `index.html (Evicamp app entry)` --references--> `Evicamp (project name)`  [EXTRACTED]
  index.html → README.md
- `handleNavigate()` --calls--> `puedeVerModulo()`  [EXTRACTED]
  src/App.tsx → src/utils/permisos.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **GitHub clone -> extract -> merge-graphs flow** — claude_skills_graphify_references_github_and_merge, concept_graphify_clone, concept_graphify_extract_cli, concept_merge_graphs_cli [EXTRACTED 1.00]
- **graphify Skill Package (core + reference docs)** — claude_skills_graphify_skill, claude_skills_graphify_references_add_watch, claude_skills_graphify_references_exports, claude_skills_graphify_references_extraction_spec, claude_skills_graphify_references_github_and_merge, claude_skills_graphify_references_hooks, claude_skills_graphify_references_query, claude_skills_graphify_references_transcribe, claude_skills_graphify_references_update [EXTRACTED 1.00]
- **Incremental update manifest/cache integrity mechanisms** — claude_skills_graphify_skill, claude_skills_graphify_references_update, concept_manifest_stamping, concept_extraction_cache, concept_shrink_guard_479 [INFERRED 0.85]

## Communities (137 total, 84 thin omitted)

### Community 0 - "generar-iconos-pwa.cjs"
Cohesion: 0.16
Nodes (13): ACENTO, bloque(), crc32(), destino, fs, generar(), iconos, LETRA_S (+5 more)

### Community 2 - "App.tsx"
Cohesion: 0.05
Nodes (65): Evicamp (project name), index.html (Evicamp app entry), README.md (Evicamp), App(), handleNavigate(), NOMBRES_SESIONES, src_assets_finanzas, src_assets_inventario (+57 more)

### Community 3 - "Utilidades/index.tsx"
Cohesion: 0.11
Nodes (28): Props, Reportes(), TicketVenta, FiltrosUtilidades(), Props, Props, Props, TablaAnalisisProductos() (+20 more)

### Community 4 - "check_db.cjs"
Cohesion: 0.18
Nodes (8): { conexionVps }, { NodeSSH }, ssh, { conexionVps }, { NodeSSH }, ssh, ai_scripts_vps_conexionvps, ref_node_ssh

### Community 5 - "graphify Skill (SKILL.md)"
Cohesion: 0.09
Nodes (34): CLAUDE.md (Evicamp project rules), .claude/CLAUDE.md (graphify trigger), graphify reference: add-watch.md, graphify reference: exports.md, graphify reference: extraction-spec.md, graphify reference: github-and-merge.md, graphify reference: hooks.md, graphify reference: query.md (+26 more)

### Community 6 - "supabase.ts"
Cohesion: 0.06
Nodes (62): react-dom, ModalDetalleTicket(), Props, supabase, ModalAbono(), Props, ModalAnularPago(), Props (+54 more)

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
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+9 more)

### Community 11 - "ref_fs"
Cohesion: 0.11
Nodes (13): content, fs, code, fs, codeClientes, fs, fs, indexCode (+5 more)

### Community 12 - "check-fiados.cjs"
Cohesion: 0.12
Nodes (10): { createClient }, env, envFile, fs, supabase, { createClient }, supabase, { createClient } (+2 more)

### Community 13 - "buscarImagenes.ts"
Cohesion: 0.30
Nodes (13): buscarImagenes(), coincide(), distancia(), fonetica(), FotoEncontrada, imagenPorCodigoBarras(), leerJson(), normalizar() (+5 more)

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
Nodes (4): ✅ Aciertos y Patrones de Oro (Lo que hicimos bien), ❌ Errores a NO REPETIR (Lo que hicimos mal), Memoria de Errores y Aciertos (Lecciones Aprendidas), Navegaci�n con Flechas en Inputs Nativos

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

### Community 67 - "react"
Cohesion: 0.05
Nodes (74): lucide-react, react, ModalFiado(), Props, TablaFiados(), TablaFiadosAgrupados(), EtiquetaStock(), Props (+66 more)

### Community 92 - "deploy.cjs"
Cohesion: 0.22
Nodes (7): { conexionVps }, DESTINOS, { execSync }, { NodeSSH }, path, ssh, ref_child_process

### Community 99 - "ref_path"
Cohesion: 0.22
Nodes (6): filesToUpdate, fs, path, fs, path, ref_path

### Community 109 - "run-remote.cjs"
Cohesion: 0.25
Nodes (6): { conexionVps }, fs, { NodeSSH }, path, archivo, path

### Community 112 - "purge-inventario-colors.cjs"
Cohesion: 0.50
Nodes (4): fs, path, processDir(), replaceInFile()

### Community 113 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, html2canvas-pro, lucide-react, react, react-dom, react-to-print, recharts, @supabase/supabase-js (+1 more)

### Community 122 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 123 - "finanzas.jpg (Finance Carousel Image)"
Cohesion: 1.00
Nodes (3): finanzas.jpg (Finance Carousel Image), Finanzas Login Carousel Slide, Finance Module Branding/Marketing Imagery

### Community 131 - "vite.config.ts"
Cohesion: 0.50
Nodes (3): @tailwindcss/vite, vite, @vitejs/plugin-react-swc

### Community 132 - "fix-modals.cjs"
Cohesion: 0.50
Nodes (3): fs, path, walkDir()

### Community 133 - "scratch_auto.cjs"
Cohesion: 0.50
Nodes (3): fs, path, walk()

## Knowledge Gaps
- **435 isolated node(s):** `fs`, `content`, `fs`, `cssCode`, `tsCode` (+430 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 485 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **84 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `check-fiados.cjs` to `supabase.ts`, `package.json`?**
  _High betweenness centrality (0.369) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `App.tsx`, `Utilidades/index.tsx`, `supabase.ts`, `package.json`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `react` to `App.tsx`, `Utilidades/index.tsx`, `supabase.ts`, `package.json`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `fs`, `content`, `fs` to the rest of the system?**
  _435 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0526006464883926 - nodes in this community are weakly interconnected._
- **Should `Utilidades/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10960960960960961 - nodes in this community are weakly interconnected._
- **Should `graphify Skill (SKILL.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._