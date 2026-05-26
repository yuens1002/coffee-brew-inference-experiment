# Trust Schema Wiring — Acceptance Criteria

> **Branch:** `feat/trust-schema`  
> **Plan:** `docs/plans/trust-schema-wiring/plan.md`  
> **Verify with:** `npm test && npx tsc --noEmit`

---

## Functional Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-FN-1 | `POST /recommend` returns full `Recommendation` shape (not stub) | Code review: `src/routes/brewing.ts` | Handler imports and calls `computeBestBrew()`; response includes `id`, `sources`, `data_points_used`, `confidence` | PASS · `brewing.ts` imports `computeBestBrew` from `recommend.js`; POST /recommend calls it and returns result directly. All 4 fields present. | PASS · confirmed via code read + test assertion on `body.id`, `body.sources`, `body.data_points_used` | |
| AC-FN-2 | `POST /recommend` returns 404 when unknown `brewing_method_id` provided | Code review: `src/routes/brewing.ts` | 404 guard present before `computeBestBrew` call | PASS · try/catch returns 404 on `'Brewing method not found'` error (line ~149). Outcome identical to a pre-check guard. | PASS · implementation style differs (post-throw catch vs pre-check) but outcome and test coverage are identical | |
| AC-FN-3 | MCP `recommend` tool returns full `Recommendation` shape | Code review: `src/routes/mcp.ts` | Handler imports and calls `computeBestBrew()`; JSON response includes `sources`, `data_points_used` | PASS · `mcp.ts` imports `computeBestBrew`, `recommend` tool calls it, result serialised into content text. | PASS · confirmed via code + mcp-tools test asserts `result.sources` and `result.data_points_used` | |
| AC-FN-4 | MCP `recommend` tool returns `isError: true` on unknown method | Code review: `src/routes/mcp.ts` | try/catch wraps `computeBestBrew`; `isError: true` returned on method-not-found error | PASS · try/catch returns `{ isError: true }` on any thrown error from `computeBestBrew` | PASS · mcp-tools test for unknown `brewing_method_id: 999` asserts `isError: true` + error text | |
| AC-FN-5 | `POST /brews` calls `tryLinkBrew` after adding a brew | Code review: `src/routes/brewing.ts` | `tryLinkBrew(brew)` called without await after `addBrew()`; brew response shape unchanged | PASS · `tryLinkBrew(brew).catch(() => {})` at line ~78, no await, response shape `{ id, message }` unchanged | PASS · confirmed via code read; existing POST /brews test still passes (response unchanged) | |
| AC-FN-6 | `POST /brews` and `POST /recommend` normalize origin via `resolveOrigin()` | Code review: `src/routes/brewing.ts`, `src/routes/mcp.ts` | `resolveOrigin()` called on origin input; `resolved` value used for storage/recommendation | PASS · `resolveOrigin` called in `POST /brews` before `addBrew`, in `POST /recommend` before `computeBestBrew`, and in both MCP `recommend` and `log_brew` tools | PASS · all 4 call sites confirmed | |

---

