# /review report — iteration-3 patch fixes

**Branch:** `main` (patch cadence — applied directly)
**Generated:** 2026-05-28
**Scope:** Two production hotfixes after iteration-3 merge

---

## Step 0: Role context

This is a patch-cadence review (no full plan with deliverables table). Per the review protocol
edge-case rule, de-facto owning roles are named explicitly:

- `/backend-architect` — owns src/index.ts change (debug endpoint) and is the primary code owner
- `/devops` (no in-repo skill file — routed to global baseline) — owns the Railway deploy command
- `/project-manager` — owns docs-drift scan and close-iteration checklist

---

## Verdict

Minor issues — two docs-drift findings (README test count stale, README/CLAUDE.md Node version
claim does not match production). Fixes are cosmetic and do not block the hotfixes; flagged for
/retro and a follow-up docs pass.

---

## Deliverables vs Code

This patch addresses two distinct bugs introduced or exposed by the iteration-3 merge:

| Fix | Implementation | Status |
|-----|----------------|--------|
| Remove `import.meta.dirname` (Node 20+ only) from `/debug/node` endpoint | `src/index.ts:47` — replaced `{ node: process.version, dirname: import.meta.dirname ?? 'unsupported' }` with `{ node: process.version }` | shipped |
| Add `prisma migrate deploy` before server start so iteration-3 migrations run on Railway | `package.json` start script changed from `node dist/server.js` to `npx prisma migrate deploy && node dist/server.js` | shipped |

### Code changes not tied to any deliverable

None. Both changes are scoped to the exact files described in the task brief.

---

## ACs vs Tests (Gate 3 spot-check)

This patch does not introduce new ACs. Spot-checking the iteration-3 ACs that are most
likely affected by these fixes:

| AC | Test file | Asserts invariant? | Notes |
|----|-----------|---------------------|-------|
| AC-TST-1 (all tests pass) | all 4 test files | PASS (asserts invariant) | 56/56 pass after both fixes |
| AC-TST-4 (build clean) | n/a (tsc) | PASS | `npm run build` exits 0 after fix 1 |
| AC-TST-2 (variety matchScore) | `recommend.test.ts`, `brewing.test.ts`, `mcp-tools.test.ts` | WEAK — no dedicated variety matchScore test exists | Tests mock `getVoteCounts` and reference `variety` in type fixtures but no test calls `matchScore` with a `variety` param and asserts the score is higher. The plan's AC says "test asserts variety changes matchScore" — this is not satisfied by any existing test. The mock-level tests confirm the API plumbing works but not the scoring invariant. |
| AC-TST-3 (user_vote storage) | all test files | WEAK — no test stores or retrieves `user_vote`; tests only mock `getVoteCounts` to return zeros | The schema column exists and the type is declared, but no test exercises write then read of `user_vote`. |

### Note on AC-TST-2 and AC-TST-3 weakness

These were pre-existing weaknesses from the iteration-3 implementation, not introduced by
this patch. They are surfaced here for routing to /retro.

---

## Docs drift

### Finding 1 — README test count stale (README.md:15, README.md:110)

README claims "53 tests" in two places. Current test suite has 56 tests (confirmed by
`npm test` output). The 3 added tests came in at commit `3a687b7` (getVoteCounts mocks).

- `README.md:15`: `- **Vitest** (53 tests, zero TypeScript errors)`
- `README.md:110`: `npm test             # 53 tests`

Contradicting code: `npm test` output — `Tests  56 passed (56)`

### Finding 2 — Node version claim conflicts with production reality

Multiple docs claim "Node 24" but Railway is running Node v18.20.5.

- `README.md:11`: `- **TypeScript** (strict mode, ESM, Node 24)`
- `CLAUDE.md:5`: `- **Runtime**: Node 24, TypeScript strict, ESM`
- `.claude/commands/backend-architect.md:8`: `- Hono 4 + @hono/node-server, TypeScript strict, ESM, Node 24`

The `import.meta.dirname` bug (Node 20+ only) only exists because the Railway deployment
is v18, not v24. The docs claim Node 24 but this hotfix exists precisely because that claim
was wrong in production.

Contradicting evidence: The hotfix itself — the `import.meta.dirname ?? 'unsupported'`
fallback was added precisely because Node 24 was not guaranteed. Production runs v18.20.5.

### Finding 3 — Railway startup command was undocumented

No railway.json, Dockerfile, or Procfile exists. The startup command was silently inferred
from `package.json "start"`. This is fine for Railway's nixpacks builder, but was not
documented anywhere — an agent or human deployer would not know `npm start` is the deploy
entrypoint without inspecting package.json.

