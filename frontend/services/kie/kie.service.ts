import { fetchApi } from '@/services/http';

export interface StartGrokVideoPayload {
  apiKey: string;
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  mode?: string;
  resolution?: string;
  /** Master Cast / ảnh nguồn — BE upload Files Kie → image-to-video */
  image?: { base64: string; mimeType: string };
}

export interface PollGrokTaskPayload {
  apiKey: string;
  taskId: string;
}

export interface DownloadGrokVideoPayload {
  videoUrl: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fatal?: boolean;
}

class KieService {
  private async parseError(res: Response): Promise<never> {
    let message = `Kie.ai lỗi (${res.status})`;
    let fatal = false;
    try {
      const json = (await res.json()) as ApiResponse<unknown>;
      if (json.error) message = json.error;
      if (json.fatal) fatal = true;
    } catch {
      // ignore
    }
    const err = new Error(message);
    (err as Error & { fatal?: boolean }).fatal = fatal;
    throw err;
  }

  /** POST /api/kie/generate/start — tạo task Grok Imagine, trả taskId */
  async startGeneration(payload: StartGrokVideoPayload): Promise<{ taskId: string }> {
    const res = await fetchApi('/api/kie/generate/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as ApiResponse<{ taskId: string }>;
    if (!res.ok || !json.success || !json.data?.taskId) {
      const err = new Error(json.error ?? `Kie.ai lỗi (${res.status})`);
      (err as Error & { fatal?: boolean }).fatal = json.fatal;
      throw err;
    }

    return { taskId: json.data.taskId };
  }

  /** POST /api/kie/operations/poll — poll trạng thái task */
  async pollTask(payload: PollGrokTaskPayload): Promise<{ done: boolean; videoUrl?: string; error?: string }> {
    const res = await fetchApi('/api/kie/operations/poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as ApiResponse<{ done: boolean; videoUrl?: string; error?: string }>;
    if (!res.ok || !json.success) {
      const err = new Error(json.error ?? `Kie.ai poll lỗi (${res.status})`);
      (err as Error & { fatal?: boolean }).fatal = json.fatal;
      throw err;
    }

    return json.data ?? { done: false };
  }

  /** POST /api/kie/generate/download — proxy tải MP4 qua backend, tránh phụ thuộc CORS của CDN kie.ai */
  async downloadVideo(payload: DownloadGrokVideoPayload): Promise<Blob> {
    const res = await fetchApi('/api/kie/generate/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      await this.parseError(res);
    }

    return res.blob();
  }
}

export const kieService = new KieService();
