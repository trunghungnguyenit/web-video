'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, User, FileText, CheckCircle2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PresetScript } from '@/lib/preset-scripts';

interface PresetScriptModalProps {
  preset: PresetScript | null;
  onClose: () => void;
  onApply: (preset: PresetScript) => void;
}

type Section = 'character' | 'input';

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

  if (!preset || !draft) return null;

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
    setOpenSection((prev) => (prev === s ? ('none' as Section) : s));

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
        className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl"
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
          <div className="mx-6 mt-4 mb-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground leading-relaxed">
            Đọc và chỉnh sửa nội dung bên dưới theo ý muốn. Nhấn{' '}
            <span className="text-primary font-semibold">Áp dụng kịch bản</span> để điền vào các trường tương ứng.
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
                <span className="text-xs text-muted-foreground">(Master Character)</span>
              </div>
              {openSection === 'character'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </button>

            {openSection === 'character' && (
              <div className="px-4 py-4 space-y-3 border-t border-border">
                {/* Name */}
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
          <div className="mx-6 mt-3 mb-6 border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('input')}
              className="w-full flex items-center justify-between px-4 py-3 bg-background/50 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">2. Nội dung video</span>
                <span className="text-xs text-muted-foreground">(Input Section)</span>
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

                {/* Config row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="field-label block mb-1.5">Ngôn ngữ</label>
                    <select value={draft.input.language} onChange={(e) => setInput('language', e.target.value)} className="input-base">
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label block mb-1.5">Độ dài</label>
                    <select value={draft.input.duration} onChange={(e) => setInput('duration', e.target.value)} className="input-base">
                      <option value="1-3">1 – 3 phút</option>
                      <option value="5-10">5 – 10 phút</option>
                      <option value="10-20">10 – 20 phút</option>
                      <option value="20-30">20 – 30 phút</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label block mb-1.5">Kiểu video</label>
                    <select value={draft.input.videoType} onChange={(e) => setInput('videoType', e.target.value)} className="input-base">
                      <option value="storytelling">Kể chuyện</option>
                      <option value="tutorial">Hướng dẫn</option>
                      <option value="ads">Quảng cáo</option>
                      <option value="review">Review</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label block mb-1.5">Giọng đọc</label>
                    <select value={draft.input.voice} onChange={(e) => setInput('voice', e.target.value)} className="input-base">
                      <option value="male-natural">Nam – tự nhiên</option>
                      <option value="female-natural">Nữ – tự nhiên</option>
                      <option value="male-pro">Nam – chuyên nghiệp</option>
                      <option value="female-young">Nữ – trẻ trung</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
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
