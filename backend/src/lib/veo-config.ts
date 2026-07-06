/** Cấu hình chất lượng Veo 3 — resolution + model */

export const VEO_QUALITY_LABELS: Record<string, string> = {
  '720p': '720p – Tiêu chuẩn',
  '1080p': '1080p – HD cao',
  '720p-fast': '720p – Nhanh (Veo Fast)',
};

export function resolveVeoModel(quality: string, veoModel?: string): string {
  const picked = veoModel?.trim();
  if (picked) return picked;
  if (quality === '720p-fast') return 'veo-3.0-fast-generate-001';
  return 'veo-3.0-generate-001';
}

export function resolveVeoResolution(quality: string): '720p' | '1080p' {
  return quality === '1080p' ? '1080p' : '720p';
}

export function resolveVeoAspectRatio(ratio: string): '16:9' | '9:16' {
  return ratio === '9:16' ? '9:16' : '16:9';
}

/** Veo 3 chỉ hỗ trợ 4 / 6 / 8 giây; 1080p bắt buộc 8 giây */
export function resolveVeoDurationSeconds(
  sceneSeconds: number,
  quality: string,
): 4 | 6 | 8 {
  if (quality === '1080p') return 8;
  const s = Math.round(sceneSeconds);
  if (s <= 5) return 4;
  if (s <= 7) return 6;
  return 8;
}
