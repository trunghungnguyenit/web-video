'use client';

import { Palette } from 'lucide-react';

const sceneStyles = [
  'Cartoon Explainer Tài Chính (nền trắng)',
  'Phác Thảo Phấn Nền Tối (đạo lý / nhân sinh)',
  '2D Animation Explainer',
  'Renaissance + Caravaggio',
  'Cinematic Realism',
  'Dark Fantasy / Gothic',
  'Watercolor Illustration',
  'Flat Design / Minimalist',
  'Anime / Manga',
  'Oil Painting Classical',
  'Cyberpunk / Neon Sci-Fi',
  'Comic Book / Pop Art',
];

interface SceneStylePanelProps {
  onClose: () => void;
}

export function SceneStylePanel({ onClose }: SceneStylePanelProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Phong cách cảnh</h3>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Đóng
        </button>
      </div>

      <p className="text-xs text-muted-foreground">Chọn phong cách hình ảnh áp dụng cho tất cả các cảnh trong video</p>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
          Phong cách cảnh
        </label>
        <select
          defaultValue="Cinematic Realism"
          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
        >
          {sceneStyles.map((style) => (
            <option key={style}>{style}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
