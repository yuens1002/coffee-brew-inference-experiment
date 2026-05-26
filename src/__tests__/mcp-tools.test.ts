import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrewingMethod, Brew, BrewWithMethod } from '../types.js';

vi.mock('../lib/db.js', () => ({
  getBrewingMethods: vi.fn(),
  getBrews: vi.fn(),
  getBrewById: vi.fn(),
  addBrew: vi.fn(),
}));

import mcpRoute from '../routes/mcp.js';
import { getBrewingMethods, getBrews, getBrewById, addBrew } from '../lib/db.js';

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

interface McpResponse {
  result: {
    content?: Array<{ type: string; text: string }>;
    tools?: Array<{ name: string }>;
    isError?: boolean;
  };
}

async function callMcp(
  method: string,
  params: Record<string, unknown>,
  id = 1,
): Promise<McpResponse> {
  const res = await mcpRoute.request('/', {
    method: 'POST',
    headers: MCP_HEADERS,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const text = await res.text();
  const dataLine = text.split('\n').find((l) => l.startsWith('data:'));
  if (!dataLine) throw new Error(`No SSE data line in response:\n${text}`);
  return JSON.parse(dataLine.slice('data: '.length)) as McpResponse;
}

const mockMethod: BrewingMethod = {
  id: 1,
  name: 'Pour Over',
  description: 'Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)',
  default_temp_c: 93,
  grind_size: 'medium-fine',
  default_brew_time_s: 210,
  default_ratio: 0.0625,
};

beforeEach(() => vi.resetAllMocks());

describe('MCP tools/list', () => {
  it('returns exactly 5 registered tools', async () => {
    const data = await callMcp('tools/list', {});
expect(data.result.tools!).toHaveLength(5);
    expect(data.result.tools!.map((t: { name: string }) => t.name)).toEqual([
      'get_brewing_methods',
      'recommend',
      'log_brew',
      'search_brews',
      'compare_brew',
    ]);
  });
});

describe('MCP tool: get_brewing_methods', () => {
  it('returns all methods from the DB', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', { name: 'get_brewing_methods', arguments: {} });

    const result = JSON.parse(data.result.content![0].text);
    expect(result).toEqual([mockMethod]);
  });
});

describe('MCP tool: recommend', () => {
  it('returns brew params when brewing_method_id matches a known method', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', {
      name: 'recommend',
      arguments: { origin: 'Colombia', roast_level: 'medium', brewing_method_id: 1 },
    });

    const result = JSON.parse(data.result.content![0].text);
    expect(result.brewing_method).toBe('Pour Over');
    expect(result.input.origin).toBe('Colombia');
    expect(result.input.roast_level).toBe('medium');
    expect(result.confidence).toBe('low');
  });

  it('returns isError when brewing_method_id does not match', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', {
      name: 'recommend',
      arguments: { origin: 'Colombia', brewing_method_id: 999 },
    });

    expect(data.result.isError!).toBe(true);
    expect(data.result.content![0].text).toBe('Brewing method not found');
  });

  it('falls back to first method when no brewing_method_id is provided', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', {
      name: 'recommend',
      arguments: { origin: 'Ethiopia' },
    });

    const result = JSON.parse(data.result.content![0].text);
    expect(result.brewing_method).toBe('Pour Over');
  });
});

describe('MCP tool: log_brew', () => {
  it('persists a brew entry and returns id + message', async () => {
    const brewArgs = {
      brewing_method_id: 1,
      origin: 'Colombia',
      roast_level: 'medium',
      grind_size: 'medium-fine',
      water_temp_c: 93,
      ratio: 0.0625,
      brew_time_s: 180,
      rating: 4,
      notes: 'Bright and clean',
    };
    const saved: Brew = { ...brewArgs, id: 1, created_at: '2026-05-25T00:00:00Z',
      source: 'user_submitted' };
    vi.mocked(addBrew).mockResolvedValue(saved);

    const data = await callMcp('tools/call', { name: 'log_brew', arguments: brewArgs });

    const result = JSON.parse(data.result.content![0].text);
    expect(result.id).toBe(1);
    expect(result.message).toBe('Brew record added successfully');
    expect(vi.mocked(addBrew)).toHaveBeenCalledWith(brewArgs);
  });
});

describe('MCP tool: search_brews', () => {
  it('returns filtered brew results', async () => {
    const mockResult: { count: number; brews: BrewWithMethod[] } = {
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
          notes: undefined,
          created_at: '2026-05-25T10:30:00Z',
    source: 'user_submitted',
        },
      ],
    };
    vi.mocked(getBrews).mockResolvedValue(mockResult);

    const data = await callMcp('tools/call', {
      name: 'search_brews',
      arguments: { origin: 'Colombia', limit: 10 },
    });

    const result = JSON.parse(data.result.content![0].text);
    expect(result.count).toBe(1);
    expect(result.brews[0].origin).toBe('Colombia');
    expect(vi.mocked(getBrews)).toHaveBeenCalledWith({ origin: 'Colombia', limit: 10 });
  });
});

describe('MCP tool: compare_brew', () => {
  it('returns comparison data for a valid brew', async () => {
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
    vi.mocked(getBrewById).mockResolvedValue(mockBrew);
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', {
      name: 'compare_brew',
      arguments: { brew_id: 1 },
    });

    const result = JSON.parse(data.result.content![0].text);
    expect(result.brew_id).toBe(1);
    expect(result.user_brew.rating).toBe(4);
    expect(result.ai_recommendation).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.match_score).toBeDefined();
  });

  it('returns isError when brew not found', async () => {
    vi.mocked(getBrewById).mockResolvedValue(null);

    const data = await callMcp('tools/call', {
      name: 'compare_brew',
      arguments: { brew_id: 999 },
    });

    expect(data.result.isError!).toBe(true);
    expect(data.result.content![0].text).toBe('Brew not found');
  });
});