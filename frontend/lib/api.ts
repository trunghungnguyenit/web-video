const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error ?? 'API error');
  return json.data as T;
}

export const api = {
  health: () => request<{ status: string }>('/api/health'),
  videos: {
    list: () => request<unknown[]>('/api/videos'),
    create: (body: unknown) => request('/api/videos', { method: 'POST', body: JSON.stringify(body) }),
  },
  characters: {
    list: () => request<unknown[]>('/api/characters'),
    create: (body: unknown) => request('/api/characters', { method: 'POST', body: JSON.stringify(body) }),
  },
  scenes: {
    list: (projectId: string) => request<unknown[]>(`/api/scenes?projectId=${projectId}`),
    create: (body: unknown) => request('/api/scenes', { method: 'POST', body: JSON.stringify(body) }),
    regenerate: (id: string) => request(`/api/scenes/${id}/regenerate`, { method: 'POST' }),
  },
  apiKeys: {
    list: () => request<unknown[]>('/api/api-keys'),
    save: (body: unknown) => request('/api/api-keys', { method: 'POST', body: JSON.stringify(body) }),
  },
};
