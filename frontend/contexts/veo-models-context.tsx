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
import { API_KEY_IDS, API_KEYS_CHANGED_EVENT, getApiKey } from '@/lib/api-keys/api-keys-store';
import { getVeoApiKey, type VeoModelOption } from '@/lib/veo/veo-models';
import { fetchVeoModelsCached, invalidateVeoModelsCache } from '@/lib/veo/veo-models-cache';
import { toUserMessage } from '@/lib/error-messages';

interface VeoModelsContextValue {
  models: VeoModelOption[];
  loading: boolean;
  error: string | null;
  /** Đã có Video API Key của kie.ai (nhà cung cấp 'veo') */
  hasKey: boolean;
  /** Đã có "Gemini Key Veo 3.1" — key riêng của nhà cung cấp 'veo-gemini' */
  hasVeoGeminiKey: boolean;
  refetch: () => Promise<void>;
}

const VeoModelsContext = createContext<VeoModelsContextValue | null>(null);

/** Provider duy nhất — toàn app chỉ 1 luồng fetch model Veo */
export function VeoModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<VeoModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [hasVeoGeminiKey, setHasVeoGeminiKey] = useState(false);

  const fetchModels = useCallback(async (force = false) => {
    // "Gemini Key Veo 3.1" không cần fetch model (danh sách Veo Gemini cố định ở frontend)
    // — chỉ theo dõi có/không để UI biết hiện ô chọn model cho nhà cung cấp 'veo-gemini'.
    setHasVeoGeminiKey(Boolean(getApiKey(API_KEY_IDS.veoGemini).trim()));

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
      const message = toUserMessage(err, 'Không tải được model Veo.');
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
      hasVeoGeminiKey,
      refetch: () => fetchModels(true),
    }),
    [models, loading, error, hasKey, hasVeoGeminiKey, fetchModels],
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
