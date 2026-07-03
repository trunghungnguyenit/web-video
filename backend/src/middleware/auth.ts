import { env } from '../config/env';

/**
 * Middleware xác thực — mở rộng khi có JWT / session.
 */
export function requireAuth(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  return Boolean(apiKey || env.nodeEnv === 'development');
}
