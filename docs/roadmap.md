# Roadmap

Tracks planned work by phase. Completed items move to `CHANGELOG.md`.

---

## Phase 2 — LLM Inference

Replace static stub responses with real AI-powered recommendations.

- [x] `compare_brew` tool — delta analysis between logged brew and method baseline
- [ ] `recommend` tool — wire OpenRouter to generate brew advice from origin + roast + method
- [ ] Structured reasoning output with real confidence scoring

**Owner**: `/backend-architect`  
**Depends on**: `OPENROUTER_API_KEY` in environment

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
