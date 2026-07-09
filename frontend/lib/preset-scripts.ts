// ─── Dữ liệu kịch bản mẫu (preset) — nhân vật, input, demo 4 mục ────────────

import { PRESET_DEMO_SCENES, PRESET_DEMO_TIMELINES } from '@/lib/preset-demos';
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

const CHAR_PRODUCT_MAIN: PresetCharacter = {
  name: 'Alex — Chuyên gia sản phẩm',
  role: 'Product Specialist',
  traits: 'Tự tin, nhiệt tình, am hiểu công nghệ',
  outfit: 'Áo sơ mi xanh navy, quần tây đen, đeo tai nghe chuyên nghiệp',
  description:
    'Alex là chuyên gia tư vấn sản phẩm công nghệ với hơn 5 năm kinh nghiệm. Phong cách trình bày rõ ràng, dễ hiểu, luôn tập trung vào lợi ích thực tiễn của người dùng.',
  style: 'Cinematic',
};

const CHAR_PRODUCT_SUPPORT: PresetCharacter = {
  name: 'Sam — Khách hàng thử nghiệm',
  role: 'Early Adopter',
  traits: 'Tò mò, thực tế, dễ đồng cảm',
  outfit: 'Áo thun trắng, quần jeans, smartwatch',
  description:
    'Sam đại diện cho người dùng gia đình — thử nghiệm SmartHome Pro trong căn hộ thực tế và phản hồi chân thực.',
  style: 'Realistic',
};

const CHAR_MIA: PresetCharacter = {
  name: 'Mia — Content Creator',
  role: 'Social Media Creator',
  traits: 'Năng động, sáng tạo, gần gũi với giới trẻ',
  outfit: 'Áo thun pastel, jeans rách, mũ bucket, giày sneaker',
  description:
    'Mia là content creator nổi tiếng với phong cách trẻ trung, vui nhộn. Cô chuyên tạo video ngắn viral trên TikTok và Reels.',
  style: 'Anime / Manga',
};

const CHAR_RYAN: PresetCharacter = {
  name: 'Ryan — Brand Ambassador',
  role: 'Brand Spokesperson',
  traits: 'Lôi cuốn, đáng tin cậy, quyền uy',
  outfit: 'Suit đen đẳng cấp, cà vạt đỏ, đồng hồ cao cấp',
  description:
    'Ryan là đại sứ thương hiệu B2B. Giọng trầm ấm, phong thái chuyên nghiệp, truyền đạt thông điệp thuyết phục.',
  style: 'Cinematic',
};

const CHAR_LINH: PresetCharacter = {
  name: 'Dr. Linh — Giảng viên',
  role: 'Expert Instructor',
  traits: 'Kiên nhẫn, tỉ mỉ, truyền đạt dễ hiểu',
  outfit: 'Áo blazer xanh lam nhạt, quần âu, kính gọng tròn, cầm bảng viết',
  description:
    'Dr. Linh là giảng viên đại học 10 năm kinh nghiệm dạy lập trình. Chuyên nội dung giáo dục từ cơ bản đến nâng cao.',
  style: 'Flat Design',
};

