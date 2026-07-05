// ─── Kiểu dữ liệu nhân vật đã lưu ───────────────────────────────────────────

export interface SavedCharacter {
  id: string;
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style: string;
  createdAt: string;
  updatedAt: string;
}

export const STYLE_OPTIONS = [
  'Realistic', 'Anime / Manga', 'Cartoon', 'Cinematic', 'Oil Painting',
  'Watercolor', 'Flat Design', 'Cyberpunk',
] as const;

export const MAX_CHARACTERS = 8;

export function generateCharacterId(): string {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyCharacter(): SavedCharacter {
  const now = new Date().toISOString();
  return {
    id: generateCharacterId(),
    name: '',
    role: '',
    traits: '',
    outfit: '',
    description: '',
    style: 'Realistic',
    createdAt: now,
    updatedAt: now,
  };
}

export function characterDisplayName(name: string): string {
  const trimmed = name.trim();
  return trimmed || 'Nhân vật mới';
}

export interface CharacterFieldErrors {
  name?: string;
  description?: string;
}

export function validateCharacterFields(
  name: string,
  description: string,
): CharacterFieldErrors {
  const errors: CharacterFieldErrors = {};
  const trimmedName = name.trim();

  if (!trimmedName) {
    errors.name = 'Tên nhân vật không được để trống.';
  } else if (trimmedName.length < 2) {
    errors.name = `Tên quá ngắn — cần ít nhất 2 ký tự (hiện tại: ${trimmedName.length}).`;
  } else if (trimmedName.length > 60) {
    errors.name = `Tên quá dài — tối đa 60 ký tự (hiện tại: ${trimmedName.length}).`;
  }

  if (description.length > 500) {
    errors.description = `Mô tả quá dài — tối đa 500 ký tự (hiện tại: ${description.length}).`;
  }

  return errors;
}
