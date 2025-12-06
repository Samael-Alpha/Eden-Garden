export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string; // Base64 string or URL for generated images
  video?: string; // URL for generated video
  audio?: string; // Base64 string for audio (TTS)
  isError?: boolean;
  choices?: string[]; // Parsed interactive choices
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
  type: 'image' | 'video';
};

export interface GameSettings {
  godMode: boolean;        // Max stats, force success
  maxCompliance: boolean;  // NPCs obey everything
  nsfwUnlocked: boolean;   // Explicit intent flag
}