# Competition Sprint — May 30 Deadline

**Branch:** `feat/competition-sprint`  
**Owner:** `/backend-architect` (D1–D4), `/devops` (D5), `/frontend` (D6), `/pm` (D7)  
**Deadline:** May 31, 2026 (DEV.to submission due)  
**Competition:** DEV Hermes Agent Challenge 2026 — Build With Hermes Agent track

---

## Goal

Ship the competition-ready version of Brew Guide: seeded community brew data from
real roaster guides (Pour Over + Espresso), technique hints on all 8 methods,
a coffee-forward landing page, and a polished DEV.to submission post.

## Scope decisions

- **Scraping**: targeted curated approach — 10–15 popular roasters with public brew
  guides for Pour Over + Espresso only. No live Reddit pipeline (too risky in 4 days).
- **Technique**: `technique` JSONB field on `brewing_methods` seeded manually for all
  8 methods (technically accurate). Returned in `recommend` response. No LLM extraction
  pipeline yet (Phase 6 proper).
- **Origins**: 30 popular origins confirmed in seed data.
- **Landing page**: single HTML file, coffee-forward, James Hoffmann crowd energy,
  live API demo widget.
- **Submission**: DEV.to post using "Build With Hermes Agent" template.

## Non-goals

- LLM extraction pipeline at ingest (Phase 6 — post-competition)
- Narrative synthesis (Phase 6 — post-competition)
- Reddit/forum scraping (Phase 3 — post-competition)
- Semantic similarity search (Phase 3 — post-competition)

---

## Deliverables

| D# | What | Owner | Files |
|----|------|-------|-------|
| D1 | Scraper: Pour Over + Espresso roaster guides → brews | `/backend-architect` | `scripts/scrape-roasters.ts` |
| D2 | `technique` JSONB on `brewing_methods` + seed data | `/backend-architect` | `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/db.ts`, `src/types.ts` |
| D3 | `technique` in `recommend` response | `/backend-architect` | `src/lib/db.ts`, `src/routes/brewing.ts`, `src/routes/mcp.ts` |
| D4 | `compare_brew` match_score wired from `brew_recommendation_links` | `/backend-architect` | `src/routes/brewing.ts`, `src/lib/db.ts` |
| D5 | Deploy + run scraper on production DB | `/devops` | Railway env, one-time script run |
| D6 | Landing page | `/frontend` | `landing/index.html` |
| D7 | DEV.to submission post | `/pm` | `docs/competition-entry.md` (draft) |

---

## D1 — Scraper: Pour Over + Espresso roaster guides

### Roaster targets (Pour Over)

Primary targets — all have public brew guides with specific technique data:

| Roaster | URL pattern |
|---------|-------------|
| Blue Bottle | bluebottlecoffee.com/brewing-guides |
| Counter Culture | counterculturecoffee.com/brew-guides |
| Stumptown | stumptowncoffee.com/brew-guide |
| Intelligentsia | intelligentsia.com/blogs/guides |
| Sweet Maria's | sweetmarias.com/brew-methods |
| George Howell | georgehowellcoffee.com |
| Onyx Coffee | onyxcoffeelab.com |
| Bird Rock | birdrockcoffee.com |

### Roaster targets (Espresso)

| Roaster | URL pattern |
|---------|-------------|
| La Marzocco | home.lamarzocco.com/blogs |
| Bottomless | bottomless.com/brewing-guides |
| Chromatic Coffee | chromaticcoffee.com |
| Equator | equatorcoffees.com |

### Scraper implementation

`scripts/scrape-roasters.ts` — standalone tsx script, not part of the server.

```typescript
// Rough shape — implementer fills in per-roaster fetch logic
interface ScrapedBrew {
  origin: string               // normalized to known origin names
  roast_level: string          // 'light' | 'medium' | 'medium-dark' | 'dark'
  brewing_method_id: number    // 1 = Pour Over, 3 = Espresso (verify against seed)
  grind_size: string
  water_temp_c: number
  ratio: number                // e.g. 0.0625 = 1:16
  brew_time_s: number
  rating: number               // seed at 4 — community-sourced, trusted source
  notes: string                // include technique hints in notes free text
  source: string               // 'scraped:roaster'
  source_url: string
  field_confidence: string     // JSON: { origin: 1.0, ... }
}
```

Each roaster page is fetched with `fetch()`, HTML parsed with a lightweight
approach (regex or minimal DOM parse — no Puppeteer needed for static pages).
Map extracted params to `ScrapedBrew`, then call `addBrew()` for each entry.

