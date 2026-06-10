// fetch-cities.mjs — 批量从 OSM / Overpass 拉取世界城市「地图骨架」,生成 Citydle 城市库。
// 数据干净:全部真实 OSM(路网 + 水系 + 海岸线),带 source + license + 拉取时间,
// 坐标精度截断到 5 位,零手工捏造。输出到 data/cities/,不触碰旧的 data/presets/。
//
// 数据格式要点:
// - 同名街道的多个 way 保存为独立 segments(绝不首尾拼接 → 不产生现实中不存在的连线)
// - 保留道路等级 tier:1=干道(motorway/trunk/primary) 2=次干(secondary/tertiary) 3=毛细(其余)
// - 几何裁切到 bbox 外扩 10%(线条延伸出画框,渲染时按声明 bbox 取景)
// - index.json 每次从磁盘上的全部城市文件重建,补拉单城不会丢其它城市的索引
//
// 用法: node fetch-cities.mjs              # 拉全部
//        node fetch-cities.mjs paris rome   # 只拉指定 id(补拉失败的)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "data", "cities");
fs.mkdirSync(OUT, { recursive: true });

// 中心点取各城最有辨识度的核心区,半径 km 控制 bbox。坐标为真实地标位置。
const CITIES = [
  { id: "new-york", cn: "纽约", en: "New York", c: [40.7074, -74.009], r: 1.6, feat: "下城网格+海岸" },
  { id: "london", cn: "伦敦", en: "London", c: [51.513, -0.09], r: 1.5, feat: "金融城+泰晤士河" },
  { id: "hong-kong", cn: "香港", en: "Hong Kong", c: [22.281, 114.158], r: 1.4, feat: "中环+维港" },
  { id: "singapore", cn: "新加坡", en: "Singapore", c: [1.283, 103.851], r: 1.5, feat: "滨海湾" },
  { id: "tokyo", cn: "东京", en: "Tokyo", c: [35.681, 139.767], r: 1.5, feat: "丸之内+皇居" },
  { id: "paris", cn: "巴黎", en: "Paris", c: [48.855, 2.345], r: 1.6, feat: "塞纳河+西岱岛+放射" },
  { id: "venice", cn: "威尼斯", en: "Venice", c: [45.438, 12.336], r: 1.3, feat: "运河迷宫" },
  { id: "barcelona", cn: "巴塞罗那", en: "Barcelona", c: [41.392, 2.165], r: 1.6, feat: "Eixample 网格" },
  { id: "washington-dc", cn: "华盛顿", en: "Washington DC", c: [38.895, -77.036], r: 1.8, feat: "放射+网格" },
  { id: "san-francisco", cn: "旧金山", en: "San Francisco", c: [37.793, -122.402], r: 1.5, feat: "海湾+网格" },
  { id: "chicago", cn: "芝加哥", en: "Chicago", c: [41.882, -87.629], r: 1.6, feat: "Loop 网格+湖滨" },
  { id: "amsterdam", cn: "阿姆斯特丹", en: "Amsterdam", c: [52.369, 4.895], r: 1.4, feat: "同心运河" },
  { id: "istanbul", cn: "伊斯坦布尔", en: "Istanbul", c: [41.018, 28.974], r: 1.8, feat: "金角湾+海峡" },
  { id: "rome", cn: "罗马", en: "Rome", c: [41.892, 12.482], r: 1.6, feat: "古城+台伯河" },
  { id: "sydney", cn: "悉尼", en: "Sydney", c: [-33.86, 151.208], r: 1.6, feat: "海港+环形码头" },
  { id: "moscow", cn: "莫斯科", en: "Moscow", c: [55.752, 37.617], r: 1.8, feat: "放射环线+红场" },
  { id: "beijing", cn: "北京", en: "Beijing", c: [39.908, 116.397], r: 1.8, feat: "棋盘+故宫" },
  { id: "shanghai", cn: "上海", en: "Shanghai", c: [31.236, 121.49], r: 1.6, feat: "外滩+黄浦江" },
  { id: "bangkok", cn: "曼谷", en: "Bangkok", c: [13.752, 100.493], r: 1.8, feat: "湄南河弯" },
  { id: "toronto", cn: "多伦多", en: "Toronto", c: [43.648, -79.381], r: 1.6, feat: "网格+安大略湖" },
  { id: "boston", cn: "波士顿", en: "Boston", c: [42.358, -71.058], r: 1.5, feat: "不规则老城+查尔斯河" },
  { id: "vienna", cn: "维也纳", en: "Vienna", c: [48.208, 16.373], r: 1.5, feat: "环城大道" },
  { id: "berlin", cn: "柏林", en: "Berlin", c: [52.516, 13.39], r: 1.7, feat: "施普雷河" },
  { id: "buenos-aires", cn: "布宜诺斯艾利斯", en: "Buenos Aires", c: [-34.603, -58.381], r: 1.6, feat: "网格" },
  { id: "vancouver", cn: "温哥华", en: "Vancouver", c: [49.283, -123.118], r: 1.6, feat: "半岛+网格" },
  { id: "lisbon", cn: "里斯本", en: "Lisbon", c: [38.711, -9.139], r: 1.5, feat: "丘陵+塔霍河" },
  { id: "kyoto", cn: "京都", en: "Kyoto", c: [35.011, 135.768], r: 1.6, feat: "古都棋盘" },
  { id: "rio-de-janeiro", cn: "里约热内卢", en: "Rio de Janeiro", c: [-22.906, -43.176], r: 1.6, feat: "海岸+山" },
  { id: "mumbai", cn: "孟买", en: "Mumbai", c: [18.927, 72.832], r: 1.5, feat: "半岛海岸" },
  { id: "cape-town", cn: "开普敦", en: "Cape Town", c: [-33.92, 18.423], r: 1.5, feat: "海岸+桌山" },
];

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const HW = "^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|road)(_link)?$";

