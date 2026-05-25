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
  if (!origin.endsWith('yuens.me') && !origin.includes('localhost')) {
    return c.json({ error: 'Origin not allowed' }, 403, corsHeaders);
  }
  return null;
}
