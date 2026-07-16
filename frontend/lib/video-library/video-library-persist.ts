// ─── Lưu metadata Kho video (kịch bản, operation Veo…) — không lưu blob video ─

import type { VideoLibraryItem } from '@/lib/video-library/video-library';
import type { VideoScene } from '@/lib/scene/scenes';
import { readJSON, writeJSON } from '@/lib/local-storage';

const STORAGE_KEY = 'web-video-video-library-v1';
/** Key cũ (thời "Bulk List") — chỉ đọc fallback 1 lần, không xoá để tránh mất dữ liệu */
const LEGACY_STORAGE_KEY = 'web-video-bulk-projects-v1';

export interface VideoLibraryPersistSnapshot {
  items: VideoLibraryItem[];
  activeItemId: string;
}

interface LegacyBulkPersistSnapshot {
  projects: VideoLibraryItem[];
  activeProjectId: string;
}

function stripBlobUrls(scenes: VideoScene[]): VideoScene[] {
  return scenes.map((s) => ({
    ...s,
    videoUrl: s.videoUrl?.startsWith('blob:') ? undefined : s.videoUrl,
    audioUrl: s.audioUrl?.startsWith('blob:') ? undefined : s.audioUrl,
  }));
}

/** Dọn trạng thái "treo" (generating mồ côi, không operation, không video) khi nạp item — dùng cho cả localStorage lẫn Supabase */
export function normalizeItemOnLoad(item: VideoLibraryItem): VideoLibraryItem {
  const scenes = item.scenes.map((s) => {
    let status = s.status;
    // 'error' là kết luận cuối — dù còn sót operationId (dữ liệu cũ trước khi sửa
    // lỗi này, hoặc do bug khác), TUYỆT ĐỐI không tự lật lại thành 'generating' để
    // rồi tự resume/gọi API ngầm. User phải chủ động bấm "Tạo lại" mới thử lại.
    if (status === 'error') {
      // giữ nguyên
    } else if ((s.veoOperationName?.trim() || s.kieTaskId?.trim()) && !s.videoUrl) {
      status = 'generating';
    } else if (status === 'generating') {
      status = s.videoUrl ? 'success' : 'error';
    }
    return { ...s, status };
  });

  let status = item.status;
  if (status === 'analyzing') status = 'draft';
  if (status === 'generating' && !scenes.some((s) => s.veoOperationName || s.kieTaskId)) {
    const done = scenes.filter((s) => s.status === 'success').length;
    status = done === scenes.length && scenes.length > 0 ? 'completed' : 'error';
  }

  return {
    ...item,
    status,
    scenes,
    scenesDone: scenes.filter((s) => s.status === 'success' || s.status === 'error').length,
    scenesTotal: scenes.length,
    timelineFocusSceneId: null,
    // Regenerate không bao giờ sống sót qua reload — luôn reset sạch khi load lại
    isRegenerating: false,
    pendingRegeneration: null,
    regenerateError: undefined,
  };
}

function loadLegacyBulkPersist(): VideoLibraryPersistSnapshot | null {
  const parsed = readJSON<LegacyBulkPersistSnapshot | null>(LEGACY_STORAGE_KEY, null);
  if (!parsed?.projects?.length) return null;
  return { items: parsed.projects, activeItemId: parsed.activeProjectId };
}

export function loadVideoLibraryPersist(): VideoLibraryPersistSnapshot | null {
  if (typeof window === 'undefined') return null;

  const parsed = readJSON<VideoLibraryPersistSnapshot | null>(STORAGE_KEY, null);
  if (parsed) {
    if (!parsed.items?.length) return null;
    const items = parsed.items.map(normalizeItemOnLoad);
    const activeItemId = items.some((p) => p.id === parsed.activeItemId)
      ? parsed.activeItemId
      : items[0].id;
    return { items, activeItemId };
  }

  const legacy = loadLegacyBulkPersist();
  if (!legacy) return null;

  const items = legacy.items.map(normalizeItemOnLoad);
  const activeItemId = items.some((p) => p.id === legacy.activeItemId)
    ? legacy.activeItemId
    : items[0].id;

  // Ghi ngay vào key mới — lần load sau không cần fallback nữa
  saveVideoLibraryPersist(items, activeItemId);

  return { items, activeItemId };
}

export function saveVideoLibraryPersist(items: VideoLibraryItem[], activeItemId: string): void {
  const snapshot: VideoLibraryPersistSnapshot = {
    items: items.map((p) => ({
      ...p,
      scenes: stripBlobUrls(p.scenes),
    })),
    activeItemId,
  };
  writeJSON(STORAGE_KEY, snapshot);
}
