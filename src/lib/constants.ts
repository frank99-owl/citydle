import { Bounds, Street, Achievement, Preset } from '@/types';

// Preset financial center bounding boxes
export const PRESETS: Preset[] = [
  {
    id: 'new-york',
    name: '纽约 New York',
    subtitle: 'Wall Street / Financial District',
    emoji: '🗽',
    bounds: { south: 40.6981, west: -74.0201, north: 40.7209, east: -73.9977 },
    zoom: 15,
    center: [40.7074, -74.0113] as [number, number],
  },
  {
    id: 'london',
    name: '伦敦 London',
    subtitle: 'City of London',
    emoji: '🎡',
    bounds: { south: 51.5074, west: -0.1000, north: 51.5215, east: -0.0750 },
    zoom: 15,
    center: [51.5155, -0.0922] as [number, number],
  },
  {
    id: 'tokyo',
    name: '东京 Tokyo',
    subtitle: 'Marunouchi / Nihonbashi',
    emoji: '🗼',
    bounds: { south: 35.6750, west: 139.7600, north: 35.6880, east: 139.7800 },
    zoom: 15,
    center: [35.6811, 139.7670] as [number, number],
  },
  {
    id: 'hong-kong',
    name: '香港 Hong Kong',
    subtitle: 'Central District',
    emoji: '🌆',
    bounds: { south: 22.2750, west: 114.1500, north: 22.2900, east: 114.1700 },
    zoom: 15,
    center: [22.2830, 114.1588] as [number, number],
  },
  {
    id: 'singapore',
    name: '新加坡 Singapore',
    subtitle: 'Downtown Core',
    emoji: '🦁',
    bounds: { south: 1.2750, west: 103.8400, north: 1.2950, east: 103.8600 },
    zoom: 15,
    center: [1.2850, 103.8502] as [number, number],
  },
];

// Re-export types for backward compatibility
export type { Bounds, Street, Achievement };

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    nameCn: '探索者',
    description: '猜中 10% 的街道',
    threshold: 0.1,
    tier: 'bronze',
  },
  {
    id: 'navigator',
    name: 'Navigator',
    nameCn: '领航员',
    description: '猜中 50% 的街道',
    threshold: 0.5,
    tier: 'silver',
  },
  {
    id: 'cartographer',
    name: 'Cartographer Master',
    nameCn: '制图大师',
    description: '猜中 80% 以上的街道',
    threshold: 0.8,
    tier: 'gold',
  },
];
