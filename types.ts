
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string; // Base64 string or URL for generated images
  audio?: string; // Base64 string for audio (TTS)
  isError?: boolean;
  choices?: string[]; // Parsed interactive choices
  stateUpdates?: {
    flags?: string[];
    relations?: string[];
    inventory?: string[];
  };
}

export interface ChatSession {
  id: string;
  messages: Message[];
  lastUpdated: number;
}

export enum ModelType {
  TEXT = 'gemini-2.5-flash',
  IMAGE = 'gemini-2.5-flash-image'
}

export interface CharacterStats {
  strength: number;
  intelligence: number;
  charisma: number;
  endurance: number;
  luck: number;
}

export interface CharacterProfile {
  name: string;
  appearance: string;
  stats: CharacterStats;
}

export type BackgroundLayer = {
  url: string;
  type: 'image';
};

export interface Hotspot {
  id: string;
  label: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  action: string;
}

export interface GameSettings {
  godMode: boolean;        // Max stats, force success
  maxCompliance: boolean;  // NPCs obey everything
  nsfwUnlocked: boolean;   // Explicit intent flag
}

export interface NpcRelation {
  love: number;
  lust: number;
  submission: number;
}

export interface GameState {
  flags: string[];
  relationships: Record<string, NpcRelation>;
  inventory: string[];
  activeQuests: string[];
}
