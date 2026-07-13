import './config/load-env';
import { serve } from '@hono/node-server';
import app from './index';
import { env } from './config/env';

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Backend running at http://localhost:${info.port}`);
});
