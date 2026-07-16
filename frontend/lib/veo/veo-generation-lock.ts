// ─── Khóa chống gọi Veo trùng cho cùng một cảnh / operation ─────────────────

// Promise<unknown> vì Veo và Kie trả về shape khác nhau cho cùng 1 sceneId
// (generateSceneVideoAsset trả {videoUrl, veoOperationName?}, generateSceneVideoAssetKie
// trả {videoUrl, kieTaskId?}) — ép kiểu Promise<string> trước đây là sai, chỉ tình cờ chạy được.
const sceneLocks = new Map<string, Promise<unknown>>();
const operationLocks = new Map<string, Promise<string>>();

/** Lỗi ném ra khi user bấm "Stop" giữa chừng — không phải lỗi thật, không nên hiện toUserMessage */
export class SceneStoppedError extends Error {
  constructor() {
    super('Đã dừng theo yêu cầu.');
    this.name = 'SceneStoppedError';
  }
}

const stoppedScenes = new Set<string>();

/** Đánh dấu 1 cảnh cần dừng — poll loop đang chạy cho cảnh này tự thoát ở lượt kiểm tra kế tiếp */
export function markSceneStopped(sceneId: string): void {
  stoppedScenes.add(sceneId);
}

export function isSceneStopped(sceneId: string): boolean {
  return stoppedScenes.has(sceneId);
}

/** Xoá cờ dừng — gọi khi bắt đầu 1 lượt generate mới cho cảnh này (tạo lại sau khi đã dừng) */
export function clearSceneStopped(sceneId: string): void {
  stoppedScenes.delete(sceneId);
}

/** Đảm bảo mỗi sceneId chỉ có 1 luồng tạo video tại một thời điểm */
export function withSceneVideoLock<T>(sceneId: string, fn: () => Promise<T>): Promise<T> {
  const existing = sceneLocks.get(sceneId);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    sceneLocks.delete(sceneId);
  });
  sceneLocks.set(sceneId, promise);
  return promise;
}

/** Resume poll — khóa theo operationName để refresh không tạo poll song song */
export function withOperationPollLock(operationName: string, fn: () => Promise<string>): Promise<string> {
  const existing = operationLocks.get(operationName);
  if (existing) return existing;

  const promise = fn().finally(() => {
    operationLocks.delete(operationName);
  });
  operationLocks.set(operationName, promise);
  return promise;
}
