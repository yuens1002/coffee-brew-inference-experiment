# Iteration 4 — Foundation Repair + Vote Endpoint

**Branch:** `feat/iteration-4-foundation-repair`
**Owner:** `/backend-architect` (schema, routes, scoring), `/test-engineer` (coverage gaps), `/project-manager` (docs alignment)
**Cadence:** Full — plan + ACs + verify + /review + /retro
**Source:** `docs/plans/health-audit-main.md` — codebase health audit post-patch `2e98708`

---

## Context

Iteration 3 shipped community intelligence features (variety, votes, origin selector) but left several pieces half-wired: `variety` is accepted by the API but never stored, vote counts always read 0 because the vote endpoint doesn't exist, the MCP and REST surfaces diverged, and documentation drifted across four response shapes. Iteration 4 completes this work before adding anything new.

The audit also found one architectural error (`source_url @unique` breaks the scraper's multi-brew-per-page pattern) and a Node version gap (production was running Node 18; now pinned to 24 via `nixpacks.toml` — fixed as a pre-plan patch alongside this plan).

---

## Scope

### Track A — Schema & Surface Repair

| # | What | Files |
|---|------|-------|
| A1 | Drop `source_url @unique`; replace with `@@unique([source_url, brewing_method_id])` composite. Allows the same roaster page to contribute brews for different brewing methods. Requires migration. | `prisma/schema.prisma`, migration |
| A2 | Add `variety TEXT?` to `Brew` model. Migration. Wire through `addBrew()`, `POST /brews` body, MCP `log_brew` input schema. | `prisma/schema.prisma`, migration, `src/lib/db.ts`, `src/routes/brewing.ts`, `src/routes/mcp.ts`, `src/types.ts` |
| A3 | Fix variety scoring in `matchScore` — compare `brew.variety` directly against `params.variety` (per-brew, not per-origin map lookup). Currently a constant offset; must discriminate between candidates. | `src/lib/recommend.ts` |
| A4 | Make MCP `recommend` `origin` optional (match REST). | `src/routes/mcp.ts` |
| A5 | Add `source_url` (with URL validation) and `field_confidence` merging to MCP `log_brew` — match REST `POST /brews` behaviour. | `src/routes/mcp.ts` |

### Track B — Vote Endpoint

| # | What | Files |
|---|------|-------|
| B1 | Add `POST /recommend/:id/vote` REST endpoint. Accepts `{ vote: 'up' \| 'down' }`. Calls `linkBrewToRecommendation` (or a new `recordVote()` DB helper) to store `user_vote` on the link row. Returns updated vote counts. | `src/routes/brewing.ts`, `src/lib/db.ts`, `src/types.ts` |
| B2 | Move `getVoteCounts()` call in `computeBestBrew` — fetch counts for the recommendation's fingerprint (existing rec) rather than a brand-new rec that has no links. For brand-new recs, return `thumbs_up: 0, thumbs_down: 0` without a DB query. | `src/lib/recommend.ts` |
| B3 | Wire landing page vote buttons to `POST /recommend/:id/vote`. Store recommendation `id` from the `/recommend` response. On vote, call the endpoint and re-render the vote count display in the result card. | `landing/index.html` |
| B4 | Render `thumbs_up` / `thumbs_down` counts from `/recommend` response in result cards. Currently the counts come back in the API response but are never displayed. | `landing/index.html` |

### Track C — Docs, Tests & Quality

| # | What | Files |
|---|------|-------|
| C1 | Update `docs/API-SPEC.md`: add `variety` to `GET /origins` example, add `technique` to `GET /brewing-methods` example, update `POST /recommend` response to include `thumbs_up`, `thumbs_down`, `variety` in `input`, and fix `technique` shape (discriminated union, not flat generic). Add `POST /recommend/:id/vote` endpoint spec. | `docs/API-SPEC.md` |
| C2 | Update `docs/architecture/overview.md`: mark `compare_brew` as fully implemented (not stub). Update module status table to reflect iteration 3+4 additions. | `docs/architecture/overview.md` |
| C3 | Add variety scoring invariant test: two brews same origin, one matching `params.variety`, one not — assert the matching brew scores higher. | `src/__tests__/recommend.test.ts` |
| C4 | Add `user_vote` storage test: mock `linkBrewToRecommendation` to verify `user_vote` field flows through when `POST /recommend/:id/vote` is called. | `src/__tests__/brewing.test.ts` |
| C5 | Add MCP `log_brew` rating bounds test: assert `rating: 0` and `rating: 6` return MCP error. Mirrors existing REST test. | `src/__tests__/mcp-tools.test.ts` |
| C6 | Add MCP `compare_brew` live-link test: mock `getBrewLinks` to return a link with `match_confidence: 0.82` and assert that value appears in the response. Mirrors existing REST live-link test. | `src/__tests__/mcp-tools.test.ts` |
| C7 | Remove unused `searchOrigins` from `src/lib/db.ts` (dead export since iteration 1). | `src/lib/db.ts` |
| C8 | Add `.env.example` file with `DATABASE_URL=` placeholder. README references it; it doesn't exist. | `.env.example` |

---

## Files touched

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | A1: drop `source_url @unique`, add `@@unique([source_url, brewing_method_id])`; A2: add `variety` to Brew |
| `prisma/migrations/` | A1 + A2 migration files |
| `src/types.ts` | A2: `BrewInput.variety`, `Brew.variety`; B1: `VoteRequest`, `VoteResponse` |
| `src/lib/db.ts` | A2: `addBrew` accepts variety; B1: `recordVote()` helper; C7: remove `searchOrigins` |
| `src/routes/brewing.ts` | A2: pass variety in `brewSchema`; B1: `POST /recommend/:id/vote` route |
| `src/routes/mcp.ts` | A4: origin optional; A5: source_url + field_confidence in log_brew; A2: variety in log_brew |
| `src/lib/recommend.ts` | A3: per-brew variety scoring; B2: defer getVoteCounts for existing recs only |
| `landing/index.html` | B3: vote API call; B4: render vote counts in result card |
| `src/__tests__/brewing.test.ts` | C4: user_vote test |
| `src/__tests__/recommend.test.ts` | C3: variety scoring invariant |
| `src/__tests__/mcp-tools.test.ts` | C5: rating bounds; C6: compare_brew live-link |
| `docs/API-SPEC.md` | C1: full spec update |
| `docs/architecture/overview.md` | C2: compare_brew status, module table |
| `.env.example` | C8: new file |

---

## Commit schedule

1. `docs: iteration-4 plan + ACs`
2. `feat(schema): drop source_url unique, add Brew.variety — A1 + A2`
3. `feat(routes): wire variety through REST + MCP, fix scoring — A2 + A3 + A4 + A5`
4. `feat(api): add POST /recommend/:id/vote endpoint — B1 + B2`
5. `feat(landing): wire vote API + render vote counts — B3 + B4`
6. `test: variety scoring, user_vote, MCP rating bounds + compare_brew live-link — C3–C6`
7. `docs: update API-SPEC, architecture overview, add .env.example — C1 + C2 + C8`
8. `refactor(db): remove unused searchOrigins — C7`

---

## Out of scope

- Semantic similarity on brew notes (Phase 3 roadmap item — needs data volume)
- Technique extraction per-brew (Phase 6 roadmap item — needs LLM pipeline)
- `GET /origins/:id` single-origin lookup — backlog; requires route + test; not blocking anything
- `POST /brews` returning full created resource — low priority; clients can GET /brews/:id
- Community brew leaderboard — icebox
