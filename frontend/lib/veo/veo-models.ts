// ─── Gợi ý model Veo theo chất lượng video (danh sách lấy từ API) ───────────

import { API_KEY_IDS, getApiKey } from '@/lib/api-keys/api-keys-store';

export interface VeoModelOption {
  id: string;
  displayName: string;
  description?: string;
}

/**
 * Model của nhà cung cấp "Veo3.1 Gemini" (gọi thẳng Google) — id chính thức của Google,
 * KHÁC hoàn toàn id kie.ai (veo3/veo3_fast/veo3_lite). Danh sách cố định nên khai ở
 * frontend, không cần gọi /api/veo/models (endpoint đó chỉ phục vụ model kie.ai).
 * Đồng bộ thủ công với KIE_TO_GEMINI_MODEL trong backend/src/lib/veo-config.ts.
 */
export const VEO_GEMINI_MODEL_OPTIONS: VeoModelOption[] = [
  {
    id: 'veo-3.1-generate-preview',
    displayName: 'Veo 3.1 (Google)',
    description: 'Chất lượng cao nhất, hỗ trợ ảnh tham chiếu giữ nhân vật',
  },
  {
    id: 'veo-3.1-fast-generate-preview',
    displayName: 'Veo 3.1 Fast (Google)',
    description: 'Cân bằng tốc độ/chi phí, hỗ trợ ảnh tham chiếu giữ nhân vật',
  },
  {
    id: 'veo-3.1-lite-generate-preview',
    displayName: 'Veo 3.1 Lite (Google)',
    description: 'Rẻ nhất, KHÔNG hỗ trợ ảnh tham chiếu giữ nhân vật',
  },
];

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

/** Nhà cung cấp 'veo' chạy qua kie.ai — dùng Video API Key của kie.ai */
export function getVeoApiKey(): string {
  return getApiKey(API_KEY_IDS.kie).trim();
}

/**
 * Key dùng để TẠO VIDEO theo nhà cung cấp — 'veo-gemini' dùng key RIÊNG "Gemini Key Veo
 * 3.1" (API_KEY_IDS.veoGemini), KHÔNG dùng chung với Gemini API Key vốn chỉ để tạo kịch
 * bản/phân cảnh/lời thoại. Nhà cung cấp 'veo' (qua kie.ai) dùng Video API Key của kie.ai.
 */
export function getVideoApiKeyForProvider(provider: string | undefined): string {
  return provider === 'veo-gemini'
    ? getApiKey(API_KEY_IDS.veoGemini).trim()
    : getApiKey(API_KEY_IDS.kie).trim();
}

/**
 * Scene Continuity (nối cảnh bằng khung hình cuối cảnh trước → /veo/generate
 * FIRST_AND_LAST_FRAMES_2_VIDEO) áp dụng cho mọi model Veo 3.1 — không giới hạn.
 */
export function supportsVideoExtension(_modelId: string | undefined): boolean {
  return true;
}
