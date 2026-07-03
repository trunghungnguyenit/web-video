# Bố cục trang — AI Video Studio

Tài liệu mô tả vị trí từng phần trên giao diện và file component tương ứng.

**Trang chính:** `app/page.tsx` — điều phối toàn bộ layout và chuyển màn hình.

---

## Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (trái)  │  HEADER (trên)                                    │
│                 │  ├─ Tiêu đề + Demo Project                        │
│                 │  └─ Thanh chức năng nhanh (chỉ màn Dự Án)        │
│                 ├───────────────────────────────────────────────────│
│                 │  NỘI DUNG CHÍNH (giữa, cuộn được)                │
│                 │  Panel công cụ / các section tính năng            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Sidebar — Thanh menu bên trái

**File:** `components/layout/sidebar/sidebar.tsx`

| Vị trí trên UI | Tên hiển thị | Chức năng |
|----------------|--------------|-----------|
| Trên cùng | Logo **AI Auto Generate** | Thương hiệu app |
| Menu chính | **Dự Án** | Màn tạo video (mặc định) |
| Menu chính | **Bảng Điều Khiển** | Cùng màn Dự Án (placeholder) |
| Menu chính | **Video Của Tôi** | Cùng màn Dự Án (placeholder) |
| Menu chính | **Thư Viện** | Cùng màn Dự Án (placeholder) |
| Menu chính | **Quản lý API Keys** | Chuyển sang màn quản lý API |
| Công cụ tạo | **Tốc độ giọng** | Mở panel chỉnh tốc độ TTS |
| Công cụ tạo | **Phong cách cảnh** | Mở panel chọn style hình ảnh |
| Công cụ tạo | **Thêm nhạc nền** | Mở panel thêm BGM |
| Giữa | **Kịch bản có sẵn** | Danh sách preset (Product Demo, TikTok...) |
| Dưới | **API Calls** + Nâng cấp gói | Thống kê usage |
| Cuối | **Cài đặt** | Chuyển sang màn cài đặt |

---

## 2. Header — Thanh trên cùng

**File:** `components/layout/header/header.tsx`

| Vị trí | Thành phần | File con |
|--------|------------|----------|
| Trái | Nút quay lại (chỉ màn Cài đặt) | `header.tsx` |
| Trái | Tiêu đề trang (AI Video Studio / Quản lý API Keys / Cài đặt) | `header.tsx` |
| Trái | Dropdown **Demo Project** | `header.tsx` |
| Phải | Nút Settings (icon bánh răng) | `header.tsx` |
| Dưới tiêu đề | **Thanh chức năng nhanh** (chỉ màn Dự Án) | `components/features/quick-actions/quick-actions.tsx` |

### Thanh chức năng nhanh (Quick Actions)

| Nút | Màu | Panel khi bấm |
|-----|-----|---------------|
| Phân tích nội dung | Vàng | *(chưa có panel)* |
| Viết kịch bản | Xanh lá | *(chưa có panel)* |
| Chia cảnh | Xanh dương | *(chưa có panel)* |
| **Độ dài từng cảnh** | Cam | `components/features/scene-duration/scene-duration-panel.tsx` |
| Tạo video & voice | Tím | *(chưa có panel)* |
| Render | Cyan | *(chưa có panel)* |

---

## 3. Màn Dự Án — Nội dung chính

Hiển thị khi chọn **Dự Án** (hoặc Bảng Điều Khiển / Video / Thư Viện).

### 3.1 Panel công cụ (hiện tạm khi bấm menu)

Xuất hiện **phía trên** các section, có nút **Đóng**.

| Kích hoạt từ | Panel | File |
|--------------|-------|------|
| Sidebar → Tốc độ giọng | VoiceSpeedPanel | `components/features/voice-speed/voice-speed-panel.tsx` |
| Sidebar → Phong cách cảnh | SceneStylePanel | `components/features/scene-style/scene-style-panel.tsx` |
| Sidebar → Thêm nhạc nền | BackgroundMusicPanel | `components/features/background-music/background-music-panel.tsx` |
| Header → Độ dài từng cảnh | SceneDurationPanel | `components/features/scene-duration/scene-duration-panel.tsx` |

### 3.2 Các section cố định (theo thứ tự từ trên xuống)

