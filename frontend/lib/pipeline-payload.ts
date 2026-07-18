// ─── Gom form → geminiInput / veoInput / ttsInput gửi backend ─────────────────

import type { SavedCharacter } from '@/lib/character/saved-characters';

export interface PipelineCharacter {
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style: string;
  /** Ảnh tham chiếu (base64, không kèm prefix data URL) — gửi làm ảnh mồi cho Veo giữ nhất quán ngoại hình qua các cảnh */
  imageBase64?: string;
  imageMimeType?: string;
}

/** Tách data URL (`data:image/png;base64,xxx`) thành base64 thuần + mimeType — undefined nếu không parse được */
export function parseDataUrl(dataUrl: string | undefined): { base64: string; mimeType: string } | undefined {
  if (!dataUrl) return undefined;
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!match) return undefined;
  return { mimeType: match[1], base64: match[2] };
}

export interface GeminiInput {
  apiKey: string;
  content: string;
  language: string;
  sceneCount: string;
  videoType: string;
  inputType: 'text' | 'link' | 'image' | 'file';
  characters?: PipelineCharacter[];
  /** Tab link — URL video gốc */
  sourceVideoUrl?: string;
  /** Video file (base64) — BE upload Gemini Files API */
  videoFileBase64?: string;
  videoFileMimeType?: string;
  videoFileName?: string;
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
  /**
   * Ảnh Master Cast / tham chiếu đồng nhất nhân vật (tab link).
   * Gửi kèm mọi cảnh — Veo: instance.image; Kie: image-to-video.
   */
  referenceImage?: { base64: string; mimeType: string };
  /** Nhà cung cấp sinh video — mặc định 'veo' nếu không truyền */
  provider?: 'veo' | 'kie';
  /** Chế độ nội dung Grok Imagine (chỉ áp dụng khi provider = 'kie') */
  kieMode?: 'fun' | 'normal' | 'spicy';
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
    .map((c) => {
      const image = parseDataUrl(c.avatarDataUrl);
      return {
        name: c.name.trim(),
        role: c.role.trim(),
        traits: c.traits.trim(),
        outfit: c.outfit.trim(),
        description: c.description.trim(),
        style: c.style.trim() || 'Realistic',
        imageBase64: image?.base64,
        imageMimeType: image?.mimeType,
      };
    });
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
  provider?: 'veo' | 'kie';
  kieMode?: 'fun' | 'normal' | 'spicy';
  sourceVideoUrl?: string;
  videoFileBase64?: string;
  videoFileMimeType?: string;
  videoFileName?: string;
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
      sourceVideoUrl: params.sourceVideoUrl?.trim() || undefined,
      videoFileBase64: params.videoFileBase64 || undefined,
      videoFileMimeType: params.videoFileMimeType || undefined,
      videoFileName: params.videoFileName || undefined,
    },
    veoInput: {
      apiKey: params.veoApiKey || undefined,
      aspectRatio: params.aspectRatio,
      sceneDuration: params.sceneDuration,
      videoQuality: params.videoQuality,
      // veoModel chỉ có ý nghĩa khi provider = 'veo' — bỏ qua khi dùng Grok Imagine
      // để tránh model Veo cũ còn sót trong settings gây hiểu lầm khi đọc log/debug.
      veoModel: params.provider === 'kie' ? undefined : (params.veoModel || undefined),
      sceneStyle: params.sceneStyleLabel,
      sceneStyleId: params.sceneStyleId,
      characters,
      provider: params.provider,
      kieMode: params.kieMode,
    },
    ttsInput: {
      apiKey: params.ttsApiKey || undefined,
      voice: params.voice,
      language: params.language,
      voiceSpeed: params.voiceSpeed,
    },
  };
}
