# Iteration 3a — Landing Page Polish (Patch Cadence)

**Branch:** `feat/iteration-3a-polish`
**Parent:** main
**Cadence:** Patch — no full plan/ACs needed per agentic-workflow (UI-only changes, no new features)

## What

Quick UX fixes to the landing page before competition deadline.

## Fixes

### 1. Copy rewrite
Hero and section text does not reflect current build. Replace aspirational language with factual short copy:
- "8 brewing methods, community consensus recommendations, step-by-step technique guidance"
- Short, factual, no fluff

### 2. "Already brewed? Share your results →" always visible
Currently hidden until recommend result appears. Should be always visible below the form area so users can log a brew without getting a recommendation first.

### 3. Hero section fixes
- "Try the live demo" button text disappears on hover — fix hover state
- Arrow should point down (↓, not →)
- Hero should fill viewport height, then scrolls to demo section
- Add fade-in animation on page load

### 4. Brew form error handling + refresh
- After brew submission: show success or error status clearly
- On success: clear form so user can submit another brew immediately
- Show a persistent status message (not just a toast)

### 5. Recommendation voting (thumbs up/down)
- Add thumbs up / thumbs down to the result card after a recommendation
- Store vote client-side (future: wire to API for weighted consensus)
- Simple UI: two clickable icons, selected state highlights

## Files

| File | Changes |
|------|---------|
| `landing/index.html` | All fixes (single-file, inline CSS/JS) |

## Out of scope (deferred to 3b)

- Origin variety field (`vietnam` vs `vietnam:robusta`)
- DB schema changes for variety
- Backend support for votes
- DB migration for new fields