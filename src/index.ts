import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import type { Context } from 'hono';
import brewingRoutes from './routes/brewing.js';
import mcpRoutes from './routes/mcp.js';

const app = new Hono();

const keyGenerator = (c: Context): string =>
  c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? c.req.header('x-real-ip') ?? 'unknown';

// CORS for all routes
app.use('*', cors({ origin: '*' }));

// Rate limit: REST API — 60 req/min per IP
app.use('/brewing-methods', rateLimiter({ windowMs: 60_000, limit: 60, keyGenerator }));
app.use('/brews', rateLimiter({ windowMs: 60_000, limit: 60, keyGenerator }));
app.use('/recommend', rateLimiter({ windowMs: 60_000, limit: 60, keyGenerator }));

// Rate limit: MCP — 20 req/min per IP (tool calls are expensive)
app.use('/mcp/*', rateLimiter({ windowMs: 60_000, limit: 20, keyGenerator }));

// Mount brewing API routes
app.route('/', brewingRoutes);

// Mount MCP server
app.route('/mcp', mcpRoutes);

// Health check (no rate limit)
app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
