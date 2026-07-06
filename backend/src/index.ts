import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { geminiRoute } from './routes/gemini';
import { ttsRoute } from './routes/tts';
import { veoRoute } from './routes/veo';

const app = new Hono();

app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}));

app.route('/api/gemini', geminiRoute);
app.route('/api/tts', ttsRoute);
app.route('/api/veo', veoRoute);

export default app;
