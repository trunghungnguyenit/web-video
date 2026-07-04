'use client';

import { useState, useRef, useEffect } from 'react';
import { Type, Link2, Image, File, Send, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuickActionId } from '@/components/features/quick-actions';
import type { PresetInput } from '@/lib/preset-scripts';

type TabId = 'text' | 'link' | 'image' | 'file';

const tabs: { id: TabId; icon: typeof Type; label: string; desc: string }[] = [
  { id: 'text', icon: Type, label: 'Tự nhập nội dung', desc: 'Nhập từ bàn phím' },
  { id: 'link', icon: Link2, label: 'Từ link video', desc: 'YouTube, TikTok...' },
  { id: 'image', icon: Image, label: 'Từ hình ảnh', desc: 'Tải lên hình ảnh' },
  { id: 'file', icon: File, label: 'Từ file', desc: 'PDF, Word, DOCX...' },
];

const MAX_CHARS = 5000;
const URL_PATTERN = /^https?:\/\/.+/i;

interface FormErrors {
  content?: string;
  linkUrl?: string;
}

interface FormState {
  activeTab: TabId;
  content: string;
  linkUrl: string;
  language: string;
  duration: string;
  videoType: string;
  voice: string;
  dragOver: boolean;
  isSubmitting: boolean;
  submitted: boolean;
}

interface InputSectionProps {
  activeQuickAction?: QuickActionId | null;
  onActionDone?: () => void;
  presetData?: PresetInput | null;
  presetKey?: number; // increment từ ngoài để trigger useEffect khi apply cùng preset 2 lần
}

