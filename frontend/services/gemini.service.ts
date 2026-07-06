import { apiService } from './api';
import type { AnalyzePipelineRequest, VeoInput, TtsInput } from '@/lib/pipeline-payload';

export type { AnalyzePipelineRequest, GeminiInput, VeoInput, TtsInput } from '@/lib/pipeline-payload';

export interface GeminiScene {
  id: number;
  durationSeconds: number;
  visual: string;
  voiceover: string;
}

export interface VideoScript {
  title: string;
  scenes: GeminiScene[];
}

export interface AnalyzeScriptResponse {
  script: VideoScript;
  veoInput: VeoInput;
  ttsInput: TtsInput;
}

class GeminiService {
  /** POST /api/gemini/analyze — bước 1 pipeline (Gemini), kèm veoInput/ttsInput cho bước sau */
  async analyzeScript(payload: AnalyzePipelineRequest): Promise<AnalyzeScriptResponse> {
    return apiService.post('/api/gemini/analyze', payload) as Promise<AnalyzeScriptResponse>;
  }
}

export const geminiService = new GeminiService();
