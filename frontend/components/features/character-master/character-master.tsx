'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { User, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PresetCharacter } from '@/lib/preset-scripts';

interface CharacterForm {
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
}

interface CharacterErrors {
  name?: string;
  description?: string;
}

const STYLE_OPTIONS = [
  'Realistic', 'Anime / Manga', 'Cartoon', 'Cinematic', 'Oil Painting',
  'Watercolor', 'Flat Design', 'Cyberpunk',
];

export interface CharacterMasterHandle {
  applyPreset: (data: PresetCharacter) => void;
}

interface CharacterMasterProps {
  presetData?: PresetCharacter | null;
}

export const CharacterMaster = forwardRef<CharacterMasterHandle, CharacterMasterProps>(
  function CharacterMaster({ presetData }, ref) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('Realistic');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  const [form, setForm] = useState<CharacterForm>({
    name: '', role: '', traits: '', outfit: '', description: '',
  });
  const [errors, setErrors] = useState<CharacterErrors>({});

  // Expose applyPreset via ref
  useImperativeHandle(ref, () => ({
    applyPreset: (data: PresetCharacter) => {
      setForm({
        name: data.name,
        role: data.role,
        traits: data.traits,
        outfit: data.outfit,
        description: data.description,
      });
      setSelectedStyle(data.style);
      setErrors({});
      setJustApplied(true);
      setTimeout(() => setJustApplied(false), 2500);
    },
  }));

  // Cũng hỗ trợ prop-based apply (khi presetData thay đổi từ ngoài)
  useEffect(() => {
    if (!presetData) return;
    setForm({
      name: presetData.name,
      role: presetData.role,
      traits: presetData.traits,
      outfit: presetData.outfit,
      description: presetData.description,
    });
    setSelectedStyle(presetData.style);
    setErrors({});
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
  }, [presetData]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  };

  const setField = (field: keyof CharacterForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field as keyof CharacterErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: CharacterErrors = {};
    const name = form.name.trim();
    if (!name) {
      newErrors.name = 'Tên nhân vật không được để trống.';
    } else if (name.length < 2) {
      newErrors.name = `Tên quá ngắn — cần ít nhất 2 ký tự (hiện tại: ${name.length}).`;
    } else if (name.length > 60) {
      newErrors.name = `Tên quá dài — tối đa 60 ký tự (hiện tại: ${name.length}).`;
    }
    if (form.description.length > 500) {
      newErrors.description = `Mô tả quá dài — tối đa 500 ký tự (hiện tại: ${form.description.length}).`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <section className={cn('space-y-4 rounded-xl transition-all duration-300', justApplied && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background p-4 -m-4')}>
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
            1. MASTER CHARACTER (ĐỒNG BỘ NHÂN VẬT)
          </h2>
          {justApplied && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã điền từ kịch bản mẫu
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1.5">
          Thiết lập nhân vật trước khi tạo kịch bản — nhân vật sẽ xuất hiện đồng nhất trong tất cả các cảnh.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row gap-5 sm:gap-8">
        {/* Avatar */}
        <div className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3 flex-shrink-0">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="group relative w-32 h-32 bg-muted rounded-xl overflow-hidden border border-border flex items-center justify-center hover:border-primary/50 transition-colors"
            title="Tải lên ảnh nhân vật"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Avatar nhân vật" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-muted-foreground group-hover:text-primary/60 transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
          </button>

          {/* Style picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStylePicker((v) => !v)}
              className="w-full px-4 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              {selectedStyle}
            </button>
            {showStylePicker && (
              <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSelectedStyle(s); setShowStylePicker(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs transition-colors',
                      s === selectedStyle
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div className="flex-1 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Tên nhân vật <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Nhập tên nhân vật..."
              maxLength={60}
              className={cn(
                'w-full px-4 py-2.5 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none transition-colors',
                errors.name
                  ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                  : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
              )}
            />
            {errors.name && (
              <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.name}
              </div>
            )}
          </div>

          {/* Role / Traits / Outfit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { field: 'role' as const, label: 'Vai trò', placeholder: 'VD: Nhà thám hiểm' },
              { field: 'traits' as const, label: 'Đặc điểm', placeholder: 'Tính cách, ngoại hình...' },
              { field: 'outfit' as const, label: 'Trang phục', placeholder: 'Mô tả trang phục...' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  {label}
                </label>
                <input
                  type="text"
                  value={form[field]}
                  onChange={(e) => setField(field, e.target.value)}
                  placeholder={placeholder}
                  maxLength={80}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Mô tả chi tiết
              </label>
              <span className={cn(
                'text-xs tabular-nums',
                form.description.length > 450 ? 'text-destructive' : 'text-muted-foreground',
              )}>
                {form.description.length}/500
              </span>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Mô tả chi tiết về nhân vật — ngoại hình, tính cách, background..."
              maxLength={500}
              className={cn(
                'w-full h-24 px-4 py-2.5 bg-background border rounded-lg text-foreground placeholder-muted-foreground resize-none focus:outline-none transition-colors',
                errors.description
                  ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                  : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
              )}
            />
            {errors.description && (
              <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.description}
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-1">
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
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Đã lưu nhân vật
                </>
              ) : (
                'Lưu nhân vật'
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});
