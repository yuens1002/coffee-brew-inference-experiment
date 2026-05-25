import { Hono } from 'hono';
import { cors } from 'hono/cors';
import brewingRoutes from './routes/brewing.js';
import mcpRoutes from './routes/mcp.js';

const app = new Hono();

// CORS for all routes
app.use('*', cors({ origin: '*' }));

// Mount brewing API routes
app.route('/', brewingRoutes);

// Mount MCP server
app.route('/mcp', mcpRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  console.log(`Server starting on port ${port}`);
  // Use @hono/node-server to listen
  import('@hono/node-server').then(({ serve }) => {
    serve({ fetch: app.fetch, port });
  });
}
