import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrewingMethod, Brew } from '../types.js';

vi.mock('../lib/db.js', () => ({
  getBrewingMethods: vi.fn(),
  addBrew: vi.fn(),
}));

import brewingRoutes from '../routes/brewing.js';
import { getBrewingMethods, addBrew } from '../lib/db.js';

const mockMethods: BrewingMethod[] = [
  {
    id: 'uuid-pour-over',
    name: 'Pour Over',
    description: 'Manual pour over method',
    waterTemp: 93,
    grindSize: 'Medium-Fine',
    brewTime: 180,
    ratio: '1:16',
  },
];

const validBrewPayload = {
  methodId: 'uuid-pour-over',
  coffeeName: 'Colombian Medium Roast',
  grindSetting: 'Medium-Fine',
  waterTemp: 93,
  brewTime: 180,
  rating: 4,
  notes: 'Bright and clean',
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
  it('returns an empty array (stub)', async () => {
    const res = await brewingRoutes.request('/brews');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe('POST /brews', () => {
  it('creates a brew and returns 201 with the saved record', async () => {
    const saved: Brew = { ...validBrewPayload, id: 'brew-1', timestamp: '2026-05-25T00:00:00Z' };
    vi.mocked(addBrew).mockResolvedValue(saved);

    const res = await brewingRoutes.request('/brews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBrewPayload),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(saved);
    expect(vi.mocked(addBrew)).toHaveBeenCalledWith(validBrewPayload);
  });

  it('rejects a payload missing required fields with 400', async () => {
    const res = await brewingRoutes.request('/brews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ methodId: 'uuid-pour-over', coffeeName: 'Test' }),
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

describe('POST /recommend', () => {
  it('returns a stub recommendation using the first method', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue(mockMethods);

    const res = await brewingRoutes.request('/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coffeeName: 'Ethiopian Yirgacheffe' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.method).toEqual(mockMethods[0]);
    expect(body.reasoning).toBeDefined();
  });
});
