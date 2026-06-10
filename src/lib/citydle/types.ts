// Citydle 核心类型 — 与 public/cities/*.json(fetch-cities.mjs 产物)严格对应

/** 一段真实道路/水系折线,[lat, lng] 列表 */
export type Seg = [number, number][];

export interface Bbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface Street {
  name: string;
  /** 1=干道 2=次干 3=毛细(管线按 OSM highway 等级映射) */
  tier: 1 | 2 | 3;
  km: number;
  segments: Seg[];
}

export interface CityData {
  id: string;
  cn: string;
  en: string;
  feature: string;
  bbox: Bbox;
  /** 已按 tier 升序、km 降序排序(管线保证) */
  streets: Street[];
  water: Seg[];
  coastline: Seg[];
}

export interface CityIndexEntry {
  id: string;
  cn: string;
  en: string;
}

export interface Morph {
  /** 网格度 0–1(街道方向熵,Boeing 方法),1=纯正交网格 */
  grid: number;
  water: "coast" | "river" | "inland";
}

export type Morphology = Record<string, Morph>;
