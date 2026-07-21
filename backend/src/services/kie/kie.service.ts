import { VeoApiError, withVeoRetry } from '../../lib/veo-errors';
import { readKieJson, parseKieError } from '../../lib/kie-http';
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

/** POST /jobs/createTask — T2V hoặc I2V (khi có ảnh Master Cast / ảnh nguồn) */
export async function startGrokVideoGeneration(params: GenerateGrokVideoParams): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new VeoApiError('Thiếu API Key.', { fatal: true });

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
    // Mặc định của kie.ai là false — bộ lọc phụ này (khác nhau với kiểm duyệt gốc của nền
    // tảng) từng bị bật cứng true ở đây, gây từ chối nhầm nội dung bạo lực nhẹ không thật
    // sự nhạy cảm (vd cốt truyện nhà tù, bắt nạt) với lỗi "flagged as sensitive".
    nsfw_checker: false,
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

    const data = await readKieJson<CreateTaskResponse>(res, 'Grok createTask');

    if (!res.ok || data.code !== 200 || !data.data?.taskId) {
      throw parseKieError(data.msg, res.status, `Lỗi API tạo video (${res.status})`);
    }

    return data.data.taskId;
  });
}

/** GET /jobs/recordInfo?taskId= — poll trạng thái task */
export async function pollGrokVideoTask(apiKey: string, taskId: string): Promise<PollGrokTaskResult> {
  const key = apiKey.trim();
  if (!key) throw new VeoApiError('Thiếu API Key.', { fatal: true });

  return withVeoRetry('Grok poll', async () => {
    const res = await fetch(`${BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    const data = await readKieJson<RecordInfoResponse>(res, 'Grok poll');

    if (!res.ok || data.code !== 200 || !data.data) {
      throw parseKieError(data.msg, res.status, `Lỗi API tạo video (${res.status})`);
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
 * Tải video MP4 từ URL kết quả — qua backend thay vì fetch thẳng từ trình duyệt, vì
 * CDN không đảm bảo gửi header CORS cho phép fetch cross-origin.
 */
export async function downloadGrokVideo(videoUrl: string): Promise<Buffer> {
  const url = videoUrl.trim();
  if (!url) throw new VeoApiError('Thiếu videoUrl.', { fatal: true });

  return withVeoRetry('Grok download', async () => {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      throw new VeoApiError(`Không tải được video Grok Imagine (${res.status}).`, { status: res.status });
    }
    return Buffer.from(await res.arrayBuffer());
  });
}
