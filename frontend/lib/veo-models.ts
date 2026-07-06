export interface VeoModelOption {
  id: string;
  displayName: string;
  description?: string;
}

/** Danh sách dự phòng khi không gọi được API */
export const VEO_MODEL_FALLBACKS: VeoModelOption[] = [
  { id: 'veo-3.0-generate-001', displayName: 'Veo 3.0' },
  { id: 'veo-3.0-fast-generate-001', displayName: 'Veo 3.0 Fast' },
];

export function suggestVeoModelForQuality(
  quality: string,
  models: VeoModelOption[],
): string {
  if (models.length === 0) return '';

  if (quality === '720p-fast') {
    const fast = models.find((m) => m.id.includes('fast'));
    if (fast) return fast.id;
  }

  const standard = models.find(
    (m) => m.id.includes('generate') && !m.id.includes('fast'),
  );
  return standard?.id ?? models[0].id;
}

export function getVeoApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('web-video-api-keys');
    if (!raw) return '';
    const all = JSON.parse(raw) as Record<string, string>;
    return (all.veo ?? all.gemini ?? '').trim();
  } catch {
    return '';
  }
}
