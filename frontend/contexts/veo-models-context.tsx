'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { API_KEYS_CHANGED_EVENT } from '@/lib/api-keys-store';
import { getVeoApiKey, type VeoModelOption } from '@/lib/veo-models';
import { fetchVeoModelsCached, invalidateVeoModelsCache } from '@/lib/veo-models-cache';

interface VeoModelsContextValue {
  models: VeoModelOption[];
  loading: boolean;
  error: string | null;
  hasKey: boolean;
  refetch: () => Promise<void>;
}

const VeoModelsContext = createContext<VeoModelsContextValue | null>(null);

/** Provider duy nhất — toàn app chỉ 1 luồng fetch model Veo */
export function VeoModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<VeoModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  const fetchModels = useCallback(async (force = false) => {
    const apiKey = getVeoApiKey();
    if (!apiKey) {
      invalidateVeoModelsCache();
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
      if (force) invalidateVeoModelsCache();
      const list = await fetchVeoModelsCached(apiKey);
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

    const onKeysChanged = () => {
      invalidateVeoModelsCache();
      void fetchModels(true);
    };

    window.addEventListener(API_KEYS_CHANGED_EVENT, onKeysChanged);
    return () => window.removeEventListener(API_KEYS_CHANGED_EVENT, onKeysChanged);
  }, [fetchModels]);

  const value = useMemo(
    () => ({
      models,
      loading,
      error,
      hasKey,
      refetch: () => fetchModels(true),
    }),
    [models, loading, error, hasKey, fetchModels],
  );

  return (
    <VeoModelsContext.Provider value={value}>
      {children}
    </VeoModelsContext.Provider>
  );
}

export function useVeoModels(): VeoModelsContextValue {
  const ctx = useContext(VeoModelsContext);
  if (!ctx) {
    throw new Error('useVeoModels must be used within VeoModelsProvider');
  }
  return ctx;
}
