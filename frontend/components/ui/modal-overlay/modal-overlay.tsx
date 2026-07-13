'use client';

import { cn } from '@/lib/utils';

interface ModalOverlayProps {
  onClose: () => void;
  children: React.ReactNode;
  /** Mặc định `bg-black/70 backdrop-blur-sm` — truyền khi cần opacity khác (VD: confirm dialog dùng /60) */
  backdropClassName?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/** Lớp phủ full-screen + backdrop click-để-đóng dùng chung cho các modal */
export function ModalOverlay({ onClose, children, backdropClassName = 'bg-black/70 backdrop-blur-sm', onKeyDown }: ModalOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={onKeyDown}>
      <div className={cn('absolute inset-0', backdropClassName)} onClick={onClose} aria-hidden />
      {children}
    </div>
  );
}
