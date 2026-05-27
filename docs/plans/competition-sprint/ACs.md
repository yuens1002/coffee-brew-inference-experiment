# Competition Sprint — Acceptance Criteria

**Plan:** `docs/plans/competition-sprint/plan.md`  
**Deadline:** May 31, 2026

---

## Functional ACs

| AC | D# | What | How | Pass |
|----|----|------|-----|------|
| AC-FN-1 | D1 | Scraper inserts Pour Over brews from ≥5 roasters | Code review: `scripts/scrape-roasters.ts` + DB query | Script exists; `SELECT count(*) FROM brews WHERE source='scraped:roaster' AND brewing_method_id=1` returns ≥20 rows |
| AC-FN-2 | D1 | Scraper inserts Espresso brews from ≥3 roasters | DB query | `SELECT count(*) FROM brews WHERE source='scraped:roaster' AND brewing_method_id=3` returns ≥10 rows |
| AC-FN-3 | D1 | All scraped brews have valid origin (resolved) | DB query | No rows where `origin IS NULL` or `field_confidence` JSON missing `origin` key |
| AC-FN-4 | D2 | `brewing_methods` table has `technique` column | Code review: migration SQL | Migration file exists; column present in Prisma schema |
| AC-FN-5 | D2 | All 8 methods have non-null technique data | DB query | `SELECT count(*) FROM brewing_methods WHERE technique IS NULL` returns 0 |
| AC-FN-6 | D2 | Technique data is technically accurate | Code review: `prisma/seed.ts` | Pour Over: bloom_weight_ratio=2, bloom_duration_s=45; Espresso: yield_ratio=2, shot_time_s≈28; others match established specialty coffee standards |
| AC-FN-7 | D3 | `POST /recommend` response includes `technique` field | E2E: `curl -X POST .../recommend -d '{"brewing_method_id":1,"origin":"Ethiopia","roast_level":"light"}'` | Response JSON contains `technique` key with pour-over technique object (bloom_weight_ratio, pour_stages, etc.) |
| AC-FN-8 | D3 | MCP `recommend` tool returns `technique` | E2E: MCP tool call | Tool result includes `technique` in structured output |
| AC-FN-9 | D4 | `GET /brews/:id/compare` returns real match_score when link exists | E2E: log a brew after a recommend, then compare | `match_score` is not 0.5 hardcoded; reflects `match_confidence` from `brew_recommendation_links` |
| AC-FN-10 | D4 | `compare_brew` falls back to 0.5 when no link | E2E: compare a brew that had no prior recommend | `match_score: 0.5` returned with no error |

---

## End-to-End ACs

| AC | D# | What | How | Pass |
|----|----|------|-----|------|
| AC-E2E-1 | D5 | Production DB has scraped brew data | E2E: `curl https://brew-guide-production.up.railway.app/brews?limit=20` | Response includes entries with `source: "scraped:roaster"` |
| AC-E2E-2 | D5 | Production `recommend` returns technique | E2E: live recommend call | `technique` field present and non-null in production response |
| AC-E2E-3 | D6 | Landing page loads and renders | Browser: visit production landing page URL | Page loads; headline visible; demo widget visible |
| AC-E2E-4 | D6 | Demo widget returns live results | Browser: select Ethiopian / Pour Over / Light → submit | Recommendation card appears with params and technique steps within 3s |
| AC-E2E-5 | D6 | Landing page is mobile responsive | Browser: mobile viewport | No horizontal scroll; demo widget usable on 375px width |

---

## Docs ACs

| AC | D# | What | How | Pass |
|----|----|------|-----|------|
| AC-DOC-1 | D3 | `docs/API-SPEC.md` updated with technique field | Code review | `POST /recommend` response example includes `technique` object |
| AC-DOC-2 | D7 | Competition entry draft complete | Review: `docs/competition-entry.md` | All 4 sections present (what it is, how Hermes built it, MCP angle, what's next); addresses all 4 judging criteria |
| AC-DOC-3 | D7 | Entry published on DEV.to | Manual verification | Live DEV.to URL with "Build With Hermes Agent" challenge tag |

---

## Test Coverage ACs

| AC | D# | What | How | Pass |
|----|----|------|-----|------|
| AC-TST-1 | D2/D3 | All existing tests pass after schema change | `npm test` | 0 failures; test count ≥ 53 |
| AC-TST-2 | D3 | `recommend` response shape includes technique in test assertions | Code review: `src/__tests__/brewing.test.ts` | At least one test asserts `typeof body.technique === 'object'` |
| AC-TST-3 | all | TypeScript build clean | `npm run build` | 0 type errors |
