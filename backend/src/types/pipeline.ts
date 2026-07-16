/** Nhân vật — dùng cho Gemini (kịch bản) và Veo (nhất quán hình ảnh) */
export interface PipelineCharacter {
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style: string;
}

/** Bước 1 — Gemini: phân tích nội dung → kịch bản JSON */
export interface GeminiInput {
  apiKey: string;
  content: string;
  language: string;
  sceneCount: string;
  videoType: string;
  inputType: 'text' | 'link' | 'image' | 'file';
  characters?: PipelineCharacter[];
}

/** Bước 2 — sinh video từ scene.visual — Veo 3 (mặc định) hoặc Grok Imagine (kie.ai) */
export interface VeoInput {
  apiKey?: string;
  aspectRatio: string;
  sceneDuration: string;
  /** 720p | 1080p | 720p-fast */
  videoQuality?: string;
  /** Model Veo do user chọn (vd. veo-3.0-generate-001) */
  veoModel?: string;
  sceneStyle?: string;
  sceneStyleId?: string;
  characters?: PipelineCharacter[];
  /** Nhà cung cấp sinh video — mặc định 'veo' nếu không truyền */
  provider?: 'veo' | 'kie';
  /** Chế độ nội dung Grok Imagine (chỉ áp dụng khi provider = 'kie') */
  kieMode?: 'fun' | 'normal' | 'spicy';
}

/** Bước 3 — ElevenLabs TTS: tạo audio từ scene.voiceover */
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

export interface GeminiScene {
  id: number;
  durationSeconds: number;
  visual: string;
  voiceover: string;
}

export interface GeminiVideoScript {
  title: string;
  scenes: GeminiScene[];
}

export interface AnalyzePipelineResponse {
  script: GeminiVideoScript;
  veoInput: VeoInput;
  ttsInput: TtsInput;
}
