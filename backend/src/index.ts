import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { healthRoute } from './routes/health';
import { videosRoute } from './routes/videos';
import { charactersRoute } from './routes/characters';
import { scenesRoute } from './routes/scenes';
import { apiKeysRoute } from './routes/api-keys';

const app = new Hono();

app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}));

app.route('/api/health', healthRoute);
app.route('/api/videos', videosRoute);
app.route('/api/characters', charactersRoute);
app.route('/api/scenes', scenesRoute);
app.route('/api/api-keys', apiKeysRoute);

export default app;
