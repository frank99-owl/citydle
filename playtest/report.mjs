// report.mjs — 把收到的盲测成绩码汇总成一页 Markdown。
// 用法: node playtest/report.mjs <codes.txt>
//   codes.txt 可以是直接粘贴的聊天记录,里面的 CTP1.… 成绩码会被自动找出来;
//   题集按成绩码里的 id 从 playtest/sets/ 读取,混进来的其他题集成绩码会单独计数、不进统计
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { decodeResult, extractCodes, summarize } from "../src/lib/citydle/playtest.mjs";

const SETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "sets");
const [codesPath] = process.argv.slice(2);
if (!codesPath) {
  console.error("用法: node playtest/report.mjs <codes.txt>");
  process.exit(1);
}

const results = [];
let bad = 0;
for (const code of extractCodes(fs.readFileSync(codesPath, "utf8"))) {
  try {
    results.push(decodeResult(code));
  } catch {
    bad++;
  }
}
if (!results.length) {
  console.error("没有找到可用的成绩码");
  process.exit(1);
}
// 以成绩码最多的那份题集为准
const counts = {};
for (const r of results) counts[r.set] = (counts[r.set] || 0) + 1;
const setId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
const puzzleSet = JSON.parse(fs.readFileSync(path.join(SETS, `${setId}.json`)));
const s = summarize(results, puzzleSet);

const f = (x, d = 2) => (x === null ? "–" : x.toFixed(d));
const pct = (x) => (x === null ? "–" : `${Math.round(x * 100)}%`);
const arm = (a) => `${a.plays} 次 · 平均第 ${f(a.meanLevel)} 条 · 胜率 ${pct(a.winRate)} · 选错 ${a.wrong} 次,其中相似干扰项 ${pct(a.similarShare)}`;

const rows = s.puzzles.map((p) => {
  const g = puzzleSet.puzzles.find((x) => x.id === p.id);
  return `| ${p.id} | ${g.grid} | ${p.phi.plays} | ${f(p.phi.meanLevel)} | ${pct(p.phi.similarShare)} | ${p.legacy.plays} | ${f(p.legacy.meanLevel)} | ${pct(p.legacy.similarShare)} | ${f(p.levelDelta)} |`;
});

console.log(`# Citydle 盲测汇总 · 题集 ${puzzleSet.set}

- 有效测试者 **${s.testers}** 人;其他题集的成绩码 ${s.skipped} 份未计入;无法解析 ${bad} 份
- **φ 组**:${arm(s.overall.phi)}
- **旧指标组**:${arm(s.overall.legacy)}
- 两组都有人玩的题 ${s.pairedPuzzles} 道,φ 组平均多用 **${f(s.meanPairedDelta)}** 条线索(正数 = φ 组更难)

怎么读:「第几条」越大越难,没认出来记作 7。「相似干扰项」是选错时选中了 3 个形态相近候选的比例,
乱选时约 60%;明显高于 60% 说明这组相似干扰项确实容易被认错。样本只有几个人时,单题数字只看方向。

| 城市 | φ | φ 组次数 | φ 组平均第几条 | φ 组选错中相似 | 旧组次数 | 旧组平均第几条 | 旧组选错中相似 | 差(φ − 旧) |
|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`);
