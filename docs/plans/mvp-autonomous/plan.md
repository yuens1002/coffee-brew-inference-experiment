# MVP Autonomous Build Plan

> **Created:** 2026-05-25 | **Status:** In Progress  
> **Parent:** `docs/roadmap.md` Phase 2–3  
> **Baseline:** v1.0.1 — 31 tests green, TypeScript clean

---

## Context

After the data model alignment (v2.0 schema: snake_case, `origin`/`roast_level`/`ratio` as number), the remaining work wires real AI intelligence and a knowledge ingestion pipeline. Three autonomous sessions, each self-contained with its own branch, tests, and review.

## Architecture: `delegate_task` Batch Pattern

Each session uses `delegate_task` with two parallel sub-agents:

```
Orchestrator (this session)
├── delegate_task(batch):
│   ├── Sub-agent A: coffee-brew-backend-architect (implement feature)
│   └── Sub-agent B: coffee-brew-test-engineer (write tests from spec)
├── Verify: npm test + npx tsc --noEmit
├── Review: docs/plans/{session}-review.md
├── Retro: skill patches for lessons learned
└── Commit: feat/{session-branch}
```

---

## Session 1: LLM-Powered Recommend

**Branch:** `feat/llm-recommend`  
**Depends on:** This plan (no code dependencies)  
**Files:** `src/lib/llm.ts` (new), `src/routes/brewing.ts`, `src/routes/mcp.ts`, tests

### Deliverables

| ID | Deliverable | Kind | Owner |
|----|-------------|------|-------|
| D1 | `src/lib/llm.ts` — OpenRouter API client with Zod-validated output | lib | `coffee-brew-backend-architect` |
| D2 | `POST /recommend` — accept `{brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s}` → call LLM → return `Recommendation` | route | `coffee-brew-backend-architect` |
| D3 | MCP `recommend` tool — same LLM call, updated input schema | tool | `coffee-brew-backend-architect` |
| D4 | Tests for D1–D3 | test | `coffee-brew-test-engineer` |

### Implementation Spec

**`src/lib/llm.ts`:**
```ts
export async function getRecommendation(params: RecommendationParams): Promise<Recommendation>
```
- Reads `OPENROUTER_API_KEY` from `process.env`
- Calls `https://openrouter.ai/api/v1/chat/completions`
- Model: `deepseek/deepseek-v4-pro` (configurable via env `LLM_MODEL`)
- System prompt: "You are a coffee brewing expert. Given the coffee origin, roast level, and brewing method, recommend optimal brew parameters."
- Returns Zod-validated `Recommendation` (brewing_method, input, recommendation, confidence)
- Fallback: if API key missing or call fails, return stub with `confidence: "unavailable"`

**Recommendation logic:**
- If origin + roast_level provided → LLM tailors advice (e.g., "Ethiopian light roasts shine at lower temps")
- If only method_id → return method defaults with generic reasoning
- `confidence`: "high" | "medium" | "low" | "unavailable"

### Acceptance Criteria

| AC | Plan Ref | Role | What | How | Pass |
|----|----------|------|------|-----|------|
| AC-LLM-1 | D1 | backend | `getRecommendation()` calls OpenRouter and returns valid Recommendation | Code review + test | Function returns `{brewing_method, input, recommendation, confidence}` |
| AC-LLM-2 | D1 | backend | Missing API key → graceful fallback with "unavailable" | Test: unset env var | Returns stub, doesn't throw |
| AC-LLM-3 | D2 | backend | `POST /recommend` with origin+roast → LLM response shape | Test: mock LLM | Response matches Recommendation type |
| AC-LLM-4 | D3 | backend | MCP `recommend` tool calls LLM | Test: mock LLM | Tool returns same shape as REST |
| AC-TST-1 | D4 | test | All new code paths tested | Test run | Mock LLM, test both success + fallback |

---

## Session 2: Narrative Parsing + Real Compare

