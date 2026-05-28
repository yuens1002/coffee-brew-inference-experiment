# /review report — iteration-4-foundation-repair

**Branch:** `feat/iteration-4-foundation-repair`
**Generated:** 2026-05-28
**Iterations to reach verified:** 1 (TypeScript fix-ups during implementation; sub-agent verified all ACs in one pass)

---

## Verdict

**Clear** — all 17 deliverables shipped, 32 ACs pass (62/62 tests, 0 type errors), no docs drift. Two minor observations flagged for `/retro` below; neither blocks human review.

---

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| A1: composite source_url unique | `prisma/schema.prisma` + `prisma/migrations/20260528000000_a1_a2_*/migration.sql` | ✓ shipped |
| A2: Brew.variety column + wire-through | `prisma/schema.prisma`, migration, `src/types.ts:42,145`, `src/lib/db.ts:64,88,110,127`, `src/routes/brewing.ts:75`, `src/routes/mcp.ts:61` | ✓ shipped |
| A3: Fix variety scoring (per-brew, not per-origin map) | `src/lib/recommend.ts:28-34` | ✓ shipped |
| A4: MCP recommend origin optional | `src/routes/mcp.ts:34` | ✓ shipped |
| A5: MCP log_brew source_url + field_confidence merge | `src/routes/mcp.ts:66-100` | ✓ shipped |
| B1: POST /recommend/:id/vote endpoint | `src/routes/brewing.ts:154-164`, `src/lib/db.ts:294-312`, `src/types.ts:127-135` | ✓ shipped |
| B2: defer getVoteCounts — return from upsert directly | `src/lib/recommend.ts:215-257` (upsert → rec.thumbs_up/thumbs_down) | ✓ shipped (see note) |
| B3: wire landing page votes to API | `landing/index.html:1796-1828` | ✓ shipped |
| B4: render vote counts in result card | `landing/index.html:1666-1668` | ✓ shipped |
| C1: API-SPEC.md full update | `docs/API-SPEC.md` | ✓ shipped |
| C2: overview.md compare_brew + data model v4 | `docs/architecture/overview.md` | ✓ shipped |
| C3: variety scoring invariant test | `src/__tests__/recommend.test.ts:178-198` | ✓ shipped |
| C4: user_vote / recordVote flow test | `src/__tests__/brewing.test.ts` (POST /recommend/:id/vote describe block) | ✓ shipped |
| C5: MCP log_brew rating bounds tests | `src/__tests__/mcp-tools.test.ts:237-263` | ✓ shipped |
| C6: MCP compare_brew live-link test | `src/__tests__/mcp-tools.test.ts:346-366` | ✓ shipped |
| C7: remove unused searchOrigins | `src/lib/db.ts` (deleted export) | ✓ shipped |
| C8: .env.example | already existed pre-iteration | ✓ present |

### Code changes not tied to any deliverable

None. All modified files trace to a deliverable.

### Plan B1 → implementation note

The plan said "store `user_vote` on the link row." The implementation chose to store votes as `thumbs_up`/`thumbs_down` integer columns on the `recommendations` table, incremented atomically via `recordVote()`. The plan description said "(or a new `recordVote()` DB helper)" which was the chosen path. The ACs (AC-FN-B1 through B5) are all satisfied. The deviation is in storage location, not contract. Flagged for `/retro` because the plan description should have been updated when the design was finalised.

---

## ACs ↔ Tests (Gate 3 spot-check)

| AC | Test file | Asserts invariant? | Notes |
|----|-----------|---------------------|-------|
| AC-TST-1 | `src/__tests__/recommend.test.ts:179` | ✓ | Asserts `sources[0].brew_id === 1` (matching variety) AND `sources[0].relevance > sources[1].relevance` — a relational invariant, not a pinned literal |
| AC-TST-2 | `src/__tests__/brewing.test.ts` | ✓ (strong dispatch) / ⚠ weak counts | `toHaveBeenCalledWith(1, 'up')` is strong — tests route→DB dispatch chain. `body.thumbs_up === 1` is weak — pins the mock return, not a system invariant. Not load-bearing since the primary AC Pass condition is the dispatch assertion. |
| AC-TST-3 | `src/__tests__/mcp-tools.test.ts:248,257` | ✓ | Asserts `isError: true` for both `rating: 0` and `rating: 6` — schema validation invariant, no literal pinning |
| AC-TST-4 | `src/__tests__/mcp-tools.test.ts:346` | ✓ | Mocks `getBrewLinks` → `[{match_confidence: 0.82}]`, asserts `result.match_score === 0.82` and `getBrewLinks` called with `1` — tests the data flow link→response |

