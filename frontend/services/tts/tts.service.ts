import type { TtsInput } from '@/lib/pipeline-payload';
import { fetchApi } from '@/services/http';

export interface SynthesizeSpeechPayload {
  apiKey: string;
  text: string;
  ttsInput: TtsInput;
}

class TtsService {
  /** POST /api/tts/synthesize — ElevenLabs → Blob audio MP3 */
  async synthesize(payload: SynthesizeSpeechPayload): Promise<Blob> {
    const res = await fetchApi('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
