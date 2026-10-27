// 线索 6:所在大洲。纯 JS(.mjs):游戏、make-prototype.mjs、盲测页和 vitest 共用。
// 原先给「国家 + 首字母」,6 个候选里很少有同国或同首字母的城市,98% 的题第 6 层直接给出答案;
// 只给大洲时降到 27%,平均还剩 2.56 个候选(第 201–300 期)。

export const CONTINENTS = {
  europe: { cn: "欧洲", en: "Europe" },
  asia: { cn: "亚洲", en: "Asia" },
  africa: { cn: "非洲", en: "Africa" },
  northAmerica: { cn: "北美洲", en: "North America" },
  southAmerica: { cn: "南美洲", en: "South America" },
  oceania: { cn: "大洋洲", en: "Oceania" },
};

/** 国家英文名(与 index.json 的 country.en 一致)→ 大洲。城市库新增国家时补一行,测试会提醒 */
const BY_COUNTRY = {
  Austria: "europe",
  Belgium: "europe",
  Czechia: "europe",
  Denmark: "europe",
  France: "europe",
  Germany: "europe",
  Greece: "europe",
  Hungary: "europe",
  Ireland: "europe",
  Italy: "europe",
  Netherlands: "europe",
  Norway: "europe",
  Poland: "europe",
  Portugal: "europe",
  // 库里的俄罗斯城市(莫斯科、圣彼得堡)都在欧洲部分
  Russia: "europe",
  Spain: "europe",
  Sweden: "europe",
  Switzerland: "europe",
  // 库里唯一的土耳其城市是伊斯坦布尔,取景的老城与贝伊奥卢都在欧洲一侧
  Türkiye: "europe",
  UK: "europe",
  China: "asia",
  India: "asia",
  Indonesia: "asia",
  Israel: "asia",
  Japan: "asia",
  Malaysia: "asia",
  Singapore: "asia",
  "South Korea": "asia",
  Thailand: "asia",
  UAE: "asia",
  Vietnam: "asia",
  Egypt: "africa",
  Morocco: "africa",
  Nigeria: "africa",
  "South Africa": "africa",
  Tunisia: "africa",
  Canada: "northAmerica",
  Cuba: "northAmerica",
  Mexico: "northAmerica",
  USA: "northAmerica",
  Argentina: "southAmerica",
  Brazil: "southAmerica",
  Chile: "southAmerica",
  Colombia: "southAmerica",
  Peru: "southAmerica",
  Australia: "oceania",
  "New Zealand": "oceania",
};

/**
 * @param {string} countryEn
 * @returns {{ cn: string, en: string } | null} 未收录的国家返回 null(提示不显示,而不是显示错的)
 */
export function continentOf(countryEn) {
  const key = BY_COUNTRY[countryEn];
  return key ? CONTINENTS[key] : null;
}
