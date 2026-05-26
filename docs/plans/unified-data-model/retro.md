# /retro — Unify Data Model (v2.0.0)

**Session:** 2026-05-25 | **PR:** [#2](https://github.com/yuens1002/brew-guide/pull/2)  
**Verdict:** Merged ✅ | **Cadence:** Full (with Copilot review)

---

## Lessons Routed

| # | Lesson | Routed to | Action |
|---|--------|-----------|--------|
| 1 | Copilot review caught 3 bugs + 4 quality issues on first PR | `agentic-workflow` skill | Added Phase 5.5 (poll + resolve all) |
| 2 | `NODE_ENV=production` skips devDeps silently | `memory` | Saved as environment fact |
| 3 | Repo renamed `coffee-brew-inference-experiment` → `brew-guide` | `memory` (user profile) | Updated |
| 4 | Landing page was already snake_case before backend migration | `coffee-brew-review` skill | Added pitfall #7 about README drift |
| 5 | Old DB files need auto-migration detection | `coffee-brew-backend-architect` skill | Added migration pattern to pitfalls |
| 6 | `\|\|` overrides valid `0` values for numeric defaults | `coffee-brew-backend-architect` skill | Added pitfall about `??` vs `\|\|` |
| 7 | Unused imports slip past review without lint rule | pending | Consider `noUnusedLocals` in tsconfig |
| 8 | Full agentic workflow proven: plan → implement → review → Copilot → merge → retro | `agentic-workflow` skill | Workflow validated end-to-end |

---

## What Went Well

- **Copilot phase added immediate value** — found real bugs within 2 minutes of the PR push
- **Cross-artifact /review caught README drift** that would have stayed stale
- **`delegate_task` for parallel architect + test engineer** worked for types.ts migration
- **MCP tools and REST routes stayed in sync** — all 5 tools match REST shapes
- **Removing mcp-server/ was clean** — no breakage, 4,116 lines deleted

## What to Improve

- **Don't use sed for vitest assertion edits** — mangled `expect()` wrapper. Use `patch` tool always.
- **Add `noUnusedLocals: true` to tsconfig** — Copilot found 2 unused imports we both missed
- **Pre-commit hook for unused imports** — would have caught #4/#5 before review
- **DB migration should be a first-class concern** — next schema change, plan migration upfront
