import { VeoApiError, isFatalVeoMessage, withVeoRetry } from '../../lib/veo-errors';
import {
  resolveKieAspectRatio,
  resolveKieDurationSeconds,
  resolveKieMode,
  resolveKieResolution,
} from '../../lib/kie-config';

const BASE_URL = 'https://api.kie.ai/api/v1';
const MODEL = 'grok-imagine/text-to-video';

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

/** POST /jobs/createTask — tạo task Grok Imagine text-to-video, trả taskId */
export async function startGrokVideoGeneration(params: GenerateGrokVideoParams): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new VeoApiError('Thiếu Kie.ai API Key.', { fatal: true });

  const prompt = params.prompt.trim();
  if (!prompt) throw new VeoApiError('Prompt video không được để trống.');

  return withVeoRetry('Kie start', async () => {
    const res = await fetch(`${BASE_URL}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: {
          prompt,
          aspect_ratio: resolveKieAspectRatio(params.aspectRatio),
          mode: resolveKieMode(params.mode),
          duration: resolveKieDurationSeconds(params.durationSeconds),
          resolution: resolveKieResolution(params.resolution),
          nsfw_checker: true,
        },
      }),
    });

    const data = (await res.json()) as CreateTaskResponse;

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

    const data = (await res.json()) as RecordInfoResponse;

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
