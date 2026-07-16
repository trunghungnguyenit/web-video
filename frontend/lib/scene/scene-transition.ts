// ─── Crossfade video/audio giữa các cảnh — timeline preview ──────────────────

/** Tuỳ chọn thời lượng crossfade giữa các cảnh (giây) */
export const SCENE_TRANSITION_OPTIONS = [
  { value: 0, label: 'Cắt nhanh' },
  { value: 0.4, label: 'Crossfade 0.4s' },
  { value: 0.6, label: 'Crossfade 0.6s' },
  { value: 1, label: 'Crossfade 1s' },
] as const;

/** Chuyển giây → milliseconds (làm tròn, không âm) */
export function transitionMs(seconds: number): number {
  return Math.max(0, Math.round(seconds * 1000));
}

/** Easing ease-in-out cho ramp opacity/volume */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Ramp volume từ `from` → `to` trong `durationMs` (requestAnimationFrame) */
export function runVolumeRamp(
  el: HTMLMediaElement,
  from: number,
  to: number,
  durationMs: number,
): Promise<void> {
  if (durationMs <= 0) {
    el.volume = Math.max(0, Math.min(1, to));
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const raw = Math.min(1, (now - start) / durationMs);
      el.volume = from + (to - from) * easeInOut(raw);
      if (raw < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Crossfade audio: fade out outgoing, fade in incoming theo masterVolume */
export async function crossfadeAudio(
  outgoing: HTMLAudioElement | null,
  incoming: HTMLAudioElement,
  incomingSrc: string,
  masterVolume: number,
  durationMs: number,
  startOffset = 0,
): Promise<void> {
  incoming.src = incomingSrc;
  incoming.currentTime = Math.max(0, startOffset);

  if (durationMs <= 0 || !outgoing?.src) {
    outgoing?.pause();
    incoming.volume = masterVolume;
    await incoming.play().catch(() => undefined);
    return;
  }

  incoming.volume = 0;
  const outVol = outgoing?.paused ? 0 : outgoing.volume;
  await incoming.play().catch(() => undefined);
  await Promise.all([
    outgoing ? runVolumeRamp(outgoing, outVol, 0, durationMs) : Promise.resolve(),
    runVolumeRamp(incoming, 0, masterVolume, durationMs),
  ]);
  outgoing?.pause();
}

/** Ramp opacity qua callback (dùng cho crossfade video overlay) */
export function runOpacityRamp(
  setOpacity: (v: number) => void,
  from: number,
  to: number,
  durationMs: number,
): Promise<void> {
  if (durationMs <= 0) {
    setOpacity(to);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const raw = Math.min(1, (now - start) / durationMs);
      setOpacity(from + (to - from) * easeInOut(raw));
      if (raw < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Crossfade video: fade out outgoing, fade in incoming (opacity trên DOM) */
export async function crossfadeVideo(
  outgoing: HTMLVideoElement | null,
  incoming: HTMLVideoElement,
  incomingSrc: string,
  durationMs: number,
  shouldPlay: boolean,
  startOffset = 0,
): Promise<void> {
  if (!incomingSrc) return;

  incoming.src = incomingSrc;
  incoming.currentTime = Math.max(0, startOffset);

  if (durationMs <= 0 || !outgoing?.src) {
    outgoing?.pause();
    if (shouldPlay) await incoming.play().catch(() => undefined);
    else incoming.pause();
    return;
  }

  incoming.style.opacity = '0';
  if (shouldPlay) await incoming.play().catch(() => undefined);

  await Promise.all([
    outgoing ? runOpacityRamp((v) => { outgoing.style.opacity = String(v); }, 1, 0, durationMs) : Promise.resolve(),
    runOpacityRamp((v) => { incoming.style.opacity = String(v); }, 0, 1, durationMs),
  ]);

  outgoing?.pause();
  incoming.style.opacity = '1';
  if (outgoing) outgoing.style.opacity = '0';
}
