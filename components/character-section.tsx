import React from 'react';
import { Badge } from '@/components/ui/badge';

export function CharacterSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground mb-2">2. THÀNH PHỐ NÂNG NHÂN</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Chọn hoặc tạo một nhân vật cho video của bạn
          </p>

          {/* Character Info */}
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="w-32 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg border border-primary/30 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">👨</span>
                </div>
              </div>
              <button className="absolute bottom-2 right-2 px-3 py-1 bg-primary/80 hover:bg-primary text-white text-xs rounded font-medium transition-colors">
                Chỉnh sửa
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">A young man in his 20s, Asian, short black hair, wearing a black hoodie and dark jeans, serious face, cinematic lighting, bright, ultra detailed, professional character, across all scenes.</h3>
                <p className="text-xs text-muted-foreground">Nhân vật được chỉ định sẽ xuất hiện trong tất cả các scene</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Male
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Asian
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  20-25 age
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Black hair
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Black hoodie
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Cinematic
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Right side content placeholder */}
        <div className="w-80 space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Phân tích nội dung sử dụng</h4>
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground flex-1">Phần tích nội dung</span>
              <Badge variant="secondary" className="bg-success/20 text-success">
                ✓
              </Badge>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground flex-1">Viết kịch bản</span>
              <Badge variant="secondary" className="bg-success/20 text-success">
                ✓
              </Badge>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground flex-1">Chia cảnh</span>
              <Badge variant="secondary" className="bg-muted/30 text-muted-foreground">
                -
              </Badge>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground flex-1">Tạo nội dung hình ảnh</span>
              <Badge variant="secondary" className="bg-muted/30 text-muted-foreground">
                -
              </Badge>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                <span className="text-sm font-bold">📋</span>
              </div>
              <span className="text-sm font-semibold text-foreground">They did nhân vật</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Đây là một nhân vật tạm thời. Hãy tiếp tục tạo kịch bản để hoàn thành video của bạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
