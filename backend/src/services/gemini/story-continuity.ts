// ─── Story Continuity — StoryAnalysisService + StoryTimelineBuilder + SceneTimelineBuilder
// + StateManager + CharacterResolver + ObjectStateManager + PromptBuilder ───────────────────
// File DUY NHẤT chứa toàn bộ rule/schema bắt Gemini hiểu TOÀN BỘ câu chuyện (storyTimeline)
// TRƯỚC khi tách cảnh, và ghép state có cấu trúc của từng cảnh thành 1 prompt Veo/Kie hoàn
// chỉnh — dùng CHUNG cho cả 2 provider (Veo lẫn Grok Imagine/kie.ai đều nhận "visual" từ
// cùng nguồn này qua gemini.service.ts, không có logic riêng theo provider ở đây).
//
// StateManager (propagateSceneStates) đảm bảo Ending State của cảnh N-1 LUÔN trở thành
// Starting State của cảnh N — ghi đè cứng, không phụ thuộc việc Gemini có tuân thủ đúng hay
// không.

import type { PipelineCharacter } from '../../types/pipeline';

export interface StoryTimeline {
  summary: string;
  beginning: string;
  conflict: string;
  climax: string;
  ending: string;
}

export interface CharacterStateEntry {
  name: string;
  position: string;
  emotion: string;
  holding: string;
  lookingAt: string;
}

export interface ObjectStateEntry {
  name: string;
  location: string;
  condition: string;
}

export interface EnvironmentState {
  location: string;
  weather: string;
  lighting: string;
  timeOfDay: string;
  /** Âm thanh môi trường/chuyển động — bắt buộc vì Veo generateAudio dựa vào mô tả trong prompt */
  ambientSound: string;
}

export interface SceneState {
  id: number;
  durationSeconds: number;
  previousSceneSummary: string;
  currentState: string;
  characterStates: CharacterStateEntry[];
  objectStates: ObjectStateEntry[];
  environment: EnvironmentState;
  camera: string;
  action: string;
  dialogueCue: string;
  endingState: string;
  /** Tên chuyển cảnh điện ảnh: Cut | Match Cut | Tracking Continuation | … */
  transition: string;
  /** Visual hook dẫn sang cảnh sau — cảnh N+1 phải bắt đầu đúng từ đây */
  nextSceneHook: string;
  voiceover: string;
}

