/**
 * Minimal MCP Server — Plain Node.js HTTP
 * No Hono, no @hono/node-server
 * Just MCP SDK + Node.js http module
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataDir = join(__dirname, '..', 'data')
const PORT = 9999

// ── MCP Server
const server = new McpServer({
  name: 'coffee-brew-minimal',
  version: '1.0.0',
})

// Tool: get_brewing_methods
server.registerTool(
  'get_brewing_methods',
  { description: 'Returns all brewing methods' },
  async () => {
    try {
      const raw = readFileSync(join(dataDir, 'brewing_methods.json'), 'utf8')
      return { content: [{ type: 'text', text: raw }] }
    } catch {
      return { content: [{ type: 'text', text: '[]' }] }
    }
  }
)

// ── HTTP Server
const httpServer = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(404)
    res.end('Not Found')
    return
  }

  // Read body
  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', async () => {
    try {
      const transport = new StreamableHTTPTransport()
      await server.connect(transport)

      // Create a minimal Request object for the transport
      const url = new URL(req.url, `http://${req.headers.host}`)
      const mcpRequest = new Request(url, {
        method: req.method,
        headers: req.headers,
        body: body,
      })

      const mcpResponse = await transport.handleRequest(mcpRequest)
      if (mcpResponse) {
        res.writeHead(mcpResponse.status, Object.fromEntries(mcpResponse.headers.entries()))
        res.end(await mcpResponse.text())
      } else {
        res.writeHead(500)
        res.end('No response')
      }
    } catch (err) {
      console.error('Error:', err)
      res.writeHead(500)
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`☕ Minimal MCP Server running on http://localhost:${PORT}/mcp`)
})
