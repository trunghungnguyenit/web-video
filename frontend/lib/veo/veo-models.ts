// ─── Gợi ý model Veo theo chất lượng video (danh sách lấy từ API) ───────────

import { API_KEY_IDS, getApiKey } from '@/lib/api-keys/api-keys-store';

export interface VeoModelOption {
  id: string;
  displayName: string;
  description?: string;
}

/** Gợi ý model Veo phù hợp chất lượng (720p-fast → fast model) */
export function suggestVeoModelForQuality(
  quality: string,
  models: VeoModelOption[],
): string {
  if (models.length === 0) return '';

  if (quality === '720p-fast') {
    const fast = models.find((m) => m.id.includes('fast'));
    if (fast) return fast.id;
  }

  const standard = models.find(
    (m) => m.id.includes('generate') && !m.id.includes('fast'),
  );
  return standard?.id ?? models[0].id;
}

/** Chỉ đọc Veo API key riêng — không dùng chung Gemini key */
export function getVeoApiKey(): string {
  return getApiKey(API_KEY_IDS.veo).trim();
}

/**
 * Video Extension (nối tiếp cảnh trước bằng video thật — Scene Continuity) chỉ Veo 3.1 /
 * Veo 3.1 Fast hỗ trợ, KHÔNG áp dụng cho Veo 3.1 Lite hay Veo 3.0.
 * @see https://ai.google.dev/gemini-api/docs/veo
 */
export function supportsVideoExtension(modelId: string | undefined): boolean {
  const id = modelId?.trim().toLowerCase() ?? '';
  return id.includes('veo-3.1') && !id.includes('lite');
}
