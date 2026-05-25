# Changelog

All notable changes to this project will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Planned
- AI-powered `recommend` tool backed by a real LLM via OpenRouter (replacing the static method lookup)
- Narrative parsing: unstructured user text → structured brew data (LLM extraction)
- Scheduled scraping pipeline: Reddit + coffee forums → auto-ingest community brew data
- Persistent storage migration from sql.js (file-based) to a hosted DB (Supabase / Turso)

---

## [2.0.0] — 2026-05-25

### Changed (Breaking)
- **Data model unified to API-SPEC snake_case** — `waterTemp` → `water_temp_c`, `grindSize` → `grind_size`, `brewTime` → `brew_time_s`
- `coffeeName` replaced by `origin` + `roast_level` (two rich fields)
- `ratio` changed from string (`"1:16"`) to number (`0.0625`)
- `id` changed from TEXT UUID to INTEGER AUTOINCREMENT
- `timestamp` → `created_at`

### Added
- `GET /brews` now queries DB with `?origin=&method=&limit=` filters, returns `{count, brews}` with method name
- `GET /brews/:id` — fetch single brew by ID
- `GET /brews/:id/compare` — real delta analysis vs method defaults (temp, time, ratio, grind comparison)
- `search_brews` MCP tool — filter brew logs by origin, method, limit
- Five MCP tools total (was four)
- `docs/architecture/mcp-server-divergence.md` — documented standalone server divergence
- `docs/plans/mvp-autonomous-plan.md` — master plan for 3 autonomous build sessions

### Fixed
- `compare_brew` MCP tool — real deltas (was hardcoded "80% match")
- `POST /brews` response now returns `{id, message}` matching API-SPEC
- `POST /recommend` returns structured `Recommendation` with `input` echo
- All 31 tests updated to new data model
- TypeScript strict: zero errors

---

## [1.0.1] — 2026-05-25

### Fixed
- `checkOrigin` now allows no-`Origin` requests (direct MCP clients) and `localhost` origins for local testing
- Default port changed from 3000 to 4000 to avoid conflicts with other local services
- Removed broken `import.meta.url` guard (fails on Windows) — server now starts unconditionally
- `dev` script updated to `npx tsx` so tsx runs without a global install

---

## [1.0.0] — 2026-05-25

### Added
- Hono + TypeScript MCP server at `/mcp` via `@hono/mcp` + `@modelcontextprotocol/sdk`
- Four MCP tools registered on the server:
  - `get_brewing_methods` — returns all brewing methods with parameters
  - `recommend` — recommends brew parameters for a given coffee and method
  - `log_brew` — logs a structured brew entry to SQLite (grounded retrieval target)
  - `compare_brew` — stub comparing a logged brew against AI recommendation
- SQLite persistence via `sql.js` with auto-seed of 8 brewing methods on first boot
- REST API routes (`/brewing-methods`, `/recommend`, `/brews`, `/brews/:id/compare`)
- CORS middleware on all routes for public MCP access
- `GET /health` endpoint
- `docs/API-SPEC.md` — two-journey API spec (Query → Log → Compare)

### Refactored
- Full backend rebuild from prototype Express/JS to Hono + TypeScript strict mode
- Unified `src/lib/db.ts` as the single SQLite access layer (replaces inline sql.js calls)
- Separated MCP transport (`src/routes/mcp.ts`) from REST routes (`src/routes/brewing.ts`)
- Fixed sql.js WASM path resolution for Node (`locateFile` pointing to `node_modules/sql.js/dist/`)

---

## [0.3.0] — 2026-05-24 (pre-rebuild)

### Added
- Pure-JS `/recommend` endpoint — no Python dependency, static method-based recommendation
- All prototype endpoints working: `/brewing-methods`, `/recommend`, `/brews`
- Hono MCP server wired up (`mcp-server/`) — initial integration

---

## [0.2.0] — 2026-05-23

### Added
- TypeScript source files: `src/index.ts`, `src/types.ts`
- `hermes-automation/` — weekly literature automation scaffold
- DSPy inference pipeline in `inference/` (Python, kept as reference)
- DB population script (`inference/populate_db.py`)
- Landing page updated with dual user journeys (How? / Real Experience)
- GitHub Linguist config (`.linguistignore`, `.gitattributes`) — forces TypeScript as primary language

---

## [0.1.0] — 2026-05-20

### Added
- Initial repository structure
- `data/brewing_methods.json` — seed data for 8 brewing methods
- `db/schema.sql` — relational schema for `brewing_methods` and `brews`
- `inference/brew_inference.py` — DSPy-based inference prototype
- `landing/index.html` — experiment landing page
