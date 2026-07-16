import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { geminiRoute } from './routes/gemini/gemini.route';
import { ttsRoute } from './routes/tts/tts.route';
import { veoRoute } from './routes/veo/veo.route';
import { kieRoute } from './routes/kie/kie.route';
import { licenseRoute } from './routes/license/license.route';

const app = new Hono();

app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}));

app.route('/api/gemini', geminiRoute);
app.route('/api/tts', ttsRoute);
app.route('/api/veo', veoRoute);
app.route('/api/kie', kieRoute);
app.route('/api/license', licenseRoute);

export default app;
