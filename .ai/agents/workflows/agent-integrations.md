# Agent Integration Snippets

The core interface is tool-agnostic: any agent that can run shell commands can use
`.ai/bin/ai-project <command>`. Optional: `ln -s <repo>/.ai/bin/ai-project ~/.local/bin/ai-project`.

## Claude Code — `CLAUDE.md` (project root)
```markdown
Before any code change, run `.ai/bin/ai-project sync` then
`.ai/bin/ai-project context "<task>"` and read only the returned files.
After changes: run tests, `.ai/bin/ai-project sync`,
`.ai/bin/ai-project record-change <files...>`. See .ai/agents/instructions.md.
```

## Codex CLI / OpenCode — `AGENTS.md` (project root)
```markdown
Project intelligence lives in .ai/. Protocol:
1. .ai/bin/ai-project sync
2. .ai/bin/ai-project context "<task>" — read only those files
3. .ai/bin/ai-project impact <file> before editing
4. after edit: tests, then sync + record-change
Full rules: .ai/agents/instructions.md
```

## Cursor — `.cursorrules` or `.cursor/rules/project.mdc`
```markdown
Use the ai-project CLI for project context:
- `.ai/bin/ai-project context "<task>"` before working
- `.ai/bin/ai-project impact <file>` to check blast radius
- `.ai/bin/ai-project sync && .ai/bin/ai-project record-change <files>` after editing
Never rescan the whole repo when the graph answers the question.
```

## Antigravity / generic shell agents
Prepend to the agent's system/instructions file:
```
When working in this repository, always start with:
  .ai/bin/ai-project sync
  .ai/bin/ai-project context "<current task>"
and follow .ai/agents/instructions.md.
```
