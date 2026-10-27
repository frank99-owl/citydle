// render-clues.mjs — 按玩家实际看到的样子，把每座城的 6 层线索渲成 PNG，供逐题审题。
// 直接复用游戏源码 src/lib/citydle/{clues,render}.ts（Node 剥离类型后注入真 Chromium 跑 drawClue），
// 不另写一套绘制逻辑；出题顺序与候选来自 daily.ts，与线上第 1–N 期一致。
// 输出: prototype/audit/clues/<id>-L<1..6>.png、prototype/audit/days.json、prototype/audit/index.html
// 用法: PLAYWRIGHT_DIR=<装了 playwright 的目录> node render-clues.mjs   (需 Node ≥ 23.6，Playwright 不是本仓库依赖)
//       CHROMIUM_PATH=<浏览器可执行文件> 可选，Playwright 版本与缓存浏览器不匹配时用
import fs from "fs";
import { createRequire, stripTypeScriptTypes } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { pickAnswerId, pickCandidates } from "./src/lib/citydle/daily.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "public", "cities");
const OUT = path.join(__dirname, "prototype", "audit");
const IMG = path.join(OUT, "clues");
fs.mkdirSync(IMG, { recursive: true });

// 画布取 520×520 CSS 像素：drawClue 的线宽系数 k = min(W,H)/520 正好为 1，即手机竖屏的基准观感
const SIZE = 520;
const DPR = 2;

const require = createRequire(
  process.env.PLAYWRIGHT_DIR ? path.join(process.env.PLAYWRIGHT_DIR, "noop.js") : import.meta.url,
);
const { chromium } = require("playwright");

const src = (f) =>
  stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, "src/lib/citydle", f), "utf8")).replace(
    /^export /gm,
    "",
  );
const lib = `${src("clues.ts")}\n${src("render.ts")}\nwindow.__citydle = { buildClueLayers, drawClue };`;

const index = JSON.parse(fs.readFileSync(path.join(DIR, "index.json")));
const morphology = JSON.parse(fs.readFileSync(path.join(DIR, "morphology.json")));
const ids = index.map((c) => c.id);

// 第 1..N 期：一轮恰好覆盖全库，每城出现一次
const days = [];
for (let day = 1; day <= ids.length; day++) {
  const answer = pickAnswerId(ids, day);
  const cands = pickCandidates(index, morphology, answer, day).map((c) => c.id);
  days.push({ day, answer, candidates: cands });
}
fs.writeFileSync(path.join(OUT, "days.json"), JSON.stringify(days, null, 1));

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: DPR,
});
await page.setContent(
  `<html><body style="margin:0;background:#14100c"><canvas id="c" style="display:block;width:${SIZE}px;height:${SIZE}px"></canvas></body></html>`,
);
await page.addScriptTag({ type: "module", content: lib });
await page.waitForFunction(() => window.__citydle);

for (const entry of index) {
  const city = JSON.parse(fs.readFileSync(path.join(DIR, `${entry.id}.json`)));
  // 与 Game.tsx 的英文界面同一文案：t.countryHint(country.en, answer.en[0])
  const hint = `Hint: ${entry.country.en} · starts with ${entry.en[0]}`;
  for (let level = 1; level <= 6; level++) {
    const dataUrl = await page.evaluate(
      ({ city, level, hint }) => {
        const cv = document.getElementById("c");
        const layers = window.__citydle.buildClueLayers(city);
        window.__citydle.drawClue(cv, city.bbox, layers, level, { countryHint: hint });
        return cv.toDataURL("image/png");
      },
      { city, level, hint },
    );
    fs.writeFileSync(
      path.join(IMG, `${entry.id}-L${level}.png`),
      Buffer.from(dataUrl.split(",")[1], "base64"),
    );
  }
  process.stdout.write(".");
}
await browser.close();

const byId = Object.fromEntries(index.map((c) => [c.id, c]));
const m = (id) => morphology[id] || { grid: "?", water: "?" };
const rows = days
  .map(({ day, answer, candidates }) => {
    const levels = [1, 2, 3, 4, 5, 6]
      .map((l) => `<figure><img loading="lazy" src="clues/${answer}-L${l}.png"><figcaption>L${l}</figcaption></figure>`)
      .join("");
    const cands = candidates
      .map((id) => {
        const tag = id === answer ? " ans" : "";
        return `<figure class="cand${tag}"><img loading="lazy" src="clues/${id}-L4.png"><figcaption>${byId[id].en}<br><small>${m(id).water} · grid ${m(id).grid}</small></figcaption></figure>`;
      })
      .join("");
    return `<section><h2>Day ${day} · ${byId[answer].en} <small>${byId[answer].country.en}</small></h2><div class="lv">${levels}</div><div class="cands">${cands}</div></section>`;
  })
  .join("\n");

fs.writeFileSync(
  path.join(OUT, "index.html"),
  `<!doctype html><html><head><meta charset="utf-8"><title>Citydle clue audit</title><style>
body{background:#0d0905;color:#d8c5a0;font-family:Georgia,serif;padding:16px}
h2{color:#e6c178;font-size:16px;margin:24px 0 8px} small{color:#8a7756}
.lv,.cands{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.cands{margin-top:6px} figure{margin:0} img{width:100%;display:block;border-radius:4px}
figcaption{font-size:11px;text-align:center;margin-top:2px}
.cand{opacity:.85} .cand.ans{outline:2px solid #e6c178;opacity:1}
</style></head><body><h1>Citydle clue audit — days 1–${days.length}</h1>
<p>Row 1: the answer at clue levels 1–6, rendered by the game's own drawClue. Row 2: that day's 6 candidates at level 4 (answer outlined).</p>
${rows}</body></html>`,
);
console.log(`\n${index.length * 6} images → ${path.relative(__dirname, IMG)}`);
