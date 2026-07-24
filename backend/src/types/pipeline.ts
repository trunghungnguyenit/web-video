/** Nhân vật — dùng cho Gemini (kịch bản) và Veo (nhất quán hình ảnh) */
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
  imageUrl?: string;
}

/** Bước 1 — Gemini: phân tích nội dung → kịch bản JSON */
export interface GeminiInput {
  apiKey: string;
  content: string;
  language: string;
  sceneCount: string;
  inputType: 'text' | 'link' | 'image' | 'file';
  imageMode?: 'multi' | 'single';
  characters?: PipelineCharacter[];
  /** Tab link — URL video (YouTube public → file_uri trực tiếp) */
  sourceVideoUrl?: string;
  videoFileBase64?: string;
  videoFileMimeType?: string;
  videoFileName?: string;
  documentFileBase64?: string;
  documentFileMimeType?: string;
  documentFileName?: string;
}

/** Bước 2 — sinh video từ scene.visual — Veo 3.1 qua kie.ai (mặc định) hoặc gọi thẳng Google */
export interface VeoInput {
  apiKey?: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality?: string;
  veoModel?: string;
  sceneStyle?: string;
  sceneStyleId?: string;
  characters?: PipelineCharacter[];
  referenceImage?: { base64?: string; mimeType?: string; url?: string };
  masterCharacterText?: string;
  provider?: 'veo' | 'veo-gemini';
}

/** Bước 3 — ElevenLabs TTS: tạo audio từ scene.voiceover */
export interface TtsInput {
  apiKey?: string;
  voice: string;
  language: string;
  voiceSpeed?: number;
  /** false = bỏ qua TTS (dùng audio native trong video) */
  enabled?: boolean;
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
  masterCastPrompt?: string;
}

export interface AnalyzePipelineResponse {
  script: GeminiVideoScript;
  veoInput: VeoInput;
  ttsInput: TtsInput;
}
