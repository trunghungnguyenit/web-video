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
  /** Tab link — URL video (YouTube public → file_uri trực tiếp) */
  sourceVideoUrl?: string;
  /**
   * Video đã upload (base64 thuần, không data-URL prefix) — BE upload lên Files API
   * rồi gắn fileUri vào generateContent.
   */
  videoFileBase64?: string;
  videoFileMimeType?: string;
  videoFileName?: string;
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
  /** Prompt mô tả toàn bộ dàn nhân vật — chỉ có khi geminiInput.inputType === 'link' */
  masterCastPrompt?: string;
}

export interface AnalyzePipelineResponse {
  script: GeminiVideoScript;
  veoInput: VeoInput;
  ttsInput: TtsInput;
}
