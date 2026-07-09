// ─── Gom form → geminiInput / veoInput / ttsInput gửi backend ─────────────────

import type { SavedCharacter } from '@/lib/saved-characters';

export interface PipelineCharacter {
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style: string;
}

export interface GeminiInput {
  apiKey: string;
  content: string;
  language: string;
  sceneCount: string;
  videoType: string;
  inputType: 'text' | 'link' | 'image' | 'file';
  characters?: PipelineCharacter[];
}

export interface VeoInput {
  apiKey?: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality?: string;
  /** Model Veo do user chọn */
  veoModel?: string;
  sceneStyle?: string;
  sceneStyleId?: string;
  characters?: PipelineCharacter[];
}

export interface TtsInput {
  apiKey?: string;
  voice: string;
  language: string;
  voiceSpeed?: number;
}

export interface AnalyzePipelineRequest {
  geminiInput: GeminiInput;
  veoInput: VeoInput;
  ttsInput: TtsInput;
}
/** Chuyển đổi danh sách nhân vật từ SavedCharacter sang PipelineCharacter */
export function toPipelineCharacters(list: SavedCharacter[]): PipelineCharacter[] {
  return list
    .filter((c) => c.name.trim())
    .map((c) => ({
      name: c.name.trim(),
      role: c.role.trim(),
      traits: c.traits.trim(),
      outfit: c.outfit.trim(),
      description: c.description.trim(),
      style: c.style.trim() || 'Realistic',
    }));
}

export interface BuildPipelineParams {
  geminiApiKey: string;
  veoApiKey?: string;
  ttsApiKey?: string;
  content: string;
  language: string;
  sceneCount: string;
  videoType: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality: string;
  veoModel?: string;
  voice: string;
  voiceSpeed: number;
  sceneStyleLabel: string;
  sceneStyleId: string;
  inputType: 'text' | 'link' | 'image' | 'file';
  characters: PipelineCharacter[];
}

/** Gom form → 3 payload riêng cho Gemini / Veo / TTS */
export function buildAnalyzePipeline(params: BuildPipelineParams): AnalyzePipelineRequest {
  const characters = params.characters.length > 0 ? params.characters : undefined;

  return {
    geminiInput: {
      apiKey: params.geminiApiKey,
      content: params.content,
      language: params.language,
      sceneCount: params.sceneCount,
      videoType: params.videoType,
      inputType: params.inputType,
      characters,
    },
    veoInput: {
      apiKey: params.veoApiKey || undefined,
      aspectRatio: params.aspectRatio,
      sceneDuration: params.sceneDuration,
      videoQuality: params.videoQuality,
      veoModel: params.veoModel || undefined,
      sceneStyle: params.sceneStyleLabel,
      sceneStyleId: params.sceneStyleId,
      characters,
    },
    ttsInput: {
      apiKey: params.ttsApiKey || undefined,
      voice: params.voice,
      language: params.language,
      voiceSpeed: params.voiceSpeed,
    },
  };
}
