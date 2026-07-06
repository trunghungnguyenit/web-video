'use client';

import { useState } from 'react';
import { FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportErrors {
  outputFolder?: string;
}

interface Toggle {
  id: string;
  label: string;
  desc: string;
  value: boolean;
}

// Validate đường dẫn thư mục
function validateFolder(path: string): string | null {
  if (!path.trim()) return 'Vui lòng nhập đường dẫn thư mục đầu ra.';
  // Windows path: bắt đầu bằng ký tự ổ đĩa VD: C:\, D:\
  const windowsPath = /^[A-Za-z]:\\/;
  // Linux/Mac path: bắt đầu bằng /
  const unixPath = /^\//;
  if (!windowsPath.test(path.trim()) && !unixPath.test(path.trim())) {
    return 'Đường dẫn không hợp lệ — phải bắt đầu bằng ổ đĩa (VD: D:\\Output) hoặc / (VD: /home/user/output).';
  }
  if (path.trim().length < 4) return 'Đường dẫn quá ngắn — hãy nhập đầy đủ.';
  return null;
}

export function ExportSettings() {
  const [outputFolder, setOutputFolder] = useState('D:\\Projects\\Output');
  const [resolution, setResolution] = useState('1080p');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [videoFormat, setVideoFormat] = useState('mp4');
  const [errors, setErrors] = useState<ExportErrors>({});
  const [saved, setSaved] = useState(false);

  const [toggles, setToggles] = useState<Toggle[]>([
    { id: 'subtitle', label: 'Tạo phụ đề tự động', desc: 'Xuất file .srt đồng bộ với audio', value: true },
    { id: 'bgmusic',  label: 'Thêm nhạc nền',        desc: 'Chèn background music vào video', value: true },
    { id: 'watermark',label: 'Thêm watermark / logo', desc: 'Chèn logo vào góc dưới video',    value: false },
  ]);

  const flipToggle = (id: string) => {
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, value: !t.value } : t)));
    setSaved(false);
  };

  const handleSave = () => {
    const err = validateFolder(outputFolder);
    if (err) { setErrors({ outputFolder: err }); return; }
    setErrors({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setOutputFolder('D:\\Projects\\Output');
    setResolution('1080p');
    setAspectRatio('9:16');
    setVideoFormat('mp4');
    setToggles((prev) => prev.map((t) => ({
      ...t,
      value: t.id === 'subtitle' || t.id === 'bgmusic' ? true : false,
    })));
    setErrors({});
    setSaved(false);
  };

  return (
    <div className="space-y-5">

      {/* ── Section: Output ───────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-foreground">Thư mục & Định dạng</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Cấu hình đầu ra mặc định cho mỗi video</p>
        </div>

        {/* Output folder */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Thư mục đầu ra</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={outputFolder}
              onChange={(e) => {
                setOutputFolder(e.target.value);
                setErrors((prev) => ({ ...prev, outputFolder: undefined }));
                setSaved(false);
              }}
              placeholder="D:\Projects\Output"
              className={cn(
                'flex-1 px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 transition-colors',
                errors.outputFolder
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/25'
                  : 'border-border focus:border-primary/50 focus:ring-primary/20',
              )}
            />
            <button
              type="button"
              title="Chọn thư mục"
              className="p-2 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
          {errors.outputFolder && (
            <p className="flex items-start gap-1.5 text-xs text-destructive leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {errors.outputFolder}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Video hoàn chỉnh sẽ được lưu tại thư mục này sau khi FFmpeg ghép xong.
          </p>
        </div>

        {/* Grid: resolution, aspect, format */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Độ phân giải</label>
            <select
              value={resolution}
              onChange={(e) => { setResolution(e.target.value); setSaved(false); }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="720p">720p (HD)</option>
              <option value="1080p">1080p (Full HD)</option>
              <option value="4k">4K (Ultra HD)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tỷ lệ khung hình</label>
            <select
              value={aspectRatio}
              onChange={(e) => { setAspectRatio(e.target.value); setSaved(false); }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="9:16">9:16 (Dọc · TikTok/Reels)</option>
              <option value="16:9">16:9 (Ngang · YouTube)</option>
              <option value="1:1">1:1 (Vuông · Instagram)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Định dạng video</label>
            <select
              value={videoFormat}
              onChange={(e) => { setVideoFormat(e.target.value); setSaved(false); }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="mp4">MP4 (H.264)</option>
              <option value="mp4-h265">MP4 (H.265 · nhỏ hơn)</option>
              <option value="webm">WebM</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Section: Post-processing options ──────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-foreground">Xử lý sau khi render</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Các tùy chọn FFmpeg áp dụng tự động khi ghép video</p>
        </div>

        <div className="space-y-1 divide-y divide-border/50">
          {toggles.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={t.value}
                onClick={() => flipToggle(t.id)}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex-shrink-0',
                  t.value ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    t.value ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
                <span className="sr-only">{t.label}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Note about subtitle */}
        {toggles.find((t) => t.id === 'subtitle')?.value && (
          <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/15 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              File phụ đề <span className="text-foreground font-medium">.srt</span> sẽ được xuất cùng thư mục với video, đồng bộ với TTS audio.
            </p>
          </div>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
            saved
              ? 'bg-green-600/20 border border-green-600/40 text-green-400 cursor-default'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground',
          )}
        >
          {saved
            ? <><CheckCircle2 className="w-4 h-4" />Đã lưu cài đặt</>
            : 'Lưu cài đặt xuất'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2.5 bg-muted/30 hover:bg-muted/50 border border-border text-muted-foreground hover:text-foreground text-sm font-medium rounded-xl transition-colors"
        >
          Đặt lại
        </button>
      </div>
    </div>
  );
}
