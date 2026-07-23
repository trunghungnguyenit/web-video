import type { VeoInput } from '../../types/pipeline';
import {
  resolveVeoAspectRatio,
  resolveVeoDurationSeconds,
  resolveVeoModel,
  supportsReferenceMode,
} from '../../lib/veo-config';
import { VeoApiError, isTransientHttpStatus, withVeoRetry } from '../../lib/veo-errors';
import { readKieJson, parseKieError } from '../../lib/kie-http';
import { uploadKieImageBase64 } from '../kie/kie-files.service';

const BASE_URL = 'https://api.kie.ai/api/v1';

type VeoGenerationType = 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO';

interface GenerateResponse {
  code?: number;
  msg?: string;
  data?: { taskId?: string };
}

interface RecordInfoResponse {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    /** 0=Generating, 1=Success, 2=Failed, 3=Generation Failed */
    successFlag?: number;
    errorCode?: number;
    errorMessage?: string;
    response?: {
      resultUrls?: string[];
      originUrls?: string[];
      /** Chỉ có ở task loại extend — nghi là file gộp (gốc + đoạn mới), cần verify thực tế */
      fullResultUrls?: string[];
      resolution?: string;
    };
  };
}

interface Get1080pResponse {
  code?: number;
  msg?: string;
  data?: { resultUrl?: string };
}

export interface GenerateSceneVideoParams {
  apiKey: string;
  prompt: string;
  veoInput: Pick<VeoInput, 'aspectRatio' | 'videoQuality' | 'sceneDuration' | 'veoModel' | 'characters' | 'referenceImage'>;
  durationSeconds: number;
  /** Ảnh nguồn riêng cho đúng cảnh này (tab "Từ hình ảnh") — ưu tiên hơn ảnh nhân vật/master cast */
  image?: { base64: string; mimeType: string };
}

export interface PollOperationResult {
  done: boolean;
  videoUri?: string;
  error?: string;
}

