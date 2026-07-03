'use client';

import { Type, Link2, Image, File, Send } from 'lucide-react';

const tabs = [
  { icon: Type, label: 'Tự nhập nội dung', desc: 'Nhập từ bàn phím' },
  { icon: Link2, label: 'Từ link video', desc: 'Từ YouTube, TikTok...' },
  { icon: Image, label: 'Từ hình ảnh', desc: 'Tải lên hình ảnh' },
  { icon: File, label: 'Từ file', desc: 'PDF, Word, DOCX...' },
];

const configFields = [
  {
    label: 'Ngôn ngữ',
    options: ['Tiếng Việt', 'English', '中文', '日本語'],
  },
  {
    label: 'Độ dài video',
    options: ['1 - 3 phút', '5 - 10 phút', '10 - 20 phút', '20 - 30 phút'],
  },
  {
    label: 'Kiểu video',
    options: ['Kể chuyện', 'Hướng dẫn', 'Quảng cáo', 'Review sản phẩm'],
  },
  {
    label: 'Giọng đọc',
    options: ['Giọng nam - tự nhiên', 'Giọng nữ - tự nhiên', 'Giọng nam - chuyên nghiệp', 'Giọng nữ - trẻ trung'],
  },
];

export function InputSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-6">
          2. NHẬP NỘI DUNG ĐỂ AI TẠO VIDEO
        </h2>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              className={`p-4 rounded-lg border transition-all ${
                idx === 0
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <tab.icon className="w-5 h-5 mx-auto mb-2" />
              <p className="text-xs font-semibold leading-tight">{tab.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{tab.desc}</p>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <textarea
            placeholder="Nhập nội dung để AI tạo video, hoặc kéo thả file vào đây..."
            className="w-full h-40 px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
          <div className="text-xs text-muted-foreground text-right mt-2">0 / 5000</div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {configFields.map((field) => (
            <div key={field.label}>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">{field.label}</label>
              <select className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20">
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          Phân Tích & Tạo Kịch Bản
        </button>
      </div>
    </section>
  );
}
