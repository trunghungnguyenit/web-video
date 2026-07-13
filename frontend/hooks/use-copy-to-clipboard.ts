import { useCallback, useRef, useState } from 'react';

/** Copy giá trị vào clipboard, tự reset trạng thái "copied" sau `resetDelayMs`. */
export function useCopyToClipboard(resetDelayMs = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//clipboard là gì
  const copy = useCallback((id: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopiedId(null), resetDelayMs);
  }, [resetDelayMs]);

  return { copiedId, copy };
}
