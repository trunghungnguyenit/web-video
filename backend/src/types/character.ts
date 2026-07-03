export interface Character {
  id: string;
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterInput {
  name: string;
  role?: string;
  traits?: string;
  outfit?: string;
  description?: string;
  style?: string;
}
