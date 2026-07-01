'use client';

import { ChevronRight, Play, BookOpen, Image, Settings, Zap, Code, Lock, Sparkles, Layers, MessageCircle, Database, Plus } from 'lucide-react';

const menuItems = [
  { icon: Play, label: 'Dự Án', active: true },
  { icon: BookOpen, label: 'Bảng Điều Khiển' },
  { icon: Image, label: 'Video Của Tôi' },
  { icon: Layers, label: 'Thư Viện' },
];

const creativeTools = [
  { icon: Zap, label: 'Tạo Từ Script' },
  { icon: MessageCircle, label: 'Chat AI' },
  { icon: Database, label: 'Asset Manager' },
];

const presetScripts = [
  { id: 1, title: 'Product Demo', desc: 'Giới thiệu sản phẩm' },
  { id: 2, title: 'Social Media', desc: 'Video TikTok/Reels' },
  { id: 3, title: 'Marketing', desc: 'Quảng cáo sản phẩm' },
  { id: 4, title: 'Tutorial', desc: 'Hướng dẫn chi tiết' },
];

interface SidebarProps {
  onSettingsClick?: () => void;
}

export function Sidebar({ onSettingsClick }: SidebarProps) {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-sm text-sidebar-foreground">AI Auto Generate</h1>
            <p className="text-xs text-sidebar-accent">AI Video Studio</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <nav className="px-3 py-6 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-sidebar-accent hover:bg-sidebar-accent/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.active && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </nav>

        {/* Creative Tools Section */}
        <div className="px-3 py-4 space-y-2">
          <p className="text-xs font-semibold text-sidebar-accent uppercase tracking-wider px-4">Công cụ tạo</p>
          {creativeTools.map((tool) => (
            <button
              key={tool.label}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-sidebar-accent hover:text-primary hover:bg-primary/5 transition-all"
            >
              <tool.icon className="w-4 h-4" />
              {tool.label}
            </button>
          ))}
        </div>

        {/* Preset Scripts */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2 max-h-48">
          <p className="text-xs font-semibold text-sidebar-accent uppercase tracking-wider px-4">Kịch bản có sẵn</p>
          <div className="space-y-2 overflow-y-auto max-h-40 px-1">
            {presetScripts.map((script) => (
              <button
                key={script.id}
                className="w-full text-left p-3 rounded-lg bg-sidebar-accent/5 hover:bg-sidebar-accent/10 transition-colors group"
              >
                <h3 className="text-xs font-semibold text-sidebar-foreground truncate group-hover:text-primary transition-colors">
                  {script.title}
                </h3>
                <p className="text-xs text-sidebar-accent/70 truncate">{script.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pro Upgrade */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        <div className="px-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-sidebar-accent">API Calls</span>
            <span className="font-semibold text-sidebar-foreground">8/1000</span>
          </div>
          <div className="h-1.5 bg-sidebar-accent/20 rounded-full overflow-hidden">
            <div className="h-full w-1/12 bg-primary rounded-full" />
          </div>
        </div>
        <button className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors">
          Nâng cấp gói
        </button>
      </div>

      {/* Settings */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button onClick={onSettingsClick} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-sidebar-accent hover:text-primary hover:bg-primary/5 transition-all">
          <Settings className="w-4 h-4" />
          Cài đặt
        </button>
      </div>
    </aside>
  );
}
