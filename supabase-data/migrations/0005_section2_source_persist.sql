-- ─── Lưu dữ liệu Mục 2 (Nguồn nội dung) theo từng tab — sống sót qua reload/điều hướng ───
-- Chạy sau 0004. input_type/initial_input_type trước đây HOÀN TOÀN vắng mặt khỏi
-- Supabase (chỉ tồn tại trong localStorage) — sửa cùng lúc để tab đang dùng không mất
-- khi đăng nhập ở máy khác. Ảnh/file nguồn (tab "Từ hình ảnh"/"Từ file") lưu qua
-- Storage bucket mới `source-uploads`, chỉ path được lưu trong source_images/
-- source_document_path (không phải base64) — theo đúng pattern scene-videos/scene-audio.

alter table public.video_projects
  add column if not exists input_type text,
  add column if not exists initial_input_type text,
  add column if not exists link_url text,
  add column if not exists link_description text,
  add column if not exists image_master_brief text,
  -- mảng {id, path, fileName, mimeType, prompt, label, voiceHint} — path Storage, KHÔNG base64
  add column if not exists source_images jsonb,
  add column if not exists source_document_path text,
  add column if not exists source_document_name text,
  add column if not exists source_document_mime_type text;

insert into storage.buckets (id, name, public)
values ('source-uploads', 'source-uploads', false)
on conflict (id) do nothing;

-- Quy ước path: `{user_id}/{project_id}/...` — giống scene-videos/scene-audio/bgm-uploads
create policy "source_uploads_own_folder" on storage.objects
  for all using (bucket_id = 'source-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'source-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
