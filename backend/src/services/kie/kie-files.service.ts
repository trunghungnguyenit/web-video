// ─── Kie File Upload — base64 → downloadUrl (dùng cho image_urls I2V) ────────
// Docs: https://docs.kie.ai/file-upload-api/quickstart — base URL riêng, KHÔNG dùng api.kie.ai

const UPLOAD_BASE = 'https://kieai.redpandaai.co';
const UPLOAD_URL = `${UPLOAD_BASE}/api/file-base64-upload`;

interface UploadResponse {
  success?: boolean;
  code?: number;
  msg?: string;
  data?: {
    downloadUrl?: string;
    fileUrl?: string;
    fileName?: string;
    mimeType?: string;
  };
}

function extFromMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

async function readJsonOrThrow(res: Response, label: string): Promise<UploadResponse> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${label}: phản hồi trống (${res.status}).`);
  }
  if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
    throw new Error(
      `${label}: server trả HTML thay vì JSON (${res.status}) — kiểm tra URL upload / API key.`,
    );
  }
  try {
    return JSON.parse(trimmed) as UploadResponse;
  } catch {
    throw new Error(`${label}: không parse được JSON (${res.status}): ${trimmed.slice(0, 120)}`);
  }
}

/** Upload ảnh base64 lên Kie temp storage → URL công khai cho image_urls */
export async function uploadKieImageBase64(params: {
  apiKey: string;
  base64: string;
  mimeType: string;
  fileName?: string;
  /** Thư mục upload trên Kie temp storage — Veo truyền 'veo-scenes'; 'master-cast' là default cũ còn giữ làm fallback */
  uploadPath?: string;
}): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new Error('Thiếu API Key để upload ảnh.');

  const pure = params.base64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!pure) throw new Error('Ảnh trống — không upload được.');

  const mime = params.mimeType.trim() || 'image/png';
  const dataUrl = `data:${mime};base64,${pure}`;
  const uploadPath = params.uploadPath?.trim() || 'master-cast';
  const fileName = params.fileName?.trim() || `${uploadPath}-${Date.now()}.${extFromMime(mime)}`;

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Data: dataUrl,
      uploadPath,
      fileName,
    }),
  });

  const data = await readJsonOrThrow(res, 'Upload ảnh');
  const url = data.data?.downloadUrl?.trim() || data.data?.fileUrl?.trim();

  if (!res.ok || data.success === false || data.code !== 200 || !url) {
    throw new Error(data.msg ?? `Upload ảnh lỗi (${res.status})`);
  }

  console.log('[kie/upload] OK:', {
    uploadPath,
    fileName: data.data?.fileName,
    urlPreview: `${url.slice(0, 80)}…`,
  });

  return url;
}
