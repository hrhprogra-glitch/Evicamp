# Graph Report - .  (2026-09-24)

## Corpus Check
- Large corpus: 102 files · ~796,019 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 405 nodes · 771 edges · 24 communities (20 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.8)
- Token cost: 342,061 input · 0 output

## Community Hubs (Navigation)
- Inventario & POS Shared UI
- App Shell & Section Dashboards
- graphify Skill Documentation
- Build & Lint Tooling (devDependencies)
- Runtime Dependencies & TicketVenta
- Finanzas (Caja) Module
- TypeScript App Config
- Fiados (Credito) Module
- TypeScript Node Config
- Mermas (Perdidas) Module
- Configuraciones (Usuarios) Module
- Utilidades Analytics Detail
- Proveedores (Suppliers) Module
- Logo Branding Asset
- Inventario Carousel Image
- Proyectos Carousel Image
- Project Entry Points (README/index.html)
- Finanzas Carousel Image
- Utilidades Ranking Table
- TypeScript Root Config
- Resumen Types
- Vite Logo Asset

## God Nodes (most connected - your core abstractions)
1. `useEscapeClose()` - 41 edges
2. `supabase` - 31 edges
3. `Product` - 23 edges
4. `graphify Skill (SKILL.md)` - 22 edges
5. `compilerOptions` - 20 edges
6. `compilerOptions` - 18 edges
7. `Fiado` - 14 edges
8. `formatearCantidad()` - 13 edges
9. `fechaLocalPeru()` - 11 edges
10. `calcularIngresoTotal()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md (Evicamp project rules)` --conceptually_related_to--> `graphify Skill (SKILL.md)`  [INFERRED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `TablaHistorial()` --references--> `react`  [EXTRACTED]
  src/sections/Finanzas/components/TablaHistorial.tsx → package.json
- `InputPrecio()` --references--> `react`  [EXTRACTED]
  src/sections/Punto-de-venta/components/TicketVenta.tsx → package.json
- `InputUnidades()` --references--> `react`  [EXTRACTED]
  src/sections/Punto-de-venta/components/TicketVenta.tsx → package.json
- `InputPeso()` --references--> `react`  [EXTRACTED]
  src/sections/Punto-de-venta/components/TicketVenta.tsx → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **graphify Skill Package (core + reference docs)** — claude_skills_graphify_skill, claude_skills_graphify_references_add_watch, claude_skills_graphify_references_exports, claude_skills_graphify_references_extraction_spec, claude_skills_graphify_references_github_and_merge, claude_skills_graphify_references_hooks, claude_skills_graphify_references_query, claude_skills_graphify_references_transcribe, claude_skills_graphify_references_update [EXTRACTED 1.00]
- **Incremental update manifest/cache integrity mechanisms** — claude_skills_graphify_skill, claude_skills_graphify_references_update, concept_manifest_stamping, concept_extraction_cache, concept_shrink_guard_479 [INFERRED 0.85]
- **GitHub clone -> extract -> merge-graphs flow** — claude_skills_graphify_references_github_and_merge, concept_graphify_clone, concept_graphify_extract_cli, concept_merge_graphs_cli [EXTRACTED 1.00]

## Communities (24 total, 4 thin omitted)

### Community 0 - "Inventario & POS Shared UI"
Cohesion: 0.07
Nodes (39): EtiquetaStock(), Props, FiltrosInventario(), Props, HeaderInventario(), Props, ModalLote(), Props (+31 more)

### Community 1 - "App Shell & Section Dashboards"
Cohesion: 0.09
Nodes (37): App(), supabase, SideBar(), SideBarProps, TopBar(), TopBarProps, Fiados(), Finanzas() (+29 more)

### Community 2 - "graphify Skill Documentation"
Cohesion: 0.09
Nodes (34): CLAUDE.md (Evicamp project rules), .claude/CLAUDE.md (graphify trigger), graphify reference: add-watch.md, graphify reference: exports.md, graphify reference: extraction-spec.md, graphify reference: github-and-merge.md, graphify reference: hooks.md, graphify reference: query.md (+26 more)

### Community 3 - "Build & Lint Tooling (devDependencies)"
Cohesion: 0.06
Nodes (33): autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer (+25 more)

### Community 4 - "Runtime Dependencies & TicketVenta"
Cohesion: 0.07
Nodes (30): lucide-react, dependencies, lucide-react, react, react-dom, react-to-print, recharts, @supabase/supabase-js (+22 more)

### Community 5 - "Finanzas (Caja) Module"
Cohesion: 0.13
Nodes (18): FiltroFechas(), Props, ModalApertura(), Props, BloqueArqueoProps, ModalCierre(), Props, ModalDetalleCaja() (+10 more)

### Community 6 - "TypeScript App Config"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, src, vite/client, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly (+18 more)

### Community 7 - "Fiados (Credito) Module"
Cohesion: 0.20
Nodes (16): ModalAbono(), Props, ModalAnularPago(), Props, ModalClientes(), Props, ModalDetalleFiado(), Props (+8 more)

### Community 8 - "TypeScript Node Config"
Cohesion: 0.09
Nodes (22): ES2023, node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module (+14 more)

### Community 9 - "Mermas (Perdidas) Module"
Cohesion: 0.19
Nodes (10): FiltrosMermas(), Props, HeaderMermas(), Props, Props, TablaMermas(), Props, TarjetaMetrica() (+2 more)

### Community 10 - "Configuraciones (Usuarios) Module"
Cohesion: 0.23
Nodes (9): FormularioEmpresa(), ModalUsuario(), ModalUsuarioProps, PERMISOS_DEFAULT, TablaUsuarios(), Configuraciones(), DatosEmpresa, Empleado (+1 more)

### Community 11 - "Utilidades Analytics Detail"
Cohesion: 0.24
Nodes (11): formatearFecha(), ModalDetalleProducto(), Props, Props, TablaAnalisisProductos(), AnalisisProducto, MetricaCategoria, MetricaDia (+3 more)

### Community 12 - "Proveedores (Suppliers) Module"
Cohesion: 0.28
Nodes (8): FiltrosProveedores(), Props, ModalProveedor(), Props, Props, TablaProveedores(), Proveedores(), Proveedor

### Community 13 - "Logo Branding Asset"
Cohesion: 0.33
Nodes (6): Default/Fallback POS Logo Asset, Download Icon Overlay (possible viewer artifact, not confirmed part of asset design), EviCamp Brand Identity, EviCamp Logo Image (logo.png), Sidebar / Topbar / Login Screen Branding Display, Supabase Custom Logo Override

### Community 14 - "Inventario Carousel Image"
Cohesion: 0.83
Nodes (4): inventario.jpg (Inventory Carousel Photo), Evicamp Login Screen Carousel, Inventario (Inventory) Module, Warehouse Worker with Tablet Scene

### Community 15 - "Proyectos Carousel Image"
Cohesion: 0.83
Nodes (4): Business Analytics / Team Reporting Theme, proyectos.jpg (Business Analytics Meeting Photo), Evicamp Login Screen Carousel, "Proyectos" (Projects) Slide

### Community 16 - "Project Entry Points (README/index.html)"
Cohesion: 0.67
Nodes (3): Evicamp (project name), index.html (Evicamp app entry), README.md (Evicamp)

### Community 17 - "Finanzas Carousel Image"
Cohesion: 1.00
Nodes (3): finanzas.jpg (Finance Carousel Image), Finanzas Login Carousel Slide, Finance Module Branding/Marketing Imagery

## Ambiguous Edges - Review These
- `EviCamp Logo Image (logo.png)` → `Download Icon Overlay (possible viewer artifact, not confirmed part of asset design)`  [AMBIGUOUS]
  src/assets/logo.png · relation: references

## Knowledge Gaps
- **120 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+115 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EviCamp Logo Image (logo.png)` and `Download Icon Overlay (possible viewer artifact, not confirmed part of asset design)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `react` connect `Runtime Dependencies & TicketVenta` to `Finanzas (Caja) Module`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `TablaHistorial()` connect `Finanzas (Caja) Module` to `Runtime Dependencies & TicketVenta`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `graphify Skill (SKILL.md)` (e.g. with `CLAUDE.md (Evicamp project rules)` and `Node ID format convention (stem_entity, full path)`) actually correct?**
  _`graphify Skill (SKILL.md)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _120 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Inventario & POS Shared UI` be split into smaller, more focused modules?**
  _Cohesion score 0.0726775956284153 - nodes in this community are weakly interconnected._
- **Should `App Shell & Section Dashboards` be split into smaller, more focused modules?**
  _Cohesion score 0.0861952861952862 - nodes in this community are weakly interconnected._