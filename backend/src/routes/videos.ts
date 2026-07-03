import { Hono } from 'hono';
import { videoService } from '../services';
import { ok, fail } from '../utils/api-response';
import type { CreateVideoProjectInput } from '../types';

export const videosRoute = new Hono();

videosRoute.get('/', (c) => ok(c, videoService.list()));

videosRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateVideoProjectInput>();
    if (!body.script?.trim()) return fail(c, 'script is required');
    return ok(c, videoService.create(body), 201);
  } catch {
    return fail(c, 'Invalid request body');
  }
});
