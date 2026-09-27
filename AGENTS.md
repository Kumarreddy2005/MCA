# AGENTS.md — Universal entry point for coding agents

This repo has a persistent project-intelligence system in `.ai/`. Use it instead of rescanning the repository.

## Before starting significant work

1. Run `.ai/bin/ai-project sync`.
2. For a new session, major feature, unfamiliar area, or architectural work, run `.ai/bin/ai-project overview` and `.ai/bin/ai-project architecture`.
3. Run `.ai/bin/ai-project context "<current task>"` and, for planned work, `.ai/bin/ai-project plan "<task>"` (planning is read-only; use `--save` to persist it).
4. Read only the recommended files (check `impact`/`impact-task` for blast radius).
5. Make the smallest appropriate change.
6. Run relevant tests (`pytest ai-service/tests`; `npm run typecheck && npm run lint` in backend/ and frontend/).
7. Run `.ai/bin/ai-project sync` again, then `plan-check <plan-id>` when a saved plan was used.
8. Finalize the recorded change: `.ai/bin/ai-project record-change --confirm --task "<task>"`.
9. Check documentation impact: `.ai/bin/ai-project docs-check` (update docs only for architecture/API/schema/behavior changes).

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
