// ─── Helpers UI: cn (tailwind merge), formatCount ────────────────────────────

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Gộp class Tailwind — clsx + twMerge (tránh conflict utility) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Locale cố định — tránh hydration mismatch giữa SSR (Node) và browser */
export function formatCount(n: number): string {
  return n.toLocaleString('vi-VN')
}
