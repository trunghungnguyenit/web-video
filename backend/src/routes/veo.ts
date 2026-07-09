import { Hono } from 'hono';
import { fail, ok } from '../utils/api-response';
import { generateSceneVideo } from '../services/veo.service';
import { listVeoModels } from '../services/veo-models.service';
import type { VeoInput } from '../types/pipeline';

interface GenerateBody {
  apiKey: string;
  prompt: string;
  veoInput: VeoInput;
  durationSeconds: number;
}

interface ModelsBody {
  apiKey: string;
}

export const veoRoute = new Hono();

/**
 * POST /api/veo/models
 * Liệt kê model Veo khả dụng theo API Key
 */
veoRoute.post('/models', async (c) => {
  try {
    const body = await c.req.json<ModelsBody>();

    if (!body.apiKey?.trim()) {
      return fail(c, 'Thiếu API Key — nhập Gemini / Veo API Key tại mục API Keys.');
    }

    const models = await listVeoModels(body.apiKey);
    return ok(c, { models });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi khi lấy danh sách model Veo';
    return fail(c, message, 500);
  }
});

/**
 * POST /api/veo/generate
 * Veo 3 — tạo video MP4 từ prompt cảnh
 */
veoRoute.post('/generate', async (c) => {
  try {
    const body = await c.req.json<GenerateBody>();

    if (!body.apiKey?.trim()) {
      return fail(c, 'Thiếu Veo API Key — nhập Gemini API Key tại mục API Keys.');
    }
    if (!body.prompt?.trim()) {
      return fail(c, 'Prompt video không được để trống.');
    }
    if (!body.veoInput) {
      return fail(c, 'Thiếu veoInput.');
    }

    const video = await generateSceneVideo({
      apiKey: body.apiKey,
      prompt: body.prompt,
      veoInput: body.veoInput,
      durationSeconds: body.durationSeconds ?? 6,
    });

    return new Response(new Uint8Array(video), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi khi gọi Veo';
    return fail(c, message, 500);
  }
});
