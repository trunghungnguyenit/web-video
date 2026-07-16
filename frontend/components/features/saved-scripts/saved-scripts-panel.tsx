'use client';

import { useState, useCallback } from 'react';
import {
  BookOpen, Pencil, Trash2, CheckCircle2,
  Clock, ChevronRight, X, RotateCcw, Search, FileText,
} from 'lucide-react';
import { cn, formatCount } from '@/lib/utils';
import { FieldError } from '@/components/ui/field-error';
import { ModalOverlay } from '@/components/ui/modal-overlay';
import type { SavedScript, SavedScriptMeta } from '@/lib/saved-scripts/saved-scripts';
import {
  VIDEO_TYPE_LABELS, LANGUAGE_LABELS, SCENE_COUNT_LABELS,
  ASPECT_RATIO_LABELS, SCENE_DURATION_LABELS, VIDEO_QUALITY_LABELS,
  formatRelativeDate, formatSceneCount, formatAspectRatio, formatSceneDuration,
} from '@/lib/saved-scripts/saved-scripts';
import { VoiceSelect } from '@/components/features/voice-select/voice-select';

// ─── Validation ───────────────────────────────────────────────────────────────

interface EditErrors {
  title?: string;
  content?: string;
}

function validateEdit(title: string, content: string): EditErrors {
  const errs: EditErrors = {};
  if (!title.trim()) errs.title = 'Tiêu đề không được để trống.';
  else if (title.trim().length < 3) errs.title = 'Tiêu đề cần ít nhất 3 ký tự.';
  else if (title.trim().length > 80) errs.title = 'Tiêu đề tối đa 80 ký tự.';

  if (!content.trim()) errs.content = 'Nội dung kịch bản không được để trống.';
  else if (content.trim().length < 10) errs.content = 'Nội dung quá ngắn — cần ít nhất 10 ký tự.';

  return errs;
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  script: SavedScript;
  onClose: () => void;
  onSave: (updated: SavedScript) => void;
}

