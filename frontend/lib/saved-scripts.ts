// ─── Kiểu dữ liệu kịch bản đã lưu ───────────────────────────────────────────

export interface SavedScriptMeta {
  language: string;
  duration: string;
  videoType: string;
  voice: string;
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

export const DURATION_LABELS: Record<string, string> = {
  '1-3': '1–3 phút',
  '5-10': '5–10 phút',
  '10-20': '10–20 phút',
  '20-30': '20–30 phút',
};

export const VOICE_LABELS: Record<string, string> = {
  'male-natural': 'Nam – tự nhiên',
  'female-natural': 'Nữ – tự nhiên',
  'male-pro': 'Nam – chuyên nghiệp',
  'female-young': 'Nữ – trẻ trung',
};

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