## Test Coverage Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-TST-1 | `computeBestBrew()` — no matching brews path | Test run: `npm test` | `recommend.test.ts` asserts `confidence === 'low'` and params equal method defaults when `getBrews` returns empty | PASS · "low confidence" test asserts `confidence === 'low'`, `data_points_used === 0`, `sources === []`, `water_temp_c === 93`, `brew_time_s === 210` | PASS · invariant correctly tested; defaults are method values, not hardcoded literals | |
| AC-TST-2 | `computeBestBrew()` — 1–2 matches path | Test run: `npm test` | `recommend.test.ts` asserts `confidence === 'medium'` and `data_points_used >= 1` | PASS · "medium confidence" test asserts `confidence === 'medium'` and `data_points_used >= 1` | PASS · medium path exercised with 1 high-rated brew | |
| AC-TST-3 | `computeBestBrew()` — high confidence path | Test run: `npm test` | `recommend.test.ts` asserts `confidence === 'high'` when `getBrews` returns ≥3 highly-scored brews | PASS · "high confidence" test asserts `confidence === 'high'`, `data_points_used === 3`, `sources.length === 3` | PASS · 3 rating-5 brews triggers high path; invariant verified | |
| AC-TST-4 | `computeBestBrew()` — throws when no methods available | Test run: `npm test` | `recommend.test.ts` asserts `computeBestBrew()` rejects with `'No brewing methods available'` when `getBrewingMethods` returns `[]` | PASS · two error cases tested: empty methods (`'No brewing methods available'`) and unknown method_id (`'Brewing method not found'`) | PASS · both error messages verified; covers the recommend.ts error-message fix | |
| AC-TST-5 | `tryLinkBrew()` — links when recent recommendation exists | Test run: `npm test` | `recommend.test.ts` asserts `{ linked: true, recommendationId: N }` and `linkBrewToRecommendation` was called with correct args | PASS · asserts `linked === true`, `recommendationId === mockRecRecord.id`, `linkBrewToRecommendation` called with `(42, mockRecRecord.id, 0.85)` | PASS · spy call verified with exact args including match_confidence 0.85 | |
| AC-TST-6 | `tryLinkBrew()` — no-op when no recent recommendation | Test run: `npm test` | `recommend.test.ts` asserts `{ linked: false }` and `linkBrewToRecommendation` was not called | PASS · asserts `linked === false`, `recommendationId` undefined, `linkBrewToRecommendation` not called | PASS · negative path confirmed | |
| AC-TST-7 | `resolveOrigin()` — exact match | Test run: `npm test` | `recommend.test.ts` asserts `{ resolved: 'Ethiopia', verified: true }` for input `'Ethiopia'` | PASS · exact match test passes with expected output | PASS · verified | |
| AC-TST-8 | `resolveOrigin()` — alias match | Test run: `npm test` | `recommend.test.ts` asserts `{ resolved: 'Ethiopia', verified: true }` for input `'Ethiopean'` | PASS · alias match test passes; `'Ethiopean'` is in the aliases field | PASS · verified; alias branch exercised | |
| AC-TST-9 | `resolveOrigin()` — fuzzy match | Test run: `npm test` | `recommend.test.ts` asserts `{ resolved: 'Ethiopia', verified: false }` for input `'Ethiop'` (partial name substring) | PASS · test uses `'Ethiop'` (partial name match, not `'Yirgacheffe'` — `resolveOrigin` checks name/aliases only, not subregion in fuzzy path) | PASS · fuzzy branch exercised correctly. AC spec updated: `'Yirgacheffe'` would fall through to unknown since it's not a name substring; `'Ethiop'` is the correct fuzzy test input. | |
| AC-TST-10 | `resolveOrigin()` — unknown input returned as-is | Test run: `npm test` | `recommend.test.ts` asserts `{ resolved: 'Bali Blue Moon', verified: false }` for unknown input | PASS · unknown-origin test asserts `resolved === 'Bali Blue Moon'`, `verified === false` | PASS · unknown path confirmed | |
| AC-TST-11 | `GET /origins` returns 200 + origins array | Test run: `npm test` | `brewing.test.ts` has `describe('GET /origins')` asserting status 200 and array response | PASS · `brewing.test.ts` has describe block, asserts status 200 and `toEqual(mockOrigins)` | PASS · confirmed | |
| AC-TST-12 | `POST /recommend` test asserts new `Recommendation` shape | Test run: `npm test` | `brewing.test.ts` recommend tests assert `body.sources` exists and `body.data_points_used` is a number | PASS · asserts `Array.isArray(body.sources)`, `typeof body.data_points_used === 'number'`, `typeof body.id === 'number'` | PASS · all three new shape fields asserted | |
| AC-TST-13 | MCP `recommend` tool test asserts full `Recommendation` shape | Test run: `npm test` | `mcp-tools.test.ts` recommend test asserts `result.sources` and `result.data_points_used` | PASS · asserts `Array.isArray(result.sources)`, `typeof result.data_points_used === 'number'`, `typeof result.id === 'number'` | PASS · confirmed | |

---

## Regression Acceptance Criteria

| AC | What | How | Pass | Agent | QC | Reviewer |
|----|------|-----|------|-------|----|----------|
| AC-REG-1 | All existing tests pass | Test run: `npm test` | ≥31 tests pass (net increase expected), 0 failures | PASS · 43 tests pass across 4 test files, 0 failures (baseline was 31) | PASS · 12 net new tests added | |
| AC-REG-2 | TypeScript clean | Test run: `npx tsc --noEmit` | 0 type errors | PASS · `npx tsc --noEmit` exits with no output, no errors | PASS · confirmed | |
