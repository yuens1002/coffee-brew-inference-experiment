# Iteration 2 — Community Feedback Loop ACs

**Plan:** `docs/plans/iteration-2-feedback-loop/plan.md`
**Deadline:** May 30, 2026

---

## Functional ACs

| AC | D# | What | How | Pass |
|----|----|------|-----|------|
| AC-FN-1 | D1 | Face A shows searchable origin combobox | Browser: load landing page | Text input with filtered dropdown; "Use '[text]' as a new origin" for unmatched input |
| AC-FN-2 | D1 | Recommend result shows technique + "Share your results →" CTA | Browser: submit recommend | Technique steps visible; CTA link below result card |
| AC-FN-3 | D1 | Face B slides in on CTA click | Browser: click "Share your results →" | Slide animation; origin/roast/method pre-filled from Face A |
| AC-FN-4 | D1 | Face B logs a brew via POST /brews | Browser: fill form, submit | 201 response; success confirmation shown |
| AC-FN-5 | D1 | "← back to recommend" returns to Face A | Browser: click back link | Slide animation; fields preserved |
| AC-FN-6 | D1 | Rating selector works (1-5) | Browser: click stars | Stars reflect selected value |
| AC-FN-7 | D1 | Mobile responsive at 375px | Browser: 375px viewport | No horizontal scroll; fields stack vertically |
| AC-FN-8 | D2 | README mentions technique in recommend description | Code review | Text includes "technique guidance" paragraph |
| AC-FN-9 | D3 | Roadmap Phase 6 items ticked | Code review: docs/roadmap.md | `[x] technique JSONB` and `[x] recommend extended` |
| AC-FN-10 | D3 | Landing page promoted to Phase 5 | Code review: docs/roadmap.md | Moved from Icebox to Phase 5, marked `[x]` |
| AC-FN-11 | D4 | Scraper header documents API_BASE + idempotency | Code review: scripts/scrape-roasters.ts lines 1-20 | Comment mentions env var and safe re-run |
| AC-FN-12 | D5 | MCP compare_brew test covers live match_score | Code review + `npm test` | Test asserts `match_confidence: 0.82` passes through |

## Test Coverage ACs

| AC | D# | What | How | Pass |
|----|----|------|-----|------|
| AC-TST-1 | all | All tests pass | `npm test` | 0 failures; count ≥ 56 |
| AC-TST-2 | all | TypeScript build clean | `npm run build` | 0 type errors |

## Docs ACs

| AC | D# | What | How | Pass |
|----|----|------|-----|------|
| AC-DOC-1 | all | One commit per deliverable | `git log feat/iteration-2-feedback-loop` | 5+ distinct commits |
| AC-DOC-2 | — | Plan + ACs saved | Code review | `docs/plans/iteration-2-feedback-loop/plan.md` + `ACs.md` exist |