| STT | Tiêu đề trên UI | Component | File |
|-----|-----------------|-----------|------|
| 1 | **NHẬP NỘI DUNG ĐỂ AI TẠO VIDEO** | InputSection | `components/features/input-section/input-section.tsx` |
| 2 | *(đã chuyển lên Header)* | QuickActionsBar | `components/features/quick-actions/quick-actions.tsx` |
| 3 | **MASTER CHARACTER (ĐỒNG BỘ NHÂN VẬT)** | CharacterMaster | `components/features/character-master/character-master.tsx` |
| 4 | **DANH SÁCH CẢNH (10)** | SceneGallery | `components/features/scene-gallery/scene-gallery.tsx` |
| 5 | **TIMELINE - KÉO THẢ ĐỂ CHỈNH SỬA VIDEO** | TimelineEditor | `components/features/timeline-editor/timeline-editor.tsx` |

#### Chi tiết InputSection (mục 1)
- 4 tab nhập liệu: Tự nhập / Link video / Hình ảnh / File
- Ô textarea nội dung
- 4 dropdown: Ngôn ngữ, Độ dài video, Kiểu video, Giọng đọc
- Nút **Phân Tích & Tạo Kịch Bản**

#### Chi tiết CharacterMaster (mục 3)
- Avatar nhân vật + nút Thay đổi phong cách
- Form: Tên, Vai trò, Đặc điểm, Trang phục, Mô tả chi tiết

#### Chi tiết SceneGallery (mục 4)
- Nút: Thêm cảnh, Sắp xếp, Chọn tất cả
- Lưới card cảnh ngang (10 cảnh): thumbnail, prompt, voice TTS, thời lượng

#### Chi tiết TimelineEditor (mục 5)
- Thanh điều khiển: Play/Pause, zoom
- Track: Video, Transition, Audio, Voiceover, Subtitle
- Thanh scrubber dưới cùng: playhead, thời gian, volume, nút **RENDER VIDEO**

---

## 4. Màn Quản lý API Keys

**Kích hoạt:** Sidebar → **Quản lý API Keys**

**File:** `components/features/api-keys-management/api-keys-management.tsx`

| Thành phần | Mô tả |
|------------|-------|
| Banner hướng dẫn | Giải thích bảo mật API key |
| Lưới 2 cột | Card từng dịch vụ (OpenAI, ElevenLabs, Runway ML...) |
| Mỗi card | Tên, trạng thái, ô key, nút show/hide, copy |

---

## 5. Màn Cài đặt

**Kích hoạt:** Sidebar → **Cài đặt**

**File điều phối:** `components/features/settings/settings-panel/settings-panel.tsx`

| Tab menu | Component con | File |
|----------|---------------|------|
| Cài đặt chung | GeneralSettings | `components/features/settings/general-settings/general-settings.tsx` |
| Cài Đặt Key | KeySetupSettings | `components/features/settings/key-setup-settings/key-setup-settings.tsx` |
| Quản lý API Keys | ApiKeysSettings | `components/features/settings/api-keys-settings/api-keys-settings.tsx` |
| Lịch sử render | RenderHistorySettings | `components/features/settings/render-history-settings/render-history-settings.tsx` |

---

## 6. Component UI dùng chung (shadcn)

| Component | File |
|-----------|------|
| Button | `components/ui/button/button.tsx` |
| Badge | `components/ui/badge/badge.tsx` |
| Hàm tiện ích CSS | `lib/utils.ts` |

---

## 7. Cấu trúc thư mục

```
app/
  page.tsx          ← Trang chính, điều phối view
  layout.tsx        ← Layout gốc (font, metadata)
  globals.css       ← CSS toàn cục

components/
  layout/
    header/         ← Thanh trên
    sidebar/        ← Menu trái
  features/
    input-section/
    quick-actions/
    character-master/
    scene-gallery/
    timeline-editor/
    api-keys-management/
    voice-speed/
    scene-style/
    background-music/
    scene-duration/
    settings/
      settings-panel/
      general-settings/
      key-setup-settings/
      api-keys-settings/
      render-history-settings/
  ui/
    button/
    badge/

lib/
  utils.ts          ← Hàm cn() gộp class Tailwind
```

---

## 8. Luồng chuyển màn hình (state trong page.tsx)

| State | Ý nghĩa |
|-------|---------|
| `currentView` | Màn hiện tại: `project` / `api-keys` / `settings` |
| `activeMenuId` | Mục menu sidebar đang highlight |
| `activeTool` | Công cụ sidebar đang mở panel (voice-speed, scene-style, background-music) |
| `activeQuickAction` | Nút quick action đang mở panel (scene-duration) |
| `settingsTab` | Tab đang chọn trong màn Cài đặt |

---

## 9. Ghi chú

- Các file cũ ở `components/*.tsx` (không có thư mục con) là bản trước khi refactor — **không còn được dùng**, có thể xóa.
- Thanh chức năng nhanh chỉ hiện khi `currentView === 'project'`.
- Panel công cụ và panel quick action **không hiện cùng lúc** — bấm cái mới sẽ đóng cái cũ.
