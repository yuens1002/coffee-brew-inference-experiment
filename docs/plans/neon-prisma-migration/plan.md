# Phase 4 — Neon + Prisma Migration

**Branch:** `feat/neon-prisma-migration`  
**Owner:** `/backend-architect` (DB layer, schema, seed), `/devops` (build config, env), `/test-engineer` (regression verification)  
**Source:** `docs/roadmap.md` — Phase 4 Persistent Storage

## Goal

Replace the in-process sql.js (SQLite WASM) DB with Neon Postgres + Prisma ORM.  
The function signatures in `src/lib/db.ts` remain identical — callers (`recommend.ts`, `brewing.ts`, `mcp.ts`) and tests are untouched.

## Non-goals

- No schema changes (columns, types, relationships are preserved)
- No route changes
- No test rewrites (tests mock `src/lib/db.js` at module level — they pass unchanged)

## Deliverables

| D# | Kind | Owner | File(s) |
|----|------|-------|---------|
| D1 | Prisma schema | `/backend-architect` | `prisma/schema.prisma` |
| D2 | Seed file | `/backend-architect` | `prisma/seed.ts` |
| D3 | DB layer rewrite | `/backend-architect` | `src/lib/db.ts` |
| D4 | Env config | `/backend-architect` | `.env.example` |
| D5 | Dependency swap | `/devops` | `package.json` |
| D6 | Build config | `/devops` | `package.json` scripts, `tsconfig.json` |
| D7 | Docs cleanup | `/backend-architect` | `CLAUDE.md`, `docs/architecture/overview.md`, `docs/roadmap.md`, `src/routes/brewing.ts` (stale stub comment) |
| D8 | Regression check | `/test-engineer` | `src/__tests__/*.test.ts` — verify all pass unchanged |

## Deliverable detail

### D1 — `prisma/schema.prisma`

Five models mapping 1:1 to existing tables. Field type changes from SQLite:

| SQLite type | Prisma type | Notes |
|-------------|-------------|-------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `Int @id @default(autoincrement())` | |
| `INTEGER` (0/1 for booleans) | `Boolean` | `is_verified` only |
| `INTEGER` (numeric) | `Int` | |
| `REAL` | `Float` | |
| `TEXT` (datetime) | `DateTime @default(now())` | db.ts maps to `.toISOString()` to keep `types.ts` stable |
| `TEXT` (other) | `String` | |
| `TEXT?` (optional) | `String?` | |

Composite PK on `brew_recommendation_links`: `@@id([brew_id, recommendation_id])`.

### D2 — `prisma/seed.ts`

Moves `SEED_ORIGINS` (20 entries) and `SEED_METHODS` (8 entries) from `db.ts` into a standalone seed script.  
Uses `upsert` (not `createMany`) so re-running seed is idempotent — safe to run on an existing DB.  
Registered in `package.json` under `"prisma": { "seed": "tsx prisma/seed.ts" }`.

### D3 — `src/lib/db.ts` rewrite

**Remove:** `initSqlJs`, `Database`, `getDB()`, `saveDB()`, `needsMigration()`, `SCHEMA`, `DB_PATH`, all `sql.js` raw SQL.  
**Add:** `PrismaClient` singleton (module-level `const prisma = new PrismaClient()`).  
**Keep identical:** all 11 exported function signatures and return types.

Date mapping rule: every Prisma `DateTime` field → `.toISOString()` before returning, so `created_at: string` in `types.ts` stays correct.

`findRecentRecommendation` currently does `created_at >= ?` string comparison. With Prisma/Postgres: replace with `gte: new Date(Date.now() - seconds * 1000)` on the `created_at` DateTime field.

### D4 — `.env.example`

```
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

Add note: use Neon's **direct connection URL** (port 5432) for Railway (persistent process). The pooler URL (port 6432) is for serverless/edge contexts.

### D5 — Dependency swap (`package.json`)

Remove: `sql.js`, `@types/sql.js`  
Add: `@prisma/client` (dependency), `prisma` (devDependency)

### D6 — Build config

Add npm scripts:
- `"db:generate"`: `prisma generate`
- `"db:migrate"`: `prisma migrate dev`
- `"db:seed"`: `prisma db seed`
- `"db:studio"`: `prisma studio`
- `"postinstall"`: `prisma generate` — auto-generates client after `npm install`

Add prisma seed config block:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

`tsconfig.json`: confirm `moduleResolution` is compatible with Prisma ESM. Prisma 5+ supports `"moduleResolution": "bundler"` or `"node16"`. If currently `"node"`, update to `"node16"` or `"bundler"`.

### D7 — Docs cleanup

Four stale items to fix in one sweep:

1. **`docs/architecture/overview.md`** — remove "Current gap" + "Intended improvement" sections under "Origin verification signal" (implemented in #3 / trust-schema-wiring). Update stack table to Neon + Prisma. Update `computeBestBrew` step 4 to include `originConf` multiplier (already live).

2. **`docs/roadmap.md`** — check off Phase 4 items once shipped. Check off Phase 5 "Deploy to Railway" and "Rate limiting" (already done in prior commits).

3. **`CLAUDE.md`** — update stack table: replace `sql.js (SQLite WASM...)` row with `Neon Postgres + Prisma`.

4. **`src/routes/brewing.ts:109`** — remove `// Build comparison — stub analysis for now (LLM wired in Phase 2)` comment. The route does real delta analysis; the only stub is `match_score: 0.5`, which should get its own comment explaining it awaits the feedback loop.

### D8 — Regression check

Run `npm test` on a local build with `DATABASE_URL` pointed at the Neon dev branch. All existing tests mock `src/lib/db.js` — they should pass without modification. If any test imports `sql.js` directly or relies on `getDB()`/`saveDB()`, flag and fix.

## Commit schedule

1. `docs: add plan + ACs for neon-prisma-migration`
2. `chore(deps): swap sql.js for prisma + @prisma/client`
3. `feat(db): add prisma schema + seed`
4. `feat(db): rewrite db.ts with prisma client`
5. `chore(build): add prisma scripts + postinstall generate`
6. `docs: update architecture, roadmap, CLAUDE.md for phase 4`
7. `fix: remove stale stub comment from compare_brew route`

## Railway deployment notes

After merging:
1. Set `DATABASE_URL` env var in Railway project settings (Neon direct URL)
2. Run `npx prisma migrate deploy` as a one-time migration step (can be added as a Railway deploy command)
3. Run `npx prisma db seed` once on the production DB to populate origins + methods
4. Remove the `data/` directory from Railway volume if previously mounted