Run with: `npx tsx scripts/scrape-roasters.ts`

Expect ~30–60 brews across Pour Over and Espresso origins after dedup.

### Origin mapping

The scraper must normalize origin strings to the 20 seeded origins. Use
`resolveOrigin()` from `src/lib/recommend.ts` — it handles fuzzy matching.
Any unresolved origin is logged and skipped (not inserted).

### Commit schedule

1. `feat(scripts): add roaster scraper for pour over + espresso`
2. `data: seed production DB with roaster brew data (N brews)`

---

## D2 — `technique` JSONB on `brewing_methods`

### Prisma schema change

Add to `BrewingMethod` model in `prisma/schema.prisma`:

```prisma
technique  String?   // JSON: BrewTechnique | null
```

Create migration: `npx prisma migrate dev --name add_technique_to_brewing_methods`

### TypeScript types (`src/types.ts`)

```typescript
// Method-scoped technique schema — shape varies by method
export interface PourOverTechnique {
  bloom_weight_ratio: number      // e.g. 2 = 2x coffee weight
  bloom_duration_s: number        // e.g. 45
  pour_stages: Array<{
    at_s: number                  // seconds from start
    volume_ml: number
    note?: string                 // e.g. "centre pour", "spiral"
  }>
  agitation?: string              // 'swirl' | 'stir' | 'none'
  drawdown_target_s?: number
}

export interface EspressoTechnique {
  preinfusion_s?: number
  yield_ratio: number             // e.g. 2 = 1:2 in:out
  shot_time_s: number
  pressure_bar?: number
  filter_type?: string            // 'paper' | 'metal' | 'cloth'
}

export interface FrenchPressTechnique {
  steep_time_s: number
  plunge_speed?: string           // 'slow' | 'medium'
  pre_wet?: boolean
  stir_at_s?: number
}

export interface AeroPresssTechnique {
  inverted: boolean
  steep_time_s: number
  stir_count?: number
  filter_type?: string            // 'paper' | 'metal'
}

export interface ColdBrewTechnique {
  steep_time_h: number
  steep_temp?: string             // 'room' | 'fridge'
  dilution_ratio?: number
}

export interface MokaPotTechnique {
  preheat_water: boolean
  heat_level?: string             // 'low' | 'medium'
  tamp?: string                   // 'none' | 'light'
}

export interface ChemexTechnique {
  filter_rinse: boolean
  bloom_duration_s: number
  bloom_weight_ratio: number
  pour_stages: Array<{ at_s: number; volume_ml: number; note?: string }>
}

export interface SiphonTechnique {
  heat_source?: string            // 'butane' | 'halogen' | 'electric'
  stir_pattern?: string
  drawdown_time_s?: number
}

export type BrewTechnique =
  | PourOverTechnique
  | EspressoTechnique
  | FrenchPressTechnique
  | AeroPresssTechnique
  | ColdBrewTechnique
  | MokaPotTechnique
  | ChemexTechnique
  | SiphonTechnique
```

### Seed data (`prisma/seed.ts`)

Add `technique` JSON to each of the 8 `upsertBrewingMethod` calls.
Values must be technically accurate — use established specialty coffee standards:

| Method | Key technique values (seed) |
|--------|-----------------------------|
| Pour Over | bloom 2x/45s, 3 pours (0:45/1:30/2:15), swirl agitation |
| Espresso | preinfusion 5s, 1:2 yield, 28s shot time, 9 bar |
| French Press | 240s steep, slow plunge, stir at 120s |
| AeroPress | inverted=false, 60s steep, metal filter option |
| Cold Brew | 18h fridge steep, 1:8 concentrate, 1:1 dilution |
| Moka Pot | preheat water=true, low heat, no tamp |
| Chemex | filter rinse=true, 45s bloom, 3 pours |
| Siphon | halogen heat, figure-8 stir, 60s drawdown |

### `db.ts` changes

Update `getBrewingMethods()` return type to include `technique`:

```typescript
export interface BrewingMethodRow {
  id: number
  name: string
  description: string
  default_temp_c: number
  grind_size: string
  default_brew_time_s: number
  default_ratio: number
  technique: BrewTechnique | null   // NEW
}
```

Parse `technique` JSON in the mapper (Prisma returns it as a string from TEXT column).

### Commit schedule

