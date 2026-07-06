import { ElevenLabsClient, ElevenLabsError } from '@elevenlabs/elevenlabs-js';
import { resolveElevenLabsVoiceId } from '../lib/elevenlabs-voices';
import type { TtsInput } from '../types/pipeline';

export interface SynthesizeSpeechInput {
  apiKey: string;
  text: string;
  ttsInput: Pick<TtsInput, 'voice' | 'language' | 'voiceSpeed'>;
}

const DEFAULT_MODEL = 'eleven_multilingual_v2';
const VI_MODELS = ['eleven_turbo_v2_5', 'eleven_flash_v2_5'] as const;
const DEFAULT_MODELS = [DEFAULT_MODEL, 'eleven_turbo_v2_5'] as const;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 3000];

function clampSpeed(speed?: number): number {
  if (speed == null || !Number.isFinite(speed)) return 1;
  return Math.min(1.2, Math.max(0.7, speed));
}

function normalizeLanguageCode(language?: string): string | undefined {
  const lang = language?.trim().toLowerCase();
  if (!lang) return undefined;
  const map: Record<string, string> = { vi: 'vi', en: 'en', zh: 'zh', ja: 'ja' };
  return map[lang] ?? lang.slice(0, 2);
}

function resolveModelChain(language?: string): string[] {
  const envModel = process.env.ELEVENLABS_MODEL?.trim();
  if (envModel) return [envModel];

  const lang = language?.trim().toLowerCase();
  if (lang === 'vi') return [...VI_MODELS];
  return [...DEFAULT_MODELS];
}

function modelSupportsLanguageCode(modelId: string): boolean {
  return modelId.includes('flash') || modelId.includes('turbo');
}

function normalizeTtsText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]/g, '')
    .replace(/^["'""]|["'""]$/g, '')
    .trim();
}

function resolveApiKey(apiKey?: string): string {
  const key = apiKey?.trim() || process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new Error('Thiếu ElevenLabs API Key.');
  }
  return key;
}

async function streamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  return new Response(stream).arrayBuffer();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseElevenLabsError(err: ElevenLabsError): string {
  const body = err.body as { detail?: { message?: string; code?: string; status?: string } } | undefined;
  const detailMsg = body?.detail?.message?.trim();

  if (err.statusCode === 401 || body?.detail?.status === 'missing_permissions') {
    return detailMsg
      ? `ElevenLabs: ${detailMsg} — vào elevenlabs.io → Profile → API Keys, tạo key mới và bật quyền Text to Speech.`
      : 'ElevenLabs API Key không hợp lệ hoặc thiếu quyền Text to Speech.';
  }

  if (detailMsg) return detailMsg;
  if (err.message && !err.message.startsWith('Status code:')) return err.message;
  return `ElevenLabs API lỗi (${err.statusCode ?? 'unknown'})`;
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof ElevenLabsError)) return false;
  if (err.statusCode === 429 || err.statusCode === 503) return true;
  const msg = parseElevenLabsError(err).toLowerCase();
  return msg.includes('high demand') || msg.includes('try again') || msg.includes('rate limit');
}

async function convertOnce(
  client: ElevenLabsClient,
  voiceId: string,
  speechText: string,
  modelId: string,
  languageCode: string | undefined,
  voiceSpeed: number | undefined,
): Promise<ArrayBuffer> {
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text: speechText,
    modelId,
    outputFormat: 'mp3_44100_128',
    ...(modelSupportsLanguageCode(modelId) && languageCode ? { languageCode } : {}),
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      speed: clampSpeed(voiceSpeed),
    },
  });

  return streamToArrayBuffer(audioStream);
}

async function synthesizeWithFallback(
  client: ElevenLabsClient,
  voiceId: string,
  speechText: string,
  ttsInput: Pick<TtsInput, 'language' | 'voiceSpeed'>,
): Promise<ArrayBuffer> {
  const models = resolveModelChain(ttsInput.language);
  const languageCode = normalizeLanguageCode(ttsInput.language);
  let lastError: Error | null = null;

  for (const modelId of models) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await convertOnce(
          client,
          voiceId,
          speechText,
          modelId,
          languageCode,
          ttsInput.voiceSpeed,
        );
      } catch (err) {
        lastError =
          err instanceof ElevenLabsError
            ? new Error(parseElevenLabsError(err))
            : err instanceof Error
              ? err
              : new Error('ElevenLabs TTS thất bại.');

        if (isRetryableError(err) && attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAYS_MS[attempt] ?? 2000);
          continue;
        }

        if (isRetryableError(err)) break;
        throw lastError;
      }
    }
  }

  throw new Error(
    `${lastError?.message ?? 'ElevenLabs TTS thất bại.'} — server ElevenLabs đang quá tải, thử lại sau vài phút.`,
  );
}

/** ElevenLabs Text-to-Speech — trả audio MP3 (ArrayBuffer) */
export async function synthesizeSpeech(input: SynthesizeSpeechInput): Promise<ArrayBuffer> {
  const { text, ttsInput } = input;
  const apiKey = resolveApiKey(input.apiKey);

  if (!text?.trim()) {
    throw new Error('Nội dung voiceover không được để trống.');
  }

  const client = new ElevenLabsClient({ apiKey });
  const voiceId = resolveElevenLabsVoiceId(ttsInput.voice);
  const speechText = normalizeTtsText(text);

  return synthesizeWithFallback(client, voiceId, speechText, ttsInput);
}
