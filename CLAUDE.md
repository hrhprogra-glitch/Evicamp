## Proyecto

Antes de trabajar, lee **AGENTS.md** (reglas), **docs/MEMORIA-IA.md** (lo aprendido y los errores a no repetir), **docs/BITACORA.md** (último estado; otra IA, como la de Antigravity, puede haber trabajado aquí) y **docs/PLAN-SIUMAX-COMERC.md** (plan y fases). Después de cada paso o conversación importante, actualiza SIEMPRE docs/BITACORA.md, "DÓNDE ESTAMOS AHORA" y "PROPUESTAS" en el plan, docs/CONVERSACIONES.md y, si aprendiste algo, docs/MEMORIA-IA.md; luego haz commit.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
