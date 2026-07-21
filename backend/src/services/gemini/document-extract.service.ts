// ─── Trích xuất nội dung file tài liệu (tab "Từ file") ──────────────────────
// PDF: Gemini đọc trực tiếp qua inline_data (native document understanding) — không
// cần trích xuất. DOC/DOCX/TXT: Gemini không đọc trực tiếp được, phải trích xuất
// text trước rồi gộp vào "content" của prompt.

import WordExtractor from 'word-extractor';

const PDF_MIME = 'application/pdf';
const DOC_MIME = 'application/msword';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TXT_MIME = 'text/plain';

export interface ExtractedDocument {
  /** true → PDF, gửi thẳng inline_data cho Gemini, không có text trích sẵn */
  isPdf: boolean;
  /** Text đã trích xuất — chỉ có khi isPdf === false */
  text?: string;
}

function detectKind(mimeType: string, fileName?: string): 'pdf' | 'doc' | 'docx' | 'txt' {
  const name = fileName?.toLowerCase() ?? '';
  if (mimeType === PDF_MIME || name.endsWith('.pdf')) return 'pdf';
  if (mimeType === DOCX_MIME || name.endsWith('.docx')) return 'docx';
  if (mimeType === DOC_MIME || name.endsWith('.doc')) return 'doc';
  if (mimeType === TXT_MIME || name.endsWith('.txt')) return 'txt';
  throw new Error(
    `Định dạng file không hỗ trợ (${mimeType || fileName || 'không rõ'}) — chỉ hỗ trợ PDF, DOC, DOCX, TXT.`,
  );
}

/** PDF → báo hiệu gửi thẳng inline_data. DOC/DOCX/TXT → trích xuất text thật từ file. */
export async function extractDocument(params: {
  base64: string;
  mimeType: string;
  fileName?: string;
}): Promise<ExtractedDocument> {
  const kind = detectKind(params.mimeType, params.fileName);
  const buffer = Buffer.from(params.base64, 'base64');

  if (kind === 'pdf') {
    return { isPdf: true };
  }

  if (kind === 'txt') {
    const text = buffer.toString('utf-8').trim();
    if (!text) throw new Error(`File "${params.fileName ?? 'text'}" rỗng — không có nội dung để tạo kịch bản.`);
    return { isPdf: false, text };
  }

  // doc / docx — word-extractor hỗ trợ cả 2 định dạng, nhận thẳng Buffer (không cần ghi temp file)
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const text = doc.getBody().trim();
  if (!text) {
    throw new Error(`Không trích xuất được nội dung từ file "${params.fileName ?? 'đã upload'}" — file có thể rỗng hoặc bị lỗi định dạng.`);
  }
  return { isPdf: false, text };
}
