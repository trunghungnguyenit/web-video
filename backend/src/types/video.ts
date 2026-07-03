export type VideoProjectStatus = 'draft' | 'processing' | 'completed' | 'failed';

export interface VideoProject {
  id: string;
  title: string;
  script: string;
  language: string;
  duration: string;
  videoType: string;
  voice: string;
  characterId?: string;
  status: VideoProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoProjectInput {
  title?: string;
  script: string;
  language?: string;
  duration?: string;
  videoType?: string;
  voice?: string;
  characterId?: string;
}
