'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, X, Type, Link2, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModalOverlay } from '@/components/ui/modal-overlay';
import { FieldError } from '@/components/ui/field-error';
import { SelectVeo } from '@/components/ui/veomodel';
import { VoiceSelect } from '@/components/features/voice-select/voice-select';
import {
  ASPECT_RATIO_OPTIONS,
  DEFAULT_VIDEO_SETTINGS,
  KIE_MODE_OPTIONS,
  KIE_VIDEO_QUALITY_OPTIONS,
  LANGUAGE_OPTIONS,
  resolveVideoQualityForProvider,
  SCENE_COUNT_OPTIONS,
  VIDEO_PROVIDER_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  type VideoSettings,
} from '@/contexts/project-settings-context';
import { getSceneDurationOptions, normalizeSceneDurationSetting } from '@/lib/saved-scripts/saved-scripts';
import { useDefaultVeoModel } from '@/hooks/use-veo-models';
import { useVeoModels } from '@/contexts/veo-models-context';
import { useVideoLibrary } from '@/contexts/video-library-context';
import {
  formatVideoItemTitle,
  resolveVeoModelLabel,
  type CreateVideoItemOptions,
  type VideoLibraryItem,
} from '@/lib/video-library/video-library';
import { getApiKey, API_KEY_IDS } from '@/lib/api-keys/api-keys-store';
import { buildAnalyzePipeline, toPipelineCharacters } from '@/lib/pipeline-payload';
import { resolveSceneStyleLabel } from '@/lib/scene/scene-styles';

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
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-60';

const MIN_CONTENT_CHARS = 20;
const MAX_CONTENT_CHARS = 5000;

type ContentInputType = NonNullable<CreateVideoItemOptions['initialInputType']>;

const CONTENT_TYPE_OPTIONS: { id: ContentInputType; icon: typeof Type; label: string; desc: string }[] = [
  { id: 'text', icon: Type, label: 'Tự nhập nội dung', desc: 'Nhập từ bàn phím' },
  { id: 'link', icon: Link2, label: 'Từ link video', desc: 'YouTube, TikTok...' },
  { id: 'image', icon: Image, label: 'Từ hình ảnh', desc: 'Tải lên hình ảnh' },
  { id: 'file', icon: File, label: 'Từ file', desc: 'PDF, Word, DOCX...' },
];

