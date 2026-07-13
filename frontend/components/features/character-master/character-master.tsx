'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  User, Upload, CheckCircle2, Plus, Trash2, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldError } from '@/components/ui/field-error';
import type { PresetCharacter } from '@/lib/preset-scripts';
import {
  type SavedCharacter,
  STYLE_OPTIONS,
  MAX_CHARACTERS,
  createEmptyCharacter,
  characterDisplayName,
  validateCharacterFields,
} from '@/lib/saved-characters';
import { presetCharactersToSaved } from '@/lib/preset-demo-builder';

type CharacterFormField = 'name' | 'role' | 'traits' | 'outfit' | 'description';

export interface CharacterMasterHandle {
  applyPreset: (data: PresetCharacter) => void;
  applyDemoCharacters: (list: PresetCharacter[]) => void;
  getCharacters: () => SavedCharacter[];
}

interface CharacterMasterProps {
  presetData?: PresetCharacter | null;
  initialCharacters?: SavedCharacter[];
  onCharactersChange?: (characters: SavedCharacter[]) => void;
}

function presetToCharacter(data: PresetCharacter, base: SavedCharacter): SavedCharacter {
  return {
    ...base,
    name: data.name,
    role: data.role,
    traits: data.traits,
    outfit: data.outfit,
    description: data.description,
    style: data.style,
    updatedAt: new Date().toISOString(),
  };
}

