import { Bounds, Street, Achievement, Preset } from "@/types";

// Preset financial center bounding boxes
export const PRESETS: Preset[] = [
  {
    id: "new-york",
    name: "纽约 New York",
    subtitle: "Wall Street / Financial District",
    emoji: "🗽",
    bounds: { south: 40.6981, west: -74.0201, north: 40.7209, east: -73.9977 },
    zoom: 15,
    center: [40.7074, -74.0113] as [number, number],
  },
  {
    id: "london",
    name: "伦敦 London",
    subtitle: "City of London",
    emoji: "🎡",
    bounds: { south: 51.5074, west: -0.1, north: 51.5215, east: -0.075 },
    zoom: 15,
    center: [51.5155, -0.0922] as [number, number],
  },
  {
    id: "tokyo",
    name: "东京 Tokyo",
    subtitle: "Marunouchi / Nihonbashi",
    emoji: "🗼",
    bounds: { south: 35.675, west: 139.76, north: 35.688, east: 139.78 },
    zoom: 15,
    center: [35.6811, 139.767] as [number, number],
  },
  {
    id: "hong-kong",
    name: "香港 Hong Kong",
    subtitle: "Central District",
    emoji: "🌆",
    bounds: { south: 22.275, west: 114.15, north: 22.29, east: 114.17 },
    zoom: 15,
    center: [22.283, 114.1588] as [number, number],
  },
  {
    id: "singapore",
    name: "新加坡 Singapore",
    subtitle: "Downtown Core",
    emoji: "🦁",
    bounds: { south: 1.275, west: 103.84, north: 1.295, east: 103.86 },
    zoom: 15,
    center: [1.285, 103.8502] as [number, number],
  },
];

// Re-export types for backward compatibility
export type { Bounds, Street, Achievement };

export const ACHIEVEMENTS: Achievement[] = [
  // === Progress 系列 ===
  {
    id: "explorer",
    name: "Explorer",
    nameCn: "探索者",
    description: "猜中 10% 的街道",
    threshold: 0.1,
    tier: "bronze",
  },
  {
    id: "navigator",
    name: "Navigator",
    nameCn: "领航员",
    description: "猜中 50% 的街道",
    threshold: 0.5,
    tier: "silver",
  },
  {
    id: "cartographer",
    name: "Cartographer Master",
    nameCn: "制图大师",
    description: "猜中 80% 以上的街道",
    threshold: 0.8,
    tier: "gold",
  },

  // === City Master 系列 ===
  {
    id: "ny-master",
    name: "Wall Street Master",
    nameCn: "华尔街征服者",
    description: "Complete New York 100%",
    threshold: 1.0,
    tier: "gold",
    city: "new-york",
  },
  {
    id: "london-master",
    name: "London Expert",
    nameCn: "伦敦通",
    description: "Complete London 100%",
    threshold: 1.0,
    tier: "gold",
    city: "london",
  },
  {
    id: "tokyo-master",
    name: "Tokyo Master",
    nameCn: "东京达人",
    description: "Complete Tokyo 100%",
    threshold: 1.0,
    tier: "gold",
    city: "tokyo",
  },
  {
    id: "hk-master",
    name: "Hong Kong Elite",
    nameCn: "港岛精英",
    description: "Complete Hong Kong 100%",
    threshold: 1.0,
    tier: "gold",
    city: "hong-kong",
  },
  {
    id: "sg-master",
    name: "Singapore Pro",
    nameCn: "狮城行家",
    description: "Complete Singapore 100%",
    threshold: 1.0,
    tier: "gold",
    city: "singapore",
  },

  // === Skill 技能系列 ===
  {
    id: "streak-20",
    name: "Streak Master",
    nameCn: "连击大师",
    description: "Achieve 20+ streak",
    threshold: 20,
    tier: "gold",
    type: "streak",
  },
  {
    id: "speed-5",
    name: "Lightning Hand",
    nameCn: "闪电手",
    description: "Guess 5 streets in 30 seconds",
    threshold: 5,
    tier: "silver",
    type: "speed",
  },
  {
    id: "perfect",
    name: "Sharpshooter",
    nameCn: "精准射手",
    description: "Complete with zero errors",
    threshold: 0,
    tier: "gold",
    type: "perfect",
  },

  // === Exploration 探索系列 ===
  {
    id: "explorer-10",
    name: "Pathfinder",
    nameCn: "探路者",
    description: "Use custom area 10 times",
    threshold: 10,
    tier: "silver",
    type: "custom",
  },
  {
    id: "city-hunter",
    name: "City Hunter",
    nameCn: "城市猎人",
    description: "Search 20 different cities",
    threshold: 20,
    tier: "gold",
    type: "search",
  },
];
