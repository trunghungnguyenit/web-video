'use client';

import {
  Play,
  Square,
  RefreshCw,
  Trash2,
  Plus,
  CheckSquare,
  RotateCw,
  SquareCheck,
  Save,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneToolbarProps {
  selectedCount: number;
  totalCount: number;
  errorCount: number;
  allSelected: boolean;
  isRegenerating: boolean;
  unsavedCount: number;
  isSaving: boolean;
  onSceneAction: (action: string) => void;
  onBulkAction: (action: string) => void;
  className?: string;
}

export function SceneToolbar({
  selectedCount,
  totalCount,
  errorCount,
  allSelected,
  isRegenerating,
  unsavedCount,
  isSaving,
  onSceneAction,
  onBulkAction,
  className,
}: SceneToolbarProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Công cụ cho từng cảnh
          {selectedCount > 0 && (
            <span className="text-primary ml-1">— đã chọn {selectedCount}/{totalCount}</span>
          )}
          {errorCount > 0 && (
            <span className="text-destructive ml-1">— {errorCount} cảnh lỗi</span>
          )}
        </p>
        <button
          onClick={() => onBulkAction(allSelected ? 'deselect-all' : 'select-all')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            allSelected
              ? 'border-primary/40 text-primary bg-primary/10'
              : 'border-border text-foreground hover:bg-card hover:border-primary/40',
          )}
        >
          {allSelected ? <SquareCheck className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSceneAction('run')}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-card hover:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5" />
          Chạy
        </button>
        <button
          onClick={() => onSceneAction('stop')}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-card hover:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Square className="w-3.5 h-3.5" />
          Stop
        </button>
        <button
          onClick={() => onSceneAction('regen-error')}
          disabled={isRegenerating || (selectedCount === 0 && errorCount === 0)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin')} />
          {isRegenerating ? 'Đang tạo lại...' : 'Tạo lại cảnh đã sửa / lỗi'}
        </button>
        <button
          onClick={() => onSceneAction('delete')}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Xóa
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
        <button
          onClick={() => onBulkAction('delete-bulk')}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Xóa toàn bộ bulk
        </button>
        <button
          onClick={() => onBulkAction('add')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm
        </button>
        <button
          onClick={() => onBulkAction('save-videos')}
          disabled={unsavedCount === 0 || isSaving}
          title="Lưu video/audio đã tạo lên cloud — tránh mất khi tải lại trang"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-500/30 text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isSaving ? 'Đang lưu...' : unsavedCount > 0 ? `Lưu video (${unsavedCount})` : 'Lưu video'}
        </button>
        <button
          onClick={() => onBulkAction('refresh')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-card hover:border-primary/40 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    </div>
  );
}
