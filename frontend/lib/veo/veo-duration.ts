// ─── Thời lượng cảnh Veo 3: snap 4/6/8s, 1080p bắt buộc 8s ─────────────────

/** Thời lượng cảnh theo giới hạn Veo 3 API */

export const VEO_SCENE_DURATIONS = [4, 6, 8] as const;
export type VeoSceneDuration = (typeof VEO_SCENE_DURATIONS)[number];

export const SCENE_DURATION_LABELS: Record<string, string> = {
  auto: 'Tự động (4–8 giây · Veo 3)',
  '4': '4 giây/cảnh',
  '6': '6 giây/cảnh',
  '8': '8 giây/cảnh',
};

/**
 * Trước đây (Google trực tiếp) 1080p bắt buộc 8s/cảnh ngay trong predictLongRunning.
 * Qua kie.ai, 1080p là lệnh gọi phụ (get-1080p-video) tách biệt hoàn toàn khỏi duration
 * của lần generate gốc — luôn trả false, giữ lại hàm/tham số videoQuality ở các hàm bên
 * dưới để không phải sửa lại toàn bộ call site đang truyền videoQuality vào.
 */
export function is1080pQuality(_videoQuality?: string): boolean {
  return false;
}

/** Dropdown options theo chất lượng video */
export function getSceneDurationOptions(videoQuality?: string): [string, string][] {
  if (is1080pQuality(videoQuality)) {
    return [['8', '8 giây/cảnh (bắt buộc với 1080p)']];
  }
  return Object.entries(SCENE_DURATION_LABELS) as [string, string][];
}

/** Snap số giây → 4 | 6 | 8 (1080p luôn 8) */
export function snapToVeoDuration(seconds: number, videoQuality?: string): VeoSceneDuration {
  if (is1080pQuality(videoQuality)) return 8;
  const s = Math.round(seconds);
  if (s <= 5) return 4;
  if (s <= 7) return 6;
  return 8;
}

/** Chuẩn hóa giá trị form (migrate 3/5/10 → 4/6/8) */
export function normalizeSceneDurationSetting(
  value: string | undefined,
  videoQuality?: string,
): string {
  if (is1080pQuality(videoQuality)) return '8';
  if (!value || value === 'auto') return 'auto';
  const n = parseInt(value, 10);
  if (n === 4 || n === 6 || n === 8) return String(n);
  return String(snapToVeoDuration(Number.isFinite(n) ? n : 6, videoQuality));
}

/** Ước lượng thời lượng cảnh từ số từ voiceover (auto mode) */
function estimateDurationFromVoice(voice: string): number {
  const words = voice.split(/\s+/).filter(Boolean).length;
  return Math.min(8, Math.max(4, Math.round(words / 2.5) || 6));
}

/** Resolve thời lượng cảnh thực tế (giây) cho pipeline */
export function resolveSceneDurationSeconds(
  setting: string | undefined,
  voice: string,
  videoQuality?: string,
): VeoSceneDuration {
  if (is1080pQuality(videoQuality)) return 8;
  if (!setting || setting === 'auto') {
    return snapToVeoDuration(estimateDurationFromVoice(voice), videoQuality);
  }
  const n = parseInt(setting, 10);
  if (n === 4 || n === 6 || n === 8) return n;
  return snapToVeoDuration(Number.isFinite(n) ? n : 6, videoQuality);
}

/** Nhãn hiển thị thời lượng cảnh từ giá trị form */
export function formatSceneDuration(value: string): string {
  return SCENE_DURATION_LABELS[value] ?? `${value}s/cảnh`;
}
