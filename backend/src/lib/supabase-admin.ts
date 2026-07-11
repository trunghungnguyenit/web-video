// ─── Supabase admin client — service role key, chỉ dùng ở backend ───────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

let client: SupabaseClient | null = null;

/** Trả `null` nếu thiếu SUPABASE_URL/SERVICE_ROLE_KEY thay vì throw — route tự trả lỗi rõ ràng */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
