import type { Character, CreateCharacterInput } from '../types';

const store: Character[] = [];

export const characterService = {
  list(): Character[] {
    return store;
  },

  create(input: CreateCharacterInput): Character {
    const now = new Date().toISOString();
    const character: Character = {
      id: crypto.randomUUID(),
      name: input.name,
      role: input.role ?? '',
      traits: input.traits ?? '',
      outfit: input.outfit ?? '',
      description: input.description ?? '',
      style: input.style,
      createdAt: now,
      updatedAt: now,
    };
    store.push(character);
    return character;
  },

  getById(id: string): Character | undefined {
    return store.find((c) => c.id === id);
  },
};
