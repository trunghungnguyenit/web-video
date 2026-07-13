// ─── Khóa chống gọi Veo trùng cho cùng một cảnh / operation ─────────────────

const sceneLocks = new Map<string, Promise<string>>();
const operationLocks = new Map<string, Promise<string>>();

/** Đảm bảo mỗi sceneId chỉ có 1 luồng tạo video tại một thời điểm */
export function withSceneVideoLock<T>(sceneId: string, fn: () => Promise<T>): Promise<T> {
  const existing = sceneLocks.get(sceneId);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    sceneLocks.delete(sceneId);
  });
  sceneLocks.set(sceneId, promise as Promise<string>);
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
