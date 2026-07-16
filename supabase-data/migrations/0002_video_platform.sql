-- ─── Database quản lý tài khoản + Kho video + Cảnh + Kịch bản đã lưu + Lịch sử render ───
-- Chạy file này trong Supabase Dashboard → SQL Editor (sau 0001_license_issued.sql).
--
-- Nguyên tắc thiết kế:
-- 1. Không lưu API key (Gemini/Veo/ElevenLabs) lên Supabase — các key này vẫn ở
--    localStorage trình duyệt (frontend/lib/api-keys-store.ts) như hiện tại, vì đây
--    là key cá nhân người dùng tự trả phí, không nên tập trung hoá trên server dùng chung.
-- 2. id của video_projects / video_characters / video_scenes / saved_scripts dùng
--    kiểu `text`, khớp đúng định dạng id do frontend tự sinh hiện có
--    (`video-...`, `char-...`, `scene-...`, `script-...`) — tránh phải remap id khi
--    đồng bộ local state ↔ Supabase.
-- 3. RLS bật cho mọi bảng — user chỉ đọc/ghi được dữ liệu của chính mình
--    (auth.uid() = user_id), an toàn để gọi thẳng từ frontend qua Supabase client
--    (publishable/anon key), không bắt buộc phải qua backend như license_issued.

-- ── Helper: tự cập nhật updated_at mỗi lần UPDATE ───────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. profiles — Cài đặt chung theo tài khoản (mục Cài đặt → Cài đặt chung)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  language            text not null default 'vi',
  theme               text not null default 'dark' check (theme in ('dark', 'light')),
  sound_notifications boolean not null default true,
  autosave            boolean not null default true,
  show_tips           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Tự tạo profile mặc định ngay khi có tài khoản mới (Google sign-in lần đầu)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. video_projects — Kho video (mỗi row = 1 video trong "Kho video")
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.video_projects (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null default 'Video mới',
  status            text not null default 'draft'
                      check (status in ('draft', 'analyzing', 'generating', 'completed', 'error')),
  error_message     text,
  veo_model_label   text,
  aspect_ratio      text not null default '16:9',
  scenes_done       integer not null default 0,
  scenes_total      integer not null default 0,
  input_content     text not null default '',
  -- VideoSettings (mục 2): language, sceneCount, videoType, voice, aspectRatio,
  -- sceneDuration, videoQuality, veoModel, voiceSpeed, sceneStyle
  settings          jsonb not null default '{}'::jsonb,
  -- PresetInput snapshot khi áp dụng kịch bản mẫu (không chứa apiKey)
  applied_input     jsonb,
  -- PresetTimelineDemo (mục 4): includeSubtitles, bgmPresetName, bgmVolume,
  -- voiceSpeed, sceneStyle, transitionNote
  timeline          jsonb,
  -- Đường dẫn file nhạc nền người dùng tải lên (Storage bucket `bgm-uploads`)
  bgm_path          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists video_projects_user_id_idx on public.video_projects(user_id);

alter table public.video_projects enable row level security;

create policy "video_projects_all_own" on public.video_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger video_projects_set_updated_at
  before update on public.video_projects
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. video_characters — Nhân vật chính (mục 1), con của video_projects
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.video_characters (
  id           text primary key,
  project_id   text not null references public.video_projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  position     integer not null default 0,
  name         text not null default '',
  role         text not null default '',
  traits       text not null default '',
  outfit       text not null default '',
  description  text not null default '',
  style        text not null default 'Realistic',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists video_characters_project_id_idx on public.video_characters(project_id);
create index if not exists video_characters_user_id_idx on public.video_characters(user_id);

alter table public.video_characters enable row level security;

create policy "video_characters_all_own" on public.video_characters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger video_characters_set_updated_at
  before update on public.video_characters
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. video_scenes — Danh sách cảnh (mục 3), con của video_projects
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.video_scenes (
  id                     text primary key,
  project_id             text not null references public.video_projects(id) on delete cascade,
  user_id                uuid not null references auth.users(id) on delete cascade,
  index                  integer not null default 0,
  time_start             numeric not null default 0,
  time_end               numeric not null default 0,
  duration_seconds       numeric not null default 6,
  prompt                 text not null default '',
  voice                  text not null default '',
  status                 text not null default 'generating'
                           check (status in ('generating', 'success', 'error', 'edited')),
  error_message          text,
  -- Đường dẫn trong Storage (bucket `scene-videos` / `scene-audio`) — KHÔNG phải blob: URL
  video_path             text,
  audio_path             text,
  audio_duration_seconds numeric,
  -- Google long-running operation name — resume poll Veo sau khi refresh trang
  veo_operation_name     text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists video_scenes_project_id_idx on public.video_scenes(project_id);
create index if not exists video_scenes_user_id_idx on public.video_scenes(user_id);

alter table public.video_scenes enable row level security;

create policy "video_scenes_all_own" on public.video_scenes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger video_scenes_set_updated_at
  before update on public.video_scenes
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. saved_scripts — Kịch bản đã lưu (mục 2.5) — thuộc user, không thuộc 1 project cụ thể
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.saved_scripts (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Kịch bản không tên',
  content     text not null default '',
  -- SavedScriptMeta: language, sceneCount, videoType, voice, aspectRatio,
  -- sceneDuration, videoQuality
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists saved_scripts_user_id_idx on public.saved_scripts(user_id);

alter table public.saved_scripts enable row level security;

create policy "saved_scripts_all_own" on public.saved_scripts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger saved_scripts_set_updated_at
  before update on public.saved_scripts
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. render_history — Lịch sử render (mục Cài đặt → Lịch sử render)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.render_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  -- Giữ null nếu project gốc bị xoá — vẫn còn lịch sử render
  project_id        text references public.video_projects(id) on delete set null,
  file_name         text not null,
  -- Đường dẫn trong Storage bucket `renders`
  file_path         text not null,
  file_size_bytes   bigint,
  duration_seconds  numeric,
  status            text not null default 'completed' check (status in ('completed', 'failed')),
  error_message     text,
  created_at        timestamptz not null default now()
);

create index if not exists render_history_user_id_idx on public.render_history(user_id);

alter table public.render_history enable row level security;

create policy "render_history_all_own" on public.render_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Storage buckets — file nhị phân (video cảnh, audio TTS, BGM, video render)
--    Chạy phần này ở Supabase Dashboard → Storage nếu SQL bucket API bị hạn chế,
--    hoặc chạy trực tiếp nếu extension `storage` đã bật (mặc định có sẵn).
-- ═══════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values
  ('scene-videos', 'scene-videos', false),
  ('scene-audio', 'scene-audio', false),
  ('bgm-uploads', 'bgm-uploads', false),
  ('renders', 'renders', false)
on conflict (id) do nothing;

-- Quy ước path: `{user_id}/{project_id}/{file}` — policy tách quyền theo folder đầu tiên = user_id
create policy "scene_videos_own_folder" on storage.objects
  for all using (bucket_id = 'scene-videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'scene-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scene_audio_own_folder" on storage.objects
  for all using (bucket_id = 'scene-audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'scene-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "bgm_uploads_own_folder" on storage.objects
  for all using (bucket_id = 'bgm-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'bgm-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "renders_own_folder" on storage.objects
  for all using (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text);
