'use client';

import { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type LicenseStatus = 'idle' | 'checking' | 'valid' | 'invalid';
type ApiStatus = 'idle' | 'saving' | 'saved' | 'error';

interface KeySetupErrors {
  licenseKey?: string;
  openaiKey?: string;
  inputFolder?: string;
}

export function KeySetupSettings() {
  // License key
  const [licenseKey, setLicenseKey] = useState('3L4Y-TXRH-J540-TQRF');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('valid');

  // OpenAI
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('idle');

  // Paths
  const [inputFolder, setInputFolder] = useState('D:\\Projects\\Input');
  const [outputFolder] = useState('D:\\Projects\\Output');

  // Script options
  const [autoSubtitle, setAutoSubtitle] = useState(true);
  const [addBgMusic, setAddBgMusic] = useState(true);
  const [addWatermark, setAddWatermark] = useState(false);
  const [scriptDuration, setScriptDuration] = useState('5-15');
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [scriptLanguage, setScriptLanguage] = useState('vi');

  const [errors, setErrors] = useState<KeySetupErrors>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

  const VALID_LICENSE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  const checkLicense = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) {
      setErrors((prev) => ({ ...prev, licenseKey: 'Vui lòng nhập license key.' }));
      return;
    }
    if (!VALID_LICENSE_PATTERN.test(key)) {
      setErrors((prev) => ({ ...prev, licenseKey: 'Định dạng key không hợp lệ (XXXX-XXXX-XXXX-XXXX).' }));
      setLicenseStatus('invalid');
      return;
    }
    setErrors((prev) => ({ ...prev, licenseKey: undefined }));
    setLicenseStatus('checking');
    await new Promise((r) => setTimeout(r, 1000));
    setLicenseStatus('valid');
  };

  const saveApiKey = async () => {
    if (!openaiKey.trim()) {
      setErrors((prev) => ({ ...prev, openaiKey: 'Vui lòng nhập OpenAI API key.' }));
      return;
    }
    if (!openaiKey.trim().startsWith('sk-')) {
      setErrors((prev) => ({ ...prev, openaiKey: 'Key phải bắt đầu bằng "sk-".' }));
      return;
    }
    setErrors((prev) => ({ ...prev, openaiKey: undefined }));
    setApiStatus('saving');
    await new Promise((r) => setTimeout(r, 800));
    setApiStatus('saved');
    setTimeout(() => setApiStatus('idle'), 2500);
  };

  const saveSettings = () => {
    const newErrors: KeySetupErrors = {};
    if (!inputFolder.trim()) newErrors.inputFolder = 'Vui lòng nhập đường dẫn thư mục đầu vào.';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* License section */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-0.5">License Key</h4>
          <p className="text-xs text-muted-foreground">Nhập key để kích hoạt đầy đủ tính năng</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">License Key</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => {
                  setLicenseKey(e.target.value.toUpperCase());
                  setLicenseStatus('idle');
                  setErrors((prev) => ({ ...prev, licenseKey: undefined }));
                }}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
                className={cn(
                  'w-full px-4 py-2 bg-background border rounded-lg text-sm text-foreground font-mono focus:outline-none transition-colors',
                  errors.licenseKey
                    ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                    : licenseStatus === 'valid'
                      ? 'border-green-500/50 focus:border-green-500/50'
                      : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
                )}
              />
              {licenseStatus === 'valid' && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400 pointer-events-none" />
              )}
              {licenseStatus === 'invalid' && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive pointer-events-none" />
              )}
            </div>
            <button
              type="button"
              onClick={checkLicense}
              disabled={licenseStatus === 'checking'}
              className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {licenseStatus === 'checking' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Đang kiểm tra...</>
              ) : 'Kiểm tra'}
            </button>
          </div>
          {errors.licenseKey && (
            <p className="flex items-center gap-1 text-xs text-destructive mt-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{errors.licenseKey}
            </p>
          )}
          {licenseStatus === 'valid' && !errors.licenseKey && (
            <p className="flex items-center gap-1 text-xs text-green-400 mt-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />Key hợp lệ — đã kích hoạt
            </p>
          )}
          {licenseStatus === 'invalid' && !errors.licenseKey && (
            <p className="flex items-center gap-1 text-xs text-destructive mt-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />Key không hợp lệ — vui lòng kiểm tra lại
            </p>
          )}
        </div>

        {/* OpenAI config */}
        <div className="space-y-3 pt-3 border-t border-border">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider">OpenAI Configuration</h5>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Model sinh kịch bản</label>
            <select
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="gpt-4o">GPT-4o (Khuyến nghị)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Nhanh hơn)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">OpenAI API Key</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => {
                    setOpenaiKey(e.target.value);
                    setErrors((prev) => ({ ...prev, openaiKey: undefined }));
                    setApiStatus('idle');
                  }}
                  placeholder="sk-..."
                  className={cn(
                    'w-full px-4 py-2 pr-10 bg-background border rounded-lg text-sm text-foreground font-mono focus:outline-none transition-colors',
                    errors.openaiKey
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={saveApiKey}
                disabled={apiStatus === 'saving'}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2',
                  apiStatus === 'saved'
                    ? 'bg-green-600/20 border border-green-600/40 text-green-400'
                    : 'bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {apiStatus === 'saving' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Lưu...</>
                ) : apiStatus === 'saved' ? (
                  <><CheckCircle2 className="w-4 h-4" />Đã lưu</>
                ) : 'Lưu key'}
              </button>
            </div>
            {errors.openaiKey && (
              <p className="flex items-center gap-1 text-xs text-destructive mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{errors.openaiKey}
              </p>
            )}
          </div>
        </div>

        {/* Paths */}
        <div className="space-y-3 pt-3 border-t border-border">
          <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider">Thư mục làm việc</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Thư mục đầu vào</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputFolder}
                  onChange={(e) => {
                    setInputFolder(e.target.value);
                    setErrors((prev) => ({ ...prev, inputFolder: undefined }));
                  }}
                  placeholder="D:\..."
                  className={cn(
                    'flex-1 px-4 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none transition-colors',
                    errors.inputFolder
                      ? 'border-destructive focus:border-destructive'
                      : 'border-border focus:border-primary/50',
                  )}
                />
                <button type="button" className="p-2 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Duyệt thư mục">
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
              {errors.inputFolder && (
                <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{errors.inputFolder}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Thư mục đầu ra</label>
              <div className="px-4 py-2 bg-background/50 border border-border rounded-lg text-sm text-muted-foreground select-all">
                {outputFolder}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tự động từ thư mục đầu vào</p>
            </div>
          </div>
        </div>
      </div>

      {/* Script options */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-0.5">Tuỳ Chọn Kịch Bản</h4>
          <p className="text-xs text-muted-foreground">Cấu hình mặc định cho video generation</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Độ dài kịch bản</label>
            <select
              value={scriptDuration}
              onChange={(e) => setScriptDuration(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="1-5">1 – 5 phút</option>
              <option value="5-15">5 – 15 phút</option>
              <option value="15-30">15 – 30 phút</option>
              <option value="30-60">30 – 60 phút</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Phong cách hiệu ứng video</label>
            <select
              value={videoStyle}
              onChange={(e) => setVideoStyle(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="cinematic">Cinematic</option>
              <option value="documentary">Documentary</option>
              <option value="modern">Modern</option>
              <option value="minimal">Minimalist</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Ngôn ngữ kịch bản</label>
            <select
              value={scriptLanguage}
              onChange={(e) => setScriptLanguage(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          {[
            { id: 'subtitle', label: 'Tạo phụ đề tự động', desc: 'Tự động tạo file SRT từ audio', value: autoSubtitle, set: setAutoSubtitle },
            { id: 'bgmusic', label: 'Thêm nhạc nền', desc: 'Thêm background music tự động', value: addBgMusic, set: setAddBgMusic },
            { id: 'watermark', label: 'Thêm logo / watermark', desc: 'Chèn logo vào góc video', value: addWatermark, set: setAddWatermark },
          ].map(({ id, label, desc, value, set }) => (
            <div key={id} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={() => set(!value)}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0',
                  value ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  value ? 'translate-x-4' : 'translate-x-0.5',
                )} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={saveSettings}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all',
              settingsSaved
                ? 'bg-green-600/20 border border-green-600/40 text-green-400 cursor-default'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground',
            )}
          >
            {settingsSaved ? (
              <><CheckCircle2 className="w-4 h-4" />Đã lưu cài đặt</>
            ) : 'Lưu Cài Đặt'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenaiKey('');
              setInputFolder('');
              setVideoStyle('cinematic');
              setAutoSubtitle(true);
              setAddBgMusic(true);
              setAddWatermark(false);
              setErrors({});
            }}
            className="px-4 py-2 bg-muted/30 hover:bg-muted/50 border border-border text-muted-foreground hover:text-foreground text-sm font-medium rounded-lg transition-colors"
          >
            Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
}
