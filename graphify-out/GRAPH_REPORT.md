# Graph Report - evicamp  (2026-10-02)

## Corpus Check
- 78 files · ~639,809 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 470 nodes · 1099 edges · 20 communities (16 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & Routing
- Inventario Components
- Fiados & Supabase Client
- Build & Dependencies
- Reportes & Resumen
- Graphify Skill Docs
- POS & Ticket Inputs
- TS App Config
- TS Node Config
- Producto Modal & Image Search
- Lint & Dev Tooling
- Proveedores Components
- Ad-hoc SSH Scripts
- Login Carousel Inventario
- Login Carousel Proyectos
- Login Carousel Finanzas
- TS Root Config
- Resumen Types
- Vite Favicon
- Evicamp Logo Asset

## God Nodes (most connected - your core abstractions)
1. `react` - 68 edges
2. `lucide-react` - 57 edges
3. `useCerrarConEscape()` - 35 edges
4. `supabase` - 33 edges
5. `usePermiso()` - 26 edges
6. `graphify Skill (SKILL.md)` - 22 edges
7. `clicConTeclado()` - 21 edges
8. `compilerOptions` - 20 edges
9. `traerTodo()` - 19 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md (Evicamp project rules)` --conceptually_related_to--> `graphify Skill (SKILL.md)`  [INFERRED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `index.html (Evicamp app entry)` --references--> `Evicamp (project name)`  [EXTRACTED]
  index.html → README.md
- `CLAUDE.md (Evicamp project rules)` --references--> `graphify (knowledge graph CLI/skill)`  [EXTRACTED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `graphify Skill (SKILL.md)` --references--> `graphify claude install (native CLAUDE.md integration)`  [EXTRACTED]
  .claude/skills/graphify/SKILL.md → .claude/skills/graphify/references/hooks.md
- `graphify Skill (SKILL.md)` --references--> `graphify MCP stdio server`  [EXTRACTED]
  .claude/skills/graphify/SKILL.md → .claude/skills/graphify/references/exports.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **GitHub clone -> extract -> merge-graphs flow** — claude_skills_graphify_references_github_and_merge, concept_graphify_clone, concept_graphify_extract_cli, concept_merge_graphs_cli [EXTRACTED 1.00]
- **graphify Skill Package (core + reference docs)** — claude_skills_graphify_skill, claude_skills_graphify_references_add_watch, claude_skills_graphify_references_exports, claude_skills_graphify_references_extraction_spec, claude_skills_graphify_references_github_and_merge, claude_skills_graphify_references_hooks, claude_skills_graphify_references_query, claude_skills_graphify_references_transcribe, claude_skills_graphify_references_update [EXTRACTED 1.00]
- **Incremental update manifest/cache integrity mechanisms** — claude_skills_graphify_skill, claude_skills_graphify_references_update, concept_manifest_stamping, concept_extraction_cache, concept_shrink_guard_479 [INFERRED 0.85]

## Communities (20 total, 4 thin omitted)

### Community 0 - "App Shell & Routing"
Cohesion: 0.06
Nodes (59): Evicamp (project name), index.html (Evicamp app entry), README.md (Evicamp), react-dom, App(), handleNavigate(), src_assets_finanzas, src_assets_inventario (+51 more)

### Community 1 - "Inventario Components"
Cohesion: 0.06
Nodes (46): lucide-react, EtiquetaStock(), Props, FiltrosInventario(), Props, ModalLote(), Props, ModalMerma() (+38 more)

### Community 2 - "Fiados & Supabase Client"
Cohesion: 0.08
Nodes (41): html2canvas-pro, react-to-print, supabase, ModalAbono(), Props, ModalAnularPago(), Props, ModalClientes() (+33 more)

### Community 3 - "Build & Dependencies"
Cohesion: 0.06
Nodes (37): dependencies, html2canvas-pro, lucide-react, react, react-dom, react-to-print, recharts, @supabase/supabase-js (+29 more)

### Community 4 - "Reportes & Resumen"
Cohesion: 0.11
Nodes (22): Props, TablaTickets(), TicketVenta, DashboardResumen(), Props, TarjetaMetrica(), FiltrosUtilidades(), Props (+14 more)

### Community 5 - "Graphify Skill Docs"
Cohesion: 0.09
Nodes (34): CLAUDE.md (Evicamp project rules), .claude/CLAUDE.md (graphify trigger), graphify reference: add-watch.md, graphify reference: exports.md, graphify reference: extraction-spec.md, graphify reference: github-and-merge.md, graphify reference: hooks.md, graphify reference: query.md (+26 more)

### Community 6 - "POS & Ticket Inputs"
Cohesion: 0.12
Nodes (21): Props, TablaFiados(), InputPeso(), InputPrecio(), InputUnidades(), Props, redondearPeso(), TicketVenta() (+13 more)

### Community 7 - "TS App Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 8 - "TS Node Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 9 - "Producto Modal & Image Search"
Cohesion: 0.22
Nodes (16): ModalProducto(), ProductNature, Props, buscarImagenes(), coincide(), distancia(), fonetica(), FotoEncontrada (+8 more)

### Community 10 - "Lint & Dev Tooling"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+9 more)

### Community 11 - "Proveedores Components"
Cohesion: 0.22
Nodes (9): react, FiltrosProveedores(), Props, ModalProveedor(), Props, Props, TablaProveedores(), Proveedor (+1 more)

### Community 12 - "Ad-hoc SSH Scripts"
Cohesion: 0.13
Nodes (9): { NodeSSH }, ssh, { NodeSSH }, ssh, { NodeSSH }, path, ssh, ref_node_ssh (+1 more)

### Community 13 - "Login Carousel Inventario"
Cohesion: 0.83
Nodes (4): inventario.jpg (Inventory Carousel Photo), Evicamp Login Screen Carousel, Inventario (Inventory) Module, Warehouse Worker with Tablet Scene

### Community 14 - "Login Carousel Proyectos"
Cohesion: 0.83
Nodes (4): Business Analytics / Team Reporting Theme, proyectos.jpg (Business Analytics Meeting Photo), Evicamp Login Screen Carousel, "Proyectos" (Projects) Slide

### Community 15 - "Login Carousel Finanzas"
Cohesion: 1.00
Nodes (3): finanzas.jpg (Finance Carousel Image), Finanzas Login Carousel Slide, Finance Module Branding/Marketing Imagery

## Knowledge Gaps
- **159 isolated node(s):** `IngresoTotalResult`, `DatosEmpresa`, `MetricaCategoria`, `MetricaDia`, `MetricaProducto` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 180 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Proveedores Components` to `App Shell & Routing`, `Inventario Components`, `Fiados & Supabase Client`, `Build & Dependencies`, `Reportes & Resumen`, `POS & Ticket Inputs`, `Producto Modal & Image Search`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Inventario Components` to `App Shell & Routing`, `Fiados & Supabase Client`, `Build & Dependencies`, `Reportes & Resumen`, `POS & Ticket Inputs`, `Producto Modal & Image Search`, `Proveedores Components`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Lint & Dev Tooling` to `Build & Dependencies`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `IngresoTotalResult`, `DatosEmpresa`, `MetricaCategoria` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.056842105263157895 - nodes in this community are weakly interconnected._
- **Should `Inventario Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06095481670929241 - nodes in this community are weakly interconnected._
- **Should `Fiados & Supabase Client` be split into smaller, more focused modules?**
  _Cohesion score 0.07985193019566367 - nodes in this community are weakly interconnected._