export type ApiKeyProvider =
  | 'openai'
  | 'elevenlabs'
  | 'runway'
  | 'kling'
  | 'whisper'
  | 'pika'
  | 'google-tts'
  | 'flux';

export type ApiKeyStatus = 'connected' | 'disconnected' | 'error';

export interface ApiKeyRecord {
  id: string;
  provider: ApiKeyProvider;
  name: string;
  maskedKey: string;
  status: ApiKeyStatus;
  updatedAt: string;
}

export interface SaveApiKeyInput {
  provider: ApiKeyProvider;
  key: string;
}
