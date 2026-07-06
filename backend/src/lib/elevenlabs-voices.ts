/** Map giọng trong form → ElevenLabs voice_id (premade voices) */
export const ELEVENLABS_VOICE_IDS: Record<string, string> = {
  'male-natural': 'pNInz6obpgDQGcFmaJgB',   // Adam
  'female-natural': 'hpp4J3VqNfWAUOO0d1Us', // Rachel
  'male-pro': 'ErXwobaYiN019PkySvjV',       // Antoni
  'female-young': 'EXAVITQu4vr4xnSDxMaL',   // Bella
  'female-old': '21m00Tcm4TlvDq8ikWAM', // Rachel
};

export const DEFAULT_ELEVENLABS_VOICE_ID = ELEVENLABS_VOICE_IDS['male-natural'];

export function resolveElevenLabsVoiceId(voicePreset: string): string {
  return ELEVENLABS_VOICE_IDS[voicePreset] ?? DEFAULT_ELEVENLABS_VOICE_ID;
}
