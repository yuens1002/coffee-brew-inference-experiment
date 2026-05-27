---
title: I Built an AI Coffee Barista Coach as an MCP Server (Using Claude Code + Claude)
published: false
description: How I used an agentic coding workflow to build a community-consensus brew guide with technique intelligence — all accessible via MCP.
tags: claudeai, mcp, typescript, coffee
cover_image:
---

## What is Brew Guide?

Here's the problem: ask any AI "how should I brew Ethiopian light roast with a pour over?" and you'll get a perfectly averaged answer. 93°C. Medium-fine grind. 1:16 ratio. Four minutes. Technically correct. Spiritually empty.

Real baristas don't talk in averages. They talk in sequences. Bloom 2x your coffee weight for 45 seconds. Then a slow centre pour. Then a spiral out at 1:30. Watch the drawdown. The difference between a flat, forgettable cup and something that smells like jasmine and blueberries is almost entirely in those steps — not in whether you hit 93°C or 92°C.

Brew Guide is a public MCP server that tries to close that gap. It's a community coffee knowledge base that:

- Logs real brew experiments (yours, or scraped from trusted roaster guides)
- Builds consensus recommendations from that data — not vibes, not averages, but weighted scoring across origin, roast, method, recency, and source trust
- Returns technique guidance specific to each brewing method: bloom timing, pour stages, agitation style, shot parameters, steep sequences
- Exposes everything over the Model Context Protocol so any MCP-capable AI can use it

The production endpoint is live, requires no auth, and works with Claude Desktop, Claude.ai, Cursor, Windsurf, or any MCP client:

```
https://brew-guide-production.up.railway.app/mcp
```

Ask your AI: "recommend a pour over for Ethiopian light roast." With Brew Guide connected, it won't just recite defaults. It will pull community consensus from logged brews, apply confidence weighting, and return not just the parameters but the technique steps to execute them.

---

## How Claude Code Built It

The entire codebase was built with Claude Code (running inside the Hermes agent framework) using a structured agentic workflow. Not "I asked Claude to write some code." More like: I maintained a planning document, broke it into deliverables with acceptance criteria, and delegated to persona-specific subagents.

The repo has a `.claude/commands/` directory with role files — `/backend-architect`, `/test-engineer`, `/project-manager`. Each persona has a focused mandate. The backend architect owns the recommendation engine and schema. The test engineer owns Vitest coverage (53 tests, zero TypeScript errors). The project manager owns the roadmap, retrospectives, and this article.

What this looks like in practice:

1. Write a plan (`docs/plans/competition-sprint/plan.md`) with a deliverable table — D1 through D7, each with owner, files, acceptance criteria, and a commit schedule
2. Hand D1 to `/backend-architect`: "implement the roaster scraper against these 12 targets, produce `scripts/scrape-roasters.ts`"
3. Hand D2 to `/backend-architect`: "add `technique` JSONB to `brewing_methods`, seed all 8 methods with technically accurate data"
4. Hand the test suite to `/test-engineer` after each feature: "verify coverage, catch regressions, flag gaps"
5. Hand the architecture doc to `/project-manager` to keep in sync with reality

The honest version: the agentic workflow shines on structured, well-scoped tasks. The recommendation engine (`src/lib/recommend.ts`) was almost entirely Claude — the weighted scoring logic, recency decay, confidence tier thresholds, the feedback loop between recommendations and logged brews. I'd spec a behaviour, Claude would implement it, I'd review, iterate. Probably 70% of the code was written in this back-and-forth.

Where it struggled: the first pass at the Prisma schema had the `brew_recommendation_links` join table missing a uniqueness constraint. The test engineer caught it, flagged it in a review report, and the backend architect fixed it. This is the workflow working correctly — not Claude being infallible, but the loop catching mistakes.

The tech stack is deliberately boring:

- **Hono 4** + `@hono/node-server` for the HTTP layer — lightweight, TypeScript-native, great MCP adapter support
- **Neon Postgres** + **Prisma ORM** — serverless Postgres with Prisma's migration tooling; picked over Turso/Supabase for Railway compatibility
- **`@modelcontextprotocol/sdk`** + **`@hono/mcp`** for Streamable HTTP MCP transport
- **Vitest** for the test suite — co-located tests, fast, ESM-native
- **Railway** for deployment — auto-deploys from `main`, zero config for a Node + Postgres stack

