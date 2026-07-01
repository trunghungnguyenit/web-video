import React from 'react';
import { FileText, Link2, Image, Zap } from 'lucide-react';

const InputMethod = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <button className="flex-1 flex flex-col items-center gap-3 px-4 py-6 bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-card/80 transition-all group cursor-pointer">
    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
      {Icon}
    </div>
    <div className="text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  </button>
);

export function VideoInputSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">1. NHẬP NỘI DUNG ĐỂ AI TẠO VIDEO</h2>
        <p className="text-sm text-muted-foreground">
          Chọn một phương thức nhập liệu dưới đây để bắt đầu tạo video
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <InputMethod
          icon={<FileText className="w-6 h-6 text-primary" />}
          title="Từ nhập nội dung tự tạo"
          description="Nhập văn bản hoặc tạo từ lịch sử"
        />
        <InputMethod
          icon={<Link2 className="w-6 h-6 text-primary" />}
          title="Từ link video"
          description="YouTube, TikTok, Facebook..."
        />
        <InputMethod
          icon={<Image className="w-6 h-6 text-primary" />}
          title="Từ hình ảnh"
          description="JPG, PNG, WEBP..."
        />
        <InputMethod
          icon={<Zap className="w-6 h-6 text-primary" />}
          title="Từ file tài liệu"
          description="PDF, DOCX, TXT..."
        />
      </div>

      {/* Text Input Area */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Ngôn ngữ</label>
        <div className="flex gap-3">
          <select className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:border-primary/50 transition-colors">
            <option>Tiếng Việt</option>
            <option>English</option>
            <option>中文</option>
          </select>

          <select className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:border-primary/50 transition-colors flex-1">
            <option>5 - 10 phút</option>
            <option>10 - 20 phút</option>
            <option>20 - 30 phút</option>
          </select>

          <select className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:border-primary/50 transition-colors flex-1">
            <option>Kế tiêu đề</option>
            <option>Kế chuyên gia</option>
            <option>Kế dạo ý tưởng</option>
          </select>

          <select className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:border-primary/50 transition-colors flex-1">
            <option>Giọng đặc biệt</option>
            <option>Giọng trang nhân</option>
            <option>Giọng chuyên nghiệp</option>
          </select>
        </div>
      </div>

      {/* Text Area */}
      <div className="space-y-2">
        <textarea
          placeholder="NHập nội dung hoặc hướng dẫn bạn ở đây..."
          className="w-full h-32 px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
        />
        <div className="flex justify-end text-xs text-muted-foreground">
          0 / 5000
        </div>
      </div>

      {/* Button */}
      <button className="w-full py-3 bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover rounded-lg text-white font-semibold transition-all">
        ✨ PHÂN TÍCH & TẠO KỊCH BẢN
      </button>
    </div>
  );
}
