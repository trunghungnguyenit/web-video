// ─── Xác thực người dùng qua Supabase Access Token (Authorization: Bearer ...) ───

import type { Context } from 'hono';
import { getSupabaseAdmin } from './supabase-admin';

export interface AuthedUser {
  id: string;
  email: string;
}

/** Đọc Bearer token từ header, xác thực qua Supabase Auth — `null` nếu không hợp lệ */
export async function getAuthedUser(c: Context): Promise<AuthedUser | null> {
  const header = c.req.header('authorization') ?? c.req.header('Authorization');
  const token = header?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    console.warn('[license/auth] Thiếu Authorization header hoặc Bearer token.');
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[license/auth] getSupabaseAdmin() = null — thiếu SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY trong backend/.env.');
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    console.warn('[license/auth] supabase.auth.getUser(token) thất bại:', error?.message ?? 'không có user/email');
    return null;
  }

  return { id: data.user.id, email: data.user.email };
}
