import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrewingMethod, Brew } from '../types.js';

vi.mock('../lib/db.js', () => ({
  getBrewingMethods: vi.fn(),
  addBrew: vi.fn(),
}));

import mcpRoute from '../routes/mcp.js';
import { getBrewingMethods, addBrew } from '../lib/db.js';

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
};

async function callMcp(method: string, params: Record<string, unknown>, id = 1) {
  const res = await mcpRoute.request('/', {
    method: 'POST',
    headers: MCP_HEADERS,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const text = await res.text();
  const dataLine = text.split('\n').find((l) => l.startsWith('data:'));
  if (!dataLine) throw new Error(`No SSE data line in response:\n${text}`);
  return JSON.parse(dataLine.slice('data: '.length));
}

const mockMethod: BrewingMethod = {
  id: 'uuid-pour-over',
  name: 'Pour Over',
  description: 'Manual pour over method',
  waterTemp: 93,
  grindSize: 'Medium-Fine',
  brewTime: 180,
  ratio: '1:16',
};

beforeEach(() => vi.resetAllMocks());

describe('MCP tools/list', () => {
  it('returns exactly 4 registered tools', async () => {
    const data = await callMcp('tools/list', {});
    expect(data.result.tools).toHaveLength(4);
    expect(data.result.tools.map((t: { name: string }) => t.name)).toEqual([
      'get_brewing_methods',
      'recommend',
      'log_brew',
      'compare_brew',
    ]);
  });
});

describe('MCP tool: get_brewing_methods', () => {
  it('returns all methods from the DB', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', { name: 'get_brewing_methods', arguments: {} });

    const result = JSON.parse(data.result.content[0].text);
    expect(result).toEqual([mockMethod]);
  });
});

describe('MCP tool: recommend', () => {
  it('returns brew params when methodId matches a known method', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', {
      name: 'recommend',
      arguments: { coffeeName: 'Colombian', methodId: 'uuid-pour-over' },
    });

    const result = JSON.parse(data.result.content[0].text);
    expect(result.method.name).toBe('Pour Over');
    expect(result.params).toMatchObject({ grindSize: 'Medium-Fine', waterTemp: 93 });
    expect(result.reasoning).toBeDefined();
  });

  it('returns isError when methodId does not match', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', {
      name: 'recommend',
      arguments: { coffeeName: 'Colombian', methodId: 'nonexistent-id' },
    });

    expect(data.result.isError).toBe(true);
    expect(data.result.content[0].text).toBe('Method not found');
  });

  it('falls back to first method when no methodId is provided', async () => {
    vi.mocked(getBrewingMethods).mockResolvedValue([mockMethod]);

    const data = await callMcp('tools/call', {
      name: 'recommend',
      arguments: { coffeeName: 'Colombian' },
    });

    const result = JSON.parse(data.result.content[0].text);
    expect(result.method.id).toBe('uuid-pour-over');
  });
});

describe('MCP tool: log_brew', () => {
  it('persists a brew entry and returns it', async () => {
    const brewArgs = {
      methodId: 'uuid-pour-over',
      coffeeName: 'Colombian',
      grindSetting: 'Medium-Fine',
      waterTemp: 93,
      brewTime: 180,
      rating: 4,
      notes: 'Bright and clean',
    };
    const saved: Brew = { ...brewArgs, id: 'brew-uuid-1', timestamp: '2026-05-25T00:00:00Z' };
    vi.mocked(addBrew).mockResolvedValue(saved);

    const data = await callMcp('tools/call', { name: 'log_brew', arguments: brewArgs });

    const result = JSON.parse(data.result.content[0].text);
    expect(result.id).toBe('brew-uuid-1');
    expect(result.coffeeName).toBe('Colombian');
    expect(vi.mocked(addBrew)).toHaveBeenCalledWith(brewArgs);
  });
});
