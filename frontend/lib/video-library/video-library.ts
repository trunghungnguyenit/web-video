// ─── Kho video: kiểu, tạo/lọc video, tiến độ % ───────────────────────────────

import type { PresetInput, PresetTimelineDemo } from '@/lib/preset/preset-scripts';
import type { SceneGenerationResult, VideoScene } from '@/lib/scene/scenes';
import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';
import type { SavedCharacter } from '@/lib/character/saved-characters';
import { createEmptyCharacter } from '@/lib/character/saved-characters';
import type { VideoSettings } from '@/contexts/project-settings-context';
import { DEFAULT_VIDEO_SETTINGS } from '@/contexts/project-settings-context';

export type VideoLibraryStatus = 'draft' | 'analyzing' | 'generating' | 'completed' | 'error';

export type VideoLibraryStatusFilter = 'all' | 'running' | 'completed' | 'draft';
export type VideoLibrarySortOrder = 'newest' | 'oldest';

export interface CreateVideoItemOptions {
  title: string;
  settings: VideoSettings;
  /** Nguồn nội dung đã chọn ở modal "Tạo video mới" — Mục 2 dùng để tự hiện đúng giao diện, bỏ qua màn chọn lại.
   * Tách riêng khỏi `inputType` (tab lúc phân tích gần nhất) để không kích hoạt MasterCastPanel/layout trước khi có cảnh. */
  initialInputType?: 'text' | 'link' | 'image' | 'file';
}

/** 1 ảnh đã upload cho tab "Từ hình ảnh" — path Storage (bucket `source-uploads`), KHÔNG phải base64 */
export interface SourceImageItem {
  id: string;
  /** Path bucket `source-uploads`, dạng `{userId}/{projectId}/image-{id}.{ext}` */
  path: string;
  fileName: string;
  mimeType: string;
  prompt: string;
  label?: string;
  voiceHint?: string;
  /** Signed URL — tạo lại mỗi lần load (resolveSourceUploadSignedUrls), KHÔNG lưu DB */
  previewUrl?: string;
}

/** Kết quả generate cảnh đang "tạo lại" — giữ tách biệt tới khi thành công mới ghi đè field sống */
export interface PendingRegeneration {
  status: 'analyzing' | 'generating';
  errorMessage?: string;
  scenes: VideoScene[];
  scenesDone: number;
  scenesTotal: number;
  ttsInput: TtsInput | null;
  veoInput: VeoInput | null;
  inputContent: string;
  timelineDemo: PresetTimelineDemo | null;
}

