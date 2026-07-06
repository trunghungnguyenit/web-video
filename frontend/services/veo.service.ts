import type { VeoInput } from '@/lib/pipeline-payload';
import type { VeoModelOption } from '@/lib/veo-models';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface GenerateSceneVideoPayload {
  apiKey: string;
  prompt: string;
  veoInput: VeoInput;
  durationSeconds: number;
}

interface ListModelsResponse {
  success: boolean;
  data?: { models: VeoModelOption[] };
  error?: string;
}

class VeoService {
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

    const json = (await res.json()) as ListModelsResponse;
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Không lấy được model Veo (${res.status}).`);
    }

    return json.data?.models ?? [];
  }

  /** POST /api/veo/generate — Veo 3 → Blob video MP4 */
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
      let message = `Veo lỗi (${res.status})`;
      try {
        const json = (await res.json()) as { error?: string };
        if (json.error) message = json.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    return res.blob();
  }
}

export const veoService = new VeoService();
