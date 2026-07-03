export type SceneStatus = 'pending' | 'generating' | 'success' | 'error';

export interface Scene {
  id: string;
  projectId: string;
  order: number;
  prompt: string;
  voice: string;
  duration: number;
  status: SceneStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSceneInput {
  projectId: string;
  prompt: string;
  voice?: string;
  duration?: number;
}