**Branch:** `feat/narrative-compare`  
**Depends on:** Session 1 (needs `src/lib/llm.ts`)  
**Files:** `src/lib/parser.ts` (new), `src/routes/brewing.ts`, `src/routes/mcp.ts`, tests

### Deliverables

| ID | Deliverable | Kind | Owner |
|----|-------------|------|-------|
| D5 | `src/lib/parser.ts` — LLM-powered narrative → structured brew parser | lib | `coffee-brew-backend-architect` |
| D6 | `POST /brews` — accept optional `narrative` field alongside structured fields | route | `coffee-brew-backend-architect` |
| D7 | MCP `log_brew` — accept `narrative` string, parse to structured fields | tool | `coffee-brew-backend-architect` |
| D8 | Real `compare_brew` — LLM delta analysis (REST + MCP) | route/tool | `coffee-brew-backend-architect` |
| D9 | Tests for D5–D8 | test | `coffee-brew-test-engineer` |

### Implementation Spec

**`src/lib/parser.ts`:**
```ts
export async function parseNarrative(narrative: string): Promise<Partial<BrewInput>>
```
- System prompt: "Extract coffee brewing parameters from the user's narrative. Return JSON with: brewing_method_name, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating, notes. Only include fields you can confidently extract. Infer ratio from ratio descriptions (e.g. '1:16' → 0.0625)."
- Returns Zod-validated partial BrewInput
- Used by both `POST /brews` (when `narrative` field present) and MCP `log_brew`

**Narrative flow:**
1. User sends `{ narrative: "I brewed my Ethiopian Yirgacheffe light roast with a V60 at 93°C for 3 minutes, 1:16 ratio. Tasted floral and bright. 4/5" }`
2. Parser extracts: `{ brewing_method_name: "V60", origin: "Ethiopia", roast_level: "light", water_temp_c: 93, brew_time_s: 180, ratio: 0.0625, rating: 4, notes: "floral and bright" }`
3. Method name resolved to ID via `getBrewingMethods()` fuzzy match
4. Merged with any explicit structured fields the user also provided

**Real `compare_brew`:**
- Accepts `brew_id`
- Fetches brew + method defaults
- Calls LLM with: "Compare this user's brew to the standard method. Analyze grind, temp, time, and ratio deltas. Give actionable advice."
- Returns: `{ brew_id, user_brew, ai_recommendation, analysis (string), match_score (0-1) }`

### Acceptance Criteria

| AC | Plan Ref | Role | What | How | Pass |
|----|----------|------|------|-----|------|
| AC-PAR-1 | D5 | backend | `parseNarrative()` extracts structured fields from free text | Test: "brewed Ethiopian at 93°C for 3 min" | Returns `{origin: "Ethiopia", water_temp_c: 93, brew_time_s: 180}` |
| AC-PAR-2 | D6 | backend | `POST /brews` with `narrative` parses and stores | E2E: curl with narrative | Returns 201 with parsed fields |
| AC-PAR-3 | D7 | backend | MCP `log_brew` with narrative works | Test: mock parser | Tool returns structured brew |
| AC-CMP-1 | D8 | backend | `compare_brew` returns LLM delta analysis | Test: mock LLM | Response has analysis field with delta info |
| AC-CMP-2 | D8 | backend | `GET /brews/:id/compare` upgraded from stub | Test | Returns real comparison, not hardcoded 0.5 |
| AC-TST-2 | D9 | test | All parser + compare paths tested | Test run | Mocks cover LLM success + failure |

---

## Session 3: Scraping Pipeline

**Branch:** `feat/scraping-pipeline`  
**Depends on:** Session 2 (needs working POST /brews)  
**Files:** `src/scrapers/` (new dir), `cron/` config

### Deliverables

| ID | Deliverable | Kind | Owner |
|----|-------------|------|-------|
| D10 | `src/scrapers/reddit.ts` — Reddit JSON API scraper for r/Coffee + r/pourover | scraper | `coffee-brew-backend-architect` |
| D11 | `src/scrapers/forums.ts` — cheerio-based forum scraper (Home-Barista) | scraper | `coffee-brew-backend-architect` |
| D12 | `src/scrapers/index.ts` — orchestrator: run scrapers, parse posts, POST to /brews | orchestrator | `coffee-brew-backend-architect` |
| D13 | Tests for D10–D12 | test | `coffee-brew-test-engineer` |
| D14 | Cron schedule: weekly run of `npx tsx src/scrapers/index.ts` | infra | general |

