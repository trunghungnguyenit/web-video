'use client';

import { Gauge } from 'lucide-react';

const speedOptions = [
  { value: 0.75, label: '0.75x — Chậm' },
  { value: 1, label: '1x — Bình thường' },
  { value: 1.25, label: '1.25x — Hơi nhanh' },
  { value: 1.5, label: '1.5x — Nhanh' },
  { value: 2, label: '2x — Rất nhanh' },
];

interface VoiceSpeedPanelProps {
  onClose: () => void;
}

export function VoiceSpeedPanel({ onClose }: VoiceSpeedPanelProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tốc độ giọng</h3>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Đóng
        </button>
      </div>

      <p className="text-xs text-muted-foreground">Điều chỉnh tốc độ đọc cho voiceover (TTS) trong video</p>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
          Tốc độ đọc
        </label>
        <select className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50">
          {speedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
