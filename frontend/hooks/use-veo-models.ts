'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_KEYS_CHANGED_EVENT } from '@/lib/api-keys-store';
import {
  getVeoApiKey,
  suggestVeoModelForQuality,
  type VeoModelOption,
} from '@/lib/veo-models';
import { veoService } from '@/services/veo.service';

export function useVeoModels() {
  const [models, setModels] = useState<VeoModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  const fetchModels = useCallback(async () => {
    const apiKey = getVeoApiKey();
    if (!apiKey) {
      setHasKey(false);
      setModels([]);
      setError(null);
      setLoading(false);
      return;
    }

    setHasKey(true);
    setLoading(true);
    setError(null);

    try {
      const list = await veoService.listModels(apiKey);
      setModels(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không tải được model Veo.';
      setError(message);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchModels();
    window.addEventListener(API_KEYS_CHANGED_EVENT, fetchModels);
    return () => window.removeEventListener(API_KEYS_CHANGED_EVENT, fetchModels);
  }, [fetchModels]);

  return { models, loading, error, hasKey, refetch: fetchModels };
}

export function useDefaultVeoModel(
  models: VeoModelOption[],
  videoQuality: string,
  current: string,
  onPick: (modelId: string) => void,
) {
  useEffect(() => {
    if (models.length === 0) return;
    if (current && models.some((m) => m.id === current)) return;
    onPick(suggestVeoModelForQuality(videoQuality, models));
  }, [models, videoQuality, current, onPick]);
}
