'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, User, FileText, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PresetScript } from '@/lib/preset-scripts';
import { ASPECT_RATIO_OPTIONS, VIDEO_QUALITY_OPTIONS, getSceneDurationOptions, normalizeSceneDurationSetting } from '@/lib/saved-scripts';
import { VoiceSelect } from '@/components/features/voice-select/voice-select';
import { useDefaultVeoModel, useVeoModels } from '@/hooks/use-veo-models';
interface PresetScriptModalProps {
  preset: PresetScript | null;
  onClose: () => void;
  onApply: (preset: PresetScript) => void;
}

type Section = 'character' | 'input' | 'none';
export function PresetScriptModal({ preset, onClose, onApply }: PresetScriptModalProps) {
  // Bản chỉnh sửa — clone để user có thể sửa mà không ảnh hưởng dữ liệu gốc
  const [draft, setDraft] = useState<PresetScript | null>(null);
  const [openSection, setOpenSection] = useState<Section>('character');

  useEffect(() => {
    if (preset) {
      // Deep clone
      setDraft(JSON.parse(JSON.stringify(preset)));
      setOpenSection('character');
    }
  }, [preset]);

  // Đóng bằng Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (preset) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [preset, onClose]);

  const resetToOriginal = useCallback(() => {
    if (preset) setDraft(JSON.parse(JSON.stringify(preset)));
  }, [preset]);

  const { models: veoModels, loading: veoModelsLoading, hasKey: hasVeoKey } = useVeoModels();

  const pickVeoModel = useCallback((modelId: string) => {
    setDraft((d) => d ? { ...d, input: { ...d.input, veoModel: modelId } } : d);
  }, []);

  useDefaultVeoModel(
    veoModels,
    draft?.input.videoQuality ?? '720p',
    draft?.input.veoModel ?? '',
    pickVeoModel,
  );

  useEffect(() => {
    setDraft((d) => {
      if (!d) return d;
      const next = normalizeSceneDurationSetting(d.input.sceneDuration, d.input.videoQuality);
      return next === d.input.sceneDuration ? d : { ...d, input: { ...d.input, sceneDuration: next } };
    });
  }, [draft?.input.videoQuality]);

  if (!preset || !draft) return null;

  const sceneDurationOptions = getSceneDurationOptions(draft.input.videoQuality ?? '720p');

  const setChar = (field: keyof PresetScript['character'], value: string) => {
    setDraft((d) => d ? { ...d, character: { ...d.character, [field]: value } } : d);
  };

  const setInput = (field: keyof PresetScript['input'], value: string) => {
    setDraft((d) => d ? { ...d, input: { ...d.input, [field]: value } } : d);
  };

  const handleApply = () => {
    if (draft) onApply(draft);
  };

  const toggleSection = (s: Section) =>
    setOpenSection((prev) => (prev === s ? 'none' : s));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Kịch bản mẫu: ${preset.title}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl leading-none">{preset.badge.split(' ')[0]}</span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground leading-none">{preset.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{preset.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={resetToOriginal}
              title="Khôi phục nội dung gốc"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khôi phục</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Info banner */}
          <div className="mx-6 mt-4 mb-2 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-primary font-semibold">Kịch bản mẫu</span> — Áp dụng sẽ điền nhân vật, nội dung và cài đặt vào mục 1 &amp; 2.
              Nhấn <strong className="text-foreground">Phân tích &amp; Tạo Kịch Bản</strong> ở mục 2 để AI sinh danh sách cảnh và timeline.
            </p>
          </div>
          {/* ── Section 1: Character ───────────────────────────────────── */}
          <div className="mx-6 mt-4 border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('character')}
              className="w-full flex items-center justify-between px-4 py-3 bg-background/50 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">1. Nhân vật chính</span>
                <span className="text-xs text-muted-foreground">({draft.characters.length} nhân vật demo)</span>              </div>
              {openSection === 'character'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </button>

            {openSection === 'character' && (
              <div className="px-4 py-4 space-y-3 border-t border-border">
                {draft.characters.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/50">
                    {draft.characters.map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-muted/50 text-muted-foreground border border-border">
                        {c.name.split('—')[0]?.trim() || c.name}
                      </span>
                    ))}
                  </div>
                )}                {/* Name */}
                <div>
                  <label className="field-label block mb-1.5">Tên nhân vật</label>
                  <input
                    type="text"
                    value={draft.character.name}
                    onChange={(e) => setChar('name', e.target.value)}
                    maxLength={80}
                    className="input-base"
                  />
                </div>

                {/* Role / Traits / Outfit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { field: 'role' as const,   label: 'Vai trò' },
                    { field: 'traits' as const,  label: 'Đặc điểm' },
                    { field: 'outfit' as const,  label: 'Trang phục' },
                  ]).map(({ field, label }) => (
                    <div key={field}>
                      <label className="field-label block mb-1.5">{label}</label>
                      <input
                        type="text"
                        value={draft.character[field]}
                        onChange={(e) => setChar(field, e.target.value)}
                        maxLength={100}
                        className="input-base"
                      />
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="field-label">Mô tả chi tiết</label>
                    <span className={cn(
                      'text-xs tabular-nums',
                      draft.character.description.length > 450 ? 'text-destructive' : 'text-muted-foreground',
                    )}>
                      {draft.character.description.length}/500
                    </span>
                  </div>
                  <textarea
                    value={draft.character.description}
                    onChange={(e) => setChar('description', e.target.value.slice(0, 500))}
                    rows={3}
                    className="input-base resize-none"
                  />
                </div>

                {/* Style */}
                <div>
                  <label className="field-label block mb-1.5">Phong cách hình ảnh</label>
                  <select
                    value={draft.character.style}
                    onChange={(e) => setChar('style', e.target.value)}
                    className="input-base"
                  >
                    {['Realistic', 'Cinematic', 'Anime / Manga', 'Cartoon', 'Oil Painting',
                      'Watercolor', 'Flat Design', 'Cyberpunk'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 2: Input content ──────────────────────────────── */}
          <div className="mx-6 mt-3 border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('input')}
              className="w-full flex items-center justify-between px-4 py-3 bg-background/50 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">2. Nội dung &amp; cài đặt</span>
                <span className="text-xs text-muted-foreground">({draft.input.sceneCount} cảnh · {draft.input.videoType})</span>
              </div>
              {openSection === 'input'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </button>

            {openSection === 'input' && (
              <div className="px-4 py-4 space-y-3 border-t border-border">
                {/* Content */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="field-label">Nội dung kịch bản</label>
                    <span className={cn(
                      'text-xs tabular-nums',
                      draft.input.content.length > 4500 ? 'text-destructive' : 'text-muted-foreground',
                    )}>
                      {draft.input.content.length}/5000
                    </span>
                  </div>
                  <textarea
                    value={draft.input.content}
                    onChange={(e) => setInput('content', e.target.value.slice(0, 5000))}
                    rows={8}
                    className="input-base resize-y min-h-[120px]"
                    placeholder="Nội dung kịch bản..."
                  />
                </div>

                {/* Config — layout giống form chính (mục 2) */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="field-label block mb-1.5">Ngôn ngữ</label>
                      <select value={draft.input.language} onChange={(e) => setInput('language', e.target.value)} className="input-base w-full min-w-0">
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                        <option value="ja">日本語</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label block mb-1.5">Số lượng cảnh</label>
                      <select value={draft.input.sceneCount} onChange={(e) => setInput('sceneCount', e.target.value)} className="input-base w-full min-w-0">
                        <option value="3">3 cảnh</option>
                        <option value="5">5 cảnh</option>
                        <option value="8">8 cảnh</option>
                        <option value="10">10 cảnh</option>
                        <option value="15">15 cảnh</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label block mb-1.5">Kiểu video</label>
                      <select value={draft.input.videoType} onChange={(e) => setInput('videoType', e.target.value)} className="input-base w-full min-w-0">
                        <option value="storytelling">Kể chuyện</option>
                        <option value="tutorial">Hướng dẫn</option>
                        <option value="ads">Quảng cáo</option>
                        <option value="review">Review</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label block mb-1.5">Tỷ lệ video</label>
                      <select value={draft.input.aspectRatio ?? '16:9'} onChange={(e) => setInput('aspectRatio', e.target.value)} className="input-base w-full min-w-0">
                        {ASPECT_RATIO_OPTIONS.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label block mb-1.5">Thời lượng cảnh</label>
                      <select
                        value={draft.input.sceneDuration ?? '6'}
                        onChange={(e) => setInput('sceneDuration', e.target.value)}
                        disabled={draft.input.videoQuality === '1080p'}
                        className="input-base w-full min-w-0 disabled:opacity-60"
                      >
                        {sceneDurationOptions.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label block mb-1.5">Chất lượng video</label>
                      <select value={draft.input.videoQuality ?? '720p'} onChange={(e) => setInput('videoQuality', e.target.value)} className="input-base w-full min-w-0">
                        {VIDEO_QUALITY_OPTIONS.map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {hasVeoKey && (
                    <div>
                      <label className="field-label block mb-1.5">Model Veo</label>
                      <div className="relative">
                        <select
                          value={draft.input.veoModel ?? ''}
                          onChange={(e) => setInput('veoModel', e.target.value)}
                          disabled={veoModelsLoading || veoModels.length === 0}
                          className="input-base w-full min-w-0 disabled:opacity-60"
                        >
                          {veoModelsLoading && <option value="">Đang tải model...</option>}
                          {!veoModelsLoading && veoModels.map((m) => (
                            <option key={m.id} value={m.id}>{m.displayName}</option>
                          ))}
                        </select>
                        {veoModelsLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin pointer-events-none" />
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="field-label block mb-1.5">Giọng đọc</label>
                    <VoiceSelect
                      value={draft.input.voice}
                      onChange={(voice) => setInput('voice', voice)}
                      language={draft.input.language}
                      voiceSpeed={draft.input.voiceSpeed ?? 1}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-6" />
        </div>
        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-background/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 rounded-xl transition-colors cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Áp dụng kịch bản
          </button>
        </div>
      </div>
    </div>
  );
}
