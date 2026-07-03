'use client';

import { Clock } from 'lucide-react';

const defaultDurations = ['3 giây', '5 giây', '6 giây', '8 giây', '10 giây'];

const sceneDurations = [
  { id: 1, duration: 5 },
  { id: 2, duration: 6 },
  { id: 3, duration: 6 },
  { id: 4, duration: 6 },
  { id: 5, duration: 5 },
  { id: 6, duration: 5 },
  { id: 7, duration: 6 },
  { id: 8, duration: 6 },
  { id: 9, duration: 6 },
  { id: 10, duration: 8 },
];

interface SceneDurationPanelProps {
  onClose: () => void;
}

export function SceneDurationPanel({ onClose }: SceneDurationPanelProps) {
  const total = sceneDurations.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Độ dài từng cảnh</h3>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Đóng
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Thiết lập thời lượng cho từng cảnh — tổng: <span className="text-primary font-medium">{total}s</span>
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Độ dài mặc định cho cảnh mới
          </label>
          <select className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50">
            {defaultDurations.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <button className="px-4 py-2.5 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
          Áp dụng tất cả
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
          Danh sách cảnh
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {sceneDurations.map((scene) => (
            <div key={scene.id} className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg">
              <span className="text-xs font-bold text-primary">#{scene.id}</span>
              <input
                type="number"
                min={1}
                max={30}
                defaultValue={scene.duration}
                className="w-full bg-transparent text-sm text-foreground text-right focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">s</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
