import type { ApiKeyRecord, SaveApiKeyInput } from '../types';

const store: ApiKeyRecord[] = [
  { id: '1', provider: 'openai', name: 'OpenAI / GPT', maskedKey: 'sk••••••••', status: 'connected', updatedAt: new Date().toISOString() },
  { id: '2', provider: 'elevenlabs', name: 'ElevenLabs', maskedKey: 'sk••••••••', status: 'connected', updatedAt: new Date().toISOString() },
  { id: '3', provider: 'runway', name: 'Runway ML', maskedKey: 'rmk••••••••', status: 'disconnected', updatedAt: new Date().toISOString() },
];

function maskKey(key: string) {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 3)}${'•'.repeat(Math.min(key.length - 3, 20))}`;
}

export const apiKeyService = {
  list(): ApiKeyRecord[] {
    return store;
  },

  save(input: SaveApiKeyInput): ApiKeyRecord {
    const existing = store.find((k) => k.provider === input.provider);
    const now = new Date().toISOString();

    if (existing) {
      existing.maskedKey = maskKey(input.key);
      existing.status = 'connected';
      existing.updatedAt = now;
      return existing;
    }

    const record: ApiKeyRecord = {
      id: crypto.randomUUID(),
      provider: input.provider,
      name: input.provider,
      maskedKey: maskKey(input.key),
      status: 'connected',
      updatedAt: now,
    };
    store.push(record);
    return record;
  },
};
