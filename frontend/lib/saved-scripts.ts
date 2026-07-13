// ─── Kiểu dữ liệu kịch bản đã lưu ───────────────────────────────────────────

export interface SavedScriptMeta {
  language: string;
  sceneCount: string;
  videoType: string;
  voice: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality?: string;
}

export interface SavedScript {
  id: string;
  title: string;
  content: string;
  meta: SavedScriptMeta;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sinh id kịch bản duy nhất: `script-{timestamp}-{random}` */
export function generateScriptId(): string {
  return `script-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Rút gọn nội dung để làm tiêu đề mặc định */
export function deriveTitle(content: string): string {
  const trimmed = content.trim().replace(/\n+/g, ' ');
  return trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed || 'Kịch bản không tên';
}

export const VIDEO_TYPE_LABELS: Record<string, string> = {
  storytelling: 'Kể chuyện',
  tutorial: 'Hướng dẫn',
  ads: 'Quảng cáo',
  review: 'Review',
};

export const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

export const SCENE_COUNT_LABELS: Record<string, string> = {
  '3': '3 cảnh',
  '5': '5 cảnh',
  '8': '8 cảnh',
  '10': '10 cảnh',
  '15': '15 cảnh',
};

export const SCENE_COUNT_OPTIONS = Object.entries(SCENE_COUNT_LABELS) as [string, string][];
export const VIDEO_TYPE_OPTIONS = Object.entries(VIDEO_TYPE_LABELS) as [string, string][];
export const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_LABELS) as [string, string][];

/** Nhãn hiển thị số cảnh từ giá trị form */
export function formatSceneCount(value: string): string {
  return SCENE_COUNT_LABELS[value] ?? `${value} cảnh`;
}

export const VOICE_LABELS: Record<string, string> = {
  'male-natural': 'Nam – tự nhiên',
  'female-natural': 'Nữ – tự nhiên',
  'male-pro': 'Nam – chuyên nghiệp',
  'female-young': 'Nữ – trẻ trung',
};

export const VOICE_OPTIONS = Object.entries(VOICE_LABELS) as [string, string][];

export const ASPECT_RATIO_LABELS: Record<string, string> = {
  '16:9': 'Ngang (16:9)',
  '9:16': 'Dọc (9:16)',
  '1:1': 'Vuông (1:1)',
};

export const ASPECT_RATIO_OPTIONS = Object.entries(ASPECT_RATIO_LABELS) as [string, string][];

export const VIDEO_QUALITY_LABELS: Record<string, string> = {
  '720p': '720p – Tiêu chuẩn',
  '1080p': '1080p – HD cao',
  '720p-fast': '720p – Nhanh (Veo Fast)',
};

export const VIDEO_QUALITY_OPTIONS = Object.entries(VIDEO_QUALITY_LABELS) as [string, string][];

/** Nhãn hiển thị tỷ lệ khung hình từ giá trị form */
export function formatAspectRatio(value: string): string {
  return ASPECT_RATIO_LABELS[value] ?? value;
}

/** Format thời gian ngắn gọn: "hôm nay 14:30", "hôm qua", "3 ngày trước"... */
export function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffH < 24) return `${diffH} giờ trước`;
  if (diffD === 1) return 'Hôm qua';
  if (diffD < 7) return `${diffD} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export {
  SCENE_DURATION_LABELS,
  formatSceneDuration,
  getSceneDurationOptions,
  normalizeSceneDurationSetting,
  snapToVeoDuration,
  VEO_SCENE_DURATIONS,
} from '@/lib/veo-duration';