### Implementation Spec

**Reddit scraper (`src/scrapers/reddit.ts`):**
- Fetch `https://www.reddit.com/r/Coffee/search.json?q=brew+recipe&restrict_sr=on&sort=new&limit=25`
- Fetch `https://www.reddit.com/r/pourover/search.json?q=recipe&restrict_sr=on&sort=new&limit=25`
- Parse each post: title + selftext
- Filter: posts that contain brew parameters (temp, time, ratio, grind)
- Extract structured data via `parseNarrative()` (reuse Session 2 parser!)
- Return `Array<Partial<BrewInput & { source_url: string }>>`

**Forum scraper (`src/scrapers/forums.ts`):**
- Target: Home-Barista.com brew forums
- cheerio for HTML parsing
- Extract post title + body
- Filter for brew recipes
- Parse via `parseNarrative()`
- Return same shape as Reddit scraper

**Orchestrator (`src/scrapers/index.ts`):**
```ts
// 1. Run both scrapers in parallel
// 2. Deduplicate by source_url
// 3. POST each to localhost:4000/brews (or env BREW_API_URL)
// 4. Log results: { reddit_posts: N, forum_posts: M, ingested: K, skipped: J }
// 5. Exit with code 0
```

**Cron schedule:**
- Weekly on Sunday 09:00 UTC
- `0 9 * * 0`
- Hermes cron job: `npx tsx src/scrapers/index.ts` with workdir = project root

### Acceptance Criteria

| AC | Plan Ref | Role | What | How | Pass |
|----|----------|------|------|-----|------|
| AC-SCR-1 | D10 | backend | Reddit scraper fetches and parses posts | Test: nock mock Reddit API | Returns array with parsed brew fields |
| AC-SCR-2 | D11 | backend | Forum scraper parses HTML brew posts | Test: mock HTML fixture | Returns array with parsed brew fields |
| AC-SCR-3 | D12 | backend | Orchestrator deduplicates and POSTs to API | Test: mock API endpoint | Correct number of POST calls |
| AC-SCR-4 | D12 | backend | No duplicate ingestion (idempotent by source_url) | Test: run twice | Second run skips already-ingested |
| AC-TST-3 | D13 | test | All scraper paths tested with mocks | Test run | Tests pass without network |
| AC-CRON-1 | D14 | infra | Cron job exists and runs weekly | Verify: `hermes cron list` | Job present with correct schedule |

---

## Quality Gates (every session)

- [ ] `npm test` — all tests pass (existing + new)
- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] No `any` types introduced
- [ ] New code follows existing patterns (Zod validation, Hono routes, vi.mock for DB)
- [ ] `docs/plans/{session}-review.md` created (cross-artifact drift check)
- [ ] `docs/plans/{session}-retro.md` created (lessons → skill patches)
- [ ] `CHANGELOG.md` updated (Unreleased section)
- [ ] `docs/roadmap.md` updated (check off completed items)

---

## Session Execution Order

```
Now (Tech Debt) ✅ DONE
  └── S1: LLM Recommend  ← next
       └── S2: Narrative + Compare  ← blocked on S1 (needs llm.ts)
            └── S3: Scraping Pipeline  ← blocked on S2 (needs parser.ts)
```

## Environment Variables Needed

| Variable | Used By | Where |
|----------|---------|-------|
| `OPENROUTER_API_KEY` | `src/lib/llm.ts` | `~/.hermes/.env` (already set) |
| `LLM_MODEL` | `src/lib/llm.ts` | Optional, defaults to `deepseek/deepseek-v4-pro` |
| `BREW_API_URL` | `src/scrapers/index.ts` | Optional, defaults to `http://localhost:4000` |
