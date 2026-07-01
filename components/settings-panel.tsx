'use client';

import { Settings, Key, Clock, Bell, User, Shield, CreditCard, Database } from 'lucide-react';

interface SettingsPanelProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const settingsTabs = [
  { id: 'general', label: 'Cài đặt chung', icon: Settings },
  { id: 'key', label: 'Cài Đặt Key', icon: Key },
  { id: 'api', label: 'Quản lý API Keys', icon: Key },
  { id: 'history', label: 'Lịch sử render', icon: Clock },
];

export function SettingsPanel({ activeTab, onTabChange }: SettingsPanelProps) {
  return (
    <div className="space-y-8">
      {/* Settings Menu */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-primary uppercase tracking-widest px-2">CÀI ĐẬT</h3>
        <div className="space-y-1">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-sidebar-accent hover:text-primary hover:bg-sidebar-accent/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content */}
      <div className="space-y-6">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'key' && <KeySetupSettings />}
        {activeTab === 'api' && <ApiKeysSettings />}
        {activeTab === 'history' && <RenderHistorySettings />}
      </div>
    </div>
  );
}

function GeneralSettings() {
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

function ApiKeysSettings() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-4">Quản lý API Keys</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Quản lý và cấu hình các API keys cho các dịch vụ bên ngoài
        </p>
      </div>

      <div className="space-y-3">
        {[
          { name: 'OpenAI / GPT', connected: true, desc: 'Cho text generation và AI tasks' },
          { name: 'ElevenLabs', connected: true, desc: 'Cho voice synthesis' },
          { name: 'Runway ML', connected: false, desc: 'Cho video generation' },
          { name: 'Google Cloud', connected: false, desc: 'Cho TTS và APIs khác' },
        ].map((api) => (
          <div key={api.name} className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <div className="flex-1">
              <h5 className="text-sm font-medium text-foreground">{api.name}</h5>
              <p className="text-xs text-muted-foreground">{api.desc}</p>
            </div>
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                api.connected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-border hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border'
              }`}
            >
              {api.connected ? 'Đã kết nối' : 'Kết nối'}
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-6">
        <button className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition-colors">
          + Thêm API Key
        </button>
      </div>
    </div>
  );
}

function KeySetupSettings() {
  return (
    <div className="space-y-8">
      {/* CẶP ĐẶT KEY Section */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Cặp Đặt Key</h4>
          <p className="text-xs text-muted-foreground">License Key & Hỏi Người Hướng</p>
        </div>

        <div className="space-y-4">
          {/* License Key Input */}
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

          {/* History Dropdown */}
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

          {/* API Key Input */}
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

          {/* Input/Output Folders */}
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

          {/* Checkboxes */}
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

          {/* Buttons */}
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

      {/* TÙY CHỌN KÍCH BẢN Section */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Tùy Chọn Kích Bản</h4>
          <p className="text-xs text-muted-foreground">Cấu hình cho video generation</p>
        </div>

        <div className="space-y-4">
          {/* Thúc Lượng */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Thúc lượng (iPod)</label>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors">
              <option>Thúc lượng (iPod)</option>
              <option>25-35 phút</option>
              <option>35-45 phút</option>
              <option>45-60 phút</option>
            </select>
          </div>

          {/* Phong Cách Hiệu Ứng */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Phong cách hiệu ứng video</label>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors">
              <option>☑ Stockman Primitive</option>
              <option>Cinematic</option>
              <option>Documentary</option>
              <option>Modern</option>
            </select>
          </div>

          {/* Voice & Character */}
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

          {/* Language */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Ngôn ngữ</label>
            <select className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-primary/50 focus:border-primary/50 outline-none transition-colors">
              <option>vs English</option>
              <option>Tiếng Việt</option>
              <option>中文</option>
              <option>日本語</option>
            </select>
          </div>

          {/* Additional Settings */}
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

          {/* Save Button */}
          <button className="w-full mt-6 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors">
            Lưu Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
}

function RenderHistorySettings() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-4">Lịch sử render</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Xem lịch sử các video đã render
        </p>
      </div>

      <div className="space-y-2">
        {[
          { id: 1, name: 'Video_Demo_01.mp4', date: '2024-01-15 14:30', status: 'completed', size: '245 MB' },
          { id: 2, name: 'Product_Showcase.mp4', date: '2024-01-14 10:15', status: 'completed', size: '198 MB' },
          { id: 3, name: 'Tutorial_Part1.mp4', date: '2024-01-13 16:45', status: 'failed', size: '-' },
          { id: 4, name: 'Marketing_Video.mp4', date: '2024-01-12 09:20', status: 'completed', size: '512 MB' },
          { id: 5, name: 'Social_Media_Reel.mp4', date: '2024-01-11 15:00', status: 'completed', size: '87 MB' },
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-lg hover:border-primary/30 transition-colors group">
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-medium text-foreground truncate">{item.name}</h5>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{item.date}</span>
                <span className="text-xs text-muted-foreground">{item.size}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-destructive/20 text-destructive'
                }`}
              >
                {item.status === 'completed' ? 'Hoàn tất' : 'Lỗi'}
              </span>
              <button className="px-2 py-1 text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                ⋮
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">Tổng dung lượng: 1.2 GB / 10 GB</span>
        <button className="text-xs text-destructive hover:text-destructive/80 transition-colors">
          Xóa tất cả
        </button>
      </div>
    </div>
  );
}