---

## Docs drift

None. All four docs-touching deliverables landed cleanly:

- `docs/API-SPEC.md`: GET /origins has variety, GET /brewing-methods has full technique shape, POST /recommend response has thumbs_up/thumbs_down + variety, POST /recommend/:id/vote section added with request/response/errors.
- `docs/architecture/overview.md`: compare_brew shows ✅ Live, data model is v4 with variety on brews, composite unique on source_url+brewing_method_id, thumbs_up/thumbs_down on recommendations. Variety match (weight 1) in scoring table. Step 6 shows upsert with deterministic fingerprint.
- `searchOrigins` is gone from all code and not referenced in any doc.
- `getVoteCounts` is no longer called in `computeBestBrew` — overview's engine description matches.

### ACs doc format gap

The ACs tracking doc (`docs/plans/iteration-4/ACs.md`) was written with 5 columns (AC, #, What, How, Pass) — missing the Agent, QC, Reviewer columns required by the agentic-workflow 3-column handoff protocol. The human Reviewer column cannot be filled against the current table format. Flagged for `/retro`; does not block approval since all ACs are verified and the findings are documented here.

---

## Recommendations

1. **AC-TST-2 weak counts assertion** — `body.thumbs_up === 1` pins the mock return value rather than asserting a type/shape invariant. Acceptable here (primary invariant passes), but the pattern should not spread. Refactor to `typeof body.thumbs_up === 'number' && typeof body.thumbs_down === 'number'` when touching this test next.

2. **Plan B1 storage description drift** — The plan deliverable for B1 said "store `user_vote` on the link row"; the implementation correctly chose the recommendation row instead. Once a design diverges from the plan during implementation, update the plan deliverable description in that same commit so plan ↔ code remain aligned.

3. **ACs doc missing Agent/QC/Reviewer columns** — The template in `templates/acs-template.md` (global) includes these columns; the project-specific ACs doc omitted them. For the human review step (Phase 5), add the three columns so the Reviewer has a row-by-row sign-off surface.

---

## Inputs for /retro

- **Route:** `/test-engineer`
  **Draft principle:** *"When a route test asserts a response body value that comes directly from a mocked DB call's return (e.g. `thumbs_up: 1` pinned because the mock was set up to return `{thumbs_up: 1}`), assert type/shape (`typeof x === 'number'`) rather than exact value. The exact-value pin tests the mock, not the route handler. The load-bearing assertion is always the dispatch chain (`toHaveBeenCalledWith`) — make that the primary Pass criterion in the AC."*
  **Triggered by:** AC-TST-2 weak counts assertion.

- **Route:** `/backend-architect`
  **Draft principle:** *"When implementation discovers a better storage location than what the plan specified (e.g., votes on the parent row vs. the link row), update the plan deliverable description in the same commit. The ACs are the contract and should match implementation — but the plan description should not diverge from the design that was actually chosen. A plan that contradicts the code is a future maintenance hazard."*
  **Triggered by:** Plan B1 "store user_vote on link row" vs. actual recommendation-row storage.

- **Route:** `/project-manager`
  **Draft principle:** *"When authoring the ACs doc, always include the Agent/QC/Reviewer columns — even if they're blank at authoring time. The 3-column handoff is a Phase 5 contract surface; omitting the columns means the human Reviewer cannot fill them in during review. The 5-column abbreviated format is acceptable for internal tracking only — any ACs doc destined for Phase 5 human review must have all 7 columns."*
  **Triggered by:** ACs doc format gap.
