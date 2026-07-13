'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { PresetInput } from '@/lib/preset-scripts';
import {
  ASPECT_RATIO_OPTIONS,
  LANGUAGE_OPTIONS,
  SCENE_COUNT_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  VIDEO_TYPE_OPTIONS,
  getSceneDurationOptions,
  normalizeSceneDurationSetting,
} from '@/lib/saved-scripts';
import { useDefaultVeoModel } from '@/hooks/use-veo-models';
import { useVeoModels } from '@/contexts/veo-models-context';

export interface VideoSettings {
  language: string;
  sceneCount: string;
  videoType: string;
  voice: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality: string;
  veoModel: string;
  voiceSpeed: number;
  sceneStyle: string;
}

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  language: 'vi',
  sceneCount: '5',
  videoType: 'storytelling',
  voice: 'male-natural',
  aspectRatio: '16:9',
  sceneDuration: '6',
  videoQuality: '720p',
  veoModel: '',
  voiceSpeed: 1,
  sceneStyle: 'cinematic',
};

interface ProjectSettingsContextValue {
  settings: VideoSettings;
  patchSettings: (patch: Partial<VideoSettings>) => void;
  applyFromPreset: (input: PresetInput) => void;
  veoModels: ReturnType<typeof useVeoModels>['models'];
  veoModelsLoading: boolean;
  veoModelsError: string | null;
  hasVeoKey: boolean;
  sceneDurationOptions: [string, string][];
}

const ProjectSettingsContext = createContext<ProjectSettingsContextValue | null>(null);

interface ProjectSettingsProviderProps {
  children: ReactNode;
  projectKey?: string;
  initialSettings?: VideoSettings;
  onSettingsChange?: (settings: VideoSettings) => void;
}

export function ProjectSettingsProvider({
  children,
  projectKey,
  initialSettings,
  onSettingsChange,
}: ProjectSettingsProviderProps) {
  const [settings, setSettings] = useState<VideoSettings>(
    initialSettings ?? DEFAULT_VIDEO_SETTINGS,
  );
  const { models: veoModels, loading: veoModelsLoading, error: veoModelsError, hasKey: hasVeoKey } = useVeoModels();
  const onSettingsChangeRef = useRef(onSettingsChange);
  onSettingsChangeRef.current = onSettingsChange;
  /** Bỏ qua 1 lần sync sau khi load settings từ bulk parent (đổi project / initialSettings) */
  const skipSyncRef = useRef(true);

  useEffect(() => {
    skipSyncRef.current = true;
    setSettings(initialSettings ?? DEFAULT_VIDEO_SETTINGS);
    // Chỉ load lại khi đổi bulk — không khi parent echo settings vừa sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    onSettingsChangeRef.current?.(settings);
  }, [settings]);

  const patchSettings = useCallback((patch: Partial<VideoSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const pickVeoModel = useCallback((modelId: string) => {
    patchSettings({ veoModel: modelId });
  }, [patchSettings]);

  useDefaultVeoModel(veoModels, settings.videoQuality, settings.veoModel, pickVeoModel);

  useEffect(() => {
    setSettings((prev) => {
      const next = normalizeSceneDurationSetting(prev.sceneDuration, prev.videoQuality);
      return next === prev.sceneDuration ? prev : { ...prev, sceneDuration: next };
    });
  }, [settings.videoQuality]);

  const applyFromPreset = useCallback((input: PresetInput) => {
    setSettings((prev) => ({
      ...prev,
      language: input.language,
      sceneCount: input.sceneCount,
      videoType: input.videoType,
      voice: input.voice,
      aspectRatio: input.aspectRatio ?? '16:9',
      sceneDuration: normalizeSceneDurationSetting(
        input.sceneDuration ?? '6',
        input.videoQuality ?? '720p',
      ),
      videoQuality: input.videoQuality ?? '720p',
      veoModel: input.veoModel ?? '',
      voiceSpeed: input.voiceSpeed ?? prev.voiceSpeed,
      sceneStyle: input.sceneStyleId ?? prev.sceneStyle,
    }));
  }, []);

  const sceneDurationOptions = useMemo(
    () => getSceneDurationOptions(settings.videoQuality),
    [settings.videoQuality],
  );

  const value = useMemo(
    () => ({
      settings,
      patchSettings,
      applyFromPreset,
      veoModels,
      veoModelsLoading,
      veoModelsError,
      hasVeoKey,
      sceneDurationOptions,
    }),
    [
      settings,
      patchSettings,
      applyFromPreset,
      veoModels,
      veoModelsLoading,
      veoModelsError,
      hasVeoKey,
      sceneDurationOptions,
    ],
  );

  return (
    <ProjectSettingsContext.Provider value={value}>
      {children}
    </ProjectSettingsContext.Provider>
  );
}

export function useProjectSettings(): ProjectSettingsContextValue {
  const ctx = useContext(ProjectSettingsContext);
  if (!ctx) {
    throw new Error('useProjectSettings must be used within ProjectSettingsProvider');
  }
  return ctx;
}

export {
  ASPECT_RATIO_OPTIONS,
  LANGUAGE_OPTIONS,
  SCENE_COUNT_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  VIDEO_TYPE_OPTIONS,
};