/** Quy tắc Hollywood continuity — chèn vào prompt Gemini (một phim liên tục, không clip rời). */
export function buildCinematicContinuityRules(): string {
  return `## GLOBAL CINEMATIC RULES (bắt buộc — Hollywood continuity)
Bạn KHÔNG tạo các cảnh độc lập. Bạn tạo MỘT bộ phim liên tục đã được chia thành các đoạn.
Mỗi cảnh chỉ là một segment của CÙNG một phim. Khi ghép video lại phải như một shot liên tục, không discontinuity.

### Continuity tuyệt đối
- Never restart the story. Never reintroduce characters. Never reset emotions / environment.
- Never describe characters as if they appear for the first time.
- Every scene MUST begin exactly where the previous scene ended (next frame after pause).
- Never teleport characters. Never change location without showing the transition.
- Inherit ALL from previous scene: positions, emotions, body language, facial expressions, camera, lighting, time of day, weather, objects, injuries, clothing, dirt/blood/sweat, environment state, objective, tension.
- Nothing suddenly changes unless the story explicitly causes it.

### Scene ending + transition
- Every scene MUST end with a visual hook that naturally leads into the next (door opens, look toward danger, alarm starts, grab, footsteps approach, pan toward next location, explosion begins…).
- transition: chọn ĐÚNG 1 cinematic transition — Cut | Match Cut | Tracking Continuation | Whip Pan | Door Reveal | Over-the-Shoulder Continuation | Character Follow | Pan Continuation | Camera Push Through | Walking Continuation. Không dùng transition ngẫu nhiên.
- nextSceneHook: mô tả chính xác khoảnh khắc cuối mà cảnh sau PHẢI tiếp tục.

### Character / environment / camera / emotion / objects
- Face, hair, body, height, clothes, accessories, skin, age, voice, animation style, personality — GIỮ NGUYÊN. Chỉ được đổi: emotion, pose, action, eye direction, facial expression.
- Architecture, lighting, weather, object placement, background, time of day, atmosphere — giữ nhất quán; chỉ đổi khi story chuyển địa điểm có lý do.
- Camera như một cinematographer quay cả phim — tiếp nối chuyển động khi có thể (vd. scene 4 tracks behind prisoner → scene 5 continues that tracking into cafeteria).
- Emotions evolve gradually (Fear → Anxiety → Panic → Desperation → Courage). Never sudden emotion flips.
- Objects stay where they were (open door stays open; broken chair stays broken; dropped item stays on floor unless picked up).

### No repetition
- Never repeat character intros, location/outfit/backstory/environment descriptions. Only describe NEW visual information.

### Cảnh sau PHẢI bắt đầu đúng điểm kết thúc cảnh trước — KHÔNG lặp lại hành động (quan trọng nhất)
Khi chia câu chuyện thành nhiều cảnh, mỗi cảnh là phần TIẾP NỐI TRỰC TIẾP của cảnh trước — như đang cắt 1 video dài thành nhiều đoạn nhỏ, không phải nhiều video riêng. Cảnh sau phải bắt đầu ĐÚNG từ trạng thái vật lý CUỐI của cảnh trước (vị trí, tay đang cầm/chạm gì, tư thế, cửa/vật đang mở hay đóng...) — TUYỆT ĐỐI không lặp lại/tua lại bất kỳ hành động hay khung hình nào đã xuất hiện ở cảnh trước. Cảnh sau CHỈ thể hiện diễn biến MỚI xảy ra SAU điểm kết thúc của cảnh trước.

Ví dụ minh hoạ:
- Cảnh 1: "Mở cửa → bước ra ngoài." Kết thúc: người đã đứng hẳn bên ngoài, tay vẫn đang cầm tay nắm cửa, cửa vẫn còn mở.
- ✅ ĐÚNG — Cảnh 2 bắt đầu NGAY từ đó: characterStates.position = "standing just outside the door", holding = "the door handle" (giữ nguyên từ endingState cảnh 1); action CHỈ mô tả "closes the door, releases the handle, walks away" — hành động MỚI, không nhắc lại việc mở cửa/bước ra.
- ❌ SAI — Cảnh 2 lại bắt đầu từ trong nhà, mô tả lại "mở cửa → bước ra ngoài → đóng cửa" — LẶP hành động đã có ở cảnh 1.

Áp dụng cho MỌI cặp cảnh liên tiếp: characterStates[].position/holding của cảnh N+1 PHẢI khớp CHÍNH XÁC với endingState của cảnh N (là điểm bắt đầu, không phải viết lại từ đầu). Ghép tất cả các cảnh lại phải như đang xem 1 video liên tục — người xem không được nhận ra điểm cắt giữa các cảnh.

### Đồ vật đã thay đổi trạng thái KHÔNG BAO GIỜ được tự phục hồi lại ở cảnh sau (quy tắc TỔNG QUÁT — áp dụng cho MỌI loại vật thể, MỌI câu chuyện, không riêng tình huống nào)
Nếu một cảnh làm THAY ĐỔI vĩnh viễn tình trạng của Vật A (đổ ra khỏi vật chứa, vỡ, rách, cháy/tắt, rơi, dùng hết, xây/phá, mở/đóng, di chuyển đi nơi khác, đổi chủ...), objectStates của TẤT CẢ các cảnh SAU đó phải phản ánh ĐÚNG tình trạng MỚI này — tuyệt đối không được vô tình quay lại tình trạng CŨ (như thể việc đó chưa từng xảy ra), trừ khi có một hành động MỚI, rõ ràng làm nó thay đổi trở lại.

Khuôn mẫu chung: Cảnh N có action làm Vật A chuyển từ trạng thái [X] → [Y] → endingState/objectStates của cảnh N PHẢI ghi Vật A ở trạng thái [Y]. Mọi cảnh N+1, N+2... về sau đều kế thừa đúng [Y], trừ khi có hành động mới đổi tiếp sang [Z].
- ✅ ĐÚNG — các cảnh sau giữ nguyên trạng thái [Y] cho tới khi có hành động mới thay đổi nó.
- ❌ SAI — một cảnh sau vô tình mô tả lại Vật A như đang ở trạng thái [X] (trạng thái TRƯỚC khi thay đổi) — đây là lỗi "cảnh sau lặp lại/reset về trạng thái cảnh trước", y hệt lỗi lặp hành động ở nhân vật.

Ví dụ minh hoạ ở nhiều bối cảnh khác nhau (chỉ để hiểu khuôn mẫu, KHÔNG giới hạn phạm vi rule ở đúng các ví dụ này — áp dụng tương tự cho bất kỳ vật thể nào khác xuất hiện trong câu chuyện): ly nước đã đổ hết → cảnh sau ly vẫn rỗng, không tự đầy lại; cửa sổ đã vỡ → cảnh sau vẫn vỡ, không tự lành; nến đã tắt → cảnh sau vẫn tối, không tự sáng lại; tờ giấy đã bị xé → cảnh sau vẫn rách; ngôi nhà đã cháy/sập → cảnh sau vẫn tàn tích, không tự nguyên vẹn lại; xe đã hư → cảnh sau vẫn hư, không tự lành lặn.`;
}

