# /review report — trust-schema-wiring

**Branch:** `feat/trust-schema`  
**Generated:** 2026-05-26  
**Iterations to reach verified:** 1 (all 21 ACs passed on first verification pass)

---

## Verdict

**Minor issues** — all deliverables shipped and verified, 43 tests pass, TypeScript clean; four docs-drift items need updating before merge, and one plan-to-implementation gap (Task 4 partial) should be noted for the next session. No blocking issues.

---

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| Task 1 — Wire `computeBestBrew()` into `POST /recommend` | `src/routes/brewing.ts:5,141-156` | ✓ shipped |
| Task 2 — Wire `computeBestBrew()` into MCP `recommend` tool | `src/routes/mcp.ts:7,40-49` | ✓ shipped |
| Task 3 — Wire `tryLinkBrew()` fire-and-forget after `POST /brews` | `src/routes/brewing.ts:5,78` and `src/routes/mcp.ts:7,73` | ✓ shipped (both REST + MCP `log_brew`) |
| Task 4 — Wire `resolveOrigin()` into origin normalization | `src/routes/brewing.ts:5,61-63,143-145` and `src/routes/mcp.ts:7,41,71` | ✓ partially shipped — see finding #5 |
| Task 5 — `src/__tests__/recommend.test.ts` (10+ cases) | `src/__tests__/recommend.test.ts` (12 test cases) | ✓ shipped |
| Task 6 — Extend `brewing.test.ts` (mock + GET /origins + shapes) | `src/__tests__/brewing.test.ts` | ✓ shipped |
| Task 7 — Extend `mcp-tools.test.ts` (mock + shapes) | `src/__tests__/mcp-tools.test.ts` | ✓ shipped |
| `src/lib/recommend.ts` error-message fix | `src/lib/recommend.ts:113` | ✓ shipped (prerequisite for Task 1/2 404 behavior) |

### Code changes not tied to any deliverable

- `.claude/verification-status.json` — workflow artifact (expected)
- `docs/plans/trust-schema-wiring/plan.md` — planning artifact (expected)
- `docs/plans/trust-schema-wiring/ACs.md` — planning artifact (expected)

None constitute scope creep.

---

## ACs ↔ Tests (Gate 3 spot-check, holistic)

| AC | Test file | Asserts invariant? | Notes |
|----|-----------|---------------------|-------|
| AC-TST-1 | `recommend.test.ts` "low confidence" | ✓ | Asserts `confidence === 'low'`, `data_points_used === 0`, `sources === []`, params equal method defaults — not literals pinned from seed |
| AC-TST-3 | `recommend.test.ts` "high confidence" | ✓ | 3 rating-5 brews → origin+method+roast all match → `totalWeight ≈ 3 > 1.5` → high path. Math verified: `matchScore = (3+3+2)/8 = 1.0`, `score = 1.0 × 1.0 × ~1.0 × 1.0`. Invariant correctly exercised. |
| AC-TST-5 | `recommend.test.ts` "tryLinkBrew links" | ✓ | Asserts `linked === true`, correct `recommendationId`, and spy call with exact args `(42, id, 0.85)` — mock-flow verified, not a literal trap |
| AC-TST-9 | `recommend.test.ts` "fuzzy match" | ✓ (with AC text updated in QC) | Test uses `'Ethiop'` (partial name substring) — correct. `'Yirgacheffe'` would fall through to the unknown path because `resolveOrigin` checks `name` + `aliases` only in fuzzy, not `subregion`. AC Pass cell updated to reflect actual input. |
| AC-TST-12 | `brewing.test.ts` POST /recommend | ✓ | Asserts `Array.isArray(body.sources)` and `typeof body.data_points_used === 'number'` — type-invariant checks, not literal pins |
| AC-TST-13 | `mcp-tools.test.ts` MCP recommend | ✓ | Same pattern as AC-TST-12 — type invariants, not literals |

No vacuously-passing (weak) tests found in the sampled ACs.

---

## Docs drift

### 1. `docs/API-SPEC.md:49-63` — `POST /recommend` response shape is stale

