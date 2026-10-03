# Graph Report - evicamp  (2026-09-30)

## Corpus Check
- 104 files · ~635,463 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 2)

## Summary
- 450 nodes · 1113 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db41a496`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- supabase.ts
- Utilidades/index.tsx
- graphify Skill (SKILL.md)
- devDependencies
- package.json
- react
- compilerOptions
- useCerrarConEscape
- compilerOptions
- TicketVenta.tsx
- App.tsx
- TablaAnalisisProductos.tsx
- Default/Fallback POS Logo Asset
- inventario.jpg (Inventory Carousel Photo)
- proyectos.jpg (Business Analytics Meeting Photo)
- ModalProducto.tsx
- finanzas.jpg (Finance Carousel Image)
- tsconfig.json
- Resumen/types.ts
- Vite Logo (favicon)

## God Nodes (most connected - your core abstractions)
1. `react` - 67 edges
2. `lucide-react` - 56 edges
3. `useCerrarConEscape()` - 35 edges
4. `supabase` - 31 edges
5. `usePermiso()` - 26 edges
6. `Product` - 23 edges
7. `graphify Skill (SKILL.md)` - 22 edges
8. `clicConTeclado()` - 21 edges
9. `compilerOptions` - 20 edges
10. `traerTodo()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md (Evicamp project rules)` --conceptually_related_to--> `graphify Skill (SKILL.md)`  [INFERRED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `Props` --references--> `CartItem`  [EXTRACTED]
  src/sections/Punto-de-venta/components/TicketVenta.tsx → src/sections/Punto-de-venta/types.ts
- `index.html (Evicamp app entry)` --references--> `Evicamp (project name)`  [EXTRACTED]
  index.html → README.md
- `CLAUDE.md (Evicamp project rules)` --references--> `graphify (knowledge graph CLI/skill)`  [EXTRACTED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `handleNavigate()` --calls--> `puedeVerModulo()`  [EXTRACTED]
  src/App.tsx → src/utils/permisos.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **GitHub clone -> extract -> merge-graphs flow** — claude_skills_graphify_references_github_and_merge, concept_graphify_clone, concept_graphify_extract_cli, concept_merge_graphs_cli [EXTRACTED 1.00]
- **graphify Skill Package (core + reference docs)** — claude_skills_graphify_skill, claude_skills_graphify_references_add_watch, claude_skills_graphify_references_exports, claude_skills_graphify_references_extraction_spec, claude_skills_graphify_references_github_and_merge, claude_skills_graphify_references_hooks, claude_skills_graphify_references_query, claude_skills_graphify_references_transcribe, claude_skills_graphify_references_update [EXTRACTED 1.00]
- **Incremental update manifest/cache integrity mechanisms** — claude_skills_graphify_skill, claude_skills_graphify_references_update, concept_manifest_stamping, concept_extraction_cache, concept_shrink_guard_479 [INFERRED 0.85]

## Communities (20 total, 3 thin omitted)

### Community 0 - "supabase.ts"
Cohesion: 0.06
Nodes (50): supabase, EtiquetaStock(), Props, FiltrosInventario(), Props, HeaderInventario(), Props, ModalLote() (+42 more)

### Community 1 - "Utilidades/index.tsx"
Cohesion: 0.13
Nodes (24): Props, TablaTickets(), Reportes(), TicketVenta, DashboardResumen(), Props, TarjetaMetrica(), Resumen() (+16 more)

### Community 2 - "graphify Skill (SKILL.md)"
Cohesion: 0.09
Nodes (34): CLAUDE.md (Evicamp project rules), .claude/CLAUDE.md (graphify trigger), graphify reference: add-watch.md, graphify reference: exports.md, graphify reference: extraction-spec.md, graphify reference: github-and-merge.md, graphify reference: hooks.md, graphify reference: query.md (+26 more)

### Community 3 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+9 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (36): dependencies, lucide-react, react, react-dom, react-to-print, recharts, @supabase/supabase-js, @tailwindcss/vite (+28 more)

### Community 5 - "react"
Cohesion: 0.09
Nodes (29): lucide-react, react, react-to-print, FiltroFechas(), Props, ModalApertura(), Props, BloqueArqueoProps (+21 more)

### Community 6 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 7 - "useCerrarConEscape"
Cohesion: 0.19
Nodes (19): ModalAbono(), Props, ModalAnularPago(), Props, ModalClientes(), Props, ModalDetalleFiado(), Props (+11 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 9 - "TicketVenta.tsx"
Cohesion: 0.39
Nodes (7): InputPeso(), InputPrecio(), InputUnidades(), Props, redondearPeso(), TicketVenta(), useSeleccionarTodo()

### Community 10 - "App.tsx"
Cohesion: 0.07
Nodes (51): Evicamp (project name), index.html (Evicamp app entry), README.md (Evicamp), react-dom, App(), handleNavigate(), src_assets_finanzas, src_assets_inventario (+43 more)

### Community 11 - "TablaAnalisisProductos.tsx"
Cohesion: 0.24
Nodes (11): formatearFecha(), ModalDetalleProducto(), Props, Props, TablaAnalisisProductos(), AnalisisProducto, MetricaCategoria, MetricaDia (+3 more)

### Community 13 - "Default/Fallback POS Logo Asset"
Cohesion: 0.33
Nodes (6): Default/Fallback POS Logo Asset, Download Icon Overlay (possible viewer artifact, not confirmed part of asset design), EviCamp Brand Identity, EviCamp Logo Image (logo.png), Sidebar / Topbar / Login Screen Branding Display, Supabase Custom Logo Override

### Community 14 - "inventario.jpg (Inventory Carousel Photo)"
Cohesion: 0.83
Nodes (4): inventario.jpg (Inventory Carousel Photo), Evicamp Login Screen Carousel, Inventario (Inventory) Module, Warehouse Worker with Tablet Scene

### Community 15 - "proyectos.jpg (Business Analytics Meeting Photo)"
Cohesion: 0.83
Nodes (4): Business Analytics / Team Reporting Theme, proyectos.jpg (Business Analytics Meeting Photo), Evicamp Login Screen Carousel, "Proyectos" (Projects) Slide

### Community 16 - "ModalProducto.tsx"
Cohesion: 0.22
Nodes (16): ModalProducto(), ProductNature, Props, buscarImagenes(), coincide(), distancia(), fonetica(), FotoEncontrada (+8 more)

### Community 17 - "finanzas.jpg (Finance Carousel Image)"
Cohesion: 1.00
Nodes (3): finanzas.jpg (Finance Carousel Image), Finanzas Login Carousel Slide, Finance Module Branding/Marketing Imagery

## Ambiguous Edges - Review These
- `Download Icon Overlay (possible viewer artifact, not confirmed part of asset design)` → `EviCamp Logo Image (logo.png)`  [AMBIGUOUS]
  src/assets/logo.png · relation: references

## Knowledge Gaps
- **130 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 147 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Download Icon Overlay (possible viewer artifact, not confirmed part of asset design)` and `EviCamp Logo Image (logo.png)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `react` connect `react` to `supabase.ts`, `Utilidades/index.tsx`, `package.json`, `useCerrarConEscape`, `TicketVenta.tsx`, `App.tsx`, `TablaAnalisisProductos.tsx`, `ModalProducto.tsx`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `react` to `supabase.ts`, `Utilidades/index.tsx`, `package.json`, `useCerrarConEscape`, `TicketVenta.tsx`, `App.tsx`, `TablaAnalisisProductos.tsx`, `ModalProducto.tsx`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabase.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05860805860805861 - nodes in this community are weakly interconnected._
- **Should `Utilidades/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13445378151260504 - nodes in this community are weakly interconnected._