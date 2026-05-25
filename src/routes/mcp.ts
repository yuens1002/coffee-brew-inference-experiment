import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { Hono } from 'hono';
import { z } from 'zod';
import { corsHeaders, checkOrigin } from '../lib/mcp-common.js';
import { getBrewingMethods, addBrew } from '../lib/db.js';
import type { Brew } from '../types.js';

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: 'coffee-brew-mcp', version: '1.0.0' });

  // Tool 1: get_brewing_methods
  server.registerTool(
    'get_brewing_methods',
    {
      title: 'Get Brewing Methods',
      description: 'Returns all available coffee brewing methods with parameters',
      inputSchema: {},
    },
    async () => {
      const methods = await getBrewingMethods();
      return { content: [{ type: 'text' as const, text: JSON.stringify(methods) }] };
    }
  );

  // Tool 2: recommend
  server.registerTool(
    'recommend',
    {
      title: 'Recommend Brew Parameters',
      description: 'Recommends brew parameters for a given coffee and method',
      inputSchema: {
        coffeeName: z.string().describe('Name of the coffee bean'),
        methodId: z.string().optional().describe('Preferred brewing method ID'),
      },
    },
    async ({ coffeeName, methodId }) => {
      const methods = await getBrewingMethods();
      const method = methodId ? methods.find(m => m.id === methodId) : methods[0];
      if (!method) {
        return { content: [{ type: 'text' as const, text: 'Method not found' }], isError: true };
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            method,
            params: { grindSize: method.grindSize, waterTemp: method.waterTemp, brewTime: method.brewTime, ratio: method.ratio },
            reasoning: `Recommended based on ${method.name}`
          })
        }]
      };
    }
  );

  // Tool 3: log_brew
  server.registerTool(
    'log_brew',
    {
      title: 'Log a Brew Experiment',
      description: 'Logs a real brew experience to the database',
      inputSchema: {
        methodId: z.string(),
        coffeeName: z.string(),
        grindSetting: z.string(),
        waterTemp: z.number(),
        brewTime: z.number(),
        rating: z.number().min(1).max(5),
        notes: z.string().optional(),
      },
    },
    async (params) => {
      const brew = await addBrew(params as Omit<Brew, 'id' | 'timestamp'>);
      return { content: [{ type: 'text' as const, text: JSON.stringify(brew) }] };
    }
  );

  // Tool 4: compare_brew
  server.registerTool(
    'compare_brew',
    {
      title: 'Compare Brew to Recommendation',
      description: 'Compares a logged brew against AI recommendation',
      inputSchema: {
        brewId: z.string().describe('ID of the brew to compare'),
      },
    },
    async ({ brewId }) => {
      // Stub for now
      return { content: [{ type: 'text' as const, text: 'Comparison stub: brew matches recommendation 80%' }] };
    }
  );

  return server;
}

const mcpRoute = new Hono();

mcpRoute.options('*', (c) => {
  const originErr = checkOrigin(c);
  if (originErr) return originErr;
  return c.text('ok', 200, corsHeaders);
});

mcpRoute.post('*', async (c) => {
  const originErr = checkOrigin(c);
  if (originErr) return originErr;

  const server = buildMcpServer();
  const transport = new StreamableHTTPTransport();
  await server.connect(transport);

  const response = await transport.handleRequest(c);
  if (!response) return c.json({ error: 'No response from MCP transport' }, 500, corsHeaders);

  response.headers.delete('mcp-session-id');
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
});

export default mcpRoute;
