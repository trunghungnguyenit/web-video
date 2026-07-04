'use client';

import { useState } from 'react';
import { Gauge, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const speedOptions = [
  { value: 0.75, label: '0.75×', desc: 'Chậm' },
  { value: 1,    label: '1×',    desc: 'Bình thường' },
  { value: 1.25, label: '1.25×', desc: 'Hơi nhanh' },
  { value: 1.5,  label: '1.5×',  desc: 'Nhanh' },
  { value: 2,    label: '2×',    desc: 'Rất nhanh' },
];

interface VoiceSpeedPanelProps {
  onClose: () => void;
}

export function VoiceSpeedPanel({ onClose }: VoiceSpeedPanelProps) {
  const [selected, setSelected] = useState(1);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <div className="panel-card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-none">Tốc độ giọng</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Voiceover TTS</p>
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

      {/* Speed selector — pill buttons */}
      <div>
        <p className="field-label mb-3">Tốc độ đọc</p>
        <div className="flex gap-2 flex-wrap">
          {speedOptions.map((opt) => {
            const isActive = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className={cn(
                  'flex flex-col items-center px-4 py-2.5 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'bg-primary/15 border-primary/50 text-primary ring-1 ring-primary/25'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
                )}
              >
                <span className="text-sm font-bold">{opt.label}</span>
                <span className="mt-0.5 opacity-70">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border border-border/50">
        <Gauge className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((selected - 0.75) / (2 - 0.75)) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-primary font-semibold w-10 text-right">{selected}×</span>
      </div>

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
