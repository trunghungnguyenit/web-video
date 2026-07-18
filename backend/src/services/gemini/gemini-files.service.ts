// ─── Gemini Files API — upload video → chờ ACTIVE → fileUri ─────────────────

const BASE = 'https://generativelanguage.googleapis.com';

export interface GeminiUploadedFile {
  name: string;
  uri: string;
  mimeType: string;
  state?: string;
}

interface FileResource {
  name?: string;
  uri?: string;
  mimeType?: string;
  state?: string;
  error?: { message?: string };
}

interface FileGetResponse {
  name?: string;
  uri?: string;
  mimeType?: string;
  state?: string;
  error?: { message?: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Upload bytes lên Gemini Files API (resumable).
 * @see https://ai.google.dev/gemini-api/docs/files
 */
export async function uploadToGeminiFiles(params: {
  apiKey: string;
  bytes: Buffer;
  mimeType: string;
  displayName?: string;
}): Promise<GeminiUploadedFile> {
  const apiKey = params.apiKey.trim();
  const mimeType = params.mimeType.trim() || 'video/mp4';
  const numBytes = params.bytes.byteLength;
  if (!apiKey) throw new Error('Thiếu Gemini API Key để upload Files API.');
  if (numBytes <= 0) throw new Error('File video trống — không upload được.');

  // Bước 1: start resumable — lấy upload URL từ header
  const startRes = await fetch(`${BASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(numBytes),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: { display_name: params.displayName?.trim() || `video-${Date.now()}` },
    }),
  });

  if (!startRes.ok) {
    let message = `Files API start lỗi (${startRes.status})`;
    try {
      const err = (await startRes.json()) as { error?: { message?: string } };
      if (err.error?.message) message = err.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const uploadUrl = startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('Files API không trả về upload URL.');
  }

  // Bước 2: gửi bytes + finalize
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(numBytes),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': mimeType,
    },
    body: new Uint8Array(params.bytes),
  });

  const uploaded = (await uploadRes.json()) as { file?: FileResource; error?: { message?: string } };
  if (!uploadRes.ok) {
    throw new Error(uploaded.error?.message ?? `Files API upload lỗi (${uploadRes.status})`);
  }

  const file = uploaded.file;
  if (!file?.uri || !file.name) {
    throw new Error('Files API không trả về file.uri sau khi upload.');
  }

  return {
    name: file.name,
    uri: file.uri,
    mimeType: file.mimeType ?? mimeType,
    state: file.state,
  };
}

/** Poll files.get đến khi state = ACTIVE (hoặc FAILED) */
export async function waitForGeminiFileActive(
  apiKey: string,
  fileName: string,
  options?: { maxWaitMs?: number; intervalMs?: number },
): Promise<GeminiUploadedFile> {
  const key = apiKey.trim();
  const maxWaitMs = options?.maxWaitMs ?? 5 * 60_000;
  const intervalMs = options?.intervalMs ?? 2_000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/v1beta/${fileName}`, {
      headers: { 'x-goog-api-key': key },
    });
    const data = (await res.json()) as FileGetResponse;
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Files API get lỗi (${res.status})`);
    }

    const state = (data.state ?? '').toUpperCase();
    if (state === 'ACTIVE') {
      if (!data.uri || !data.name) {
        throw new Error('File ACTIVE nhưng thiếu uri/name.');
      }
      return {
        name: data.name,
        uri: data.uri,
        mimeType: data.mimeType ?? 'video/mp4',
        state: data.state,
      };
    }
    if (state === 'FAILED') {
      throw new Error(data.error?.message ?? 'Gemini xử lý file video thất bại.');
    }

    await sleep(intervalMs);
  }

  throw new Error('Timeout chờ Gemini Files API xử lý video (ACTIVE).');
}

/** Upload + chờ ACTIVE — trả fileUri dùng cho generateContent */
export async function uploadVideoAndWaitActive(params: {
  apiKey: string;
  bytes: Buffer;
  mimeType: string;
  displayName?: string;
}): Promise<GeminiUploadedFile> {
  const started = await uploadToGeminiFiles(params);
  if ((started.state ?? '').toUpperCase() === 'ACTIVE') return started;
  return waitForGeminiFileActive(params.apiKey, started.name);
}

/** Xóa file trên Files API (best-effort) */
export async function deleteGeminiFile(apiKey: string, fileName: string): Promise<void> {
  try {
    await fetch(`${BASE}/v1beta/${fileName}`, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': apiKey.trim() },
    });
  } catch {
    // ignore cleanup errors
  }
}

/** YouTube public URL — Gemini nhận trực tiếp qua file_uri (không cần upload Files API) */
export function isYouTubeUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    return host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com');
  } catch {
    return false;
  }
}
