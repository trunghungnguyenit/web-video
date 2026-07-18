import { Hono } from 'hono';
import { fail, ok } from '../../utils/api-response';
import { downloadGrokVideo, pollGrokVideoTask, startGrokVideoGeneration } from '../../services/kie/kie.service';
import { VeoApiError } from '../../lib/veo-errors';

interface StartBody {
  apiKey: string;
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  mode?: string;
  resolution?: string;
  /** Ảnh Master Cast / nguồn cảnh (base64) — BE upload rồi gọi image-to-video */
  image?: { base64: string; mimeType: string };
}

interface PollBody {
  apiKey: string;
  taskId: string;
}

interface DownloadBody {
  videoUrl: string;
}

function kieErrorResponse(c: Parameters<typeof fail>[0], err: unknown) {
  const message = err instanceof Error ? err.message : 'Lỗi khi gọi Kie.ai';
  const fatal = err instanceof VeoApiError ? err.fatal : false;
  return c.json({ success: false, error: message, fatal }, fatal ? 402 : 500);
}

export const kieRoute = new Hono();

/**
 * POST /api/kie/generate/start
 * Tạo task Grok Imagine text-to-video, trả taskId
 */
kieRoute.post('/generate/start', async (c) => {
  try {
    const body = await c.req.json<StartBody>();

    if (!body.apiKey?.trim()) {
      return fail(c, 'Thiếu Kie.ai API Key.', 400);
    }
    if (!body.prompt?.trim()) {
      return fail(c, 'Prompt video không được để trống.', 400);
    }

    console.log('[kie/route] generate/start nhận:', {
      hasImage: Boolean(body.image?.base64 && body.image?.mimeType),
      imageMime: body.image?.mimeType ?? null,
      imageBytesApprox: body.image?.base64
        ? Math.round((body.image.base64.length * 3) / 4)
        : 0,
      promptPreview: body.prompt.slice(0, 80),
    });

    const taskId = await startGrokVideoGeneration({
      apiKey: body.apiKey,
      prompt: body.prompt,
      aspectRatio: body.aspectRatio,
      durationSeconds: body.durationSeconds ?? 6,
      mode: body.mode,
      resolution: body.resolution,
      image: body.image?.base64 && body.image?.mimeType
        ? { base64: body.image.base64, mimeType: body.image.mimeType }
        : undefined,
    });

    return ok(c, { taskId });
  } catch (err) {
    return kieErrorResponse(c, err);
  }
});

/**
 * POST /api/kie/operations/poll
 * Poll trạng thái task qua recordInfo
 */
kieRoute.post('/operations/poll', async (c) => {
  try {
    const body = await c.req.json<PollBody>();

    if (!body.apiKey?.trim()) {
      return fail(c, 'Thiếu Kie.ai API Key.', 400);
    }
    if (!body.taskId?.trim()) {
      return fail(c, 'Thiếu taskId.', 400);
    }

    const result = await pollGrokVideoTask(body.apiKey, body.taskId);
    return ok(c, result);
  } catch (err) {
    return kieErrorResponse(c, err);
  }
});

/**
 * POST /api/kie/generate/download
 * Proxy tải video MP4 từ URL kết quả kie.ai — tránh phụ thuộc CORS của CDN kie.ai
 * khi trình duyệt fetch trực tiếp.
 */
kieRoute.post('/generate/download', async (c) => {
  try {
    const body = await c.req.json<DownloadBody>();

    if (!body.videoUrl?.trim()) {
      return fail(c, 'Thiếu videoUrl.', 400);
    }

    const video = await downloadGrokVideo(body.videoUrl);

    return new Response(new Uint8Array(video), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return kieErrorResponse(c, err);
  }
});
