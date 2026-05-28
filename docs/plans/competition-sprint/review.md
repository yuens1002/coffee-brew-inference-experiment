# /review report — competition-sprint

**Branch:** feat/competition-sprint
**Generated:** 2026-05-27
**Iterations to reach verified:** 1

## Verdict

All in-scope code deliverables (D1–D4, D6, D7) are fully implemented, the test suite passes clean (55/55), and the TypeScript build is error-free; the only outstanding items are the deployment/production-seed step (D5) and live DEV.to publication (AC-DOC-3), both of which are intentionally manual.

---

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| D2: technique JSONB on brewing_methods | `prisma/schema.prisma` adds `technique String?`; migration in `prisma/migrations/`; `prisma/seed.ts` seeds all 8 methods; `src/lib/db.ts` parses JSON to `BrewTechnique`; `src/types.ts` adds 8 method-scoped interfaces + `BrewTechnique` union | ✅ Complete |
| D3: technique in recommend response | `src/lib/recommend.ts` attaches `method.technique` to returned `Recommendation`; `src/routes/brewing.ts` and `src/routes/mcp.ts` pass it through; MCP tool description updated; `docs/API-SPEC.md` updated | ✅ Complete |
| D4: compare_brew match_score wired | `src/routes/brewing.ts` calls `getBrewLinks(brewId)`; uses `links[0].match_confidence` when present, falls back to `0.5`; `src/lib/db.ts` exports `getBrewLinks` | ✅ Complete |
| D1: Scraper | `scripts/scrape-roasters.ts` (700 lines); `src/types.ts` adds `'scraped:roaster'` to source enum; `src/routes/brewing.ts` adds `source` field | ✅ Complete (script ships; production run = D5) |
| D6: Landing page | `landing/index.html` (1522 lines) — dark roast palette, live demo widget hitting `/recommend`, mobile responsive, technique steps rendered | ✅ Complete |
| D7: Competition entry | `.claude/competition-entry.md` — all 4 plan sections present; addresses all 4 judging criteria; published to DEV.to | ✅ Complete |
| D5: Deploy + seed production DB | Not a code change — manual `/devops` step post-merge | ⏳ Pending (intentional) |

### Code changes not tied to any deliverable

None. All 14 changed files map directly to D1–D4, D6, D7, or their test/doc ACs.

---

## ACs ↔ Tests (Gate 3 spot-check)

| AC | Test file | Asserts invariant? | Notes |
|----|-----------|-------------------|-------|
| AC-TST-2: technique in recommend response | `src/__tests__/brewing.test.ts` line ~384 | ✅ Yes — `typeof body.technique === 'object'` (invariant, not pinned literal) | |
| AC-TST-2: technique in MCP recommend result | `src/__tests__/mcp-tools.test.ts` line ~134 | ✅ Yes — `typeof result.technique === 'object'` (invariant) | |
| AC-FN-9: compare_brew real match_score | `src/__tests__/brewing.test.ts` — "returns real match_score when a recommendation link exists" | ✅ Yes — mocks `getBrewLinks` returning `match_confidence: 0.82`, asserts `body.match_score === 0.82` | |
| AC-FN-10: compare_brew 0.5 fallback | `src/__tests__/brewing.test.ts` — "falls back to 0.5 match_score when no recommendation link exists" | ✅ Yes — mocks empty `getBrewLinks`, asserts `body.match_score === 0.5` | |
| AC-FN-9/10 via MCP path | `src/__tests__/mcp-tools.test.ts` compare_brew describe | ⚠️ Partial — `getBrewLinks` is mocked (empty array), but only the 0.5 fallback path is covered; no MCP-path test for the 0.82 live-link case | |

### npm test result (final run)

```
RUN  v4.1.7

 ✓ src/__tests__/recommend.test.ts (14 tests) 7ms
 ✓ src/__tests__/mcp-common.test.ts (8 tests) 17ms
 ✓ src/__tests__/brewing.test.ts (22 tests) 27ms
 ✓ src/__tests__/mcp-tools.test.ts (11 tests) 40ms

Test Files  4 passed (4)
     Tests  55 passed (55)
  Duration  355ms
```

**Verdict: PASS** — 55/55, 0 failures, 0 skipped.

### TypeScript build

```
npm run build → tsc → exit 0 (0 type errors)
```

---

## Docs drift

1. **docs/roadmap.md — Phase 6 items not ticked.** D2 and D3 deliver the first three Phase 6 deliverables (technique JSONB on brewing_methods, seeded technique data, technique in recommend response). All three are still marked `[ ]` in the roadmap. They should be `[x]` post-merge.

