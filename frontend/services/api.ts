import { fetchApi } from '@/services/http';

async function request(path: string, options?: RequestInit) {
  const res = await fetchApi(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

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
