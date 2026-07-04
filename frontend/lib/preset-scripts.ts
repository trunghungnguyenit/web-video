// ─── Dữ liệu kịch bản mẫu ────────────────────────────────────────────────────

export interface PresetCharacter {
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style: string;
}

export interface PresetInput {
  content: string;
  language: string;
  duration: string;
  videoType: string;
  voice: string;
}

export interface PresetScript {
  id: number;
  title: string;
  desc: string;
  badge: string; // nhãn hiển thị trong modal
  character: PresetCharacter;
  input: PresetInput;
}

export const PRESET_SCRIPTS: PresetScript[] = [
  {
    id: 1,
    title: 'Product Demo',
    desc: 'Giới thiệu sản phẩm',
    badge: '🎯 Giới thiệu sản phẩm',
    character: {
      name: 'Alex — Chuyên gia sản phẩm',
      role: 'Product Specialist',
      traits: 'Tự tin, nhiệt tình, am hiểu công nghệ',
      outfit: 'Áo sơ mi xanh navy, quần tây đen, đeo tai nghe chuyên nghiệp',
      description:
        'Alex là chuyên gia tư vấn sản phẩm công nghệ với hơn 5 năm kinh nghiệm. Phong cách trình bày rõ ràng, dễ hiểu, luôn tập trung vào lợi ích thực tiễn của người dùng.',
      style: 'Cinematic',
    },
    input: {
      content:
        'Giới thiệu sản phẩm SmartHome Pro — thiết bị điều khiển nhà thông minh thế hệ mới.\n\n' +
        '✅ Tính năng nổi bật:\n' +
        '- Điều khiển toàn bộ thiết bị trong nhà qua app di động\n' +
        '- Tiết kiệm điện năng lên đến 40% nhờ AI tự động hóa\n' +
        '- Kết nối 200+ thiết bị thông minh, tương thích mọi nền tảng\n' +
        '- Bảo mật 2 lớp, dữ liệu mã hóa end-to-end\n\n' +
        '📦 Phù hợp với: Hộ gia đình, văn phòng, căn hộ cao cấp\n' +
        '💰 Giá: 2.990.000đ — Bảo hành 2 năm chính hãng',
      language: 'vi',
      duration: '1-3',
      videoType: 'review',
      voice: 'male-natural',
    },
  },
  {
    id: 2,
    title: 'Social Media',
    desc: 'TikTok / Reels',
    badge: '📱 TikTok / Reels',
    character: {
      name: 'Mia — Content Creator',
      role: 'Social Media Creator',
      traits: 'Năng động, sáng tạo, gần gũi với giới trẻ',
      outfit: 'Áo thun pastel, jeans rách, mũ bucket, giày sneaker',
      description:
        'Mia là content creator nổi tiếng với phong cách trẻ trung, vui nhộn. Cô nàng chuyên tạo ra những video ngắn viral trên TikTok và Instagram Reels, luôn bắt trend nhanh và có góc nhìn độc đáo.',
      style: 'Anime / Manga',
    },
    input: {
      content:
        '🔥 Video viral: "5 mẹo học tiếng Anh siêu tốc mà trường học không dạy bạn"\n\n' +
        'Hook mở đầu (3 giây): "Bạn đã học tiếng Anh bao nhiêu năm mà vẫn không nói được?"\n\n' +
        'Nội dung chính:\n' +
        '1. Nghe nhạc/podcast tiếng Anh mỗi sáng — 15 phút/ngày\n' +
        '2. Shadowing — bắt chước giọng người bản ngữ\n' +
        '3. Học qua series phim yêu thích có phụ đề\n' +
        '4. App Anki — học từ vựng bằng spaced repetition\n' +
        '5. Tìm speaking partner online — italki, HelloTalk\n\n' +
        'CTA: "Follow để nhận thêm tips học ngoại ngữ mỗi ngày! 🎯"',
      language: 'vi',
      duration: '1-3',
      videoType: 'storytelling',
      voice: 'female-young',
    },
  },
  {
    id: 3,
    title: 'Marketing',
    desc: 'Quảng cáo sản phẩm',
    badge: '📣 Quảng cáo',
    character: {
      name: 'Ryan — Brand Ambassador',
      role: 'Brand Spokesperson',
      traits: 'Lôi cuốn, đáng tin cậy, quyền uy',
      outfit: 'Suit đen đẳng cấp, cà vạt đỏ, đồng hồ cao cấp',
      description:
        'Ryan là đại sứ thương hiệu có uy tín trong lĩnh vực marketing B2B. Giọng nói trầm ấm, phong thái chuyên nghiệp, chuyên truyền đạt thông điệp thương hiệu một cách thuyết phục và đáng nhớ.',
      style: 'Cinematic',
    },
    input: {
      content:
        'Chiến dịch quảng cáo: "CloudSync — Giải pháp lưu trữ doanh nghiệp thế hệ mới"\n\n' +
        'Thông điệp chính: An toàn • Nhanh chóng • Không giới hạn\n\n' +
        'Kịch bản video 60 giây:\n\n' +
        '[0-10s] Vấn đề: Doanh nghiệp bạn đang mất dữ liệu, chậm trễ vì hệ thống cũ kỹ?\n\n' +
        '[10-40s] Giải pháp CloudSync:\n' +
        '- Backup tự động 24/7, không bao giờ mất dữ liệu\n' +
        '- Tốc độ upload/download nhanh gấp 10x đối thủ\n' +
        '- Mã hóa military-grade, đạt chuẩn ISO 27001\n' +
        '- Đội ngũ support 24/7, SLA 99.99% uptime\n\n' +
        '[40-60s] CTA: Dùng thử miễn phí 30 ngày — cloudSync.vn/trial',
      language: 'vi',
      duration: '1-3',
      videoType: 'ads',
      voice: 'male-pro',
    },
  },
  {
    id: 4,
    title: 'Tutorial',
    desc: 'Hướng dẫn chi tiết',
    badge: '📚 Hướng dẫn',
    character: {
      name: 'Dr. Linh — Giảng viên',
      role: 'Expert Instructor',
      traits: 'Kiên nhẫn, tỉ mỉ, am hiểu sâu, truyền đạt dễ hiểu',
      outfit: 'Áo blazer xanh lam nhạt, quần âu, kính gọng tròn, cầm bảng viết',
      description:
        'Dr. Linh là giảng viên đại học với 10 năm kinh nghiệm giảng dạy lập trình và công nghệ. Chuyên xây dựng nội dung giáo dục từ cơ bản đến nâng cao, luôn dùng ví dụ thực tế để minh họa khái niệm phức tạp.',
      style: 'Flat Design',
    },
    input: {
      content:
        'Hướng dẫn: "Cách xây dựng REST API với Node.js và Express từ A đến Z"\n\n' +
        'Đối tượng: Lập trình viên mới bắt đầu, đã biết JavaScript cơ bản\n\n' +
        'Nội dung bài học:\n\n' +
        '1. REST API là gì? — Khái niệm, HTTP methods (GET/POST/PUT/DELETE)\n\n' +
        '2. Cài đặt môi trường:\n' +
        '   - Node.js v20+, npm\n' +
        '   - VS Code + extensions hữu ích\n' +
        '   - Postman để test API\n\n' +
        '3. Tạo project Express cơ bản:\n' +
        '   - npm init, cài express\n' +
        '   - File cấu trúc chuẩn (routes, controllers, models)\n\n' +
        '4. Xây dựng CRUD API cho "Task Manager":\n' +
        '   - GET /tasks — lấy danh sách\n' +
        '   - POST /tasks — tạo task mới\n' +
        '   - PUT /tasks/:id — cập nhật\n' +
        '   - DELETE /tasks/:id — xóa\n\n' +
        '5. Kết nối MongoDB với Mongoose\n\n' +
        '6. Middleware: xác thực JWT, error handling\n\n' +
        'Kết quả: Có được API hoàn chỉnh, deploy lên Railway miễn phí',
      language: 'vi',
      duration: '5-10',
      videoType: 'tutorial',
      voice: 'female-natural',
    },
  },
];
