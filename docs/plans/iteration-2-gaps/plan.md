# Iteration 2 — Gap Closure Sprint

**Carry-over from competition-sprint review + live parity check**
**Branch:** `feat/iteration-2-gaps`
**Plan + ACs:** to be authored in next session via agentic workflow

## Gaps inventory

### BLOCKING (production is incomplete without these)

| # | Gap | Impact |
|---|-----|--------|
| 1 | No community input on landing page | Demo is read-only — no "Log Your Brew" form. Community data can't grow organically |
| 2 | README recommend description doesn't mention technique | Users won't know the API returns bloom timing, pour stages, etc. |

### PROCESS (agentic workflow required)

| # | Gap | Owner |
|---|-----|-------|
| 3 | MCP compare_brew missing 0.82 live-link test | `/test-engineer` |
| 4 | Roadmap: Phase 6 items (D2, D3) not ticked | `/project-manager` |
| 5 | Roadmap: Landing page in Icebox, should be Phase 5 | `/project-manager` |
| 6 | Scraper script missing DANGER/RUN ONCE header | `/backend-architect` |
| 7 | Docs/API-SPEC.md needs technique field verified | `/backend-architect` |

### DEFERRED (post-competition)

| # | Gap |
|---|-----|
| 8 | Semantic similarity on brew notes (Phase 3) |
| 9 | Reddit/forum scraping pipeline (Phase 3) |
| 10 | technique JSONB on brews table (Phase 6) |
| 11 | LLM extraction at ingest (Phase 6) |
| 12 | Narrative synthesis (Phase 6) |
| 13 | MCP Registry submission (Phase 5) |

## Agentic workflow checklist for next session

- [ ] Load `/project-manager` → plan.md + ACs.md
- [ ] Load `/test-engineer` → write coverage tests
- [ ] Load `/backend-architect` → landing form + docs fixes
- [ ] Phase 3: Verify sub-agent
- [ ] Phase 4.5: `/review`
- [ ] Phase 5: PR + human review
- [ ] Phase 7: `/retro`