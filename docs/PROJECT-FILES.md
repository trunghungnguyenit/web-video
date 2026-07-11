# Bản đồ file dự án web-video

Monorepo: **frontend/** (Next.js) + **backend/** (Hono). Pipeline: Nhập liệu → Gemini → Veo → ElevenLabs → Timeline → Render.

---

## frontend/lib

Chi tiết từng file: [frontend/lib/README.md](../frontend/lib/README.md).

---

## frontend/services

| File | Chức năng |
|------|-----------|
| `api.ts` | Client HTTP gọi backend (`NEXT_PUBLIC_API_URL`), parse `{ success, data, error }`. |
| `gemini.service.ts` | `POST /api/gemini/analyze` — phân tích kịch bản; log response. |
| `veo.service.ts` | `POST /api/veo/generate`, `POST /api/veo/models` — tạo video & list model. |
| `tts.service.ts` | `POST /api/tts/synthesize` — ElevenLabs TTS → Blob MP3. |

---

## frontend/contexts

| File | Chức năng |
|------|-----------|
| `project-settings-context.tsx` | Cài đặt video theo item (ngôn ngữ, số cảnh, Veo model, giọng…); sync về Kho video khi đổi. |
| `video-library-context.tsx` | Quản lý Kho video: tạo/chọn/xóa/sửa tên, `startAnalyze`, `startRegenerate` (sửa & tạo lại), queue sinh cảnh song song theo item. |

---

## frontend/app

| File | Chức năng |
|------|-----------|
| `page.tsx` | Trang chính: layout sidebar + Kho video + workspace (nhân vật, input, gallery, timeline). |
| `layout.tsx` | Root layout Next.js, font, metadata. |
| `globals.css` | Theme CSS variables (sidebar, primary…). |

---

## frontend/components (theo feature)

| Thư mục | Chức năng |
|---------|-----------|
| `layout/sidebar` | Menu trái, điều hướng section, preset, mobile nav + Kho video drawer. |
| `layout/header` | Header sticky, nút menu mobile. |
| `features/input-section` | Mục 2: tab text/link/ảnh/file, validate, gửi phân tích Gemini. |
| `features/character-master` | Mục 1: CRUD nhân vật, avatar, style. |
| `features/scene-gallery` | Mục 3: danh sách cảnh, retry, sửa prompt/voice. |
| `features/timeline-editor` | Mục 4: timeline kéo-thả, preview crossfade, BGM, phụ đề. |
| `features/video-library` | Panel/drawer Kho video: tạo, sửa tên/nội dung & tạo lại, xóa video. |
| `features/preset-script-modal` | Modal chỉnh & áp dụng kịch bản mẫu. |
| `features/api-keys-management` | Trang quản lý & test API keys. |
| `features/video-settings` | Thanh cài đặt video (model, ngôn ngữ, cảnh…). |
| `features/voice-select` | Chọn giọng + nghe thử. |
| `features/saved-scripts` | Kịch bản user đã lưu. |
| `features/scene-duration` | Panel chỉnh thời lượng cảnh. |
| `features/settings/*` | Cài đặt app: general, export, render history, keys. |

---

## backend/src

| File / thư mục | Chức năng |
|----------------|-----------|
| `index.ts` | App Hono: mount routes, CORS. |
| `server.ts` | Entry `@hono/node-server`, port từ env. |
| `config/env.ts` | Biến môi trường (port, model mặc định…). |
| `routes/gemini.ts` | `POST /api/gemini/analyze` — validate body, gọi service, log. |
| `routes/veo.ts` | `POST /api/veo/generate`, `POST /api/veo/models`. |
| `routes/tts.ts` | `POST /api/tts/synthesize` — ElevenLabs. |
| `services/gemini.service.ts` | Build prompt, gọi Google Gemini, parse JSON kịch bản. |
| `services/veo.service.ts` | Veo 3 long-running: start → poll → tải MP4. |
| `services/veo-models.service.ts` | List model Veo theo API key. |
| `services/elevenlabs.service.ts` | TTS ElevenLabs + retry rate limit. |
| `lib/google-api-retry.ts` | Retry/backoff khi Gemini/Veo high demand / 429. |
| `lib/veo-config.ts` | Resolve model, resolution, aspect ratio, duration. |
| `lib/elevenlabs-voices.ts` | Map voice id ElevenLabs theo lựa chọn UI. |
| `types/pipeline.ts` | Type dùng chung request/response pipeline. |
| `utils/api-response.ts` | Helper `ok()` / `fail()` JSON chuẩn. |

---

## Luồng end-to-end

1. User nhập nội dung + cài đặt → `buildAnalyzePipeline`
2. Backend Gemini → JSON `{ title, scenes[] }`
3. Frontend `scenesFromGeminiScript` → `runSceneGenerationQueue`
4. Mỗi cảnh: TTS → Veo (hoặc placeholder)
5. Timeline preview → `video-composer` + FFmpeg export MP4

Kho video: mỗi video có state riêng trong `VideoLibraryProvider`; Veo xếp hàng global qua `veo-concurrency.ts`.
