// ─── Chuẩn hoá item Kho video khi nạp từ Supabase — dọn trạng thái "treo" ────
// Không còn lưu localStorage — Supabase là nguồn dữ liệu duy nhất (xem video-library-context.tsx).

import type { VideoLibraryItem } from '@/lib/video-library/video-library';

/** Dọn trạng thái "treo" (generating mồ côi, không operation, không video) khi nạp item từ Supabase */
export function normalizeItemOnLoad(item: VideoLibraryItem): VideoLibraryItem {
  const scenes = item.scenes.map((s) => {
    let status = s.status;
    // 'error' là kết luận cuối — dù còn sót operationId (dữ liệu cũ trước khi sửa
    // lỗi này, hoặc do bug khác), TUYỆT ĐỐI không tự lật lại thành 'generating' để
    // rồi tự resume/gọi API ngầm. User phải chủ động bấm "Tạo lại" mới thử lại.
    if (status === 'error') {
      // giữ nguyên
    } else if (s.veoOperationName?.trim() && !s.videoUrl) {
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
