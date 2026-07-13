import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldErrorProps extends Omit<React.HTMLAttributes<HTMLParagraphElement>, 'children'> {
  children: React.ReactNode;
}

/** Dòng thông báo lỗi màu destructive kèm icon — dùng cho lỗi field, banner load-failed... */
export function FieldError({ children, className, ...rest }: FieldErrorProps) {
  return (
    <p {...rest} className={cn('flex items-start gap-1.5 text-xs text-destructive leading-relaxed', className)}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}
