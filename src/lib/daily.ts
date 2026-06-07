import { PRESETS } from "@/lib/constants";

export interface DailyChallenge {
  date: string;
  presetIndex: number;
  presetId: string;
  bounds: { north: number; south: number; east: number; west: number };
  cityName: string;
  cityNameEn: string;
  difficulty: "easy" | "medium" | "hard";
}

export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function generateDailyChallenge(dateStr: string): DailyChallenge {
  // Simple hash from date string
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  hash = Math.abs(hash);

  const presetIndex = hash % PRESETS.length;
  const preset = PRESETS[presetIndex];
  const difficulties: Array<"easy" | "medium" | "hard"> = [
    "easy",
    "medium",
    "hard",
  ];
  const diffIndex = (hash >> 3) % difficulties.length;

  const nameParts = preset.name.split(" ");
  const cityNameZh = nameParts[0];
  const cityNameEn = nameParts.slice(1).join(" ") || preset.name;

  return {
    date: dateStr,
    presetIndex,
    presetId: preset.id,
    bounds: preset.bounds,
    cityName: cityNameZh,
    cityNameEn,
    difficulty: difficulties[diffIndex],
  };
}
