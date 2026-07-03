export function KeySetupSettings() {
  return (
    <div className="space-y-8">
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Cặp Đặt Key</h4>
          <p className="text-xs text-muted-foreground">License Key & Hỏi Người Hướng</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">License Key</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập hoặc dán key của bạn"
                defaultValue="3L4Y-TXRH-J540-TQRF"
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 hover:border-primary/50 focus:border-primary/50 outline-none transition-colors"
              />
              <button className="px-4 py-2 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary text-sm font-medium rounded-lg transition-colors">
                Kiểm tra
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Genome.AI</p>
            <p className="text-xs text-muted-foreground mt-2">
              Chọn key từ lịch sử của cả quản lý Blackrock sẽ có thêm chức năng
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Quản lý Openai API keys</label>
            <div className="flex gap-2">
              <select className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors">
                <option>Mô hình để sinh kích bản</option>
                <option>Openai 31 Flash-1.1b</option>
                <option>Openai GPT-4</option>
                <option>Openai GPT-3.5</option>
              </select>
              <button className="px-4 py-2 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary text-sm font-medium rounded-lg transition-colors">
                Lưu
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Async(Kích API key)</label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-..."
                defaultValue="••••••••••••••••••••••••••••••••"
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono hover:border-primary/50 focus:border-primary/50 outline-none transition-colors"
              />
              <button className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary">
                👁
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Input folder:</label>
              <input
                type="text"
                placeholder="D:\..."
                defaultValue="D:\Uunditi"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors"
              />
              <p className="text-xs text-muted-foreground mt-2">⭐ ⭐</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Output:</label>
              <p className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
                D:\Uunditi
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="audio-input" className="w-4 h-4" />
              <label htmlFor="audio-input" className="text-sm text-foreground cursor-pointer">
                Nội dung âm thanh đầu vào
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remove-music" className="w-4 h-4" defaultChecked />
              <label htmlFor="remove-music" className="text-sm text-foreground cursor-pointer">
                Nội dung âm thanh đầu vào
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors">
              Lưu
            </button>
            <button className="flex-1 px-4 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive text-sm font-medium rounded-lg transition-colors">
              Loại bỏ
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Tùy Chọn Kích Bản</h4>
          <p className="text-xs text-muted-foreground">Cấu hình cho video generation</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Thúc lượng (iPod)</label>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors">
              <option>Thúc lượng (iPod)</option>
              <option>25-35 phút</option>
              <option>35-45 phút</option>
              <option>45-60 phút</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Phong cách hiệu ứng video</label>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors">
              <option>☑ Stockman Primitive</option>
              <option>Cinematic</option>
              <option>Documentary</option>
              <option>Modern</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Giọng nói & Nhân vật</label>
            <p className="text-xs text-foreground bg-background/50 border border-border rounded-lg p-3 mb-2">
              Người tạo hội thoại năng 25-35 phút, phong cách: tương tạo, tính cách: hơi lạm dụng
            </p>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors">
              <option>Ngoài ngôn nói bản: và gương nội</option>
              <option>Tiếng Việt - Nam</option>
              <option>Tiếng Việt - Nữ</option>
              <option>English - Male</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Ngôn ngữ</label>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors">
              <option>vs English</option>
              <option>Tiếng Việt</option>
              <option>中文</option>
              <option>日本語</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="auto-subtitle" className="w-4 h-4" defaultChecked />
              <label htmlFor="auto-subtitle" className="text-sm text-foreground cursor-pointer">
                Tạo phụ đề tự động
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="background-music" className="w-4 h-4" defaultChecked />
              <label htmlFor="background-music" className="text-sm text-foreground cursor-pointer">
                Thêm nhạc nền
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="logo-watermark" className="w-4 h-4" />
              <label htmlFor="logo-watermark" className="text-sm text-foreground cursor-pointer">
                Thêm logo/watermark
              </label>
            </div>
          </div>

          <button className="w-full mt-6 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors">
            Lưu Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
}
