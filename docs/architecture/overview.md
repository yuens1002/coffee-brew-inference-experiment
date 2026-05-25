# Architecture Overview

## Purpose

A public MCP server that acts as an agentic coffee knowledge base — answering "how to brew the best coffee" and logging structured brew experiments for grounded retrieval.

## Stack

| Layer | Technology |
|-------|-----------|
| HTTP framework | Hono 4 |
| MCP transport | `@hono/mcp` (Streamable HTTP) |
| MCP protocol | `@modelcontextprotocol/sdk` |
| Runtime | Node 24, TypeScript strict, ESM |
| Database | sql.js (SQLite WASM, file-persisted) |
| Test runner | Vitest |

## Module map

```
src/
  server.ts          → entrypoint: binds port, never imported by tests
  index.ts           → pure Hono app: mounts routes, safe to import anywhere
  routes/
    brewing.ts       → REST routes (/brewing-methods, /brews, /recommend)
    mcp.ts           → MCP tool handlers + Streamable HTTP transport
  lib/
    db.ts            → sql.js wrapper: getBrewingMethods, addBrew, saveDB
    mcp-common.ts    → checkOrigin, corsHeaders
  types.ts           → BrewingMethod, Brew, Recommendation interfaces
```

## Request flow

### REST
```
Client → GET/POST /brewing-methods|/brews|/recommend
  → src/index.ts (CORS middleware)
  → src/routes/brewing.ts
  → src/lib/db.ts (sql.js)
  → JSON response
```

### MCP (Streamable HTTP)
```
MCP Client → POST /mcp
  → src/routes/mcp.ts: checkOrigin → buildMcpServer() → StreamableHTTPTransport
  → tool handler: get_brewing_methods | recommend | log_brew | compare_brew
  → src/lib/db.ts (sql.js)
  → SSE response (event: message / data: {...})
```

## MCP tools

| Tool | Status | Description |
|------|--------|-------------|
| `get_brewing_methods` | ✅ Live | Returns all 8 seeded brewing methods |
| `recommend` | ⚠️ Stub | Returns static method params — no LLM yet |
| `log_brew` | ✅ Live | Persists a brew entry to SQLite |
| `compare_brew` | ⚠️ Stub | Hardcoded 80% match — not implemented |

## Data model

```
brewing_methods
  id TEXT PK, name TEXT, description TEXT,
  water_temp INT, grind_size TEXT, brew_time INT, ratio TEXT

brews
  id TEXT PK, method_id TEXT FK,
  coffee_name TEXT, grind_setting TEXT,
  water_temp INT, brew_time INT,
  rating INT (1–5), notes TEXT, timestamp TEXT
```

## Origin policy

| Origin | Allowed |
|--------|---------|
| No `Origin` header | ✅ (direct MCP clients) |
| `*.yuens.me` | ✅ |
| `localhost` (any port) | ✅ |
| Everything else | ❌ 403 |

## Planned evolution

See `docs/roadmap.md` for next phases (LLM inference, grounded retrieval, hosted DB, public deployment).
