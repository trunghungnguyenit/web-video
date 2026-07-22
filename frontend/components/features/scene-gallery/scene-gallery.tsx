'use client';

import { useState, useCallback, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import {
  ImageIcon, AlertCircle, Loader2, CheckCircle2, Pencil, RefreshCw, Film, Volume2, Save, X, Play, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldError } from '@/components/ui/field-error';
import { ModalOverlay } from '@/components/ui/modal-overlay';
import type { VideoScene } from '@/lib/scene/scenes';
import { formatSceneTimeRange, recalculateSceneTimings } from '@/lib/scene/scenes';
import { captureSceneThumbnail } from '@/lib/scene/scene-thumbnail';
import { regenerateSceneAssets } from '@/lib/scene/scene-tts';
import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';
import { toUserMessage } from '@/lib/error-messages';
import type { VideoLibraryItem } from '@/lib/video-library/video-library';
import { markSceneStopped } from '@/lib/veo/veo-generation-lock';
import { downloadBlob } from '@/lib/video-library/video-composer';
import { SceneToolbar } from './scene-toolbar';

// ─── Thumbnail từ giữa clip (tránh frame 0 = Master Cast I2V) ─────────────────

function SceneVideoThumbnail({ videoUrl }: { videoUrl: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setThumbUrl(null);

    void captureSceneThumbnail(videoUrl)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setThumbUrl(url);
      })
      .catch(() => {
        /* fallback video bên dưới */
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [videoUrl]);

  if (thumbUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />
    );
  }

  // Tạm: #t=… để trình duyệt ưu tiên khung giữa, không flash ảnh Master Cast
  return (
    <video
      src={`${videoUrl}#t=1.5`}
      className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      muted
      playsInline
      preload="metadata"
    />
  );
}

// ─── Preview Modal — xem trọn video 1 cảnh, không cần qua Timeline (mục 4) ───