Boring stack, interesting logic. The recommendation engine is fully deterministic — no LLM on the hot path. `computeBestBrew()` fetches up to 50 recent brews, scores each one against your request params (origin match, method match, roast proximity, grind size), multiplies by rating, recency decay (linear 1.0 → 0.1 over 365 days), and source trust (user-submitted = 1.0, scraped roaster guides = 0.85, Reddit = 0.7). Top 5 brews vote by weighted average (numeric params) or weighted mode (categorical). Confidence tier falls out of how many quality matches existed. Sub-100ms. Reproducible. Auditable.

---

## The MCP Angle: Your AI Assistant as a Coffee Coach

MCP is what makes Brew Guide actually useful rather than just interesting.

Without MCP, this is a REST API. Useful, sure — you can curl it, build a widget, write a wrapper. But the cognitive overhead is on you: you have to know the API, construct the right request, parse the response, prompt your AI separately.

With MCP, you connect it once and your AI assistant gets five new tools:

| Tool | What it does |
|------|-------------|
| `get_brewing_methods` | Returns all 8 methods with defaults and technique schemas |
| `recommend` | Community-consensus recommendation: params + confidence + technique guidance |
| `log_brew` | Persist a brew you just made; auto-links to any recent recommendation for the same origin + method |
| `search_brews` | Filter the brew log by origin, method, or both |
| `compare_brew` | Delta analysis of a logged brew against method baseline |

The `recommend` tool is the centrepiece. When you ask Claude "how should I brew this Kenyan peaberry I just got?" it calls `recommend`, gets back not just temperature and ratio but the pour stage sequence, bloom timing, agitation style — the stuff a barista would actually tell you. The AI can then explain those steps, adapt them to your equipment, answer follow-up questions. It becomes a conversation.

To connect from any MCP client, point it at:

```
https://brew-guide-production.up.railway.app/mcp
```

For Claude Desktop, add to `claude_desktop_config.json`:

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

For Hermes:

```bash
hermes mcp add brew_guide --url https://brew-guide-production.up.railway.app/mcp
```

The knowledge compounds. Every brew you log goes back into the consensus. If you try a Kenyan at 91°C instead of 93°C and rate it 5/5, that data point is in the pool for the next person who asks about Kenyan. The server tracks which brews followed which recommendations (via `brew_recommendation_links`) — so eventually we can ask: did brews that followed a recommendation rate higher than brews that didn't? That's a recommendation quality signal, and it's already being captured.

One design decision worth flagging: the recommendation engine deliberately has no LLM on the hot path. The technique data is structured, the consensus is deterministic, the confidence tiers are math. When you ask for a recommendation you get a sub-100ms response that's the same every time for the same data. If you want a narrative step-by-step brew guide synthesized from that data, that'll be an opt-in flag (`"include_narrative": true`) — you pay the LLM latency only if you want it. Most MCP clients and programmatic integrations don't need the narrative; they need the data.

---

## What's Next

The roadmap has one big gap that this sprint deliberately left unfinished: **Technique Intelligence** (Phase 6).

Right now, technique data on `brewing_methods` is manually seeded — accurate, but static. The actual vision is:

- A scraping pipeline that ingests roaster brew cards, forum posts, and YouTube descriptions as raw source data
- An LLM extraction pass at ingest time that normalizes free-text technique notes into structured method-scoped schemas (bloom timing, pour stages, shot parameters)
- Technique consensus in `computeBestBrew` — so the pour stages you get back are weighted community consensus, not just the method default
- Narrative synthesis gated behind `"include_narrative": true` — when confidence is high and technique data is rich, an LLM generates a step-by-step brew guide in plain English

The feedback loop is already in place. `brew_recommendation_links` tracks which logged brews followed which recommendations. Once we have enough data to measure "did this recommendation produce a good outcome," we can adjust source weights and score coefficients based on real-world results. That's how the system gets smarter over time without anyone manually tuning it.

The other piece: the MCP Registry. Once the technique layer is live and the data volume is real, submitting to `registry.modelcontextprotocol.io` makes sense — coffee knowledge as a first-class MCP resource, discoverable by any agent that wants it.

---

**Try it now:**
- Production endpoint: `https://brew-guide-production.up.railway.app`
- MCP endpoint: `https://brew-guide-production.up.railway.app/mcp`
- GitHub: `yuens1002/brew-guide`

Connect it to your AI client, ask about your next bag of coffee, and log what you actually brewed. The community knowledge base is only as good as the brews people put into it.