export interface VideoLibraryItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: VideoLibraryStatus;
  /** Lý do lỗi gần nhất (status === 'error') — hiển thị cho user, clear khi chạy lại thành công */
  errorMessage?: string;
  veoModelLabel: string;
  aspectRatio: string;
  scenesDone: number;
  scenesTotal: number;
  scenes: VideoScene[];
  ttsInput: TtsInput | null;
  veoInput: VeoInput | null;
  settings: VideoSettings;
  /** Prompt / nội dung mục 2 — riêng từng video */
  inputContent: string;
  /** Tab nguồn mục 2 lúc phân tích gần nhất — quyết định giao diện hiển thị cảnh (link dùng layout khác) */
  inputType?: 'text' | 'link' | 'image' | 'file';
  /**
   * Nguồn nội dung đã chọn lúc "Tạo video mới" (hoặc lần chọn đầu tiên ở màn inline
   * cho item mặc định) — LUÔN đáng tin cậy để Mục 2 tự chọn đúng tab, và một khi đã có
   * giá trị thì bị KHOÁ vĩnh viễn (ẩn nút "Đổi cách nhập"), không ảnh hưởng layout cảnh.
   */
  initialInputType?: 'text' | 'link' | 'image' | 'file';
  /** Tab "Từ link video" — giữ lại qua reload/điều hướng */
  linkUrl?: string;
  linkDescription?: string;
  /** Tab "Từ hình ảnh" — Prompt tổng áp dụng cho ảnh chưa có prompt riêng (hoặc toàn bộ video ở chế độ 'single') */
  imageMasterBrief?: string;
  /**
   * Tab "Từ hình ảnh" — chế độ: 'multi' (mặc định, nhiều ảnh — mỗi ảnh 1 cảnh riêng) |
   * 'single' (1 ảnh duy nhất + Prompt tổng — Gemini viết kịch bản nhiều cảnh, ảnh dùng
   * làm referenceImage giữ nhân vật xuyên suốt, giống cơ chế Master Cast của tab link).
   */
  imageMode?: 'multi' | 'single';
  /** Tab "Từ hình ảnh" — từng ảnh đã upload (path Storage, không phải base64) */
  sourceImages?: SourceImageItem[];
  /** Tab "Từ file" — tài liệu đã upload (path Storage bucket `source-uploads`) */
  sourceDocumentPath?: string;
  sourceDocumentName?: string;
  sourceDocumentMimeType?: string;
  /** Nhân vật mục 1 — riêng từng video */
  characters: SavedCharacter[];
  /**
   * Prompt mô tả toàn bộ dàn nhân vật (chỉ có khi inputType === 'link') — NGUỒN DUY NHẤT
   * chèn vào mọi cảnh lúc gửi Veo/Kie (veoInput.masterCharacterText). Gemini sinh lần đầu
   * từ nội dung video, được ghi đè bằng mô tả Gemini Vision khi user upload ảnh tham chiếu,
   * và user có thể sửa tay sau đó — sửa gì thì đúng cái đó được gửi đi tạo video.
   */
  masterCastPrompt?: string;
  /** Ảnh tham chiếu dàn nhân vật — user tự upload (data URL base64) */
  masterCastImageDataUrl?: string;
  /** Kết quả phân tích tab link đang chờ xác nhận — chưa gọi TTS/Veo, chỉ hiện preview để xem/upload ảnh */
  pendingLinkReview?: SceneGenerationResult | null;
  appliedInput: PresetInput | null;
  timelineDemo: PresetTimelineDemo | null;
  pendingTimelineDemo: PresetTimelineDemo | null;
  timelineFocusSceneId: string | null;
  /** Đang chạy "Sửa & tạo lại" ở nền — không ảnh hưởng scenes/status sống */
  isRegenerating: boolean;
  /** Kết quả tạo lại đang chạy — chỉ swap vào field sống khi generate xong thành công */
  pendingRegeneration: PendingRegeneration | null;
  /** Lỗi của lượt "tạo lại" gần nhất — tách biệt khỏi errorMessage (lỗi của generation sống) */
  regenerateError?: string;
}

