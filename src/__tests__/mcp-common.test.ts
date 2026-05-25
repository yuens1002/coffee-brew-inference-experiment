import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { checkOrigin } from '../lib/mcp-common.js';

function makeTestApp() {
  const app = new Hono();
  app.get('/test', (c) => {
    const err = checkOrigin(c);
    if (err) return err;
    return c.text('ok', 200);
  });
  return app;
}

describe('checkOrigin', () => {
  it('allows requests with no Origin header (direct MCP clients)', async () => {
    const res = await makeTestApp().request('/test');
    expect(res.status).toBe(200);
  });

  it('allows requests from yuens.me', async () => {
    const res = await makeTestApp().request('/test', {
      headers: { Origin: 'https://yuens.me' },
    });
    expect(res.status).toBe(200);
  });

  it('allows requests from a yuens.me subdomain', async () => {
    const res = await makeTestApp().request('/test', {
      headers: { Origin: 'https://app.yuens.me' },
    });
    expect(res.status).toBe(200);
  });

  it('allows requests from localhost', async () => {
    const res = await makeTestApp().request('/test', {
      headers: { Origin: 'http://localhost:4000' },
    });
    expect(res.status).toBe(200);
  });

  it('blocks unknown origins with 403 and error body', async () => {
    const res = await makeTestApp().request('/test', {
      headers: { Origin: 'https://evil.com' },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'Origin not allowed' });
  });

  it('blocks origins that contain "localhost" in the path/query but are not localhost hosts', async () => {
    const res = await makeTestApp().request('/test', {
      headers: { Origin: 'https://evil.com?localhost' },
    });
    expect(res.status).toBe(403);
  });

  it('blocks origins that end with "yuens.me" but are not yuens.me subdomains', async () => {
    const res = await makeTestApp().request('/test', {
      headers: { Origin: 'https://notyuens.me' },
    });
    expect(res.status).toBe(403);
  });

  it('blocks malformed Origin values', async () => {
    const res = await makeTestApp().request('/test', {
      headers: { Origin: 'not-a-url' },
    });
    expect(res.status).toBe(403);
  });
});
