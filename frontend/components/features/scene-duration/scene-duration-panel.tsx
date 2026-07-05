'use client';

import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const MIN_DURATION = 1;
const MAX_DURATION = 30;

interface SceneDuration {
  id: number;
  duration: number;
  error?: string;
}

const initialScenes: SceneDuration[] = [
  { id: 1, duration: 5 }, { id: 2, duration: 6 }, { id: 3, duration: 6 },
  { id: 4, duration: 6 }, { id: 5, duration: 5 }, { id: 6, duration: 5 },
  { id: 7, duration: 6 }, { id: 8, duration: 6 }, { id: 9, duration: 6 },
  { id: 10, duration: 8 },
];

const defaultOptions = [3, 5, 6, 8, 10];

interface SceneDurationPanelProps {
  onClose: () => void;
}

export function SceneDurationPanel({ onClose }: SceneDurationPanelProps) {
  const [scenes, setScenes] = useState<SceneDuration[]>(initialScenes);
  const [defaultDuration, setDefaultDuration] = useState(6);
  const [saved, setSaved] = useState(false);

  const total = scenes.reduce((sum, s) => sum + s.duration, 0);
  const hasErrors = scenes.some((s) => !!s.error);

  const validateDuration = (val: number, raw: string): string | undefined => {
    if (raw.trim() === '') return 'Không được để trống — nhập số giây từ 1 đến 30.';
    if (isNaN(val)) return `Giá trị "${raw}" không phải là số hợp lệ.`;
    if (val < MIN_DURATION) return `Quá ngắn — tối thiểu ${MIN_DURATION}s (nhập: ${val}s).`;
    if (val > MAX_DURATION) return `Quá dài — tối đa ${MAX_DURATION}s (nhập: ${val}s).`;
    if (!Number.isInteger(val)) return 'Chỉ chấp nhận số nguyên (không có phần thập phân).';
    return undefined;
  };

  const updateDuration = (id: number, raw: string) => {
    const num = parseInt(raw, 10);
    const error = validateDuration(num, raw);
    setScenes((prev) =>
      prev.map((s) => s.id === id ? { ...s, duration: isNaN(num) ? s.duration : num, error } : s),
    );
    setSaved(false);
  };

  const applyToAll = () => {
    setScenes((prev) => prev.map((s) => ({ ...s, duration: defaultDuration, error: undefined })));
    setSaved(false);
  };

  const handleSave = () => {
    if (hasErrors) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Độ dài từng cảnh</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
        >
          Đóng
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Thiết lập thời lượng từng cảnh (giây). Tổng:{' '}
        <span className={cn('font-semibold', total > 300 ? 'text-yellow-400' : 'text-primary')}>
          {total}s ({Math.floor(total / 60)}:{String(total % 60).padStart(2, '0')})
        </span>
      </p>

      {/* Apply all */}
      <div className="flex items-end gap-3 p-4 bg-background/50 border border-border/50 rounded-lg">
        <div className="flex-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Áp dụng cùng độ dài cho tất cả cảnh
          </label>
          <div className="flex gap-2 flex-wrap">
            {defaultOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDefaultDuration(opt)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  defaultDuration === opt
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
                )}
              >
                {opt}s
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={applyToAll}
          className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Áp dụng tất cả
        </button>
      </div>

      {/* Per-scene inputs */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
          Chỉnh từng cảnh
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 border rounded-lg transition-colors',
                scene.error
                  ? 'bg-destructive/5 border-destructive/50'
                  : 'bg-background border-border',
              )}
            >
              <span className="text-xs font-bold text-primary w-5 flex-shrink-0">#{scene.id}</span>
              <input
                type="number"
                min={MIN_DURATION}
                max={MAX_DURATION}
                value={scene.duration}
                onChange={(e) => updateDuration(scene.id, e.target.value)}
                className="w-full bg-transparent text-sm text-foreground text-right focus:outline-none min-w-0"
              />
              <span className="text-xs text-muted-foreground flex-shrink-0">s</span>
            </div>
          ))}
        </div>

        {/* Inline errors */}
        {hasErrors && (
          <div className="mt-3 space-y-1">
            {scenes
              .filter((s) => !!s.error)
              .map((s) => (
                <p key={s.id} className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Cảnh #{s.id}: {s.error}
                </p>
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {scenes.length} cảnh · {MIN_DURATION}–{MAX_DURATION}s mỗi cảnh
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={hasErrors}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            saved
              ? 'bg-green-600/20 border border-green-600/40 text-green-400 cursor-default'
              : hasErrors
                ? 'bg-muted border border-border text-muted-foreground cursor-not-allowed opacity-60'
                : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20',
          )}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Đã lưu</>
          ) : (
            'Lưu cài đặt'
          )}
        </button>
      </div>
    </div>
  );
}
