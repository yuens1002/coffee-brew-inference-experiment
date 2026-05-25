# Architecture Divergence Note

## Two MCP Server Code Paths

| | Main (`src/`) | Standalone (`mcp-server/`) |
|---|---|---|
| **Language** | TypeScript (strict) | JavaScript |
| **Data source** | sql.js (SQLite WASM) | JSON files (`data/brewing_methods.json`, `data/brews.json`) |
| **Origin check** | `localhost`, `yuens.me`, `*.yuens.me` | `claude.ai`, `claude.com`, `ALLOWED_ORIGINS` env var |
| **Transport** | StreamableHTTP via `@hono/mcp` | StreamableHTTP via `@hono/mcp` |
| **Tools** | 5 (search_brews added) | 4 (no search_brews) |
| **Status** | **Active — source of truth** | Legacy — JSON file reader |

## Decision

The main `src/` server is the canonical implementation. The `mcp-server/` directory is retained for reference but is **not kept in sync** with the main code path. All future development targets `src/` only.

## Unified Data Model (v2.0.0)

Both REST and MCP surfaces now share the same snake_case shape (matching `docs/API-SPEC.md`):

- `BrewingMethod`: id (number), name, description, default_ratio, default_temp_c, grind_size, default_brew_time_s
- `Brew`: id (number), brewing_method_id (number), origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating, notes, created_at
