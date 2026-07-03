import type { CreateSceneInput, Scene } from '../types';

const store: Scene[] = [];

export const sceneService = {
  listByProject(projectId: string): Scene[] {
    return store.filter((s) => s.projectId === projectId).sort((a, b) => a.order - b.order);
  },

  create(input: CreateSceneInput): Scene {
    const now = new Date().toISOString();
    const order = store.filter((s) => s.projectId === input.projectId).length + 1;
    const duration = input.duration ?? 5;

    const scene: Scene = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      order,
      prompt: input.prompt,
      voice: input.voice ?? '',
      duration,
      status: 'pending',
      startTime: '00:00:00',
      endTime: '00:00:05',
      createdAt: now,
      updatedAt: now,
    };
    store.push(scene);
    return scene;
  },

  regenerate(id: string): Scene | undefined {
    const scene = store.find((s) => s.id === id);
    if (!scene) return undefined;
    scene.status = 'generating';
    scene.updatedAt = new Date().toISOString();
    scene.status = 'success';
    return scene;
  },
};
