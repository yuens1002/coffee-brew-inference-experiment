import { serve } from '@hono/node-server';
import app from './index.js';

const rawPort = parseInt(process.env.PORT ?? '', 10);
const port = Number.isFinite(rawPort) ? rawPort : 4000;
console.log(`Server starting on port ${port}`);
serve({ fetch: app.fetch, port });
