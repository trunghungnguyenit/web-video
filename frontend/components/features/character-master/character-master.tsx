'use client';

import { User } from 'lucide-react';

export function CharacterMaster() {
  return (
    <section className="space-y-6">
      <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
        1. MASTER CHARACTER (ĐỒNG BỘ NHÂN VẬT)
      </h2>
      <p className="text-sm text-muted-foreground -mt-4">
        Chọn và thiết lập nhân vật trước khi tạo kịch bản — nhân vật sẽ xuất hiện đồng nhất trong tất cả các cảnh.
      </p>

      <div className="bg-card border border-border rounded-2xl p-8 flex gap-8">
        <div className="flex-shrink-0">
          <div className="w-32 h-32 bg-muted rounded-xl overflow-hidden border border-border flex items-center justify-center">
            <User className="w-16 h-16 text-muted-foreground" />
          </div>
          <button className="w-full mt-4 px-4 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
            Thay đổi phong cách
          </button>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">TÊN NHÂN VẬT</p>
            <input
              type="text"
              placeholder="Nhập tên..."
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">VAI TRÒ</p>
              <input
                type="text"
                placeholder="Vd: Tính toán viên"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">ĐẶC ĐIỂM</p>
              <input
                type="text"
                placeholder="Tính cách..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">TRANG PHỤC</p>
              <input
                type="text"
                placeholder="Mô tả..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">MÔ TẢ CHI TIẾT</p>
            <textarea
              placeholder="Mô tả chi tiết về nhân vật..."
              className="w-full h-24 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
