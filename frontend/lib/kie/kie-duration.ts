// ─── Thời lượng cảnh Grok Imagine (kie.ai): 6–30 giây, KHÔNG snap theo lưới 4/6/8 của Veo ───

/** Clamp về [6, 30] giây — mirror backend/src/lib/kie-config.ts resolveKieDurationSeconds */
export function resolveKieSceneDuration(seconds?: number): number {
  const s = Math.round(seconds ?? 6);
  if (!Number.isFinite(s)) return 6;
  return Math.min(30, Math.max(6, s));
}
