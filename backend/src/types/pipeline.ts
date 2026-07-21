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
  inputType: 'text' | 'link' | 'image' | 'file';
  /**
   * Tab "Từ hình ảnh" — 'multi' (nhiều ảnh, mỗi ảnh 1 cảnh/1 look độc lập — lookbook) |
   * 'single' (1 ảnh + Prompt tổng, câu chuyện liên tục nhiều cảnh). Quyết định buildPrompt()
   * dùng quy tắc "phim liên tục" (single) hay "lookbook — trang phục đổi mỗi cảnh" (multi).
   */
  imageMode?: 'multi' | 'single';
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
  /**
   * Tab "Từ file" — tài liệu upload (PDF/DOC/DOCX/TXT), base64 thuần không kèm
   * data-URL prefix. PDF gửi thẳng cho Gemini đọc (inline_data); DOC/DOCX/TXT được
   * trích xuất text ở BE rồi gộp vào "content" trước khi build prompt.
   */
  documentFileBase64?: string;
  documentFileMimeType?: string;
  documentFileName?: string;
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
  /** Prompt mô tả toàn bộ dàn nhân vật — chỉ có khi geminiInput.inputType === 'link' */
  masterCastPrompt?: string;
}

export interface AnalyzePipelineResponse {
  script: GeminiVideoScript;
  veoInput: VeoInput;
  ttsInput: TtsInput;
}
