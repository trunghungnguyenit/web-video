const VOICE_PREVIEW_SAMPLES: Record<string, string> = {
  vi: 'Xin chào! Đây là giọng đọc mẫu. Bạn có thể nghe thử trước khi chọn.',
  en: 'Hello! This is a sample voice. You can preview before selecting.',
  zh: '你好！这是示例语音，您可以试听后再选择。',
  ja: 'こんにちは。これはサンプル音声です。選択前に試聴できます。',
};

export function getVoicePreviewText(language: string): string {
  return VOICE_PREVIEW_SAMPLES[language] ?? VOICE_PREVIEW_SAMPLES.en;
}

export function voicePreviewCacheKey(voice: string, language: string, voiceSpeed: number): string {
  return `${voice}:${language}:${voiceSpeed}`;
}
