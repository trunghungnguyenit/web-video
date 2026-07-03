import { Hono } from 'hono';
import { apiKeyService } from '../services';
import { ok, fail } from '../utils/api-response';
import type { SaveApiKeyInput } from '../types';

export const apiKeysRoute = new Hono();

apiKeysRoute.get('/', (c) => ok(c, apiKeyService.list()));

apiKeysRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<SaveApiKeyInput>();
    if (!body.provider || !body.key?.trim()) {
      return fail(c, 'provider and key are required');
    }
    return ok(c, apiKeyService.save(body));
  } catch {
    return fail(c, 'Invalid request body');
  }
});
