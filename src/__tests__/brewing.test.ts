import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrewingMethod, Brew, BrewWithMethod } from '../types.js';

vi.mock('../lib/db.js', () => ({
  getBrewingMethods: vi.fn(),
  getBrews: vi.fn(),
  getBrewById: vi.fn(),
  addBrew: vi.fn(),
}));

import brewingRoutes from '../routes/brewing.js';
import { getBrewingMethods, addBrew, getBrews, getBrewById } from '../lib/db.js';

const mockMethods: BrewingMethod[] = [
  {
    id: 1,
    name: 'Pour Over',
    description: 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)',
    default_temp_c: 93,
    grind_size: 'medium-fine',
    default_brew_time_s: 210,
    default_ratio: 0.0625,
  },
];

const mockBrews: { count: number; brews: BrewWithMethod[] } = {
  count: 1,
  brews: [
    {
      id: 1,
      brewing_method: 'Pour Over',
      origin: 'Colombia',
      roast_level: 'medium',
      grind_size: 'medium',
      water_temp_c: 95,
      ratio: 0.0625,
      brew_time_s: 180,
      rating: 4,
      notes: 'A bit bitter, extracted too fast',
      created_at: '2026-05-25T10:30:00Z',
    source: 'user_submitted',
    },
  ],
};

const mockBrew: Brew = {
  id: 1,
  brewing_method_id: 1,
  origin: 'Colombia',
  roast_level: 'medium',
  grind_size: 'medium',
  water_temp_c: 95,
  ratio: 0.0625,
  brew_time_s: 180,
  rating: 4,
  notes: 'A bit bitter',
  created_at: '2026-05-25T10:30:00Z',
    source: 'user_submitted',
};

const validBrewPayload = {
  brewing_method_id: 1,
  origin: 'Colombian Medium Roast',
  roast_level: 'medium',
  grind_size: 'medium-fine',
  water_temp_c: 93,
  ratio: 0.0625,
  brew_time_s: 180,
  rating: 4,
  notes: 'Bright and clean',
  source: 'user_submitted' as const,
  source_url: undefined,
  field_confidence: undefined,
};

beforeEach(() => vi.resetAllMocks());

describe('GET /brewing-methods', () => {
  it('returns all brewing methods as JSON', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue(mockMethods);

    const res = await brewingRoutes.request('/brewing-methods');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockMethods);
  });
});

describe('GET /brews', () => {
  it('returns brews with count from the DB', async () => {
    vi.mocked(getBrews).mockResolvedValue(mockBrews);

    const res = await brewingRoutes.request('/brews');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockBrews);
  });

  it('passes query filters to getBrews', async () => {
    vi.mocked(getBrews).mockResolvedValue({ count: 0, brews: [] });

    const res = await brewingRoutes.request('/brews?origin=Colombia&method=1&limit=10');

    expect(res.status).toBe(200);
    expect(vi.mocked(getBrews)).toHaveBeenCalledWith({ origin: 'Colombia', method: 1, limit: 10 });
  });
});

describe('POST /brews', () => {
  it('creates a brew and returns 201 with id and message', async () => {
    const saved: Brew = { ...validBrewPayload, id: 1, created_at: '2026-05-25T00:00:00Z',
      source: 'user_submitted' };
    vi.mocked(addBrew).mockResolvedValue(saved);

    const res = await brewingRoutes.request('/brews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBrewPayload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.message).toBe('Brew record added successfully');
    expect(vi.mocked(addBrew)).toHaveBeenCalledWith(validBrewPayload);
  });

  it('rejects a payload missing required fields with 400', async () => {
    const res = await brewingRoutes.request('/brews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brewing_method_id: 1, origin: 'Test' }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects a rating outside 1-5 with 400', async () => {
    const res = await brewingRoutes.request('/brews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBrewPayload, rating: 10 }),
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /brews/:id', () => {
  it('returns a single brew by ID', async () => {
    vi.mocked(getBrewById).mockResolvedValue(mockBrew);

    const res = await brewingRoutes.request('/brews/1');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockBrew);
  });

  it('returns 404 for nonexistent brew', async () => {
    vi.mocked(getBrewById).mockResolvedValue(null);

    const res = await brewingRoutes.request('/brews/999');

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid ID', async () => {
    const res = await brewingRoutes.request('/brews/abc');

    expect(res.status).toBe(400);
  });
});

describe('GET /brews/:id/compare', () => {
  it('returns comparison data', async () => {
    vi.mocked(getBrewById).mockResolvedValue(mockBrew);
    vi.mocked(getBrewingMethods).mockResolvedValue(mockMethods);

    const res = await brewingRoutes.request('/brews/1/compare');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.brew_id).toBe(1);
    expect(body.user_brew).toBeDefined();
    expect(body.user_brew.water_temp_c).toBe(95);
    expect(body.analysis).toBeDefined();
    expect(body.match_score).toBeDefined();
  });

  it('returns 404 for nonexistent brew', async () => {
    vi.mocked(getBrewById).mockResolvedValue(null);

    const res = await brewingRoutes.request('/brews/999/compare');

    expect(res.status).toBe(404);
  });
});

describe('POST /recommend', () => {
  it('returns a recommendation using the specified method', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue(mockMethods);

    const res = await brewingRoutes.request('/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brewing_method_id: 1, origin: 'Colombia', roast_level: 'medium' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.brewing_method).toBe('Pour Over');
    expect(body.recommendation).toBeDefined();
    expect(body.confidence).toBeDefined();
    expect(body.input.origin).toBe('Colombia');
  });

  it('falls back to first method when no method_id provided', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue(mockMethods);

    const res = await brewingRoutes.request('/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: 'Ethiopian Yirgacheffe' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.brewing_method).toBe('Pour Over');
  });

  it('returns 404 when method_id does not match', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue(mockMethods);

    const res = await brewingRoutes.request('/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brewing_method_id: 999 }),
    });

    expect(res.status).toBe(404);
  });
});
