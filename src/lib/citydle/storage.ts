// localStorage 持久化:当日成绩(防重玩)+ 累计统计(streak / 分布)。
// 全部带 try/catch —— 隐私模式或被禁用时游戏照常玩,只是不记录。
export interface DayRecord {
  day: number;
  won: boolean;
  /** 猜中时用到第几条线索;未猜中为 7 */
  level: number;
  answerId: string;
}

export interface Stats {
  games: number;
  wins: number;
  /** dist[i] = 用 i+1 条线索猜中的次数 */
  dist: number[];
  streak: number;
  maxStreak: number;
  /** 最近一次完成(无论输赢)的期数 */
  lastDay: number;
}

const KEY_DAY = "citydle_day";
const KEY_STATS = "citydle_stats";
const KEY_LANG = "citydle_lang";

const EMPTY_STATS: Stats = { games: 0, wins: 0, dist: [0, 0, 0, 0, 0, 0], streak: 0, maxStreak: 0, lastDay: 0 };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 不可用就不记录 */
  }
}

export function loadDayRecord(day: number): DayRecord | null {
  const rec = read<DayRecord>(KEY_DAY);
  return rec && rec.day === day ? rec : null;
}

export function loadStats(): Stats {
  return { ...EMPTY_STATS, ...(read<Stats>(KEY_STATS) || {}) };
}

/** 记录当日结果并更新累计统计(每期只会被调用一次) */
export function saveResult(day: number, won: boolean, level: number, answerId: string): Stats {
  write(KEY_DAY, { day, won, level, answerId } satisfies DayRecord);
  const s = loadStats();
  s.games += 1;
  if (won) {
    s.wins += 1;
    if (level >= 1 && level <= 6) s.dist[level - 1] += 1;
    s.streak = s.lastDay === day - 1 ? s.streak + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
  } else {
    s.streak = 0;
  }
  s.lastDay = day;
  write(KEY_STATS, s);
  return s;
}

export function loadLang(): "zh" | "en" {
  try {
    const v = localStorage.getItem(KEY_LANG);
    if (v === "zh" || v === "en") return v;
    return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "zh";
  }
}
export function saveLang(lang: "zh" | "en") {
  try {
    localStorage.setItem(KEY_LANG, lang);
  } catch {
    /* noop */
  }
}
