// ─── Lưu API key Gemini / Veo / ElevenLabs — bảng user_api_keys (Supabase) ────
// Bắt buộc đăng nhập mới dùng được — không có chế độ khách/localStorage nữa.
// Giữ nguyên toàn bộ hàm public (getApiKey/setApiKey/API_KEY_IDS...) để không phải sửa
// hàng chục nơi đang gọi trực tiếp — chỉ đổi cách lưu trữ bên trong từ localStorage sang
// cache trong bộ nhớ, nạp 1 lần khi đăng nhập (xem loadApiKeysFromRemote, gọi từ auth-context.tsx).

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchRemoteApiKeys } from '@/lib/api-keys/api-keys-remote';

// Re-export từ module riêng (không import gì khác) — api-keys-remote.ts cũng cần
// API_KEY_IDS, import thẳng từ đây thay vì từ api-keys-remote.ts sẽ tạo VÒNG LẶP
// import (lỗi "Cannot access before initialization" lúc build production).
export { API_KEY_IDS } from '@/lib/api-keys/api-key-ids';

/**
 * CustomEvent phát sau khi key thay đổi (user lưu/xóa tay, HOẶC vừa nạp xong từ Supabase
 * lúc đăng nhập). Hook `useVeoModels` và màn API Keys lắng nghe để reload model / cập nhật UI.
 */
export const API_KEYS_CHANGED_EVENT = 'web-video-api-keys-changed';

/** Cache trong bộ nhớ — nạp từ Supabase lúc đăng nhập, KHÔNG persist qua localStorage nữa */
let cache: Record<string, string> = {};
/** true sau khi đã nạp xong (hoặc thử nạp xong) lần đầu từ Supabase cho phiên đăng nhập hiện tại */
let ready = false;

function dispatchChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(API_KEYS_CHANGED_EVENT));
  }
}

/** true khi đã nạp xong key từ Supabase (hoặc chưa đăng nhập nên không có gì để nạp) */
export function isApiKeysReady(): boolean {
  return ready;
}

/**
 * Nạp toàn bộ key đã lưu của tài khoản từ Supabase — gọi 1 lần khi phát hiện đăng nhập
 * (auth-context.tsx). Lỗi mạng/Supabase chưa cấu hình → giữ cache rỗng, không throw ra
 * ngoài (không nên chặn cả app chỉ vì tải key lỗi).
 */
export async function loadApiKeysFromRemote(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    cache = await fetchRemoteApiKeys(supabase, userId);
  } catch (err) {
    console.error('[api-keys] Tải key từ Supabase thất bại:', err);
    cache = {};
  } finally {
    ready = true;
    dispatchChanged();
  }
}

/** Xóa sạch cache key khỏi bộ nhớ — gọi khi đăng xuất để key tài khoản cũ không rò sang phiên sau */
export function clearAllApiKeys(): void {
  cache = {};
  ready = false;
  dispatchChanged();
}

/** Lấy 1 API key theo id (`gemini` | `kie` | `elevenlabs` | `veo-gemini`) — đọc từ cache trong bộ nhớ */
export function getApiKey(id: string): string {
  return cache[id] ?? '';
}

/**
 * Cập nhật cache trong bộ nhớ (đồng bộ, giống hệt chữ ký cũ khi còn dùng localStorage) —
 * KHÔNG tự gọi Supabase ở đây. Nơi gọi (vd ApiKeysManagement) tự lưu Supabase riêng qua
 * `saveRemoteApiKey` rồi mới gọi hàm này để mirror lại cho các chỗ khác trong app đọc
 * đồng bộ (input-section, voice-select, veo-models-context...) mà không cần sửa sang async.
 */
export function setApiKey(id: string, value: string): void {
  const trimmed = value.trim();
  if (trimmed) cache[id] = trimmed;
  else delete cache[id];
  dispatchChanged();
}
