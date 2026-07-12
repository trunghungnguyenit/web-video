// ─── Supabase client — dùng trong Client Component ('use client') ───────────

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Trả `null` nếu thiếu env Supabase (chưa cấu hình `.env.local`) thay vì throw —
 * tránh crash toàn bộ app vì AuthProvider được wrap global ở layout.tsx.
 */
export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
