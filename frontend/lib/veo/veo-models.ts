// ─── Gợi ý model Veo theo chất lượng video (danh sách lấy từ API) ───────────

import { API_KEY_IDS, getApiKey } from '@/lib/api-keys/api-keys-store';

export interface VeoModelOption {
  id: string;
  displayName: string;
  description?: string;
}

/** Gợi ý model Veo phù hợp chất lượng (720p-fast → veo3_fast) */
export function suggestVeoModelForQuality(
  quality: string,
  models: VeoModelOption[],
): string {
  if (models.length === 0) return '';

  if (quality === '720p-fast') {
    const fast = models.find((m) => m.id === 'veo3_fast');
    if (fast) return fast.id;
  }

  const standard = models.find((m) => m.id === 'veo3');
  return standard?.id ?? models[0].id;
}

/** Veo giờ dùng chung key kie.ai với Grok Imagine — không còn key Google riêng */
export function getVeoApiKey(): string {
  return getApiKey(API_KEY_IDS.kie).trim();
}

/**
 * Scene Continuity (nối cảnh bằng khung hình cuối cảnh trước → /veo/generate
 * FIRST_AND_LAST_FRAMES_2_VIDEO) áp dụng cho mọi model Veo 3.1 — không giới hạn.
 */
export function supportsVideoExtension(_modelId: string | undefined): boolean {
  return true;
}
