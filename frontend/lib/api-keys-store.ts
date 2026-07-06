const STORAGE_KEY = 'web-video-api-keys';
const LEGACY_TTS_KEY = 'google-tts';
const TTS_KEY_ID = 'elevenlabs';

function readAll(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const all = JSON.parse(raw) as Record<string, string>;

    // Migrate key cũ Google TTS → ElevenLabs
    if (all[LEGACY_TTS_KEY] && !all[TTS_KEY_ID]) {
      all[TTS_KEY_ID] = all[LEGACY_TTS_KEY];
      delete all[LEGACY_TTS_KEY];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }

    return all;
  } catch {
    return {};
  }
}

function writeAll(keys: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export const API_KEY_IDS = {
  gemini: 'gemini',
  veo: 'veo',
  elevenlabs: TTS_KEY_ID,
} as const;

export const API_KEYS_CHANGED_EVENT = 'web-video-api-keys-changed';

export function getApiKey(id: string): string {
  return readAll()[id] ?? '';
}

export function setApiKey(id: string, value: string): void {
  const all = readAll();
  if (value.trim()) all[id] = value.trim();
  else delete all[id];
  writeAll(all);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(API_KEYS_CHANGED_EVENT));
  }
}

export function getAllApiKeys(): Record<string, string> {
  return readAll();
}
