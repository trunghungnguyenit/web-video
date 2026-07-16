// ─── Preset Stickman Chiến Tranh: 10 cảnh, prompt Veo + voice TTS ────────────

export interface StickmanDemoScene {
  prompt: string;
  voice: string;
  durationSeconds: number;
}

export interface StickmanImageScene {
  title: string;
  videoPrompt: string;
  voice: string;
}
/** Brief tổng cho preset Stickman — hiển thị ở tab Ảnh */
export const STICKMAN_MASTER_BRIEF = `Tạo video hoạt hình Stickman Primitive (người que 2D tối giản) — cuộc chiến bộ lạc người que cổ đại.

YÊU CẦU CHUNG:
- Phong cách: Stickman Primitive, hoạt hình 2D tối giản, chuyển động mượt, điện ảnh.
- Bối cảnh: Sa mac rộng lớn, núi đá, bụi cát, ánh hoàng hôn, chiến trường cổ đại.
- Ngôn ngữ voiceover: Tiếng Việt.
- Kiểu: Kể chuyện điện ảnh — trailer phim chiến tranh hoành tráng.
- Giọng đọc: Nam, trầm ấm, mạnh mẽ.
- Tông màu: Vàng cát, cam cháy, bụi chiến trường.
- Camera: pan, zoom, tracking, slow motion ở cảnh chiến đấu.
- Hiệu ứng: bụi cát, cháy nổ nhẹ, vũ khí, va chạm.

NHÂN VẬT CHÍNH — NGƯỜI CHỈ HUY (đồng bộ mọi cảnh):
- Stickman người que, giáp da cổ đại, mũ chiến binh, giáo dài, khiên lớn.
- Giữ nguyên kích thước, vũ khí, trang phục, màu sắc, phong cách người que.

Mỗi ảnh = 1 cảnh (6 giây). Dùng VIDEO PROMPT bên dưới làm visual; VOICE gợi ý lời kể TTS.`;

/** Tiêu đề 10 cảnh Stickman (theo thứ tự demo) */
export const STICKMAN_SCENE_TITLES = [
  'Sa mạc bình yên',
  'Dấu hiệu lạ phía xa',
  'Triệu tập chiến binh',
  'Chuẩn bị vũ khí',
  'Quân địch xuất hiện',
  'Trận chiến dữ dội',
  'Bao vây đối phương',
  'Phản công bí mật',
  'Cao trào slow motion',
  'Chiến thắng & lửa trại',
] as const;

/** 10 cảnh demo Stickman — prompt Veo + voice TTS + duration */
export const STICKMAN_DEMO_SCENES: StickmanDemoScene[] = [
  {
    prompt:
      'Stickman Primitive 2D animation, cinematic wide shot. Peaceful desert tribe camp at golden sunset — stick figure warriors resting near tents, camels, rocky mountains in background. Warm sand yellow and orange tones, soft dust particles, slow pan right. Minimal stickman style, smooth motion, epic atmosphere.',
    voice:
      'Giữa sa mạc rộng lớn, bộ lạc người que sống yên bình dưới ánh hoàng hôn vàng — chưa ai biết bão chiến tranh sắp ập đến.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive, dramatic zoom on scout stickman on sand dune. He points at distant smoke plume and strange footprints in sand. Orange sunset sky, heat haze, tension building. Camera push-in, dust blowing, cinematic 2D minimal animation.',
    voice:
      'Trinh sát phát hiện dấu chân lạ và cột khói bí ẩn phía chân trời — dấu hiệu kẻ thù đang đến gần.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive tribal war council. Commander stickman (leather armor, helmet, spear, large shield) raises spear calling warriors. Warriors gather in semicircle, desert camp background, torch light mixing with sunset. Low angle hero shot, epic gathering.',
    voice:
      'Người Chỉ Huy triệu tập các chiến binh — tiếng giáo vang lên, lửa chiến tranh thắp sáng trong mắt bộ lạc.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive preparation montage. Commander stickman draws battle plan in sand with spear tip, warriors sharpen spears and shields, armor straps tightened. Top-down then tracking shot, warm firelight, sand battlefield map, tactical mood.',
    voice:
      'Mọi người chuẩn bị vũ khí, lập kế hoạch phản công — từng chiến binh sẵn sàng bảo vệ bộ lạc.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive shock reveal. Enemy stickman army crests sand dune — dark silhouettes with weapons, dust storm, orange-red sky. Commander stickman in foreground turns to face them. Wide epic shot, dramatic zoom out showing scale of enemy force.',
    voice:
      'Bất ngờ, đội quân đối thủ xuất hiện từ sau đồi cát — số lượng đông gấp bội, chiến tranh không thể tránh khỏi.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive intense battle. Two stickman armies clash in desert — spears, shields, dust clouds, impact effects. Commander stickman charges forward leading attack. Dynamic tracking camera, fast cuts feel, sand explosion on collisions, cinematic war trailer style.',
    voice:
      'Hai bên lao vào nhau — tiếng kim loại va chạm, bụi cát cuốn lên, trận chiến bùng nổ dữ dội.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive encirclement tactic. Enemy stickmen surround tribe warriors in circle formation, aerial-style top view then ground level panic. Commander stickman center frame analyzing trap. Dark orange battlefield dust, claustrophobic tension.',
    voice:
      'Quân địch triển khai chiến thuật bao vây — vòng vây thu hẹp, bộ lạc rơi vào thế nguy hiểm.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive counterattack. Commander stickman signals hidden warriors from flank — surprise ambush from rocks. Spear charge breaking encirclement, dust and fire sparks. Smart tactical camera pan following flanking movement, heroic turnaround.',
    voice:
      'Người Chỉ Huy kích hoạt kế hoạch bí mật — đòn phản công bất ngờ xé toang vòng vây của kẻ thù.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive slow motion climax. Commander stickman mid-leap with spear strike, enemy shield shattering, sand and embers frozen in slow-mo. Dramatic golden hour lighting, extreme close-up on stick faces, epic war trailer peak moment.',
    voice:
      'Cao trào trận chiến — thời gian như chậm lại, mỗi đòn đánh quyết định số phận bộ lạc.',
    durationSeconds: 6,
  },
  {
    prompt:
      'Stickman Primitive victory celebration. Tribe warriors around campfire at night, Commander stickman raises spear in triumph, stars and warm fire glow. Peaceful desert, gentle camera orbit, orange fire against dark blue sky, emotional ending.',
    voice:
      'Chiến thắng thuộc về bộ lạc — mọi người quây quanh lửa trại, ca mừng chiến binh dũng cảm đã bảo vệ quê hương.',
    durationSeconds: 6,
  },
];

/** Chuyển STICKMAN_DEMO_SCENES → danh sách cảnh tab Ảnh (title + prompt + voice) */
export function stickmanImageScenes(): StickmanImageScene[] {
  return STICKMAN_DEMO_SCENES.map((scene, i) => ({
    title: `[CẢNH ${i + 1}] ${STICKMAN_SCENE_TITLES[i]}`,
    videoPrompt: scene.prompt,
    voice: scene.voice,
  }));
}
