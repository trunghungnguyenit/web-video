import type { TtsInput } from '@/lib/pipeline-payload';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface SynthesizeSpeechPayload {
  apiKey: string;
  text: string;
  ttsInput: TtsInput;
}

class TtsService {
  /** POST /api/tts/synthesize — ElevenLabs → Blob audio MP3 */
  async synthesize(payload: SynthesizeSpeechPayload): Promise<Blob> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/tts/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
    }

    if (!res.ok) {
      let message = `TTS lỗi (${res.status})`;
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

export const ttsService = new TtsService();
