'use client';

import { ChevronDown, ChevronLeft, FolderOpen, Menu } from 'lucide-react';
import { QuickActionsBar, type QuickActionId } from '@/components/features/quick-actions';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  onBackClick?: () => void;
  onMenuOpen?: () => void;
  showQuickActions?: boolean;
  activeQuickAction?: QuickActionId | null;
  onQuickActionClick?: (id: QuickActionId) => void;
}

export function Header({
  title,
  onBackClick,
  onMenuOpen,
  showQuickActions = false,
  activeQuickAction,
  onQuickActionClick,
}: HeaderProps) {
  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-3 flex flex-col gap-2 sticky top-0 z-20 flex-shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile menu toggle — chỉ hiện trên mobile */}
          {!onBackClick && onMenuOpen && (
            <button
              type="button"
              onClick={onMenuOpen}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors md:hidden text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Back button — màn Settings */}
          {onBackClick && (
            <button
              type="button"
              onClick={onBackClick}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors duration-150 text-muted-foreground hover:text-primary flex-shrink-0"
              aria-label="Quay lại"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Page title */}
          <h1 className="text-sm sm:text-base font-bold text-foreground flex-shrink-0 leading-none">
            {title}
          </h1>

        </div>
      </div>

      {/* Quick action buttons — Phân tích, Kịch bản, Chia cảnh, Thời lượng, Tạo video, Render */}
      {showQuickActions && (
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <QuickActionsBar
            compact
            activeAction={activeQuickAction}
            onActionClick={onQuickActionClick}
            className={cn('pb-0.5 flex-nowrap')}
          />
        </div>
      )}
    </header>
  );
}
