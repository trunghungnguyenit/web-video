/**
 * Nhà cung cấp video "Veo3.1 Gemini" — gọi THẲNG Google Gemini API (generativelanguage),
 * không qua kie.ai. Cùng bộ 3 bước như veo.service.ts (start → poll → download) để dùng
 * chung toàn bộ luồng frontend/route sẵn có, chỉ khác endpoint + hình dạng payload:
 *
 *   start    POST {BASE}/models/{model}:predictLongRunning  → operation.name
 *   poll     GET  {BASE}/{operation.name}                   → { done, response... }
 *   download GET  {video.uri}  (BẮT BUỘC kèm x-goog-api-key — khác CDN kie.ai vốn public)
 *
 * Tham khảo: RequestAPI-KieAi/Veo3-Google/veo-3-1-gemini.md
 * Key: "Gemini Key Veo 3.1" — key RIÊNG user nhập ở mục API Keys, TÁCH BIỆT với Gemini
 * API Key (chỉ dùng tạo kịch bản/phân cảnh/lời thoại) để quota/billing không lẫn nhau.
 */

import type { VeoInput } from '../../types/pipeline';
import { VeoApiError, isTransientHttpStatus, withVeoRetry } from '../../lib/veo-errors';
import {
  resolveVeoAspectRatio,
  resolveVeoGeminiModel,
  supportsGeminiReferenceMode,
} from '../../lib/veo-config';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/** Ảnh gửi Gemini Veo — luôn dạng inlineData base64 thuần (không prefix data URL) */
interface GeminiInlineImage {
  inlineData: { mimeType: string; data: string };
}

interface PredictLongRunningResponse {
  name?: string;
  error?: { code?: number; message?: string; status?: string };
}

interface OperationResponse {
  name?: string;
  done?: boolean;
  error?: { code?: number; message?: string; status?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
      /** Lý do bị lọc bởi bộ lọc an toàn (RAI) — có khi generatedSamples rỗng */
      raiMediaFilteredReasons?: string[];
      raiMediaFilteredCount?: number;
    };
    /** Hình dạng thay thế ở một số bản API — giữ cả 2 để không vỡ khi Google đổi schema */
    generatedVideos?: Array<{ video?: { uri?: string } }>;
  };
}

export interface GenerateGeminiVideoParams {
  apiKey: string;
  prompt: string;
  veoInput: Pick<VeoInput, 'aspectRatio' | 'videoQuality' | 'sceneDuration' | 'veoModel' | 'characters' | 'referenceImage'>;
  durationSeconds: number;
  /** Khung đầu — ảnh nguồn cảnh (tab "Từ hình ảnh") hoặc khung hình cuối cảnh trước (Scene Continuity) */
  image?: { base64: string; mimeType: string };
}

export interface PollGeminiOperationResult {
  done: boolean;
  videoUri?: string;
}

function toInlineImage(base64: string, mimeType: string): GeminiInlineImage {
  return { inlineData: { mimeType: mimeType || 'image/png', data: base64 } };
}

/**
 * Gom tối đa 3 ảnh tham chiếu (referenceImages) — giống collectReferenceImages() của
 * veo.service.ts: referenceImage (Master Cast) ưu tiên slot đầu, sau đó ảnh riêng từng
 * nhân vật. Loại trùng theo 200 ký tự đầu base64 để không gửi lặp cùng 1 ảnh.
 */
function collectReferenceImages(
  veoInput: GenerateGeminiVideoParams['veoInput'],
): Array<{ base64: string; mimeType: string }> {
  const images: Array<{ base64: string; mimeType: string }> = [];
  const seen = new Set<string>();

  const add = (base64?: string, mimeType?: string) => {
    if (!base64 || !mimeType || images.length >= 3) return;
    const key = base64.slice(0, 200);
    if (seen.has(key)) return;
    seen.add(key);
    images.push({ base64, mimeType });
  };

  add(veoInput.referenceImage?.base64, veoInput.referenceImage?.mimeType);
  for (const c of veoInput.characters ?? []) {
    add(c.imageBase64, c.imageMimeType);
  }

  return images;
}

/**
 * Độ phân giải Google trực tiếp — khác kie.ai (1080p là lệnh gọi phụ get-1080p-video),
 * ở đây resolution nằm ngay trong request generate. 1080p BẮT BUỘC durationSeconds = 8
 * (xem bảng tham số trong veo-3-1-gemini.md). '720p-fast' của app vẫn là 720p.
 */
function resolveGeminiResolution(quality?: string): '720p' | '1080p' {
  return quality === '1080p' ? '1080p' : '720p';
}

function resolveGeminiDuration(seconds: number): 4 | 6 | 8 {
  const s = Math.round(seconds);
  if (s <= 5) return 4;
  if (s <= 7) return 6;
  return 8;
}

/** Lỗi từ Google — chuẩn hoá về VeoApiError để dùng chung cơ chế retry/fatal với kie.ai */
function geminiVeoError(
  message: string | undefined,
  status: number,
  fallback: string,
): VeoApiError {
  const text = message?.trim() || fallback;
  return new VeoApiError(text, {
    status,
    // 4xx (trừ các mã tạm thời) = sai key/quota/tham số → fatal, không retry vô ích
    fatal: !isTransientHttpStatus(status),
  });
}

