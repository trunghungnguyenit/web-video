// ─── Cache + dedup request danh sách model Veo — tránh gọi API lặp ───────────

import type { VeoModelOption } from '@/lib/veo/veo-models';
import { veoService } from '@/services/veo/veo.service';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  apiKey: string;
  models: VeoModelOption[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<VeoModelOption[]> | null = null;
let inflightKey = '';

/** Xóa cache khi đổi API key */
export function invalidateVeoModelsCache(): void {
  cache = null;
  inflight = null;
  inflightKey = '';
}

/**
 * Lấy danh sách model Veo — dùng cache TTL, gộp request đồng thời (in-flight).
 * Nhiều component gọi cùng lúc chỉ tạo 1 request tới Google.
 */
export async function fetchVeoModelsCached(apiKey: string): Promise<VeoModelOption[]> {
  const key = apiKey.trim();
  if (!key) {
    invalidateVeoModelsCache();
    return [];
  }

  if (
    cache
    && cache.apiKey === key
    && Date.now() - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return cache.models;
  }

  if (inflight && inflightKey === key) {
    return inflight;
  }

  inflightKey = key;
  inflight = veoService.listModels(key)
    .then((models) => {
      cache = { apiKey: key, models, fetchedAt: Date.now() };
      return models;
    })
    .finally(() => {
      inflight = null;
      inflightKey = '';
    });

  return inflight;
}
