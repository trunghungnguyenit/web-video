'use client';

import { ChevronRight, Play, Settings, Sparkles, Key, Gauge, Palette, Music } from 'lucide-react';

export type AppView = 'project' | 'api-keys' | 'settings';
export type CreativeToolId = 'voice-speed' | 'scene-style' | 'background-music';

const menuItems: { id: string; view: AppView; icon: typeof Play; label: string }[] = [
  { id: 'project', view: 'project', icon: Play, label: 'Dự Án' },
  { id: 'api-keys', view: 'api-keys', icon: Key, label: 'Quản lý API Keys' },
];

const creativeTools: { id: CreativeToolId; icon: typeof Gauge; label: string }[] = [
  { id: 'voice-speed', icon: Gauge, label: 'Tốc độ giọng' },
  { id: 'scene-style', icon: Palette, label: 'Phong cách cảnh' },
  { id: 'background-music', icon: Music, label: 'Thêm nhạc nền' },
];

const presetScripts = [
  { id: 1, title: 'Product Demo', desc: 'Giới thiệu sản phẩm' },
  { id: 2, title: 'Social Media', desc: 'Video TikTok/Reels' },
  { id: 3, title: 'Marketing', desc: 'Quảng cáo sản phẩm' },
  { id: 4, title: 'Tutorial', desc: 'Hướng dẫn chi tiết' },
];

interface SidebarProps {
  activeView: AppView;
  activeMenuId: string;
  activeTool: CreativeToolId | null;
  onMenuClick: (menuId: string, view: AppView) => void;
  onToolClick: (toolId: CreativeToolId) => void;
}

export function Sidebar({ activeView, activeMenuId, activeTool, onMenuClick, onToolClick }: SidebarProps) {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
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

      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 py-6 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeView !== 'settings' && activeMenuId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onMenuClick(item.id, item.view)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-accent hover:bg-sidebar-accent/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 space-y-2">
          <p className="text-xs font-semibold text-sidebar-accent uppercase tracking-wider px-4">Công cụ tạo</p>
          {creativeTools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onToolClick(tool.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 font-medium'
                    : 'text-sidebar-accent hover:text-primary hover:bg-primary/5'
                }`}
              >
                <tool.icon className="w-4 h-4" />
                {tool.label}
              </button>
            );
          })}
        </div>

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

  
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={() => onMenuClick('settings', 'settings')}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all ${
            activeView === 'settings'
              ? 'bg-primary/10 text-primary border border-primary/20 font-medium'
              : 'text-sidebar-accent hover:text-primary hover:bg-primary/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          Cài đặt
        </button>
      </div>
    </aside>
  );
}
