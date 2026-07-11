'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, CheckCircle2, AlertCircle, Film, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import {
  fetchRenderHistory,
  deleteRenderHistoryEntry,
  clearRenderHistory,
  type RenderHistoryEntry,
} from '@/lib/supabase/render-history-remote';
import { toUserMessage } from '@/lib/error-messages';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(seconds: number | null): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

export function RenderHistorySettings() {
  const { user, loading: authLoading } = useAuth();
  const supabaseRef = useRef(createClient());
  const syncedForUserRef = useRef<string | null>(null);

  const [items, setItems] = useState<RenderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    if (syncedForUserRef.current === user.id) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;

    syncedForUserRef.current = user.id;
    setLoading(true);
    setLoadError('');
    fetchRenderHistory(supabase, user.id)
      .then(setItems)
      .catch((err) => setLoadError(toUserMessage(err, 'Không tải được lịch sử render — thử lại.')))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const supabase = supabaseRef.current;
    if (user && supabase) {
      try {
        await deleteRenderHistoryEntry(supabase, id);
      } catch (err) {
        console.error('[render-history] Xóa thất bại:', err);
      }
    }
  };

  const clearAll = async () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
    setConfirmClear(false);
    setItems([]);
    const supabase = supabaseRef.current;
    if (user && supabase) {
      try {
        await clearRenderHistory(supabase, user.id);
      } catch (err) {
        console.error('[render-history] Xóa tất cả thất bại:', err);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="h-24 rounded-lg bg-muted/20 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-card border border-dashed border-border rounded-2xl p-10 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Cần đăng nhập để xem lịch sử render</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Lịch sử render được lưu riêng theo tài khoản Google — đăng nhập ở mục Cài đặt chung để xem video đã xuất.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      {/* Header */}
      <div>
        <h4 className="text-sm font-bold text-foreground">Lịch sử render</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{items.length} video · đã render</p>
      </div>

      {loadError && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {loadError}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <Film className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Chưa có video nào được render</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const duration = formatDuration(item.durationSeconds);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/30 hover:bg-background/60 transition-colors duration-150 group"
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {item.status === 'completed'
                    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                    : <AlertCircle className="w-4 h-4 text-destructive" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-none">{item.fileName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">{formatDate(item.createdAt)}</span>
                    {duration && (
                      <span className="text-[11px] text-muted-foreground">· {duration}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">· {formatSize(item.fileSizeBytes)}</span>
                  </div>
                  {item.status === 'failed' && item.errorMessage && (
                    <p className="text-[11px] text-destructive mt-1">{item.errorMessage}</p>
                  )}
                </div>

                {/* Status badge */}
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                  item.status === 'completed'
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-destructive/15 text-destructive',
                )}>
                  {item.status === 'completed' ? 'Hoàn tất' : 'Lỗi'}
                </span>

                {/* Actions — visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors duration-150 cursor-pointer"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