function ScenePreviewModal({ scene, onClose }: { scene: VideoScene; onClose: () => void }) {
  if (!scene.videoUrl) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal
        aria-label={`Xem video cảnh ${scene.index}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Film className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-bold text-foreground truncate">
              Cảnh {scene.index} · {formatSceneTimeRange(scene)} · {scene.durationSeconds}s
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <video
          key={scene.id}
          src={scene.videoUrl}
          controls
          autoPlay
          className="w-full aspect-video bg-black"
        />
      </div>
    </ModalOverlay>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface SceneEditModalProps {
  scene: VideoScene;
  onClose: () => void;
  onSave: (updated: Pick<VideoScene, 'prompt' | 'voice'>) => void;
  onRegenerate: (updated: Pick<VideoScene, 'prompt' | 'voice'>) => void;
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

  const handleRegenerate = () => {
    const errs: typeof errors = {};
    if (!prompt.trim()) errs.prompt = 'Video prompt không được để trống.';
    if (!voice.trim()) errs.voice = 'Lời thoại TTS không được để trống.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onRegenerate({ prompt: prompt.trim(), voice: voice.trim() });
  };

  const isDirty = prompt.trim() !== scene.prompt || voice.trim() !== scene.voice;

  return (
    <ModalOverlay onClose={onClose}>
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
            {errors.prompt && <FieldError className="items-center gap-1">{errors.prompt}</FieldError>}
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
            {errors.voice && <FieldError className="items-center gap-1">{errors.voice}</FieldError>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border bg-background/50">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin')} />
            {isRegenerating ? 'Đang tạo lại...' : 'Tạo lại TTS + video'}
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
              disabled={isRegenerating}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isRegenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo lại...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" />Lưu &amp; tạo lại TTS</>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
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
  ttsInput?: TtsInput | null;
  veoInput?: VeoInput | null;
  /** Báo timeline (mục 4) focus đúng cảnh đang sửa */
  onSceneFocus?: (sceneId: string) => void;
  /** Id project đang xem — phân biệt đúng lượt "vừa sinh xong" khi user đổi project */
  projectId: string;
  projectStatus: VideoLibraryItem['status'];
  /** Upload video/audio cảnh (blob:) lên Storage — trả số lượng đã lưu/lỗi */
  onSaveVideos: () => Promise<{ saved: number; failed: number }>;
  /** Xoá file Storage của các cảnh vừa bị xoá — gọi cùng lúc với xoá khỏi state */
  onDeleteScenes: (scenes: VideoScene[]) => void;
  /** 'rows' — mỗi cảnh 1 hàng ngang (dùng cho video tạo từ tab link). Mặc định 'grid'. */
  layout?: 'grid' | 'rows';
}

export function SceneGallery({
  scenes,
  onScenesChange,
  ttsInput,
  veoInput,
  onSceneFocus,
  projectId,
  projectStatus,
  onSaveVideos,
  onDeleteScenes,
  layout = 'grid',
}: SceneGalleryProps) {
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingIds, setRegeneratingIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<VideoScene | null>(null);
  const [previewTarget, setPreviewTarget] = useState<VideoScene | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);

  const errorScenes = scenes.filter((s) => s.status === 'error');
  const editedScenes = scenes.filter((s) => s.status === 'edited');
  const generatingCount = scenes.filter((s) => s.status === 'generating').length;
  const doneCount = scenes.filter((s) => s.status === 'success').length;
  const unsavedCount = scenes.filter(
    (s) => s.status === 'success' && s.videoUrl?.startsWith('blob:') && !s.videoPath,
  ).length;
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

  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  /** Tải nguyên video 1 cảnh — không cắt/ghép/xử lý gì, đúng file gốc đã tạo */
  const handleDownloadScene = async (scene: VideoScene) => {
    if (!scene.videoUrl || downloadingIds.includes(scene.id)) return;
    setDownloadingIds((prev) => [...prev, scene.id]);
    try {
      const res = await fetch(scene.videoUrl);
      const blob = await res.blob();
      downloadBlob(blob, `ai-video-studio-canh-${scene.index}.mp4`);
    } catch {
      showToast('Không tải được video cảnh này — thử lại.');
    } finally {
      setDownloadingIds((prev) => prev.filter((id) => id !== scene.id));
    }
  };

  const handleSaveVideos = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const { saved, failed } = await onSaveVideos();
      if (saved === 0 && failed === 0) {
        showToast('Không có cảnh nào cần lưu.');
      } else if (failed > 0) {
        showToast(`Đã lưu ${saved} video — ${failed} cảnh lỗi, thử lại sau.`);
      } else {
        showToast(`Đã lưu ${saved} video lên cloud.`);
        setShowSaveReminder(false);
      }
    } catch (err) {
      showToast(toUserMessage(err, 'Lưu video thất bại — thử lại.'));
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSaveVideos]);

  /** Vừa sinh xong (đúng project đang xem) và còn cảnh chưa lưu — nhắc user lưu ngay */
  const prevCompletionRef = useRef<{ id: string; status: VideoLibraryItem['status'] }>({
    id: projectId,
    status: projectStatus,
  });
  useEffect(() => {
    const prev = prevCompletionRef.current;
    if (
      prev.id === projectId
      && prev.status !== 'completed'
      && projectStatus === 'completed'
      && unsavedCount > 0
    ) {
      setShowSaveReminder(true);
    }
    prevCompletionRef.current = { id: projectId, status: projectStatus };
  }, [projectId, projectStatus, unsavedCount]);

  const regenerateScenes = useCallback(async (
    ids: string[],
    overrides?: Record<string, Pick<VideoScene, 'prompt' | 'voice'>>,
  ) => {
    if (ids.length === 0 || isRegenerating) return;
    if (!ttsInput || !veoInput) {
      showToast('Chưa có cấu hình cảnh — submit lại mục 2 hoặc áp dụng kịch bản mẫu.');
      return;
    }

    setIsRegenerating(true);
    setRegeneratingIds(ids);
    onSceneFocus?.(ids[0]);
    onScenesChange((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'generating' as const } : s)),
    );

    const patches: Array<{ id: string; scene: VideoScene; error?: string } | null> = [];

    for (const id of ids) {
      const scene = scenesRef.current.find((s) => s.id === id);
      if (!scene) {
        patches.push(null);
        continue;
      }
      const patch = overrides?.[id];
      const working: VideoScene = patch ? { ...scene, ...patch, errorMessage: undefined } : { ...scene, errorMessage: undefined };
      // Scene Continuity — nối tiếp bằng khung hình cuối video của đúng cảnh liền trước
      // (theo index), không phải cảnh đang tạo lại. undefined nếu cảnh trước chưa có video
      // → generateSceneVideoAsset tự fallback tạo cảnh không có khung nối.
      const previousSceneVideoUrl = veoInput.sceneContinuity
        ? scenesRef.current.find((s) => s.index === scene.index - 1)?.videoUrl
        : undefined;
      try {
        const rebuilt = await regenerateSceneAssets(
          working,
          { ...ttsInput, enabled: true },
          veoInput,
          {
          onOperationStarted: (operationId) => {
            onScenesChange((prev) =>
              prev.map((s) =>
                s.id === id
                  ? veoInput.provider === 'kie'
                    ? { ...s, kieTaskId: operationId, status: 'generating' as const }
                    : { ...s, veoOperationName: operationId, status: 'generating' as const }
                  : s,
              ),
            );
          },
        },
          previousSceneVideoUrl,
        );
        // regenerateSceneAssets tự bắt lỗi nội bộ (không throw) — status:'error' vẫn
        // đi qua nhánh này, phải giữ nguyên errorMessage của nó thay vì xoá sạch.
        patches.push(
          rebuilt.status === 'error'
            ? { id, scene: rebuilt, error: rebuilt.errorMessage }
            : { id, scene: { ...rebuilt, errorMessage: undefined } },
        );
      } catch (err) {
        const message = toUserMessage(err, 'Tạo lại cảnh thất bại — thử lại.');
        patches.push({ id, scene: { ...working, status: 'error' as const, errorMessage: message }, error: message });
      }
    }

    let firstError: string | undefined;
    onScenesChange((prev) =>
      recalculateSceneTimings(
        prev.map((s) => {
          const result = patches.find((p) => p?.id === s.id);
          if (!result) return s;
          if (result.error) firstError = result.error;
          return result.scene;
        }),
      ),
    );

    setIsRegenerating(false);
    setRegeneratingIds([]);
    onSceneFocus?.(ids[0]);
    if (firstError) {
      showToast(firstError);
    } else {
      showToast(`Đã tạo lại TTS + video cho ${ids.length} cảnh`);
    }
  }, [onScenesChange, ttsInput, veoInput, onSceneFocus, isRegenerating]);

  const handleSaveEdit = async (id: string, data: Pick<VideoScene, 'prompt' | 'voice'>) => {
    setEditTarget(null);
    await regenerateScenes([id], { [id]: data });
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

    if (action === 'stop') {
      const targets = scenes.filter((s) => selectedIds.includes(s.id) && s.status === 'generating');
      if (targets.length === 0) {
        showToast('Không có cảnh nào đang tạo để dừng.');
        return;
      }
      for (const s of targets) markSceneStopped(s.id);
      showToast(`Đã gửi yêu cầu dừng cho ${targets.length} cảnh — có thể mất vài giây để dừng hẳn.`);
      return;
    }

    if (action === 'delete' && selectedIds.length > 0) {
      const count = selectedIds.length;
      onDeleteScenes(scenes.filter((s) => selectedIds.includes(s.id)));
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
      onDeleteScenes(scenes.filter((s) => selectedIds.includes(s.id)));
      onScenesChange((prev) => recalculateSceneTimings(prev.filter((s) => !selectedIds.includes(s.id))));
      showToast(`Đã xóa ${count} cảnh`);
      setSelectedIds([]);
    }
    if (action === 'save-videos') {
      void handleSaveVideos();
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
        <div className="flex items-center gap-2 flex-wrap">
          {generatingCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang tạo {doneCount}/{scenes.length} cảnh
            </span>
          )}
          {toast && (
            <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full animate-in fade-in">
              {toast}
            </span>
          )}
        </div>
      </div>

      {showSaveReminder && unsavedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-500/30 bg-green-500/10">
          <Save className="w-4 h-4 text-green-500 shrink-0" />
          <p className="flex-1 text-xs text-foreground">
            Video đã tạo xong — <strong>lưu ngay</strong> để tránh mất khi tải lại trang hoặc thoát ra.
          </p>
          <button
            type="button"
            onClick={() => void handleSaveVideos()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 shrink-0"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Đang lưu...' : 'Lưu ngay'}
          </button>
          <button
            type="button"
            onClick={() => setShowSaveReminder(false)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <SceneToolbar
        selectedCount={selectedIds.length}
        totalCount={scenes.length}
        errorCount={errorScenes.length + editedScenes.length}
        allSelected={allSelected}
        isRegenerating={isRegenerating}
        unsavedCount={unsavedCount}
        isSaving={isSaving}
        onSceneAction={handleSceneAction}
        onBulkAction={handleBulkAction}
      />

      <div className={layout === 'rows' ? 'flex flex-col gap-3' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'}>
        {scenes.map((scene) => {
          const isSelected = selectedIds.includes(scene.id);
          const isError = scene.status === 'error';
          const isEdited = scene.status === 'edited';
          const isGenerating = scene.status === 'generating';
          const isRows = layout === 'rows';

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
                'text-left bg-card border rounded-lg overflow-hidden transition-colors cursor-pointer select-none min-w-0',
                isRows && 'flex flex-col sm:flex-row',
                isSelected
                  ? 'border-primary ring-1 ring-primary/40'
                  : isError
                    ? 'border-destructive/50 hover:border-destructive'
                    : isEdited
                      ? 'border-orange-500/50 hover:border-orange-500'
                      : 'border-border hover:border-primary/50',
              )}
            >
              <div className={cn(
                'bg-muted relative overflow-hidden isolate shrink-0',
                isRows ? 'w-full sm:w-64 aspect-video' : 'w-full aspect-[4/3]',
              )}>
                {scene.videoUrl ? (
                  <>
                    <SceneVideoThumbnail videoUrl={scene.videoUrl} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10 z-[1] pointer-events-none" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTarget(scene);
                      }}
                      className="absolute inset-0 z-[2] flex items-center justify-center group/play"
                      title="Xem video cảnh này"
                    >
                      <span className="w-11 h-11 rounded-full bg-black/50 group-hover/play:bg-primary/80 flex items-center justify-center transition-colors">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isGenerating ? (
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    ) : (
                      <ImageIcon className={cn(
                        'w-12 h-12',
                        isError ? 'text-destructive/50' : isEdited ? 'text-orange-400/50' : 'text-muted-foreground',
                      )} />
                    )}
                  </div>
                )}

                <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground z-[2]">
                  {scene.index}
                </div>

                <div className="absolute top-2 right-2 text-xs font-semibold bg-background/80 px-2 py-1 rounded text-foreground z-[2]">
                  {formatSceneTimeRange(scene).split(' - ')[1]}
                </div>

                <StatusBadge status={scene.status} />

                {isSelected && (
                  <div className="absolute bottom-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-[2]">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </div>

              <div className={cn('p-3 space-y-2 min-w-0 overflow-hidden', isRows && 'flex-1')}>
                {isError && scene.errorMessage && (
                  <FieldError title={scene.errorMessage} className="gap-1 line-clamp-2">
                    {scene.errorMessage}
                  </FieldError>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Video Prompt</p>
                  <p className={cn('text-xs text-foreground', !isRows && 'line-clamp-2')}>{scene.prompt}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Voice (TTS)</p>
                  <div className="flex items-center gap-1.5">
                    <p className={cn('text-xs text-foreground flex-1', !isRows && 'line-clamp-1')}>
                      {scene.voice || '(Trống)'}
                    </p>
                    {scene.audioUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const audio = new Audio(scene.audioUrl);
                          void audio.play();
                        }}
                        className="shrink-0 p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Nghe thử giọng đọc"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
                    {scene.videoUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownloadScene(scene);
                        }}
                        disabled={downloadingIds.includes(scene.id)}
                        className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                        title="Tải video cảnh này"
                      >
                        {downloadingIds.includes(scene.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
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
            onSave={(data) => void handleSaveEdit(live.id, data)}
            onRegenerate={(data) => {
              void regenerateScenes([live.id], { [live.id]: data });
              setEditTarget(null);
            }}
            isRegenerating={regeneratingIds.includes(live.id)}
          />
        );
      })()}

      {previewTarget && (() => {
        const live = scenes.find((s) => s.id === previewTarget.id) ?? previewTarget;
        return <ScenePreviewModal key={live.id} scene={live} onClose={() => setPreviewTarget(null)} />;
      })()}
    </section>
  );
}
