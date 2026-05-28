# Iteration 4 — Acceptance Criteria

**Plan:** `docs/plans/iteration-4/plan.md`

---

## Track A — Schema & Surface Repair

### Functional ACs

| AC | # | What | How | Pass |
|----|---|------|-----|------|
| AC-FN-A1 | A1 | `source_url` unique constraint is composite `(source_url, brewing_method_id)` | DB query / migration file | `\d brews` shows composite unique index; two brews with same `source_url` but different `brewing_method_id` insert without conflict |
| AC-FN-A2 | A2 | `variety` column exists on `brews` table | DB query | `\d brews` shows `variety TEXT` nullable column |
| AC-FN-A3 | A2 | `POST /brews` stores and echoes back variety | `curl POST /brews {variety:"heirloom"}` then `GET /brews/:id` | `GET /brews/:id` response includes `"variety":"heirloom"` |
| AC-FN-A4 | A2 | MCP `log_brew` stores variety | MCP call with variety param | Stored brew retrieved via `GET /brews/:id` has correct variety |
| AC-FN-A5 | A3 | Variety scoring discriminates between candidates | Code review: `src/lib/recommend.ts` | `matchScore` reads `brew.variety`, not `originVarieties.get(origin)` — per-brew comparison, not per-origin constant |
| AC-FN-A6 | A4 | MCP `recommend` `origin` is optional | MCP call without origin param | Tool executes without Zod validation error; returns recommendation based on method/roast only |
| AC-FN-A7 | A5 | MCP `log_brew` accepts `source_url` with URL validation | MCP call with `source_url:"not-a-url"` | Returns MCP error for invalid URL format |
| AC-FN-A8 | A5 | MCP `log_brew` merges `field_confidence` — matches REST behaviour | Code review: `src/routes/mcp.ts` | `log_brew` handler applies same merge logic as `POST /brews` (spread user-supplied confidence, overwrite with server-computed origin confidence) |

---

## Track B — Vote Endpoint

### Functional ACs

| AC | # | What | How | Pass |
|----|---|------|-----|------|
| AC-FN-B1 | B1 | `POST /recommend/:id/vote` accepts `{ vote: "up" }` | `curl POST /recommend/1/vote {"vote":"up"}` | Returns `{ thumbs_up: 1, thumbs_down: 0 }` (or updated counts); 200 status |
| AC-FN-B2 | B1 | `POST /recommend/:id/vote` rejects invalid vote values | `curl POST /recommend/1/vote {"vote":"sideways"}` | Returns 400 |
| AC-FN-B3 | B1 | `POST /recommend/:id/vote` returns 404 for unknown recommendation | `curl POST /recommend/99999/vote {"vote":"up"}` | Returns 404 |
| AC-FN-B4 | B2 | `POST /recommend` for a brand-new recommendation returns `thumbs_up: 0, thumbs_down: 0` without a getVoteCounts DB call | Code review: `src/lib/recommend.ts` | New recommendation path does not call `getVoteCounts`; returns zero counts inline |
| AC-FN-B5 | B2 | `POST /recommend` for an existing (cached) recommendation returns real vote counts | `curl POST /recommend` twice with same params; after a vote, second call shows updated counts | Second response `thumbs_up` reflects any votes cast on the cached recommendation |
| AC-FN-B6 | B3 | Landing page vote buttons call `POST /recommend/:id/vote` | Browser devtools network tab | Clicking thumbs up/down issues a POST to `/recommend/:id/vote`; button highlights after call |
| AC-FN-B7 | B4 | Result card displays `thumbs_up` / `thumbs_down` counts from recommendation response | Browser | Vote count numbers visible in result card immediately after recommendation loads |

---

## Test Coverage ACs

| AC | # | What | How | Pass |
|----|---|------|-----|------|
| AC-TST-1 | C3 | Variety scoring invariant: matching brew scores higher | `npm test` | `recommend.test.ts` asserts `matchScore(brewWithMatchingVariety, params) > matchScore(brewWithDifferentVariety, params)` where only variety differs |
| AC-TST-2 | C4 | `user_vote` flows through `POST /recommend/:id/vote` | `npm test` | `brewing.test.ts` asserts mock `recordVote` called with correct `recommendation_id` and `vote` value |
| AC-TST-3 | C5 | MCP `log_brew` rejects `rating: 0` and `rating: 6` | `npm test` | `mcp-tools.test.ts` asserts MCP error response for out-of-range ratings |
| AC-TST-4 | C6 | MCP `compare_brew` returns live `match_score` from link | `npm test` | `mcp-tools.test.ts` mocks `getBrewLinks` returning `[{match_confidence: 0.82}]` and asserts response `match_score === 0.82` |
| AC-TST-5 | all | All tests pass | `npm test` | 0 failures (count will increase with new tests) |
| AC-TST-6 | all | TypeScript build clean | `npm run build` | 0 type errors |

---

## Docs ACs

| AC | # | What | How | Pass |
|----|---|------|-----|------|
| AC-DOC-1 | C1 | `GET /brewing-methods` response example includes `technique` field | Code review: `docs/API-SPEC.md` | Example JSON shows `technique` object matching actual `BrewTechnique` shape for the method |
| AC-DOC-2 | C1 | `GET /origins` response example includes `variety` field | Code review: `docs/API-SPEC.md` | Example JSON shows `"variety": "heirloom"` for Ethiopia entry |
| AC-DOC-3 | C1 | `POST /recommend` response example includes `thumbs_up`, `thumbs_down`, and `variety` in `input` | Code review: `docs/API-SPEC.md` | Example JSON shows all three fields matching `src/types.ts:Recommendation` |
| AC-DOC-4 | C1 | `POST /recommend/:id/vote` endpoint documented in API-SPEC | Code review: `docs/API-SPEC.md` | New endpoint section with request body, response shape, and error cases |
| AC-DOC-5 | C2 | `docs/architecture/overview.md` shows `compare_brew` as fully implemented | Code review | No "Stub" or "planned" label on `compare_brew` row; status shows implemented with file references |
| AC-DOC-6 | C8 | `.env.example` exists with `DATABASE_URL=` placeholder | File exists check | `cat .env.example` shows `DATABASE_URL=` line; README `cp .env.example .env` instruction resolves correctly |

---

## Regression ACs

| AC | # | What | How | Pass |
|----|---|------|-----|------|
| AC-REG-1 | all | All existing tests pass | `npm test` | 0 failures across all 4 test files |
| AC-REG-2 | all | TypeScript build clean | `npm run build` | 0 type errors, 0 warnings |
| AC-REG-3 | A1 | Seed data still inserts 32 brews on fresh DB | `prisma db seed` on clean DB | `32 new brews inserted (0 already existed)` |
| AC-REG-4 | A2 | `POST /brews` without variety still works | `curl POST /brews` without variety field | 201 response; `GET /brews/:id` shows `variety: null` |
| AC-REG-5 | B1 | Existing `POST /recommend` response shape unchanged | `curl POST /recommend` | Response still includes all fields from iteration 3 (`sources`, `data_points_used`, `technique`, `confidence_breakdown`) |
