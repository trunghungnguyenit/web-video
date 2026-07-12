// ─── Lịch sử render (mục Cài đặt → Lịch sử render) — bảng render_history ────
// File render hiện chỉ tải thẳng về máy (chưa upload lên Storage), nên chỉ lưu
// metadata (tên, thời lượng, dung lượng, trạng thái) — không có file_path thật.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface RenderHistoryEntry {
  id: string;
  fileName: string;
  fileSizeBytes: number | null;
  durationSeconds: number | null;
  status: 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

interface RenderHistoryRow {
  id: string;
  file_name: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  status: 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

function fromRow(row: RenderHistoryRow): RenderHistoryEntry {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    durationSeconds: row.duration_seconds,
    status: row.status,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchRenderHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<RenderHistoryEntry[]> {
  const { data, error } = await supabase
    .from('render_history')
    .select('id, file_name, file_size_bytes, duration_seconds, status, error_message, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RenderHistoryRow[]).map(fromRow);
}

export interface InsertRenderHistoryInput {
  projectId?: string | null;
  fileName: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  status: 'completed' | 'failed';
  errorMessage?: string;
}

export async function insertRenderHistory(
  supabase: SupabaseClient,
  userId: string,
  input: InsertRenderHistoryInput,
): Promise<void> {
  const { error } = await supabase.from('render_history').insert({
    user_id: userId,
    project_id: input.projectId ?? null,
    file_name: input.fileName,
    file_path: null,
    file_size_bytes: input.fileSizeBytes ?? null,
    duration_seconds: input.durationSeconds ?? null,
    status: input.status,
    error_message: input.errorMessage ?? null,
  });
  if (error) throw error;
}

export async function deleteRenderHistoryEntry(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('render_history').delete().eq('id', id);
  if (error) throw error;
}

export async function clearRenderHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('render_history').delete().eq('user_id', userId);
  if (error) throw error;
}
