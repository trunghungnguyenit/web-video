// ─── Lưu metadata Kho video (kịch bản, operation Veo…) — không lưu blob video ─

import type { VideoLibraryItem } from '@/lib/video-library';
import { createInitialVideoItem } from '@/lib/video-library';
import type { VideoScene } from '@/lib/scenes';

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

function normalizeItemOnLoad(item: VideoLibraryItem): VideoLibraryItem {
  const scenes = item.scenes.map((s) => {
    let status = s.status;
    if (s.veoOperationName?.trim() && !s.videoUrl) {
      status = 'generating';
    } else if (status === 'generating') {
      status = s.videoUrl ? 'success' : 'error';
    }
    return { ...s, status };
  });

  let status = item.status;
  if (status === 'analyzing') status = 'draft';
  if (status === 'generating' && !scenes.some((s) => s.veoOperationName)) {
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
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyBulkPersistSnapshot;
    if (!parsed.projects?.length) return null;
    return { items: parsed.projects, activeItemId: parsed.activeProjectId };
  } catch {
    return null;
  }
}

export function loadVideoLibraryPersist(): VideoLibraryPersistSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VideoLibraryPersistSnapshot;
      if (!parsed.items?.length) return null;
      const items = parsed.items.map(normalizeItemOnLoad);
      const activeItemId = items.some((p) => p.id === parsed.activeItemId)
        ? parsed.activeItemId
        : items[0].id;
      return { items, activeItemId };
    }
  } catch {
    // fallthrough — thử đọc key cũ
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
  if (typeof window === 'undefined') return;
  const snapshot: VideoLibraryPersistSnapshot = {
    items: items.map((p) => ({
      ...p,
      scenes: stripBlobUrls(p.scenes),
    })),
    activeItemId,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function defaultVideoLibraryPersist(): VideoLibraryPersistSnapshot {
  const initial = createInitialVideoItem();
  return { items: [initial], activeItemId: initial.id };
}
