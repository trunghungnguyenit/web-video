'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Pencil, Eye, Loader2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoLibrary } from '@/contexts/video-library-context';
import { VideoItemModal } from '@/components/features/video-library/video-item-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  videoItemProgressPercent,
  filterVideoItems,
  formatVideoItemCardDate,
  type VideoLibrarySortOrder,
  type VideoLibraryStatus,
  type VideoLibraryStatusFilter,
  type VideoLibraryItem,
} from '@/lib/video-library/video-library';

const STATUS_LABELS: Record<VideoLibraryStatus, string> = {
  draft: 'Nháp',
  analyzing: 'Đang phân tích...',
  generating: 'Đang tạo video...',
  completed: 'Hoàn thành',
  error: 'Lỗi',
};

/** Badge nhà cung cấp — tách riêng khỏi veoModelLabel để nhìn rõ khi chạy nhiều luồng song song */
function ProviderBadge({ provider }: { provider: 'veo' | 'kie' }) {
  if (provider === 'kie') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
        Grok Imagine
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
      Veo 3
    </span>
  );
}

const STATUS_FILTER_OPTIONS: { value: VideoLibraryStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'running', label: 'Đang chạy' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'draft', label: 'Nháp / Lỗi' },
];

const SORT_OPTIONS: { value: VideoLibrarySortOrder; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
];

function VideoLibraryCard({
  item,
  onOpenDetail,
  onEdit,
  onDelete,
  onDismissRegenerateError,
}: {
  item: VideoLibraryItem;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDismissRegenerateError: () => void;
}) {
  const running = item.status === 'generating' || item.status === 'analyzing';
  const hasError = item.status === 'error';
  const percent = videoItemProgressPercent(item);
  const progressLabel = item.scenesTotal > 0
    ? `${item.scenesDone}/${item.scenesTotal}`
    : running ? '0/…' : '—';

  return (
    <div
      className="flex flex-col rounded-xl border border-border/80 bg-card/50 p-4 transition-all hover:border-orange-500/40 hover:bg-card cursor-pointer"
      onClick={onOpenDetail}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
          {item.title}
        </p>
        {item.isRegenerating && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-sky-400 shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang tạo lại…
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <ProviderBadge provider={item.settings.videoProvider ?? 'veo'} />
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 truncate max-w-full">
          {item.veoModelLabel}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
          {item.aspectRatio}
        </span>
      </div>

      <p
        className={cn(
          'text-[11px] font-semibold mb-1.5',
          hasError ? 'text-destructive' : item.status === 'completed' ? 'text-green-400' : 'text-orange-400',
        )}
      >
        {STATUS_LABELS[item.status]}
      </p>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              hasError ? 'bg-destructive' : item.status === 'completed' ? 'bg-green-500' : 'bg-orange-500',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span
          className={cn(
            'text-[11px] font-semibold tabular-nums shrink-0',
            hasError ? 'text-destructive' : 'text-orange-400',
          )}
        >
          {progressLabel}
        </span>
        {running && (
          <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" />
        )}
      </div>

      {hasError && item.errorMessage && (
        <p
          title={item.errorMessage}
          className="flex items-start gap-1 text-[11px] text-destructive leading-snug mb-2 line-clamp-2"
        >
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{item.errorMessage}</span>
        </p>
      )}

      {item.regenerateError && !item.isRegenerating && (
        <p className="flex items-start gap-1 text-[11px] text-destructive leading-snug mb-2">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="flex-1">Tạo lại thất bại: {item.regenerateError}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismissRegenerateError(); }}
            aria-label="Đóng thông báo lỗi"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </p>
      )}

      <p className="text-[10px] text-muted-foreground mb-3">
        {formatVideoItemCardDate(item.createdAt)}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Xem chi tiết
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Sửa video"
          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Xoá video"
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface VideoLibraryViewProps {
  /** Chuyển sang trang chi tiết sau khi đã chọn video (selectItem) */
  onOpenDetail: () => void;
}

/** Trang Kho video — full-width, thay cho panel/drawer cũ */
export function VideoLibraryView({ onOpenDetail }: VideoLibraryViewProps) {
  const {
    items,
    createItem,
    selectItem,
    deleteItem,
    deleteAllItems,
    updateItem,
  } = useVideoLibrary();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VideoLibraryStatusFilter>('all');
  const [sort, setSort] = useState<VideoLibrarySortOrder>('newest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VideoLibraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<VideoLibraryItem | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const filtered = useMemo(
    () => filterVideoItems(items, search, statusFilter, sort),
    [items, search, statusFilter, sort],
  );

  const handleDeleteAll = () => {
    if (items.length === 0) return;
    setConfirmDeleteAll(true);
  };

  const handleDelete = (item: VideoLibraryItem) => {
    setDeletingItem(item);
  };

  const handleOpenDetail = (id: string) => {
    selectItem(id);
    onOpenDetail();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Quản lý tất cả video bạn đã tạo — thêm, sửa, xoá hoặc xem chi tiết từng video.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa toàn bộ ({items.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo video mới
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-muted/40 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VideoLibraryStatusFilter)}
          className="px-2 py-2 text-[11px] bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as VideoLibrarySortOrder)}
          className="px-2 py-2 text-[11px] bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? 'Chưa có video nào' : 'Không tìm thấy video phù hợp'}
          </p>
          {items.length === 0 && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo video đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <VideoLibraryCard
              key={item.id}
              item={item}
              onOpenDetail={() => handleOpenDetail(item.id)}
              onEdit={() => setEditingItem(item)}
              onDelete={() => handleDelete(item)}
              onDismissRegenerateError={() => updateItem(item.id, { regenerateError: undefined })}
            />
          ))}
        </div>
      )}

      <VideoItemModal
        mode="create"
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(options) => {
          createItem(options);
          setShowCreateModal(false);
          // Đã chọn Nguồn nội dung — vào thẳng Mục 2 để hiện đúng giao diện, khỏi bấm "Xem chi tiết" lại
          onOpenDetail();
        }}
      />

      <VideoItemModal
        mode="edit"
        open={editingItem !== null}
        initialItem={editingItem}
        onClose={() => setEditingItem(null)}
      />

      <ConfirmDialog
        open={deletingItem !== null}
        title="Xoá video này?"
        message={deletingItem ? <>Video &quot;{deletingItem.title}&quot; sẽ bị xoá vĩnh viễn, không thể khôi phục.</> : ''}
        confirmLabel="Xoá video"
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => {
          if (deletingItem) deleteItem(deletingItem.id);
          setDeletingItem(null);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        title={`Xoá toàn bộ ${items.length} video?`}
        message="Tất cả video và dữ liệu liên quan sẽ bị xoá vĩnh viễn, không thể khôi phục."
        confirmLabel="Xoá tất cả"
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={() => {
          deleteAllItems();
          setConfirmDeleteAll(false);
        }}
      />
    </div>
  );
}
