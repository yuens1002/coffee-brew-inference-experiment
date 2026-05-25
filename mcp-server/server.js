/**
 * Coffee Brew MCP Server — Plain JavaScript (Hono + MCP)
 * Follows resume-agent/src/routes/public-mcp.ts pattern
 *
 * Tools: get_brewing_methods, recommend, log_brew, compare_brew
 * Transport: Stateless StreamableHTTP
 * Run: node server.js
 */

import { Hono } from 'hono'
import { StreamableHTTPTransport } from '@hono/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataDir = join(__dirname, '..', 'data')

// ── CORS & Origin Check (from resume-agent/lib/mcp-common.ts)
const ALLOWED_ORIGINS = new Set([
  'https://claude.ai',
  'https://claude.com',
  ...(process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-brain-key, accept, mcp-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function checkOrigin(c) {
  const origin = c.req.header('origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
  return null
}

// ── Helpers
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

function saveBrews(brews) {
  try {
    writeFileSync(join(dataDir, 'brews.json'), JSON.stringify(brews, null, 2))
  } catch { /* ignore on ephemeral FS */ }
}

// ── MCP Server Factory
function buildServer() {
  const server = new McpServer({
    name: 'coffee-brew-inference',
    version: '1.0.0',
  })

  // Tool 1: get_brewing_methods
  server.registerTool(
    'get_brewing_methods',
    {
      title: 'Get Brewing Methods',
      description: 'Returns all available brewing methods with their default parameters. Use this to show users what brew methods are supported.',
    },
    async () => {
      const methods = loadBrewingMethods()
      return {
        content: [{ type: 'text', text: JSON.stringify(methods) }],
      }
    }
  )

  // Tool 2: recommend
  server.registerTool(
    'recommend',
    {
      title: 'Get Brew Recommendation',
      description: 'Given brewing method and parameters, returns AI recommendation with tips for improvement.',
      inputSchema: {
        method: { type: 'string', description: 'Brewing method name (e.g., "Pour Over")' },
        grind_size: { type: 'string', description: 'Grind size: extra-coarse, coarse, medium, fine' },
        water_temp: { type: 'number', description: 'Water temperature in Celsius' },
        brew_time: { type: 'number', description: 'Brew time in seconds' },
      },
    },
    async ({ method, grind_size, water_temp, brew_time }) => {
      const methods = loadBrewingMethods()
      const m = methods.find(mm => mm.name.toLowerCase() === method.toLowerCase())

      if (!m) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            recommendation: `For ${method}, use ${grind_size} grind at ${water_temp}°C for ${brew_time}s.`,
            confidence: 'low',
            sources: ['default']
          }) }],
        }
      }

      const tips = []
      if (water_temp < m.default_temp_c - 5) tips.push(`increase water temp to ~${m.default_temp_c}°C`)
      if (water_temp > m.default_temp_c + 5) tips.push(`decrease water temp to ~${m.default_temp_c}°C`)
      if (grind_size !== m.grind_size) tips.push(`use ${m.grind_size} grind for ${m.name}`)
      if (Math.abs(brew_time - m.default_brew_time_s) > 30) tips.push(`adjust brew time to ~${m.default_brew_time_s}s`)

      const recommendation = tips.length > 0
        ? `For ${m.name}: ${tips.join(', ')}. ${m.description}`
        : `Your parameters look good for ${m.name}! Enjoy your brew.`

      return {
        content: [{ type: 'text', text: JSON.stringify({
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
      description: 'Log a real brew experience for later comparison against AI recommendations.',
      inputSchema: {
        brewing_method_id: { type: 'number', description: 'ID of the brewing method' },
        origin: { type: 'string', description: 'Where this brew was made' },
        roast_level: { type: 'string', description: 'Roast level: light, medium, dark' },
        grind_size: { type: 'string', description: 'Grind size used' },
        water_temp_c: { type: 'number', description: 'Water temperature in Celsius' },
        ratio: { type: 'number', description: 'Coffee-to-water ratio' },
        brew_time_s: { type: 'number', description: 'Brew time in seconds' },
        rating: { type: 'number', description: 'Rating 1-5' },
      },
    },
    async ({ brewing_method_id, origin, roast_level, grind_size, water_temp_c, ratio, brew_time_s, rating }) => {
      const brews = loadBrews()
      const nextId = brews.length > 0 ? Math.max(...brews.map(b => b.id)) + 1 : 1
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
        content: [{ type: 'text', text: JSON.stringify({ id: nextId, message: 'Brew logged successfully' }) }],
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
        brew_id: { type: 'number', description: 'ID of the brew record to compare' },
      },
    },
    async ({ brew_id }) => {
      const brews = loadBrews()
      const brew = brews.find(b => b.id === brew_id)
      if (!brew) {
        return { content: [{ type: 'text', text: 'Brew not found' }], isError: true }
      }

      const methods = loadBrewingMethods()
      const method = methods.find(m => m.id === brew.brewing_method_id)
      if (!method) {
        return { content: [{ type: 'text', text: 'Brewing method not found' }], isError: true }
      }

      const tempDiff = brew.water_temp_c - method.default_temp_c
      const timeDiff = brew.brew_time_s - method.default_brew_time_s
      const tips = []
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
        content: [{ type: 'text', text: JSON.stringify({
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

// ── Hono Route
const mcpRoute = new Hono()

mcpRoute.options('*', (c) => {
  const originErr = checkOrigin(c)
  if (originErr) return originErr
  return c.text('ok', 200, corsHeaders)
})

mcpRoute.post('*', async (c) => {
  try {
    const originErr = checkOrigin(c)
    if (originErr) return originErr

    const server = buildServer()
    const transport = new StreamableHTTPTransport()
    await server.connect(transport)

    const response = await transport.handleRequest(c)
    if (!response) return c.json({ error: 'No response from MCP transport' }, 500, corsHeaders)

    response.headers.delete('mcp-session-id')
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value)
    }
    return response
  } catch (err) {
    console.error('MCP handler error:', err)
    return c.json({ error: 'Internal Server Error', details: String(err) }, 500, corsHeaders)
  }
})

// ── Serve with @hono/node-server
const { serve } = await import('@hono/node-server')
const port = 3004

console.log(`☕ Coffee Brew MCP Server starting on port ${port}...`)

serve({
  fetch: mcpRoute.fetch.bind(mcpRoute),
  port,
})

console.log(`✅ MCP server ready at http://localhost:${port}/mcp`)
