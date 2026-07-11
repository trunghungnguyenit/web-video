// ─── Phong cách hình ảnh cho cảnh — dùng chung input-section + video-item-modal ─

export interface SceneStyle {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

export const SCENE_STYLES: SceneStyle[] = [
  { id: 'cinematic',       label: 'Cinematic',        emoji: '🎥', desc: 'Chân thực, điện ảnh' },
  { id: 'cartoon-finance', label: 'Cartoon',           emoji: '📊', desc: 'Nền trắng, dễ hiểu' },
  { id: '2d-explainer',   label: '2D Animation',      emoji: '🎬', desc: 'Explainer video' },
  { id: 'dark-fantasy',   label: 'Dark Fantasy',      emoji: '🌑', desc: 'Gothic, huyền bí' },
  { id: 'watercolor',     label: 'Watercolor',        emoji: '🎨', desc: 'Màu nước nhẹ nhàng' },
  { id: 'flat-design',    label: 'Flat Design',       emoji: '⬜', desc: 'Phẳng, tối giản' },
  { id: 'anime',          label: 'Anime / Manga',     emoji: '🇯🇵', desc: 'Phong cách Nhật' },
  { id: 'cyberpunk',      label: 'Cyberpunk',         emoji: '🌆', desc: 'Sci-Fi tương lai' },
  { id: 'oil-painting',   label: 'Oil Painting',      emoji: '🖌️', desc: 'Sơn dầu cổ điển' },
  { id: 'chalk-dark',     label: 'Chalk / Sketch',    emoji: '✏️', desc: 'Nền tối, phác thảo' },
  { id: 'renaissance',    label: 'Renaissance',       emoji: '🖼️', desc: 'Caravaggio style' },
  { id: 'comic',          label: 'Comic / Pop Art',   emoji: '💥', desc: 'Truyện tranh' },
];

export function resolveSceneStyleLabel(sceneStyleId: string): string {
  return SCENE_STYLES.find((s) => s.id === sceneStyleId)?.label ?? sceneStyleId;
}
