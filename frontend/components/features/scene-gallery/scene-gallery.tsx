'use client';

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  ImageIcon, AlertCircle, Loader2, CheckCircle2, Pencil, RefreshCw, Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoScene } from '@/lib/scenes';
import { formatSceneTimeRange, recalculateSceneTimings } from '@/lib/scenes';
import { createScenePlaceholderVideo, revokeSceneVideoUrl } from '@/lib/scene-video-placeholder';
import { SceneToolbar } from './scene-toolbar';

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface SceneEditModalProps {
  scene: VideoScene;
  onClose: () => void;
  onSave: (updated: Pick<VideoScene, 'prompt' | 'voice'>) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function SceneEditModal({ scene, onClose, onSave, onRegenerate, isRegenerating }: SceneEditModalProps) {
  const [prompt, setPrompt] = useState(scene.prompt);
  const [voice, setVoice] = useState(scene.voice);
  const [errors, setErrors] = useState<{ prompt?: string; voice?: string }>({});

  const handleSave = () => {
    const errs: typeof errors = {};
    if (!prompt.trim()) errs.prompt = 'Video prompt không được để trống.';
    if (!voice.trim()) errs.voice = 'Lời thoại TTS không được để trống.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({ prompt: prompt.trim(), voice: voice.trim() });
  };

  const isDirty = prompt.trim() !== scene.prompt || voice.trim() !== scene.voice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl flex flex-col shadow-2xl"
        role="dialog"
        aria-modal
        aria-label={`Chỉnh sửa cảnh ${scene.index}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Cảnh {scene.index} — Chỉnh sửa</h3>
            {isDirty && (
              <span className="text-[10px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                Chưa lưu
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none px-2"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Video Prompt <span className="text-destructive">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setErrors((p) => ({ ...p, prompt: undefined })); }}
              rows={4}
              maxLength={500}
              placeholder="Mô tả hình ảnh / chuyển động cho AI tạo video..."
              className={cn(
                'w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-1 transition-colors',
                errors.prompt
                  ? 'border-destructive focus:ring-destructive/25'
                  : 'border-border focus:border-primary/50 focus:ring-primary/20',
              )}
            />
            {errors.prompt && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5" />{errors.prompt}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Voice (TTS) <span className="text-destructive">*</span>
            </label>
            <textarea
              value={voice}
              onChange={(e) => { setVoice(e.target.value); setErrors((p) => ({ ...p, voice: undefined })); }}
              rows={3}
              maxLength={400}
              placeholder="Lời thoại / narration cho cảnh này..."
              className={cn(
                'w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-1 transition-colors',
                errors.voice
                  ? 'border-destructive focus:ring-destructive/25'
                  : 'border-border focus:border-primary/50 focus:ring-primary/20',
              )}
            />
            {errors.voice && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5" />{errors.voice}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border bg-background/50">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin')} />
            {isRegenerating ? 'Đang tạo lại...' : 'Tạo lại video'}
          </button>
          <div className="flex gap-2">
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
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VideoScene['status'] }) {
  if (status === 'error') {
    return (
      <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-destructive/90 rounded text-[10px] font-medium text-white">
        <AlertCircle className="w-3 h-3" />
        Lỗi
      </span>
    );
  }
  if (status === 'generating') {
    return (
      <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-primary/90 rounded text-[10px] font-medium text-white">
        <Loader2 className="w-3 h-3 animate-spin" />
        Đang tạo...
      </span>
    );
  }
  if (status === 'edited') {
    return (
      <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/90 rounded text-[10px] font-medium text-white">
        <Pencil className="w-3 h-3" />
        Đã sửa
      </span>
    );
  }
  return (
    <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-green-600/90 rounded text-[10px] font-medium text-white">
      <CheckCircle2 className="w-3 h-3" />
      OK
    </span>
  );
}

// ─── Scene Gallery ────────────────────────────────────────────────────────────

interface SceneGalleryProps {
  scenes: VideoScene[];
  onScenesChange: Dispatch<SetStateAction<VideoScene[]>>;
}

export function SceneGallery({ scenes, onScenesChange }: SceneGalleryProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingIds, setRegeneratingIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<VideoScene | null>(null);

  const errorScenes = scenes.filter((s) => s.status === 'error');
  const editedScenes = scenes.filter((s) => s.status === 'edited');
  const allSelected = selectedIds.length === scenes.length && scenes.length > 0;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleScene = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const regenerateScenes = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    setIsRegenerating(true);
    setRegeneratingIds(ids);
    onScenesChange((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'generating' as const } : s)),
    );

    await new Promise((r) => setTimeout(r, 1200));

    const updated = await Promise.all(
      ids.map(async (id) => {
        const scene = scenes.find((s) => s.id === id);
        if (!scene) return null;
        revokeSceneVideoUrl(scene.videoUrl);
        try {
          const videoUrl = await createScenePlaceholderVideo(scene);
          return { id, videoUrl, status: 'success' as const };
        } catch {
          return { id, videoUrl: undefined, status: 'error' as const };
        }
      }),
    );

    onScenesChange((prev) =>
      recalculateSceneTimings(
        prev.map((s) => {
          const patch = updated.find((u) => u?.id === s.id);
          if (!patch) return s;
          return { ...s, videoUrl: patch.videoUrl, status: patch.status };
        }),
      ),
    );
    setIsRegenerating(false);
    setRegeneratingIds([]);
    showToast(`Đã tạo lại ${ids.length} cảnh thành công`);
  }, [onScenesChange, scenes]);

  const handleSaveEdit = (id: string, data: Pick<VideoScene, 'prompt' | 'voice'>) => {
    const words = data.voice.split(/\s+/).filter(Boolean).length;
    const durationSeconds = Math.min(8, Math.max(5, Math.round(words / 2.5) || 5));
    onScenesChange((prev) =>
      recalculateSceneTimings(
        prev.map((s) =>
          s.id === id
            ? { ...s, ...data, durationSeconds, status: 'edited' as const }
            : s,
        ),
      ),
    );
    setEditTarget(null);
    showToast('Đã lưu — bấm "Tạo lại video" để render cảnh đã sửa');
  };

  const handleSceneAction = (action: string) => {
    if (action === 'regen-error') {
      const targets =
        selectedIds.length > 0
          ? scenes.filter((s) =>
              selectedIds.includes(s.id) && (s.status === 'error' || s.status === 'edited'),
            ).map((s) => s.id)
          : [...errorScenes, ...editedScenes].map((s) => s.id);

      if (targets.length === 0) {
        showToast('Không có cảnh lỗi hoặc đã sửa cần tạo lại');
        return;
      }
      regenerateScenes(targets);
      return;
    }

    if (action === 'delete' && selectedIds.length > 0) {
      const count = selectedIds.length;
      onScenesChange((prev) => recalculateSceneTimings(prev.filter((s) => !selectedIds.includes(s.id))));
      setSelectedIds([]);
      showToast(`Đã xóa ${count} cảnh`);
    }
  };

  const handleBulkAction = (action: string) => {
    if (action === 'select-all') {
      setSelectedIds(scenes.map((s) => s.id));
      showToast(`Đã chọn tất cả ${scenes.length} cảnh`);
      return;
    }
    if (action === 'deselect-all') {
      setSelectedIds([]);
      return;
    }
    if (action === 'delete-bulk' && selectedIds.length > 0) {
      const count = selectedIds.length;
      onScenesChange((prev) => recalculateSceneTimings(prev.filter((s) => !selectedIds.includes(s.id))));
      showToast(`Đã xóa ${count} cảnh`);
      setSelectedIds([]);
    }
  };

  if (scenes.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
          3. DANH SÁCH CẢNH
        </h2>
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
            <Film className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Chưa có cảnh video</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Hoàn thành mục 2 — bấm <strong className="text-primary">Phân Tích &amp; Tạo Kịch Bản</strong> để AI sinh danh sách cảnh
              với số lượng tương ứng, kèm Video Prompt và Voice (TTS) cho từng cảnh.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
            3. DANH SÁCH CẢNH ({scenes.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Sinh từ mục 2 · Sửa prompt/TTS từng cảnh · Tạo lại video sau khi chỉnh sửa
          </p>
        </div>
        {toast && (
          <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full animate-in fade-in">
            {toast}
          </span>
        )}
      </div>

      <SceneToolbar
        selectedCount={selectedIds.length}
        totalCount={scenes.length}
        errorCount={errorScenes.length + editedScenes.length}
        allSelected={allSelected}
        isRegenerating={isRegenerating}
        onSceneAction={handleSceneAction}
        onBulkAction={handleBulkAction}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {scenes.map((scene) => {
          const isSelected = selectedIds.includes(scene.id);
          const isError = scene.status === 'error';
          const isEdited = scene.status === 'edited';
          const isGenerating = scene.status === 'generating';

          return (
            <div
              key={scene.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleScene(scene.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleScene(scene.id);
                }
              }}
              className={cn(
                'text-left bg-card border rounded-lg overflow-hidden transition-colors cursor-pointer select-none',
                isSelected
                  ? 'border-primary ring-1 ring-primary/40'
                  : isError
                    ? 'border-destructive/50 hover:border-destructive'
                    : isEdited
                      ? 'border-orange-500/50 hover:border-orange-500'
                      : 'border-border hover:border-primary/50',
              )}
            >
              <div className="w-full aspect-[4/3] bg-muted relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <ImageIcon className={cn(
                  'w-12 h-12',
                  isError ? 'text-destructive/50' : isEdited ? 'text-orange-400/50' : 'text-muted-foreground',
                )} />

                <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {scene.index}
                </div>

                <div className="absolute top-2 right-2 text-xs font-semibold bg-background/80 px-2 py-1 rounded text-foreground">
                  {formatSceneTimeRange(scene).split(' - ')[1]}
                </div>

                <StatusBadge status={scene.status} />

                {isSelected && (
                  <div className="absolute bottom-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Video Prompt</p>
                  <p className="text-xs text-foreground line-clamp-2">{scene.prompt}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Voice (TTS)</p>
                  <p className="text-xs text-foreground line-clamp-1">{scene.voice}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border gap-1">
                  <span className="text-xs text-muted-foreground">{scene.durationSeconds}s</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTarget(scene);
                      }}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Sửa prompt & TTS"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {(isError || isEdited) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateScenes([scene.id]);
                        }}
                        disabled={isRegenerating || isGenerating}
                        className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 font-medium disabled:opacity-50 px-1"
                      >
                        <RefreshCw className={cn('w-3 h-3', regeneratingIds.includes(scene.id) && 'animate-spin')} />
                        Tạo lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editTarget && (() => {
        const live = scenes.find((s) => s.id === editTarget.id) ?? editTarget;
        return (
          <SceneEditModal
            key={live.id}
            scene={live}
            onClose={() => setEditTarget(null)}
            onSave={(data) => handleSaveEdit(live.id, data)}
            onRegenerate={() => {
              regenerateScenes([live.id]);
              setEditTarget(null);
            }}
            isRegenerating={regeneratingIds.includes(live.id)}
          />
        );
      })()}
    </section>
  );
}
