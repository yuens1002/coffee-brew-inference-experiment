import { serve } from '@hono/node-server';
import app from './index.js';

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
console.log(`Server starting on port ${port}`);
serve({ fetch: app.fetch, port });
