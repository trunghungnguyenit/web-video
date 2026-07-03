import { Hono } from 'hono';
import { ok } from '../utils/api-response';
import { env } from '../config/env';
import { db } from '../lib/db';

export const healthRoute = new Hono();

healthRoute.get('/', (c) =>
  ok(c, {
    status: 'ok',
    env: env.nodeEnv,
    database: db.isConnected() ? 'configured' : 'not configured',
    timestamp: new Date().toISOString(),
  }),
);