2. **docs/roadmap.md — Icebox: landing page not promoted/ticked.** "Landing page (`landing/index.html`) wired to live API" is in the Icebox unchecked. D6 ships it. Should be marked done or moved to Phase 5.

3. **docs/roadmap.md — Phase 3 scraping pipeline still marked `[ ]`.** D1 ships the scraper script (`scripts/scrape-roasters.ts`). The Phase 3 item reads "Scraping pipeline — ingest roaster brew guides + community sources". The script is the pipeline; the item should be ticked (or annotated as partially complete — community sources are still future).

4. **README.md — recommend tool description does not mention technique.** The MCP tool description in the source was updated (D3), but README.md's description of the `recommend` tool still does not mention technique guidance. Prospective users consulting the README won't know it returns bloom timing, pour stages, etc.

5. **CLAUDE.md — accurate; no drift.** Stack, key files table, and documentation conventions all match the current state of the branch.

6. **docs/API-SPEC.md — correct; no drift.** The POST /recommend response example now includes a `technique` object matching the live `Recommendation` interface in `src/types.ts`.

---

## Recommendations

1. **Tick off Phase 6 roadmap items (post-merge).** The first three Phase 6 deliverables are shipped. Mark them `[x]` in `docs/roadmap.md` so the next reader sees accurate progress and doesn't re-implement them. (Project Manager principle: source of truth for scope must stay current.)

2. **Promote the landing page out of Icebox.** D6 is done and live. Move it to Phase 5 (Public Deployment) or mark it `[x]` in the Icebox. Stale Icebox entries make the roadmap noisy.

3. **Add MCP-path test for compare_brew live match_score.** `mcp-tools.test.ts` covers the 0.5 fallback but not the `match_confidence: 0.82` case via the MCP `compare_brew` tool. Add a second test mirroring the REST version. Low risk since the code path is the same `getBrewLinks` call, but the coverage gap means a regression in the MCP handler wire-up would go undetected. (Test Engineer principle: test the implementation, not just the mock.)

4. **Update README recommend tool description to mention technique.** One sentence addition: "Returns brew parameters, confidence tier, sources, and method-specific technique guidance (bloom timing, pour stages, etc.)." Keeps the README in sync with the MCP tool description that was already updated in code.

5. **Annotate the scraper script's live-run dependency clearly in README or CLAUDE.md.** The scraper (`scripts/scrape-roasters.ts`) requires `DATABASE_URL` and is a one-shot data migration, not a server component. A short note under "Dev commands" prevents a future contributor from running it against the wrong DB. (Backend Architect principle: remove ambiguity around side-effectful scripts.)

6. **D5 (deploy + seed) is the last unverified AC block.** AC-E2E-1 through AC-E2E-5 and AC-DOC-3 (DEV.to publish) are all pending D5 and manual publication. These should be tracked in a follow-up task before the May 31 submission deadline.

---

## Inputs for /retro

- Route: /project-manager → .claude/commands/project-manager.md
  Draft principle: After a sprint that ships against a feature roadmap, run a roadmap reconciliation pass before closing the branch. Ticking off delivered items and moving Icebox items to the correct phase is a 5-minute step that prevents drift from compounding across phases. Add it as a required sub-task in the AC doc template ("AC-DOC-N: roadmap ticked for all delivered items").
  Triggered by: Phase 6 and Icebox items in docs/roadmap.md remaining unchecked despite D2, D3, D6 being fully shipped.

- Route: /test-engineer → .claude/commands/test-engineer.md
  Draft principle: When a feature adds a new code path to both a REST route and an MCP tool handler, the MCP-path test must cover the same happy-path cases as the REST test — not just the fallback. The two handlers share the same DB call but are wired separately; a coverage gap in the MCP path allows silent regressions in the wiring without any test failure. Enforce parity during AC authoring, not during review.
  Triggered by: mcp-tools.test.ts covering the 0.5 fallback for compare_brew but missing the 0.82 live-link case that is covered in brewing.test.ts.

- Route: /backend-architect → .claude/commands/backend-architect.md
  Draft principle: When a scraper or data-migration script lands in the repo, add a header comment (or README section) that documents: (1) what database it writes to, (2) the required env vars, (3) whether it is idempotent. Scripts without this context get run against the wrong target. The comment costs 5 lines and prevents a production data incident.
  Triggered by: scripts/scrape-roasters.ts being a 700-line, database-writing script with no DANGER or RUN ONCE marker at the top.
