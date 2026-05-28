# Iteration 3 — Landing Polish + Community Intelligence

**Branch:** `feat/iteration-3-polish-and-intel`
**Owner:** `/backend-architect` (3b schema), `/test-engineer` (coverage), `/project-manager` (docs alignment)
**Cadence:** Full — plan + ACs + verify + /review + /retro
**Goal:** Competition entry submission ready after merge

---

## Scope

### 3a — Landing page UI/UX

| # | What | File |
|---|------|------|
| 1 | Copy rewrite — factual, short: "8 brewing methods, community consensus, technique guidance" | `landing/index.html` |
| 2 | "Share your results →" always visible below form area (not hidden until recommend) | `landing/index.html` |
| 3 | Hero: 100vh, fade-in on load, ↓ arrow, hover state fix on CTA button | `landing/index.html` |
| 4 | Brew form: show success/error status after submit, clear form on success so user can submit another | `landing/index.html` |
| 5 | Thumbs up/down on recommend result cards — client-side vote state (schema-backed in 3b) | `landing/index.html` |
| 6 | "Connect your AI" section cards: horizontally scrollable on mobile (overflow-x: auto on card row, not page scroll) | `landing/index.html` |

### 3b — Schema + data model

| # | What | Files |
|---|------|-------|
| 7 | Add `variety` TEXT field to `origins` table (nullable). Seed data: Ethiopia=heirloom, Colombia=caturra/typica/castillo, Kenya=SL28/SL34, Vietnam=robusta/arabica/typica, etc. Migration: `source_url` unique constraint on brews. | `prisma/schema.prisma`, `prisma/seed.ts`, migration |
| 8 | Origin selector UX: two-part — Origin dropdown + optional Variety input/filter below it. The origin IS the combination. For unknown: user types both origin and variety as free text. No LLM categorization. | `landing/index.html` |
| 9 | Add `variety` to `RecommendationParams`, `Brew` type, `POST /recommend`, `POST /brews`, MCP `recommend` + `log_brew` tools. Pass through to matchScore — same origin + same variety scores higher. | `src/types.ts`, `src/routes/brewing.ts`, `src/routes/mcp.ts`, `src/lib/recommend.ts` |
| 10 | Add `user_vote` column to `brew_recommendation_links` (nullable, 'up' | 'down'). Migration. Wire POST endpoint for voting (or include in existing compare flow). Schema-backed, NOT used for weighted recommendation yet. | `prisma/schema.prisma`, migration, `src/lib/db.ts`, `src/types.ts` |
| 11 | Return vote counts on recommend response (aggregated from links: thumbs_up, thumbs_down). Landing page shows counts. | `src/routes/mcp.ts`, `src/lib/recommend.ts`, `landing/index.html` |

### Docs alignment — all surfaces must reflect current build

| # | What | Files |
|---|------|-------|
| 12 | README: MCP tool descriptions match actual tool signatures (variety, votes, technique). Add MCP connect instructions if missing. | `README.md` |
| 13 | API-SPEC: POST /recommend response example matches actual Recommendation interface (technique shape correct, variety field, vote counts). POST /brews body matches Zod schema. | `docs/API-SPEC.md` |
| 14 | Landing page: MCP connection snippet shows actual endpoint URLs and tool list. | `landing/index.html` |
| 15 | CLAUDE.md: key files table updated (landing/index.html, variety, votes). Dev commands section includes `npm run dx`. | `CLAUDE.md` |
| 16 | Roadmap: tick Phase 3 scraper item (D1 shipped), update Phase 6 status (JSONB migration done, technique on methods done), mark Iteration 3 deliverables. | `docs/roadmap.md` |

---

## Files touched

| File | Changes |
|------|---------|
| `landing/index.html` | 3a items 1-6, 3b items 8, 11, 14 |
| `prisma/schema.prisma` | variety on origins, user_vote on brew_recommendation_links, source_url unique |
| `prisma/seed.ts` | variety seed data per origin |
| `src/types.ts` | Origin, RecommendationParams, Brew, BrewRecommendationLink updated |
| `src/routes/brewing.ts` | variety in brewSchema + recommendSchema |
| `src/routes/mcp.ts` | variety in log_brew + recommend, vote counts in compare_brew |
| `src/lib/recommend.ts` | variety in matchScore, vote counts in computeBestBrew response |
| `src/lib/db.ts` | getOrigins returns variety, getBrewLinks returns user_vote |
| `src/__tests__/*.ts` | coverage for variety matching, vote counts |
| `README.md` | tool descriptions aligned |
| `docs/API-SPEC.md` | response examples aligned |
| `docs/roadmap.md` | checkboxes updated |
| `CLAUDE.md` | key files + dev commands |