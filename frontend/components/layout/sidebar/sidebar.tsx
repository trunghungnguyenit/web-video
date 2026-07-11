'use client';

import {
  ChevronRight, Settings, Sparkles, Key, Gauge, Palette, Music,
  PanelLeftClose, PanelLeftOpen, UserCircle2, PenSquare, Images, Film,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { PRESET_SCRIPTS, type PresetScript } from '@/lib/preset-scripts';

export type AppView = 'video-library' | 'video-detail' | 'api-keys' | 'settings';
export type CreativeToolId =
  | 'character'          // Mục 1 — NHÂN VẬT CHÍNH
  | 'content'            // Mục 2 — Nhập nội dung
  | 'scene-gallery'      // Mục 3 — Danh sách cảnh
  | 'timeline'           // Mục 4 — Timeline
  | 'voice-speed'        // Mục 2 — mở accordion Tốc độ giọng
  | 'scene-style'        // Mục 2 — mở accordion Phong cách cảnh
  | 'background-music';  // Mục 4 — mở panel Nhạc nền

const menuItems: { id: string; view: AppView; icon: typeof Layers; label: string }[] = [
  { id: 'video-library', view: 'video-library', icon: Layers, label: 'Kho video' },
  { id: 'api-keys', view: 'api-keys', icon: Key, label: 'API Keys' },
];

interface ToolDef {
  id: CreativeToolId;
  icon: typeof Gauge;
  label: string;
  desc: string;
}

/** Điều hướng nhanh — nhảy đến các section chính trong video chi tiết đang active */
const navigationTools: ToolDef[] = [
  { id: 'character', icon: UserCircle2, label: 'Nhân vật', desc: 'Đi đến Mục 1' },
  { id: 'content', icon: PenSquare, label: 'Nhập nội dung', desc: 'Đi đến Mục 2' },
  { id: 'scene-gallery', icon: Images, label: 'Danh sách cảnh', desc: 'Đi đến Mục 3' },
  { id: 'timeline', icon: Film, label: 'Timeline', desc: 'Đi đến Mục 4' },
];

/** Tùy chỉnh chi tiết — mở panel/accordion tại section tương ứng */
const customizeTools: ToolDef[] = [
  { id: 'voice-speed', icon: Gauge, label: 'Tốc độ giọng', desc: 'Mục 1 · TTS' },
  { id: 'scene-style', icon: Palette, label: 'Phong cách cảnh', desc: 'Mục 2 · Visual' },
  { id: 'background-music', icon: Music, label: 'Nhạc nền', desc: 'Mục 3 · BGM' },
];

interface SidebarProps {
  activeView: AppView;
  activeMenuId: string;
  activeTool: CreativeToolId | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onMenuClick: (menuId: string, view: AppView) => void;
  onToolClick: (toolId: CreativeToolId) => void;
  onPresetSelect: (preset: PresetScript) => void;
}

// ─── Tool group ──────────────────────────────────────────────────────────────

interface ToolGroupProps {
  title: string;
  tools: ToolDef[];
  activeTool: CreativeToolId | null;
  collapsed: boolean;
  onClick: (id: CreativeToolId) => void;
}

function ToolGroup({ title, tools, activeTool, collapsed, onClick }: ToolGroupProps) {
  return (
    <div>
      {!collapsed && (
        <p className="text-[10px] font-bold text-sidebar-accent/50 uppercase tracking-widest px-3 mb-1.5">
          {title}
        </p>
      )}
      <div className="space-y-0.5">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onClick(tool.id)}
              title={collapsed ? `${tool.label} — ${tool.desc}` : undefined}
              aria-pressed={isActive}
              className={cn(
                'relative w-full flex items-center rounded-lg transition-all duration-150 cursor-pointer',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20 font-medium'
                  : 'text-sidebar-accent hover:bg-white/5 hover:text-sidebar-foreground border border-transparent',
              )}
            >
              <tool.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1 text-left min-w-0">
                  <span className="block text-xs font-medium truncate">{tool.label}</span>
                  <span className="block text-[10px] text-sidebar-accent/50 mt-0.5 truncate">{tool.desc}</span>
                </span>
              )}
              {!collapsed && isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
              {collapsed && isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({
  activeView,
  activeMenuId,
  activeTool,
  collapsed,
  onToggleCollapse,
  onMenuClick,
  onToolClick,
  onPresetSelect,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden flex-shrink-0',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[56px]' : 'w-56 lg:w-60',
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          'border-b border-sidebar-border flex-shrink-0',
          collapsed ? 'px-0 py-4' : 'px-4 py-5',
        )}
      >
        {collapsed ? (
          /* Collapsed: just the logo icon centered */
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center glow-primary">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-sidebar-accent hover:bg-white/10 hover:text-sidebar-foreground transition-colors cursor-pointer"
              aria-label="Mở rộng menu"
              title="Mở rộng menu"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Expanded: logo + toggle button */
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 lg:w-9 lg:h-9 bg-primary rounded-xl flex items-center justify-center glow-primary flex-shrink-0">
                <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-xs lg:text-sm text-sidebar-foreground leading-none truncate">
                  AI Video Studio
                </h1>
                <p className="text-[10px] text-sidebar-accent mt-0.5">Video Studio</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-sidebar-accent hover:bg-white/10 hover:text-sidebar-foreground transition-colors cursor-pointer flex-shrink-0"
              aria-label="Thu gọn menu"
              title="Thu gọn menu"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 min-h-0">

        {/* Main nav */}
        <nav className={cn('pt-2 pb-1 space-y-0.5', collapsed ? 'px-1.5' : 'px-2')}>
          {menuItems.map((item) => {
            const isActive = activeView !== 'settings' && activeMenuId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onMenuClick(item.id, item.view)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center rounded-lg font-medium transition-all duration-150 cursor-pointer',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-accent hover:bg-white/5 hover:text-sidebar-foreground border border-transparent',
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-xs lg:text-sm truncate">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className={cn('my-2 border-t border-sidebar-border/60', collapsed ? 'mx-1.5' : 'mx-2')} />

        {/* Creative tools — Điều hướng + Tùy chỉnh */}
        <div className={cn('pb-2 space-y-2', collapsed ? 'px-1.5' : 'px-2')}>
          <ToolGroup
            title="Điều hướng"
            tools={navigationTools}
            activeTool={activeTool}
            collapsed={collapsed}
            onClick={onToolClick}
          />
          <ToolGroup
            title="Tùy chỉnh"
            tools={customizeTools}
            activeTool={activeTool}
            collapsed={collapsed}
            onClick={onToolClick}
          />
        </div>

        {/* Preset scripts — hidden when collapsed */}
        {!collapsed && (
          <>
            <div className="mx-2 my-2 border-t border-sidebar-border/60" />
            <div className="px-2 pb-2">
              <p className="text-[10px] font-bold text-sidebar-accent/50 uppercase tracking-widest px-3 mb-1.5">
                Kịch bản mẫu
              </p>
              <div className="space-y-0.5">
                {PRESET_SCRIPTS.map((script) => (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => onPresetSelect(script)}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors duration-150 cursor-pointer group"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="block text-xs font-medium text-sidebar-foreground/80 group-hover:text-primary transition-colors truncate">
                        {script.title}
                      </span>
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 flex-shrink-0">
                        DEMO
                      </span>
                    </span>
                    <span className="block text-[10px] text-sidebar-accent/50 truncate">{script.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Settings footer */}
      <div className={cn('py-2.5 border-t border-sidebar-border flex-shrink-0', collapsed ? 'px-1.5' : 'px-2')}>
        <button
          type="button"
          onClick={() => onMenuClick('settings', 'settings')}
          title={collapsed ? 'Cài đặt' : undefined}
          className={cn(
            'w-full flex items-center rounded-lg transition-all duration-150 cursor-pointer font-medium',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5',
            activeView === 'settings'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-sidebar-accent hover:bg-white/5 hover:text-sidebar-foreground border border-transparent',
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs lg:text-sm">Cài đặt</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile bottom nav ───────────────────────────────────────────────────────

interface MobileNavProps {
  activeView: AppView;
  onMenuClick: (menuId: string, view: AppView) => void;
  onMenuOpen: () => void;
}

export function MobileNav({ activeView, onMenuClick, onMenuOpen }: MobileNavProps) {
  const navItems = [
    { id: 'video-library', view: 'video-library' as AppView, icon: Layers, label: 'Kho video' },
    { id: 'api-keys', view: 'api-keys' as AppView, icon: Key, label: 'API Keys' },
    { id: 'settings', view: 'settings' as AppView, icon: Settings, label: 'Cài đặt' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onMenuClick(item.id, item.view)}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-150 cursor-pointer"
            >
              <item.icon className={cn('w-5 h-5 transition-colors', isActive ? 'text-primary' : 'text-sidebar-accent')} />
              <span className={cn('text-[10px] font-medium transition-colors', isActive ? 'text-primary' : 'text-sidebar-accent/70')}>
                {item.label}
              </span>
              {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onMenuOpen}
          className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer"
        >
          <div className="flex flex-col gap-[3px] items-center justify-center w-5 h-5">
            <span className="w-4 h-0.5 bg-sidebar-accent rounded-full" />
            <span className="w-3 h-0.5 bg-sidebar-accent rounded-full" />
            <span className="w-4 h-0.5 bg-sidebar-accent rounded-full" />
          </div>
          <span className="text-[10px] font-medium text-sidebar-accent/70">Thêm</span>
        </button>
      </div>
    </nav>
  );
}
