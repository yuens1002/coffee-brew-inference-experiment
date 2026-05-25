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
