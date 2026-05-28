# /review — Codebase Health Audit (pre-iteration-4)

**Branch:** `main` (post-patch `2e98708`)
**Generated:** 2026-05-28
**Scope:** Cross-iteration holistic audit — no single plan; maps current code, tests, and docs against each other

---

## Step 0: Role Context

This audit is not tied to a single deliverables list. De-facto owning roles by finding area:

- `/backend-architect` → `src/lib/`, `src/routes/`, `prisma/`, REST–MCP surface parity
- `/test-engineer` → `src/__tests__/`, AC–test invariant alignment
- `/devops` → schema migrations, deployment config, .env conventions
- `/project-manager` → docs drift, API-SPEC staleness, roadmap alignment

Role skill files read: `.claude/commands/backend-architect.md`, `.claude/commands/test-engineer.md`, `~/.claude/commands/devops.md`.

---

## Verdict

**Major issues.** Five active data/API bugs and one architectural schema problem are confirmed. Documentation drift is pervasive (API-SPEC, architecture overview, README). Test coverage has two meaningful gaps on shipped features. These should be addressed in iteration 4 before adding new functionality.

---

## Section 1 — Schema & Data Integrity

### S1: `source_url @unique` is architecturally wrong for the scraper

**File:** `prisma/schema.prisma:50`

```prisma
source_url  String?  @unique
```

The patch fixed the seed data by adding `#origin-roast` fragments. But the constraint itself prevents the scraper (`scripts/scrape-roasters.ts`) from submitting multiple brews from the same roaster page — which is its primary use case. A single roaster guide URL (e.g. `https://bluebottlecoffee.com/brewing-guides`) produces multiple brews (pour over, espresso, etc.). Only the first insert succeeds; subsequent inserts with the same base URL are rejected even with different brewing methods.

**Correct model:** uniqueness should be `(source_url, brewing_method_id)` (composite) or source_url should lose `@unique` and rely on application-level deduplication. Neither is a trivial change — requires a migration to drop the index and optionally add a composite one.

**Contradicting code:** `scripts/scrape-roasters.ts` header says it submits multiple brews per page. The unique constraint makes all but the first silent failures.

---

### S2: `variety` accepted by `POST /brews` but never stored

**Files:** `src/routes/brewing.ts:47`, `src/lib/db.ts`, `prisma/schema.prisma`

`brewSchema` includes `variety: z.string().optional()`. The `Brew` model has no `variety` column. `addBrew()` receives the parsed body but the field is silently discarded. The origin combobox sends `variety` to both `/recommend` and `/brews`; the recommend path uses it for scoring (after the B2 patch lands), the brews path silently drops it.

**Impact:** Users expect logged brews to reflect the variety they selected. The variety scoring logic in `computeBestBrew` cannot differentiate candidates until `variety` is stored per brew.

---

## Section 2 — REST ↔ MCP Surface Asymmetries

### A1: `origin` required in MCP `recommend`, optional in REST

**Files:** `src/routes/mcp.ts:34`, `src/routes/brewing.ts:144`

- MCP: `origin: z.string().describe(...)` — not `.optional()`
- REST: `origin: z.string().optional()`

Both route through the same `computeBestBrew`. The MCP tool will throw a Zod validation error if called without an origin; the REST endpoint degrades gracefully. AI agent callers following the MCP schema are given a stricter contract than curl callers.

### A2: `variety` in MCP `recommend` but not in MCP `log_brew`

**Files:** `src/routes/mcp.ts:38` (recommend), `src/routes/mcp.ts:54–68` (log_brew)

`recommend` accepts `variety`; `log_brew` does not. REST `POST /brews` accepts it. The MCP surface is internally inconsistent: an agent can request a recommendation by variety but cannot log a brew with variety. Plan item #9 (iteration-3) explicitly required variety in MCP `log_brew`.

### A3: `source_url` validated as URL in REST, absent from MCP `log_brew`

**Files:** `src/routes/brewing.ts:56`, `src/routes/mcp.ts:54–68`

