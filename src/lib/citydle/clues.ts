// 线索分层:6 层全部来自真实 OSM 数据,没有的层就不出现,绝不编造。
//   1 骨架剪影 → 2 +水系海岸 → 3 +次干路网 → 4 +完整路网 → 5 +一条街名 → 6 +国家首字母
import type { CityData, Seg } from "./types";

/**
 * 线索 1 骨架层最低总长。干道不足 30km 的城市(旧金山、威尼斯…)按
 * streets 原有排序(tier 升序、km 降序)补足真实街道 —— 只做选取,不编造,
 * 否则第一条线索近乎空白,违反「难度来自用了几条线索」的设计。
 */
export const SKELETON_MIN_KM = 30;

export interface ClueLayers {
  skeleton: Seg[];
  t2: Seg[];
  t3: Seg[];
  water: Seg[];
  coast: Seg[];
  /** 线索 5:最长干道的名字 + 标注点(最长段中点) */
  nameStreet: { name: string; at: [number, number] } | null;
}

export function buildClueLayers(city: CityData): ClueLayers {
  const t2: Seg[] = [];
  const t3: Seg[] = [];
  for (const s of city.streets) {
    if (s.tier === 2) t2.push(...s.segments);
    else if (s.tier === 3) t3.push(...s.segments);
  }

  let skelKm = 0;
  for (const s of city.streets) if (s.tier === 1) skelKm += s.km;
  const skeleton: Seg[] = [];
  for (const s of city.streets) {
    if (s.tier !== 1) {
      if (skelKm >= SKELETON_MIN_KM) break;
      skelKm += s.km;
    }
    skeleton.push(...s.segments);
  }

  const ns = city.streets[0];
  let nameStreet: ClueLayers["nameStreet"] = null;
  if (ns && ns.segments.length) {
    const longest = [...ns.segments].sort((a, b) => b.length - a.length)[0];
    nameStreet = { name: ns.name, at: longest[Math.floor(longest.length / 2)] };
  }

  return { skeleton, t2, t3, water: city.water, coast: city.coastline, nameStreet };
}
