'use client';

import { useRef, useState } from 'react';
import { Sparkles, Crown, CheckCircle2, Loader2 } from 'lucide-react';
import { FieldError } from '@/components/ui/field-error';
import { parseDataUrl } from '@/lib/pipeline-payload';
import { getApiKey, API_KEY_IDS } from '@/lib/api-keys/api-keys-store';
import { geminiService } from '@/services/gemini/gemini.service';
import { uploadReferenceImageFile, validateReferenceImageFile } from '@/lib/veo/upload-reference-image';

interface MasterCastPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  imageDataUrl?: string;
  onImageChange: (dataUrl: string | undefined) => void;
  /**
   * Có mặt khi đang chờ xác nhận (tab link).
   * Truyền kèm imageDataUrl hiện tại (không phụ thuộc state async của parent).
   */
  onConfirm?: (imageDataUrl?: string) => void;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Không đọc được file ảnh.'));
    };
    reader.onerror = () => reject(new Error('Không đọc được file ảnh — thử lại.'));
    reader.readAsDataURL(file);
  });
}

/** Khối "Master Cast" — prompt mô tả toàn bộ dàn nhân vật (Gemini sinh) + ảnh tham chiếu user tự upload/dán. Chỉ hiện cho video tạo từ tab "Từ link video". */
export function MasterCastPanel({ prompt, onPromptChange, imageDataUrl, onImageChange, onConfirm }: MasterCastPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Ref đồng bộ ngay khi chọn ảnh — tránh race khi bấm xác nhận trước khi parent re-render */
  const imageRef = useRef<string | undefined>(imageDataUrl);
  imageRef.current = imageDataUrl;
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);

  /**
   * Vision phân tích ĐÚNG ảnh vừa upload — kết quả ghi THẲNG vào ô prompt (thay vì 1 field
   * ẩn riêng) để đây là NGUỒN DUY NHẤT được gửi cho Veo/Kie lúc tạo video. Trước đây có 2
   * field tách rời (prompt hiển thị/sửa được vs field ẩn thực sự dùng để generate) khiến
   * user sửa prompt xong không có tác dụng gì — sáp nhập lại để sửa ở đây là sửa thật.
   */
  const analyzeCharacterSheet = async (dataUrl: string) => {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return;
    setAnalyzing(true);
    try {
      const description = await geminiService.describeCharacterSheet({
        apiKey: getApiKey(API_KEY_IDS.gemini) || undefined,
        imageBase64: parsed.base64,
        imageMimeType: parsed.mimeType,
      });
      if (description.trim()) onPromptChange(description.trim());
    } catch {
      // Best-effort — ảnh tham chiếu vẫn gửi kèm Veo/Kie như bình thường dù phân tích thất bại;
      // giữ nguyên prompt hiện có (không xoá) để user vẫn còn mô tả cũ dùng tạm.
    } finally {
      setAnalyzing(false);
    }
  };

  const applyImageFile = async (file: File | null | undefined) => {
    if (!file) return;
    const validationError = validateReferenceImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      // Hiện preview ngay bằng base64 local — không đợi upload xong mới thấy ảnh.
      const dataUrl = await readImageFile(file);
      imageRef.current = dataUrl;
      onImageChange(dataUrl);
      setError(null);
      void analyzeCharacterSheet(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đọc được file ảnh — thử lại.');
      return;
    }

    // Upload lên kie.ai lấy URL bền vững — thay thế base64 local để lưu Supabase (base64
    // không đồng bộ, mất khi F5). Giữ nguyên preview base64 nếu upload lỗi (best-effort).
    setUploading(true);
    try {
      const url = await uploadReferenceImageFile(file);
      imageRef.current = url;
      onImageChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload ảnh lên kie.ai thất bại — vẫn dùng tạm ảnh local.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    void applyImageFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        void applyImageFile(item.getAsFile());
        return;
      }
    }
  };

  // Ảnh tham chiếu là TUỲ CHỌN — không có ảnh vẫn cho tạo video (dựa vào prompt text +
  // Scene Continuity nối khung hình cuối cho cảnh 2+ nếu user bật).
  const handleConfirm = () => {
    onConfirm?.(imageRef.current?.trim());
  };

  return (
    <div
      className="bg-card border border-primary/30 rounded-xl overflow-hidden"
      onPaste={handlePaste}
    >
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
          title="Tải lên hoặc Ctrl+V dán ảnh tham chiếu dàn nhân vật"
        >
          {imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageDataUrl} alt="Ảnh tham chiếu dàn nhân vật" className="w-full h-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 px-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
              <Crown className="w-3.5 h-3.5" />
              <span>Ảnh tham chiếu (tuỳ chọn)</span>
              <span className="text-[10px] font-normal opacity-80">Click tải lên hoặc Ctrl+V dán</span>
            </span>
          )}
          {(analyzing || uploading) && (
            <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/70 text-[11px] font-medium text-white">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {uploading ? 'Đang lưu ảnh...' : 'Gemini đang phân tích nhân vật...'}
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Prompt mô tả dàn nhân vật (tự sinh từ ảnh upload — sửa gì, dùng đúng cái đó)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onPaste={handlePaste}
            rows={6}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground resize-y focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          {error && <FieldError className="items-center gap-1">{error}</FieldError>}
          <p className="text-[11px] text-muted-foreground">
            Đây là mô tả DUY NHẤT được chèn vào mọi cảnh khi tạo video — sửa trực tiếp ở đây nếu AI mô tả sai chi tiết nào. Ảnh sheet chỉ giữ ngoại hình, mỗi cảnh vẫn theo prompt riêng (hành động/bối cảnh mới), không copy nguyên ảnh này.
          </p>
        </div>
      </div>

      {onConfirm && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-primary/20 bg-primary/5">
          <p className="text-xs text-muted-foreground">
            Ảnh tham chiếu là tuỳ chọn — có thể bấm xác nhận ngay để tạo giọng đọc + video chỉ bằng prompt, hoặc tải/dán ảnh trước để tăng độ nhất quán ngoại hình nhân vật.
          </p>
          <button
            type="button"
            onClick={handleConfirm}
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
