import { Hono } from 'hono';
import { fail, ok } from '../../utils/api-response';
import {
  downloadVideo,
  pollVideoOperation,
  startVideoGeneration,
} from '../../services/veo/veo.service';
import {
  downloadVideo as downloadGeminiVideo,
  pollVideoOperation as pollGeminiVideoOperation,
  startVideoGeneration as startGeminiVideoGeneration,
} from '../../services/veo/veo-gemini.service';
import { listVeoModels } from '../../services/veo/veo-models.service';
import { VeoApiError } from '../../lib/veo-errors';
import type { VeoInput } from '../../types/pipeline';

/**
 * 'veo-gemini' = gọi thẳng Google Gemini API (veo-gemini.service.ts) thay vì kie.ai.
 * poll/download không nhận veoInput nên frontend gửi kèm `provider` riêng ở body.
 */
type VideoProvider = VeoInput['provider'];

function isGeminiProvider(provider: VideoProvider): boolean {
  return provider === 'veo-gemini';
}

interface StartBody {
  apiKey: string;
  prompt: string;
  veoInput: VeoInput;
  durationSeconds: number;
  /** Khung đầu — ảnh nguồn cảnh (tab "Từ hình ảnh") HOẶC khung hình cuối cảnh trước (Scene Continuity) */
  image?: { base64: string; mimeType: string };
}

interface PollBody {
  apiKey: string;
  operationName: string;
  /** '1080p' → sau khi task xong, backend tự gọi thêm get-1080p-video (chỉ kie.ai) */
  quality?: string;
  provider?: VideoProvider;
}

interface DownloadBody {
  apiKey: string;
  videoUri: string;
  provider?: VideoProvider;
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
 * Bắt đầu tạo video — đúng 1 lần /veo/generate, trả operationName (taskId). Khi Scene
 * Continuity bật, cảnh sau gửi kèm `image` = khung hình cuối cảnh trước (FIRST_AND_LAST_FRAMES).
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

    const start = isGeminiProvider(body.veoInput.provider)
      ? startGeminiVideoGeneration
      : startVideoGeneration;

    const operationName = await start({
      apiKey: body.apiKey,
      prompt: body.prompt,
      veoInput: body.veoInput,
      durationSeconds: body.durationSeconds ?? 6,
      image: body.image,
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

    // Google trực tiếp: resolution nằm ngay trong request generate, không có bước nâng
    // cấp 1080p riêng như kie.ai → không truyền `quality` vào poll.
    const result = isGeminiProvider(body.provider)
      ? await pollGeminiVideoOperation(body.apiKey, body.operationName)
      : await pollVideoOperation(body.apiKey, body.operationName, body.quality);
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

    const video = isGeminiProvider(body.provider)
      ? await downloadGeminiVideo(body.apiKey, body.videoUri)
      : await downloadVideo(body.apiKey, body.videoUri);

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
