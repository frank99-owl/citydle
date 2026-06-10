// validate-cities.mjs — Citydle 城市库机器校验。每次重跑 fetch-cities.mjs 后必须跑一遍。
// 守住数据底线:画面上每一根线都是真实连续的路,几何有界,索引完整。
// 用法: node validate-cities.mjs        # 校验全部,exit 1 = 有错误
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "data", "cities");

// 单段内相邻两点间距阈值(km)。OSM 一条 way 内的节点很密,
// 超过 WARN 多半是稀疏直路/桥,超过 FAIL 基本可断定是拼接出来的假连线。
const GAP_WARN_KM = 0.8;
const GAP_FAIL_KM = 2.0;
// 几何裁切边界 = bbox 外扩 10%(与 fetch-cities.mjs 的 CLIP_MARGIN 一致),校验再放宽到 12% 容差
const BOUND_MARGIN = 0.12;
const MIN_STREETS_WARN = 50;

const errors = [], warnings = [];
const err = (city, msg) => errors.push(city + ": " + msg);
const warn = (city, msg) => warnings.push(city + ": " + msg);

function checkSegments(city, label, segments, bound, cosLat, gaps) {
  for (const seg of segments) {
    if (!Array.isArray(seg) || seg.length < 2) {
      err(city, label + " 存在少于 2 个点的段");
      continue;
    }
    for (let i = 0; i < seg.length; i++) {
      const [lat, lng] = seg[i];
      if (lat < bound.south || lat > bound.north || lng < bound.west || lng > bound.east) {
        err(city, label + " 越界点 [" + lat + "," + lng + "](裁切失效)");
        return; // 一个就够定位问题,不刷屏
      }
      if (i > 0) {
        const dLat = (lat - seg[i - 1][0]) * 111;
        const dLng = (lng - seg[i - 1][1]) * 111 * cosLat;
        const km = Math.sqrt(dLat * dLat + dLng * dLng);
        if (km > gaps.max) { gaps.max = km; gaps.where = label; }
      }
    }
  }
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "index.json");
if (!files.length) {
  console.error("data/cities/ 为空,先跑 node fetch-cities.mjs");
  process.exit(1);
}

const ids = [];
for (const f of files.sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f)));
  const city = d.id || f;
  ids.push(d.id);

  for (const k of ["id", "cn", "en", "bbox", "source", "license", "fetchedAt", "counts", "streets", "water", "coastline"]) {
    if (d[k] === undefined) err(city, "缺少字段 " + k);
  }
  if (d.id !== f.replace(".json", "")) err(city, "id 与文件名不一致: " + f);
  if (!d.bbox) continue;

  const mLat = (d.bbox.north - d.bbox.south) * BOUND_MARGIN;
  const mLng = (d.bbox.east - d.bbox.west) * BOUND_MARGIN;
  const bound = { south: d.bbox.south - mLat, north: d.bbox.north + mLat, west: d.bbox.west - mLng, east: d.bbox.east + mLng };
  const cosLat = Math.cos(((d.bbox.south + d.bbox.north) / 2 / 180) * Math.PI);
  const gaps = { max: 0, where: "" };

  if (d.counts.streets !== d.streets.length) err(city, "counts.streets=" + d.counts.streets + " ≠ 实际 " + d.streets.length);
  if (d.counts.water !== d.water.length) err(city, "counts.water=" + d.counts.water + " ≠ 实际 " + d.water.length);
  if (d.counts.coastline !== d.coastline.length) err(city, "counts.coastline=" + d.counts.coastline + " ≠ 实际 " + d.coastline.length);

  let t1 = 0;
  for (const s of d.streets) {
    if (!s.name) err(city, "存在无名街道");
    if (![1, 2, 3].includes(s.tier)) err(city, "街道 " + s.name + " tier 非法: " + s.tier);
    if (s.tier === 1) t1++;
    checkSegments(city, "街道[" + s.name + "]", s.segments || [], bound, cosLat, gaps);
  }
  checkSegments(city, "水系", d.water, bound, cosLat, gaps);
  checkSegments(city, "海岸线", d.coastline, bound, cosLat, gaps);

  if (gaps.max > GAP_FAIL_KM) err(city, "段内相邻点间距 " + gaps.max.toFixed(2) + "km @ " + gaps.where + "(疑似拼接假连线)");
  else if (gaps.max > GAP_WARN_KM) warn(city, "段内最大间距 " + gaps.max.toFixed(2) + "km @ " + gaps.where + "(检查是否稀疏桥段)");
  if (d.streets.length < MIN_STREETS_WARN) warn(city, "街道仅 " + d.streets.length + " 条,辨识度可能不足");
  if (t1 === 0) warn(city, "没有 tier 1 干道,线索 1「主干道剪影」会是空白");
}

// index.json 完整性:必须与磁盘文件一一对应
const idxPath = path.join(DIR, "index.json");
if (!fs.existsSync(idxPath)) err("index", "index.json 不存在");
else {
  const idx = JSON.parse(fs.readFileSync(idxPath));
  const idxIds = new Set(idx.map((c) => c.id));
  for (const id of ids) if (!idxIds.has(id)) err("index", "缺少城市 " + id);
  for (const id of idxIds) if (!ids.includes(id)) err("index", "幽灵条目 " + id + "(无对应文件)");
}

console.log("校验 " + files.length + " 城:" + errors.length + " 错误 / " + warnings.length + " 警告\n");
for (const e of errors) console.log("  ✗ " + e);
for (const w of warnings) console.log("  ⚠ " + w);
if (!errors.length && !warnings.length) console.log("  全部通过 ✓");
process.exit(errors.length ? 1 : 0);