export const CharacterMaster = forwardRef<CharacterMasterHandle, CharacterMasterProps>(
  function CharacterMaster({ presetData, initialCharacters, onCharactersChange }, ref) {
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [characters, setCharacters] = useState<SavedCharacter[]>(
      () => (initialCharacters?.length ? initialCharacters : [createEmptyCharacter()]),
    );
    const [activeId, setActiveId] = useState(() => characters[0]?.id ?? '');
    const [avatarPreviews, setAvatarPreviews] = useState<Record<string, string>>({});
    const [showStylePicker, setShowStylePicker] = useState(false);
    const [savedFlashId, setSavedFlashId] = useState<string | null>(null);
    const [justApplied, setJustApplied] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

    const activeCharacter = characters.find((c) => c.id === activeId) ?? characters[0];

    const applyPresetToActive = useCallback((data: PresetCharacter) => {
      setCharacters((prev) =>
        prev.map((c) => (c.id === activeId ? presetToCharacter(data, c) : c)),
      );
      setErrors({});
      setJustApplied(true);
      setTimeout(() => setJustApplied(false), 2500);
    }, [activeId]);

    const applyDemoCharacters = useCallback((list: PresetCharacter[]) => {
      const chars = presetCharactersToSaved(list.slice(0, MAX_CHARACTERS));
      setCharacters(chars);
      setActiveId(chars[0]?.id ?? '');
      setErrors({});
      setJustApplied(true);
      setTimeout(() => setJustApplied(false), 2500);
    }, []);

    useImperativeHandle(ref, () => ({
      applyPreset: applyPresetToActive,
      applyDemoCharacters,
      getCharacters: () => characters,
    }), [applyPresetToActive, applyDemoCharacters, characters]);

    useEffect(() => {
      if (!presetData) return;
      applyPresetToActive(presetData);
    }, [presetData, applyPresetToActive]);

    useEffect(() => {
      onCharactersChange?.(characters);
    }, [characters, onCharactersChange]);

    const updateActive = (field: CharacterFormField | 'style', value: string) => {
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, [field]: value, updatedAt: new Date().toISOString() } : c,
        ),
      );
      if (field === 'name' || field === 'description') {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeCharacter) return;
      const url = URL.createObjectURL(file);
      setAvatarPreviews((prev) => ({ ...prev, [activeCharacter.id]: url }));
    };

    const handleAddCharacter = () => {
      if (characters.length >= MAX_CHARACTERS) return;
      const newChar = createEmptyCharacter();
      setCharacters((prev) => [...prev, newChar]);
      setActiveId(newChar.id);
      setErrors({});
      setShowStylePicker(false);
    };

    const handleSelectCharacter = (id: string) => {
      setActiveId(id);
      setErrors({});
      setShowStylePicker(false);
    };

    const handleDeleteCharacter = (id: string) => {
      if (characters.length <= 1) {
        const reset = createEmptyCharacter();
        setCharacters([reset]);
        setActiveId(reset.id);
        setAvatarPreviews({});
        setErrors({});
        return;
      }

      const next = characters.filter((c) => c.id !== id);
      setCharacters(next);
      setAvatarPreviews((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (activeId === id) {
        setActiveId(next[0]?.id ?? '');
      }
      setErrors({});
    };

    const handleSave = () => {
      if (!activeCharacter) return;
      const fieldErrors = validateCharacterFields(activeCharacter.name, activeCharacter.description);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      const now = new Date().toISOString();
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                name: c.name.trim(),
                updatedAt: now,
              }
            : c,
        ),
      );
      setSavedFlashId(activeId);
      setTimeout(() => setSavedFlashId(null), 3000);
    };

    if (!activeCharacter) return null;

    const avatarPreview = avatarPreviews[activeCharacter.id] ?? null;
    const isSavedFlash = savedFlashId === activeId;
    const canAddMore = characters.length < MAX_CHARACTERS;

    return (
      <section className={cn(
        'space-y-4 rounded-xl transition-all duration-300',
        justApplied && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background p-4 -m-4',
      )}>
        {/* Header */}
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
              1. NHÂN VẬT CHÍNH
            </h2>
            <div className="flex items-center gap-2">
              {justApplied && (
                <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã điền từ kịch bản mẫu
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border px-2.5 py-1 rounded-full">
                <Users className="w-3.5 h-3.5" />
                {characters.length}/{MAX_CHARACTERS} nhân vật
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Thiết lập một hoặc nhiều nhân vật — tất cả sẽ xuất hiện đồng nhất trong các cảnh video.
          </p>
        </div>

        {/* Character strip */}
        <div className="flex gap-2 overflow-x-auto overflow-y-visible py-1 scrollbar-thin">
          {characters.map((char, index) => {
            const isActive = char.id === activeId;
            const preview = avatarPreviews[char.id];
            return (
              <div
                key={char.id}
                className={cn(
                  'relative flex-shrink-0 group',
                  isActive ? 'z-20' : 'z-0 hover:z-10',
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelectCharacter(char.id)}
                  className={cn(
                    'flex items-center gap-2.5 pl-2 py-2 rounded-xl border transition-all min-w-[140px] max-w-[200px] w-full',
                    characters.length > 1 ? 'pr-8' : 'pr-3',
                    isActive
                      ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                      : 'bg-card border-border text-foreground hover:border-primary/25 hover:bg-muted/30',
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border',
                    isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted',
                  )}>
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    )}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className={cn(
                      'text-xs font-semibold truncate',
                      isActive ? 'text-primary' : 'text-foreground',
                    )}>
                      {characterDisplayName(char.name)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {char.role.trim() || `Nhân vật ${index + 1}`}
                    </p>
                  </div>
                </button>
                {characters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCharacter(char.id)}
                    title="Xóa nhân vật"
                    className={cn(
                      'absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add character */}
          <button
            type="button"
            onClick={handleAddCharacter}
            disabled={!canAddMore}
            title={canAddMore ? 'Thêm nhân vật mới' : `Tối đa ${MAX_CHARACTERS} nhân vật`}
            className={cn(
              'flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed transition-all min-h-[52px]',
              canAddMore
                ? 'border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60'
                : 'border-border text-muted-foreground/50 cursor-not-allowed',
            )}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-semibold whitespace-nowrap">Thêm nhân vật</span>
          </button>
        </div>

        {/* Active character form */}
        <div className="w-full bg-card border border-border rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-5 md:gap-8 lg:gap-10">
          {/* Avatar */}
          <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-3 shrink-0 md:w-36 lg:w-40">
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
                {activeCharacter.style}
              </button>
              {showStylePicker && (
                <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[160px]">
                  {STYLE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { updateActive('style', s); setShowStylePicker(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs transition-colors',
                        s === activeCharacter.style
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
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Tên nhân vật <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={activeCharacter.name}
                onChange={(e) => updateActive('name', e.target.value)}
                placeholder="Nhập tên nhân vật..."
                maxLength={60}
                className={cn(
                  'w-full px-4 py-2.5 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none transition-colors',
                  errors.name
                    ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                    : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
                )}
              />
              {errors.name && <FieldError className="items-center gap-1 mt-1">{errors.name}</FieldError>}
            </div>

            {/* Role / Traits / Outfit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {([
                { field: 'role' as const, label: 'Vai trò', placeholder: 'VD: Nhà thám hiểm' },
                { field: 'traits' as const, label: 'Đặc điểm', placeholder: 'Tính cách, ngoại hình...' },
                { field: 'outfit' as const, label: 'Trang phục', placeholder: 'Mô tả trang phục...' },
              ]).map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={activeCharacter[field]}
                    onChange={(e) => updateActive(field, e.target.value)}
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
                  activeCharacter.description.length > 450 ? 'text-destructive' : 'text-muted-foreground',
                )}>
                  {activeCharacter.description.length}/500
                </span>
              </div>
              <textarea
                value={activeCharacter.description}
                onChange={(e) => updateActive('description', e.target.value)}
                placeholder="Mô tả chi tiết về nhân vật — ngoại hình, tính cách, background..."
                maxLength={500}
                className={cn(
                  'w-full h-24 px-4 py-2.5 bg-background border rounded-lg text-foreground placeholder-muted-foreground resize-none focus:outline-none transition-colors',
                  errors.description
                    ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                    : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
                )}
              />
              {errors.description && <FieldError className="items-center gap-1 mt-1">{errors.description}</FieldError>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
              {characters.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteCharacter(activeCharacter.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa nhân vật này
                </button>
              )}
              <div className={cn('flex justify-end', characters.length <= 1 && 'ml-auto')}>
                <button
                  type="button"
                  onClick={handleSave}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                    isSavedFlash
                      ? 'bg-green-600/20 border border-green-600/40 text-green-400 cursor-default'
                      : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20',
                  )}
                >
                  {isSavedFlash ? (
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
        </div>
      </section>
    );
  },
);