function EditModal({ script, onClose, onSave }: EditModalProps) {
  const [title, setTitle] = useState(script.title);
  const [content, setContent] = useState(script.content);
  const [meta, setMeta] = useState<SavedScriptMeta>({
    ...script.meta,
    aspectRatio: script.meta.aspectRatio ?? '16:9',
    sceneDuration: script.meta.sceneDuration ?? '6',
  });
  const [errors, setErrors] = useState<EditErrors>({});
  const [dirty, setDirty] = useState(false);

  const setM = (k: keyof SavedScriptMeta, v: string) => {
    setMeta((m) => ({ ...m, [k]: v }));
    setDirty(true);
  };

  const handleSave = () => {
    const errs = validateEdit(title, content);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({
      ...script,
      title: title.trim(),
      content: content.trim(),
      meta,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleReset = () => {
    setTitle(script.title);
    setContent(script.content);
    setMeta({ ...script.meta });
    setErrors({});
    setDirty(false);
  };

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const charCount = content.length;
  const MAX = 5000;

  return (
    <ModalOverlay onClose={onClose} onKeyDown={handleKeyDown}>
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl"
        role="dialog"
        aria-modal
        aria-label={`Chỉnh sửa: ${script.title}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Chỉnh sửa kịch bản</h2>
            {dirty && (
              <span className="text-[10px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                Chưa lưu
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleReset}
              title="Khôi phục về trạng thái ban đầu"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khôi phục</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tiêu đề <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); setErrors((p) => ({ ...p, title: undefined })); }}
              placeholder="Tiêu đề kịch bản..."
              className={cn(
                'w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 transition-colors',
                errors.title
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/25'
                  : 'border-border focus:border-primary/50 focus:ring-primary/20',
              )}
            />
            {errors.title && <FieldError className="items-center">{errors.title}</FieldError>}
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nội dung <span className="text-destructive">*</span>
              </label>
              <span className={cn(
                'text-xs tabular-nums',
                charCount > MAX * 0.9 ? 'text-destructive' : charCount > MAX * 0.7 ? 'text-yellow-400' : 'text-muted-foreground',
              )}>
                {formatCount(charCount)} / {formatCount(MAX)}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= MAX) {
                  setContent(e.target.value);
                  setDirty(true);
                  setErrors((p) => ({ ...p, content: undefined }));
                }
              }}
              rows={10}
              placeholder="Nội dung kịch bản..."
              className={cn(
                'w-full px-3 py-2.5 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 transition-colors resize-y min-h-[120px]',
                errors.content
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/25'
                  : 'border-border focus:border-primary/50 focus:ring-primary/20',
              )}
            />
            {errors.content && <FieldError>{errors.content}</FieldError>}
          </div>

          {/* Meta settings */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { key: 'language' as const, label: 'Ngôn ngữ', options: LANGUAGE_LABELS },
              { key: 'sceneCount' as const, label: 'Số lượng cảnh', options: SCENE_COUNT_LABELS },
              { key: 'videoType' as const, label: 'Kiểu video', options: VIDEO_TYPE_LABELS },
              { key: 'aspectRatio' as const, label: 'Tỷ lệ video', options: ASPECT_RATIO_LABELS },
              { key: 'sceneDuration' as const, label: 'Thời lượng cảnh', options: SCENE_DURATION_LABELS },
              { key: 'videoQuality' as const, label: 'Chất lượng video', options: VIDEO_QUALITY_LABELS },
            ].map(({ key, label, options }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <select
                  value={meta[key]}
                  onChange={(e) => setM(key, e.target.value)}
                  className="w-full px-2.5 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  {Object.entries(options).map(([v, lbl]) => (
                    <option key={v} value={v}>{lbl}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 mt-3">
            <label className="text-xs font-medium text-muted-foreground">Giọng đọc</label>
            <VoiceSelect
              value={meta.voice}
              onChange={(voice) => setM('voice', voice)}
              language={meta.language}
              compact
              selectClassName="w-full px-2.5 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-background/50 flex-shrink-0">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Cập nhật lần cuối: {formatRelativeDate(script.updatedAt)}
          </p>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  scriptTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ scriptTitle, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <ModalOverlay onClose={onCancel} backdropClassName="bg-black/60 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-destructive/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">Xóa kịch bản?</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Kịch bản <span className="text-foreground font-medium">"{scriptTitle}"</span> sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-destructive/90 hover:bg-destructive text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface SavedScriptsPanelProps {
  scripts: SavedScript[];
  onApply: (script: SavedScript) => void;
  onUpdate: (updated: SavedScript) => void;
  onDelete: (id: string) => void;
}

export function SavedScriptsPanel({
  scripts,
  onApply,
  onUpdate,
  onDelete,
}: SavedScriptsPanelProps) {
  const [editTarget, setEditTarget] = useState<SavedScript | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedScript | null>(null);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState<string | null>(null);

  const filtered = scripts.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase()),
  );

  const handleApply = useCallback((script: SavedScript) => {
    onApply(script);
    setApplied(script.id);
    setTimeout(() => setApplied(null), 2500);
  }, [onApply]);

  const handleSaveEdit = useCallback((updated: SavedScript) => {
    onUpdate(updated);
    setEditTarget(null);
  }, [onUpdate]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDelete]);

  if (scripts.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 bg-muted/30 rounded-2xl flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Chưa có kịch bản nào được lưu</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Nhập nội dung và nhấn <span className="text-primary">"Lưu kịch bản"</span> để lưu lại
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Search */}
        {scripts.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kịch bản..."
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Result count khi search */}
        {search && (
          <p className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? 'Không tìm thấy kịch bản phù hợp'
              : `${filtered.length} kết quả cho "${search}"`}
          </p>
        )}

        {/* Script list */}
        <div className="space-y-2">
          {filtered.map((script) => {
            const isApplied = applied === script.id;

            return (
              <div
                key={script.id}
                className={cn(
                  'group bg-background/50 border rounded-xl p-3.5 transition-all duration-150',
                  isApplied
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border hover:border-primary/30 hover:bg-background/80',
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                    isApplied ? 'bg-green-500/15' : 'bg-primary/10',
                  )}>
                    {isApplied
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <FileText className="w-4 h-4 text-primary/70" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground leading-snug truncate">
                        {script.title}
                      </h4>
                      {isApplied && (
                        <span className="flex-shrink-0 text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">
                          Đã áp dụng
                        </span>
                      )}
                    </div>

                    {/* Preview */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {script.content}
                    </p>

                    {/* Meta tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
                        {LANGUAGE_LABELS[script.meta.language] ?? script.meta.language}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
                        {VIDEO_TYPE_LABELS[script.meta.videoType] ?? script.meta.videoType}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
                        {formatSceneCount(script.meta.sceneCount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
                        {formatAspectRatio(script.meta.aspectRatio ?? '16:9')}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
                        {formatSceneDuration(script.meta.sceneDuration ?? '6')}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/50 ml-auto">
                        <Clock className="w-3 h-3" />
                        {formatRelativeDate(script.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  {/* Apply */}
                  <button
                    type="button"
                    onClick={() => handleApply(script)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      isApplied
                        ? 'bg-green-500/10 border border-green-500/25 text-green-400 cursor-default'
                        : 'bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20',
                    )}
                  >
                    {isApplied
                      ? <><CheckCircle2 className="w-3.5 h-3.5" />Đã áp dụng</>
                      : <><ChevronRight className="w-3.5 h-3.5" />Sử dụng kịch bản</>
                    }
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => setEditTarget(script)}
                    title="Chỉnh sửa"
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(script)}
                    title="Xóa kịch bản"
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {editTarget && (
        <EditModal
          script={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          scriptTitle={deleteTarget.title}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
