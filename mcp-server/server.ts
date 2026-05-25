/**
 * Coffee Brew MCP Server — Hono + StreamableHTTP
 * follows the exact pattern from resume-agent/src/routes/public-mcp.ts
 *
 * Tools exposed:
 *   - get_brewing_methods
 *   - recommend
 *   - log_brew
 *   - compare_brew
 *
 * Transport: stateless Streamable HTTP (no session map, no GC)
 * Data: reads from ../data/*.json (same files as the Express API)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPTransport } from '@hono/mcp'
import { Hono } from 'hono'
import { z } from 'zod'
import { corsHeaders, checkOrigin } from './lib/mcp-common.js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataDir = join(__dirname, '..', 'data')

// ── Helpers ───────────────────────────────────────────────

function loadBrewingMethods() {
  try {
    const raw = readFileSync(join(dataDir, 'brewing_methods.json'), 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function loadBrews() {
  try {
    const raw = readFileSync(join(dataDir, 'brews.json'), 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveBrews(brews: unknown[]) {
  // In Railway/ephemeral FS, we'd use a proper DB. For now, best-effort write.
  try {
    const { writeFileSync } = require('node:fs')
    writeFileSync(join(dataDir, 'brews.json'), JSON.stringify(brews, null, 2))
  } catch { /* ignore write errors on ephemeral FS */ }
}

// ── MCP Server Factory ────────────────────────────────────

