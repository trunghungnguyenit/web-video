-- ─── Thêm hỗ trợ Grok Imagine (kie.ai) — API key + resume poll cảnh ───
-- Chạy sau 0003.

-- 1. user_api_keys — key kie.ai riêng, giống gemini_key/veo_key/elevenlabs_key
alter table public.user_api_keys add column if not exists kie_key text;

-- 2. video_scenes — taskId Grok Imagine, resume poll sau refresh (giống veo_operation_name)
alter table public.video_scenes add column if not exists kie_task_id text;
