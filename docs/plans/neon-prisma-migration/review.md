# /review report — neon-prisma-migration

**Branch:** `feat/neon-prisma-migration`  
**Merged:** 2026-05-26 (PR #4)  
**Review generated:** 2026-05-27 (retroactive — written at next PM session)  
**Iterations to reach verified:** 2 (initial pass + Copilot review fix)

---

## Verdict

**Docs gap** — all functional, test, and regression ACs passed; D7 docs cleanup (AC-DOC-1 through AC-DOC-4) was not completed before merge. Four stale references persisted across CLAUDE.md, docs/architecture/overview.md, and docs/roadmap.md. Remediated in the next PM session (2026-05-27). No blocking code issues.

---

## Deliverables ↔ Code

| Deliverable | Implementation | Status |
|-------------|----------------|--------|
| D1 — `prisma/schema.prisma` | `prisma/schema.prisma` — 5 models, composite PK on BrewRecommendationLink | ✓ shipped |
| D2 — `prisma/seed.ts` | `prisma/seed.ts` — 20 origin upserts, 8 method upserts, idempotent | ✓ shipped |
| D3 — `src/lib/db.ts` rewrite | Prisma singleton, all 11 function signatures preserved, DateTime → `.toISOString()` | ✓ shipped |
| D4 — `.env.example` | `DATABASE_URL` with Neon-style placeholder and direct vs pooler note | ✓ shipped |
| D5 — Dependency swap | `sql.js` + `@types/sql.js` removed; `@prisma/client` + `prisma` added | ✓ shipped |
| D6 — Build config | `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `postinstall` scripts added | ✓ shipped |
| D7 — Docs cleanup | Four stale items — see Docs drift section below | ✗ deferred past merge |
| D8 — Regression check | All tests pass, TypeScript clean | ✓ verified |

---

## ACs ↔ Verification

| AC | Status | Notes |
|----|--------|-------|
| AC-FN-1 | ✓ Pass | `prisma/schema.prisma` declares all 5 models with `postgresql` datasource |
| AC-FN-2 | ✓ Pass | `@@id([brew_id, recommendation_id])` composite PK present |
| AC-FN-3 | ✓ Pass | 20 origin + 8 method upserts in seed.ts |
| AC-FN-4 | ✓ Pass | No sql.js imports; all 11 functions present with PrismaClient |
| AC-FN-5 | ✓ Pass | `.toISOString()` called on every DateTime field before return |
| AC-FN-6 | ✓ Pass | `findRecentRecommendation` uses `gte: new Date(...)` Prisma filter |
| AC-FN-7 | ✓ Pass | `.env.example` has `DATABASE_URL` with direct vs pooler note |
| AC-FN-8 | ✓ Pass | No sql.js in `package.json`; `@prisma/client` in deps, `prisma` in devDeps |
| AC-FN-9 | ✓ Pass | All Prisma scripts + `postinstall` present |
| AC-E2E-1 | ✓ Pass | `POST /brews` persists to Neon, returns 201 with id |
| AC-E2E-2 | ✓ Pass | `POST /recommend` returns community data with confidence + sources |
| AC-E2E-3 | ✓ Pass | `GET /origins` returns ≥20 seeded entries with correct fields |
| AC-E2E-4 | ✓ Pass | `GET /brewing-methods` returns exactly 8 entries |
| AC-DOC-1 | ✗ Not done | `docs/architecture/overview.md` stack table still said sql.js — fixed 2026-05-27 |
| AC-DOC-2 | ✗ Not done | `docs/roadmap.md` Phase 4 bullets unchecked — fixed 2026-05-27 |
| AC-DOC-3 | ✗ Not done | `CLAUDE.md` had 3 stale sql.js references — fixed 2026-05-27 |
| AC-DOC-4 | ✓ Pass | Stale stub comment removed from `src/routes/brewing.ts:109` (confirmed in git diff) |
| AC-TST-1 | ✓ Pass | All existing tests pass without modification |
| AC-TST-2 | ✓ Pass | `npm run build` exits 0, 0 type errors |
| AC-REG-1 | ✓ Pass | Same passing test count as main, 0 failures |
| AC-REG-2 | ✓ Pass | 0 TypeScript errors |

---

## Docs drift

### 1. `docs/architecture/overview.md` — stack table, module map, request flows, planned evolution

Four instances of `sql.js` remained after merge:
- Stack table: `sql.js (SQLite WASM, file-persisted at data/coffee-brew.db)`
- Module map: `sql.js wrapper`
- REST + MCP request flow diagrams: `src/lib/db.ts (sql.js)`
- Planned evolution: listed "Persistent storage — migrate from sql.js to Neon" as a future gap

All fixed 2026-05-27.

### 2. `docs/roadmap.md` — Phase 4 bullets unchecked

All three Phase 4 bullets remained `[ ]`. Also: Phase 5 "Set `DEV_SERVER_URL` → production URL" description was slightly stale.

Fixed 2026-05-27.

### 3. `CLAUDE.md` — three stale sql.js references

- Stack table: `sql.js (SQLite WASM, file-persisted at data/coffee-brew.db)`
- Key files table: `sql.js DB layer — mock this in all tests`
- Testing conventions: `sql.js WASM must never load in tests`

All fixed 2026-05-27.

### 4. `src/routes/brewing.ts:109` — stub comment (AC-DOC-4)

Confirmed removed in the PR diff. AC-DOC-4 passes.

---

## Inputs for /retro

- **Route:** `/project-manager`  
  **Principle:** *"Docs ACs (AC-DOC-*) must be verified and signed off in the same iteration as the functional and test ACs. They are never deferred past merge. Docs cleanup is a first-class deliverable, not optional scope. Before closing any iteration, run a stale-docs grep across the affected artifacts."*  
  **Triggered by:** AC-DOC-1, AC-DOC-2, AC-DOC-3 all deferred past merge.
