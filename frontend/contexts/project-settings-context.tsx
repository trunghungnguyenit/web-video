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
import type { PresetInput } from '@/lib/preset/preset-scripts';
import {
  ASPECT_RATIO_OPTIONS,
  LANGUAGE_OPTIONS,
  SCENE_COUNT_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  getSceneDurationOptions,
  normalizeSceneDurationSetting,
} from '@/lib/saved-scripts/saved-scripts';
import { useDefaultVeoModel } from '@/hooks/use-veo-models';
import { useVeoModels } from '@/contexts/veo-models-context';
import { supportsVideoExtension } from '@/lib/veo/veo-models';

export interface VideoSettings {
  language: string;
  sceneCount: string;
  voice: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality: string;
  veoModel: string;
  voiceSpeed: number;
  sceneStyle: string;
  /** Nhà cung cấp sinh video — 'veo' (Google Veo 3) hoặc 'kie' (Grok Imagine) */
  videoProvider: 'veo' | 'kie';
  /** Chế độ nội dung Grok Imagine — chỉ áp dụng khi videoProvider = 'kie' */
  kieMode: 'fun' | 'normal' | 'spicy';
  /**
   * Scene Continuity (Video Extension) — chỉ Veo 3.1/3.1 Fast hỗ trợ. Khi bật, mỗi cảnh
   * (trừ cảnh 1) nối tiếp từ video THẬT của cảnh liền trước (không chỉ ảnh tham chiếu),
   * giữ chuyển động/camera/ánh sáng liên tục hơn. Mặc định TẮT — không phải project nào
   * cũng cần cảnh liên tục, và tính năng khoá cứng 8s/720p khi bật.
   */
  sceneContinuity: boolean;
}

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  language: 'vi',
  sceneCount: '5',
  voice: 'male-natural',
  aspectRatio: '16:9',
  sceneDuration: '6',
  videoQuality: '720p',
  veoModel: '',
  voiceSpeed: 1,
  sceneStyle: 'cinematic',
  videoProvider: 'veo',
  kieMode: 'normal',
  sceneContinuity: false,
};

export const VIDEO_PROVIDER_OPTIONS: [string, string][] = [
  ['veo', 'Veo 3 (Google)'],
  ['kie', 'Grok Imagine (kie.ai)'],
];

export const KIE_MODE_OPTIONS: [string, string][] = [
  ['normal', 'Normal'],
  ['fun', 'Fun'],
  ['spicy', 'Spicy ⚠️'],
];

/** Grok Imagine (kie.ai) chỉ hỗ trợ 480p/720p — không có 1080p */
export const KIE_VIDEO_QUALITY_OPTIONS: [string, string][] = [
  ['480p', '480p – Mặc định'],
  ['720p', '720p – Cao hơn'],
];

/**
 * Clamp videoQuality theo provider — Grok Imagine (kie.ai) chỉ hỗ trợ 480p/720p:
 * sang 'kie' mà quality không hợp lệ → mặc định 480p; quay lại 'veo' mà đang 480p
 * (không hợp lệ với Veo) → về 720p. Dùng chung cho toolbar chính và modal tạo/sửa video.
 */
export function resolveVideoQualityForProvider(quality: string, provider: 'veo' | 'kie'): string {
  if (provider === 'kie') {
    return quality === '480p' || quality === '720p' ? quality : '480p';
  }
  return quality === '480p' ? '720p' : quality;
}

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

  // Grok Imagine (kie.ai) chỉ hỗ trợ 480p/720p — đổi provider thì clamp lại videoQuality
  useEffect(() => {
    setSettings((prev) => {
      const next = resolveVideoQualityForProvider(prev.videoQuality, prev.videoProvider);
      return next === prev.videoQuality ? prev : { ...prev, videoQuality: next };
    });
  }, [settings.videoProvider]);

  // Scene Continuity chỉ Veo 3.1/3.1 Fast hỗ trợ — đổi sang provider/model khác thì tự tắt
  useEffect(() => {
    setSettings((prev) => {
      if (!prev.sceneContinuity) return prev;
      const supported = prev.videoProvider === 'veo' && supportsVideoExtension(prev.veoModel);
      return supported ? prev : { ...prev, sceneContinuity: false };
    });
  }, [settings.videoProvider, settings.veoModel]);

  // Google bắt buộc durationSeconds=8 + resolution=720p khi dùng Video Extension — ép
  // ngay trên UI (không chỉ lúc gọi API) để không gây hiểu lầm chọn 4s/6s/1080p mà vô hiệu.
  useEffect(() => {
    setSettings((prev) => {
      if (!prev.sceneContinuity) return prev;
      if (prev.sceneDuration === '8' && prev.videoQuality === '720p') return prev;
      return { ...prev, sceneDuration: '8', videoQuality: '720p' };
    });
  }, [settings.sceneContinuity]);

  const applyFromPreset = useCallback((input: PresetInput) => {
    setSettings((prev) => ({
      ...prev,
      language: input.language,
      sceneCount: input.sceneCount,
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
      // Preset không mang provider/kieMode — giữ nguyên lựa chọn hiện tại của user
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
};
