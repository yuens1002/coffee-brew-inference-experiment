# Iteration 2 — Community Feedback Loop

**Branch:** `feat/iteration-2-feedback-loop`
**Owner:** `/backend-architect`, `/test-engineer`, `/project-manager`
**Depends on:** competition-sprint (merged to main)

---

## Goal

Close the community feedback loop — let users log their own brew results from the landing page, and fix all docs/test carry-over from the competition sprint.

## Deliverables

| D# | What | Owner | Files |
|----|------|-------|-------|
| D1 | Landing page feedback loop (Face A↔B flip, origin combobox, log brew form) | `/backend-architect` | `landing/index.html` |
| D2 | README: mention technique in recommend tool description | `/backend-architect` | `README.md` |
| D3 | Roadmap: tick Phase 6 D2+D3, promote landing from Icebox → Phase 5 | `/project-manager` | `docs/roadmap.md` |
| D4 | Scraper: document API_BASE env var + idempotency | `/backend-architect` | `scripts/scrape-roasters.ts` |
| D5 | MCP compare_brew 0.82 live-link test | `/test-engineer` | `src/__tests__/mcp-tools.test.ts` |

---

## D1 — Landing page feedback loop

### Face A ("How should I brew this?")
- Keep current layout, tone, and heading
- Origin: replace `<select>` with searchable combobox (text input + filtered dropdown). Load origins from `GET /origins`. Bottom option: "Use '[typed text]' as a new origin" when no match found
- Roast + Method: keep as `<select>` dropdowns
- Result card renders below (existing logic preserved)
- At bottom of result: "Already brewed? [Share your results →]" — CTA that slides to Face B

### Face B ("How did it go?")
- Section heading: "How did it go?" (mirrors Face A's tone)
- Pre-filled origin/roast/method from Face A's recommendation
- Origin: same searchable combobox component
- NEW fields: grind (text/datalist), water temp °C (number), ratio 1:X (number for X), brew time s (number), rating (1-5 stars), technique notes (textarea)
- [Submit brew] → POST to `/brews` with `source: "user_submitted"` (default)
- Success: brief toast + "Get another recommendation →" slides back to Face A
- "← back to recommend" at top for manual flip

### Animation
- CSS transition on transform: translateX — both faces are siblings in a container with overflow:hidden
- Toggle class on container: `class="slide-b"` means Face B is visible, default means Face A

### Origin combobox
- Text input on both faces
- On input/click: dropdown div appears with filtered origin list
- Selecting an origin fills the input and closes dropdown
- If typed text doesn't match any known origin: dropdown shows "Use '[text]' as a new origin"
- The `/origins` endpoint returns the 20 known origins — filter client-side

### Technical constraints
- Single HTML file, inline CSS + JS, no build step
- Dark espresso palette preserved: --bg, --amber, --gold, --cream
- Inter (body) + Playfair Display (headlines)
- Mobile responsive at 375px
- API endpoint: `const API = 'https://brew-guide-production.up.railway.app'`

---

## D2 — README technique mention

Add one sentence to the recommend tool description in README.md:
"Returns brew parameters (temp, ratio, grind, time), confidence tier, sources, and method-specific technique guidance (bloom timing, pour stages, steep times)."

---

## D3 — Roadmap checkboxes

- Phase 6: `technique` JSONB on brewing_methods → `[x]`
- Phase 6: `recommend` response extended with technique → `[x]`
- Icebox: Landing page → move to Phase 5, mark `[x]`

---

## D4 — Scraper header docs

Add a header comment block before `const API_BASE`:
- Documents `API_BASE` env var usage
- States script is idempotent (server will reject duplicates by brew content)
- Lists required prerequisites (dev server running, DATABASE_URL)

---

## D5 — MCP compare_brew test

In `src/__tests__/mcp-tools.test.ts`, `describe('MCP tool: compare_brew')`:
- Add test: "returns real match_score when brew_recommendation_links exist"
- Mock `getBrewLinks` returning `[{match_confidence: 0.82}]`
- Assert `result.match_score` is defined and equals 0.82
- Assert `getBrewLinks` was called with the correct brew_id