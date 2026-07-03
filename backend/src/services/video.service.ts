import type { CreateVideoProjectInput, VideoProject } from '../types';

const store: VideoProject[] = [];

export const videoService = {
  list(): VideoProject[] {
    return store;
  },

  create(input: CreateVideoProjectInput): VideoProject {
    const now = new Date().toISOString();
    const project: VideoProject = {
      id: crypto.randomUUID(),
      title: input.title ?? 'Untitled Project',
      script: input.script,
      language: input.language ?? 'Tiếng Việt',
      duration: input.duration ?? '5 - 10 phút',
      videoType: input.videoType ?? 'Kể chuyện',
      voice: input.voice ?? 'Giọng nam - tự nhiên',
      characterId: input.characterId,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    store.push(project);
    return project;
  },

  getById(id: string): VideoProject | undefined {
    return store.find((p) => p.id === id);
  },
};