**Stale claim:** Response example shows `{ brewing_method, input, recommendation, confidence }`.  
**Actual shape** (from `src/lib/recommend.ts:212-228`): adds `id: number`, `sources: SourceRef[]`, `data_points_used: number`.  
**Also stale:** Description says *"AI-powered brew recommendation via DSPy inference"* — no DSPy; the engine is a deterministic weighted community consensus algorithm (`computeBestBrew`).  
**Action required before merge.**

### 2. `docs/API-SPEC.md` — `GET /origins` endpoint is undocumented

Endpoint exists at `src/routes/brewing.ts:10-14` (ships 20 seed origins). No entry in `docs/API-SPEC.md`.  
**Action required before merge.**

### 3. `docs/roadmap.md:12` — `recommend` Phase 2 item still marked `[ ]`

The `recommend` tool and `POST /recommend` are now wired with a real deterministic engine. The item should be checked `[x]` with a note that the implementation is deterministic consensus rather than OpenRouter/LLM. The "Depends on: OPENROUTER_API_KEY" note is also stale.  
**Action required before merge.**

### 4. `src/routes/brewing.ts:130` — Stale inline comment

Line reads: `// POST /recommend (stub — LLM wired in Phase 2)`. The route is no longer a stub; `computeBestBrew()` is a live deterministic recommendation engine.  
**Action required before merge.**

### 5. `CLAUDE.md` key files table — `GET /origins` not listed (informational)

`CLAUDE.md:18` lists `src/routes/brewing.ts` as handling `(/brewing-methods, /brews, /recommend)`. `GET /origins` is missing. Low severity — CLAUDE.md is a routing map for AI sessions, not end-user docs. Updating it would be consistent with its purpose.  
**Recommended — not blocking.**

---

## Recommendations

1. **Fix `docs/API-SPEC.md` — update POST /recommend response shape and description.** Add the three new fields (`id`, `sources`, `data_points_used`) to the example JSON. Replace "DSPy inference" with "deterministic community consensus (computeBestBrew)". Add a `GET /origins` entry.

2. **Fix `docs/roadmap.md` — mark Phase 2 `recommend` item done.** Check `[x]` with a note: "wired as deterministic community consensus engine (no OpenRouter dependency)". Remove or update the `OPENROUTER_API_KEY` dependency note.

3. **Fix `src/routes/brewing.ts:130` — remove stale stub comment.** Replace with a brief accurate description or remove the comment entirely.

4. **Follow up Task 4 partial in a future session.** The plan specified storing origin verification confidence in `field_confidence` (`1.0` if verified, `0.7` if fuzzy). The implementation calls `resolveOrigin()` and uses the `resolved` name, but discards the `verified` result — `field_confidence` is left as the caller-provided value (usually `undefined`). This is not a correctness bug (the AC Pass condition didn't require it), but it's a documented intent that was silently dropped. Consider tracking it on the roadmap or as an issue.

---

## Inputs for /retro

- **Route:** `/test-engineer` → `.claude/commands/test-engineer.md`  
  **Draft principle:** *"When the AC specifies a fuzzy/edge-case input for a function test, verify the input actually exercises the named code path before writing the test. If the spec's example input would fall through to a different path (e.g., `'Yirgacheffe'` hits the 'unknown' branch, not 'fuzzy', because `resolveOrigin` doesn't check `subregion`), substitute a valid input and update the AC Pass cell in QC — don't silently write a correct test against a misspecified AC."*  
  **Triggered by:** AC-TST-9 test/AC mismatch.

- **Route:** `/backend-architect` → `.claude/commands/backend-architect.md`  
  **Draft principle:** *"When a task spec says 'store X alongside Y' (e.g., 'set `field_confidence` from `resolveOrigin.verified`'), treat both the call and the store as required deliverables. If only the call lands without the store, flag it explicitly in the commit message or review rather than silently dropping the second half. Partial task implementations create hidden state drift that surfaces as bugs later."*  
  **Triggered by:** Task 4 partial — `resolveOrigin` wired but `field_confidence` store dropped.

- **Route:** cross-cutting → `docs/plans/` naming convention  
  **Draft principle:** *"Inline code comments that describe a route as a 'stub' or 'LLM wired in Phase N' should be removed or updated whenever the route is wired. Stale stub comments are more misleading than no comment — the next reader assumes the stub is still active."*  
  **Triggered by:** `src/routes/brewing.ts:130` stale comment surviving implementation.
