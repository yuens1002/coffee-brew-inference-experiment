/**
 * Entry point for the Coffee Brew MCP Server
 * Run with: node server.js (after build) or npx tsx index.ts
 */

import { serve } from '@hono/node-server'
import mcpRoute from './server.js'

const port = parseInt(process.env.PORT || '3003', 10)

console.log(`☕ Coffee Brew MCP Server starting on port ${port}...`)

serve({
  fetch: mcpRoute.fetch.bind(mcpRoute),
  port,
})

console.log(`✅ MCP server ready at http://localhost:${port}/mcp`)
