// Core game types
export type Language = 'zh' | 'en';
export type MapProvider = 'cartodb' | 'cartodb-dark' | 'osm' | 'amap';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type View = 'lobby' | 'game';

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface Street {
  name: string;
  guessed: boolean;
  geometry?: number[][];
}

export interface HistoryEntry {
  id: number;
  map_name: string;
  score: number;
  total_streets: number;
  completion_rate: number;
  max_streak: number;
  played_at: string;
}

export interface Favorite {
  id: number;
  name: string;
  cityName?: string;
  bounds: Bounds;
}

export interface HintClue {
  name: string;
  pattern: string;
  geom?: number[][];
}

export interface Achievement {
  id: string;
  name: string;
  nameCn: string;
  description: string;
  threshold: number;
  tier: 'bronze' | 'silver' | 'gold';
}

export interface Preset {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  bounds: Bounds;
  zoom: number;
  center: [number, number];
}
