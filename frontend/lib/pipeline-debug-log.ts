import type { AnalyzePipelineRequest } from '@/lib/pipeline-payload';

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

/** Log payload gửi Gemini — mở DevTools → Console */
export function logAnalyzePipeline(
  pipeline: AnalyzePipelineRequest,
  extra?: { images?: ImageLogItem[] },
): void {
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
    videoType: geminiInput.videoType,
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
