// ─── Pool key Gemini dự phòng của server — dùng khi FE không dán key riêng ───
// Đọc từ env GEMINI_API_KEYS (nhiều key, phân cách dấu phẩy). Khi 1 key hết
// quota/lỗi, request kế tiếp tự động bắt đầu từ key kế tiếp trong pool.

const POOL: string[] = (process.env.GEMINI_API_KEYS ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

let cursor = 0;

export function hasPoolKeys(): boolean {
  return POOL.length > 0;
}

/** Danh sách key theo thứ tự thử — bắt đầu từ key đang được coi là "tốt" gần nhất */
export function poolKeysInOrder(): string[] {
  if (POOL.length === 0) return [];
  return [...POOL.slice(cursor), ...POOL.slice(0, cursor)];
}

/** Đánh dấu 1 key vừa lỗi — request sau sẽ bắt đầu từ key kế tiếp trong pool */
export function advancePoolCursor(failedKey: string): void {
  const idx = POOL.indexOf(failedKey);
  if (idx !== -1) cursor = (idx + 1) % POOL.length;
}