This is a documentation gap, not a broken claim.

### Finding 4 — API-SPEC variety/vote_counts gap

`docs/API-SPEC.md` POST /recommend response example (lines 66-90) does not include
`variety` in the `input` object or `thumbs_up`/`thumbs_down` at the root, even though
both are present in the live response. AC-DOC-2 from iteration-3 says "variety present;
votes shown" — this was not completed in the iteration-3 docs pass.

Contradicting code:
- `src/lib/recommend.ts:256-269` — response includes `variety` in input and `thumbs_up`,
  `thumbs_down` at root
- `src/types.ts:97-98` — `Recommendation` type includes `thumbs_up?: number`,
  `thumbs_down?: number`

---

## Recommendations

1. Update README.md: change "53 tests" to "56 tests" in both places (lines 15 and 110).

2. Reconcile Node version claim: Railway's nixpacks can be pinned via `nixpacks.toml` or
   the Railway dashboard. Either pin production to Node 24 (add a `nixpacks.toml` with
   `[phases.setup]\nnixPkgs = ["nodejs-24_x"]`) or update docs to say "Node 18+" or
   "Node 18.20 in production". The docs-as-aspiration pattern caused the bug this patch fixes.

3. Add `variety` matchScore test (closes AC-TST-2): a dedicated test in `recommend.test.ts`
   that calls `matchScore` (or `computeBestBrew` via mock) with two brews differing only in
   variety and asserts the variety-matching brew scores higher.

4. Add `user_vote` storage test (closes AC-TST-3): a test that mocks `addBrew` and
   `getBrewLinks` to verify `user_vote` field round-trips through the DB layer.

5. Update `docs/API-SPEC.md` POST /recommend response example to include `variety` in
   `input` and `thumbs_up`/`thumbs_down` at root (closes AC-DOC-2 which was not completed).

6. Consider adding a `nixpacks.toml` or `railway.json` to make the deploy entrypoint
   explicit — currently it silently depends on `package.json "start"` which is easy to miss.

---

## Inputs for /retro

- **Route:** `/backend-architect` → `.claude/commands/backend-architect.md`
  **Draft principle:** *When adding Node.js version-gated APIs (e.g. `import.meta.dirname`,
  `crypto.randomUUID` without polyfill), check the production runtime version before using
  them — not just the local dev version. The docs claiming "Node 24" reflected the desired
  target, not the actual Railway deployment. If production is on a different version than
  dev, either lock the production version explicitly (nixpacks.toml) or use the lowest
  common denominator API.*
  **Triggered by:** Fix 1 — `import.meta.dirname` (Node 20+) crashed on Railway Node 18.

- **Route:** `/backend-architect` → `.claude/commands/backend-architect.md`
  **Draft principle:** *AC-TST-2/3 pattern: when an AC says "test asserts X changes Y",
  the test must call the function under test with two inputs that differ only in X and
  assert the output difference. A mock-level test that only confirms the plumbing (API
  accepts `variety`, DB mock is called) does not satisfy a scoring-invariant AC — write
  a unit test that exercises the scoring logic directly.*
  **Triggered by:** AC-TST-2 (variety matchScore) and AC-TST-3 (user_vote) being WEAK.

- **Route:** cross-cutting → `docs/plans/iteration-3/` (for /retro to log)
  **Finding:** AC-DOC-2 (API-SPEC variety + vote counts) was not completed in the
  iteration-3 docs pass. The AC tracking doc marks it as a pass criterion but the
  API-SPEC still shows the old response shape. Before closing an iteration, the
  project-manager role should diff the API-SPEC examples against the live types.ts
  interfaces, not just against the plan's description.
  **Triggered by:** Finding 4 — API-SPEC /recommend response shape stale.

- **Route:** `/devops` (global baseline `~/.claude/commands/devops.md` if it exists)
  **Draft principle:** *For Railway nixpacks deployments, make the startup command
  explicit: either a `railway.json` with `"startCommand"` or a `nixpacks.toml`. Relying
  on `package.json "start"` is implicit and the connection between "deploy entrypoint"
  and "start script" is non-obvious. A `railway.json` also allows `prisma migrate deploy`
  to be decoupled from the application start script (no-op on local `npm start`).*
  **Triggered by:** Fix 2 — `prisma migrate deploy` had to go into `npm start`, which
  is a slight anti-pattern (it runs on local `npm start` too, harmlessly but
  unnecessarily).
