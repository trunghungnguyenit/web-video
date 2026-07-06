'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBulkProjects } from '@/contexts/bulk-projects-context';
import { CreateBulkModal } from '@/components/features/bulk-list/create-bulk-modal';
import {
  bulkProgressPercent,
  filterBulkProjects,
  formatBulkCardDate,
  type BulkSortOrder,
  type BulkStatusFilter,
  type VideoBulkProject,
} from '@/lib/bulk-project';

const STATUS_FILTER_OPTIONS: { value: BulkStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'running', label: 'Đang chạy' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'draft', label: 'Nháp / Lỗi' },
];

const SORT_OPTIONS: { value: BulkSortOrder; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
];

function BulkCard({
  project,
  active,
  onSelect,
}: {
  project: VideoBulkProject;
  active: boolean;
  onSelect: () => void;
}) {
  const running = project.status === 'generating' || project.status === 'analyzing';
  const percent = bulkProgressPercent(project);
  const progressLabel = project.scenesTotal > 0
    ? `${project.scenesDone}/${project.scenesTotal}`
    : running ? '0/…' : '—';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-all',
        active
          ? 'border-orange-500/70 bg-orange-500/5 ring-1 ring-orange-500/30'
          : 'border-border/80 bg-card/50 hover:border-orange-500/40 hover:bg-card',
      )}
    >
      <p className="text-sm font-semibold text-foreground truncate mb-2">
        {project.title}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 truncate max-w-full">
          {project.veoModelLabel}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
          {project.aspectRatio}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              project.status === 'completed' ? 'bg-green-500' : 'bg-orange-500',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold text-orange-400 tabular-nums shrink-0">
          {progressLabel}
        </span>
        {running && (
          <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" />
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {formatBulkCardDate(project.createdAt)}
      </p>
    </button>
  );
}

interface BulkListContentProps {
  className?: string;
  /** Gọi sau khi chọn bulk — đóng drawer mobile */
  onAfterSelect?: () => void;
}

/** Nội dung Bulk List — dùng chung desktop panel + mobile drawer */
export function BulkListContent({ className, onAfterSelect }: BulkListContentProps) {
  const {
    projects,
    activeProjectId,
    createProject,
    selectProject,
    deleteAllProjects,
  } = useBulkProjects();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BulkStatusFilter>('all');
  const [sort, setSort] = useState<BulkSortOrder>('newest');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = useMemo(
    () => filterBulkProjects(projects, search, statusFilter, sort),
    [projects, search, statusFilter, sort],
  );

  const handleDeleteAll = () => {
    if (projects.length === 0) return;
    if (window.confirm(`Xóa toàn bộ ${projects.length} bulk?`)) {
      deleteAllProjects();
    }
  };

  const handleSelect = (id: string) => {
    selectProject(id);
    onAfterSelect?.();
  };

  return (
    <>
      <div className={cn('flex flex-col h-full overflow-hidden', className)}>
        <div className="p-4 space-y-3 border-b border-border shrink-0">
          <h2 className="text-sm font-bold text-foreground">Bulk List</h2>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Bulk
          </button>

          {projects.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa toàn bộ ({projects.length} Bulk)
            </button>
          )}
        </div>

        <div className="p-4 space-y-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-muted/40 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BulkStatusFilter)}
              className="w-full px-2 py-1.5 text-[11px] bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as BulkSortOrder)}
              className="w-full px-2 py-1.5 text-[11px] bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Không có bulk nào
            </p>
          ) : (
            filtered.map((project) => (
              <BulkCard
                key={project.id}
                project={project}
                active={project.id === activeProjectId}
                onSelect={() => handleSelect(project.id)}
              />
            ))
          )}
        </div>
      </div>

      <CreateBulkModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(options) => {
          createProject(options);
          setShowCreateModal(false);
          onAfterSelect?.();
        }}
      />
    </>
  );
}

/** Desktop — cột trái, chỉ màn xl+ */
export function BulkListPanel() {
  return (
    <aside className="hidden xl:flex flex-col w-[280px] shrink-0 border-r border-border bg-background/95 h-full overflow-hidden">
      <BulkListContent />
    </aside>
  );
}

interface BulkListDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Mobile / tablet — drawer từ menu sidebar */
export function BulkListDrawer({ open, onClose }: BulkListDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <button
        type="button"
        aria-label="Đóng Bulk List"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-[min(300px,88vw)] bg-background border-r border-border shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-end px-3 py-2 border-b border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <BulkListContent className="flex-1 min-h-0" onAfterSelect={onClose} />
      </aside>
    </div>
  );
}
