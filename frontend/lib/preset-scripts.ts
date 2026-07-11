// ─── Dữ liệu kịch bản mẫu (preset) — nhân vật, input, demo 4 mục ────────────

import { PRESET_DEMO_TIMELINES } from '@/lib/preset-demos';
import {
  STICKMAN_DEMO_SCENES,
  STICKMAN_MASTER_BRIEF,
  stickmanImageScenes,
} from '@/lib/preset-stickman-war';

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
  videoType: string;
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
  includeSubtitles: boolean;
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

const CHAR_STICKMAN_COMMANDER: PresetCharacter = {
  name: 'Người Chỉ Huy',
  role: 'Lãnh đạo bộ lạc',
  traits: 'Dũng cảm · Thông minh · Có chiến thuật · Không bỏ rơi đồng đội',
  outfit: 'Giáp da cổ đại, mũ chiến binh, giáo dài, khiên lớn',
  description:
    'Stickman người que 2D tối giản — chỉ huy bộ lạc sa mạc. Giữ đồng nhất ngoại hình mọi cảnh: kích thước cơ thể, vũ khí, trang phục, màu sắc, phong cách người que.',
  style: 'Stickman Primitive',
};

/** Danh sách kịch bản mẫu đầy đủ — dùng cho preset picker và demo */
export const PRESET_SCRIPTS: PresetScript[] = [
  {
    id: 5,
    title: 'Stickman Chiến Tranh',
    desc: 'Có ảnh · 10 cảnh · người que 2D',
    badge: '⚔️ Stickman / Ảnh',
    character: CHAR_STICKMAN_COMMANDER,
    characters: [CHAR_STICKMAN_COMMANDER],
    input: {
      content: STICKMAN_MASTER_BRIEF,
      language: 'vi',
      sceneCount: '10',
      videoType: 'storytelling',
      voice: 'male-pro',
      aspectRatio: '16:9',
      sceneDuration: '6',
      videoQuality: '720p',
      voiceSpeed: 1,
      sceneStyleId: '2d-explainer',
      inputType: 'image',
      imageScenes: stickmanImageScenes(),
    },
    demoScenes: STICKMAN_DEMO_SCENES,
    timeline: PRESET_DEMO_TIMELINES[5],
  },
];
