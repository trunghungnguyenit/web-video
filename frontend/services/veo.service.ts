import type { VeoInput } from '@/lib/pipeline-payload';
import type { VeoModelOption } from '@/lib/veo-models';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface GenerateSceneVideoPayload {
  apiKey: string;
  prompt: string;
  veoInput: VeoInput;
  durationSeconds: number;
  operationName?: string;
}

export interface PollOperationPayload {
  apiKey: string;
  operationName: string;
}

export interface DownloadVideoPayload {
  apiKey: string;
  videoUri: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fatal?: boolean;
}

class VeoService {
  private async parseError(res: Response): Promise<never> {
    let message = `Veo lỗi (${res.status})`;
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

  /** POST /api/veo/models — danh sách model Veo theo API Key */
  async listModels(apiKey: string): Promise<VeoModelOption[]> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/veo/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
    } catch {
      throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
    }

    const json = (await res.json()) as ApiResponse<{ models: VeoModelOption[] }>;
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Không lấy được model Veo (${res.status}).`);
    }

    return json.data?.models ?? [];
  }

  /** POST /api/veo/generate/start — đúng 1 lần predictLongRunning */
  async startGeneration(payload: Omit<GenerateSceneVideoPayload, 'operationName'>): Promise<{ operationName: string }> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/veo/generate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
    }

    const json = (await res.json()) as ApiResponse<{ operationName: string }>;
    if (!res.ok || !json.success || !json.data?.operationName) {
      const err = new Error(json.error ?? `Veo lỗi (${res.status})`);
      (err as Error & { fatal?: boolean }).fatal = json.fatal;
      throw err;
    }

    return { operationName: json.data.operationName };
  }

  /** POST /api/veo/operations/poll — chỉ poll status */
  async pollOperation(payload: PollOperationPayload): Promise<{ done: boolean; videoUri?: string; error?: string }> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/veo/operations/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
    }

    const json = (await res.json()) as ApiResponse<{ done: boolean; videoUri?: string; error?: string }>;
    if (!res.ok || !json.success) {
      const err = new Error(json.error ?? `Veo poll lỗi (${res.status})`);
      (err as Error & { fatal?: boolean }).fatal = json.fatal;
      throw err;
    }

    return json.data ?? { done: false };
  }

  /** POST /api/veo/generate/download — tải MP4 khi operation DONE */
  async downloadVideo(payload: DownloadVideoPayload): Promise<Blob> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/veo/generate/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
    }

    if (!res.ok) {
      await this.parseError(res);
    }

    return res.blob();
  }

  /** POST /api/veo/generate — luồng đầy đủ (legacy / resume) */
  async generate(payload: GenerateSceneVideoPayload): Promise<Blob> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/veo/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
    }

    if (!res.ok) {
      await this.parseError(res);
    }

    return res.blob();
  }
}

export const veoService = new VeoService();
