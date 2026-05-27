# Roadmap

Tracks planned work by phase. Completed items move to `CHANGELOG.md`.

---

## Phase 2 — Recommendation Engine

Replace static stub responses with real recommendations backed by logged brew data.

- [x] `compare_brew` tool — delta analysis between logged brew and method baseline
- [x] `recommend` tool — wired as deterministic community consensus (`computeBestBrew`): weighted scoring by origin/roast/method similarity, recency decay, source trust; confidence: high/medium/low based on match count and quality
- [x] Structured confidence scoring with `sources` attribution and `data_points_used`

**Owner**: `/backend-architect`  
**Note**: Implemented as deterministic consensus over logged brews (no LLM/OpenRouter dependency). LLM-powered narrative recommendations remain a future option once community data volume justifies it.

---

## Phase 3 — Grounded Retrieval

Make the knowledge base queryable from logged brew history.

- [x] `search_brews` MCP tool — filter brew log by origin, method, limit
- [x] `get_brew` / `GET /brews/:id` — fetch a single brew by ID
- [ ] Semantic similarity on brew notes (embedding + vector search or keyword)
- [ ] Scraping pipeline — ingest roaster brew guides + community sources (Reddit, home-barista.com) as the primary seed for technique data (see Phase 6)

**Owner**: `/backend-architect`

---

## Phase 6 — Technique Intelligence

Surface brew technique depth that generic search and AI recommendations can't — method-specific process steps extracted from community data, aggregated into consensus technique guidance, and synthesized into narrative at query time.

### Motivation

The current recommendation engine outputs aggregate parameters (temp, ratio, grind, time). These are necessary but not sufficient. Experienced brewers think in sequences: bloom weight, bloom duration, pour stages, agitation style, drawdown targets. This knowledge exists densely in roaster brew cards, forum posts, and YouTube descriptions — but it's unstructured and method-specific. Capturing and surfacing it is what differentiates this server from a generic recipe lookup.

### Technique is method-scoped

Each brewing method has its own technique vocabulary. A technique schema must be defined per method, not as a universal structure:

| Method | Key technique dimensions |
|--------|-------------------------|
| Pour Over | bloom weight/duration, pour stages (timing + volume), agitation, drawdown target |
| French Press | steep time, plunge speed, pre-wet, bloom (where applicable) |
| AeroPress | inverted vs standard, steep time, pressure, paper vs metal filter |
| Espresso | preinfusion time/pressure, yield ratio, pressure profiling, shot time |
| Cold Brew | steep time, temperature, coarse grind variance, dilution ratio |
| Moka Pot | heat level, preheat water, tamping (none vs light) |
| Chemex | filter rinse, bloom, pour cadence, thickness of filter effect on taste |
| Siphon | heat source, stir pattern, drawdown time |

### Deliverables

- [ ] `technique` JSONB field on `brewing_methods` — method-scoped schema defining what technique dimensions exist for each method (e.g. `bloom_weight_ratio`, `pour_stages`, `agitation`)
- [ ] `technique` JSONB field on `brews` — stores per-brew technique data conforming to that method's schema, extracted from `notes` or provided explicitly
- [ ] LLM extraction pass at ingest time — when a brew is logged with technique-rich `notes`, extract and normalize technique fields into the structured schema; run as a background job, non-blocking
- [ ] Scraping pipeline (from Phase 3) feeds technique extraction — roaster guides and forum posts are the primary data source; extraction scales this across community data without requiring users to manually fill technique fields
- [ ] Technique consensus in `computeBestBrew` — extend weighted scoring to aggregate technique patterns across matched brews (weighted mode for categorical fields like `agitation`, weighted average for numeric fields like `bloom_duration_s`)
- [ ] Narrative synthesis at query time — when `confidence` is `medium` or `high`, pass consensus technique data through an LLM to generate a step-by-step brew guide; this is where LLM narrative recommendation (punted from Phase 2) earns its place
- [ ] `recommend` response extended with `technique` object and optional `narrative` string

**Owner**: `/backend-architect`, `/backend-architect` (LLM extraction), `/devops` (scraping infra)  
**Depends on**: Phase 3 scraping pipeline (data volume), Neon JSONB support (already available)  
**Note**: Technique extraction LLM calls are at ingest time only — the recommendation hot path stays deterministic. Narrative synthesis is additive and gated on confidence tier.

---

## Phase 4 — Persistent Storage

Move off sql.js (in-process WASM) to a hosted database.

- [x] Migrate to Neon Postgres + Prisma ORM (chose Neon over Turso/Supabase — direct connection URL for Railway)
- [x] Schema migration tooling — Prisma Migrate (`prisma/migrations/`)
- [x] Update `src/lib/db.ts` with new client; function signatures kept identical so tests are unchanged

**Owner**: `/backend-architect`, `/devops`

---

## Phase 5 — Public Deployment

Ship a stable, publicly reachable MCP endpoint.

- [x] Deploy to Railway — auto-deploys from `main` on `yuens1002/brew-guide`
- [x] Set production URL in CLAUDE.md (`https://brew-guide-production.up.railway.app`)
- [x] Rate limiting — 60 req/min REST, 20 req/min MCP (`hono-rate-limiter`, #219d5fc)
- [x] Claude Desktop + MCP client connection docs added to README
- [ ] Submit to MCP Registry (registry.modelcontextprotocol.io) — low priority, post-competition

**Owner**: `/devops`

---

## Icebox

- Landing page (`landing/index.html`) wired to live API
- Weekly coffee literature digest via `hermes-automation/`
- Community brew leaderboard (highest-rated brews by method)
