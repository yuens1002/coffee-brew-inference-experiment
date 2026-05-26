# /review — Unify Data Model to API-SPEC

**Branch:** feat/unified-data-model | **Date:** 2026-05-25  
**PR:** [#2](https://github.com/yuens1002/brew-guide/pull/2)

---

## Verdict: Minor Issues

One docs file out of date (README.md). All other surfaces aligned. Ready for human review after README fix.

---

## Deliverables ↔ Code

| ID | Deliverable | Status | File |
|----|-------------|--------|------|
| D1 | types.ts — snake_case types matching API-SPEC | ✅ shipped | src/types.ts:1-70 |
| D2 | db.ts — new schema, getBrews(), getBrewById() | ✅ shipped | src/lib/db.ts:1-219 |
| D3 | GET /brews — DB query with filters | ✅ shipped | src/routes/brewing.ts:16-30 |
| D4 | GET /brews/:id | ✅ shipped | src/routes/brewing.ts:61-69 |
| D5 | GET /brews/:id/compare — delta analysis | ✅ shipped | src/routes/brewing.ts:72-98 |
| D6 | POST /recommend — structured response | ✅ shipped | src/routes/brewing.ts:101-129 |
| D7 | MCP tools updated — 5 tools, snake_case | ✅ shipped | src/routes/mcp.ts:1-190 |
| D8 | Tests — 31/31 passing | ✅ shipped | 3 test files |
| D9 | Removed mcp-server legacy | ✅ shipped | mcp-server/ deleted |
| D10 | Master plan | ✅ shipped | docs/plans/mvp-autonomous/plan.md |

---

## REST ↔ Landing Page

| Endpoint | Landing calls? | Route shape match? | Verdict |
|----------|---------------|-------------------|---------|
| `GET /brewing-methods` | line 196 | fields: id, name, default_temp_c, default_brew_time_s, grind_size, description | ✅ |
| `POST /recommend` | line 263 | fields: brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s | ✅ |
| `POST /brews` | line 310 | fields: same + rating, notes | ✅ |
| `GET /brews/:id/compare` | line 350 | reads: user_brew.{water_temp_c, ratio, brew_time_s, grind_size, rating}, ai_recommendation.*, analysis, match_score | ✅ |

**All 4 endpoints called by the landing page now exist with correct field names.** No drift.

---

## REST ↔ MCP Tool Parity

| Surface | REST shape | MCP shape | Match? |
|---------|-----------|-----------|--------|
| brewing methods | `BrewingMethod[]` | `JSON.stringify(methods)` | ✅ Same type |
| recommend | `Recommendation { brewing_method, input, recommendation, confidence }` | Same object shape | ✅ |
| log brew | `{ id: number, message: string }` | `{ id, message }` | ✅ |
| compare brew | `{ brew_id, user_brew, ai_recommendation, analysis, match_score }` | Same shape | ✅ |
| search brews | `{ count, brews: BrewWithMethod[] }` | `JSON.stringify(result)` | ✅ |

**REST and MCP expose identical data shapes.** 5/5 tools in sync.

---

## Data Model

| Layer | Fields | Consistency |
|-------|--------|-------------|
| types.ts | All snake_case, number IDs | ✅ |
| db.ts schema | Matching columns + types | ✅ |
| db.ts seed data | 8 methods, ratio as REAL | ✅ |
| brewing.ts Zod | Matches types.ts shapes | ✅ |
| mcp.ts Zod | Matches types.ts shapes | ✅ |
| Tests mocks | Match types.ts | ✅ |

**No type mismatches.** Snake_case unified across all surfaces.

---

## Docs Drift

| File | Claim | Status |
|------|-------|--------|
| `docs/API-SPEC.md` | Base URL localhost:4000 | ✅ Correct |
| `docs/architecture/overview.md` | Module map, tool status, data model | ✅ Matches code |
| `docs/roadmap.md` | Phase 2-5 planned | ✅ Still valid (we fixed stubs, LLM still pending) |
| `CHANGELOG.md` | 1.0.1 release notes | ⚠️ Missing v2.0.0 entry |
| `README.md` | Mentions DSPy, Python, better-sqlite3, db/ dir | ❌ Drifted — stack changed |

### README Drift Details

| Claim in README | Reality |
|-----------------|---------|
| "DSPy (Python, brew inference pipeline)" | No DSPy wired yet; recommend is stub (Phase 2) |
| "SQLite (sample brew database via better-sqlite3)" | Uses sql.js (WASM), not better-sqlite3 |
| Structure shows `db/` directory | Schema is inline in `src/lib/db.ts` |
| Structure shows `inference/` directory | Exists but Python-only reference code |

---

## Test Coverage

| Metric | Value |
|--------|-------|
| Test files | 3 |
| Tests | 31 |
| Passed | 31 |
| Failed | 0 |
| New routes tested | GET /brews, GET /brews/:id, GET /brews/:id/compare, POST /recommend ✅ |
| New MCP tools tested | search_brews, compare_brew ✅ |
| TypeScript errors | 0 ✅ |

---

## Recommendations

1. **Fix README.md** — Update stack description (sql.js instead of better-sqlite3, remove DSPy claim until Phase 2, update dir structure)
2. **Add CHANGELOG entry** — v2.0.0: data model migration to snake_case, stub fixes, new routes
3. **Bump version** — package.json from 1.0.1 → 2.0.0 (breaking data model change)

---

*Review generated per agentic-workflow Phase 4.5 — coffee-brew-review skill.*
