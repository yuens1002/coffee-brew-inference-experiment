# Coffee Brew — Public MCP Server for Coffee Brewing Knowledge

> **Open coffee knowledge base** — AI-powered brew recommendations + community brew logging via MCP protocol.

## Tech Stack
- **TypeScript** (strict mode, Hono 4, ESM)
- **sql.js** (SQLite WASM, file-persisted)
- **MCP** (@modelcontextprotocol/sdk + @hono/mcp — Streamable HTTP)
- **Vitest** (31 tests, zero TypeScript errors)

## Structure
```
brew-guide/
├── src/
│   ├── server.ts          # Entrypoint (port 4000)
│   ├── index.ts           # Hono app: mounts routes + CORS
│   ├── types.ts           # BrewingMethod, Brew, Recommendation types
│   ├── routes/
│   │   ├── brewing.ts     # REST routes (/brewing-methods, /brews, /recommend)
│   │   └── mcp.ts         # MCP tool handlers (5 tools)
│   ├── lib/
│   │   ├── db.ts          # sql.js wrapper (auto-seed, query, insert)
│   │   └── mcp-common.ts  # CORS + origin check
│   └── __tests__/         # Vitest suites (31 tests)
├── docs/
│   ├── API-SPEC.md        # Two-journey API specification
│   ├── architecture/      # Module map, divergence notes
│   ├── plans/             # Feature plans, ACs, review reports
│   └── roadmap.md         # Phased development plan
├── inference/             # DSPy prototype (Python, reference)
├── landing/               # Simple HTML landing page
├── package.json
└── tsconfig.json
```

## Quick Start
```bash
npm install
npm test          # 31 tests
npm run dev       # Start dev server on port 4000
```

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/brewing-methods` | GET | List 8 brewing methods with defaults |
| `/recommend` | POST | AI brew recommendation (origin + roast → params) |
| `/brews` | GET | List brew logs with filters (?origin=&method=&limit=) |
| `/brews` | POST | Log a brew experience |
| `/brews/:id/compare` | GET | Compare logged brew to standard method |
| `/mcp` | POST | MCP Streamable HTTP endpoint (5 tools) |
| `/health` | GET | Health check |

## MCP Tools
| Tool | Description |
|------|-------------|
| `get_brewing_methods` | Returns all brewing methods |
| `recommend` | AI brew recommendation |
| `log_brew` | Log a brew experience |
| `search_brews` | Search brew logs with filters |
| `compare_brew` | Compare logged brew to baseline |

## Deployment
**Production:** https://brew-guide-production.up.railway.app  
**MCP endpoint:** https://brew-guide-production.up.railway.app/mcp

## Competition
DEV Hermes Agent Challenge 2026 — Build With Hermes Agent track.
