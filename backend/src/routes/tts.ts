import { Hono } from 'hono';
import { fail } from '../utils/api-response';
import { synthesizeSpeech } from '../services/elevenlabs.service';
import type { TtsInput } from '../types/pipeline';

interface SynthesizeBody {
  apiKey: string;
  text: string;
  ttsInput: TtsInput;
}

export const ttsRoute = new Hono();

/**
 * POST /api/tts/synthesize
 * ElevenLabs — chuyển voiceover text → audio MP3
 */
ttsRoute.post('/synthesize', async (c) => {
  try {
    const body = await c.req.json<SynthesizeBody>();

    if (!body.apiKey?.trim()) {
      return fail(c, 'Thiếu ElevenLabs API Key — nhập tại mục API Keys.');
    }
    if (!body.text?.trim()) {
      return fail(c, 'Text voiceover không được để trống.');
    }
    if (!body.ttsInput) {
      return fail(c, 'Thiếu ttsInput.');
    }

    const audio = await synthesizeSpeech({
      apiKey: body.apiKey,
      text: body.text,
      ttsInput: body.ttsInput,
    });

    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi khi gọi ElevenLabs';
    return fail(c, message, 500);
  }
});
