// make-playtest.mjs — 生成盲测页:同一组题,每题两套候选(修正后的 φ / 修正前的旧指标),
// 测试者玩完拿到一段成绩码发回来,再用 playtest/report.mjs 汇总。
// 绘制与规则复用游戏源码(clues / render / daily / i18n,Node 剥离类型后内联),不另写一套。
// 输出: prototype/playtest/page.html(发布成 Artifact 用,不含文档骨架)、index.html(本地直接打开);
//       playtest/sets/<题集 id>.json(入库,汇总时用)
// 用法: node playtest/make-playtest.mjs   (需 Node ≥ 23.6)
import { execFileSync } from "child_process";
import fs from "fs";
import { stripTypeScriptTypes } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { dayNumber, morphDist, pickAnswerId, pickCandidates } from "../src/lib/citydle/daily.ts";
import { hashString } from "../src/lib/citydle/playtest.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const CITIES = path.join(ROOT, "public", "cities");
const OUT = path.join(ROOT, "prototype", "playtest");
fs.mkdirSync(OUT, { recursive: true });

/** 题数(不含热身)。5–10 人 × 12 题:每题两组各约 2–5 次,总体每组 30–60 次 */
const N = 12;
/** 修正 φ 之前的最后一个提交,旧指标的 morphology.json 从这里取 */
const LEGACY_REF = "fb6c6c4";
/** 未来这么多天的每日答案不进题集,免得测试者被剧透 */
const SPOILER_DAYS = 30;
/** 候选里随机 2 个的种子;固定,让同一题的两组只差在相似干扰项上 */
const SEED_DAY = 10000;

const read = (p) => JSON.parse(fs.readFileSync(p));
const index = read(path.join(CITIES, "index.json"));
const phiMorph = read(path.join(CITIES, "morphology.json"));
const legacyMorph = JSON.parse(
  execFileSync("git", ["show", `${LEGACY_REF}:public/cities/morphology.json`], { cwd: ROOT, encoding: "utf8" }),
);
const ids = index.map((c) => c.id);

const today = dayNumber();
const upcoming = new Set(Array.from({ length: SPOILER_DAYS }, (_, i) => pickAnswerId(ids, today + i)));

const similar = (m, a) =>
  index
    .filter((c) => c.id !== a)
    .sort((x, y) => morphDist(m[x.id], m[a]) - morphDist(m[y.id], m[a]) || x.id.localeCompare(y.id))
    .slice(0, 3)
    .map((c) => c.id);
const overlap = (a) => similar(phiMorph, a).filter((id) => similar(legacyMorph, a).includes(id)).length;

// 按 φ 从低到高切成 N 段,每段取两组相似干扰项差别最大的一座城(重合最少),覆盖老城到网格城
const pool = ids.filter((id) => !upcoming.has(id)).sort((a, b) => phiMorph[a].grid - phiMorph[b].grid || a.localeCompare(b));
const chosen = [];
for (let i = 0; i < N; i++) {
  const bin = pool.slice(Math.floor((i * pool.length) / N), Math.floor(((i + 1) * pool.length) / N));
  chosen.push([...bin].sort((a, b) => overlap(a) - overlap(b) || a.localeCompare(b))[0]);
}
// 热身题:剩下的城市里 φ 最接近中位数的一座,只教操作、不计分
const rest = pool.filter((id) => !chosen.includes(id));
const mid = phiMorph[pool[Math.floor(pool.length / 2)]].grid;
const warmup = [...rest].sort((a, b) => Math.abs(phiMorph[a].grid - mid) - Math.abs(phiMorph[b].grid - mid) || a.localeCompare(b))[0];

const armsFor = (id, seed) => ({
  phi: { candidates: pickCandidates(index, phiMorph, id, seed).map((c) => c.id), similar: similar(phiMorph, id) },
  legacy: { candidates: pickCandidates(index, legacyMorph, id, seed).map((c) => c.id), similar: similar(legacyMorph, id) },
});
const puzzles = chosen.map((id, i) => ({ id, grid: phiMorph[id].grid, legacyGrid: legacyMorph[id].grid, arms: armsFor(id, SEED_DAY + i) }));
const warm = { id: warmup, arms: armsFor(warmup, SEED_DAY + N) };
// 线索 6 给什么直接改变难度,算进题集 id:换了提示的页面收回来的成绩码不会和旧的混在一起
const CLUE6 = "continent";
const set = "s" + hashString(JSON.stringify({ puzzles, warm, clue6: CLUE6 })).toString(16);
// 题集按日期变(避开未来 30 天的答案),所以每份题集都入库:成绩码里带着题集 id,汇总时按 id 找回
const setJson = JSON.stringify({ set, createdFor: { day: today, legacyRef: LEGACY_REF, clue6: CLUE6 }, warmup: warm, puzzles }, null, 1);
fs.mkdirSync(path.join(HERE, "sets"), { recursive: true });
fs.writeFileSync(path.join(HERE, "sets", `${set}.json`), setJson + "\n");

// 页面只带答案城市的几何:候选只显示名字
const geometry = {};
for (const id of [warmup, ...chosen]) {
  const d = read(path.join(CITIES, `${id}.json`));
  geometry[id] = { bbox: d.bbox, streets: d.streets, water: d.water, coastline: d.coastline };
}
const names = Object.fromEntries(index.map((c) => [c.id, { cn: c.cn, en: c.en, country: c.country }]));
const DATA = { set, warmup: warm, puzzles: puzzles.map(({ id, arms }) => ({ id, arms })), names, geometry };

const strip = (f) => stripTypeScriptTypes(fs.readFileSync(path.join(ROOT, f), "utf8"), { mode: "strip" }).replace(/^export /gm, "");
const lib = ["src/lib/citydle/daily.ts", "src/lib/citydle/clues.ts", "src/lib/citydle/render.ts", "src/lib/citydle/i18n.ts", "src/lib/citydle/continents.mjs", "src/lib/citydle/playtest.mjs"]
  .map((f) => (f.endsWith(".mjs") ? fs.readFileSync(path.join(ROOT, f), "utf8").replace(/^export /gm, "") : strip(f)))
  .join("\n");

const css = fs.readFileSync(path.join(HERE, "app.css"), "utf8");
const markup = fs.readFileSync(path.join(HERE, "app.html"), "utf8");
const app = fs.readFileSync(path.join(HERE, "app.js"), "utf8");
// JSON 里的 "</" 会提前结束 <script>,转义掉
const json = JSON.stringify(DATA).replace(/<\//g, "<\\/");

const page = `<title>Citydle Playtest</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=IM+Fell+English:ital@0;1&display=swap">
<style>
${css}</style>
${markup}
<script>
(() => {
const DATA = ${json};
${lib}
${app}
})();
</script>
`;
fs.writeFileSync(path.join(OUT, "page.html"), page);
fs.writeFileSync(
  path.join(OUT, "index.html"),
  `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n${page}</body></html>\n`,
);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + " KB";
console.log(`set ${set} · day ${today} · warm-up ${warmup}`);
for (const p of puzzles) console.log(`  ${p.id.padEnd(16)} φ ${String(p.grid).padEnd(6)} similar φ [${p.arms.phi.similar}]  legacy [${p.arms.legacy.similar}]`);
console.log(`page.html ${kb(page)} → ${path.relative(ROOT, OUT)}`);
