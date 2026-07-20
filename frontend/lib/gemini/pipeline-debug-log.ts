// ─── Log debug pipeline Gemini — payload gửi & response (DevTools Console) ───

import type { AnalyzePipelineRequest } from '@/lib/pipeline-payload';

/** Che API key khi log — giữ 6 ký tự đầu + 4 ký tự cuối */
function redactKey(key?: string): string {
  const k = key?.trim();
  if (!k) return '(empty)';
  if (k.length <= 10) return '***';
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

export interface ImageLogItem {
  fileName: string;
  sizeMB: string;
  prompt: string;
}

/** Log payload gửi Gemini — chỉ chạy ở development */
export function logAnalyzePipeline(
  pipeline: AnalyzePipelineRequest,
  extra?: { images?: ImageLogItem[] },
): void {
  if (process.env.NODE_ENV === 'production') return;

  const { geminiInput, veoInput, ttsInput } = pipeline;

  const safe = {
    geminiInput: {
      ...geminiInput,
      apiKey: redactKey(geminiInput.apiKey),
    },
    veoInput: {
      ...veoInput,
      apiKey: redactKey(veoInput.apiKey),
    },
    ttsInput: {
      ...ttsInput,
      apiKey: redactKey(ttsInput.apiKey),
    },
  };

  console.group('[Pipeline] Payload gửi /api/gemini/analyze');
  console.log('inputType:', geminiInput.inputType);
  console.log('── content (geminiInput.content) ──');
  console.log(geminiInput.content);
  if (extra?.images?.length) {
    console.log('── ảnh + prompt từng file ──');
    console.table(extra.images);
  }
  console.log('── cài đặt ──', {
    language: geminiInput.language,
    sceneCount: geminiInput.sceneCount,
    aspectRatio: veoInput.aspectRatio,
    sceneDuration: veoInput.sceneDuration,
    videoQuality: veoInput.videoQuality,
    veoModel: veoInput.veoModel,
    voice: ttsInput.voice,
    voiceSpeed: ttsInput.voiceSpeed,
    characters: geminiInput.characters?.length ?? 0,
  });
  console.log('── API keys (đã che) ──', {
    gemini: redactKey(geminiInput.apiKey),
    veo: redactKey(veoInput.apiKey),
    tts: redactKey(ttsInput.apiKey),
  });
  console.log('── full JSON (keys che) ──');
  console.log(JSON.stringify(safe, null, 2));
  console.groupEnd();
}
