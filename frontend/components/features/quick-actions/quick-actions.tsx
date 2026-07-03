'use client';

import { Zap, PenTool, Split, Sparkles, Video, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QuickActionId =
  | 'analyze'
  | 'script'
  | 'split'
  | 'generate'
  | 'render'
  | 'scene-duration';

const actions: {
  id: QuickActionId;
  icon: typeof Zap;
  label: string;
  color: string;
}[] = [
  { id: 'analyze', icon: Zap, label: 'Phân tích nội dung', color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'script', icon: PenTool, label: 'Viết kịch bản', color: 'bg-green-500/20 text-green-400' },
  { id: 'split', icon: Split, label: 'Chia cảnh', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'scene-duration', icon: Clock, label: 'Độ dài từng cảnh', color: 'bg-orange-500/20 text-orange-400' },
  { id: 'generate', icon: Sparkles, label: 'Tạo video & voice', color: 'bg-purple-500/20 text-purple-400' },
  { id: 'render', icon: Video, label: 'Render', color: 'bg-cyan-500/20 text-cyan-400' },
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
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {actions.map((action) => {
        const isActive = activeAction === action.id;
        return (
          <button
            key={action.id}
            onClick={() => onActionClick?.(action.id)}
            className={cn(
              'flex items-center gap-2 rounded-full border transition-all font-medium whitespace-nowrap',
              action.color,
              isActive ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border/50 hover:border-primary/50',
              compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
            )}
          >
            <action.icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
