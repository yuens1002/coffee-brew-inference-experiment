# Trust Schema — Wiring & Test Coverage Plan

> **Created:** 2026-05-26 | **Status:** Ready for implementation  
> **Branch:** `feat/trust-schema`  
> **Baseline:** 31 tests green, TypeScript clean  
> **Parent:** `docs/roadmap.md` Phase 3 (Grounded Retrieval)

---

## Context

Two commits landed on `feat/trust-schema` without completing the wiring:

1. **`1c0b8f6` trust schema** — origins table (20 seed rows), recommendations table, brew_recommendation_links table, new brews columns (`source`, `source_url`, `field_confidence`), 7 new DB functions, `GET /origins` REST endpoint, 8 new types.
2. **`d5aab56` recommend engine** — `src/lib/recommend.ts`: `computeBestBrew()`, `tryLinkBrew()`, `resolveOrigin()`, `railway.toml`.

### What is NOT yet wired

| Code | Location | Missing connection |
|------|----------|--------------------|
| `computeBestBrew()` | `src/lib/recommend.ts` | `POST /recommend` (REST) still returns stub |
| `computeBestBrew()` | `src/lib/recommend.ts` | MCP `recommend` tool still returns stub |
| `tryLinkBrew()` | `src/lib/recommend.ts` | `POST /brews` never calls it |
| `resolveOrigin()` | `src/lib/recommend.ts` | Nothing calls it |

### What is NOT tested

- `GET /origins` REST endpoint — no test at all
- `computeBestBrew()` — all confidence paths untested
- `tryLinkBrew()` — both paths untested
- `resolveOrigin()` — all 4 resolution paths untested
- 7 new DB functions — not tested (and not mocked in existing test files)

---

## Task Breakdown

### Task 1 — Wire `computeBestBrew()` into REST `POST /recommend`

**Files:** `src/routes/brewing.ts`

**What to build:**
- Import `computeBestBrew` from `../lib/recommend.js`
- Replace the inline stub logic in `POST /recommend` with a call to `computeBestBrew(params)`
- The route already has the correct `recommendSchema` — no schema changes needed
- Return the `Recommendation` object directly (it already matches the response contract)
- Keep the `404` guard: if `brewing_method_id` is provided but doesn't match, throw before calling `computeBestBrew`

**Acceptance Criteria:** → see AC doc (AC-FN-1, AC-FN-2)

---

### Task 2 — Wire `computeBestBrew()` into MCP `recommend` tool

**Files:** `src/routes/mcp.ts`

**What to build:**
- Import `computeBestBrew` from `../lib/recommend.js`
- Replace the inline stub in the `recommend` tool handler with `computeBestBrew()`
- Pass `{ origin, roast_level, brewing_method_id, grind_size }` as `RecommendationParams`
- Wrap in try/catch — on `'Brewing method not found'` error, return `isError: true`
- Return `JSON.stringify(result)` where `result` is the full `Recommendation`

**Acceptance Criteria:** → see AC doc (AC-FN-3, AC-FN-4)

---

### Task 3 — Wire `tryLinkBrew()` into `POST /brews`

**Files:** `src/routes/brewing.ts`