export function VideoItemModal({ mode, open, onClose, onCreate, initialItem }: VideoItemModalProps) {
  const { updateItem, startRegenerate } = useVideoLibrary();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentInputType, setContentInputType] = useState<ContentInputType | null>(null);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [errors, setErrors] = useState<{ title?: string; content?: string; contentInputType?: string; submit?: string }>({});
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
    setErrors({});
    setSaved(false);
    if (mode === 'edit' && initialItem) {
      setTitle(initialItem.title);
      setContent(initialItem.inputContent);
      setSettings({ ...initialItem.settings });
    } else {
      setTitle('');
      setContent('');
      setContentInputType(null);
      setSettings({ ...DEFAULT_VIDEO_SETTINGS });
    }
  }, [open, mode, initialItem]);

  useEffect(() => {
    setSettings((prev) => {
      const next = normalizeSceneDurationSetting(prev.sceneDuration, prev.videoQuality);
      return next === prev.sceneDuration ? prev : { ...prev, sceneDuration: next };
    });
  }, [settings.videoQuality]);

  // Grok Imagine (kie.ai) chỉ hỗ trợ 480p/720p — đổi provider thì clamp lại videoQuality
  useEffect(() => {
    setSettings((prev) => {
      const next = resolveVideoQualityForProvider(prev.videoQuality, prev.videoProvider);
      return next === prev.videoQuality ? prev : { ...prev, videoQuality: next };
    });
  }, [settings.videoProvider]);

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
    const e: { title?: string; contentInputType?: string } = {};
    if (!name) e.title = 'Vui lòng đặt tên cho video.';
    if (!contentInputType) e.contentInputType = 'Vui lòng chọn Nguồn nội dung video.';
    if (e.title || e.contentInputType) {
      setErrors(e);
      return;
    }
    setErrors({});
    onCreate?.({ title: name, settings: { ...settings }, initialInputType: contentInputType! });
    onClose();
  };

  const handleSaveOnly = () => {
    if (!initialItem) return;
    const name = title.trim();
    if (!name) {
      setErrors({ title: 'Vui lòng đặt tên cho video.' });
      return;
    }
    setErrors({});
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
      setErrors({ title: 'Vui lòng đặt tên cho video.' });
      return;
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < MIN_CONTENT_CHARS) {
      setErrors({ content: `Nội dung quá ngắn — cần ít nhất ${MIN_CONTENT_CHARS} ký tự (hiện tại: ${trimmedContent.length}).` });
      return;
    }
    if (trimmedContent.length > MAX_CONTENT_CHARS) {
      setErrors({ content: `Nội dung quá dài — tối đa ${MAX_CONTENT_CHARS} ký tự (hiện tại: ${trimmedContent.length}).` });
      return;
    }

    // Gemini API Key không bắt buộc — bỏ trống thì backend tự dùng key dự phòng của server (nếu có)
    const geminiKey = getApiKey('gemini');
    // if (!geminiKey.trim()) {
    //   setErrors({ submit: 'Chưa có Gemini API Key — vào mục API Keys để nhập và lưu key.' });
    //   return;
    // }
    const isKieProvider = settings.videoProvider === 'kie';
    const videoApiKey = getApiKey(API_KEY_IDS.kie);
    if (!videoApiKey) {
      setErrors({
        submit: isKieProvider
          ? 'Chưa có Video API Key — nhập key riêng tại mục API Keys.'
          : 'Chưa có Video API Key — nhập key riêng tại mục API Keys để tạo video Veo 3.1.',
      });
      return;
    }
    if (!isKieProvider && !settings.veoModel?.trim()) {
      setErrors({ submit: 'Chưa chọn model Veo — đợi danh sách model tải xong và chọn trong cài đặt.' });
      return;
    }
    setErrors({});

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
      veoApiKey: videoApiKey,
      ttsApiKey: getApiKey(API_KEY_IDS.elevenlabs),
      content: trimmedContent,
      inputType: 'text',
      language: settings.language,
      sceneCount: settings.sceneCount,
      characters,
      aspectRatio: settings.aspectRatio,
      sceneDuration: settings.sceneDuration,
      videoQuality: settings.videoQuality,
      veoModel: settings.veoModel,
      sceneStyleLabel: resolveSceneStyleLabel(settings.sceneStyle),
      sceneStyleId: settings.sceneStyle,
      voice: settings.voice,
      voiceSpeed: settings.voiceSpeed,
      provider: settings.videoProvider,
      kieMode: settings.kieMode,
    });

    const started = startRegenerate(initialItem.id, {
      pipeline,
      sourceContent: trimmedContent,
      sceneCount: settings.sceneCount,
      language: settings.language,
    });

    if (!started) {
      setErrors({ submit: 'Video đang xử lý — vui lòng thử lại sau.' });
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
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })); }}
              placeholder={formatVideoItemTitle()}
              maxLength={80}
              className={cn(selectClass, errors.title && 'border-destructive')}
            />
            {errors.title && <FieldError>{errors.title}</FieldError>}
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nguồn nội dung <span className="text-destructive">*</span>
              </label>
              <div role="tablist" aria-label="Nguồn nội dung" className="grid grid-cols-2 gap-2">
                {CONTENT_TYPE_OPTIONS.map((opt) => {
                  const isActive = contentInputType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => { setContentInputType(opt.id); setErrors((p) => ({ ...p, contentInputType: undefined })); }}
                      className={cn(
                        'p-3 rounded-lg border transition-all text-left',
                        isActive
                          ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20'
                          : 'bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5',
                      )}
                    >
                      <opt.icon className="w-4 h-4 mb-1.5" />
                      <span className="block text-xs font-semibold leading-tight">{opt.label}</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              {errors.contentInputType ? (
                <FieldError>{errors.contentInputType}</FieldError>
              ) : (
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Nội dung cụ thể (nhập text, dán link, tải ảnh/file) sẽ điền ở Mục 2 sau khi tạo.
                </p>
              )}
            </div>
          )}

          {isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nội dung / Prompt
              </label>
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setErrors((p) => ({ ...p, content: undefined })); }}
                placeholder="Nội dung để AI tạo video..."
                rows={5}
                maxLength={MAX_CONTENT_CHARS}
                className={cn(
                  'w-full resize-y min-h-27.5 px-3 py-2 text-sm rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1',
                  errors.content ? 'border-destructive/60 focus:ring-destructive/30' : 'border-border focus:ring-primary/30',
                )}
              />
              {errors.content ? (
                <FieldError>{errors.content}</FieldError>
              ) : (
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Chỉ hỗ trợ sửa nội dung dạng text. Muốn đổi từ link/ảnh/file, hãy vào lại workspace chính.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nhà cung cấp">
              <select
                value={settings.videoProvider}
                onChange={(e) => patch({ videoProvider: e.target.value as 'veo' | 'kie' })}
                className={selectClass}
              >
                {VIDEO_PROVIDER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            {settings.videoProvider === 'kie' && (
              <Field label="Chế độ">
                <select
                  value={settings.kieMode}
                  onChange={(e) => patch({ kieMode: e.target.value as 'fun' | 'normal' | 'spicy' })}
                  className={selectClass}
                  title={settings.kieMode === 'spicy' ? 'Spicy có thể tạo nội dung nhạy cảm/gợi dục.' : undefined}
                >
                  {KIE_MODE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            )}
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
            <Field label="Tỷ lệ">
              <select value={settings.aspectRatio} onChange={(e) => patch({ aspectRatio: e.target.value })} className={selectClass}>
                {ASPECT_RATIO_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Chất lượng">
              <select value={settings.videoQuality} onChange={(e) => patch({ videoQuality: e.target.value })} className={selectClass}>
                {(settings.videoProvider === 'kie' ? KIE_VIDEO_QUALITY_OPTIONS : VIDEO_QUALITY_OPTIONS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
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
            {settings.videoProvider === 'veo' && hasVeoKey && (
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

          {errors.submit && <FieldError>{errors.submit}</FieldError>}
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
