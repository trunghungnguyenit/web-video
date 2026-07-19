// ─── StoryAnalysisService + StoryTimelineBuilder + SceneTimelineBuilder + StateManager ───
// Gemini phải hiểu TOÀN BỘ câu chuyện (storyTimeline) TRƯỚC khi tách cảnh — mỗi cảnh
// (scenes[]) mang theo state có cấu trúc (nhân vật/đồ vật/môi trường/camera/...) thay vì
// chỉ 1 câu "visual" rời rạc. StateManager (propagateSceneStates) đảm bảo Ending State của
// cảnh N-1 LUÔN trở thành Starting State của cảnh N — ghi đè cứng, không phụ thuộc việc
// Gemini có tuân thủ đúng hay không.

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
- Never repeat character intros, location/outfit/backstory/environment descriptions. Only describe NEW visual information.`;
}

/** Đoạn JSON schema chèn vào prompt Gemini — SceneTimelineBuilder: mỗi cảnh phải khai đủ
 * state, KHÔNG tự viết "visual"/prompt trực tiếp (PromptBuilder ở module khác lo việc đó). */
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
        { "name": "(English) important recurring object", "location": "(English) where it is", "condition": "(English) open/closed/broken/intact…" }
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
      camera: scene.camera || prev.camera,
    };
  });
}
