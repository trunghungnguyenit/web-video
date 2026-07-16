// ─── Chuyển preset → VideoScene[] / SavedCharacter[] cho demo UI ─────────────

import type { PresetCharacter, PresetScript, PresetDemoScene, PresetTimelineDemo } from '@/lib/preset/preset-scripts';
import type { VideoScene } from '@/lib/scene/scenes';
import { recalculateSceneTimings } from '@/lib/scene/scenes';
import type { SavedCharacter } from '@/lib/character/saved-characters';
import { createEmptyCharacter } from '@/lib/character/saved-characters';

/** Chuyển nhân vật peset → SavedCharacter */
export function presetCharactersToSaved(list: PresetCharacter[]): SavedCharacter[] {
  const now = new Date().toISOString();
  return list.map((data, i) => ({
    ...createEmptyCharacter(),
    id: `preset-char-${Date.now()}-${i}`,
    name: data.name,
    role: data.role,
    traits: data.traits,
    outfit: data.outfit,
    description: data.description,
    style: data.style,
    createdAt: now,
    updatedAt: now,
  }));
}

/** Chuyển demoScenes preset → VideoScene[] sẵn sàng cho mục 3 & 4 */
export function buildDemoScenesFromPreset(preset: PresetScript): VideoScene[] {
  const baseId = `demo-p${preset.id}-${Date.now()}`;
  let cursor = 0;

  const scenes: VideoScene[] = preset.demoScenes.map((s, i) => {
    const timeStart = cursor;
    const timeEnd = cursor + s.durationSeconds;
    cursor = timeEnd;
    return {
      id: `${baseId}-${i}`,
      index: i + 1,
      timeStart,
      timeEnd,
      prompt: s.prompt,
      voice: s.voice,
      durationSeconds: s.durationSeconds,
      status: 'success' as const,
    };
  });

  return recalculateSceneTimings(scenes);
}

export type { PresetDemoScene, PresetTimelineDemo };
