/** Cấu hình model Veo 3.1 qua kie.ai — 3 model cố định (kie.ai không có endpoint discovery) */

export const VEO_QUALITY_LABELS: Record<string, string> = {
  '720p': '720p – Tiêu chuẩn',
  '1080p': '1080p – HD cao',
  '720p-fast': '720p – Nhanh (Veo Fast)',
};

const VEO_GENERATE_MODELS = new Set(['veo3', 'veo3_fast', 'veo3_lite']);

// ─── Nhà cung cấp "Veo3.1 Gemini" (gọi thẳng Google) ─────────────────────────
// Model id của Google khác hoàn toàn kie.ai (veo3/veo3_fast/veo3_lite). Người dùng đổi
// qua lại giữa 2 nhà cung cấp thì settings.veoModel còn giữ id của bên kia — nên map
// tương đương thay vì báo lỗi, để không phải chọn lại model mỗi lần đổi nhà cung cấp.
const VEO_GEMINI_MODELS = new Set([
  'veo-3.1-generate-preview',
  'veo-3.1-fast-generate-preview',
  'veo-3.1-lite-generate-preview',
]);

const KIE_TO_GEMINI_MODEL: Record<string, string> = {
  veo3: 'veo-3.1-generate-preview',
  veo3_fast: 'veo-3.1-fast-generate-preview',
  veo3_lite: 'veo-3.1-lite-generate-preview',
};

export function resolveVeoGeminiModel(veoModel?: string): string {
  const picked = veoModel?.trim();
  if (!picked) return 'veo-3.1-fast-generate-preview';
  if (VEO_GEMINI_MODELS.has(picked)) return picked;
  return KIE_TO_GEMINI_MODEL[picked] ?? 'veo-3.1-fast-generate-preview';
}

/** referenceImages (giữ nhân vật nhất quán) không khả dụng trên Veo 3.1 Lite */
export function supportsGeminiReferenceMode(model: string): boolean {
  return !model.includes('lite');
}

export function resolveVeoModel(veoModel?: string): string {
  const picked = veoModel?.trim();
  if (!picked) {
    throw new Error('Chưa chọn model Veo — chọn model trong cài đặt.');
  }
  return VEO_GENERATE_MODELS.has(picked) ? picked : 'veo3_fast';
}

/** REFERENCE_2_VIDEO (Master Cast) chỉ hỗ trợ model fast/lite, không hỗ trợ quality */
export function supportsReferenceMode(model: string): boolean {
  return model !== 'veo3';
}

export function resolveVeoResolution(quality: string): '720p' | '1080p' {
  return quality === '1080p' ? '1080p' : '720p';
}

export function resolveVeoAspectRatio(ratio: string): '16:9' | '9:16' {
  return ratio === '9:16' ? '9:16' : '16:9';
}

/**
 * Veo 3.1 (qua kie.ai) chỉ hỗ trợ 4 / 6 / 8 giây cho /generate. Khác với Google trực
 * tiếp, 1080p của kie.ai là lệnh gọi phụ (get-1080p-video) tách biệt hoàn toàn khỏi
 * duration của lần generate gốc — không còn ràng buộc "1080p bắt buộc 8s".
 */
export function resolveVeoDurationSeconds(
  sceneSeconds: number,
): 4 | 6 | 8 {
  const s = Math.round(sceneSeconds);
  if (s <= 5) return 4;
  if (s <= 7) return 6;
  return 8;
}