REST enforces `z.string().url()` on `source_url`. MCP `log_brew` has no `source_url` input at all. Agent-submitted brews cannot carry provenance URLs.

### A4: `field_confidence` merging differs between REST and MCP

**Files:** `src/routes/brewing.ts:62–70`, `src/routes/mcp.ts:72–74`

REST `POST /brews` merges any client-supplied `field_confidence` JSON with server-computed origin confidence. MCP `log_brew` only computes origin confidence — a client-supplied `field_confidence` is silently ignored. REST and MCP calls to the same underlying `addBrew()` produce different stored confidence values.

---

## Section 3 — Docs Drift

### D1: API-SPEC `GET /brewing-methods` missing `technique` field

**File:** `docs/API-SPEC.md` (lines 30–45) — example response shows no `technique`

`src/types.ts:BrewingMethod` includes `technique?: BrewTechnique | null`. `getBrewingMethods()` returns it. Seed data populates it for all 8 methods. The spec example is stale.

### D2: API-SPEC `GET /origins` missing `variety` field

**File:** `docs/API-SPEC.md` (lines 11–26)

`src/types.ts:Origin` includes `variety?: string`. `getOrigins()` returns it. Added in iteration 3. The spec example has not been updated.

### D3: API-SPEC `POST /recommend` response missing `thumbs_up`, `thumbs_down`, `variety` in `input`

**File:** `docs/API-SPEC.md` (lines 64–90) — carried from internal iteration-3 review (AC-DOC-2, still unresolved)

`src/types.ts:Recommendation` defines `thumbs_up?: number`, `thumbs_down?: number`. `recommend.ts:256–269` includes both in the response. Neither appears in the spec example.

### D4: API-SPEC `technique` response shape contradicts code

**File:** `docs/API-SPEC.md` vs `src/types.ts:214–223`

The spec shows a flat generic technique object (`method_id`, `pour_stages: 3`, `target_drawdown_s`). The code has a discriminated union of method-specific technique types (PourOverTechnique, EspressoTechnique, etc.) with nested `pour_stages` as an array of objects. The spec example reflects neither the type definitions nor the seed data.

### D5: `docs/architecture/overview.md` marks `compare_brew` as a stub

**File:** `docs/architecture/overview.md:64`

> `compare_brew | ⚠️ Stub | Delta vs method defaults — real scoring planned for Phase 2`

`compare_brew` is fully implemented in `src/routes/brewing.ts:99–139` and `src/routes/mcp.ts:119–151`. Phase 2 is marked complete in `docs/roadmap.md`. The architecture doc has not been updated since before Phase 2 shipped.

### D6: README test count stale (53 → 56)

**File:** `README.md:15`, `README.md:110` — carried from iteration-3 patch review

Both lines say "53 tests". Current suite: 56 passing.

### D7: Docs claim "Node 24"; Railway runs Node 18.20.5

**File:** `README.md:11`, `CLAUDE.md:5`, `.claude/commands/backend-architect.md:8` — carried from iteration-3 patch review

The hotfix for `import.meta.dirname` was required precisely because production is on Node 18. Either pin production to Node 24 via `nixpacks.toml` or update all three docs to reflect the actual runtime.

### D8: `.env.example` referenced in README but missing from repo

**File:** `README.md:103`

> `cp .env.example .env`

No `.env.example` exists in the repository. New contributors following the README will hit a missing-file error.

---

## Section 4 — ACs ↔ Tests (Gate 3 spot-check)

### AC-TST-2: Variety matchScore weighting — MISSING

**File:** `src/__tests__/recommend.test.ts`

No test calls `matchScore` (or `computeBestBrew`) with two brews differing only in `variety` and asserts the variety-matching brew scores higher. Tests mock `getVoteCounts` and reference `variety` in type fixtures, but no test exercises the scoring invariant. Pre-existing weakness from iteration 3, re-confirmed here.

### AC-TST-3: `user_vote` storage — MISSING

**File:** any test file

No test writes a `user_vote` to `brew_recommendation_links` and reads it back. Schema column exists; type is declared; nothing verifies round-trip. Pre-existing weakness from iteration 3.

