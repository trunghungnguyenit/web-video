import type { VeoInput } from '../../types/pipeline';
import {
  resolveVeoAspectRatio,
  resolveVeoDurationSeconds,
  resolveVeoModel,
  resolveVeoResolution,
} from '../../lib/veo-config';
import { isFatalVeoMessage, isTransientHttpStatus, VeoApiError, withVeoRetry } from '../../lib/veo-errors';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface LongRunningResponse {
  name?: string;
  done?: boolean;
  error?: { message?: string; code?: number };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
    };
    generatedVideos?: Array<{ video?: { uri?: string } }>;
  };
}

export interface GenerateSceneVideoParams {
  apiKey: string;
  prompt: string;
  veoInput: Pick<VeoInput, 'aspectRatio' | 'videoQuality' | 'sceneDuration' | 'veoModel' | 'characters'>;
  durationSeconds: number;
  /** Ảnh nguồn riêng cho đúng cảnh này (tab "Từ hình ảnh") — ưu tiên hơn ảnh nhân vật/master cast */
  image?: { base64: string; mimeType: string };
}

export interface PollOperationResult {
  done: boolean;
  videoUri?: string;
  error?: string;
}

function extractVideoUri(data: LongRunningResponse): string | undefined {
  return (
    data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    ?? data.response?.generatedVideos?.[0]?.video?.uri
  );
}

function parseGoogleError(data: LongRunningResponse, status: number): VeoApiError {
  const message = data.error?.message ?? `Veo API lỗi (${status})`;
  return new VeoApiError(message, { status, fatal: isFatalVeoMessage(message) || status === 401 || status === 403 });
}

function normalizeOpPath(operationName: string): string {
  return operationName.startsWith('operations/')
    ? operationName
    : operationName.replace(/^\/+/, '');
}

/** GET operations — chỉ poll status, không gọi predictLongRunning */
export async function pollVideoOperation(
  apiKey: string,
  operationName: string,
): Promise<PollOperationResult> {
  const key = apiKey.trim();
  if (!key) throw new VeoApiError('Thiếu Veo API Key.', { fatal: true });

  const opPath = normalizeOpPath(operationName);

  return withVeoRetry('Veo poll', async () => {
    const res = await fetch(`${BASE_URL}/${opPath}`, {
      headers: { 'X-goog-api-key': key },
    });

    const data = (await res.json()) as LongRunningResponse;

    if (!res.ok) {
      throw parseGoogleError(data, res.status);
    }

    if (data.error?.message) {
      throw new VeoApiError(data.error.message, { fatal: isFatalVeoMessage(data.error.message) });
    }

    if (data.done) {
      const uri = extractVideoUri(data);
      if (!uri) {
        throw new VeoApiError('Veo không trả về video URI.');
      }
      return { done: true, videoUri: uri };
    }

    return { done: false };
  });
}

/** POST predictLongRunning — đúng 1 lần generateVideos cho mỗi cảnh */
export async function startVideoGeneration(params: GenerateSceneVideoParams): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new VeoApiError('Thiếu Veo API Key.', { fatal: true });

  const prompt = params.prompt.trim();
  if (!prompt) throw new VeoApiError('Prompt video không được để trống.');

  const quality = params.veoInput.videoQuality ?? '720p';
  const model = resolveVeoModel(params.veoInput.veoModel);
  const resolution = resolveVeoResolution(quality);
  const aspectRatio = resolveVeoAspectRatio(params.veoInput.aspectRatio);
  const durationSeconds = resolveVeoDurationSeconds(params.durationSeconds, quality);

  // Ưu tiên ảnh nguồn riêng của cảnh (tab "Từ hình ảnh"). Nếu không có, fallback
  // sang ảnh nhân vật/master cast đầu tiên tìm thấy — best-effort, Veo dùng ảnh
  // này làm gợi ý, không đảm bảo giống 100% qua các cảnh có góc máy khác nhau.
  const characterImage = params.veoInput.characters?.find((c) => c.imageBase64 && c.imageMimeType);

  const instance: { prompt: string; image?: { bytesBase64Encoded: string; mimeType: string } } = { prompt };
  if (params.image) {
    instance.image = {
      bytesBase64Encoded: params.image.base64,
      mimeType: params.image.mimeType,
    };
  } else if (characterImage?.imageBase64 && characterImage.imageMimeType) {
    instance.image = {
      bytesBase64Encoded: characterImage.imageBase64,
      mimeType: characterImage.imageMimeType,
    };
  }

  return withVeoRetry('Veo start', async () => {
    const startRes = await fetch(`${BASE_URL}/models/${model}:predictLongRunning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        instances: [instance],
        parameters: {
          aspectRatio,
          resolution,
          durationSeconds,
        },
      }),
    });

    const startData = (await startRes.json()) as LongRunningResponse & { name?: string };

    if (!startRes.ok) {
      throw parseGoogleError(startData, startRes.status);
    }

    const operationName = startData.name;
    if (!operationName) {
      throw new VeoApiError('Veo không trả về operation name.');
    }

    return operationName;
  });
}

export async function downloadVideo(apiKey: string, uri: string): Promise<Buffer> {
  const key = apiKey.trim();
  if (!key) throw new VeoApiError('Thiếu Veo API Key.', { fatal: true });

  return withVeoRetry('Veo download', async () => {
    const res = await fetch(uri, {
      headers: { 'X-goog-api-key': key },
      redirect: 'follow',
    });

    if (!res.ok) {
      const message = `Không tải được video Veo (${res.status}).`;
      throw new VeoApiError(message, {
        status: res.status,
        fatal: !isTransientHttpStatus(res.status),
      });
    }

    return Buffer.from(await res.arrayBuffer());
  });
}
