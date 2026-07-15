'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModalOverlay } from '@/components/ui/modal-overlay';
import { SelectVeo } from '@/components/ui/veomodel';
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
import { useVideoLibrary } from '@/contexts/video-library-context';
import {
  formatVideoItemTitle,
  resolveVeoModelLabel,
  type CreateVideoItemOptions,
  type VideoLibraryItem,
} from '@/lib/video-library';
import { getApiKey, API_KEY_IDS } from '@/lib/api-keys-store';
import { getVeoApiKey } from '@/lib/veo-models';
import { buildAnalyzePipeline, toPipelineCharacters } from '@/lib/pipeline-payload';
import { resolveSceneStyleLabel } from '@/lib/scene-styles';

interface VideoItemModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  onClose: () => void;
  /** Bắt buộc khi mode="create" */
  onCreate?: (options: CreateVideoItemOptions) => void;
  /** Bắt buộc khi mode="edit" */
  initialItem?: VideoLibraryItem | null;
}

const selectClass =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20';

const MIN_CONTENT_CHARS = 20;

export function VideoItemModal({ mode, open, onClose, onCreate, initialItem }: VideoItemModalProps) {
  const { updateItem, startRegenerate } = useVideoLibrary();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { models: veoModels, loading: veoModelsLoading, hasKey: hasVeoKey } = useVeoModels();

  useDefaultVeoModel(
    veoModels,
    settings.videoQuality,
    settings.veoModel,
    (modelId) => setSettings((s) => ({ ...s, veoModel: modelId })),
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    if (mode === 'edit' && initialItem) {
      setTitle(initialItem.title);
      setContent(initialItem.inputContent);
      setSettings({ ...initialItem.settings });
    } else {
      setTitle('');
      setContent('');
      setSettings({ ...DEFAULT_VIDEO_SETTINGS });
    }
  }, [open, mode, initialItem]);

  useEffect(() => {
    setSettings((prev) => {
      const next = normalizeSceneDurationSetting(prev.sceneDuration, prev.videoQuality);
      return next === prev.sceneDuration ? prev : { ...prev, sceneDuration: next };
    });
  }, [settings.videoQuality]);

  if (!open) return null;
  if (mode === 'edit' && !initialItem) return null;

  const sceneDurationOptions = getSceneDurationOptions(settings.videoQuality);
  const patch = (p: Partial<VideoSettings>) => setSettings((s) => ({ ...s, ...p }));

  const busy = mode === 'edit' && !!initialItem
    && (initialItem.isRegenerating || initialItem.status === 'analyzing' || initialItem.status === 'generating');

  const contentChanged = mode === 'edit' && initialItem
    ? content.trim() !== initialItem.inputContent.trim()
      || JSON.stringify(settings) !== JSON.stringify(initialItem.settings)
    : false;

  const handleCreate = () => {
    const name = title.trim();
    if (!name) {
      setError('Vui lòng đặt tên cho video.');
      return;
    }
    onCreate?.({ title: name, settings: { ...settings } });
    onClose();
  };

  const handleSaveOnly = () => {
    if (!initialItem) return;
    const name = title.trim();
    if (!name) {
      setError('Vui lòng đặt tên cho video.');
      return;
    }
    updateItem(initialItem.id, {
      title: name,
      settings: { ...settings },
      veoModelLabel: resolveVeoModelLabel(initialItem.veoInput, settings),
      aspectRatio: settings.aspectRatio,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveAndRegenerate = () => {
    if (!initialItem) return;
    const name = title.trim();
    if (!name) {
      setError('Vui lòng đặt tên cho video.');
      return;
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < MIN_CONTENT_CHARS) {
      setError(`Nội dung quá ngắn — cần ít nhất ${MIN_CONTENT_CHARS} ký tự.`);
      return;
    }

    // Gemini API Key không bắt buộc — bỏ trống thì backend tự dùng key dự phòng của server (nếu có)
    const geminiKey = getApiKey('gemini');
    // if (!geminiKey.trim()) {
    //   setError('Chưa có Gemini API Key — vào mục API Keys để nhập và lưu key.');
    //   return;
    // }
    const veoKey = getVeoApiKey();
    if (!veoKey) {
      setError('Chưa có Veo API Key — nhập key riêng tại mục API Keys (ô Veo).');
      return;
    }
    if (!settings.veoModel?.trim()) {
      setError('Chưa chọn model Veo — đợi danh sách model tải xong và chọn trong cài đặt.');
      return;
    }

    // Lưu title/settings ngay — tạo lại chạy nền, không chặn phần lưu cơ bản
    updateItem(initialItem.id, {
      title: name,
      settings: { ...settings },
      veoModelLabel: resolveVeoModelLabel(initialItem.veoInput, settings),
      aspectRatio: settings.aspectRatio,
    });

    const characters = toPipelineCharacters(initialItem.characters);
    const pipeline = buildAnalyzePipeline({
      geminiApiKey: geminiKey,
      veoApiKey: veoKey,
      ttsApiKey: getApiKey(API_KEY_IDS.elevenlabs),
      content: trimmedContent,
      inputType: 'text',
      language: settings.language,
      sceneCount: settings.sceneCount,
      videoType: settings.videoType,
      characters,
      aspectRatio: settings.aspectRatio,
      sceneDuration: settings.sceneDuration,
      videoQuality: settings.videoQuality,
      veoModel: settings.veoModel,
      sceneStyleLabel: resolveSceneStyleLabel(settings.sceneStyle),
      sceneStyleId: settings.sceneStyle,
      voice: settings.voice,
      voiceSpeed: settings.voiceSpeed,
    });

    const started = startRegenerate(initialItem.id, {
      pipeline,
      sourceContent: trimmedContent,
      sceneCount: settings.sceneCount,
      videoType: settings.videoType,
      language: settings.language,
    });

    if (!started) {
      setError('Video đang xử lý — vui lòng thử lại sau.');
      return;
    }

    onClose();
  };

  const isEdit = mode === 'edit';

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal
        aria-label={isEdit ? 'Sửa video' : 'Tạo video mới'}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isEdit ? <Pencil className="w-4 h-4 text-orange-500" /> : <Plus className="w-4 h-4 text-orange-500" />}
            <h3 className="text-sm font-bold text-foreground">{isEdit ? 'Sửa video' : 'Tạo video mới'}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              Mỗi video chạy prompt và cài đặt riêng — có thể tạo nhiều video song song (vd: chiến tranh / hoạt hình).
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tên video <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null); }}
              placeholder={formatVideoItemTitle()}
              maxLength={80}
              className={cn(selectClass, error && 'border-destructive')}
            />
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nội dung / Prompt
              </label>
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setError(null); }}
                placeholder="Nội dung để AI tạo video..."
                rows={5}
                className={cn(
                  'w-full resize-y min-h-[110px] px-3 py-2 text-sm rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1',
                  error ? 'border-destructive/60 focus:ring-destructive/30' : 'border-border focus:ring-primary/30',
                )}
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Chỉ hỗ trợ sửa nội dung dạng text. Muốn đổi từ link/ảnh/file, hãy vào lại workspace chính.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

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
                <SelectVeo
                  showLabel={false}
                  value={settings.veoModel}
                  onChange={(veoModel) => patch({ veoModel })}
                  options={veoModels}
                  loading={veoModelsLoading}
                  selectClassName={selectClass}
                />
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
          {isEdit ? (
            <>
              <button
                type="button"
                onClick={handleSaveOnly}
                className={cn(
                  'px-4 py-2 text-sm font-bold rounded-xl transition-colors border',
                  saved
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-card border-border text-foreground hover:border-primary/40 hover:text-primary',
                )}
              >
                {saved ? 'Đã lưu!' : 'Lưu'}
              </button>
              <button
                type="button"
                onClick={handleSaveAndRegenerate}
                disabled={busy || !contentChanged}
                title={busy ? 'Video đang xử lý...' : !contentChanged ? 'Chưa có thay đổi nội dung/cài đặt' : undefined}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
              >
                Lưu &amp; tạo lại
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Tạo &amp; bắt đầu
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
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
