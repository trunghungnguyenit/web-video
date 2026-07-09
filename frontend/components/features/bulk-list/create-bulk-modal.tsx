'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceSelect } from '@/components/features/voice-select/voice-select';
import {
  ASPECT_RATIO_OPTIONS,
  DEFAULT_VIDEO_SETTINGS,
  LANGUAGE_OPTIONS,
  SCENE_COUNT_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  VIDEO_TYPE_OPTIONS,
  type VideoSettings,
} from '@/contexts/project-settings-context';
import { getSceneDurationOptions, normalizeSceneDurationSetting } from '@/lib/saved-scripts';
import { useDefaultVeoModel } from '@/hooks/use-veo-models';
import { useVeoModels } from '@/contexts/veo-models-context';
import { formatBulkTitle } from '@/lib/bulk-project';
import type { CreateBulkOptions } from '@/lib/bulk-project';

interface CreateBulkModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (options: CreateBulkOptions) => void;
}

const selectClass =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20';

export function CreateBulkModal({ open, onClose, onCreate }: CreateBulkModalProps) {
  const [title, setTitle] = useState('');
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  const { models: veoModels, loading: veoModelsLoading, hasKey: hasVeoKey } = useVeoModels();

  useDefaultVeoModel(
    veoModels,
    settings.videoQuality,
    settings.veoModel,
    (modelId) => setSettings((s) => ({ ...s, veoModel: modelId })),
  );

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setSettings({ ...DEFAULT_VIDEO_SETTINGS });
    setError(null);
  }, [open]);

  useEffect(() => {
    setSettings((prev) => {
      const next = normalizeSceneDurationSetting(prev.sceneDuration, prev.videoQuality);
      return next === prev.sceneDuration ? prev : { ...prev, sceneDuration: next };
    });
  }, [settings.videoQuality]);

  if (!open) return null;

  const sceneDurationOptions = getSceneDurationOptions(settings.videoQuality);

  const patch = (p: Partial<VideoSettings>) => setSettings((s) => ({ ...s, ...p }));

  const handleSubmit = () => {
    const name = title.trim();
    if (!name) {
      setError('Vui lòng đặt tên cho bulk.');
      return;
    }
    onCreate({ title: name, settings: { ...settings } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal
        aria-label="Tạo bulk mới"
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-foreground">Tạo Bulk mới</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Mỗi bulk chạy prompt và cài đặt riêng — có thể tạo nhiều bulk song song (vd: chiến tranh / hoạt hình).
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tên bulk <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null); }}
              placeholder={formatBulkTitle()}
              maxLength={80}
              className={cn(selectClass, error && 'border-destructive')}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngôn ngữ">
              <select value={settings.language} onChange={(e) => patch({ language: e.target.value })} className={selectClass}>
                {LANGUAGE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Số cảnh">
              <select value={settings.sceneCount} onChange={(e) => patch({ sceneCount: e.target.value })} className={selectClass}>
                {SCENE_COUNT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Kiểu video">
              <select value={settings.videoType} onChange={(e) => patch({ videoType: e.target.value })} className={selectClass}>
                {VIDEO_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Tỷ lệ">
              <select value={settings.aspectRatio} onChange={(e) => patch({ aspectRatio: e.target.value })} className={selectClass}>
                {ASPECT_RATIO_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Chất lượng">
              <select value={settings.videoQuality} onChange={(e) => patch({ videoQuality: e.target.value })} className={selectClass}>
                {VIDEO_QUALITY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Thời lượng cảnh">
              <select
                value={settings.sceneDuration}
                onChange={(e) => patch({ sceneDuration: e.target.value })}
                disabled={settings.videoQuality === '1080p'}
                className={selectClass}
              >
                {sceneDurationOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            {hasVeoKey && (
              <Field label="Model Veo" className="col-span-2">
                <div className="relative">
                  <select
                    value={settings.veoModel}
                    onChange={(e) => patch({ veoModel: e.target.value })}
                    disabled={veoModelsLoading || veoModels.length === 0}
                    className={selectClass}
                  >
                    {veoModelsLoading && <option value="">Đang tải...</option>}
                    {!veoModelsLoading && veoModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </select>
                  {veoModelsLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                  )}
                </div>
              </Field>
            )}
            <Field label="Giọng đọc" className="col-span-2">
              <VoiceSelect
                value={settings.voice}
                onChange={(voice) => patch({ voice })}
                language={settings.language}
                voiceSpeed={settings.voiceSpeed}
              />
            </Field>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-5 py-4 border-t border-border bg-card/95 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Tạo &amp; bắt đầu
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
