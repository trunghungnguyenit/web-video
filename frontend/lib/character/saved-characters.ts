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
  /**
   * Ảnh tham chiếu nhân vật — dùng làm ảnh mồi cho Veo/Kie giữ nhất quán ngoại hình qua các
   * cảnh. Là URL công khai đã upload lên kie.ai (không phải base64) — đồng bộ Supabase
   * (video_characters.avatar_url) nên còn lại sau F5/đăng nhập máy khác. Base64 local tạm
   * thời chỉ xuất hiện trong lúc đang upload (xem CharacterMaster.handleAvatarChange).
   */
  avatarDataUrl?: string;
}

/** Style nhân vật — dropdown mục 1 */
export const STYLE_OPTIONS = [
  'Realistic', 'Anime / Manga', 'Cartoon', 'Cinematic', 'Oil Painting',
  'Watercolor', 'Flat Design', 'Cyberpunk',
] as const;

/** Giới hạn số nhân vật tối đa trong một project */
export const MAX_CHARACTERS = 8;

/** Sinh id nhân vật duy nhất: `char-{timestamp}-{random}` */
export function generateCharacterId(): string {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Tạo SavedCharacter rỗng với style Realistic và timestamp hiện tại */
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

/** Tên hiển thị trên UI — fallback "Nhân vật mới" nếu trống */
export function characterDisplayName(name: string): string {
  const trimmed = name.trim();
  return trimmed || 'Nhân vật mới';
}

export interface CharacterFieldErrors {
  name?: string;
  description?: string;
}

/** Validate tên và mô tả nhân vật — trả object lỗi theo field */
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
