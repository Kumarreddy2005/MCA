# CLAUDE.md — Claude Code entry point (same protocol as AGENTS.md)

This repo has a persistent project-intelligence system in `.ai/`. Use it instead of rescanning the repository.

## Before starting significant work

1. Run `.ai/bin/ai-project sync`
2. Run `.ai/bin/ai-project context "<current task>"`
3. Read only the recommended files (check `impact`/`impact-task` for blast radius).
4. Make the smallest appropriate change.
5. Run relevant tests (`pytest ai-service/tests`; `npm run typecheck && npm run lint` in backend/ and frontend/).
6. Run `.ai/bin/ai-project sync` again.
7. Finalize the recorded change: `.ai/bin/ai-project record-change --confirm --task "<task>"`.
8. Check documentation impact: `.ai/bin/ai-project docs-check` (update docs only for architecture/API/schema/behavior changes).

## Useful commands

- `context "<task>" --compact|--normal|--deep` — ranked context (cached, with manifest)
- `impact-task "<task>"` / `impact <file>` — affected files, APIs, DB, tests, risk
- `why "<component>"` — purpose + decisions + history
- `history --feature <id>` / `changes` — change memory
- `handoff` — compact context for the next agent
- `subgraph "<topic>"`, `search`, `feature <id>`, `decisions "<topic>"`
- `validate`, `doctor [--fix]`, `dashboard`

Rules and safety: `.ai/agents/memory-rules.md` (source code always wins; never fabricate relationships).
Full protocol: `.ai/agents/instructions.md`.
