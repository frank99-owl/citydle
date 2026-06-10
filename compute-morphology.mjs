// compute-morphology.mjs — 从城市库计算每城形态指标,驱动干扰项分组(主难度旋钮)。
// grid:街道方向熵的网格度(Boeing street-orientation 方法),1=纯正交网格,0=方向均匀分布
// water:'coast'(海岸主导)| 'river'(河/运河主导)| 'inland'(基本无水)
// 纯几何统计,零 LLM、零人工标注。输出 public/cities/morphology.json。
// 用法: node compute-morphology.mjs   (每次重跑 fetch-cities.mjs 后执行)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "public", "cities");
const BINS = 18; // 10° 一档,方向按无向处理(0–180°)

function segKm(seg, cosLat, from, to) {
  const dLat = (to[0] - from[0]) * 111;
  const dLng = (to[1] - from[1]) * 111 * cosLat;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "index.json" && f !== "morphology.json");
const out = {};
for (const f of files.sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f)));
  const cosLat = Math.cos(((d.bbox.south + d.bbox.north) / 2 / 180) * Math.PI);

  // 方向直方图:每条边按长度加权,角度归到 0–180°
  const hist = new Array(BINS).fill(0);
  let streetKm = 0;
  for (const s of d.streets) {
    for (const seg of s.segments) {
      for (let i = 1; i < seg.length; i++) {
        const dy = (seg[i][0] - seg[i - 1][0]) * 111;
        const dx = (seg[i][1] - seg[i - 1][1]) * 111 * cosLat;
        const km = Math.sqrt(dx * dx + dy * dy);
        if (!km) continue;
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        deg = ((deg % 180) + 180) % 180;
        hist[Math.min(BINS - 1, Math.floor(deg / (180 / BINS)))] += km;
        streetKm += km;
      }
    }
  }
  let H = 0;
  for (const v of hist) {
    if (!v) continue;
    const p = v / streetKm;
    H -= p * Math.log(p);
  }
  // Boeing φ:H ∈ [ln2(纯网格两正交向), ln BINS(完全均匀)] → 归一并平方拉开区分度
  const Hmin = Math.log(2), Hmax = Math.log(BINS);
  const grid = +Math.pow(1 - (H - Hmin) / (Hmax - Hmin), 2).toFixed(3);

  let waterKm = 0, coastKm = 0;
  for (const seg of d.water) for (let i = 1; i < seg.length; i++) waterKm += segKm(seg, cosLat, seg[i - 1], seg[i]);
  for (const seg of d.coastline) for (let i = 1; i < seg.length; i++) coastKm += segKm(seg, cosLat, seg[i - 1], seg[i]);
  const water = coastKm > 3 ? "coast" : waterKm > 5 ? "river" : "inland";

  out[d.id] = { grid, water, streetKm: +streetKm.toFixed(1), waterKm: +waterKm.toFixed(1), coastKm: +coastKm.toFixed(1) };
}

fs.writeFileSync(path.join(DIR, "morphology.json"), JSON.stringify(out, null, 2));
console.log("id".padEnd(16), "grid".padStart(6), "water".padStart(7), "街km".padStart(8), "水km".padStart(7), "岸km".padStart(7));
for (const [id, m] of Object.entries(out))
  console.log(id.padEnd(16), String(m.grid).padStart(6), m.water.padStart(7), String(m.streetKm).padStart(8), String(m.waterKm).padStart(7), String(m.coastKm).padStart(7));
console.log("\n✓ 写入 public/cities/morphology.json(" + Object.keys(out).length + " 城)");
