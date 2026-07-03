import { Hono } from 'hono';
import { characterService } from '../services';
import { ok, fail } from '../utils/api-response';
import type { CreateCharacterInput } from '../types';

export const charactersRoute = new Hono();

charactersRoute.get('/', (c) => ok(c, characterService.list()));

charactersRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateCharacterInput>();
    if (!body.name?.trim()) return fail(c, 'name is required');
    return ok(c, characterService.create(body), 201);
  } catch {
    return fail(c, 'Invalid request body');
  }
});
