import type { PresetDemoScene, PresetTimelineDemo } from '@/lib/preset-scripts';

/** Dữ liệu ảo cảnh + timeline theo từng kịch bản mẫu */
export const PRESET_DEMO_SCENES: Record<number, PresetDemoScene[]> = {
  1: [
    {
      prompt: 'Cinematic product shot — Alex giới thiệu hub SmartHome Pro trên bàn làm việc hiện đại, ánh sáng studio mềm, close-up thiết bị.',
      voice: 'Xin chào! Hôm nay mình sẽ giới thiệu SmartHome Pro — trung tâm điều khiển nhà thông minh thế hệ mới.',
      durationSeconds: 6,
    },
    {
      prompt: 'Over-shoulder shot — màn hình app điều khiển đèn, điều hòa, rèm cửa; UI sáng, animation mượt.',
      voice: 'Chỉ với một ứng dụng, bạn điều khiển toàn bộ thiết bị trong nhà — mọi lúc, mọi nơi.',
      durationSeconds: 7,
    },
    {
      prompt: 'Infographic style — biểu đồ tiết kiệm 40% điện năng, icon AI automation, màu xanh navy.',
      voice: 'AI tự động hóa giúp tiết kiệm đến 40% điện năng — thông minh và thân thiện với ví tiền.',
      durationSeconds: 6,
    },
    {
      prompt: 'Wide shot phòng khách cao cấp — 200+ thiết bị kết nối, logo tương thích Google, Apple, Alexa.',
      voice: 'Kết nối hơn 200 thiết bị thông minh, tương thích mọi nền tảng bạn đang dùng.',
      durationSeconds: 6,
    },
    {
      prompt: 'Hero shot sản phẩm + badge bảo hành 2 năm, giá 2.990.000đ, CTA mua ngay.',
      voice: 'SmartHome Pro — 2 triệu chín trăm chín mươi nghìn đồng, bảo hành 2 năm. Đặt hàng ngay hôm nay!',
      durationSeconds: 7,
    },
  ],
  2: [
    {
      prompt: 'TikTok vertical — Mia nhìn thẳng camera, hook mạnh, nền pastel, text overlay câu hỏi gây tò mò.',
      voice: 'Bạn đã học tiếng Anh bao nhiêu năm mà vẫn không nói được?',
      durationSeconds: 5,
    },
    {
      prompt: 'B-roll tai nghe + podcast — Mia nghe nhạc buổi sáng, ánh nắng cửa sổ, vibe Gen-Z.',
      voice: 'Mẹo số 1: Nghe podcast tiếng Anh mỗi sáng — chỉ 15 phút, não bạn quen với ngữ điệu thật.',
      durationSeconds: 6,
    },
    {
      prompt: 'Split screen — Mia shadowing video YouTube, miệng bắt chước giọng native speaker.',
      voice: 'Mẹo 2: Shadowing — bắt chước y chang giọng người bản ngữ. Nghe rồi nhại lại ngay lập tức.',
      durationSeconds: 6,
    },
    {
      prompt: 'Cozy setup — laptop xem phim có phụ đề, flashcard Anki trên điện thoại.',
      voice: 'Mẹo 3 và 4: Học qua phim yêu thích + app Anki để nhớ từ vựng lâu hơn.',
      durationSeconds: 6,
    },
    {
      prompt: 'Mia vẫy tay vui vẻ, sticker Follow, màu sắc tươi, ending CTA mạnh.',
      voice: 'Follow mình để nhận thêm tips học ngoại ngữ mỗi ngày nhé! 🎯',
      durationSeconds: 5,
    },
  ],
  3: [
    {
      prompt: 'Corporate dark office — Ryan đứng trước server cũ, ánh đỏ cảnh báo, mood urgent B2B.',
      voice: 'Doanh nghiệp bạn đang mất dữ liệu, chậm trễ vì hệ thống lưu trữ cũ kỹ?',
      durationSeconds: 6,
    },
    {
      prompt: 'CloudSync dashboard — backup 24/7 animation, icon shield bảo mật, giao diện SaaS hiện đại.',
      voice: 'CloudSync backup tự động 24/7 — dữ liệu của bạn luôn an toàn, không bao giờ mất.',
      durationSeconds: 7,
    },
    {
      prompt: 'Speed comparison chart — upload nhanh gấp 10x, progress bar bay, màu xanh dương đậm.',
      voice: 'Tốc độ upload và download nhanh gấp mười lần so với giải pháp truyền thống.',
      durationSeconds: 6,
    },
    {
      prompt: 'ISO 27001 badge, military-grade encryption visual, support team 24/7 call center.',
      voice: 'Mã hóa chuẩn quân đội, đạt ISO 27001, đội ngũ hỗ trợ 24/7 với SLA 99.99%.',
      durationSeconds: 7,
    },
    {
      prompt: 'Ryan chỉ vào CTA button "Dùng thử 30 ngày", logo CloudSync, gradient xanh professional.',
      voice: 'Dùng thử miễn phí 30 ngày tại cloudSync.vn/trial — bắt đầu ngay hôm nay.',
      durationSeconds: 6,
    },
  ],
  4: [
    {
      prompt: 'Flat design classroom — Dr. Linh đứng cạnh bảng "REST API là gì?", icon HTTP methods.',
      voice: 'Chào các bạn! Hôm nay chúng ta tìm hiểu REST API — khái niệm nền tảng cho mọi backend hiện đại.',
      durationSeconds: 7,
    },
    {
      prompt: 'Screen capture style — cài Node.js, VS Code extensions, Postman logo trên desktop.',
      voice: 'Bước 1: Cài Node.js v20, VS Code và Postman để test API trong suốt khóa học.',
      durationSeconds: 6,
    },
    {
      prompt: 'Terminal animation — npm init, npm install express, file tree project structure.',
      voice: 'Bước 2: Khởi tạo project Express với cấu trúc routes, controllers và models chuẩn.',
      durationSeconds: 6,
    },
    {
      prompt: 'Code editor highlight — GET /tasks endpoint, JSON response danh sách task.',
      voice: 'Bước 3: Xây dựng GET /tasks — trả về danh sách task dưới dạng JSON.',
      durationSeconds: 6,
    },
    {
      prompt: 'POST request demo — form tạo task mới, status 201 Created animation.',
      voice: 'Tiếp theo POST /tasks — tạo task mới và nhận mã 201 Created.',
      durationSeconds: 6,
    },
    {
      prompt: 'PUT và DELETE icons — cập nhật và xóa task trên UI mockup.',
      voice: 'PUT cập nhật task theo ID, DELETE xóa task — đủ bộ CRUD cơ bản.',
      durationSeconds: 6,
    },
    {
      prompt: 'MongoDB + Mongoose logo, schema Task model, database connection string blur.',
      voice: 'Bước 4: Kết nối MongoDB bằng Mongoose để lưu trữ task bền vững.',
      durationSeconds: 6,
    },
    {
      prompt: 'JWT middleware flowchart — token xác thực, error handler middleware stack.',
      voice: 'Bước 5: Thêm middleware JWT xác thực và xử lý lỗi tập trung.',
      durationSeconds: 6,
    },
    {
      prompt: 'Postman test all endpoints green checkmarks, Railway deploy dashboard.',
      voice: 'Test toàn bộ API trên Postman, sau đó deploy miễn phí lên Railway.',
      durationSeconds: 7,
    },
    {
      prompt: 'Dr. Linh smile thumbs up — recap checklist hoàn thành, subscribe CTA.',
      voice: 'Chúc mừng! Bạn đã có REST API hoàn chỉnh. Hẹn gặp lại ở bài nâng cao tiếp theo!',
      durationSeconds: 6,
    },
  ],
};

export const PRESET_DEMO_TIMELINES: Record<number, PresetTimelineDemo> = {
  1: {
    includeSubtitles: true,
    bgmPresetName: 'Upbeat Corporate',
    bgmVolume: 25,
    voiceSpeed: 1,
    sceneStyle: 'cinematic',
    transitionNote: 'Fade mềm giữa các cảnh sản phẩm',
  },
  2: {
    includeSubtitles: true,
    bgmPresetName: 'Lo-fi Chill',
    bgmVolume: 35,
    voiceSpeed: 1.25,
    sceneStyle: 'anime',
    transitionNote: 'Cut nhanh kiểu TikTok / Reels',
  },
  3: {
    includeSubtitles: true,
    bgmPresetName: 'Cinematic Epic',
    bgmVolume: 20,
    voiceSpeed: 1,
    sceneStyle: 'cinematic',
    transitionNote: 'Crossfade chuyên nghiệp B2B',
  },
  4: {
    includeSubtitles: true,
    bgmPresetName: 'Ambient Calm',
    bgmVolume: 15,
    voiceSpeed: 0.9,
    sceneStyle: 'flat-design',
    transitionNote: 'Chuyển cảnh mượt cho tutorial dài',
  },
};
