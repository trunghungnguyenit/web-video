// ─── CharacterResolver + ObjectStateManager + PromptBuilder ─────────────────
// Nhận state có cấu trúc của 1 cảnh (đã được StateManager làm liên tục hoá ở
// story-timeline.ts) + danh sách nhân vật cố định (characters[]) → ghép thành
// 1 prompt Veo/Kie hoàn chỉnh, thay vì để Gemini tự viết prompt rời rạc.

import type { PipelineCharacter } from '../../types/pipeline';
import type { CharacterStateEntry, ObjectStateEntry, SceneState } from './story-timeline';

/**
 * CharacterResolver (Character Library) — map tên nhân vật trong characterStates về mô tả
 * ngoại hình CỐ ĐỊNH (traits/outfit/style) đã khai ở mục Nhân vật, để ngoại hình không bị mô
 * tả khác đi mỗi cảnh. Khớp mờ (alias/substring) làm fallback phòng khi Gemini gọi tên hơi
 * khác đi giữa các cảnh (vd "Father" vs "the father" vs "Bố").
 */
function resolveCharacterLine(state: CharacterStateEntry, characters: PipelineCharacter[]): string {
  const stateName = state.name.trim().toLowerCase();
  const fixed =
    characters.find((c) => c.name.trim().toLowerCase() === stateName)
    ?? characters.find((c) => {
      const name = c.name.trim().toLowerCase();
      return name.length > 2 && (stateName.includes(name) || name.includes(stateName));
    });
  const appearance = fixed
    ? [fixed.traits, fixed.outfit, fixed.style].filter((v) => v?.trim()).join(', ')
    : '';

  const parts = [
    state.name,
    appearance ? `(${appearance})` : '',
    state.position ? `— position: ${state.position}` : '',
    state.emotion ? `, emotion: ${state.emotion}` : '',
    state.holding ? `, holding: ${state.holding}` : '',
    state.lookingAt ? `, looking at: ${state.lookingAt}` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * ObjectStateManager — format đồ vật quan trọng xuyên suốt câu chuyện (vị trí/tình trạng)
 * để không bị biến mất/dịch chuyển vô lý giữa các cảnh.
 */
function formatObjectStates(objects: ObjectStateEntry[]): string {
  if (objects.length === 0) return '';
  return objects
    .map((o) => `${o.name}: at ${o.location}${o.condition ? `, ${o.condition}` : ''}`)
    .join('; ');
}

/**
 * PromptBuilder — ghép TOÀN BỘ state của 1 cảnh (đã kế thừa từ cảnh trước qua StateManager)
 * thành prompt Veo/Kie cuối cùng cho trường "visual" — đây là điểm DUY NHẤT sinh ra prompt,
 * Gemini không tự viết prompt trực tiếp nữa.
 */
export function buildSceneVisualPrompt(scene: SceneState, characters: PipelineCharacter[]): string {
  const characterLines = scene.characterStates
    .map((s) => resolveCharacterLine(s, characters))
    .filter(Boolean)
    .join('; ');
  const objectLine = formatObjectStates(scene.objectStates);
  const env = scene.environment;

  const envParts = [
    env.location ? `location: ${env.location}` : '',
    env.weather ? `weather: ${env.weather}` : '',
    env.lighting ? `lighting: ${env.lighting}` : '',
    env.timeOfDay ? `time of day: ${env.timeOfDay}` : '',
  ].filter(Boolean);

  const lines: string[] = [
    'One continuous movie segment — continue seamlessly from the previous ending frame; do not restart, reintroduce, or reset.',
  ];
  if (scene.previousSceneSummary) lines.push(`Previous scene connection: ${scene.previousSceneSummary}.`);
  if (scene.currentState) lines.push(`Current story state: ${scene.currentState}.`);
  if (characterLines) lines.push(`Characters (identity locked — only emotion/pose/action may change): ${characterLines}.`);
  if (objectLine) lines.push(`Objects (persist unless story moves them): ${objectLine}.`);
  if (envParts.length > 0) lines.push(`Environment (keep consistent unless story relocates): ${envParts.join(', ')}.`);
  if (scene.camera) lines.push(`Camera (cinematographer continuity): ${scene.camera}.`);
  if (scene.action) lines.push(`Action (new visual information only): ${scene.action}.`);
  if (scene.dialogueCue) lines.push(`Visible dialogue/expression: ${scene.dialogueCue}.`);
  if (scene.endingState) lines.push(`Scene ending: ${scene.endingState}.`);
  if (scene.transition) lines.push(`Cinematic transition: ${scene.transition}.`);
  if (scene.nextSceneHook) lines.push(`Next scene hook: ${scene.nextSceneHook}.`);
  if (env.ambientSound) lines.push(`Ambient sound: ${env.ambientSound}.`);

  return lines.join(' ');
}