/** Đoạn JSON schema chèn vào prompt Gemini — SceneTimelineBuilder: mỗi cảnh phải khai đủ
 * state, KHÔNG tự viết "visual"/prompt trực tiếp (PromptBuilder ở dưới lo việc đó). */
export function buildStoryPipelineSchema(count: number, lang: string): string {
  return `{
  "title": "short film title",
  "storyTimeline": {
    "summary": "(English) Full-story summary — write this FIRST from understanding the entire film, THEN split scenes below",
    "beginning": "(English) Story beginning",
    "conflict": "(English) Main conflict",
    "climax": "(English) Climax",
    "ending": "(English) Ending"
  },
  "scenes": [
    {
      "id": 1,
      "durationSeconds": 6,
      "previousSceneSummary": "(English) Previous Scene Connection — how this scene continues from the prior ending frame (empty only for scene 1). Must match prior endingState + transition + nextSceneHook — do not reinvent.",
      "currentState": "(English) Current Story State at the FIRST frame of this scene — exact next frame after previous ending. No jump cut, no teleport.",
      "characterStates": [
        { "name": "(English label — e.g. 'Bald Prisoner', 'Shin' — UNLESS a specific proper name is explicitly given in the source, then keep it as-is) stable name/label, IDENTICAL across ALL scenes, never a Vietnamese description", "position": "(English) position in frame", "emotion": "(English) emotion (evolve gradually)", "holding": "(English) what they hold (empty if none)", "lookingAt": "(English) what/who they look at" }
      ],
      "objectStates": [
        { "name": "(English) important recurring object", "location": "(English) where it is", "condition": "(English) condition BY THE END of this scene — if this scene's action changes it (poured out/spilled/broken/emptied/moved/consumed…), write the NEW post-change state here, e.g. 'empty, contents scattered on the ground' — NEVER write the old pre-change condition again in a later scene unless a new action explicitly restores it" }
      ],
      "environment": { "location": "(English) location", "weather": "(English) weather", "lighting": "(English) lighting", "timeOfDay": "(English) time of day", "ambientSound": "(English) if a video is attached, describe the ACTUAL sounds/movement audible or implied in THAT part of the video (impacts, footsteps, engines, crowd noise, action SFX…) — do not invent generic sounds unrelated to it; if no video is attached, infer plausible ambient SFX from the scene, e.g. birds chirping, soft wind" },
      "camera": "(English) camera angle/movement — continue prior camera flow when possible",
      "action": "(English) main action in this segment — NEW visual info only, no re-intros",
      "dialogueCue": "(this is the ACTUAL speech Veo/Kie will voice natively in the generated video — write it in the ORIGINAL spoken language of the source video if one is attached; if no video is attached, use ${lang}. Quote it as spoken by a named character, e.g. Shin: \\"...\\") short on-screen line actually spoken in-scene — NOT the TTS voiceover track",
      "endingState": "(English) Scene Ending — exact final freeze: where characters/objects/camera stop",
      "transition": "(English) ONE of: Cut | Match Cut | Tracking Continuation | Whip Pan | Door Reveal | Over-the-Shoulder Continuation | Character Follow | Pan Continuation | Camera Push Through | Walking Continuation",
      "nextSceneHook": "(English) Next Scene Hook — the visual beat the FOLLOWING scene must open on",
      "voiceover": "(IN ${lang}, NOT English) ElevenLabs TTS narration only"
    }
  ]
}

QUAN TRỌNG — pipeline: Nội dung → hiểu TOÀN BỘ phim (storyTimeline) → tách đúng ${count} segments liên tục (scenes) — như một movie bị cắt ra, KHÔNG phải ${count} clip độc lập.
- NGÔN NGỮ: mọi trường trừ voiceover và dialogueCue = 100% English.
  - voiceover = LUÔN ${lang} (đây là lời dẫn TTS đọc đè lên, theo ngôn ngữ người dùng chọn).
  - dialogueCue = lời nói THẬT do Veo/Kie tự tạo giọng NGAY trong video (generateAudio) — nếu có video đính kèm, viết ĐÚNG theo ngôn ngữ nhân vật đang nói trong video gốc đó (nghe/xem video để xác định, KHÔNG tự ép sang ${lang} hay tiếng Anh); nếu không có video đính kèm (tab text/ảnh/file), dùng ${lang}.
- previousSceneSummary / currentState của cảnh N (N>1) PHẢI khớp endingState + transition + nextSceneHook của cảnh N-1.
- characterStates/objectStates/environment/camera phải kế thừa hợp lý — không đổi ngoại hình, không teleport đồ vật, không nhảy camera vô cớ.
- KHÔNG tự viết "visual"/prompt Veo — chỉ điền state; PromptBuilder sẽ ghép.`;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback;
}

