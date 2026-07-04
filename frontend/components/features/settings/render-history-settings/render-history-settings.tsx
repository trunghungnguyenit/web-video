'use client';

import { useState } from 'react';
import { Download, Trash2, CheckCircle2, AlertCircle, Film, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RenderItem {
  id: number;
  name: string;
  date: string;
  status: 'completed' | 'failed';
  size: string;
  duration?: string;
}

const INITIAL_ITEMS: RenderItem[] = [
  { id: 1, name: 'Video_Demo_01.mp4',       date: '15/01/2024 · 14:30', status: 'completed', size: '245 MB', duration: '2:34' },
  { id: 2, name: 'Product_Showcase.mp4',    date: '14/01/2024 · 10:15', status: 'completed', size: '198 MB', duration: '1:58' },
  { id: 3, name: 'Tutorial_Part1.mp4',      date: '13/01/2024 · 16:45', status: 'failed',    size: '—' },
  { id: 4, name: 'Marketing_Video.mp4',     date: '12/01/2024 · 09:20', status: 'completed', size: '512 MB', duration: '5:12' },
  { id: 5, name: 'Social_Media_Reel.mp4',   date: '11/01/2024 · 15:00', status: 'completed', size: '87 MB',  duration: '0:45' },
];

const STORAGE_TOTAL_GB = 10;
const STORAGE_USED_GB = 1.2;

export function RenderHistorySettings() {
  const [items, setItems] = useState<RenderItem[]>(INITIAL_ITEMS);
  const [confirmClear, setConfirmClear] = useState(false);

  const deleteItem = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  const clearAll = () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
    setItems([]);
    setConfirmClear(false);
  };

  const storagePercent = Math.min((STORAGE_USED_GB / STORAGE_TOTAL_GB) * 100, 100);

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      {/* Header */}
      <div>
        <h4 className="text-sm font-bold text-foreground">Lịch sử render</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{items.length} video · đã render</p>
      </div>

      {/* Storage bar */}
      <div className="p-3 bg-background/50 border border-border/50 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Dung lượng đã dùng</span>
          <span className="font-semibold text-foreground">{STORAGE_USED_GB} GB / {STORAGE_TOTAL_GB} GB</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              storagePercent > 80 ? 'bg-destructive' : storagePercent > 60 ? 'bg-yellow-400' : 'bg-primary',
            )}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <Film className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Chưa có video nào được render</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/30 hover:bg-background/60 transition-colors duration-150 group"
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {item.status === 'completed'
                  ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                  : <AlertCircle className="w-4 h-4 text-destructive" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-none">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted-foreground">{item.date}</span>
                  {item.duration && (
                    <span className="text-[11px] text-muted-foreground">· {item.duration}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">· {item.size}</span>
                </div>
              </div>

              {/* Status badge */}
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                item.status === 'completed'
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-destructive/15 text-destructive',
              )}>
                {item.status === 'completed' ? 'Hoàn tất' : 'Lỗi'}
              </span>

              {/* Actions — visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
                {item.status === 'completed' && (
                  <button
                    type="button"
                    className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-colors duration-150 cursor-pointer"
                    title="Tải xuống"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors duration-150 cursor-pointer"
                  title="Xóa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground transition-colors duration-150 cursor-pointer"
                  title="Thêm"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {items.length > 0 && (
        <div className="flex justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={clearAll}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer',
              confirmClear
                ? 'bg-destructive/20 border border-destructive/40 text-destructive'
                : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmClear ? 'Xác nhận xóa tất cả?' : 'Xóa tất cả'}
          </button>
        </div>
      )}
    </div>
  );
}
