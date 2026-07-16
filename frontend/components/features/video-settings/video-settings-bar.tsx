'use client';

import { cn } from '@/lib/utils';
import { VoiceSelect } from '@/components/features/voice-select/voice-select';
import { SelectVeo } from '@/components/ui/veomodel';
import {
  ASPECT_RATIO_OPTIONS,
  KIE_MODE_OPTIONS,
  KIE_VIDEO_QUALITY_OPTIONS,
  LANGUAGE_OPTIONS,
  SCENE_COUNT_OPTIONS,
  useProjectSettings,
  VIDEO_PROVIDER_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  VIDEO_TYPE_OPTIONS,
} from '@/contexts/project-settings-context';

interface VideoSettingsBarProps {
  className?: string;
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('shrink-0 min-w-[7.5rem] sm:min-w-[8.5rem]', className)}>
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1 truncate"
        title={label}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const selectClass =
  'w-full min-w-0 px-2 py-1.5 bg-card/80 border border-border rounded-lg text-[11px] sm:text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-60';

export function VideoSettingsBar({ className }: VideoSettingsBarProps) {
  const {
    settings,
    patchSettings,
    veoModels,
    veoModelsLoading,
    hasVeoKey,
    sceneDurationOptions,
  } = useProjectSettings();

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 -mx-0.5 px-0.5">
        <Field label="Nhà cung cấp" htmlFor="header-video-provider" className="min-w-[10rem]">
          <select
            id="header-video-provider"
            value={settings.videoProvider}
            onChange={(e) => patchSettings({ videoProvider: e.target.value as 'veo' | 'kie' })}
            className={selectClass}
          >
            {VIDEO_PROVIDER_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        {settings.videoProvider === 'veo' && hasVeoKey && (
          <Field label="Model Veo" htmlFor="header-veo-model" className="min-w-[9rem]">
            <SelectVeo
              id="header-veo-model"
              showLabel={false}
              value={settings.veoModel}
              onChange={(veoModel) => patchSettings({ veoModel })}
              options={veoModels}
              loading={veoModelsLoading}
              selectClassName={selectClass}
            />
          </Field>
        )}

        {settings.videoProvider === 'kie' && (
          <Field label="Chế độ" htmlFor="header-kie-mode" className="min-w-[8rem]">
            <select
              id="header-kie-mode"
              value={settings.kieMode}
              onChange={(e) => patchSettings({ kieMode: e.target.value as 'fun' | 'normal' | 'spicy' })}
              className={selectClass}
              title={settings.kieMode === 'spicy' ? 'Spicy có thể tạo nội dung nhạy cảm/gợi dục.' : undefined}
            >
              {KIE_MODE_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Ngôn ngữ" htmlFor="header-language">
          <select
            id="header-language"
            value={settings.language}
            onChange={(e) => patchSettings({ language: e.target.value })}
            className={selectClass}
          >
            {LANGUAGE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Số cảnh" htmlFor="header-scene-count">
          <select
            id="header-scene-count"
            value={settings.sceneCount}
            onChange={(e) => patchSettings({ sceneCount: e.target.value })}
            className={selectClass}
          >
            {SCENE_COUNT_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Kiểu video" htmlFor="header-video-type">
          <select
            id="header-video-type"
            value={settings.videoType}
            onChange={(e) => patchSettings({ videoType: e.target.value })}
            className={selectClass}
          >
            {VIDEO_TYPE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Tỷ lệ" htmlFor="header-aspect-ratio">
          <select
            id="header-aspect-ratio"
            value={settings.aspectRatio}
            onChange={(e) => patchSettings({ aspectRatio: e.target.value })}
            className={selectClass}
          >
            {ASPECT_RATIO_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Thời lượng" htmlFor="header-scene-duration">
          <select
            id="header-scene-duration"
            value={settings.sceneDuration}
            onChange={(e) => patchSettings({ sceneDuration: e.target.value })}
            disabled={settings.videoQuality === '1080p'}
            className={selectClass}
            title={settings.videoQuality === '1080p' ? '1080p bắt buộc 8 giây/cảnh' : undefined}
          >
            {sceneDurationOptions.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Chất lượng" htmlFor="header-video-quality">
          <select
            id="header-video-quality"
            value={settings.videoQuality}
            onChange={(e) => patchSettings({ videoQuality: e.target.value })}
            className={selectClass}
          >
            {(settings.videoProvider === 'kie' ? KIE_VIDEO_QUALITY_OPTIONS : VIDEO_QUALITY_OPTIONS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Giọng đọc" htmlFor="header-voice" className="min-w-[10rem] sm:min-w-[11rem]">
          <VoiceSelect
            id="header-voice"
            value={settings.voice}
            onChange={(voice) => patchSettings({ voice })}
            language={settings.language}
            voiceSpeed={settings.voiceSpeed}
            compact
            selectClassName="px-2 py-1.5 text-[11px] sm:text-xs"
          />
        </Field>
      </div>
    </div>
  );
}