/** POST /models/{model}:predictLongRunning — trả về operation.name để poll */
export async function startVideoGeneration(params: GenerateGeminiVideoParams): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new VeoApiError('Thiếu "Gemini Key Veo 3.1".', { fatal: true });

  const prompt = params.prompt.trim();
  if (!prompt) throw new VeoApiError('Prompt video không được để trống.');

  let model = resolveVeoGeminiModel(params.veoInput.veoModel);
  const aspectRatio = resolveVeoAspectRatio(params.veoInput.aspectRatio);
  const resolution = resolveGeminiResolution(params.veoInput.videoQuality);

  // Ảnh nguồn cảnh / khung continuity = khung đầu (image-to-video), ưu tiên cao nhất —
  // giống veo.service.ts: có khung đầu thì KHÔNG dùng referenceImages nữa (2 chế độ này
  // loại trừ nhau, Google cũng không cho gửi kèm cả 2).
  const startImage = params.image?.base64 && params.image?.mimeType ? params.image : undefined;
  const referenceImages = !startImage ? collectReferenceImages(params.veoInput) : [];

  // Lite KHÔNG hỗ trợ referenceImages — tự hạ về fast để vẫn giữ được nhân vật nhất quán
  // (song song với cách veo.service.ts hạ veo3 → veo3_fast cho REFERENCE_2_VIDEO).
  if (referenceImages.length > 0 && !supportsGeminiReferenceMode(model)) {
    console.log(`[veo-gemini/start] referenceImages cần model hỗ trợ — hạ từ ${model} xuống veo-3.1-fast-generate-preview.`);
    model = 'veo-3.1-fast-generate-preview';
  }

  let durationSeconds = resolveGeminiDuration(params.durationSeconds);
  // Ràng buộc cứng của Veo 3.1: dùng referenceImages hoặc 1080p thì bắt buộc 8 giây.
  if (referenceImages.length > 0 || resolution === '1080p') {
    durationSeconds = 8;
  }

  const instance: Record<string, unknown> = { prompt };
  if (startImage) {
    instance.image = toInlineImage(startImage.base64, startImage.mimeType);
  } else if (referenceImages.length > 0) {
    instance.referenceImages = referenceImages.map((img) => ({
      image: toInlineImage(img.base64, img.mimeType),
      referenceType: 'asset',
    }));
  }

  console.log('[veo-gemini/start] mode:', {
    model,
    resolution,
    aspectRatio,
    durationSeconds,
    hasStartImage: Boolean(startImage),
    referenceImageCount: referenceImages.length,
    characterNames: params.veoInput.characters?.map((c) => c.name) ?? [],
  });

  return withVeoRetry('Veo Gemini start', async () => {
    const res = await fetch(`${BASE_URL}/models/${model}:predictLongRunning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        instances: [instance],
        parameters: {
          aspectRatio,
          resolution,
          durationSeconds,
          // Có ảnh người thật (khung đầu / reference) thì Veo chỉ chấp nhận allow_adult;
          // text-to-video thuần mới được allow_all.
          personGeneration: startImage || referenceImages.length > 0 ? 'allow_adult' : 'allow_all',
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as PredictLongRunningResponse;

    if (!res.ok || !data.name) {
      console.error('[veo-gemini/start] lỗi:', { status: res.status, model, error: data.error });
      throw geminiVeoError(data.error?.message, res.status, `Veo Gemini API lỗi (${res.status}).`);
    }

    return data.name;
  });
}

/** GET /{operationName} — chưa xong thì trả { done: false } để frontend poll tiếp */
export async function pollVideoOperation(
  apiKey: string,
  operationName: string,
): Promise<PollGeminiOperationResult> {
  const key = apiKey.trim();
  if (!key) throw new VeoApiError('Thiếu "Gemini Key Veo 3.1".', { fatal: true });

  const name = operationName.trim();
  if (!name) throw new VeoApiError('Thiếu operationName.');

  return withVeoRetry('Veo Gemini poll', async () => {
    const res = await fetch(`${BASE_URL}/${name}`, {
      headers: { 'x-goog-api-key': key },
    });

    const data = (await res.json().catch(() => ({}))) as OperationResponse;

    if (!res.ok) {
      throw geminiVeoError(data.error?.message, res.status, `Veo Gemini API lỗi (${res.status}).`);
    }

    // Operation xong nhưng mang lỗi (safety filter, nội dung bị chặn...) — báo ngay, không poll mãi
    if (data.error) {
      throw new VeoApiError(data.error.message?.trim() || 'Veo Gemini tạo video thất bại.');
    }

    if (!data.done) return { done: false };

    const generated = data.response?.generateVideoResponse;
    const videoUri =
      generated?.generatedSamples?.[0]?.video?.uri
      ?? data.response?.generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      const filtered = generated?.raiMediaFilteredReasons?.filter(Boolean).join(' · ');
      throw new VeoApiError(
        filtered
          ? `Veo Gemini chặn video vì bộ lọc an toàn: ${filtered}`
          : 'Veo Gemini không trả về video URL.',
      );
    }

    return { done: true, videoUri };
  });
}

/**
 * Tải MP4 kết quả — KHÁC kie.ai: file nằm trên Google, bắt buộc gửi kèm x-goog-api-key,
 * và chỉ được lưu 2 ngày kể từ lúc tạo (xem Limitations trong veo-3-1-gemini.md).
 */
export async function downloadVideo(apiKey: string, uri: string): Promise<Buffer> {
  const key = apiKey.trim();
  if (!key) throw new VeoApiError('Thiếu "Gemini Key Veo 3.1".', { fatal: true });

  return withVeoRetry('Veo Gemini download', async () => {
    const res = await fetch(uri, {
      headers: { 'x-goog-api-key': key },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new VeoApiError(`Không tải được video Veo Gemini (${res.status}).`, {
        status: res.status,
        fatal: !isTransientHttpStatus(res.status),
      });
    }

    return Buffer.from(await res.arrayBuffer());
  });
}