/** GET /veo/get-1080p-video — trả undefined nếu chưa sẵn sàng (poll lại sau), throw nếu lỗi thật */
async function fetchVeo1080pVideo(apiKey: string, taskId: string): Promise<string | undefined> {
  const res = await fetch(`${BASE_URL}/veo/get-1080p-video?taskId=${encodeURIComponent(taskId)}&index=0`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const data = await readKieJson<Get1080pResponse>(res, 'Veo 1080p');

  // 422 = chưa sẵn sàng (record chưa success / chưa có data) theo docs — không phải lỗi thật
  if (data.code === 422) return undefined;

  if (!res.ok || data.code !== 200 || !data.data?.resultUrl) {
    throw parseKieError(data.msg, res.status, `Veo lấy video 1080p lỗi (${res.status})`);
  }

  return data.data.resultUrl;
}

/** GET /veo/record-info — poll trạng thái, xử lý luôn bước nâng cấp 1080p nếu quality yêu cầu */
export async function pollVideoOperation(
  apiKey: string,
  operationName: string,
  quality?: string,
): Promise<PollOperationResult> {
  const key = apiKey.trim();
  if (!key) throw new VeoApiError('Thiếu Veo API Key.', { fatal: true });

  const taskId = operationName.trim();

  return withVeoRetry('Veo poll', async () => {
    const res = await fetch(`${BASE_URL}/veo/record-info?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    const data = await readKieJson<RecordInfoResponse>(res, 'Veo poll');

    if (!res.ok || data.code !== 200 || !data.data) {
      throw parseKieError(data.msg, res.status, `Veo API lỗi (${res.status})`);
    }

    const info = data.data;

    if (info.successFlag === 2 || info.successFlag === 3) {
      throw parseKieError(info.errorMessage, res.status, 'Veo tạo video thất bại.');
    }

    if (info.successFlag !== 1) {
      return { done: false };
    }

    const resultUrls = info.response?.resultUrls ?? [];
    const baseUri = resultUrls[0] ?? info.response?.fullResultUrls?.[0];
    if (!baseUri) throw new VeoApiError('Veo không trả về video URL.');

    if (quality !== '1080p') {
      return { done: true, videoUri: baseUri };
    }

    const hdUrl = await fetchVeo1080pVideo(key, taskId);
    if (!hdUrl) return { done: false };
    return { done: true, videoUri: hdUrl };
  });
}

/** Ảnh tham chiếu — hoặc đã có URL bền vững (kie.ai, ưu tiên dùng thẳng), hoặc còn base64 (phải upload) */
type ReferenceImageSource = { url: string } | { base64: string; mimeType: string };

/**
 * Gom tối đa 3 ảnh tham chiếu cho REFERENCE_2_VIDEO — referenceImage (Master Cast, ảnh
 * chung đại diện cả dàn nhân vật) luôn ưu tiên slot đầu, sau đó tới ảnh riêng của từng
 * nhân vật. Mỗi ảnh ưu tiên `imageUrl`/`referenceImage.url` (đã upload kie.ai từ trước,
 * lưu Supabase) — dùng THẲNG, không upload lại; chỉ upload từ base64 khi chưa có URL bền
 * vững. Loại trùng theo URL hoặc 200 ký tự đầu base64 để không gửi lặp cùng 1 ảnh 2 lần.
 */
function collectReferenceImages(
  veoInput: GenerateSceneVideoParams['veoInput'],
): ReferenceImageSource[] {
  const images: ReferenceImageSource[] = [];
  const seen = new Set<string>();

  const addUrl = (url?: string) => {
    if (!url || images.length >= 3 || seen.has(url)) return;
    seen.add(url);
    images.push({ url });
  };
  const addBase64 = (base64?: string, mimeType?: string) => {
    if (!base64 || !mimeType || images.length >= 3) return;
    // So khớp theo 1 đoạn đầu base64 là đủ để phát hiện trùng ảnh — không cần hash toàn bộ.
    const key = base64.slice(0, 200);
    if (seen.has(key)) return;
    seen.add(key);
    images.push({ base64, mimeType });
  };
  const addImage = (url?: string, base64?: string, mimeType?: string) => {
    if (url) addUrl(url);
    else addBase64(base64, mimeType);
  };

  addImage(veoInput.referenceImage?.url, veoInput.referenceImage?.base64, veoInput.referenceImage?.mimeType);
  for (const c of veoInput.characters ?? []) {
    addImage(c.imageUrl, c.imageBase64, c.imageMimeType);
  }

  return images;
}

/** POST /veo/generate — đúng 1 lần cho mỗi cảnh. Scene Continuity: `image` = khung hình cuối cảnh trước → FIRST_AND_LAST_FRAMES_2_VIDEO */
export async function startVideoGeneration(params: GenerateSceneVideoParams): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new VeoApiError('Thiếu Veo API Key.', { fatal: true });

  const prompt = params.prompt.trim();
  if (!prompt) throw new VeoApiError('Prompt video không được để trống.');

  let model = resolveVeoModel(params.veoInput.veoModel);
  const aspectRatio = resolveVeoAspectRatio(params.veoInput.aspectRatio);

  // Ảnh nguồn cảnh (tab "Từ hình ảnh") = first frame / animate-from-image
  const sceneStartImage = params.image?.base64 && params.image?.mimeType ? params.image : undefined;

  // Master Cast / avatar nhân vật = REFERENCE_2_VIDEO (giữ ngoại hình, KHÔNG dùng làm khung đầu).
  // kie.ai cho tối đa 3 ảnh tham chiếu — gom referenceImage (Master Cast) + ảnh riêng của
  // từng nhân vật (nếu có), loại trùng theo nội dung base64 để không gửi lặp cùng 1 ảnh.
  const referenceImages = !sceneStartImage ? collectReferenceImages(params.veoInput) : [];

  let durationSeconds = resolveVeoDurationSeconds(params.durationSeconds);
  let generationType: VeoGenerationType = 'TEXT_2_VIDEO';
  let imageUrls: string[] | undefined;

  if (sceneStartImage) {
    generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
    const url = await uploadKieImageBase64({
      apiKey,
      base64: sceneStartImage.base64,
      mimeType: sceneStartImage.mimeType,
      uploadPath: 'veo-scenes',
    });
    imageUrls = [url];
  } else if (referenceImages.length > 0) {
    generationType = 'REFERENCE_2_VIDEO';
    // REFERENCE_2_VIDEO chỉ hỗ trợ model fast/lite — tự hạ xuống fast nếu đang chọn quality
    if (!supportsReferenceMode(model)) {
      console.log(`[veo/start] Master Cast reference cần model fast/lite — hạ từ ${model} xuống veo3_fast.`);
      model = 'veo3_fast';
    }
    durationSeconds = 8;
    // Ảnh đã có URL bền vững (kie.ai, lưu Supabase) → dùng THẲNG, không upload lại; chỉ
    // upload từ base64 khi chưa có URL (vd ảnh vừa chọn, chưa kịp upload xong).
    imageUrls = await Promise.all(
      referenceImages.map((img, i) =>
        'url' in img
          ? Promise.resolve(img.url)
          : uploadKieImageBase64({
              apiKey,
              base64: img.base64,
              mimeType: img.mimeType,
              uploadPath: 'veo-scenes',
              fileName: `veo-ref-${i}-${Date.now()}.${img.mimeType.includes('png') ? 'png' : 'jpg'}`,
            }),
      ),
    );
  }

  console.log('[veo/start] mode:', {
    model,
    generationType,
    durationSeconds,
    referenceImageCount: referenceImages.length,
    characterNames: params.veoInput.characters?.map((c) => c.name) ?? [],
  });

  return withVeoRetry('Veo start', async () => {
    const startRes = await fetch(`${BASE_URL}/veo/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model,
        generationType,
        imageUrls,
        aspect_ratio: aspectRatio,
        resolution: '720p',
        duration: durationSeconds,
      }),
    });

    const startData = await readKieJson<GenerateResponse>(startRes, 'Veo start');

    if (!startRes.ok || startData.code !== 200 || !startData.data?.taskId) {
      throw parseKieError(startData.msg, startRes.status, `Veo API lỗi (${startRes.status})`);
    }

    return startData.data.taskId;
  });
}

/** Tải video MP4 kết quả — kie.ai CDN không cần auth header (khác Google cần X-goog-api-key) */
export async function downloadVideo(_apiKey: string, uri: string): Promise<Buffer> {
  return withVeoRetry('Veo download', async () => {
    const res = await fetch(uri, { redirect: 'follow' });

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