export function InputSection({ activeQuickAction, onActionDone, presetData, presetKey }: InputSectionProps = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState<FormState>({
    activeTab: 'text',
    content: '',
    linkUrl: '',
    language: 'vi',
    duration: '1-3',
    videoType: 'storytelling',
    voice: 'male-natural',
    dragOver: false,
    isSubmitting: false,
    submitted: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [justApplied, setJustApplied] = useState(false);

  // Apply preset data khi nhận từ ngoài — dùng presetKey để trigger kể cả khi cùng preset
  useEffect(() => {
    if (!presetData) return;
    setForm((f) => ({
      ...f,
      activeTab: 'text',
      content: presetData.content,
      language: presetData.language,
      duration: presetData.duration,
      videoType: presetData.videoType,
      voice: presetData.voice,
    }));
    setErrors({});
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

  // Khi nhận lệnh từ quick action buttons
  useEffect(() => {
    if (!activeQuickAction) return;

    if (activeQuickAction === 'analyze' || activeQuickAction === 'script') {
      // Chuyển sang tab text và focus textarea
      setForm((f) => ({ ...f, activeTab: 'text' }));
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [activeQuickAction]);

  const charCount = form.content.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (form.activeTab === 'text') {
      if (!form.content.trim()) newErrors.content = 'Vui lòng nhập nội dung để AI tạo video.';
      else if (form.content.trim().length < 20) newErrors.content = 'Nội dung quá ngắn — cần ít nhất 20 ký tự.';
    }
    if (form.activeTab === 'link') {
      if (!form.linkUrl.trim()) newErrors.linkUrl = 'Vui lòng nhập URL video.';
      else if (!URL_PATTERN.test(form.linkUrl.trim())) newErrors.linkUrl = 'URL không hợp lệ — phải bắt đầu bằng http:// hoặc https://';
    }
    if (form.activeTab === 'image' && !uploadedFile) newErrors.content = 'Vui lòng tải lên ít nhất một hình ảnh.';
    if (form.activeTab === 'file' && !uploadedFile) newErrors.content = 'Vui lòng tải lên file nội dung.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setForm((f) => ({ ...f, isSubmitting: true }));
    await new Promise((r) => setTimeout(r, 1500));
    setForm((f) => ({ ...f, isSubmitting: false, submitted: true }));
    onActionDone?.();
    setTimeout(() => setForm((f) => ({ ...f, submitted: false })), 3000);
  };

  const handleTabChange = (tab: TabId) => {
    setForm((f) => ({ ...f, activeTab: tab }));
    setErrors({});
    setUploadedFile(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setForm((f) => ({ ...f, dragOver: false }));
    const file = e.dataTransfer.files[0];
    if (file) { setUploadedFile(file); setErrors({}); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadedFile(file); setErrors({}); }
  };

  const acceptedTypes = form.activeTab === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt';

  // Highlight section khi được trigger từ quick action hoặc preset apply
  const isHighlighted = activeQuickAction === 'analyze' || activeQuickAction === 'script' || justApplied;

  return (
    <section className={cn('space-y-6 rounded-xl transition-all duration-300', isHighlighted && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background p-4 -m-4')}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
          2. NHẬP NỘI DUNG ĐỂ AI TẠO VIDEO
        </h2>
        {justApplied && (
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã điền từ kịch bản mẫu
          </span>
        )}
      </div>

      {/* Input source tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {tabs.map((tab) => {
          const isActive = form.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
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
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setForm((f) => ({ ...f, content: e.target.value }));
                  if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
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
            <div className="flex items-center justify-between mt-1.5">
              {errors.content ? (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errors.content}
                </p>
              ) : (
                <span />
              )}
              <span
                className={cn(
                  'text-xs tabular-nums ml-auto',
                  charPercent > 90 ? 'text-destructive' : charPercent > 70 ? 'text-yellow-400' : 'text-muted-foreground',
                )}
              >
                {charCount} / {MAX_CHARS}
              </span>
            </div>
            {charPercent > 0 && (
              <div className="mt-1 h-0.5 bg-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    charPercent > 90 ? 'bg-destructive' : charPercent > 70 ? 'bg-yellow-400' : 'bg-primary',
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
              onChange={(e) => {
                setForm((f) => ({ ...f, linkUrl: e.target.value }));
                if (errors.linkUrl) setErrors((prev) => ({ ...prev, linkUrl: undefined }));
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className={cn(
                'w-full px-4 py-3 bg-card border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none transition-colors',
                errors.linkUrl
                  ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                  : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
              )}
            />
            {errors.linkUrl && (
              <p className="flex items-center gap-1 text-xs text-destructive mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.linkUrl}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Hỗ trợ: YouTube, TikTok, Vimeo và các nền tảng video phổ biến.
            </p>
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
                'w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                form.dragOver
                  ? 'border-primary bg-primary/5'
                  : errors.content
                    ? 'border-destructive/60 hover:border-destructive'
                    : 'border-border hover:border-primary/50 hover:bg-card',
              )}
            >
              {uploadedFile ? (
                <>
                  {form.activeTab === 'image' ? (
                    <Image className="w-8 h-8 text-primary" />
                  ) : (
                    <File className="w-8 h-8 text-primary" />
                  )}
                  <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB — Nhấn để thay thế
                  </p>
                </>
              ) : (
                <>
                  {form.activeTab === 'image' ? (
                    <Image className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <File className="w-8 h-8 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {form.activeTab === 'image'
                      ? 'Kéo thả hình ảnh vào đây, hoặc nhấn để chọn'
                      : 'Kéo thả file PDF/Word vào đây, hoặc nhấn để chọn'}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {form.activeTab === 'image' ? 'JPG, PNG, WebP — tối đa 10 MB' : 'PDF, DOC, DOCX, TXT — tối đa 20 MB'}
                  </p>
                </>
              )}
            </div>
            {errors.content && (
              <p className="flex items-center gap-1 text-xs text-destructive mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.content}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Config dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-2">Ngôn ngữ</label>
          <select
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-2">Độ dài video</label>
          <select
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          >
            <option value="1-3">1 – 3 phút</option>
            <option value="5-10">5 – 10 phút</option>
            <option value="10-20">10 – 20 phút</option>
            <option value="20-30">20 – 30 phút</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-2">Kiểu video</label>
          <select
            value={form.videoType}
            onChange={(e) => setForm((f) => ({ ...f, videoType: e.target.value }))}
            className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          >
            <option value="storytelling">Kể chuyện</option>
            <option value="tutorial">Hướng dẫn</option>
            <option value="ads">Quảng cáo</option>
            <option value="review">Review sản phẩm</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-2">Giọng đọc</label>
          <select
            value={form.voice}
            onChange={(e) => setForm((f) => ({ ...f, voice: e.target.value }))}
            className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          >
            <option value="male-natural">Giọng nam – tự nhiên</option>
            <option value="female-natural">Giọng nữ – tự nhiên</option>
            <option value="male-pro">Giọng nam – chuyên nghiệp</option>
            <option value="female-young">Giọng nữ – trẻ trung</option>
          </select>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={form.isSubmitting}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2',
          form.submitted
            ? 'bg-green-600 text-white cursor-default'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {form.isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang phân tích...
          </>
        ) : form.submitted ? (
          <>
            ✓ Kịch bản đã được tạo
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Phân Tích &amp; Tạo Kịch Bản
          </>
        )}
      </button>
    </section>
  );
}
