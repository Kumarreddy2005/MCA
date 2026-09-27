# Project Memory Rules

Binding rules for every agent using the `.ai/` project intelligence system.

1. **Source code is authoritative.** If the graph disagrees with the source, the source wins and the graph must be repaired (`sync` / `rebuild`).
2. **Current Git state is authoritative for version state.** The graph never claims a different commit than the working tree.
3. **The graph is an index**, not a substitute for reading code before editing it.
4. **The change ledger is historical memory.** It is append-only; never rewrite or drop past records.
5. **Documentation describes intended behavior**; code describes actual behavior. When they conflict, flag it — do not silently "fix" either.
6. **ADRs explain why decisions exist.** Do not contradict an ADR without recording a new ADR.
7. **Inferred relationships carry confidence.** High-confidence edges may be used automatically; low-confidence (inferred) edges must be verified against source before being trusted.
8. **Never fabricate relationships** — no node or edge without a detection source.
9. **Never assume stale graph data is correct** — check `validate`/`sync` freshness first.
10. **Prefer current source over historical information** when answering "what exists now"; archived nodes answer "what existed before".
11. **Prefer direct relationships over fuzzy matches** when selecting context.
12. **Minimize context returned to agents** — relevance-ranked, token-budgeted, never whole-repo dumps.
13. **Never fabricate agent identity** — detection is env-based; otherwise `unknown`.
14. **The system works offline** — no external AI/vector/graph APIs are required or may be assumed.