// 道路等级 → 渲染层级。线索 1「主干道剪影」只画 tier 1,逐层加入 2、3。
const TIER = {
  motorway: 1, trunk: 1, primary: 1,
  secondary: 2, tertiary: 2,
  residential: 3, unclassified: 3, living_street: 3, pedestrian: 3, road: 3,
};
function tierOf(highway) {
  return TIER[highway.replace(/_link$/, "")] || 3;
}

// 几何裁切边界:bbox 外扩 10%,让线条自然延伸出画框而不是停在框内留豁口
const CLIP_MARGIN = 0.1;

function bboxOf(c, r) {
  const dLat = r / 111;
  const dLng = r / (111 * Math.cos((c[0] * Math.PI) / 180));
  return { south: c[0] - dLat, north: c[0] + dLat, west: c[1] - dLng, east: c[1] + dLng };
}
function expandBbox(b, margin) {
  const dLat = (b.north - b.south) * margin;
  const dLng = (b.east - b.west) * margin;
  return { south: b.south - dLat, north: b.north + dLat, west: b.west - dLng, east: b.east + dLng };
}
function buildQuery(b) {
  const bb = "(" + b.south + "," + b.west + "," + b.north + "," + b.east + ")";
  return (
    "[out:json][timeout:50];(" +
    'way["highway"~"' + HW + '"]["name"]' + bb + ";" +
    'way["natural"="coastline"]' + bb + ";" +
    'way["natural"="water"]' + bb + ";" +
    'way["waterway"~"^(river|canal)$"]' + bb + ";" +
    ");out tags geom;"
  );
}

// Overpass 的 bbox 选择会带回整条 way(可延伸到 bbox 外很远)。
// 按外扩 bbox 把一条 way 切成若干「框内连续段」:出入框处在真实线段上插值出
// 与裁切框的交点(交点仍在这条路的真实折线上),框外部分丢弃 →
// 几何严格有界、且每一段都是这条路真实连续的一截。
function clampToBox(pIn, pOut, box) {
  let t = 1;
  if (pOut.lat < box.south) t = Math.min(t, (box.south - pIn.lat) / (pOut.lat - pIn.lat));
  if (pOut.lat > box.north) t = Math.min(t, (box.north - pIn.lat) / (pOut.lat - pIn.lat));
  if (pOut.lng < box.west) t = Math.min(t, (box.west - pIn.lng) / (pOut.lng - pIn.lng));
  if (pOut.lng > box.east) t = Math.min(t, (box.east - pIn.lng) / (pOut.lng - pIn.lng));
  const lat = pIn.lat + t * (pOut.lat - pIn.lat);
  const lng = pIn.lng + t * (pOut.lng - pIn.lng);
  return [
    +Math.min(box.north, Math.max(box.south, lat)).toFixed(5),
    +Math.min(box.east, Math.max(box.west, lng)).toFixed(5),
  ];
}
function clipWay(geometry, clipBox) {
  const inside = (p) =>
    p.lat >= clipBox.south && p.lat <= clipBox.north && p.lng >= clipBox.west && p.lng <= clipBox.east;
  const pts = geometry.map((p) => ({ lat: +p.lat.toFixed(5), lng: +p.lon.toFixed(5) }));
  const segments = [];
  let cur = null;
  for (let i = 0; i < pts.length; i++) {
    if (inside(pts[i])) {
      if (!cur) {
        cur = [];
        if (i > 0) cur.push(clampToBox(pts[i], pts[i - 1], clipBox)); // 入框交点
      }
      cur.push([pts[i].lat, pts[i].lng]);
    } else if (cur) {
      cur.push(clampToBox(pts[i - 1], pts[i], clipBox)); // 出框交点
      if (cur.length >= 2) segments.push(cur);
      cur = null;
    }
  }
  if (cur && cur.length >= 2) segments.push(cur);
  return segments;
}

