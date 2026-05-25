import { Hono } from 'hono';
import type { Context } from 'hono';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Session-ID',
  'Access-Control-Max-Age': '86400',
};

export function checkOrigin(c: Context) {
  const origin = c.req.header('Origin');
  if (!origin) return null;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return c.json({ error: 'Origin not allowed' }, 403, corsHeaders);
  }
  const allowed =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === 'yuens.me' ||
    hostname.endsWith('.yuens.me');
  if (!allowed) return c.json({ error: 'Origin not allowed' }, 403, corsHeaders);
  return null;
}
