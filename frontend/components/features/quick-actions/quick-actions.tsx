'use client';

import { Zap, PenTool, Scissors, Clock, Sparkles, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QuickActionId =
  | 'analyze'
  | 'script'
  | 'split'
  | 'generate'
  | 'render'
  | 'scene-duration';

interface ActionDef {
  id: QuickActionId;
  icon: typeof Zap;
  label: string;
  tooltip: string;
  /** Classes khi không active */
  base: string;
  /** Classes khi active */
  active: string;
}

const actions: ActionDef[] = [
  {
    id: 'analyze',
    icon: Zap,
    label: 'Phân tích',
    tooltip: 'Phân tích nội dung đầu vào để AI hiểu chủ đề',
    base: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/40',
    active: 'bg-yellow-500/25 border-yellow-500/60 text-yellow-300 ring-2 ring-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.15)]',
  },
  {
    id: 'script',
    icon: PenTool,
    label: 'Kịch bản',
    tooltip: 'Tự động viết kịch bản từ nội dung đã nhập',
    base: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40',
    active: 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300 ring-2 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  },
  {
    id: 'split',
    icon: Scissors,
    label: 'Chia cảnh',
    tooltip: 'Chia kịch bản thành từng cảnh riêng lẻ',
    base: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40',
    active: 'bg-blue-500/25 border-blue-500/60 text-blue-300 ring-2 ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
  },
  {
    id: 'scene-duration',
    icon: Clock,
    label: 'Thời lượng',
    tooltip: 'Điều chỉnh độ dài từng cảnh trong video',
    base: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40',
    active: 'bg-orange-500/25 border-orange-500/60 text-orange-300 ring-2 ring-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.15)]',
  },
  {
    id: 'generate',
    icon: Sparkles,
    label: 'Tạo video',
    tooltip: 'Tạo video và giọng đọc (TTS) cho tất cả cảnh',
    base: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40',
    active: 'bg-purple-500/25 border-purple-500/60 text-purple-300 ring-2 ring-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
  },
  {
    id: 'render',
    icon: Video,
    label: 'Render',
    tooltip: 'Xuất video hoàn chỉnh từ timeline đã chỉnh sửa',
    base: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40',
    active: 'bg-cyan-500/25 border-cyan-500/60 text-cyan-300 ring-2 ring-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
  },
];

interface QuickActionsBarProps {
  className?: string;
  compact?: boolean;
  activeAction?: QuickActionId | null;
  onActionClick?: (id: QuickActionId) => void;
}

export function QuickActionsBar({
  className,
  compact = false,
  activeAction,
  onActionClick,
}: QuickActionsBarProps) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {actions.map((action) => {
        const isActive = activeAction === action.id;
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onActionClick?.(action.id)}
            title={action.tooltip}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
              'transition-all duration-150 cursor-pointer select-none',
              isActive ? action.active : action.base,
              compact ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-sm',
            )}
          >
            <action.icon className={cn('flex-shrink-0', compact ? 'w-3 h-3' : 'w-4 h-4')} />
            <span>{action.label}</span>
            {/* Dot indicator khi active */}
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-current opacity-80 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
