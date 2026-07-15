'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectVeoOption {
  id: string;
  displayName: string;
}

export interface SelectVeoProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectVeoOption[];
  loading?: boolean;
  disabled?: boolean;
  /** Hiện label "Model Veo" — tắt khi đã bọc Field bên ngoài */
  showLabel?: boolean;
  id?: string;
  className?: string;
  selectClassName?: string;
}

export function SelectVeo({
  value,
  onChange,
  options,
  loading = false,
  disabled = false,
  showLabel = true,
  id,
  className,
  selectClassName,
}: SelectVeoProps) {
  const isDisabled = disabled || loading || options.length === 0;

  return (
    <div className={className}>
      {showLabel && (
        <label htmlFor={id} className="field-label block mb-1.5">
          Model Veo
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          className={selectClassName ?? cn('input-base w-full min-w-0 disabled:opacity-60')}
        >
          {loading && <option value="">Đang tải model...</option>}
          {!loading && options.length === 0 && (
            <option value="">Chưa có model</option>
          )}
          {!loading &&
            options.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
        </select>
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin pointer-events-none" />
        )}
      </div>
    </div>
  );
}
