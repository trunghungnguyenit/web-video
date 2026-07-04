'use client';

import { useState } from 'react';
import { Palette, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StyleOption {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

const sceneStyles: StyleOption[] = [
  { id: 'cartoon-finance',  label: 'Cartoon Tài Chính',       emoji: '📊', desc: 'Nền trắng, dễ hiểu' },
  { id: 'chalk-dark',       label: 'Phác Thảo Phấn',          emoji: '✏️', desc: 'Nền tối, nhân sinh' },
  { id: '2d-explainer',     label: '2D Animation',            emoji: '🎬', desc: 'Explainer video' },
  { id: 'renaissance',      label: 'Renaissance',             emoji: '🖼️', desc: 'Caravaggio style' },
  { id: 'cinematic',        label: 'Cinematic Realism',       emoji: '🎥', desc: 'Chân thực, điện ảnh' },
  { id: 'dark-fantasy',     label: 'Dark Fantasy',            emoji: '🌑', desc: 'Gothic, huyền bí' },
  { id: 'watercolor',       label: 'Watercolor',              emoji: '🎨', desc: 'Màu nước nhẹ nhàng' },
  { id: 'flat-design',      label: 'Flat / Minimalist',       emoji: '⬜', desc: 'Phẳng, tối giản' },
  { id: 'anime',            label: 'Anime / Manga',           emoji: '🇯🇵', desc: 'Phong cách Nhật' },
  { id: 'oil-painting',     label: 'Oil Painting',            emoji: '🖌️', desc: 'Sơn dầu cổ điển' },
  { id: 'cyberpunk',        label: 'Cyberpunk / Neon',        emoji: '🌆', desc: 'Sci-Fi tương lai' },
  { id: 'comic',            label: 'Comic Book / Pop Art',    emoji: '💥', desc: 'Truyện tranh' },
];

interface SceneStylePanelProps {
  onClose: () => void;
}

export function SceneStylePanel({ onClose }: SceneStylePanelProps) {
  const [selected, setSelected] = useState('cinematic');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const current = sceneStyles.find((s) => s.id === selected);

  return (
    <div className="panel-card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-none">Phong cách cảnh</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Áp dụng cho toàn bộ video</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 px-2 py-1 rounded hover:bg-muted/50"
        >
          Đóng
        </button>
      </div>

      {/* Style grid */}
      <div>
        <p className="field-label mb-3">Chọn phong cách</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sceneStyles.map((style) => {
            const isActive = selected === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelected(style.id)}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/25'
                    : 'bg-background border-border hover:border-primary/30 hover:bg-muted/20',
                )}
              >
                <span className="text-base leading-none">{style.emoji}</span>
                <span className={cn('text-xs font-semibold leading-tight', isActive ? 'text-primary' : 'text-foreground')}>
                  {style.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">{style.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview label */}
      {current && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-base">{current.emoji}</span>
          <div>
            <span className="text-xs font-semibold text-primary">{current.label}</span>
            <span className="text-xs text-muted-foreground ml-2">{current.desc}</span>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
            saved
              ? 'bg-green-600/20 border border-green-600/40 text-green-400 cursor-default'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground',
          )}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" />Đã lưu</> : 'Áp dụng'}
        </button>
      </div>
    </div>
  );
}
