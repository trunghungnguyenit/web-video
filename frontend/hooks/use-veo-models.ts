'use client';

import { useEffect } from 'react';
import { suggestVeoModelForQuality, type VeoModelOption } from '@/lib/veo/veo-models';

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
