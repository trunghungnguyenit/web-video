import type { VeoInput } from '../types/pipeline';
import {
  resolveVeoAspectRatio,
  resolveVeoDurationSeconds,
  resolveVeoModel,
  resolveVeoResolution,
} from '../lib/veo-config';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const POLL_MS = 10_000;
const MAX_POLLS = 60;

interface LongRunningResponse {
  name?: string;
  done?: boolean;
  error?: { message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
    };
    generatedVideos?: Array<{ video?: { uri?: string } }>;
  };
}

export interface GenerateSceneVideoParams {
  apiKey: string;
  prompt: string;
  veoInput: Pick<VeoInput, 'aspectRatio' | 'videoQuality' | 'sceneDuration' | 'veoModel'>;
  durationSeconds: number;
}

function extractVideoUri(data: LongRunningResponse): string | undefined {
  return (
    data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    ?? data.response?.generatedVideos?.[0]?.video?.uri
  );
}

async function pollOperation(apiKey: string, operationName: string): Promise<string> {
  const opPath = operationName.startsWith('operations/')
    ? operationName
    : operationName.replace(/^\/+/, '');

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));

    const res = await fetch(`${BASE_URL}/${opPath}`, {
      headers: { 'X-goog-api-key': apiKey },
    });

    const data = (await res.json()) as LongRunningResponse;
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Veo poll lỗi (${res.status})`);
    }

    if (data.error?.message) {
      throw new Error(data.error.message);
    }

    if (data.done) {
      const uri = extractVideoUri(data);
      if (!uri) throw new Error('Veo không trả về video URI.');
      return uri;
    }
  }

  throw new Error('Veo quá thời gian chờ — thử lại sau.');
}

async function downloadVideo(apiKey: string, uri: string): Promise<Buffer> {
  const res = await fetch(uri, {
    headers: { 'X-goog-api-key': apiKey },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Không tải được video Veo (${res.status}).`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function generateSceneVideo(params: GenerateSceneVideoParams): Promise<Buffer> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new Error('Thiếu Veo / Gemini API Key.');

  const prompt = params.prompt.trim();
  if (!prompt) throw new Error('Prompt video không được để trống.');

  const quality = params.veoInput.videoQuality ?? '720p';
  const model = resolveVeoModel(quality, params.veoInput.veoModel);
  const resolution = resolveVeoResolution(quality);
  const aspectRatio = resolveVeoAspectRatio(params.veoInput.aspectRatio);
  const durationSeconds = resolveVeoDurationSeconds(params.durationSeconds, quality);

  const startRes = await fetch(`${BASE_URL}/models/${model}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        aspectRatio,
        resolution,
        durationSeconds,
      },
    }),
  });

  const startData = (await startRes.json()) as LongRunningResponse & { name?: string };
  if (!startRes.ok) {
    throw new Error(startData.error?.message ?? `Veo API lỗi (${startRes.status})`);
  }

  const operationName = startData.name;
  if (!operationName) throw new Error('Veo không trả về operation name.');

  const videoUri = await pollOperation(apiKey, operationName);
  return downloadVideo(apiKey, videoUri);
}
