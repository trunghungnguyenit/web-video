// ─── Giới hạn 1 request Veo đồng thời — tránh Google rate limit ─────────────

/** Giới hạn số request Veo đồng thời — tránh 429 high demand khi chạy nhiều bulk */
const MAX_CONCURRENT = 1;

let active = 0;
const waitQueue: Array<() => void> = [];

/** Chờ slot Veo — resolve khi active < MAX_CONCURRENT */
function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
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

/** Giải phóng slot và gọi request tiếp theo trong hàng đợi */
function release(): void {
  active = Math.max(0, active - 1);
  const next = waitQueue.shift();
  if (next) next();
}

/** Bọc hàm gọi Veo — đảm bảo tối đa MAX_CONCURRENT request đồng thời */
export async function withVeoConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
