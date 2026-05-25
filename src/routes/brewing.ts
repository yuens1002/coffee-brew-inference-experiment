import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getBrewingMethods, addBrew } from '../lib/db.js';
import type { BrewingMethod, Brew } from '../types.js';

const app = new Hono();

// GET /brewing-methods
app.get('/brewing-methods', async (c) => {
  const methods = await getBrewingMethods();
  return c.json(methods);
});

// GET /brews (stub for now)
app.get('/brews', async (c) => {
  return c.json([]);
});

// POST /brews
const brewSchema = z.object({
  methodId: z.string(),
  coffeeName: z.string(),
  grindSetting: z.string(),
  waterTemp: z.number(),
  brewTime: z.number(),
  rating: z.number().min(1).max(5),
  notes: z.string().optional()
});

app.post('/brews', zValidator('json', brewSchema), async (c) => {
  const data = c.req.valid('json');
  const brew = await addBrew(data);
  return c.json(brew, 201);
});

// POST /recommend (stub)
app.post('/recommend', async (c) => {
  const methods = await getBrewingMethods();
  return c.json({ method: methods[0], params: {}, reasoning: 'Stub recommendation' });
});

export default app;
