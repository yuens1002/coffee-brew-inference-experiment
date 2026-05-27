# Coffee Brew Guide — Community-Powered MCP Server

> A public MCP server that answers "how should I brew this coffee?" from logged community brew data. Accepts brew experiments, builds consensus recommendations, and exposes everything over the Model Context Protocol.

**Production MCP endpoint:** `https://brew-guide-production.up.railway.app/mcp`

---

## Tech Stack

- **TypeScript** (strict mode, ESM, Node 24)
- **Hono 4** + `@hono/node-server`
- **Neon Postgres** + **Prisma ORM**
- **MCP** (`@modelcontextprotocol/sdk` + `@hono/mcp` — Streamable HTTP transport)
- **Vitest** (53 tests, zero TypeScript errors)
- **Railway** (auto-deploy from `main`)

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_brewing_methods` | Returns all 8 brewing methods with default parameters |
| `recommend` | Community-consensus brew recommendation (origin + roast → params + confidence). Returns brew parameters (temp, ratio, grind, time), confidence tier, sources, and method-specific technique guidance (bloom timing, pour stages, steep times). |
| `log_brew` | Persist a brew experiment; links to any recent recommendation for the same origin + method |
| `search_brews` | Filter the brew log by origin, method, limit |
| `compare_brew` | Delta analysis of a logged brew against method baseline |

Recommendations are deterministic weighted consensus over logged brew data — no LLM dependency. Confidence tiers (`high` / `medium` / `low`) reflect how much matching community data exists.

---

## Connect via MCP

Brew Guide exposes a public Streamable HTTP MCP endpoint — no auth required:

```
https://brew-guide-production.up.railway.app/mcp
```

Works with any MCP-capable environment:

| Platform | How to connect |
|----------|---------------|
| **Claude Desktop** | Add to `claude_desktop_config.json` (see below) |
| **Claude.ai** | Settings → Integrations → Add MCP server URL |
| **Hermes Agent** | Add to `~/.hermes/config.yaml` under `mcp_servers` (see below) |
| **Cursor / Windsurf** | MCP settings → add server URL |
| **Any MCP client** | Point at the endpoint with `Content-Type: application/json` + `Accept: application/json, text/event-stream` |

### Claude Desktop

Add to `claude_desktop_config.json`:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "brew-guide": {
      "type": "http",
      "url": "https://brew-guide-production.up.railway.app/mcp"
    }
  }
}
```

### Hermes Agent

Hermes has a built-in MCP manager. Run:

```bash
hermes mcp add brew_guide --url https://brew-guide-production.up.railway.app/mcp
```

Then restart Hermes — the brew tools will be available in every conversation.

> For full options (auth, env vars, stdio servers) see `hermes mcp --help` or the [Hermes MCP docs](https://hermes-agent.nousresearch.com/docs).

---

## REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/origins` | GET | List all known coffee origins (20 seeded + community) |
| `/brewing-methods` | GET | List 8 brewing methods with defaults |
| `/recommend` | POST | Brew recommendation (origin + roast + method → params) |
| `/brews` | GET | Browse brew log (`?origin=&method=&limit=`) |
| `/brews` | POST | Log a brew experience |
| `/brews/:id/compare` | GET | Compare logged brew to method baseline |
| `/mcp` | POST | MCP Streamable HTTP endpoint |
| `/health` | GET | Health check |

Full spec: `docs/API-SPEC.md`

---

## Local Dev

```bash
# Requires a Neon DATABASE_URL — copy .env.example to .env and fill in your connection string
cp .env.example .env

npm install          # also runs prisma generate
npx prisma migrate deploy
npx prisma db seed

npm test             # 53 tests
npm run dev          # dev server on port 4000
```

---

## Project Structure

```
brew-guide/
├── src/
│   ├── server.ts          # Entrypoint (port 4000)
│   ├── index.ts           # Hono app: mounts routes + CORS
│   ├── types.ts           # BrewingMethod, Brew, Recommendation types
│   ├── routes/
│   │   ├── brewing.ts     # REST routes
│   │   └── mcp.ts         # MCP tool handlers (5 tools)
│   └── lib/
│       ├── db.ts          # Prisma client wrapper (all DB access)
│       ├── recommend.ts   # Recommendation engine (computeBestBrew)
│       └── mcp-common.ts  # CORS + origin check
├── prisma/
│   ├── schema.prisma      # 5 models — Origin, BrewingMethod, Brew, Recommendation, BrewRecommendationLink
│   ├── seed.ts            # 20 origins + 8 methods (idempotent upsert)
│   └── migrations/        # Prisma Migrate history
├── docs/
│   ├── API-SPEC.md        # Full endpoint specification
│   ├── architecture/      # Module map, data model, request flows
│   ├── plans/             # Feature plans, ACs, review reports
│   └── roadmap.md         # Phased development plan
├── inference/             # DSPy prototype (Python, reference only — not active)
├── landing/               # Static landing page
└── tsconfig.json
```

---

## Origin Policy

No auth required. CORS:
- No `Origin` header → allowed (direct MCP clients, curl)
- `*.yuens.me` → allowed
- `localhost` (any port) → allowed
- All other origins → 403

---

## Competition

DEV Hermes Agent Challenge 2026 — Build With Hermes Agent track.