**What to build:**
- Import `tryLinkBrew` from `../lib/recommend.js`
- After `addBrew()` returns, call `tryLinkBrew(brew)` — fire and forget (do not await; don't let linking failure break the brew response)
- Response shape unchanged: `{ id, message }`

**Note:** `tryLinkBrew` does a best-effort link. Failures are silent — this is intentional (it's implicit feedback, not a required write).

**Acceptance Criteria:** → see AC doc (AC-FN-5)

---

### Task 4 — Wire `resolveOrigin()` into brew input normalization

**Files:** `src/routes/brewing.ts`, `src/routes/mcp.ts`

**What to build:**
- In `POST /brews` handler: if `origin` is provided, call `await resolveOrigin(origin)` and use `resolved` as the stored origin. Set `field_confidence` to include `origin` confidence (1.0 if `verified`, 0.7 otherwise).
- In `POST /recommend` handler (and MCP `recommend`): similarly resolve origin before passing to `computeBestBrew`.
- Import `resolveOrigin` from `../lib/recommend.js`

**Acceptance Criteria:** → see AC doc (AC-FN-6)

---

### Task 5 — Add test coverage: `src/lib/recommend.ts`

**Files:** `src/__tests__/recommend.test.ts` (new file)

**What to build:**
Mock `src/lib/db.js` with all functions used by `recommend.ts`:
`getBrewingMethods`, `getBrews`, `getBrewById`, `createRecommendation`, `findRecentRecommendation`, `linkBrewToRecommendation`, `searchOrigins`, `getOrigins`

Test cases:
- `computeBestBrew()` — no matching brews → confidence `'low'`, returns method defaults
- `computeBestBrew()` — 1–2 matches → confidence `'medium'`, blends data + defaults
- `computeBestBrew()` — ≥3 matches, totalWeight > 1.5 → confidence `'high'`, pure consensus
- `computeBestBrew()` — unknown `brewing_method_id`, methods returns `[]` → throws `'No brewing methods available'`
- `tryLinkBrew()` — recent recommendation found → `{ linked: true, recommendationId: N }`
- `tryLinkBrew()` — no recent recommendation → `{ linked: false }`
- `resolveOrigin()` — exact match → `{ resolved: 'Ethiopia', verified: true }`
- `resolveOrigin()` — alias match (`'Ethiopean'`) → `{ resolved: 'Ethiopia', verified: true }`
- `resolveOrigin()` — fuzzy match (`'Yirgacheffe'`) → `{ resolved: 'Ethiopia', verified: false }`
- `resolveOrigin()` — unknown input → `{ resolved: 'Bali Blue Moon', verified: false }`

**Acceptance Criteria:** → see AC doc (AC-TST-1 through AC-TST-10)

---

### Task 6 — Extend `brewing.test.ts`: `GET /origins` + updated mock

**Files:** `src/__tests__/brewing.test.ts`

**What to build:**
- Add `getOrigins` to the `vi.mock('../lib/db.js', ...)` factory
- Add `mockOrigins` array with 2–3 `Origin` entries
- Add `describe('GET /origins')` with:
  - Returns 200 + origins array
- Update `POST /recommend` tests to assert the new `Recommendation` shape (must have `sources`, `data_points_used`, `confidence`, `input`)

**Acceptance Criteria:** → see AC doc (AC-TST-11, AC-TST-12)

---

### Task 7 — Extend `mcp-tools.test.ts`: updated mock + recommend shape

**Files:** `src/__tests__/mcp-tools.test.ts`

**What to build:**
- Add to `vi.mock`: `createRecommendation`, `findRecentRecommendation`, `linkBrewToRecommendation`, `getOrigins`
- Update `MCP tool: recommend` tests to assert `result.sources` exists and `result.data_points_used` is a number
- `log_brew` test: mock `findRecentRecommendation` to return null (no link attempt panics)

**Acceptance Criteria:** → see AC doc (AC-TST-13)

---

## Commit Schedule

```
1. chore: extend db mock + add GET /origins test coverage        (Task 6 test setup)
2. feat: wire computeBestBrew into POST /recommend REST          (Task 1)
3. feat: wire computeBestBrew into MCP recommend tool           (Task 2)
4. feat: wire tryLinkBrew after POST /brews + resolveOrigin     (Task 3 + 4)
5. test: add recommend.ts unit tests                            (Task 5)
6. test: update mcp-tools mock + recommend shape assertions     (Task 7)
```

---

## Delegate

- **Tasks 1–4**: `/backend-architect`
- **Tasks 5–7**: `/test-engineer`
- **Verification**: `npm test && npx tsc --noEmit`
