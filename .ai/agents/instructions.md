# Agent Instructions — Volunteer-CGIS Project Intelligence

Any AI coding agent (Claude Code, Codex, OpenCode, Cursor, Antigravity, generic shell) must follow this protocol.

**Golden rule:** never rescan the repository when the graph already knows the answer. Source code is authoritative; if the graph disagrees with the source, the source wins and the graph must be repaired (`ai-project sync` / `rebuild`).

## Before modifying code

```bash
.ai/bin/ai-project sync
.ai/bin/ai-project context "<your task>"
```

For a new session, major feature, unfamiliar area, or architectural work, first
run `.ai/bin/ai-project overview` and `.ai/bin/ai-project architecture`. For
planned work, run `.ai/bin/ai-project plan "<task>"`; add `--save` when the plan
should be tracked. Small bug fixes can use the shorter `sync` + `context` path.

Then:
1. Read ONLY the files returned by `context` (plus direct dependencies via `ai-project impact <file>` when needed).
2. Do NOT perform a full project scan unless `context` returns nothing useful or the graph is corrupt.

## While working

- Make the smallest appropriate change.
- Match existing conventions (see `.ai/project/architecture.json` → conventions).
- Frontend API calls go through `frontend/src/services/api/client.ts` (base URL `/api/v1`).
- Backend layering: route → controller → service → repository → model.

## After the change

1. Run relevant tests (`pytest ai-service/tests` for the AI service; `npm run typecheck` / `lint` in backend and frontend).
2. `sync` will auto-create a **PENDING_AGENT_CONFIRMATION** change record for detected modifications. Finalize it:
   ```bash
   .ai/bin/ai-project sync
   .ai/bin/ai-project record-change --confirm --task "<what you did>" --type bugfix
   ```
   Then edit `.ai/changes/ledger.jsonl` to enrich `reason`/`impact`/`risk` if needed.
3. If a saved plan was used, run `.ai/bin/ai-project plan-check <plan-id>` after implementation and review any reported deviation.
4. Check documentation impact with `.ai/bin/ai-project docs-check`. Update documentation **only if** the change affects: architecture, API behavior, database structure, feature behavior, auth, deployment, or important business logic. (Button padding → no doc update. Availability logic, new API, schema change → yes.)
4. Commit normally with git (ledger entries carry the commit hash when run inside a repo).
5. Handing off to another agent/session? Run `.ai/bin/ai-project handoff`.

## Key commands

| Command | Purpose |
|---|---|
| `ai-project context "<task>" [--compact\|--deep]` | Ranked, cached, minimal context — the main entry point |
| `ai-project impact-task "<task>"` | Task-level impact, risk, DIRECTLY_CHANGED/POTENTIALLY_AFFECTED classification |
| `ai-project impact <file>` | What is affected if this file changes |
| `ai-project why "<component>"` | Purpose, decisions, history, connections |
| `ai-project history --feature <id>` | Chronological change memory |
| `ai-project subgraph "<topic>"` | Relevant graph neighborhood |
| `ai-project handoff` | Compact handoff for the next agent |
| `ai-project docs-check` | Documentation health / update recommendations |
| `ai-project decisions "<topic>"` | ADRs + architectural constraints |
| `ai-project context-audit` | Why files were included/excluded in the last context |
| `ai-project validate` / `doctor [--fix]` | Graph health / recovery |
| `ai-project rebuild` | Full rescan — rare |

Feature IDs live in `.ai/project/features.json`. Architecture decision records live in `.ai/docs/decisions/`; architectural constraints in `.ai/metadata/architecture-memory.json`. Binding rules: `.ai/agents/memory-rules.md`.
