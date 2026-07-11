// ─── Dữ liệu cảnh demo + timeline theo id kịch bản mẫu ───────────────────────

import type { PresetTimelineDemo } from '@/lib/preset-scripts';

/** Timeline demo (playhead, BGM…) theo id preset */
export const PRESET_DEMO_TIMELINES: Record<number, PresetTimelineDemo> = {
  5: {
    includeSubtitles: true,
    bgmPresetName: 'Cinematic Epic',
    bgmVolume: 28,
    voiceSpeed: 1,
    sceneStyle: '2d-explainer',
    transitionNote: 'Crossfade + slow motion cảnh 9 — trailer chiến tranh stickman',
  },
};
