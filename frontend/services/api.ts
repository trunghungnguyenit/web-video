const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request(path: string, options?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
  } catch {
    throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
  }

  let json: { success?: boolean; error?: string; data?: unknown };
  try {
    json = await res.json();
  } catch {
    throw new Error(`Backend trả về phản hồi không hợp lệ (${res.status}).`);
  }

  if (!json.success) {
    throw new Error(json.error ?? 'Lỗi API');
  }

  return json.data;
}

export const apiService = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
};
