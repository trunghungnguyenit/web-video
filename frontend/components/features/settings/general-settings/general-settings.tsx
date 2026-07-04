'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toggle {
  id: string;
  label: string;
  description?: string;
  value: boolean;
}

export function GeneralSettings() {
  const [language, setLanguage] = useState('vi');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [saved, setSaved] = useState(false);

  const [toggles, setToggles] = useState<Toggle[]>([
    { id: 'sound', label: 'Thông báo âm thanh', description: 'Phát âm thanh khi render hoàn tất', value: true },
    { id: 'autosave', label: 'Tự động lưu', description: 'Lưu project mỗi 5 phút', value: true },
    { id: 'tips', label: 'Hiện gợi ý', description: 'Hiển thị hướng dẫn và gợi ý khi dùng app', value: false },
  ]);

  const flipToggle = (id: string) => {
    setToggles((prev) => prev.map((t) => t.id === id ? { ...t, value: !t.value } : t));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h4 className="text-sm font-semibold text-foreground">Cài đặt chung</h4>

      {/* Language */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">Ngôn ngữ hiển thị</label>
        <select
          value={language}
          onChange={(e) => { setLanguage(e.target.value); setSaved(false); }}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-colors"
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>

      {/* Theme */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">Chủ đề giao diện</label>
        <div className="flex gap-2">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTheme(t); setSaved(false); }}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                theme === t
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-border/30 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              {t === 'dark' ? '🌙 Tối' : '☀️ Sáng'}
            </button>
          ))}
        </div>
        {theme === 'light' && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            Chế độ sáng sẽ có hiệu lực sau khi lưu và tải lại trang.
          </p>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-1 border-t border-border">
        {toggles.map((toggle) => (
          <div key={toggle.id} className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-xs font-medium text-foreground">{toggle.label}</p>
              {toggle.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{toggle.description}</p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={toggle.value}
              onClick={() => flipToggle(toggle.id)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex-shrink-0',
                toggle.value ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  toggle.value ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
              <span className="sr-only">{toggle.label}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Account info */}
      <div className="border-t border-border pt-5 space-y-2">
        <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Tài khoản</h5>
        {[
          { label: 'Email', value: 'user@example.com' },
          { label: 'Gói', value: 'Pro', highlight: true },
          { label: 'Hết hạn', value: '31 tháng 12, 2025' },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={cn('text-sm', highlight ? 'text-primary font-semibold' : 'text-foreground')}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border pt-5">
        <button
          type="button"
          className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-medium rounded-lg transition-colors"
        >
          Đăng xuất
        </button>
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
            saved
              ? 'bg-green-600/20 border border-green-600/40 text-green-400 cursor-default'
              : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20',
          )}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Đã lưu</>
          ) : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}
