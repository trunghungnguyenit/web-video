import { Hono } from 'hono';
import { sceneService } from '../services';
import { ok, fail } from '../utils/api-response';
import type { CreateSceneInput } from '../types';

export const scenesRoute = new Hono();

scenesRoute.get('/', (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId) return fail(c, 'projectId query is required');
  return ok(c, sceneService.listByProject(projectId));
});

scenesRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateSceneInput>();
    if (!body.projectId || !body.prompt?.trim()) {
      return fail(c, 'projectId and prompt are required');
    }
    return ok(c, sceneService.create(body), 201);
  } catch {
    return fail(c, 'Invalid request body');
  }
});

scenesRoute.post('/:id/regenerate', (c) => {
  const id = c.req.param('id');
  const scene = sceneService.regenerate(id);
  if (!scene) return fail(c, 'Scene not found', 404);
  return ok(c, scene);
});
