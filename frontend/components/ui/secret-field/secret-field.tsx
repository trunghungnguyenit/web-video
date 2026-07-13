'use client';

import { Copy, CheckCircle2, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecretFieldProps {
  value: string;
  visible: boolean;
  onToggleVisibility: () => void;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  editTitle?: string;
  /** Không truyền = ẩn nút xóa */
  onDelete?: () => void;
  disabled?: boolean;
  placeholder?: string;
  inputClassName?: string;
}

/** Ô hiển thị key/secret dạng ẩn/hiện kèm copy · sửa · xóa — dùng cho API key, License key... */
export function SecretField({
  value, visible, onToggleVisibility, copied, onCopy, onEdit, editTitle = 'Chỉnh sửa key', onDelete,
  disabled = false, placeholder, inputClassName,
}: SecretFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        readOnly
        placeholder={placeholder}
        className={cn(
          'flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono cursor-default',
          inputClassName,
        )}
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        disabled={disabled}
        title={visible ? 'Ẩn key' : 'Hiện key'}
        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={onCopy}
        title="Copy key"
        disabled={disabled}
        className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {copied
          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
          : <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
      </button>
      <button
        type="button"
        onClick={onEdit}
        title={editTitle}
        className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary"
      >
        <Pencil className="w-4 h-4" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Xóa key"
          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
