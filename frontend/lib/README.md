# frontend/lib — Bản đồ module

Thư mục chứa **logic nghiệp vụ thuần TypeScript** (không React UI): kiểu dữ liệu, pipeline AI, xử lý cảnh, render video, preset.

## Pipeline & API

| File | Chức năng |
|------|-----------|
| `pipeline-payload.ts` | Gom form UI → 3 payload `geminiInput` / `veoInput` / `ttsInput` gửi backend. |
| `pipeline-debug-log.ts` | Log DevTools: payload gửi Gemini và response trả về (key đã che). |
| `api-keys-store.ts` | Đọc/ghi API key (Gemini, Veo, ElevenLabs) trong `localStorage`. |

## Cảnh video (core)

| File | Chức năng |
|------|-----------|
| `scenes.ts` | Kiểu `VideoScene`, chuyển kịch bản Gemini → cảnh, timing, reorder, build prompt/voice. |
| `scene-generation-queue.ts` | Hàng đợi tuần tự: mỗi cảnh chạy TTS → Veo (cập nhật UI từng bước). |
| `scene-tts.ts` | Gọi ElevenLabs TTS cho một cảnh, gắn `audioUrl` + độ dài audio. |
| `scene-video.ts` | Gọi Veo tạo clip MP4 cho cảnh; giới hạn concurrency qua `veo-concurrency`. |
| `scene-video-placeholder.ts` | Tạo clip WebM placeholder khi chưa có key Veo hoặc lỗi API. |
| `scene-transition.ts` | Crossfade video/audio giữa các cảnh trong timeline preview. |
| `subtitle-utils.ts` | Sinh file phụ đề SRT từ lời thoại các cảnh. |

## Veo / thời lượng / model

| File | Chức năng |
|------|-----------|
| `veo-duration.ts` | Snap thời lượng cảnh 4/6/8s theo giới hạn Veo 3; 1080p bắt buộc 8s. |
| `veo-models.ts` | Danh sách model Veo fallback + gợi ý model theo chất lượng video. |
| `veo-concurrency.ts` | Semaphore frontend — tối đa 1 request Veo đồng thời (tránh rate limit). |

## Render & FFmpeg

| File | Chức năng |
|------|-----------|
| `ffmpeg-client.ts` | Lazy-load FFmpeg.wasm từ CDN (singleton). |
| `video-composer.ts` | Ghép clip cảnh + BGM + phụ đề → xuất MP4 cuối (client-side). |

## Bulk / dự án song song

| File | Chức năng |
|------|-----------|
| `bulk-project.ts` | Kiểu `VideoBulkProject`, tạo/lọc/sắp xếp bulk, tiến độ %. |

## Kịch bản mẫu (preset)

| File | Chức năng |
|------|-----------|
| `preset-scripts.ts` | Định nghĩa `PRESET_SCRIPTS` — nhân vật, input, demo cảnh, timeline. |
| `preset-demos.ts` | Dữ liệu cảnh demo + timeline theo từng preset id. |
| `preset-demo-builder.ts` | Chuyển preset → `VideoScene[]` và `SavedCharacter[]` cho UI demo. |
| `preset-stickman-war.ts` | Preset Stickman Chiến Tranh: 10 cảnh, prompt Veo + voice TTS. |

## Lưu trữ local

| File | Chức năng |
|------|-----------|
| `saved-characters.ts` | Kiểu nhân vật, validate, style options, tạo nhân vật rỗng. |
| `saved-scripts.ts` | Kịch bản user lưu; label số cảnh, tỷ lệ, thời lượng, chất lượng. |

## Tiện ích

| File | Chức năng |
|------|-----------|
| `utils.ts` | `cn()` (tailwind merge), `formatCount`, helpers UI chung. |
| `voice-preview.ts` | Câu mẫu nghe thử giọng theo ngôn ngữ; cache key preview. |

## Luồng dữ liệu (tóm tắt)

```
InputSection → pipeline-payload → gemini.service (backend)
  → scenes.ts → scene-generation-queue
    → scene-tts (ElevenLabs) → scene-video (Veo)
  → TimelineEditor / SceneGallery
  → video-composer (FFmpeg export)
```

Bulk song song: `bulk-projects-context` (contexts) gọi cùng pipeline qua `startBulkAnalyze` + `scene-generation-queue`.