### MCP rating bounds — MISSING

**File:** `src/__tests__/mcp-tools.test.ts`

REST `POST /brews` has a test (brewing.test.ts) verifying a rating of 0 or 6 returns 400. MCP `log_brew` has `z.number().int().min(1).max(5)` validation but no equivalent test. Per the test-engineer skill: "MCP-path tests must mirror REST-path coverage."

### match_score fallback — WEAK (literal pin)

**File:** `src/__tests__/brewing.test.ts:354–365`

```ts
expect(body.match_score).toBe(0.5);
```

Asserts the literal `0.5` without checking that it comes from the "no links" fallback branch vs. a coincidental computation. There is also no test that verifies the live-link path (`match_score` comes from `links[0].match_confidence`). Per the test-engineer skill, MCP `compare_brew` has no live-link test at all — only the 0.5 fallback.

---

## Section 5 — Additional Code Quality Findings

### Q1: Unused `searchOrigins` function in `src/lib/db.ts`

`db.ts` exports `searchOrigins()`. No route or tool calls it. Dead export. Should be removed or wired to a `GET /origins?q=` endpoint (which doesn't exist).

### Q2: Unsafe Prisma → type casts (medium risk)

**File:** `src/lib/db.ts:46, 85, 108, 145`

```ts
technique: r.technique as BrewTechnique | null,
source: (r.source as BrewSource) || 'user_submitted',
```

Prisma returns `Json` / `string`. Both casts skip validation. If the DB contains a row with an unexpected `source` value (not in the BrewSource union), the cast silences it and downstream code operates on invalid data. The `|| 'user_submitted'` fallback on `source` is also redundant — the DB schema has `@default("user_submitted")`.

### Q3: `data_points_used` field name is misleading

**File:** `src/lib/recommend.ts` (response assembly)

`data_points_used` in the response holds `topN.length` (number of matching brews used in consensus). A reader expects "how many data points (parameters) did the client supply?" — which is a different variable (`dataPoints`). The field name should be `matching_brews_used` or the semantics should be documented.

### Q4: `POST /brews` and MCP `log_brew` don't echo the created resource

**Files:** `src/routes/brewing.ts:87`, `src/routes/mcp.ts:81`

Both return `{ id, message }`. Clients must issue a follow-up `GET /brews/:id` to see timestamps, resolved origin, or stored confidence. Standard REST practice is to return the created resource on a 201 response.

---

## Prioritised Recommendations for Iteration 4

### Must-fix (blocks correct behavior)

1. **Fix `source_url` uniqueness strategy** — either drop `@unique` and rely on application-level deduplication, or change to a composite unique index `(source_url, brewing_method_id)`. Requires schema migration. (Blocks scraper and any multi-brew-per-URL workflow.)

2. **Add `variety` to `Brew` model + wire through** — schema migration, `addBrew()` update, `POST /brews` + MCP `log_brew` body, variety scoring in `matchScore` changed to compare `brew.variety` vs `params.variety` directly. This closes S2, A2, and AC-TST-2 in one shot.

3. **Wire vote submission** — `POST /recommend/:id/vote` endpoint, landing page `onVote` calls it, render `thumbs_up`/`thumbs_down` from response in result cards. Closes H2/H3 from the original triage.

4. **Align MCP `recommend` `origin` to optional** — match REST. No reason to require it in one surface and not the other.

### Should-fix (iteration 4 scope)

5. **Add `source_url` + `field_confidence` to MCP `log_brew`** — closes A3, A4.

6. **Update API-SPEC** — add `technique` to `GET /brewing-methods` example, `variety` to `GET /origins` example, `thumbs_up`/`thumbs_down`/`variety` to `POST /recommend` response example, fix technique object shape (discriminated union, not flat). Closes D1–D4.

7. **Fix architecture/overview.md** — mark `compare_brew` as implemented. Closes D5.

8. **Fix README** — update test count (56), add `.env.example` file. Closes D6, D8.

9. **Write missing tests** — (a) variety matchScore invariant in `recommend.test.ts`, (b) `user_vote` storage round-trip, (c) MCP `log_brew` rating bounds rejection. Closes AC-TST-2, AC-TST-3, MCP rating gap.

10. **Write MCP `compare_brew` live-link test** — per test-engineer skill §5, MCP path must mirror REST coverage. Closes the weak match_score test gap.

### Backlog

11. Remove unused `searchOrigins` from `db.ts` or wire it to a `GET /origins?q=` route.
12. Resolve Node version docs vs Railway production (add `nixpacks.toml` or update docs).
13. Rename `data_points_used` → `matching_brews_used` in recommend response.
14. Add runtime validation for Prisma `technique` / `source` casts (or add a Zod parse step in db.ts).

---

## Inputs for /retro

- **Route:** `/backend-architect` → `.claude/commands/backend-architect.md`
  **Draft principle:** *When a Zod schema on a REST route accepts a field (e.g. `variety`), either the DB layer must persist it or the route must strip it before calling the DB function. A field that is accepted by validation but silently dropped is worse than rejecting it — it passes client integration tests and fails silently at storage time. Add to pre-commit checklist: every field in a Zod `create` schema maps to a column in the corresponding Prisma model.*
  **Triggered by:** S2 — `variety` in `brewSchema` discarded by `addBrew()`.

- **Route:** `/backend-architect` → `.claude/commands/backend-architect.md`
  **Draft principle:** *REST and MCP handlers that share the same underlying DB call must have identical input surface for every field that matters downstream. Before shipping a feature that adds a field to one surface, audit the other surface. Discrepancies (required vs optional, field present vs absent) create asymmetric contracts that break agent callers or REST callers silently. Run a REST↔MCP parity check as part of every feature plan's AC authoring.*
  **Triggered by:** A1 (origin required mismatch), A2 (variety in recommend but not log_brew), A3 (source_url absent from MCP), A4 (field_confidence merging differs).

- **Route:** `/backend-architect` → `.claude/commands/backend-architect.md`
  **Draft principle:** *`@unique` constraints on optional foreign-context fields (like `source_url`) must be scoped to the actual uniqueness guarantee needed. A `@unique` on a nullable scrape URL prevents a roaster guide page from contributing multiple brewing-method records, which is the primary data-collection pattern. Default to no uniqueness constraint on scrape URLs; add it as a composite key `(source, source_url)` only if deduplication is the explicit goal.*
  **Triggered by:** S1 — `source_url @unique` breaking scraper's multi-brew-per-page pattern.

- **Route:** `/test-engineer` → `.claude/commands/test-engineer.md`
  **Draft principle:** *When writing `AC-TST-*` tests for scoring invariants (e.g. "variety X scores higher than variety Y"), the test must set up two candidate fixtures that differ only in the field under test and assert the relative ordering of scores — not the absolute value. Asserting `score > otherScore` tests the invariant; asserting `score === 0.75` pins a literal that passes vacuously if the formula changes in a non-breaking way.*
  **Triggered by:** AC-TST-2 — no test exercises the variety-scores-higher invariant.

- **Route:** `/project-manager` → `.claude/commands/project-manager.md`
  **Draft principle:** *Before closing an iteration, diff the API-SPEC examples against the live `src/types.ts` interfaces using `grep` or a quick read pass. The spec is the contract for external consumers; stale examples are a class of bug. Add "API-SPEC examples match types.ts" as a standing AC-DOC row in every iteration that touches types.*
  **Triggered by:** D1–D4 — API-SPEC stale across four response shapes after iteration 3.

- **Route:** cross-cutting → `docs/plans/README.md`
  **Draft note:** *Add a "close-iteration checklist" section: (1) update API-SPEC examples for any changed types, (2) update architecture/overview.md for any changed implementation status, (3) update README test count, (4) verify Node version docs match Railway runtime. These are recurring drift sources across iterations 2, 3, and the patch.*
  **Triggered by:** D5 (architecture stale), D6 (README test count), D7 (Node version), recurring pattern across reviews.
