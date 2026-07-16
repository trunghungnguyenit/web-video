'use client';

import { useRef, useState } from 'react';
import { Sparkles, Crown, CheckCircle2 } from 'lucide-react';
import { FieldError } from '@/components/ui/field-error';

const MAX_MASTER_CAST_IMAGE_MB = 5;

interface MasterCastPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  imageDataUrl?: string;
  onImageChange: (dataUrl: string | undefined) => void;
  /** Có mặt khi đang chờ xác nhận (tab link) — hiện nút "Xác nhận & Tạo video" */
  onConfirm?: () => void;
}

/** Khối "Master Cast" — prompt mô tả toàn bộ dàn nhân vật (Gemini sinh) + ảnh tham chiếu user tự upload. Chỉ hiện cho video tạo từ tab "Từ link video". */
export function MasterCastPanel({ prompt, onPromptChange, imageDataUrl, onImageChange, onConfirm }: MasterCastPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File phải là hình ảnh (JPG, PNG, WebP...).');
      return;
    }
    if (file.size > MAX_MASTER_CAST_IMAGE_MB * 1024 * 1024) {
      setError(`Ảnh quá lớn — tối đa ${MAX_MASTER_CAST_IMAGE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;
      onImageChange(dataUrl);
      setError(null);
    };
    reader.onerror = () => setError('Không đọc được file ảnh — thử lại.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-card border border-primary/30 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/20 bg-primary/5">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          Master Cast Image Prompt (Character Consistency)
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative w-full sm:w-56 aspect-video shrink-0 bg-black/60 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors flex items-center justify-center"
          title="Tải lên ảnh tham chiếu dàn nhân vật"
        >
          {imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageDataUrl} alt="Ảnh tham chiếu dàn nhân vật" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
              <Crown className="w-3.5 h-3.5" />
              Ảnh tham chiếu
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Prompt mô tả dàn nhân vật (Gemini tự sinh — có thể sửa)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground resize-y focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          {error && <FieldError className="items-center gap-1">{error}</FieldError>}
        </div>
      </div>

      {onConfirm && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-primary/20 bg-primary/5">
          <p className="text-xs text-muted-foreground">
            Xem/sửa prompt và upload ảnh tham chiếu xong thì bấm xác nhận để bắt đầu tạo giọng đọc + video.
          </p>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-colors shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Xác nhận & Tạo video
          </button>
        </div>
      )}
    </div>
  );
}
