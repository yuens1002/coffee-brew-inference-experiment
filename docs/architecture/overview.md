# Architecture Overview

## Purpose

A public MCP server that acts as an agentic coffee knowledge base — answering "how to brew the best coffee" from logged community brew data, and capturing structured brew experiments for grounded retrieval and recommendation improvement.

## Stack

| Layer | Technology |
|-------|-----------|
| HTTP framework | Hono 4 |
| MCP transport | `@hono/mcp` (Streamable HTTP) |
| MCP protocol | `@modelcontextprotocol/sdk` |
| Runtime | Node 24, TypeScript strict, ESM |
| Database | sql.js (SQLite WASM, file-persisted at `data/coffee-brew.db`) |
| Test runner | Vitest |

## Module map

```
src/
  server.ts          → entrypoint: binds port, never imported by tests
  index.ts           → pure Hono app: mounts routes, safe to import anywhere
  routes/
    brewing.ts       → REST routes (/origins, /brewing-methods, /brews, /recommend)
    mcp.ts           → MCP tool handlers + Streamable HTTP transport
  lib/
    db.ts            → sql.js wrapper: all DB access; mock this in tests
    recommend.ts     → recommendation engine: computeBestBrew, tryLinkBrew, resolveOrigin
    mcp-common.ts    → checkOrigin, corsHeaders
  types.ts           → all shared interfaces (Brew, Recommendation, Origin, etc.)
```

## Request flow

### REST
```
Client → GET/POST /origins|/brewing-methods|/brews|/recommend
  → src/index.ts (CORS middleware)
  → src/routes/brewing.ts
  → src/lib/recommend.ts  (for /recommend and /brews — origin resolution + linking)
  → src/lib/db.ts (sql.js)
  → JSON response
```

### MCP (Streamable HTTP)
```
MCP Client → POST /mcp
  → src/routes/mcp.ts: checkOrigin → buildMcpServer() → StreamableHTTPTransport
  → tool handler: get_brewing_methods | recommend | log_brew | search_brews | compare_brew
  → src/lib/recommend.ts  (for recommend and log_brew)
  → src/lib/db.ts (sql.js)
  → SSE response (event: message / data: {...})
```

## MCP tools

| Tool | Status | Description |
|------|--------|-------------|
| `get_brewing_methods` | ✅ Live | Returns all 8 seeded brewing methods |
| `recommend` | ✅ Live | Deterministic community consensus via `computeBestBrew` |
| `log_brew` | ✅ Live | Persists a brew entry; resolves origin; links to recent recommendation |
| `search_brews` | ✅ Live | Filter brew log by origin, method, limit |
| `compare_brew` | ⚠️ Stub | Delta vs method defaults — real scoring planned for Phase 2 |

## Data model (v3)

```
origins
  id PK, name TEXT UNIQUE, region TEXT, subregion TEXT,
  aliases TEXT (comma-separated), is_verified INT

brewing_methods
  id PK, name TEXT, description TEXT,
  default_temp_c INT, grind_size TEXT,
  default_brew_time_s INT, default_ratio REAL

brews
  id PK, brewing_method_id FK → brewing_methods,
  origin TEXT, roast_level TEXT, grind_size TEXT,
  water_temp_c INT, ratio REAL, brew_time_s INT,
  rating INT (1–5), notes TEXT, created_at TEXT,
  source TEXT (user_submitted | scraped:reddit | scraped:home-barista),
  source_url TEXT,
  field_confidence TEXT (JSON: per-field extraction confidence, 0–1)

recommendations
  id PK, brewing_method_id FK, origin TEXT, roast_level TEXT,
  grind_size TEXT, water_temp_c INT, ratio REAL, brew_time_s INT,
  recommendation TEXT, confidence TEXT (high|medium|low),
  confidence_breakdown TEXT (JSON), sources TEXT (JSON: SourceRef[]),
  fingerprint TEXT UNIQUE, created_at TEXT

brew_recommendation_links
  brew_id FK, recommendation_id FK,
  match_confidence REAL, linked_at TEXT
  PK (brew_id, recommendation_id)
```

## Recommendation engine

`src/lib/recommend.ts` — pure deterministic logic, no LLM.

### computeBestBrew flow

1. **Origin resolution** — raw input string → `resolveOrigin` → normalized name (exact → alias → fuzzy → pass-through)
2. **Fetch candidates** — up to 50 recent brews from the DB
3. **Score each brew** against request params:
   - Origin match (weight 3): exact = 1.0, substring = 0.5, absent = 0
   - Method match (weight 3): method ID equality
   - Roast level (weight 2): exact = 1.0, adjacent roast = 0.5 (e.g. medium ↔ medium-light)
   - Grind size (weight 1): exact = 1.0
