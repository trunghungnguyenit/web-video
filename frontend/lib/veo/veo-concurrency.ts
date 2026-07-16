// ─── Giới hạn request đồng thời theo từng provider — tránh rate limit ───────
// Veo và Kie.ai là 2 API độc lập, quota riêng — mỗi provider có hàng đợi riêng,
// không xếp hàng chờ lẫn nhau khi chạy nhiều luồng song song khác provider.

/** Tạo 1 semaphore độc lập — chỉ cho tối đa `maxConcurrent` request cùng lúc */
function createConcurrencyGate(maxConcurrent: number) {
  let active = 0;
  const waitQueue: Array<() => void> = [];

  function acquire(): Promise<void> {
    if (active < maxConcurrent) {
      active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      waitQueue.push(() => {
        active++;
        resolve();
      });
    });
  }

  function release(): void {
    active = Math.max(0, active - 1);
    const next = waitQueue.shift();
    if (next) next();
  }

  return async function withConcurrency<T>(fn: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

/** Giới hạn 1 request "bắt đầu tạo" Veo đồng thời — tránh 429 high demand */
export const withVeoConcurrency = createConcurrencyGate(1);

/** Giới hạn 1 request "bắt đầu tạo" Kie.ai (Grok Imagine) đồng thời — tránh rate limit riêng của kie.ai */
export const withKieConcurrency = createConcurrencyGate(1);
