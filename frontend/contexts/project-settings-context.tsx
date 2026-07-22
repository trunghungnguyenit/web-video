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
import { supportsVideoExtension, VEO_GEMINI_MODEL_OPTIONS } from '@/lib/veo/veo-models';

/**
 * Nhà cung cấp sinh video:
 * - 'veo'        Veo 3.1 qua kie.ai (dùng Video API Key của kie.ai)
 * - 'veo-gemini' Veo 3.1 gọi THẲNG Google Gemini API (dùng key riêng "Gemini Key Veo 3.1")
 *
 * Nhà cung cấp 'kie' (Grok Imagine) đã bị GỠ khỏi dự án — xem normalizeVideoProvider()
 * để biết cách xử lý video cũ còn lưu giá trị này.
 */
export type VideoProvider = 'veo' | 'veo-gemini';

/**
 * 2 nhà cung cấp cùng chạy trên Veo 3.1 — dùng chung ô chọn model, toggle "Tiếp nối cảnh
 * trước", danh sách chất lượng và toàn bộ luồng tạo cảnh (chỉ khác endpoint + API key ở
 * backend). Mọi chỗ trước đây kiểm tra `=== 'veo'` cho phần UI/logic Veo đều dùng hàm này.
 */
export function isVeoFamilyProvider(provider: VideoProvider | undefined): boolean {
  return provider === 'veo' || provider === 'veo-gemini';
}

/**
 * Video đã lưu TRƯỚC khi gỡ Grok Imagine có thể còn `videoProvider: 'kie'` (và quality
 * '480p' vốn chỉ Grok hỗ trợ) trong settings JSON — chuẩn hoá về 'veo' lúc đọc để không
 * rơi vào nhánh nhà cung cấp không còn tồn tại. Áp dụng ở mọi nơi nạp settings đã lưu.
 */
export function normalizeVideoProvider(provider: string | undefined): VideoProvider {
  return provider === 'veo-gemini' ? 'veo-gemini' : 'veo';
}

/** Chuẩn hoá toàn bộ settings đã lưu — hiện chỉ cần vá nhà cung cấp + chất lượng của Grok cũ */
export function normalizeVideoSettings(settings: VideoSettings): VideoSettings {
  const videoProvider = normalizeVideoProvider(settings.videoProvider);
  const videoQuality = settings.videoQuality === '480p' ? '720p' : settings.videoQuality;
  return videoProvider === settings.videoProvider && videoQuality === settings.videoQuality
    ? settings
    : { ...settings, videoProvider, videoQuality };
}

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
  /** Nhà cung cấp sinh video — xem VideoProvider */
  videoProvider: VideoProvider;
  /**
   * Scene Continuity — chỉ Veo 3.1 hỗ trợ. Khi bật, mỗi cảnh (trừ cảnh 1) nối tiếp bằng
   * KHUNG HÌNH CUỐI của cảnh liền trước làm khung đầu (/veo/generate FIRST_AND_LAST_FRAMES),
   * neo lại nhân vật/bối cảnh bằng pixel thật. Mặc định TẮT — không phải project nào cũng
   * cần cảnh liên tục. Không còn khoá cứng 8s/720p (generate tôn trọng duration 4/6/8).
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
  sceneContinuity: false,
};

export const VIDEO_PROVIDER_OPTIONS: [string, string][] = [
  ['veo', 'Veo 3.1'],
  ['veo-gemini', 'Veo3.1 Gemini'],
];

interface ProjectSettingsContextValue {
  settings: VideoSettings;
  patchSettings: (patch: Partial<VideoSettings>) => void;
  applyFromPreset: (input: PresetInput) => void;
  /** Danh sách model theo ĐÚNG nhà cung cấp đang chọn (kie.ai fetch từ API / Gemini cố định) */
  veoModels: ReturnType<typeof useVeoModels>['models'];
  veoModelsLoading: boolean;
  veoModelsError: string | null;
  /** Đã có API key phù hợp với nhà cung cấp đang chọn (kie.ai hoặc Gemini) */
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
    () => normalizeVideoSettings(initialSettings ?? DEFAULT_VIDEO_SETTINGS),
  );
  const {
    models: kieVeoModels,
    loading: kieVeoModelsLoading,
    error: kieVeoModelsError,
    hasKey: hasKieVeoKey,
    hasVeoGeminiKey,
  } = useVeoModels();

  // Nhà cung cấp 'veo-gemini' gọi thẳng Google: model là danh sách cố định (không fetch),
  // và "đã có key" nghĩa là có "Gemini Key Veo 3.1" riêng chứ không phải key kie.ai.
  const isGeminiVeo = settings.videoProvider === 'veo-gemini';
  const veoModels = isGeminiVeo ? VEO_GEMINI_MODEL_OPTIONS : kieVeoModels;
  const veoModelsLoading = isGeminiVeo ? false : kieVeoModelsLoading;
  const veoModelsError = isGeminiVeo ? null : kieVeoModelsError;
  const hasVeoKey = isGeminiVeo ? hasVeoGeminiKey : hasKieVeoKey;
  const onSettingsChangeRef = useRef(onSettingsChange);
  onSettingsChangeRef.current = onSettingsChange;
  /** Bỏ qua 1 lần sync sau khi load settings từ bulk parent (đổi project / initialSettings) */
  const skipSyncRef = useRef(true);

  useEffect(() => {
    skipSyncRef.current = true;
    setSettings(normalizeVideoSettings(initialSettings ?? DEFAULT_VIDEO_SETTINGS));
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

  // Scene Continuity chỉ Veo 3.1/3.1 Fast hỗ trợ — đổi sang provider/model khác thì tự tắt
  useEffect(() => {
    setSettings((prev) => {
      if (!prev.sceneContinuity) return prev;
      const supported = isVeoFamilyProvider(prev.videoProvider) && supportsVideoExtension(prev.veoModel);
      return supported ? prev : { ...prev, sceneContinuity: false };
    });
  }, [settings.videoProvider, settings.veoModel]);

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
      // Preset không mang nhà cung cấp — giữ nguyên lựa chọn hiện tại của user
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