/** Sinh id video duy nhất: `video-{timestamp}-{random}` */
export function generateVideoItemId(): string {
  return `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Tiêu đề mặc định video đầu tiên — cố định để tránh hydration mismatch SSR/client */
export const DEFAULT_VIDEO_ITEM_TITLE = 'Video mới';

/** Id cố định cho video khởi tạo lần đầu (SSR + hydrate phải giống nhau) */
export const INITIAL_VIDEO_ITEM_ID = 'video-item-initial';

const INITIAL_VIDEO_ITEM_TIMESTAMP = '2020-01-01T00:00:00.000Z';

/** Tiêu đề khi tạo video mới: `Video_HH:MM d-m-y` (chỉ dùng client-side) */
export function formatVideoItemTitle(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const d = date.getDate();
  const mo = date.getMonth() + 1;
  const y = date.getFullYear();
  return `Video_${h}:${m} ${d}-${mo}-${y}`;
}

/** Video mặc định khi mở app — title/id/timestamp cố định, an toàn SSR */
export function createInitialVideoItem(): VideoLibraryItem {
  const item = createVideoItem({ title: DEFAULT_VIDEO_ITEM_TITLE, settings: DEFAULT_VIDEO_SETTINGS });
  return {
    ...item,
    id: INITIAL_VIDEO_ITEM_ID,
    createdAt: INITIAL_VIDEO_ITEM_TIMESTAMP,
    updatedAt: INITIAL_VIDEO_ITEM_TIMESTAMP,
  };
}

/** Format ngày trên card kho video: `dd/mm/yy - HH:mm` */
export function formatVideoItemCardDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Nhãn hiển thị model/nhà cung cấp video trên card (từ veoInput hoặc settings) */
export function resolveVeoModelLabel(veoInput: VeoInput | null, settings: VideoSettings): string {
  const provider = veoInput?.provider ?? settings.videoProvider ?? 'veo';
  if (provider === 'kie') {
    const mode = veoInput?.kieMode ?? settings.kieMode ?? 'normal';
    return `Grok Imagine · ${mode}`;
  }

  const model = veoInput?.veoModel?.trim() || settings.veoModel?.trim();
  if (model) {
    const short = model.split('/').pop() ?? model;
    return short.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const q = veoInput?.videoQuality ?? settings.videoQuality ?? '720p';
  return `Veo 3 · ${q}`;
}

/** Đếm cảnh đã xử lý xong (success hoặc error) */
export function countScenesDone(scenes: VideoScene[]): number {
  return scenes.filter((s) => s.status === 'success' || s.status === 'error').length;
}

/** Tạo video mới với settings + nhân vật rỗng, status draft */
export function createVideoItem(
  options: CreateVideoItemOptions | VideoSettings = DEFAULT_VIDEO_SETTINGS,
  legacyTitle?: string,
): VideoLibraryItem {
  const title = typeof options === 'object' && 'title' in options
    ? options.title.trim()
    : legacyTitle ?? DEFAULT_VIDEO_ITEM_TITLE;
  const settings = typeof options === 'object' && 'settings' in options
    ? { ...options.settings }
    : { ...(options as VideoSettings) };

  const now = new Date().toISOString();
  return {
    id: generateVideoItemId(),
    title: title || DEFAULT_VIDEO_ITEM_TITLE,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    veoModelLabel: resolveVeoModelLabel(null, settings),
    aspectRatio: settings.aspectRatio,
    scenesDone: 0,
    scenesTotal: 0,
    scenes: [],
    ttsInput: null,
    veoInput: null,
    settings,
    inputContent: '',
    initialInputType: typeof options === 'object' && 'initialInputType' in options ? options.initialInputType : undefined,
    characters: [createEmptyCharacter()],
    appliedInput: null,
    timelineDemo: null,
    pendingTimelineDemo: null,
    timelineFocusSceneId: null,
    isRegenerating: false,
    pendingRegeneration: null,
    regenerateError: undefined,
  };
}

/** Lọc video theo từ khóa, trạng thái và sắp xếp mới/cũ */
export function filterVideoItems(
  items: VideoLibraryItem[],
  query: string,
  statusFilter: VideoLibraryStatusFilter,
  sort: VideoLibrarySortOrder,
): VideoLibraryItem[] {
  let list = [...items];

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => p.title.toLowerCase().includes(q));
  }

  if (statusFilter === 'running') {
    list = list.filter((p) => p.status === 'generating' || p.status === 'analyzing');
  } else if (statusFilter === 'completed') {
    list = list.filter((p) => p.status === 'completed');
  } else if (statusFilter === 'draft') {
    list = list.filter((p) => p.status === 'draft' || p.status === 'error');
  }

  list.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sort === 'newest' ? tb - ta : ta - tb;
  });

  return list;
}

/** Tiến độ % trên progress bar — dựa scenesDone/scenesTotal hoặc status */
export function videoItemProgressPercent(item: VideoLibraryItem): number {
  if (item.scenesTotal <= 0) {
    if (item.status === 'completed') return 100;
    if (item.status === 'generating') return 5;
    return 0;
  }
  return Math.round((item.scenesDone / item.scenesTotal) * 100);
}
