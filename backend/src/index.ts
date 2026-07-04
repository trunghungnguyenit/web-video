import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { exampleRoute } from './routes/example';

const app = new Hono();

app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}));

app.route('/api/example', exampleRoute);

export default app;