function parseCharacterStates(v: unknown): CharacterStateEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => {
      const r = c as Record<string, unknown>;
      return {
        name: str(r?.name),
        position: str(r?.position),
        emotion: str(r?.emotion),
        holding: str(r?.holding),
        lookingAt: str(r?.lookingAt),
      };
    })
    .filter((c) => c.name);
}

function parseObjectStates(v: unknown): ObjectStateEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((o) => {
      const r = o as Record<string, unknown>;
      return { name: str(r?.name), location: str(r?.location), condition: str(r?.condition) };
    })
    .filter((o) => o.name);
}

function parseEnvironment(v: unknown): EnvironmentState {
  const e = (v ?? {}) as Record<string, unknown>;
  return {
    location: str(e.location),
    weather: str(e.weather),
    lighting: str(e.lighting),
    timeOfDay: str(e.timeOfDay),
    ambientSound: str(e.ambientSound),
  };
}

/** StoryAnalysisService — parse phần "storyTimeline" (hiểu toàn bộ câu chuyện) */
export function parseStoryTimeline(v: unknown): StoryTimeline {
  const t = (v ?? {}) as Record<string, unknown>;
  return {
    summary: str(t.summary),
    beginning: str(t.beginning),
    conflict: str(t.conflict),
    climax: str(t.climax),
    ending: str(t.ending),
  };
}

/** SceneTimelineBuilder — parse danh sách cảnh có state từ JSON thô Gemini trả về */
export function parseSceneStates(rawScenes: unknown): SceneState[] {
  if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
    throw new Error('Gemini trả về JSON không hợp lệ — thiếu danh sách scenes.');
  }

  return rawScenes.map((raw, i) => {
    const s = raw as Record<string, unknown>;
    return {
      id: typeof s.id === 'number' ? s.id : i + 1,
      durationSeconds:
        typeof s.durationSeconds === 'number' && s.durationSeconds > 0 ? s.durationSeconds : 6,
      previousSceneSummary: str(s.previousSceneSummary),
      currentState: str(s.currentState),
      characterStates: parseCharacterStates(s.characterStates),
      objectStates: parseObjectStates(s.objectStates),
      environment: parseEnvironment(s.environment),
      camera: str(s.camera),
      action: str(s.action) || `Scene ${i + 1}`,
      dialogueCue: str(s.dialogueCue),
      endingState: str(s.endingState),
      transition: str(s.transition),
      nextSceneHook: str(s.nextSceneHook),
      voiceover: str(s.voiceover) || `Voiceover scene ${i + 1}`,
    };
  });
}

