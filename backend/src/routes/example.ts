import { Hono } from 'hono';
import { ok, fail } from '../utils/api-response';

/**
 * API VÍ DỤ — dùng để học cách FE gọi BE
 *
 * GET  /api/example        → lấy message mẫu
 * POST /api/example        → gửi text, BE trả lại text đó
 */
export const exampleRoute = new Hono();

exampleRoute.get('/', (c) => {
  return ok(c, {
    message: 'Xin chào! Backend đang chạy bình thường.',
    time: new Date().toISOString(),
  });
});

exampleRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<{ text?: string }>();

    if (!body.text?.trim()) {
      return fail(c, 'Trường "text" không được để trống');
    }

    return ok(c, {
      message: `Backend đã nhận: "${body.text.trim()}"`,
      length: body.text.trim().length,
    });
  } catch {
    return fail(c, 'Body phải là JSON: { "text": "..." }');
  }
});
