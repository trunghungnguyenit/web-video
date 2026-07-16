/** Cấu hình model Grok Imagine (kie.ai) — duration/aspect ratio/mode hợp lệ */

const KIE_ASPECT_RATIOS = new Set(['16:9', '9:16']);
const KIE_MODES = new Set(['fun', 'normal', 'spicy']);

/** Grok Imagine nhận 6–30 giây bất kỳ (khác Veo 3 chỉ 4/6/8) */
export function resolveKieDurationSeconds(sceneSeconds: number): number {
  const s = Math.round(sceneSeconds);
  if (!Number.isFinite(s)) return 6;
  return Math.min(30, Math.max(6, s));
}

export function resolveKieAspectRatio(ratio: string): '16:9' | '9:16' {
  return KIE_ASPECT_RATIOS.has(ratio) ? (ratio as '16:9' | '9:16') : '16:9';
}

export function resolveKieMode(mode?: string): 'fun' | 'normal' | 'spicy' {
  return mode && KIE_MODES.has(mode) ? (mode as 'fun' | 'normal' | 'spicy') : 'normal';
}

/**
 * Grok Imagine chỉ hỗ trợ 480p/720p (không có 1080p) — mặc định 480p khi không
 * truyền gì. Giá trị khác 480p (kể cả '1080p'/'720p-fast' còn sót từ Veo) map lên
 * '720p' — mức cao nhất hỗ trợ — thay vì hạ xuống 480p, vì gần đúng ý người dùng hơn.
 */
export function resolveKieResolution(quality?: string): '480p' | '720p' {
  if (!quality || quality === '480p') return '480p';
  return '720p';
}
