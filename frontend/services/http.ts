// ─── fetch wrapper dùng chung cho các service gọi backend ───────────────────

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** `fetch` tới backend — báo lỗi thân thiện khi backend chưa chạy / mất kết nối. */
export async function fetchApi(path: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
  }
}
