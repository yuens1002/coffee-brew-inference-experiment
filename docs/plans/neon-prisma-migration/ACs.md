# Phase 4 — Neon + Prisma Migration: Acceptance Criteria

**Branch:** `feat/neon-prisma-migration`  
**Plan:** `docs/plans/neon-prisma-migration/plan.md`

---

## Functional Acceptance Criteria

| AC | Plan ref | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|-----|------|-------|----|----------|
| AC-FN-1 | D1 | `prisma/schema.prisma` declares all 5 models | Code review: `prisma/schema.prisma` | File exists; contains models `Origin`, `BrewingMethod`, `Brew`, `Recommendation`, `BrewRecommendationLink`; datasource provider is `postgresql` | | | |
| AC-FN-2 | D1 | `BrewRecommendationLink` uses composite PK | Code review: `prisma/schema.prisma` | Model contains `@@id([brew_id, recommendation_id])` | | | |
| AC-FN-3 | D2 | `prisma/seed.ts` seeds origins and methods | Code review: `prisma/seed.ts` | File exists; contains 20 origin upserts and 8 brewing method upserts; uses `upsert` not `createMany` | | | |
| AC-FN-4 | D3 | `src/lib/db.ts` uses Prisma — no sql.js | Code review: `src/lib/db.ts` | File contains no import of `sql.js` or `initSqlJs`; contains `PrismaClient` import; all 11 functions present (`getOrigins`, `searchOrigins`, `getBrewingMethods`, `getBrews`, `getBrewById`, `addBrew`, `createRecommendation`, `getRecommendation`, `findRecentRecommendation`, `linkBrewToRecommendation`, `getBrewLinks`) | | | |
| AC-FN-5 | D3 | `created_at` fields returned as ISO strings | Code review: `src/lib/db.ts` | Every function that maps a Prisma result calls `.toISOString()` on DateTime fields before returning; `types.ts` is unchanged | | | |
| AC-FN-6 | D3 | `findRecentRecommendation` uses Prisma date filter | Code review: `src/lib/db.ts` | Function uses `gte: new Date(...)` on `created_at` field — no string comparison | | | |
| AC-FN-7 | D4 | `.env.example` documents `DATABASE_URL` | Code review: `.env.example` | File exists; contains `DATABASE_URL` key with a Neon-style placeholder value and comment distinguishing direct vs pooler URL | | | |
| AC-FN-8 | D5 | `sql.js` removed from dependencies | Code review: `package.json` | `package.json` has no `sql.js` or `@types/sql.js` entries; has `@prisma/client` in `dependencies` and `prisma` in `devDependencies` | | | |
| AC-FN-9 | D6 | Prisma scripts present in `package.json` | Code review: `package.json` | Scripts include `db:generate`, `db:migrate`, `db:seed`, `db:studio`; `postinstall` runs `prisma generate`; `prisma.seed` config points to `tsx prisma/seed.ts` | | | |

---

## End-to-End Acceptance Criteria

| AC | Plan ref | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|-----|------|-------|----|----------|
| AC-E2E-1 | D3 | `POST /brews` persists a brew to Neon | E2E: `curl -s -X POST http://localhost:4000/brews -H "Content-Type: application/json" -d '{"brewing_method_id":1,"origin":"Ethiopia","roast_level":"light","grind_size":"medium-fine","water_temp_c":91,"ratio":0.0625,"brew_time_s":200,"rating":5}'` | Response is `{"id":<number>,"message":"Brew record added successfully"}` with HTTP 201 | | | |
| AC-E2E-2 | D3 | `POST /recommend` returns community data | E2E: `curl -s -X POST http://localhost:4000/recommend -H "Content-Type: application/json" -d '{"origin":"Ethiopia","roast_level":"light","brewing_method_id":1}'` | Response contains `brewing_method: "Pour Over"`, `confidence` field, and `sources` array | | | |
| AC-E2E-3 | D3 | `GET /origins` returns seeded origins | E2E: `curl -s http://localhost:4000/origins` | Response is a JSON array with ≥20 entries; first entry has `name`, `region`, `is_verified` fields | | | |
| AC-E2E-4 | D3 | `GET /brewing-methods` returns seeded methods | E2E: `curl -s http://localhost:4000/brewing-methods` | Response is a JSON array with exactly 8 entries; includes `"Pour Over"` and `"French Press"` | | | |

---

## Docs Acceptance Criteria

| AC | Plan ref | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|-----|------|-------|----|----------|
| AC-DOC-1 | D7 | `docs/architecture/overview.md` — stale gap sections removed | Code review: `docs/architecture/overview.md` | "Current gap" and "Intended improvement" subsections under "Origin verification signal" are absent; stack table row shows Neon + Prisma (not sql.js) | | | |
| AC-DOC-2 | D7 | `docs/roadmap.md` — Phase 4 checked off | Code review: `docs/roadmap.md` | All three Phase 4 bullets are checked (`[x]`); Phase 5 "Deploy to Railway" and "Rate limiting" bullets are checked | | | |
| AC-DOC-3 | D7 | `CLAUDE.md` stack table updated | Code review: `CLAUDE.md` | DB row reads `Neon Postgres + Prisma` (no mention of sql.js) | | | |
| AC-DOC-4 | D7 | Stale stub comment removed from `compare_brew` route | Code review: `src/routes/brewing.ts` | Line 109 no longer contains `// stub analysis for now (LLM wired in Phase 2)` | | | |

---

## Test Coverage Acceptance Criteria

| AC | Plan ref | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|-----|------|-------|----|----------|
| AC-TST-1 | D8 | All existing tests pass without modification | Test run: `npm test` | All tests pass; 0 failures; no test file imports `sql.js` or calls `getDB`/`saveDB` directly | | | |
| AC-TST-2 | D8 | TypeScript build is clean | Test run: `npm run build` | `tsc` exits 0; 0 type errors; `dist/` contains compiled output | | | |

---

## Regression Acceptance Criteria

| AC | Plan ref | What | How | Pass | Agent | QC | Reviewer |
|----|----------|------|-----|------|-------|----|----------|
| AC-REG-1 | D8 | All existing tests pass | Test run: `npm test` | Same count of passing tests as on `main`; 0 failures | | | |
| AC-REG-2 | D8 | Precheck passes | Test run: `npm run build` | 0 TypeScript errors | | | |
