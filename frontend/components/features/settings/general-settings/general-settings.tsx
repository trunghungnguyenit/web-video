export function GeneralSettings() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-4">Cài đặt chung</h4>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Ngôn ngữ</label>
            <select className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 transition-colors">
              <option>Tiếng Việt</option>
              <option>English</option>
              <option>中文</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Chủ đề</label>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-primary/20 border border-primary rounded-lg text-xs font-medium text-primary">
                Tối
              </button>
              <button className="flex-1 px-3 py-2 bg-border border border-border rounded-lg text-xs font-medium text-muted-foreground hover:border-primary/50 transition-colors">
                Sáng
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-xs font-medium text-foreground">Thông báo âm thanh</label>
            <button className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary/30">
              <span className="inline-block h-4 w-4 transform rounded-full bg-primary translate-x-4 transition-transform" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-xs font-medium text-foreground">Tự động lưu</label>
            <button className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-4 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h5 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Tài khoản</h5>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm text-foreground">user@example.com</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Gói</span>
            <span className="text-sm text-primary font-medium">Pro</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ngày hết hạn</span>
            <span className="text-sm text-foreground">2025-12-31</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <button className="px-4 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive text-sm font-medium rounded-lg transition-colors">
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