const CHAR_LINH_TA: PresetCharacter = {
  name: 'Minh — Trợ giảng',
  role: 'Teaching Assistant',
  traits: 'Nhiệt tình, am hiểu code thực hành',
  outfit: 'Hoodie tech, laptop sticker, tai nghe cổ',
  description:
    'Minh hỗ trợ demo code trực tiếp, giải đáp thắc mắc và recap bài học ở cuối mỗi phần.',
  style: 'Flat Design',
};

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
    id: 1,
    title: 'Product Demo',
    desc: 'Demo đầy đủ · 2 nhân vật · 5 cảnh',
    badge: '🎯 Giới thiệu sản phẩm',
    character: CHAR_PRODUCT_MAIN,
    characters: [CHAR_PRODUCT_MAIN, CHAR_PRODUCT_SUPPORT],
    input: {
      content:
        'Giới thiệu sản phẩm SmartHome Pro — thiết bị điều khiển nhà thông minh thế hệ mới.\n\n' +
        '1. Mở đầu — Alex giới thiệu sản phẩm và lợi ích chính\n' +
        '2. Demo app điều khiển toàn bộ thiết bị từ xa\n' +
        '3. AI tiết kiệm 40% điện năng tự động\n' +
        '4. Tương thích 200+ thiết bị, đa nền tảng\n' +
        '5. Giá, bảo hành và kêu gọi mua hàng',
      language: 'vi',
      sceneCount: '5',
      videoType: 'review',
      voice: 'male-natural',
      aspectRatio: '16:9',
      sceneDuration: '6',
      voiceSpeed: 1,
      sceneStyleId: 'cinematic',
    },
    demoScenes: PRESET_DEMO_SCENES[1],
    timeline: PRESET_DEMO_TIMELINES[1],
  },
  {
    id: 2,
    title: 'Social Media',
    desc: 'Demo TikTok · 1 nhân vật · 5 cảnh',
    badge: '📱 TikTok / Reels',
    character: CHAR_MIA,
    characters: [CHAR_MIA],
    input: {
      content:
        '🔥 Video viral: "5 mẹo học tiếng Anh siêu tốc"\n\n' +
        '1. Hook gây tò mò — câu hỏi mở đầu\n' +
        '2. Mẹo nghe podcast mỗi sáng\n' +
        '3. Shadowing giọng bản ngữ\n' +
        '4. Học qua phim + app Anki\n' +
        '5. CTA follow nhận tips mỗi ngày',
      language: 'vi',
      sceneCount: '5',
      videoType: 'storytelling',
      voice: 'female-young',
      aspectRatio: '9:16',
      sceneDuration: '4',
      voiceSpeed: 1.25,
      sceneStyleId: 'anime',
    },
    demoScenes: PRESET_DEMO_SCENES[2],
    timeline: PRESET_DEMO_TIMELINES[2],
  },
  {
    id: 3,
    title: 'Marketing',
    desc: 'Demo quảng cáo B2B · 5 cảnh',
    badge: '📣 Quảng cáo',
    character: CHAR_RYAN,
    characters: [CHAR_RYAN],
    input: {
      content:
        'Chiến dịch CloudSync — lưu trữ doanh nghiệp\n\n' +
        '1. Nêu vấn đề — mất dữ liệu, hệ thống cũ\n' +
        '2. Giải pháp backup 24/7\n' +
        '3. Tốc độ gấp 10 lần\n' +
        '4. Bảo mật ISO 27001\n' +
        '5. CTA dùng thử 30 ngày',
      language: 'vi',
      sceneCount: '5',
      videoType: 'ads',
      voice: 'male-pro',
      aspectRatio: '16:9',
      sceneDuration: '6',
      voiceSpeed: 1,
      sceneStyleId: 'cinematic',
    },
    demoScenes: PRESET_DEMO_SCENES[3],
    timeline: PRESET_DEMO_TIMELINES[3],
  },
  {
    id: 4,
    title: 'Tutorial',
    desc: 'Demo hướng dẫn · 2 nhân vật · 10 cảnh',
    badge: '📚 Hướng dẫn',
    character: CHAR_LINH,
    characters: [CHAR_LINH, CHAR_LINH_TA],
    input: {
      content:
        'REST API với Node.js & Express — từ A đến Z\n\n' +
        '1. REST API là gì\n2. Cài môi trường\n3. Tạo project Express\n' +
        '4. GET /tasks\n5. POST /tasks\n6. PUT & DELETE\n' +
        '7. MongoDB + Mongoose\n8. JWT middleware\n9. Test & deploy\n10. Tổng kết',
      language: 'vi',
      sceneCount: '10',
      videoType: 'tutorial',
      voice: 'female-natural',
      aspectRatio: '16:9',
      sceneDuration: '6',
      voiceSpeed: 0.9,
      sceneStyleId: 'flat-design',
    },
    demoScenes: PRESET_DEMO_SCENES[4],
    timeline: PRESET_DEMO_TIMELINES[4],
  },
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