function buildServer(): McpServer {
  const server = new McpServer({
    name: 'coffee-brew-inference',
    version: '1.0.0',
  })

  // Tool 1: get_brewing_methods
  server.registerTool(
    'get_brewing_methods',
    {
      title: 'Get Brewing Methods',
      description: 'Returns all available brewing methods with their default parameters (ratio, temp, time, grind size). Use this to show users what brew methods are supported.',
      inputSchema: {},
    },
    async () => {
      const methods = loadBrewingMethods()
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(methods) }],
      }
    }
  )

  // Tool 2: recommend
  server.registerTool(
    'recommend',
    {
      title: 'Get Brew Recommendation',
      description:
        'Given a brewing method and current brew parameters, returns an AI recommendation with tips for improvement. ' +
        'Compares user parameters against method defaults and suggests adjustments.',
      inputSchema: {
        method: z.string().describe('Brewing method name (e.g., "Pour Over", "French Press")'),
        grind_size: z.string().describe('Current grind size: extra-coarse, coarse, medium-coarse, medium, medium-fine, fine'),
        water_temp: z.number().describe('Water temperature in Celsius (85-100)'),
        brew_time: z.number().describe('Brew time in seconds'),
      },
    },
    async ({ method, grind_size, water_temp, brew_time }) => {
      const methods = loadBrewingMethods()
      const m = methods.find((mm: any) => mm.name.toLowerCase() === method.toLowerCase())

      if (!m) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            recommendation: `For ${method}, use ${grind_size} grind at ${water_temp}°C for ${brew_time}s. Adjust based on taste.`,
            confidence: 'low',
            sources: ['default']
          }) }],
        }
      }

      const tips: string[] = []
      if (water_temp < m.default_temp_c - 5) tips.push(`increase water temp to ~${m.default_temp_c}°C`)
      if (water_temp > m.default_temp_c + 5) tips.push(`decrease water temp to ~${m.default_temp_c}°C`)
      if (grind_size !== m.grind_size) tips.push(`use ${m.grind_size} grind for ${m.name}`)
      if (Math.abs(brew_time - m.default_brew_time_s) > 30) tips.push(`adjust brew time to ~${m.default_brew_time_s}s`)

      const recommendation = tips.length > 0
        ? `For ${m.name}: ${tips.join(', ')}. ${m.description}`
        : `Your parameters look good for ${m.name}! Enjoy your brew.`

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({
          recommendation,
          confidence: tips.length === 0 ? 'high' : 'medium',
          sources: ['brewing_methods.json', m.description]
        }) }],
      }
    }
  )

  // Tool 3: log_brew
  server.registerTool(
    'log_brew',
    {
      title: 'Log a Brew Record',
      description: 'Log a real brew experience. Records grind size, temp, ratio, time, and rating for later comparison against AI recommendations.',
      inputSchema: {
        brewing_method_id: z.number().int().describe('ID of the brewing method (get from get_brewing_methods)'),
        origin: z.string().describe('Where this brew was made (e.g., "Home", "Café", "Hermes")'),
        roast_level: z.string().describe('Roast level: light, medium, dark'),
        grind_size: z.string().describe('Grind size used'),
        water_temp_c: z.number().describe('Water temperature in Celsius'),
        ratio: z.number().describe('Coffee-to-water ratio (e.g., 0.0625 = 1:16)'),
        brew_time_s: z.number().describe('Brew time in seconds'),
        rating: z.number().int().min(1).max(5).describe('Rating 1-5'),
      },
    },
    async ({ brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating }) => {
      const brews = loadBrews()
      const nextId = brews.length > 0 ? Math.max(...brews.map((b: any) => b.id)) + 1 : 1
      const newBrew = {
        id: nextId,
        brewing_method_id,
        origin,
        roast_level,
        grind_size,
        water_temp_c,
        ratio,
        brew_time_s,
        rating,
        created_at: new Date().toISOString(),
      }
      brews.push(newBrew)
      saveBrews(brews)

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ id: nextId, message: 'Brew logged successfully' }) }],
      }
    }
  )

  // Tool 4: compare_brew
  server.registerTool(
    'compare_brew',
    {
      title: 'Compare Brew to AI Recommendation',
      description: 'Compare a logged brew against the AI defaults for its brewing method. Returns match score and analysis.',
      inputSchema: {
        brew_id: z.number().int().describe('ID of the brew record to compare'),
      },
    },
    async ({ brew_id }) => {
      const brews = loadBrews()
      const brew = brews.find((b: any) => b.id === brew_id)
      if (!brew) {
        return { content: [{ type: 'text' as const, text: 'Brew not found' }], isError: true }
      }

      const methods = loadBrewingMethods()
      const method = methods.find((m: any) => m.id === brew.brewing_method_id)
      if (!method) {
        return { content: [{ type: 'text' as const, text: 'Brewing method not found' }], isError: true }
      }

      const tempDiff = brew.water_temp_c - method.default_temp_c
      const timeDiff = brew.brew_time_s - method.default_brew_time_s
      const tips: string[] = []
      if (Math.abs(tempDiff) <= 2 && Math.abs(timeDiff) <= 15) {
        tips.push('Your brew parameters are very close to optimal!')
      } else {
        if (tempDiff > 2) tips.push(`water temp is ${tempDiff}°C too high`)
        if (tempDiff < -2) tips.push(`water temp is ${Math.abs(tempDiff)}°C too low`)
        if (timeDiff > 15) tips.push(`brew time is ${timeDiff}s too long`)
        if (timeDiff < -15) tips.push(`brew time is ${Math.abs(timeDiff)}s too short`)
      }

      const tempScore = 1 - Math.min(Math.abs(tempDiff) / 10, 1)
      const timeScore = 1 - Math.min(Math.abs(timeDiff) / 60, 1)
      const match_score = Math.round(((tempScore + timeScore) / 2) * 100) / 100

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({
          brew_id,
          user_brew: { water_temp_c: brew.water_temp_c, ratio: brew.ratio, brew_time_s: brew.brew_time_s, grind_size: brew.grind_size, rating: brew.rating },
          ai_recommendation: { water_temp_c: method.default_temp_c, ratio: method.default_ratio, brew_time_s: method.default_brew_time_s, grind_size: method.grind_size },
          analysis: tips.join('. '),
          match_score,
        }) }],
      }
    }
  )

  return server
}

// ── Hono Route ────────────────────────────────────────────

const mcpRoute = new Hono()

// CORS preflight
mcpRoute.options('*', (c) => {
  const originErr = checkOrigin(c)
  if (originErr) return originErr
  return c.text('ok', 200, corsHeaders)
})

// POST — stateless: fresh server + transport per request
mcpRoute.post('*', async (c) => {
  const originErr = checkOrigin(c)
  if (originErr) return originErr

  const server = buildServer()
  const transport = new StreamableHTTPTransport()
  await server.connect(transport)

  const response = await transport.handleRequest(c)
  if (!response) return c.json({ error: 'No response from MCP transport' }, 500, corsHeaders)

  response.headers.delete('mcp-session-id') // stateless — no sessions
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }
  return response
})

export default mcpRoute
