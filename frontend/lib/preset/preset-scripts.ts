// ─── Dữ liệu kịch bản mẫu (preset) — nhân vật, input, demo 4 mục ────────────

export interface PresetCharacter {
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style: string;
}

export interface PresetInput {
  content: string;
  language: string;
  sceneCount: string;
  voice: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality?: string;
  veoModel?: string;
  /** Demo: tốc độ giọng TTS (mục 2) */
  voiceSpeed?: number;
  /** Demo: id phong cách cảnh (mục 2) */
  sceneStyleId?: string;
  /** Tab đầu vào khi áp dụng preset — mặc định text */
  inputType?: 'text' | 'link' | 'image' | 'file';
  /** Prompt từng cảnh khi inputType = image */
  imageScenes?: PresetImageScene[];
}

/** Cảnh preset kiểu upload ảnh — prompt video + gợi ý voice */
export interface PresetImageScene {
  title: string;
  videoPrompt: string;
  voice: string;
}

/** Cảnh demo sẵn có — mục 3 & 4 */
export interface PresetDemoScene {
  prompt: string;
  voice: string;
  durationSeconds: number;
}

/** Cấu hình timeline demo — mục 4 */
export interface PresetTimelineDemo {
  bgmPresetName: string;
  bgmVolume: number;
  voiceSpeed: number;
  sceneStyle: string;
  transitionNote?: string;
}

export interface PresetScript {
  id: number;
  title: string;
  desc: string;
  badge: string;
  /** @deprecated dùng characters — giữ để tương thích */
  character: PresetCharacter;
  /** Nhân vật demo (mục 1) — có thể nhiều nhân vật */
  characters: PresetCharacter[];
  input: PresetInput;
  /** Cảnh video demo (mục 3) */
  demoScenes: PresetDemoScene[];
  /** Timeline demo (mục 4) */
  timeline: PresetTimelineDemo;
}

/** Danh sách kịch bản mẫu đầy đủ — dùng cho preset picker và demo */
export const PRESET_SCRIPTS: PresetScript[] = [];
