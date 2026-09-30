# Graph Report - evicamp  (2026-09-26)

## Corpus Check
- 96 files · ~796,048 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 2)

## Summary
- 403 nodes · 897 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bb66a9ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Punto-de-venta/index.tsx
- Utilidades/index.tsx
- graphify Skill (SKILL.md)
- devDependencies
- package.json
- Finanzas/index.tsx
- compilerOptions
- useEscapeClose
- compilerOptions
- Mermas/index.tsx
- react
- TablaAnalisisProductos.tsx
- lucide-react
- Default/Fallback POS Logo Asset
- inventario.jpg (Inventory Carousel Photo)
- proyectos.jpg (Business Analytics Meeting Photo)
- Inventario/index.tsx
- finanzas.jpg (Finance Carousel Image)
- tsconfig.json
- Resumen/types.ts
- Vite Logo (favicon)

## God Nodes (most connected - your core abstractions)
1. `react` - 63 edges
2. `lucide-react` - 55 edges
3. `useEscapeClose()` - 41 edges
4. `supabase` - 31 edges
5. `Product` - 23 edges
6. `graphify Skill (SKILL.md)` - 22 edges
7. `compilerOptions` - 20 edges
8. `compilerOptions` - 18 edges
9. `Fiado` - 14 edges
10. `formatearCantidad()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md (Evicamp project rules)` --conceptually_related_to--> `graphify Skill (SKILL.md)`  [INFERRED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `Props` --references--> `Product`  [EXTRACTED]
  src/sections/Inventario/components/ModalMerma.tsx → src/sections/Inventario/types.ts
- `CLAUDE.md (Evicamp project rules)` --references--> `graphify (knowledge graph CLI/skill)`  [EXTRACTED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `index.html (Evicamp app entry)` --references--> `Evicamp (project name)`  [EXTRACTED]
  index.html → README.md
- `ModalUsuario()` --calls--> `useEscapeClose()`  [EXTRACTED]
  src/sections/Configuraciones/components/ModalUsuario.tsx → src/utils/useEscapeClose.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **graphify Skill Package (core + reference docs)** — claude_skills_graphify_skill, claude_skills_graphify_references_add_watch, claude_skills_graphify_references_exports, claude_skills_graphify_references_extraction_spec, claude_skills_graphify_references_github_and_merge, claude_skills_graphify_references_hooks, claude_skills_graphify_references_query, claude_skills_graphify_references_transcribe, claude_skills_graphify_references_update [EXTRACTED 1.00]
- **Incremental update manifest/cache integrity mechanisms** — claude_skills_graphify_skill, claude_skills_graphify_references_update, concept_manifest_stamping, concept_extraction_cache, concept_shrink_guard_479 [INFERRED 0.85]
- **GitHub clone -> extract -> merge-graphs flow** — claude_skills_graphify_references_github_and_merge, concept_graphify_clone, concept_graphify_extract_cli, concept_merge_graphs_cli [EXTRACTED 1.00]

## Communities (21 total, 3 thin omitted)

### Community 0 - "Punto-de-venta/index.tsx"
Cohesion: 0.10
Nodes (23): ModalLote(), Props, Props, TablaProductos(), Product, ModalBalanza(), Props, FiadoData (+15 more)

### Community 1 - "Utilidades/index.tsx"
Cohesion: 0.17
Nodes (21): Finanzas(), Reportes(), DashboardResumen(), Props, TarjetaMetrica(), FiltrosUtilidades(), Props, Props (+13 more)

### Community 2 - "graphify Skill (SKILL.md)"
Cohesion: 0.09
Nodes (34): CLAUDE.md (Evicamp project rules), .claude/CLAUDE.md (graphify trigger), graphify reference: add-watch.md, graphify reference: exports.md, graphify reference: extraction-spec.md, graphify reference: github-and-merge.md, graphify reference: hooks.md, graphify reference: query.md (+26 more)

### Community 3 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+9 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (36): dependencies, lucide-react, react, react-dom, react-to-print, recharts, @supabase/supabase-js, @tailwindcss/vite (+28 more)

### Community 5 - "Finanzas/index.tsx"
Cohesion: 0.16
Nodes (15): react-to-print, FiltroFechas(), Props, BloqueArqueoProps, ModalCierre(), Props, ModalDetalleCaja(), Props (+7 more)

### Community 6 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 7 - "useEscapeClose"
Cohesion: 0.16
Nodes (22): ModalAbono(), Props, ModalAnularPago(), Props, ModalClientes(), Props, ModalDetalleFiado(), Props (+14 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 9 - "Mermas/index.tsx"
Cohesion: 0.12
Nodes (18): EtiquetaStock(), Props, ModalMerma(), Props, Lote, Props, TablaLotes(), FiltrosMermas() (+10 more)

### Community 10 - "react"
Cohesion: 0.07
Nodes (36): Evicamp (project name), index.html (Evicamp app entry), README.md (Evicamp), react, react-dom, App(), src_assets_finanzas, src_assets_inventario (+28 more)

### Community 11 - "TablaAnalisisProductos.tsx"
Cohesion: 0.24
Nodes (11): formatearFecha(), ModalDetalleProducto(), Props, Props, TablaAnalisisProductos(), AnalisisProducto, MetricaCategoria, MetricaDia (+3 more)

### Community 12 - "lucide-react"
Cohesion: 0.23
Nodes (9): lucide-react, FiltrosProveedores(), Props, ModalProveedor(), Props, Props, TablaProveedores(), Proveedor (+1 more)

### Community 13 - "Default/Fallback POS Logo Asset"
Cohesion: 0.33
Nodes (6): Default/Fallback POS Logo Asset, Download Icon Overlay (possible viewer artifact, not confirmed part of asset design), EviCamp Brand Identity, EviCamp Logo Image (logo.png), Sidebar / Topbar / Login Screen Branding Display, Supabase Custom Logo Override

### Community 14 - "inventario.jpg (Inventory Carousel Photo)"
Cohesion: 0.83
Nodes (4): inventario.jpg (Inventory Carousel Photo), Evicamp Login Screen Carousel, Inventario (Inventory) Module, Warehouse Worker with Tablet Scene

### Community 15 - "proyectos.jpg (Business Analytics Meeting Photo)"
Cohesion: 0.83
Nodes (4): Business Analytics / Team Reporting Theme, proyectos.jpg (Business Analytics Meeting Photo), Evicamp Login Screen Carousel, "Proyectos" (Projects) Slide

### Community 16 - "Inventario/index.tsx"
Cohesion: 0.15
Nodes (11): FiltrosInventario(), Props, HeaderInventario(), Props, ModalProducto(), ProductNature, Props, Props (+3 more)

### Community 17 - "finanzas.jpg (Finance Carousel Image)"
Cohesion: 1.00
Nodes (3): finanzas.jpg (Finance Carousel Image), Finanzas Login Carousel Slide, Finance Module Branding/Marketing Imagery

## Ambiguous Edges - Review These
- `EviCamp Logo Image (logo.png)` → `Download Icon Overlay (possible viewer artifact, not confirmed part of asset design)`  [AMBIGUOUS]
  src/assets/logo.png · relation: references

## Knowledge Gaps
- **126 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 145 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EviCamp Logo Image (logo.png)` and `Download Icon Overlay (possible viewer artifact, not confirmed part of asset design)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `react` connect `react` to `Punto-de-venta/index.tsx`, `Utilidades/index.tsx`, `package.json`, `Finanzas/index.tsx`, `useEscapeClose`, `Mermas/index.tsx`, `TablaAnalisisProductos.tsx`, `lucide-react`, `Inventario/index.tsx`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `Punto-de-venta/index.tsx`, `Utilidades/index.tsx`, `package.json`, `Finanzas/index.tsx`, `useEscapeClose`, `Mermas/index.tsx`, `react`, `TablaAnalisisProductos.tsx`, `Inventario/index.tsx`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Punto-de-venta/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10476190476190476 - nodes in this community are weakly interconnected._
- **Should `graphify Skill (SKILL.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._