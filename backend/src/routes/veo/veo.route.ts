import { Hono } from 'hono';
import { fail, ok } from '../../utils/api-response';
import {
  downloadVideo,
  pollVideoOperation,
  startVideoGeneration,
} from '../../services/veo/veo.service';
import { listVeoModels } from '../../services/veo/veo-models.service';
import { VeoApiError } from '../../lib/veo-errors';
import type { VeoInput } from '../../types/pipeline';

interface StartBody {
  apiKey: string;
  prompt: string;
  veoInput: VeoInput;
  durationSeconds: number;
}

interface PollBody {
  apiKey: string;
  operationName: string;
}

interface DownloadBody {
  apiKey: string;
  videoUri: string;
}

interface ModelsBody {
  apiKey: string;
}

function veoErrorResponse(c: Parameters<typeof fail>[0], err: unknown) {
  const message = err instanceof Error ? err.message : 'Lỗi khi gọi Veo';
  const fatal = err instanceof VeoApiError ? err.fatal : false;
  return c.json({ success: false, error: message, fatal }, fatal ? 402 : 500);
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
      return fail(c, 'Thiếu API Key — nhập Veo API Key tại mục API Keys.');
    }

    const models = await listVeoModels(body.apiKey);
    return ok(c, { models });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi khi lấy danh sách model Veo';
    return fail(c, message, 500);
  }
});

/**
 * POST /api/veo/generate/start
 * Bắt đầu tạo video — đúng 1 lần predictLongRunning, trả operationName
 */
veoRoute.post('/generate/start', async (c) => {
  try {
    const body = await c.req.json<StartBody>();

    if (!body.apiKey?.trim()) {
      return fail(c, 'Thiếu Veo API Key.', 400);
    }
    if (!body.prompt?.trim()) {
      return fail(c, 'Prompt video không được để trống.', 400);
    }
    if (!body.veoInput) {
      return fail(c, 'Thiếu veoInput.', 400);
    }

    const operationName = await startVideoGeneration({
      apiKey: body.apiKey,
      prompt: body.prompt,
      veoInput: body.veoInput,
      durationSeconds: body.durationSeconds ?? 6,
    });

    return ok(c, { operationName });
  } catch (err) {
    return veoErrorResponse(c, err);
  }
});

/**
 * POST /api/veo/operations/poll
 * Chỉ poll operations.get — không gọi generate lại
 */
veoRoute.post('/operations/poll', async (c) => {
  try {
    const body = await c.req.json<PollBody>();

    if (!body.apiKey?.trim()) {
      return fail(c, 'Thiếu Veo API Key.', 400);
    }
    if (!body.operationName?.trim()) {
      return fail(c, 'Thiếu operationName.', 400);
    }

    const result = await pollVideoOperation(body.apiKey, body.operationName);
    return ok(c, result);
  } catch (err) {
    return veoErrorResponse(c, err);
  }
});

/**
 * POST /api/veo/generate/download
 * Tải video MP4 khi operation đã DONE
 */
veoRoute.post('/generate/download', async (c) => {
  try {
    const body = await c.req.json<DownloadBody>();

    if (!body.apiKey?.trim()) {
      return fail(c, 'Thiếu Veo API Key.', 400);
    }
    if (!body.videoUri?.trim()) {
      return fail(c, 'Thiếu videoUri.', 400);
    }

    const video = await downloadVideo(body.apiKey, body.videoUri);

    return new Response(new Uint8Array(video), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return veoErrorResponse(c, err);
  }
});

/**
 * POST /api/veo/generate
 * @deprecated Dùng /generate/start + /operations/poll + /generate/download
 */
veoRoute.post('/generate', async (c) => {
  return c.json(
    {
      success: false,
      error: 'Endpoint đã ngừng — dùng /api/veo/generate/start, /operations/poll, /generate/download.',
    },
    410,
  );
});