1. `feat(schema): add technique JSONB field to brewing_methods`
2. `feat(seed): add method-scoped technique data to all 8 brewing methods`
3. `feat(db): expose technique field in getBrewingMethods return type`

---

## D3 — `technique` in `recommend` response

### Response shape change

`POST /recommend` and MCP `recommend` tool both return technique from the
matched brewing method alongside the existing consensus params:

```json
{
  "id": 4,
  "brewing_method": "Pour Over",
  "input": { ... },
  "recommendation": "Based on 3 community brews...",
  "confidence": "high",
  "technique": {
    "bloom_weight_ratio": 2,
    "bloom_duration_s": 45,
    "pour_stages": [
      { "at_s": 45, "volume_ml": 60, "note": "centre pour" },
      { "at_s": 90, "volume_ml": 120, "note": "spiral out" },
      { "at_s": 135, "volume_ml": 120 }
    ],
    "agitation": "swirl"
  },
  "sources": [...],
  "data_points_used": 3
}
```

### Implementation

In `src/lib/recommend.ts` `computeBestBrew()`:
- The function already fetches the brewing method for defaults
- Attach `method.technique` to the returned `Recommendation` object
- No scoring changes needed — technique is pass-through from the method definition

Update `Recommendation` type in `src/types.ts` to include `technique: BrewTechnique | null`.

Update `docs/API-SPEC.md` `POST /recommend` response example to include `technique`.

### MCP tool

MCP `recommend` tool description should mention technique in its description
string so LLM clients know to surface it:

```typescript
description: 'Get a community-consensus brew recommendation. Returns brew parameters (temp, ratio, grind, time), confidence tier, sources, and method-specific technique guidance (bloom timing, pour stages, etc.)'
```

### Commit schedule

1. `feat(recommend): include method technique in recommend response`
2. `docs(api-spec): update POST /recommend response shape with technique`

---

## D4 — `compare_brew` match_score from `brew_recommendation_links`

### Current state

`GET /brews/:id/compare` returns `match_score: 0.5` hardcoded.

### Fix

In `src/routes/brewing.ts` `compare_brew` handler:
1. After fetching the brew by ID, call a new `db` function `getBrewLinks(brewId)`
2. If a link exists, use `link.match_confidence` as `match_score`
3. If no link, keep `0.5` with a note that no recommendation was found to link

`getBrewLinks()` already exists in `src/lib/db.ts` — just wire it into the route.

```typescript
// In compare_brew handler, after fetching brew:
const links = await getBrewLinks(brewId)
const matchScore = links.length > 0 ? links[0].match_confidence : 0.5
```

Update `match_confidence: 0.85` placeholder comment in architecture overview — it's
now live data, not a placeholder.

### Commit schedule

1. `fix(compare-brew): wire match_score from brew_recommendation_links`

---

## D5 — Deploy + seed production DB

After D1–D4 are merged to main (Railway auto-deploys):

1. Run `npx prisma migrate deploy` against production Neon DB (if not auto-run)
2. Run `npx tsx scripts/scrape-roasters.ts` pointed at `DATABASE_URL` (production)
3. Verify: `curl https://brew-guide-production.up.railway.app/brews?limit=5` shows
   scraped entries with `source: 'scraped:roaster'`
4. Verify: `curl https://brew-guide-production.up.railway.app/brewing-methods` shows
   `technique` field populated on all 8 methods
5. Verify: `curl -X POST .../recommend -d '{"brewing_method_id":1,"origin":"Ethiopia","roast_level":"light"}'`
   returns `technique` in response with real data

This is manual — `/devops` executes after merge.

---

## D6 — Landing page (`landing/index.html`)

### Audience

Coffee curious non-technical folks. James Hoffmann / Lance Hendrick YouTube fans.
People who care about their 30-second grind and their 93°C kettle. Not developers.

### Tone

Warm, curious, slightly nerdy without being exclusive. Coffee-forward. The MCP/AI
angle is a "how it works" curiosity, not the headline.

### Must-haves

- Headline that speaks to the coffee nerd, not the engineer
- 1-paragraph honest description of what it does and why it exists
- Live demo: origin + method selector → hits `/recommend` → shows result including
  technique steps. No login, no setup, instant.
- "How to connect it" section — three options: Claude.ai, Claude Desktop, Hermes
- "What's coming" — technique intelligence teaser (bloom timing, pour stages)
- Footer with GitHub link

### Design direction

