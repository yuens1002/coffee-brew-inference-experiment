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
- [ ] Scraping pipeline — auto-ingest community brew data from Reddit + forums

**Owner**: `/backend-architect`

---

## Phase 4 — Persistent Storage

Move off sql.js (in-process WASM) to a hosted database.

- [ ] Migrate to Turso (libSQL) or Supabase (Postgres) — evaluate by deploy target
- [ ] Schema migration tooling (drizzle or raw SQL)
- [ ] Update `src/lib/db.ts` with new client; keep interface stable so tests don't change

**Owner**: `/backend-architect`, `/devops`

---

## Phase 5 — Public Deployment

Ship a stable, publicly reachable MCP endpoint.

- [ ] Deploy to Fly.io or Railway (Node-compatible, persistent volume if keeping SQLite)
- [ ] Set `DEV_SERVER_URL` → production URL in CLAUDE.md
- [ ] Register with MCP directory / Claude Desktop config example in README
- [ ] Rate limiting + auth token (optional, if public traffic is a concern)

**Owner**: `/devops`

---

## Icebox

- Landing page (`landing/index.html`) wired to live API
- Weekly coffee literature digest via `hermes-automation/`
- Community brew leaderboard (highest-rated brews by method)
