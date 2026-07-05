'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Type, Link2, Image, File, Send, AlertCircle, Loader2,
  CheckCircle2, Bookmark, Gauge, Palette, ChevronDown, ChevronUp,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateScenesFromContent } from '@/lib/scenes';
import type { SceneGenerationResult } from '@/lib/scenes';
import type { QuickActionId } from '@/components/features/quick-actions';
import type { PresetInput } from '@/lib/preset-scripts';

// ─── Voice Speed config ───────────────────────────────────────────────────────
const SPEED_OPTIONS = [
  { value: 0.75, label: '0.75×', desc: 'Chậm' },
  { value: 1,    label: '1×',    desc: 'Bình thường' },
  { value: 1.25, label: '1.25×', desc: 'Hơi nhanh' },
  { value: 1.5,  label: '1.5×',  desc: 'Nhanh' },
  { value: 2,    label: '2×',    desc: 'Rất nhanh' },
];

// ─── Scene Style config ───────────────────────────────────────────────────────
const SCENE_STYLES = [
  { id: 'cinematic',       label: 'Cinematic',        emoji: '🎥', desc: 'Chân thực, điện ảnh' },
  { id: 'cartoon-finance', label: 'Cartoon',           emoji: '📊', desc: 'Nền trắng, dễ hiểu' },
  { id: '2d-explainer',   label: '2D Animation',      emoji: '🎬', desc: 'Explainer video' },
  { id: 'dark-fantasy',   label: 'Dark Fantasy',      emoji: '🌑', desc: 'Gothic, huyền bí' },
  { id: 'watercolor',     label: 'Watercolor',        emoji: '🎨', desc: 'Màu nước nhẹ nhàng' },
  { id: 'flat-design',    label: 'Flat Design',       emoji: '⬜', desc: 'Phẳng, tối giản' },
  { id: 'anime',          label: 'Anime / Manga',     emoji: '🇯🇵', desc: 'Phong cách Nhật' },
  { id: 'cyberpunk',      label: 'Cyberpunk',         emoji: '🌆', desc: 'Sci-Fi tương lai' },
  { id: 'oil-painting',   label: 'Oil Painting',      emoji: '🖌️', desc: 'Sơn dầu cổ điển' },
  { id: 'chalk-dark',     label: 'Chalk / Sketch',    emoji: '✏️', desc: 'Nền tối, phác thảo' },
  { id: 'renaissance',    label: 'Renaissance',       emoji: '🖼️', desc: 'Caravaggio style' },
  { id: 'comic',          label: 'Comic / Pop Art',   emoji: '💥', desc: 'Truyện tranh' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'text' | 'link' | 'image' | 'file';

const tabs: { id: TabId; icon: typeof Type; label: string; desc: string }[] = [
  { id: 'text',  icon: Type,  label: 'Tự nhập nội dung', desc: 'Nhập từ bàn phím' },
  { id: 'link',  icon: Link2, label: 'Từ link video',    desc: 'YouTube, TikTok...' },
  { id: 'image', icon: Image, label: 'Từ hình ảnh',      desc: 'Tải lên hình ảnh' },
  { id: 'file',  icon: File,  label: 'Từ file',          desc: 'PDF, Word, DOCX...' },
];

// ─── Validation limits ────────────────────────────────────────────────────────
const MAX_CHARS         = 5000;
const MIN_CONTENT_CHARS = 20;
const MAX_IMAGE_MB      = 10;
const MAX_FILE_MB       = 20;
const IMAGE_MIME        = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const FILE_MIME         = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const FILE_EXT_HINT     = /\.(pdf|doc|docx|txt)$/i;

// Cho phép các host video phổ biến — kiểm tra để cảnh báo cụ thể
const SUPPORTED_HOSTS = ['youtube.com', 'youtu.be', 'tiktok.com', 'vimeo.com', 'facebook.com', 'fb.watch'];

// ─── Types cho form ───────────────────────────────────────────────────────────

interface FormErrors {
  content?: string;
  linkUrl?: string;
  upload?: string;
}

interface FormState {
  activeTab: TabId;
  content: string;
  linkUrl: string;
  language: string;
  sceneCount: string;
  videoType: string;
  voice: string;
  dragOver: boolean;
  isSubmitting: boolean;
  submitted: boolean;
}

export interface InputSectionProps {
  activeQuickAction?: QuickActionId | null;
  onActionDone?: () => void;
  presetData?: PresetInput | null;
  presetKey?: number;
  onSaveScript?: (
    content: string,
    meta: { language: string; sceneCount: string; videoType: string; voice: string }
  ) => void;
  /** Sidebar click "Nhập nội dung" → scroll + focus textarea */
  focusContentKey?: number;
  /** Sidebar click "Tốc độ giọng" → scroll + mở accordion */
  focusVoiceSpeedKey?: number;
  /** Sidebar click "Phong cách cảnh" → scroll + mở accordion */
  focusSceneStyleKey?: number;
  /** Sau khi phân tích xong → trả danh sách cảnh cho mục 3 */
  onScenesGenerated?: (result: SceneGenerationResult) => void;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateContent(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return 'Vui lòng nhập nội dung để AI có thể tạo video.';
  if (s.length < MIN_CONTENT_CHARS) {
    return `Nội dung quá ngắn — cần ít nhất ${MIN_CONTENT_CHARS} ký tự (hiện tại: ${s.length}).`;
  }
  if (s.length > MAX_CHARS) {
    return `Nội dung quá dài — tối đa ${MAX_CHARS.toLocaleString()} ký tự (hiện tại: ${s.length.toLocaleString()}).`;
  }
  return undefined;
}

function validateUrl(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return 'Vui lòng nhập URL video.';
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return 'URL không hợp lệ — cần dạng đầy đủ, ví dụ: https://www.youtube.com/watch?v=...';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `URL phải bắt đầu bằng http:// hoặc https:// (hiện tại: ${url.protocol}).`;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const supported = SUPPORTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!supported) {
    return `Nền tảng "${host}" chưa được hỗ trợ. Vui lòng dùng: YouTube, TikTok, Vimeo, Facebook.`;
  }
  return undefined;
}

function validateUpload(file: File | null, tab: 'image' | 'file'): string | undefined {
  if (!file) {
    return tab === 'image'
      ? 'Vui lòng tải lên ít nhất một hình ảnh.'
      : 'Vui lòng tải lên file nội dung (PDF, DOC, DOCX hoặc TXT).';
  }
  const sizeMB = file.size / 1024 / 1024;
  if (tab === 'image') {
    if (!IMAGE_MIME.includes(file.type) && !file.type.startsWith('image/')) {
      return `File "${file.name}" không phải là hình ảnh hợp lệ. Chấp nhận: JPG, PNG, WebP, GIF.`;
    }
    if (sizeMB > MAX_IMAGE_MB) {
      return `File "${file.name}" quá lớn (${sizeMB.toFixed(1)} MB) — tối đa ${MAX_IMAGE_MB} MB.`;
    }
  } else {
    const okMime = FILE_MIME.includes(file.type);
    const okExt  = FILE_EXT_HINT.test(file.name);
    if (!okMime && !okExt) {
      return `File "${file.name}" không đúng định dạng. Chấp nhận: PDF, DOC, DOCX, TXT.`;
    }
    if (sizeMB > MAX_FILE_MB) {
      return `File "${file.name}" quá lớn (${sizeMB.toFixed(1)} MB) — tối đa ${MAX_FILE_MB} MB.`;
    }
  }
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InputSection({
  activeQuickAction, onActionDone, presetData, presetKey, onSaveScript,
  focusContentKey, focusVoiceSpeedKey, focusSceneStyleKey, onScenesGenerated,
}: InputSectionProps = {}) {
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const voiceSpeedRef = useRef<HTMLDivElement>(null);
  const sceneStyleRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    activeTab: 'text', content: '', linkUrl: '',
    language: 'vi', sceneCount: '5', videoType: 'storytelling', voice: 'male-natural',
    dragOver: false, isSubmitting: false, submitted: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [justApplied, setJustApplied]   = useState(false);
  const [savedScript, setSavedScript]   = useState(false);

  // Voice speed state
  const [voiceSpeed, setVoiceSpeed]         = useState(1);
  const [showVoiceSpeed, setShowVoiceSpeed] = useState(false);

  // Scene style state
  const [sceneStyle, setSceneStyle]         = useState('cinematic');
  const [showSceneStyle, setShowSceneStyle] = useState(false);

  // ── Preset apply ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!presetData) return;
    setForm((f) => ({
      ...f, activeTab: 'text',
      content: presetData.content, language: presetData.language,
      sceneCount: presetData.sceneCount, videoType: presetData.videoType, voice: presetData.voice,
    }));
    if (presetData.voiceSpeed != null) setVoiceSpeed(presetData.voiceSpeed);
    if (presetData.sceneStyleId) setSceneStyle(presetData.sceneStyleId);
    setErrors({});
    setUploadedFile(null);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

  // ── Quick action focus ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeQuickAction) return;
    if (activeQuickAction === 'analyze' || activeQuickAction === 'script') {
      setForm((f) => ({ ...f, activeTab: 'text' }));
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [activeQuickAction]);

  // ── Sidebar navigation triggers ───────────────────────────────────────────
  useEffect(() => {
    if (!focusContentKey) return;
    setForm((f) => ({ ...f, activeTab: 'text' }));
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, [focusContentKey]);

  useEffect(() => {
    if (!focusVoiceSpeedKey) return;
    setShowVoiceSpeed(true);
    setTimeout(() => voiceSpeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }, [focusVoiceSpeedKey]);

  useEffect(() => {
    if (!focusSceneStyleKey) return;
    setShowSceneStyle(true);
    setTimeout(() => sceneStyleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }, [focusSceneStyleKey]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const charCount   = form.content.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (form.activeTab === 'text') {
      const msg = validateContent(form.content);
      if (msg) e.content = msg;
    }
    if (form.activeTab === 'link') {
      const msg = validateUrl(form.linkUrl);
      if (msg) e.linkUrl = msg;
    }
    if (form.activeTab === 'image' || form.activeTab === 'file') {
      const msg = validateUpload(uploadedFile, form.activeTab);
      if (msg) e.upload = msg;
    }
    setErrors(e);
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      if (e.content) textareaRef.current?.focus();
      return;
    }
    setForm((f) => ({ ...f, isSubmitting: true }));

    await new Promise((r) => setTimeout(r, 1500));

    const contentForScenes =
      form.activeTab === 'text'
        ? form.content
        : form.activeTab === 'link'
          ? `Nội dung phân tích từ video: ${form.linkUrl.trim()}`
          : uploadedFile
            ? `Nội dung trích xuất từ file "${uploadedFile.name}"`
            : form.content;

    const styleLabel = SCENE_STYLES.find((s) => s.id === sceneStyle)?.label ?? sceneStyle;

    const scenes = generateScenesFromContent({
      content: contentForScenes,
      sceneCount: form.sceneCount,
      videoType: form.videoType,
      language: form.language,
      sceneStyle: styleLabel,
    });

    onScenesGenerated?.({
      scenes,
      sourceContent: contentForScenes,
      sceneCount: form.sceneCount,
      videoType: form.videoType,
      language: form.language,
    });

    setForm((f) => ({ ...f, isSubmitting: false, submitted: true }));
    onActionDone?.();
    setTimeout(() => setForm((f) => ({ ...f, submitted: false })), 3000);
  };

  const handleSaveScript = () => {
    const s = form.content.trim();
    if (!s) {
      setErrors((p) => ({ ...p, content: 'Cần có nội dung để lưu kịch bản.' }));
      textareaRef.current?.focus();
      return;
    }
    if (s.length < 10) {
      setErrors((p) => ({
        ...p,
        content: `Nội dung quá ngắn — cần ít nhất 10 ký tự để lưu (hiện tại: ${s.length}).`,
      }));
      textareaRef.current?.focus();
      return;
    }
    onSaveScript?.(form.content, {
      language: form.language, sceneCount: form.sceneCount,
      videoType: form.videoType, voice: form.voice,
    });
    setSavedScript(true);
    setTimeout(() => setSavedScript(false), 2500);
  };

  const handleTabChange = (tab: TabId) => {
    setForm((f) => ({ ...f, activeTab: tab }));
    setErrors({});
    setUploadedFile(null);
  };

  const acceptFile = (file: File) => {
    const tab = form.activeTab as 'image' | 'file';
    const msg = validateUpload(file, tab);
    if (msg) {
      setErrors((p) => ({ ...p, upload: msg }));
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
    setErrors((p) => ({ ...p, upload: undefined }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setForm((f) => ({ ...f, dragOver: false }));
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  const acceptedTypes = form.activeTab === 'image'
    ? 'image/jpeg,image/png,image/webp,image/gif'
    : '.pdf,.doc,.docx,.txt';
  const isHighlighted = activeQuickAction === 'analyze' || activeQuickAction === 'script' || justApplied;

  const currentStyle = SCENE_STYLES.find((s) => s.id === sceneStyle);
  const currentSpeed = SPEED_OPTIONS.find((o) => o.value === voiceSpeed);
  const speedPercent = ((voiceSpeed - 0.75) / (2 - 0.75)) * 100;

  return (
    <section
      aria-labelledby="section-input-heading"
      className={cn(
        'space-y-6 rounded-xl transition-all duration-300',
        isHighlighted && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background p-4 -m-4',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 id="section-input-heading" className="text-xs font-bold text-primary uppercase tracking-widest">
          2. NHẬP NỘI DUNG ĐỂ AI TẠO VIDEO
        </h2>
        {justApplied && (
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />Đã điền từ kịch bản mẫu
          </span>
        )}
      </div>

      {/* Source tabs */}
      <div
        role="tablist"
        aria-label="Nguồn nội dung"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
      >
        {tabs.map((tab) => {
          const isActive = form.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'p-4 rounded-lg border transition-all text-left',
                isActive
                  ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              <tab.icon className="w-5 h-5 mb-2" />
              <span className="block text-xs font-semibold leading-tight">{tab.label}</span>
              <span className="block text-xs text-muted-foreground mt-1">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Content input */}
      <div>
        {form.activeTab === 'text' && (
          <div>
            <textarea
              ref={textareaRef}
              value={form.content}
              aria-invalid={!!errors.content}
              aria-describedby={errors.content ? 'content-error' : undefined}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setForm((f) => ({ ...f, content: e.target.value }));
                  if (errors.content) setErrors((p) => ({ ...p, content: undefined }));
                }
              }}
              placeholder="Nhập nội dung để AI tạo video — ví dụ: kịch bản, chủ đề, ý tưởng..."
              className={cn(
                'w-full h-40 px-4 py-3 bg-card border rounded-lg text-foreground placeholder-muted-foreground resize-none focus:outline-none transition-colors',
                errors.content
                  ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                  : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
              )}
            />
            <div className="flex items-center justify-between mt-1.5 gap-3">
              {errors.content ? (
                <p id="content-error" className="flex items-start gap-1 text-xs text-destructive leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{errors.content}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Cần tối thiểu <span className="font-medium text-foreground">{MIN_CONTENT_CHARS}</span> ký tự.
                </p>
              )}
              <span
                className={cn(
                  'text-xs tabular-nums whitespace-nowrap',
                  charPercent > 90 ? 'text-destructive'
                  : charPercent > 70 ? 'text-yellow-400'
                  : 'text-muted-foreground',
                )}
              >
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
            {charPercent > 0 && (
              <div className="mt-1 h-0.5 bg-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    charPercent > 90 ? 'bg-destructive'
                    : charPercent > 70 ? 'bg-yellow-400'
                    : 'bg-primary',
                  )}
                  style={{ width: `${charPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {form.activeTab === 'link' && (
          <div>
            <input
              type="url"
              value={form.linkUrl}
              aria-invalid={!!errors.linkUrl}
              aria-describedby={errors.linkUrl ? 'link-error' : 'link-hint'}
              onChange={(e) => {
                setForm((f) => ({ ...f, linkUrl: e.target.value }));
                if (errors.linkUrl) setErrors((p) => ({ ...p, linkUrl: undefined }));
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className={cn(
                'w-full px-4 py-3 bg-card border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none transition-colors',
                errors.linkUrl
                  ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                  : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
              )}
            />
            {errors.linkUrl ? (
              <p id="link-error" className="flex items-start gap-1 text-xs text-destructive mt-1.5 leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{errors.linkUrl}</span>
              </p>
            ) : (
              <p id="link-hint" className="text-xs text-muted-foreground mt-2">
                Hỗ trợ: YouTube, TikTok, Vimeo, Facebook.
              </p>
            )}
          </div>
        )}

        {(form.activeTab === 'image' || form.activeTab === 'file') && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setForm((f) => ({ ...f, dragOver: true })); }}
              onDragLeave={() => setForm((f) => ({ ...f, dragOver: false }))}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors px-4 text-center',
                form.dragOver ? 'border-primary bg-primary/5'
                : errors.upload ? 'border-destructive/60 bg-destructive/5 hover:border-destructive'
                : 'border-border hover:border-primary/50 hover:bg-card',
              )}
            >
              {uploadedFile ? (
                <>
                  {form.activeTab === 'image'
                    ? <Image className="w-8 h-8 text-primary" />
                    : <File className="w-8 h-8 text-primary" />}
                  <p className="text-sm font-medium text-foreground truncate max-w-full">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB — Nhấn để thay thế
                  </p>
                </>
              ) : (
                <>
                  {form.activeTab === 'image'
                    ? <Image className="w-8 h-8 text-muted-foreground" />
                    : <File className="w-8 h-8 text-muted-foreground" />}
                  <p className="text-sm text-muted-foreground">
                    {form.activeTab === 'image'
                      ? 'Kéo thả hình ảnh vào đây, hoặc nhấn để chọn'
                      : 'Kéo thả file PDF/Word vào đây, hoặc nhấn để chọn'}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {form.activeTab === 'image'
                      ? `JPG, PNG, WebP, GIF — tối đa ${MAX_IMAGE_MB} MB`
                      : `PDF, DOC, DOCX, TXT — tối đa ${MAX_FILE_MB} MB`}
                  </p>
                </>
              )}
            </div>
            {errors.upload && (
              <p className="flex items-start gap-1 text-xs text-destructive mt-1.5 leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{errors.upload}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Config dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Ngôn ngữ',      field: 'language' as const,   opts: [['vi','Tiếng Việt'],['en','English'],['zh','中文'],['ja','日本語']] },
          { label: 'Số lượng cảnh', field: 'sceneCount' as const, opts: [['3','3 cảnh'],['5','5 cảnh'],['8','8 cảnh'],['10','10 cảnh'],['15','15 cảnh']] },
          { label: 'Kiểu video',    field: 'videoType' as const,  opts: [['storytelling','Kể chuyện'],['tutorial','Hướng dẫn'],['ads','Quảng cáo'],['review','Review sản phẩm']] },
          { label: 'Giọng đọc',   field: 'voice' as const,   opts: [['male-natural','Giọng nam – tự nhiên'],['female-natural','Giọng nữ – tự nhiên'],['male-pro','Giọng nam – chuyên nghiệp'],['female-young','Giọng nữ – trẻ trung']] },
        ].map(({ label, field, opts }) => (
          <div key={field}>
            <label htmlFor={`config-${field}`} className="text-xs font-semibold text-muted-foreground block mb-2">
              {label}
            </label>
            <select
              id={`config-${field}`}
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
            >
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* ── Tùy chỉnh nâng cao — nhóm Voice Speed + Scene Style ─────────── */}
      <div className="bg-card/40 border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60 bg-background/40 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
            Tùy chỉnh nâng cao
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline">
            Tốc độ giọng · Phong cách cảnh
          </span>
        </div>

        {/* Tốc độ giọng (accordion) */}
        <div ref={voiceSpeedRef}>
          <button
            type="button"
            onClick={() => setShowVoiceSpeed((v) => !v)}
            aria-expanded={showVoiceSpeed}
            aria-controls="voice-speed-panel"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Gauge className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-semibold text-foreground">Tốc độ giọng đọc (TTS)</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  Hiện tại: <span className="text-primary font-medium">{voiceSpeed}×</span>
                  {' '}— {currentSpeed?.desc}
                </span>
              </div>
            </div>
            {showVoiceSpeed
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showVoiceSpeed && (
            <div id="voice-speed-panel" className="px-4 py-4 space-y-4 border-t border-border/60 bg-background/20">
              <div className="flex gap-2 flex-wrap">
                {SPEED_OPTIONS.map((opt) => {
                  const isActive = voiceSpeed === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVoiceSpeed(opt.value)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex flex-col items-center px-4 py-2 rounded-xl border text-xs font-medium transition-all',
                        isActive
                          ? 'bg-primary/15 border-primary/50 text-primary ring-1 ring-primary/25'
                          : 'bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className="mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/20 rounded-lg border border-border/50">
                <Gauge className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${speedPercent}%` }} />
                </div>
                <span className="text-xs font-mono text-primary font-semibold w-10 text-right">{voiceSpeed}×</span>
              </div>
            </div>
          )}
        </div>

        {/* Phong cách cảnh (accordion) */}
        <div ref={sceneStyleRef} className="border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowSceneStyle((v) => !v)}
            aria-expanded={showSceneStyle}
            aria-controls="scene-style-panel"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Palette className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-xs font-semibold text-foreground">Phong cách cảnh (Visual Style)</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5 truncate">
                  Hiện tại: <span className="text-primary font-medium">{currentStyle?.emoji} {currentStyle?.label}</span>
                  {' '}— {currentStyle?.desc}
                </span>
              </div>
            </div>
            {showSceneStyle
              ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </button>

          {showSceneStyle && (
            <div id="scene-style-panel" className="px-4 py-4 border-t border-border/60 bg-background/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {SCENE_STYLES.map((style) => {
                  const isActive = sceneStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSceneStyle(style.id)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all',
                        isActive
                          ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/25'
                          : 'bg-background border-border hover:border-primary/30 hover:bg-muted/20',
                      )}
                    >
                      <span className="text-base leading-none">{style.emoji}</span>
                      <span className={cn('text-xs font-semibold leading-tight', isActive ? 'text-primary' : 'text-foreground')}>
                        {style.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{style.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={form.isSubmitting}
          className={cn(
            'flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2',
            form.submitted
              ? 'bg-green-600 text-white cursor-default'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {form.isSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />Đang phân tích...</>
            : form.submitted
              ? <>✓ Kịch bản đã được tạo</>
              : <><Send className="w-4 h-4" />Phân Tích &amp; Tạo Kịch Bản</>}
        </button>

        {onSaveScript && form.activeTab === 'text' && (
          <button
            type="button"
            onClick={handleSaveScript}
            title="Lưu lại kịch bản hiện tại để dùng sau"
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border transition-all sm:w-auto',
              savedScript
                ? 'bg-green-500/10 border-green-500/30 text-green-400 cursor-default'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5',
            )}
          >
            {savedScript
              ? <><CheckCircle2 className="w-4 h-4" />Đã lưu!</>
              : <><Bookmark className="w-4 h-4" />Lưu kịch bản</>}
          </button>
        )}
      </div>
    </section>
  );
}
