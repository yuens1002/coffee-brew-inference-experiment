# Iteration 3 — Acceptance Criteria

**Plan:** `docs/plans/iteration-3/plan.md`

---

## Functional ACs

| AC | # | What | How | Pass |
|----|---|------|-----|------|
| AC-FN-1 | 1 | Landing copy factual and short | Code review | Hero: "8 brewing methods, community consensus, technique guidance" |
| AC-FN-2 | 2 | "Share your results →" always visible | Browser | CTA visible immediately, no recommend required |
| AC-FN-3 | 3 | Hero 100vh, fade-in, ↓ arrow, hover fix | Browser | Viewport height; animation plays; CTA text stays on hover |
| AC-FN-4 | 4 | Brew form success/error + clear on success | Browser | Success message; form cleared; can submit another |
| AC-FN-5 | 5 | Thumbs up/down on result cards | Browser | Both buttons visible; clicking highlights; state preserved |
| AC-FN-6 | 6 | AI cards horizontally scrollable on mobile | Browser: 375px | overflow-x auto on card row; no page scroll |
| AC-FN-7 | 7 | variety on origins table + seed data | DB query | Column exists; Ethiopia=heirloom, Kenya=SL28/SL34, Vietnam=robusta/arabica etc. |
| AC-FN-8 | 7 | source_url unique on brews | DB query | Unique constraint; duplicate inserts rejected |
| AC-FN-9 | 8 | Origin selector shows combined origin+subregion | Browser | Dropdown entries: "Ethiopia Yirgacheffe", "Colombia Huila", "Vietnam (robusta)" |
| AC-FN-10 | 9 | variety in recommend request/response | curl test | POST /recommend accepts variety; response.echoes it in input |
| AC-FN-11 | 9 | variety in matchScore weighting | Code review | Same origin+variety scores higher than same origin+different variety |
| AC-FN-12 | 10 | user_vote on brew_recommendation_links | DB query | Column exists (nullable, up/down); storable and retrievable |
| AC-FN-13 | 11 | Vote counts on recommend response | curl test | thumbs_up and thumbs_down in response JSON; landing page shows counts |
| AC-FN-14 | 8 | Unknown origin with variety syntax parsed | Browser | "Papua New Guinea (bourbon)" → origin="Papua New Guinea", variety="bourbon" |
| AC-FN-15 | 8 | Unknown origin without variety works | Browser | "Papua New Guinea" → origin="Papua New Guinea", variety=null |

---

## Test Coverage ACs

| AC | # | What | How | Pass |
|----|---|------|-----|------|
| AC-TST-1 | all | All tests pass | `npm test` | 0 failures |
| AC-TST-2 | 9 | Tests cover variety matchScore weighting | `npm test` | Test asserts variety changes matchScore |
| AC-TST-3 | 10 | Tests cover user_vote storage | `npm test` | Test asserts vote stored/retrieved |
| AC-TST-4 | all | TypeScript build clean | `npm run build` | 0 type errors |

---

## Docs ACs

| AC | # | What | How | Pass |
|----|---|------|-----|------|
| AC-DOC-1 | 12 | README tool descriptions match actual signatures | Code review | Each tool includes variety/technique params |
| AC-DOC-2 | 13 | API-SPEC examples match Recommendation interface | Code review | Technique shape correct; variety present; votes shown |
| AC-DOC-3 | 14 | Landing MCP snippet shows actual endpoints | Code review | URLs + tool list match production |
| AC-DOC-4 | 15 | CLAUDE.md updated | Code review | landing/index.html in key files; npm run dx in dev commands |
| AC-DOC-5 | 16 | Roadmap reflects shipped items | Code review | Phase 3 scraper ticked; Phase 6 JSONB ticked |
| AC-DOC-6 | all | No doc contradicts any other doc | Code review | README, API-SPEC, landing, MCP tools all use same field names/URLs/shapes |