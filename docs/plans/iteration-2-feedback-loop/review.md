# Iteration 2 — Community Feedback Loop: Review Report

**Plan:** `docs/plans/iteration-2-feedback-loop/plan.md`
**ACs:** `docs/plans/iteration-2-feedback-loop/ACs.md`
**Branch:** `feat/iteration-2-feedback-loop`
**Date:** 2026-05-27
**Reviewer:** `/review` protocol (Phase 4.5), owned by `/backend-architect`, `/test-engineer`, `/project-manager`

---

## Deliverables Map

| D# | Deliverable | Files | Committed? | Notes |
|----|-------------|-------|------------|-------|
| D1 | Landing page feedback loop (Face A↔B flip, origin combobox, log brew form) | `landing/index.html` | Yes (`1531820`) | Massive delta: +681/-145 lines |
| D2 | README: mention technique in recommend tool description | `README.md` | **NO** (working tree only) | Technique guidance text present on disk at line 25 but unstaged |
| D3 | Roadmap: tick Phase 6 D2+D3, promote landing from Icebox → Phase 5 | `docs/roadmap.md` | Yes (`30695b6`) | All checkboxes confirmed |
| D4 | Scraper: document API_BASE env var + idempotency | `scripts/scrape-roasters.ts` | Yes (`e633258`) | 24-line header comment block present |
| D5 | MCP compare_brew 0.82 live-link test | `src/__tests__/mcp-tools.test.ts` | Yes (`2617b57`) | Test asserts match_confidence: 0.82 + getBrewLinks called with correct brew_id |

**Commit count:** 5 commits on branch (including plan/ACs). D2 is uncommitted — 4 of 5 deliverables have distinct commits.

---

## AC Spot-Check Results

| AC | Status | Evidence |
|----|--------|----------|
| AC-FN-1 | PASS | `initCombobox('originInputA', ...)` at line 1199; `originInputA` input element at line 803; filtered dropdown with "Use '[text]' as a new origin" fallback |
| AC-FN-2 | NOT VERIFIED | Requires browser testing (recommend result card + CTA). Code exists: `slideToB()` wired to CTA element |
| AC-FN-3 | NOT VERIFIED | Slide animation and pre-fill require browser testing. Code: `originInputB.value = originInputA.value` at line 1251 |
| AC-FN-4 | PASS | `submitBrew()` function at line 1511; `fetch(\`\${API}/brews\`)` POST at line 1550; success toast logic present |
| AC-FN-5 | NOT VERIFIED | Back link requires browser testing |
| AC-FN-6 | NOT VERIFIED | Star rating requires browser testing |
| AC-FN-7 | NOT VERIFIED | 375px responsiveness requires browser testing (CSS media queries present at lines 500-600) |
| AC-FN-8 | **FAIL** | Technique guidance text exists on disk (README.md line 25) but is **not committed** |
| AC-FN-9 | PASS | Phase 6: `[x] technique JSONB field` and `[x] recommend response extended with technique object` — both checked (lines 58, 64) |
| AC-FN-10 | PASS | Landing page moved from Icebox → Phase 5, marked `[x]` (line 92) |
| AC-FN-11 | PASS | Scraper header (lines 1-24) documents `API_BASE` env var, idempotency ("safe to re-run"), prerequisites |
| AC-FN-12 | PASS | Test at line 313: `returns real match_score when brew_recommendation_links exist`; asserts `result.match_score` is `0.82`; asserts `getBrewLinks` called with `1` |

### Test & Build ACs

| AC | Status | Evidence |
|----|--------|----------|
| AC-TST-1 | PASS | `npm test`: 4 test files, **56 passed**, 0 failures |
| AC-TST-2 | PASS | `npm run build` (tsc): 0 type errors |

### Docs ACs

| AC | Status | Evidence |
|----|--------|----------|
| AC-DOC-1 | **PARTIAL** | 5 commits exist but D2 (README technique mention) is not among them. Commits: D1 (`1531820`), D5 (`2617b57`), D4 (`e633258`), D3 (`30695b6`), plan+ACs (`fd6b699`) |
| AC-DOC-2 | PASS | `docs/plans/iteration-2-feedback-loop/plan.md` + `ACs.md` exist |

---

## Docs Drift Scan

### README.md
- **Issue:** Technique guidance text is present in working tree but **not committed**. This is the D2 deliverable — it's incomplete.
- **Action:** `git add README.md && git commit -m "docs(readme): add technique guidance to recommend tool description (D2)"`

### CLAUDE.md
- **Issue 1 (line 10):** Deploy target still says `TBD (Fly.io or Railway — Node-compatible, persistent volume for SQLite)`. Project is deployed on Railway with Neon Postgres (no SQLite). This is stale from Phase 4 migration.
- **Issue 2:** Key files table (lines 14-22) does not list `landing/index.html`. Since the landing page is now a first-class feature (Phase 5), it should appear in the key files table.
- **Recommendation:** Update both items in a follow-up docs commit — not blocking but should be addressed before merge.

### docs/roadmap.md
- **PASS:** Phase 6 items correctly ticked (`[x] technique JSONB`, `[x] recommend response extended`).
- **PASS:** Landing page removed from Icebox, promoted to Phase 5 with `[x]`.
- **Stale unchecked items (Phase 3):** Semantic similarity and scraping pipeline remain unchecked — these are genuinely incomplete and correctly represented.

### docs/architecture/overview.md
- Not explicitly checked — out of scope for this iteration's ACs.

---

## Recommendations

1. **BLOCKING — Commit D2:** `README.md` has the technique guidance text but it's uncommitted. Run:
   ```
   git add README.md
   git commit -m "docs(readme): add technique guidance to recommend tool description (D2)"
   ```
   This brings commit count to 6 (one per deliverable + plan/ACs).

2. **NON-BLOCKING — Fix CLAUDE.md stale deploy info (line 10):** Replace `TBD (Fly.io or Railway — Node-compatible, persistent volume for SQLite)` with `Railway (Neon Postgres)`. This has been stale since Phase 4.

3. **NON-BLOCKING — Add landing page to CLAUDE.md key files:** Add `landing/index.html` to the key files table since it's now a Phase 5 feature.

4. **NON-BLOCKING — Browser smoke test:** ACs FN-2 through FN-7 were only verified by code review. Recommend a quick browser smoke test before merging to confirm the Face A/B flip animation, pre-fill behavior, star rating, mobile responsiveness, and POST /brews flow work end-to-end against the live API.

---

## Inputs for /retro

- **What went well:** Test stability at 56/56, TypeScript 0 errors, roadmap checkbox hygiene, scraper header docs are thorough.
- **What slipped:** D2 (README technique mention) was written but never committed — discovered during review. The git diff from main didn't flag it because the file was never staged.
- **Lesson for future iterations:** Verify `git status` before closing the iteration, not just `git diff`. A working-tree-only change is invisible to `git diff main...branch` and `git diff --stat`.
- **CLAUDE.md drift:** The deploy-target line has been stale since Phase 4 (SQLite → Neon migration). It wasn't caught by prior reviews.
- **Route to role files:** Add to `project-manager.md`: "Before closing an iteration, run `git status` to catch uncommitted working-tree changes — `git diff main...branch` won't show them."