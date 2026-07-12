// ─── CRUD "Kịch bản đã lưu" (mục 2.5) trên Supabase — bảng saved_scripts ────
// Hiện tại mục này hoàn toàn không có persist nào (mất khi F5) — module này
// thay thế bằng lưu trữ thật theo tài khoản Google.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SavedScript } from '@/lib/saved-scripts';

interface ScriptRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  meta: SavedScript['meta'];
  created_at: string;
  updated_at: string;
}

function fromRow(row: ScriptRow): SavedScript {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    meta: row.meta,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchRemoteSavedScripts(
  supabase: SupabaseClient,
  userId: string,
): Promise<SavedScript[]> {
  const { data, error } = await supabase
    .from('saved_scripts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ScriptRow[]).map(fromRow);
}

export async function insertRemoteSavedScript(
  supabase: SupabaseClient,
  userId: string,
  script: SavedScript,
): Promise<void> {
  const { error } = await supabase.from('saved_scripts').insert({
    id: script.id,
    user_id: userId,
    title: script.title,
    content: script.content,
    meta: script.meta,
    created_at: script.createdAt,
    updated_at: script.updatedAt,
  });
  if (error) throw error;
}

export async function updateRemoteSavedScript(
  supabase: SupabaseClient,
  script: SavedScript,
): Promise<void> {
  const { error } = await supabase
    .from('saved_scripts')
    .update({
      title: script.title,
      content: script.content,
      meta: script.meta,
      updated_at: script.updatedAt,
    })
    .eq('id', script.id);
  if (error) throw error;
}

export async function deleteRemoteSavedScript(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('saved_scripts').delete().eq('id', id);
  if (error) throw error;
}

/** Đẩy toàn bộ kịch bản đang có cục bộ lên Supabase — chỉ chạy 1 lần khi tài khoản chưa có dữ liệu */
export async function migrateSavedScriptsToRemote(
  supabase: SupabaseClient,
  userId: string,
  scripts: SavedScript[],
): Promise<void> {
  if (scripts.length === 0) return;
  const { error } = await supabase.from('saved_scripts').insert(
    scripts.map((s) => ({
      id: s.id,
      user_id: userId,
      title: s.title,
      content: s.content,
      meta: s.meta,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    })),
  );
  if (error) throw error;
}
