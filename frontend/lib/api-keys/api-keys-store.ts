// ─── Lưu API key Gemini / Veo / ElevenLabs trong localStorage ─────────────────

import { readJSON, writeJSON, removeItem } from '@/lib/local-storage';

/** Key localStorage chứa object `{ gemini, veo, elevenlabs }` */
const STORAGE_KEY = 'web-video-api-keys';

/** Id key TTS cũ (Google TTS) — migrate sang ElevenLabs khi đọc */
const LEGACY_TTS_KEY = 'google-tts';

/** Id key ElevenLabs hiện tại */
const TTS_KEY_ID = 'elevenlabs';

/**
 * Đọc toàn bộ API keys từ localStorage.
 * - SSR: trả `{}` (không có `window`).
 * - Tự migrate key cũ `google-tts` → `elevenlabs` nếu cần.
 */
function readAll(): Record<string, string> {
  const all = readJSON<Record<string, string>>(STORAGE_KEY, {});

  // Migrate key cũ Google TTS → ElevenLabs
  if (all[LEGACY_TTS_KEY] && !all[TTS_KEY_ID]) {
    all[TTS_KEY_ID] = all[LEGACY_TTS_KEY];
    delete all[LEGACY_TTS_KEY];
    writeJSON(STORAGE_KEY, all);
  }

  return all;
}

/**
 * Ghi toàn bộ object keys vào localStorage (thay thế bản cũ).
 * Không dispatch event — caller (`setApiKey`) tự phát sau khi ghi.
 */
function writeAll(keys: Record<string, string>): void {
  writeJSON(STORAGE_KEY, keys);
}

/**
 * Id chuẩn dùng trong UI & pipeline — tránh hard-code string rải rác. Không còn `veo`
 * riêng — Veo 3.1 giờ dùng chung key `kie` (xem frontend/lib/veo/veo-models.ts).
 */
export const API_KEY_IDS = {
  gemini: 'gemini',
  elevenlabs: TTS_KEY_ID,
  kie: 'kie',
} as const;

/**
 * CustomEvent phát sau khi user lưu/xóa key.
 * Hook `useVeoModels` và màn API Keys lắng nghe để reload model / cập nhật UI.
 */
export const API_KEYS_CHANGED_EVENT = 'web-video-api-keys-changed';

/**
 * Lấy một API key theo id (`gemini` | `veo` | `elevenlabs`).
 * @returns Chuỗi key đã trim, hoặc `''` nếu chưa lưu.
 */
export function getApiKey(id: string): string {
  return readAll()[id] ?? '';
}

/**
 * Lưu hoặc xóa API key theo id.
 * - `value` rỗng → xóa key khỏi store.
 * - Sau khi ghi → dispatch `API_KEYS_CHANGED_EVENT`.
 */
export function setApiKey(id: string, value: string): void {
  const all = readAll();
  if (value.trim()) all[id] = value.trim();
  else delete all[id];
  writeAll(all);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(API_KEYS_CHANGED_EVENT));
  }
}

/**
 * Xóa sạch toàn bộ API key khỏi localStorage — gọi khi đăng xuất để key của
 * tài khoản vừa thoát không còn dùng được nữa (tránh rò rỉ sang phiên sau).
 * Chỉ dispatch 1 lần `API_KEYS_CHANGED_EVENT` thay vì gọi setApiKey lặp lại.
 */
export function clearAllApiKeys(): void {
  if (typeof window === 'undefined') return;
  removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(API_KEYS_CHANGED_EVENT));
}