function segmentsKm(segments, cosLat) {
  let km = 0;
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i++) {
      const dLat = (seg[i][0] - seg[i - 1][0]) * 111;
      const dLng = (seg[i][1] - seg[i - 1][1]) * 111 * cosLat;
      km += Math.sqrt(dLat * dLat + dLng * dLng);
    }
  }
  return +km.toFixed(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function race(query) {
  const ctrls = MIRRORS.map(() => new AbortController());
  const ps = MIRRORS.map(async (url, i) => {
    const res = await fetch(url, {
      method: "POST",
      signal: ctrls[i].signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "citydle-datagen/0.1 (OSM map-skeleton game; github frank99-owl/citydle)",
      },
      body: "data=" + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error("HTTP " + res.status + " @" + url);
    const j = await res.json();
    if (!j.elements) throw new Error("no elements @" + url);
    ctrls.forEach((c, ci) => { if (ci !== i) c.abort(); });
    return j;
  });
  return Promise.any(ps);
}

function processCity(city, data) {
  const b = bboxOf(city.c, city.r);
  const clipBox = expandBbox(b, CLIP_MARGIN);
  const cosLat = Math.cos((city.c[0] * Math.PI) / 180);
  const streetsMap = new Map(); // name → { tier, segments }
  const water = [], coastline = [];
  for (const el of data.elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    const segs = clipWay(el.geometry, clipBox);
    if (!segs.length) continue;
    const t = el.tags || {};
    if (t.highway && t.name) {
      const tier = tierOf(t.highway);
      const cur = streetsMap.get(t.name);
      if (!cur) streetsMap.set(t.name, { tier, segments: segs });
      else {
        cur.tier = Math.min(cur.tier, tier);
        cur.segments.push(...segs);
      }
    } else if (t.natural === "coastline") coastline.push(...segs);
    else if (t.natural === "water" || t.waterway) water.push(...segs);
  }
  const streets = [...streetsMap.entries()]
    .map(([name, s]) => ({ name, tier: s.tier, km: segmentsKm(s.segments, cosLat), segments: s.segments }))
    .sort((a, z) => a.tier - z.tier || z.km - a.km);
  const tiers = { t1: 0, t2: 0, t3: 0 };
  for (const s of streets) tiers["t" + s.tier]++;
  return {
    id: city.id, cn: city.cn, en: city.en, feature: city.feat,
    center: city.c, radiusKm: city.r, bbox: b,
    source: "overpass / OpenStreetMap", license: "ODbL", fetchedAt: new Date().toISOString(),
    counts: { streets: streets.length, water: water.length, coastline: coastline.length, tiers },
    streets, water, coastline,
  };
}

// index.json 永远从磁盘上的全部城市文件重建,而不是只用本次运行成功的列表
function rebuildIndex() {
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".json") && f !== "index.json");
  const index = files
    .map((f) => {
      const d = JSON.parse(fs.readFileSync(path.join(OUT, f)));
      return { id: d.id, cn: d.cn, en: d.en, feature: d.feature, counts: d.counts };
    })
    .sort((a, z) => a.id.localeCompare(z.id));
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 2));
  return index.length;
}

async function run() {
  const only = process.argv.slice(2);
  const list = only.length ? CITIES.filter((c) => only.includes(c.id)) : CITIES;
  const ok = [], fail = [];
  console.log("开始拉取 " + list.length + " 座城市(真实 OSM 数据)...\n");
  for (const city of list) {
    process.stdout.write("· " + city.id.padEnd(16) + " ");
    try {
      let data;
      try {
        data = await race(buildQuery(bboxOf(city.c, city.r)));
      } catch {
        await sleep(10000); // 全镜像被拒多为瞬时限流,退避后重试一次
        data = await race(buildQuery(bboxOf(city.c, city.r)));
      }
      const out = processCity(city, data);
      fs.writeFileSync(path.join(OUT, city.id + ".json"), JSON.stringify(out));
      const c = out.counts;
      console.log(
        "✓ 街道 " + String(c.streets).padStart(4) +
        " (干" + c.tiers.t1 + "/次" + c.tiers.t2 + "/毛" + c.tiers.t3 + ")" +
        " · 水系 " + String(c.water).padStart(3) + " · 海岸 " + c.coastline
      );
      ok.push(city.id);
    } catch (e) {
      console.log("✗ 失败: " + ((e && e.message) || e));
      fail.push(city.id);
    }
    await sleep(2000);
  }
  const total = rebuildIndex();
  console.log("\n完成: " + ok.length + " 成功 / " + fail.length + " 失败" + (fail.length ? " (失败: " + fail.join(", ") + ")" : ""));
  console.log("index.json 含 " + total + " 城 · 输出: " + OUT);
}
run();
