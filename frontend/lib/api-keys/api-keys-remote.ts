// ─── API Keys (Gemini/Veo/ElevenLabs) theo tài khoản — bảng user_api_keys ───
// Bắt buộc đăng nhập mới dùng được mục này (không có chế độ khách).

import type { SupabaseClient } from '@supabase/supabase-js';
import { API_KEY_IDS } from '@/lib/api-keys/api-key-ids';

interface UserApiKeysRow {
  user_id: string;
  gemini_key: string | null;
  elevenlabs_key: string | null;
  kie_key: string | null;
  veo_key: string | null;
}

/**
 * Map id nội bộ (gemini/elevenlabs/kie/veo-gemini) ↔ tên cột trong bảng user_api_keys.
 * Cột `veo_key` từng bị bỏ trống (Veo qua kie.ai dùng chung `kie_key`) — nay dùng lại cho
 * "Gemini Key Veo 3.1" (nhà cung cấp gọi thẳng Google), nên KHÔNG cần migration thêm cột.
 */
const COLUMN_BY_ID: Record<string, keyof Omit<UserApiKeysRow, 'user_id'>> = {
  [API_KEY_IDS.gemini]: 'gemini_key',
  [API_KEY_IDS.elevenlabs]: 'elevenlabs_key',
  [API_KEY_IDS.veoGemini]: 'veo_key',
  [API_KEY_IDS.kie]: 'kie_key',
};

/** Tải toàn bộ key đã lưu của tài khoản — trả `{}` nếu chưa từng lưu key nào */
export async function fetchRemoteApiKeys(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('gemini_key, elevenlabs_key, kie_key, veo_key')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return {};

  const row = data as Omit<UserApiKeysRow, 'user_id'>;
  const result: Record<string, string> = {};
  for (const [id, column] of Object.entries(COLUMN_BY_ID)) {
    const value = row[column];
    if (value) result[id] = value;
  }
  return result;
}

/** Lưu/xóa 1 key theo id — `value` rỗng sẽ set cột về null */
export async function saveRemoteApiKey(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  value: string,
): Promise<void> {
  const column = COLUMN_BY_ID[id];
  if (!column) throw new Error(`Không xác định được cột lưu key "${id}".`);

  const { error } = await supabase
    .from('user_api_keys')
    .upsert({ user_id: userId, [column]: value.trim() || null }, { onConflict: 'user_id' });
  if (error) throw error;
}
