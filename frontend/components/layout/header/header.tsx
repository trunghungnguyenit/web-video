'use client';

import { ChevronDown, ChevronLeft, Settings } from 'lucide-react';
import { QuickActionsBar, type QuickActionId } from '@/components/features/quick-actions';

interface HeaderProps {
  title: string;
  onBackClick?: () => void;
  showQuickActions?: boolean;
  activeQuickAction?: QuickActionId | null;
  onQuickActionClick?: (id: QuickActionId) => void;
}

export function Header({
  title,
  onBackClick,
  showQuickActions = false,
  activeQuickAction,
  onQuickActionClick,
}: HeaderProps) {
  return (
    <header className="bg-background border-b border-border px-8 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {onBackClick && (
            <button onClick={onBackClick} className="p-2 hover:bg-card rounded-lg transition-colors text-muted-foreground hover:text-primary shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-foreground shrink-0">
            {title}
          </h1>
          {!onBackClick && (
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-card/80 transition-colors text-sm text-muted-foreground shrink-0">
              <span>Demo Project</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {!onBackClick && (
          <button className="p-2 hover:bg-card rounded-lg transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {showQuickActions && (
        <QuickActionsBar
          compact
          activeAction={activeQuickAction}
          onActionClick={onQuickActionClick}
        />
      )}
    </header>
  );
}
