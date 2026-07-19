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
  veoInput: Pick<VeoInput, 'aspectRatio' | 'videoQuality' | 'sceneDuration' | 'veoModel' | 'characters' | 'referenceImage'>;
  durationSeconds: number;
  /** Ảnh nguồn riêng cho đúng cảnh này (tab "Từ hình ảnh") — ưu tiên hơn ảnh nhân vật/master cast */
  image?: { base64: string; mimeType: string };
  /**
   * Scene Continuity (Video Extension, Veo 3.1 only) — video THẬT của cảnh liền trước, dùng
   * làm bối cảnh nối tiếp (instance.video). Google bắt buộc durationSeconds=8, resolution=720p
   * khi dùng field này, và không kết hợp cùng lúc với instance.image (sceneStartImage).
   */
  previousVideo?: { base64: string; mimeType: string };
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
  let resolution = resolveVeoResolution(quality);
  const aspectRatio = resolveVeoAspectRatio(params.veoInput.aspectRatio);

  // Scene Continuity (Video Extension, Veo 3.1) — ưu tiên CAO NHẤT: dùng video thật của
  // cảnh liền trước để nối tiếp, Google không cho kết hợp cùng instance.image/referenceImages.
  const previousVideo = params.previousVideo?.base64 && params.previousVideo?.mimeType
    ? params.previousVideo
    : undefined;

  // Ảnh nguồn cảnh (tab "Từ hình ảnh") = first frame / animate-from-image
  const sceneStartImage = !previousVideo && params.image?.base64 && params.image?.mimeType
    ? { bytesBase64Encoded: params.image.base64, mimeType: params.image.mimeType }
    : undefined;

  // Master Cast / avatar nhân vật = referenceImages (asset) — giữ ngoại hình, KHÔNG dùng làm khung đầu
  // (nếu gửi vào instance.image thì mọi cảnh sẽ giống y hệt ảnh sheet).
  const masterRef =
    !previousVideo && !sceneStartImage
    && params.veoInput.referenceImage?.base64
    && params.veoInput.referenceImage?.mimeType
      ? {
          base64: params.veoInput.referenceImage.base64,
          mimeType: params.veoInput.referenceImage.mimeType,
        }
      : !previousVideo && !sceneStartImage
        ? (() => {
            const c = params.veoInput.characters?.find((x) => x.imageBase64 && x.imageMimeType);
            return c?.imageBase64 && c.imageMimeType
              ? { base64: c.imageBase64, mimeType: c.imageMimeType }
              : undefined;
          })()
        : undefined;

  // referenceImages (Veo 3.1) bắt buộc duration = 8. Video Extension (Veo 3.1) bắt buộc
  // duration = 8 VÀ resolution = 720p — Google không cho tuỳ chỉnh khi dùng instance.video.
  let durationSeconds = resolveVeoDurationSeconds(params.durationSeconds, quality);
  if ((masterRef || previousVideo) && durationSeconds !== 8) {
    durationSeconds = 8;
  }
  if (previousVideo && resolution !== '720p') {
    resolution = '720p';
  }

  const instance: Record<string, unknown> = { prompt };

  if (previousVideo) {
    instance.video = {
      bytesBase64Encoded: previousVideo.base64,
      mimeType: previousVideo.mimeType,
    };
  } else if (sceneStartImage) {
    instance.image = sceneStartImage;
  } else if (masterRef) {
    instance.referenceImages = [
      {
        image: {
          bytesBase64Encoded: masterRef.base64,
          mimeType: masterRef.mimeType,
        },
        referenceType: 'asset',
      },
    ];
  }

  console.log('[veo/start] image mode:', {
    model,
    mode: previousVideo ? 'scene-continuity' : sceneStartImage ? 'start-frame' : masterRef ? 'reference-asset' : 'text-only',
    durationSeconds,
    resolution,
    characterNames: params.veoInput.characters?.map((c) => c.name) ?? [],
    imageBytesApprox: sceneStartImage
      ? Math.round((sceneStartImage.bytesBase64Encoded.length * 3) / 4)
      : masterRef
        ? Math.round((masterRef.base64.length * 3) / 4)
        : previousVideo
          ? Math.round((previousVideo.base64.length * 3) / 4)
          : 0,
  });

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
          // Veo 3 / 3.1: bật audio native (SFX + ambient + thoại trong video nếu prompt mô tả)
          generateAudio: true,
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
