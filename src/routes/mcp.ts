import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { Hono } from 'hono';
import { z } from 'zod';
import { corsHeaders, checkOrigin } from '../lib/mcp-common.js';
import { getBrewingMethods, getBrews, getBrewById, addBrew, getBrewLinks } from '../lib/db.js';
import { computeBestBrew, tryLinkBrew, resolveOrigin } from '../lib/recommend.js';
import type { Brew } from '../types.js';

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: 'coffee-brew-mcp', version: '2.0.1' });

  // Tool 1: get_brewing_methods
  server.registerTool(
    'get_brewing_methods',
    {
      title: 'Get Brewing Methods',
      description: 'Returns all available coffee brewing methods with default parameters',
      inputSchema: {},
    },
    async () => {
      const methods = await getBrewingMethods();
      return { content: [{ type: 'text' as const, text: JSON.stringify(methods) }] };
    },
  );

  // Tool 2: recommend
  server.registerTool(
    'recommend',
    {
      title: 'Recommend Brew Parameters',
      description: 'Get a community-consensus brew recommendation. Returns brew parameters (temp, ratio, grind, time), confidence tier (high/medium/low based on community data), sources, and method-specific technique guidance (e.g. bloom timing, pour stages, steep time).',
      inputSchema: {
        origin: z.string().describe('Coffee origin (e.g. Colombia, Ethiopia)'),
        roast_level: z.string().optional().describe('Roast level (light, medium, dark)'),
        brewing_method_id: z.number().optional().describe('Preferred brewing method ID'),
        grind_size: z.string().optional().describe('Preferred grind size'),
      },
    },
    async ({ origin, roast_level, brewing_method_id, grind_size }) => {
      const resolvedOrigin = origin ? (await resolveOrigin(origin)).resolved : origin;
      try {
        const result = await computeBestBrew({ origin: resolvedOrigin, roast_level, brewing_method_id, grind_size });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Recommendation failed';
        return { content: [{ type: 'text' as const, text: msg }], isError: true };
      }
    },
  );

  // Tool 3: log_brew
  server.registerTool(
    'log_brew',
    {
      title: 'Log a Brew Experiment',
      description: 'Logs a real brew experience to the database',
      inputSchema: {
        brewing_method_id: z.number().describe('ID of the brewing method used'),
        origin: z.string().describe('Coffee origin (e.g. Colombia, Ethiopia)'),
        roast_level: z.string().describe('Roast level (light, medium, medium-dark, dark)'),
        grind_size: z.string().describe('Grind size used'),
        water_temp_c: z.number().describe('Water temperature in Celsius'),
        ratio: z.number().describe('Coffee-to-water ratio (e.g. 0.0625 for 1:16)'),
        brew_time_s: z.number().describe('Brew time in seconds'),
        rating: z.number().min(1).max(5).describe('Rating from 1 to 5'),
        notes: z.string().optional().describe('Tasting notes or observations'),
      },
    },
    async (params) => {
      const { resolved: resolvedOrigin, verified } = await resolveOrigin(params.origin);
      const originConfValue = verified ? 1.0 : resolvedOrigin !== params.origin ? 0.7 : 0.5;
      const fieldConfidence = JSON.stringify({ origin: originConfValue });
      const brew = await addBrew({
        ...params,
        origin: resolvedOrigin,
        field_confidence: fieldConfidence,
      } as Omit<Brew, 'id' | 'created_at'>);
      tryLinkBrew(brew).catch(() => {}); // fire-and-forget implicit feedback link
      return { content: [{ type: 'text' as const, text: JSON.stringify({ id: brew.id, message: 'Brew record added successfully' }) }] };
    },
  );

  // Tool 4: search_brews
  server.registerTool(
    'search_brews',
    {
      title: 'Search Brew Logs',
      description: 'Search through logged brew experiences by origin or brewing method',
      inputSchema: {
        origin: z.string().optional().describe('Filter by coffee origin'),
        method: z.number().optional().describe('Filter by brewing method ID'),
        limit: z.number().optional().describe('Max number of results'),
      },
    },
    async (params) => {
      const result = await getBrews(params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );

  // Tool 5: compare_brew
  server.registerTool(
    'compare_brew',
    {
      title: 'Compare Brew to Baseline',
      description: 'Compares a logged brew against the standard method parameters',
      inputSchema: {
        brew_id: z.number().describe('ID of the brew to compare'),
      },
    },
    async ({ brew_id }) => {
      const brew = await getBrewById(brew_id);
      if (!brew) {
        return { content: [{ type: 'text' as const, text: 'Brew not found' }], isError: true };
      }

      const methods = await getBrewingMethods();
      const method = methods.find((m) => m.id === brew.brewing_method_id);

      const tempDelta = method ? brew.water_temp_c - method.default_temp_c : 0;
      const timeDelta = method ? brew.brew_time_s - method.default_brew_time_s : 0;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              brew_id: brew.id,
              user_brew: {
                water_temp_c: brew.water_temp_c,
                ratio: brew.ratio,
                brew_time_s: brew.brew_time_s,
                grind_size: brew.grind_size,
                rating: brew.rating,
              },
              ai_recommendation: method
                ? {
                    water_temp_c: method.default_temp_c,
                    ratio: method.default_ratio,
                    brew_time_s: method.default_brew_time_s,
                    grind_size: method.grind_size,
                  }
                : null,
              analysis: method
                ? `Your water was ${tempDelta > 0 ? `${tempDelta}°C hotter` : `${Math.abs(tempDelta)}°C cooler`} and brew time ${timeDelta > 0 ? `${timeDelta}s longer` : `${Math.abs(timeDelta)}s shorter`} than the standard ${method.name} recommendation.`
                : 'No baseline method found for comparison.',
              match_score: 0.5,
            }),
          },
        ],
      };
    },
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
