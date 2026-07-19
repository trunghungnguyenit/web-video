import { VeoApiError, isFatalVeoMessage, withVeoRetry } from '../../lib/veo-errors';
import {
  resolveKieAspectRatio,
  resolveKieDurationSeconds,
  resolveKieMode,
  resolveKieResolution,
} from '../../lib/kie-config';
import { uploadKieImageBase64 } from './kie-files.service';

const BASE_URL = 'https://api.kie.ai/api/v1';
const MODEL_T2V = 'grok-imagine/text-to-video';
const MODEL_I2V = 'grok-imagine/image-to-video';

interface CreateTaskResponse {
  code?: number;
  msg?: string;
  data?: { taskId?: string };
}

interface RecordInfoResponse {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    state?: 'waiting' | 'success' | 'fail';
    resultJson?: string;
    failMsg?: string;
  };
}

export interface GenerateGrokVideoParams {
  apiKey: string;
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  mode?: string;
  /** 480p (mặc định) | 720p — Grok Imagine không hỗ trợ 1080p */
  resolution?: string;
  /** Ảnh Master Cast / nguồn cảnh — bật image-to-video để đồng nhất nhân vật */
  image?: { base64: string; mimeType: string };
}

export interface PollGrokTaskResult {
  done: boolean;
  videoUrl?: string;
  error?: string;
}

function parseKieError(msg: string | undefined, status: number, fallback: string): VeoApiError {
  const message = msg ?? fallback;
  return new VeoApiError(message, { status, fatal: isFatalVeoMessage(message) || status === 401 });
}

/** Đọc JSON an toàn — Kie đôi khi trả HTML (404/502) thay vì JSON */
async function readKieJson<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new VeoApiError(`${label}: phản hồi trống (${res.status}).`, { status: res.status });
  }
  if (trimmed.startsWith('<')) {
    throw new VeoApiError(
      `${label}: server trả HTML thay vì JSON (${res.status}) — kiểm tra API / endpoint.`,
      { status: res.status },
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new VeoApiError(
      `${label}: không parse được JSON (${res.status}): ${trimmed.slice(0, 120)}`,
      { status: res.status },
    );
  }
}

/** POST /jobs/createTask — T2V hoặc I2V (khi có ảnh Master Cast / ảnh nguồn) */
export async function startGrokVideoGeneration(params: GenerateGrokVideoParams): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new VeoApiError('Thiếu Kie.ai API Key.', { fatal: true });

  const prompt = params.prompt.trim();
  if (!prompt) throw new VeoApiError('Prompt video không được để trống.');

  const hasImage = Boolean(params.image?.base64?.trim() && params.image?.mimeType?.trim());

  // Có ảnh → upload temp → image-to-video; spicy không hỗ trợ external image
  let imageUrl: string | undefined;
  if (hasImage && params.image) {
    imageUrl = await uploadKieImageBase64({
      apiKey,
      base64: params.image.base64,
      mimeType: params.image.mimeType,
    });
  }

  const useI2V = Boolean(imageUrl);
  const model = useI2V ? MODEL_I2V : MODEL_T2V;
  const mode = useI2V && resolveKieMode(params.mode) === 'spicy'
    ? 'normal'
    : resolveKieMode(params.mode);

  // Master Cast / ref: @image1 = ngoại hình nhân vật, KHÔNG copy pose/composition của sheet.
  // Prompt cảnh phải mô tả hành động + bối cảnh MỚI.
  const finalPrompt = useI2V && !prompt.includes('@image')
    ? [
        '@image1',
        'Use @image1 ONLY as a character appearance reference sheet (faces, outfits, body design).',
        'Do NOT recreate the same pose, framing, or group composition from the reference.',
        'Generate a completely NEW scene matching this description:',
        prompt,
      ].join(' ')
    : prompt;

  const input: Record<string, unknown> = {
    prompt: finalPrompt,
    aspect_ratio: resolveKieAspectRatio(params.aspectRatio),
    mode,
    duration: resolveKieDurationSeconds(params.durationSeconds),
    resolution: resolveKieResolution(params.resolution),
    nsfw_checker: true,
  };
  if (imageUrl) {
    input.image_urls = [imageUrl];
  }

  console.log('[kie/start] Master Cast / ref image:', {
    model,
    hasImage,
    imageUploaded: Boolean(imageUrl),
    imageUrl: imageUrl ? `${imageUrl.slice(0, 80)}…` : null,
    promptPreview: finalPrompt.slice(0, 160),
    mode,
  });

  return withVeoRetry('Kie start', async () => {
    const res = await fetch(`${BASE_URL}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input }),
    });

    const data = await readKieJson<CreateTaskResponse>(res, 'Kie createTask');

    if (!res.ok || data.code !== 200 || !data.data?.taskId) {
      throw parseKieError(data.msg, res.status, `Kie.ai API lỗi (${res.status})`);
    }

    return data.data.taskId;
  });
}

/** GET /jobs/recordInfo?taskId= — poll trạng thái task */
export async function pollGrokVideoTask(apiKey: string, taskId: string): Promise<PollGrokTaskResult> {
  const key = apiKey.trim();
  if (!key) throw new VeoApiError('Thiếu Kie.ai API Key.', { fatal: true });

  return withVeoRetry('Kie poll', async () => {
    const res = await fetch(`${BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    const data = await readKieJson<RecordInfoResponse>(res, 'Kie poll');

    if (!res.ok || data.code !== 200 || !data.data) {
      throw parseKieError(data.msg, res.status, `Kie.ai API lỗi (${res.status})`);
    }

    const { state, resultJson, failMsg } = data.data;

    if (state === 'fail') {
      throw parseKieError(failMsg, res.status, 'Grok Imagine tạo video thất bại.');
    }

    if (state !== 'success') {
      return { done: false };
    }

    let videoUrl: string | undefined;
    try {
      const parsed = JSON.parse(resultJson ?? '{}') as { resultUrls?: string[] };
      videoUrl = parsed.resultUrls?.[0];
    } catch {
      videoUrl = undefined;
    }

    if (!videoUrl) {
      throw new VeoApiError('Grok Imagine không trả về video URL.');
    }

    return { done: true, videoUrl };
  });
}

/**
 * Tải video MP4 từ URL kết quả kie.ai — qua backend thay vì fetch thẳng từ trình
 * duyệt, vì CDN của kie.ai không đảm bảo gửi header CORS cho phép fetch cross-origin
 * (khác Veo — video.uri của Google cũng cần proxy vì cần header X-goog-api-key).
 */
export async function downloadGrokVideo(videoUrl: string): Promise<Buffer> {
  const url = videoUrl.trim();
  if (!url) throw new VeoApiError('Thiếu videoUrl.', { fatal: true });

  return withVeoRetry('Kie download', async () => {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      throw new VeoApiError(`Không tải được video Grok Imagine (${res.status}).`, { status: res.status });
    }
    return Buffer.from(await res.arrayBuffer());
  });
}
