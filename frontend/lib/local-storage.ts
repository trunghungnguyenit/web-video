// ─── Helper đọc/ghi localStorage — có SSR guard + try/catch dùng chung ───────

/** Đọc và parse JSON từ localStorage. SSR hoặc lỗi parse → trả về `fallback`. */
export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Ghi giá trị dạng JSON vào localStorage. No-op khi SSR. */
export function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

/** Xóa key khỏi localStorage. No-op khi SSR. */
export function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}
