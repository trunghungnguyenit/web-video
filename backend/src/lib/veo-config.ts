/** Cấu hình model Veo 3.1 qua kie.ai — 3 model cố định (kie.ai không có endpoint discovery) */

export const VEO_QUALITY_LABELS: Record<string, string> = {
  '720p': '720p – Tiêu chuẩn',
  '1080p': '1080p – HD cao',
  '720p-fast': '720p – Nhanh (Veo Fast)',
};

const VEO_GENERATE_MODELS = new Set(['veo3', 'veo3_fast', 'veo3_lite']);

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