- Single HTML file (no build step, no framework)
- Dark roast palette: deep brown/espresso background, cream/oat text, amber accents
- Clean typography — something like a specialty roaster's brand guide
- Mobile responsive
- The demo widget is the centrepiece — make it feel alive

### Demo widget behaviour

```javascript
// On submit:
// 1. POST /recommend with selected origin + method + roast
// 2. Show: recommended params in a clean card
// 3. Show: technique steps as a numbered brew guide
// 4. Show: confidence tier + "based on N community brews"
// If technique is null (shouldn't be after D2): gracefully omit that section
```

Origins dropdown: the 20 seeded origins (fetch from `/origins` on load)
Methods dropdown: Pour Over, Espresso, French Press, AeroPress, Cold Brew,
  Moka Pot, Chemex, Siphon (fetch from `/brewing-methods` on load)
Roast level: Light / Medium / Medium-Dark / Dark (static)

### Commit schedule

1. `feat(landing): add coffee-forward landing page with live recommend demo`

---

## D7 — DEV.to submission post

### Format

DEV.to "Build With Hermes Agent" template. Published as a DEV.to post — the
article IS the submission.

Draft lives at `docs/competition-entry.md` before publishing.

### Judging criteria to address

1. **Effective use of Hermes Agent's agentic capabilities** — the entire build
   was orchestrated by Hermes: planning, implementation, iteration, review,
   retro, documentation, scraping. Show the workflow, not just the output.
2. **Technical implementation and code quality** — deterministic recommendation
   engine, Prisma + Neon, rate limiting, 53 tests, TypeScript strict
3. **Creativity and originality** — community consensus over coffee data as an
   MCP server is genuinely novel. The technique angle differentiates it.
4. **Usability and user experience** — live public endpoint, one-command connect,
   landing page demo, works with Claude/Hermes/Cursor out of the box

### Article structure

```
Title: I Built a Community Coffee Brain for Claude (and Every Other AI)

Hook: The gap between a generic "brew at 93°C" and a real barista's advice

Section 1: What Brew Guide is
  - The problem: AI coffee advice is averages. This is community consensus.
  - The demo: "How should I brew Ethiopian light roast with a pour over?"
  - Screenshot of recommend response with technique

Section 2: How Hermes built it
  - The actual agentic workflow: plan → implement → review → retro
  - Show .claude/commands/ role files as the multi-agent setup
  - The scraping pipeline as a concrete Hermes task example
  - Honest: what went right, what Hermes caught, what it missed

Section 3: The MCP angle
  - Why MCP matters for knowledge servers
  - One-line connect: hermes mcp add brew_guide --url ...
  - What you can ask once connected

Section 4: What's next
  - Technique intelligence: bloom timing, pour stages, per-method nuance
  - The opt-in narrative synthesis idea
  - Community data snowball effect

Call to action: GitHub link, production endpoint, try it in your MCP client
```

### Tone

Honest and curious — not a product pitch. Reads like a James Hoffmann video
feels: technically rigorous but accessible, with personality.

---

## Commit schedule (full sprint)

```
feat(scripts): add roaster scraper for pour over + espresso          [D1]
feat(schema): add technique JSONB field to brewing_methods            [D2]
feat(seed): add method-scoped technique data to all 8 brewing methods [D2]
feat(db): expose technique field in getBrewingMethods return type     [D2]
feat(recommend): include method technique in recommend response       [D3]
docs(api-spec): update POST /recommend response shape with technique  [D3]
fix(compare-brew): wire match_score from brew_recommendation_links    [D4]
feat(landing): add coffee-forward landing page with live demo widget  [D6]
```

D5 (deploy + seed) and D7 (DEV.to post) are manual/async alongside the above.

---

## Day-by-day execution order

**Day 1 (today):** D4 (quick win, 1 hour) → D2 schema + seed → D1 scraper start  
**Day 2:** D1 scraper finish + run locally → D3 technique in recommend response  
**Day 3:** D5 deploy + production seed → D6 landing page  
**Day 4:** D6 landing page finish → D7 competition entry draft → publish

---

## Risk flags

- Roaster sites may block scraping or restructure pages — have 12 targets, only
  need 5–6 to work. Fallback: hand-curate brew data from publicly available
  roaster PDFs.
- Prisma migration on production must happen before scraper runs — don't run
  scraper against production before `technique` column exists.
- D7 (DEV.to post) requires a DEV.to account and must be published, not just
  drafted — allow 2 hours for writing + editing + publishing.
