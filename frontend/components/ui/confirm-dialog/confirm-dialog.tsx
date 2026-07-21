'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModalOverlay } from '@/components/ui/modal-overlay';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' — hành động không thể hoàn tác (xoá...), dùng nút đỏ destructive. Mặc định 'danger'. */
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog xác nhận trong theme app — thay cho window.confirm() gốc trình duyệt */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Xoá', cancelLabel = 'Huỷ',
  variant = 'danger', onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <ModalOverlay
      onClose={onCancel}
      backdropClassName="bg-black/60 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
    >
      <div
        className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5"
        role="alertdialog"
        aria-modal
        aria-label={title}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
              variant === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
            )}
          >
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={cn(
              'px-4 py-2 text-sm font-bold rounded-xl transition-colors',
              variant === 'danger'
                ? 'bg-destructive hover:bg-destructive/90 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