function inheritEnvironment(current: EnvironmentState, prev: EnvironmentState): EnvironmentState {
  return {
    location: current.location || prev.location,
    weather: current.weather || prev.weather,
    lighting: current.lighting || prev.lighting,
    timeOfDay: current.timeOfDay || prev.timeOfDay,
    ambientSound: current.ambientSound || prev.ambientSound,
  };
}

/**
 * Đồ vật ở cảnh trước mà cảnh này KHÔNG nhắc lại (theo tên, khớp mờ) thì coi như chưa có gì
 * thay đổi — kế thừa nguyên trạng (vị trí/tình trạng) từ cảnh trước, giống cách environment
 * được kế thừa. Tránh trường hợp Gemini "quên" nhắc lại 1 vật khiến nó lặng lẽ biến mất hoặc
 * bị vẽ lại về trạng thái mặc định (vd chậu đã đổ hết đậu ra đất lại bị vẽ đầy đậu trở lại).
 * Đồ vật cảnh này CÓ khai báo thì luôn ưu tiên state MỚI Gemini viết (có thể đã thay đổi).
 */
function inheritObjectStates(
  current: ObjectStateEntry[],
  prev: ObjectStateEntry[],
): ObjectStateEntry[] {
  const currentNames = new Set(current.map((o) => o.name.trim().toLowerCase()));
  const carriedOver = prev.filter((o) => !currentNames.has(o.name.trim().toLowerCase()));
  return [...current, ...carriedOver];
}

/**
 * StateManager — Ending State + nextSceneHook của cảnh N-1 BẮT BUỘC trở thành
 * previousSceneSummary của cảnh N. Kế thừa environment trống từ cảnh trước.
 * Cảnh 1 dùng storyTimeline.beginning nếu Gemini để trống.
 */
export function propagateSceneStates(scenes: SceneState[], storyTimeline: StoryTimeline): SceneState[] {
  return scenes.map((scene, i) => {
    if (i === 0) {
      return scene.previousSceneSummary
        ? scene
        : { ...scene, previousSceneSummary: storyTimeline.beginning };
    }
    const prev = scenes[i - 1];
    const inherited = [prev.endingState, prev.transition, prev.nextSceneHook]
      .filter((v) => v.trim())
      .join(' ');
    return {
      ...scene,
      previousSceneSummary: inherited || scene.previousSceneSummary,
      environment: inheritEnvironment(scene.environment, prev.environment),
      objectStates: inheritObjectStates(scene.objectStates, prev.objectStates),
      camera: scene.camera || prev.camera,
    };
  });
}

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
 * Gemini không tự viết prompt trực tiếp nữa. Dùng CHUNG cho cả Veo lẫn Grok Imagine.
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

  // CHỈ đưa vào prompt đúng những gì THẬT SỰ cần vẽ cho cảnh này (Action/Camera/
  // Characters/Environment/Objects/Dialogue/Ambient). KHÔNG nhắc lại previousSceneSummary/
  // currentState/endingState/transition/nextSceneHook trong prompt — dù có đóng khung
  // "đừng vẽ lại" thì đây vẫn là văn bản mô tả hình ảnh chi tiết, model (đặc biệt Grok
  // Imagine — không có trí nhớ, không phân biệt được "bối cảnh để biết" với "nội dung cần
  // vẽ") vẫn dễ bị "cảm hứng" vẽ theo, khiến cảnh sau trông như lặp lại cảnh trước. Liên
  // kết giữa các cảnh vẫn được đảm bảo vì StateManager (propagateSceneStates) đã kế thừa
  // đúng environment/camera vào CHÍNH các trường render bên dưới — không cần nhắc lại bằng lời.
  const lines: string[] = [];
  if (scene.action) lines.push(`Action: ${scene.action}.`);
  if (scene.camera) lines.push(`Camera: ${scene.camera}.`);
  if (characterLines) lines.push(`Characters (identity locked — only emotion/pose/action may change): ${characterLines}.`);
  if (envParts.length > 0) lines.push(`Environment: ${envParts.join(', ')}.`);
  if (objectLine) lines.push(`Objects: ${objectLine}.`);
  if (scene.dialogueCue) lines.push(`Visible dialogue/expression: ${scene.dialogueCue}.`);
  if (env.ambientSound) lines.push(`Ambient sound: ${env.ambientSound}.`);

  return lines.join(' ');
}