4. **Composite score** = `matchScore × (rating/5) × recencyDecay × sourceTrust`
   - `recencyDecay`: linear 1.0 → 0.1 over 365 days
   - `sourceTrust`: user_submitted=1.0, scraped:home-barista=0.85, scraped:reddit=0.7
5. **Take top 5**, compute confidence tier, build consensus params via weighted average (numeric) or weighted mode (categorical)
6. **Persist recommendation** to `recommendations` table with fingerprint + confidence breakdown

### Confidence tiers

| Tier | Condition | Output params |
|------|-----------|---------------|
| `high` | ≥3 matches, totalWeight > 1.5 | Pure weighted community consensus |
| `medium` | 1–2 matches | 50/50 blend of community data + method defaults |
| `low` | 0 matches | Pure method defaults |

## Recommendation → brew feedback loop

### How it works

Every time a user logs a brew (`POST /brews` or MCP `log_brew`), the server fire-and-forgets `tryLinkBrew`. This looks back up to 7 days for a `recommendations` row that matches the same origin + method + roast, and if found, writes a row to `brew_recommendation_links`.

```
POST /recommend ──► recommendations (stored prediction)
                         │
         user brews coffee
                         │
POST /brews ─────► brews (logged outcome)
                         │
               tryLinkBrew (fire-and-forget)
                         │
                         ▼
            brew_recommendation_links
            (brew_id, recommendation_id, match_confidence)
```

### What it enables

Once a brew is linked to the recommendation that preceded it, you can ask:
- Did brews that followed a recommendation rate higher than brews that deviated from it? (recommendation quality signal)
- When we recommended 93°C and the user brewed at 91°C and rated it 4/5, what does that delta imply? (parameter sensitivity)
- Which source brews contributed to recommendations that produced high-rated real-world outcomes? (source quality reinforcement)

This data is **captured now but not yet consumed** — the link table is the foundation for a future feedback pass that would adjust source weights or score coefficients based on actual outcomes. `match_confidence: 0.85` is a placeholder; it will eventually reflect how closely the logged brew matched the recommendation.

## Origin verification signal

### What resolveOrigin produces

`resolveOrigin(raw)` returns `{ resolved: string, verified: boolean }`:

| Match type | `verified` | Example input → resolved |
|------------|-----------|--------------------------|
| Exact match | `true` | `'Ethiopia'` → `'Ethiopia'` |
| Alias match | `true` | `'Ethiopean'` → `'Ethiopia'` |
| Fuzzy (name substring) | `false` | `'Ethiop'` → `'Ethiopia'` |
| Unknown (pass-through) | `false` | `'Bali Blue Moon'` → `'Bali Blue Moon'` |

### How origin confidence is stored and used

When a brew is logged, `resolveOrigin` returns `{ resolved, verified }`. The route computes `field_confidence.origin` and stores it alongside the brew:

```
verified === true                    → field_confidence.origin = 1.0
verified === false, resolved ≠ raw  → field_confidence.origin = 0.7  (fuzzy — likely right)
verified === false, resolved === raw → field_confidence.origin = 0.5  (unknown — could be anything)
```

`computeBestBrew` reads `field_confidence.origin` via `originConf(brew)` and multiplies it into the composite score. Brews logged before this field was introduced default to `1.0` (backward-compatible). `high` confidence is earned only when enough verified-origin data agrees.

## Origin policy

| Origin | Allowed |
|--------|---------|
| No `Origin` header | ✅ (direct MCP clients) |
| `*.yuens.me` | ✅ |
| `localhost` (any port) | ✅ |
| Everything else | ❌ 403 |

## Deployment

| Target | URL |
|--------|-----|
| Production (Railway) | https://brew-guide-production.up.railway.app |
| MCP endpoint | https://brew-guide-production.up.railway.app/mcp |

Railway project: `brew-guide` — auto-deploys from `main` on `yuens1002/brew-guide`.

## Planned evolution

See `docs/roadmap.md`. Highest-priority gaps:
1. `compare_brew` — wire `match_score` from `brew_recommendation_links` (currently hardcoded `0.5`)
2. Scraping pipeline — auto-ingest community data from Reddit + forums
3. Persistent storage — migrate from sql.js to Neon Postgres + Prisma (Phase 4)
