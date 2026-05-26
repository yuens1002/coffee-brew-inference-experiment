import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getBrewingMethods, getBrews, getBrewById, addBrew, getOrigins } from '../lib/db.js';
import type { BrewingMethod, Brew, BrewSource } from '../types.js';

const app = new Hono();

// GET /origins
app.get('/origins', async (c) => {
  const origins = await getOrigins();
  return c.json(origins);
});

// GET /brewing-methods
app.get('/brewing-methods', async (c) => {
  const methods = await getBrewingMethods();
  return c.json(methods);
});

// GET /brews?origin=&method=&limit=
app.get('/brews', async (c) => {
  const origin = c.req.query('origin');
  const methodRaw = c.req.query('method');
  const limitRaw = c.req.query('limit');

  const filters: { origin?: string; method?: number; limit?: number } = {};
  if (origin) filters.origin = origin;
  if (methodRaw) {
    const m = parseInt(methodRaw, 10);
    if (!isNaN(m)) filters.method = m;
  }
  if (limitRaw) {
    const l = parseInt(limitRaw, 10);
    if (!isNaN(l)) filters.limit = l;
  }

  const result = await getBrews(filters);
  return c.json(result);
});

// POST /brews
const brewSchema = z.object({
  brewing_method_id: z.number(),
  origin: z.string(),
  roast_level: z.string(),
  grind_size: z.string(),
  water_temp_c: z.number(),
  ratio: z.number(),
  brew_time_s: z.number(),
  rating: z.number().min(1).max(5),
  notes: z.string().optional(),
  source: z.string().optional(),
  source_url: z.string().optional(),
  field_confidence: z.string().optional(),
});

app.post('/brews', zValidator('json', brewSchema), async (c) => {
  const data = c.req.valid('json');
  const brew = await addBrew({
    brewing_method_id: data.brewing_method_id,
    origin: data.origin,
    roast_level: data.roast_level,
    grind_size: data.grind_size,
    water_temp_c: data.water_temp_c,
    ratio: data.ratio,
    brew_time_s: data.brew_time_s,
    rating: data.rating,
    notes: data.notes,
    source: (data.source as BrewSource) || ('user_submitted' as BrewSource),
    source_url: data.source_url,
    field_confidence: data.field_confidence,
  });
  return c.json({ id: brew.id, message: 'Brew record added successfully' }, 201);
});

// GET /brews/:id
app.get('/brews/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid brew ID' }, 400);
  const brew = await getBrewById(id);
  if (!brew) return c.json({ error: 'Brew not found' }, 404);
  return c.json(brew);
});

// GET /brews/:id/compare
app.get('/brews/:id/compare', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid brew ID' }, 400);

  const brew = await getBrewById(id);
  if (!brew) return c.json({ error: 'Brew not found' }, 404);

  const methods = await getBrewingMethods();
  const method = methods.find((m) => m.id === brew.brewing_method_id);

  // Build comparison — stub analysis for now (LLM wired in Phase 2)
  const tempDelta = method ? brew.water_temp_c - method.default_temp_c : 0;
  const timeDelta = method ? brew.brew_time_s - method.default_brew_time_s : 0;

  return c.json({
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
    match_score: 0.5, // Stub — real scoring wired in Phase 2
  });
});

// POST /recommend (stub — LLM wired in Phase 2)
const recommendSchema = z.object({
  brewing_method_id: z.number().optional(),
  origin: z.string().optional(),
  roast_level: z.string().optional(),
  grind_size: z.string().optional(),
  water_temp_c: z.number().optional(),
  ratio: z.number().optional(),
  brew_time_s: z.number().optional(),
});

app.post('/recommend', zValidator('json', recommendSchema), async (c) => {
  const params = c.req.valid('json');
  const methods = await getBrewingMethods();

  const method = params.brewing_method_id
    ? methods.find((m) => m.id === params.brewing_method_id)
    : methods[0];

  if (!method) return c.json({ error: 'Brewing method not found' }, 404);

  return c.json({
    brewing_method: method.name,
    input: {
      origin: params.origin || '',
      roast_level: params.roast_level || '',
      grind_size: params.grind_size || method.grind_size,
      water_temp_c: params.water_temp_c ?? method.default_temp_c,
      ratio: params.ratio ?? method.default_ratio,
      brew_time_s: params.brew_time_s ?? method.default_brew_time_s,
    },
    recommendation: `For ${params.origin || 'your coffee'} (${params.roast_level || 'unknown'} roast), try ${method.name} at ${method.default_temp_c}°C with a ${method.grind_size} grind. Ratio: approx 1:${Math.round(1 / method.default_ratio)} for ${method.default_brew_time_s}s.`,
    confidence: 'low',
  });
});

export default app;
