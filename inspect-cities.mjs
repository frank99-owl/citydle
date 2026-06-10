// inspect-cities.mjs — 把 data/cities 全部城市渲成一张总览图,肉眼抽查数据质量。
// 干道=亮金 / 次干=暖褐 / 毛细=暗褐 / 水系=蓝 / 海岸线=青。运行后打开 prototype/inspect.html。
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "data", "cities");
const OUT = path.join(__dirname, "prototype");
fs.mkdirSync(OUT, { recursive: true });

function ds(g, max) {
  if (g.length <= max) return g;
  const step = g.length / max, o = [];
  for (let i = 0; i < max; i++) o.push(g[Math.floor(i * step)]);
  o.push(g[g.length - 1]);
  return o;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "index.json");
const cities = files
  .map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(DIR, f)));
    const byTier = { 1: [], 2: [], 3: [] };
    for (const s of d.streets) for (const seg of s.segments) byTier[s.tier].push(ds(seg, 30));
    return {
      cn: d.cn, en: d.en, feat: d.feature, counts: d.counts, bbox: d.bbox,
      t1: byTier[1], t2: byTier[2], t3: byTier[3],
      water: (d.water || []).map((w) => ds(w, 30)),
      coast: (d.coastline || []).map((c) => ds(c, 40)),
    };
  })
  .sort((a, b) => a.en.localeCompare(b.en));

const DATA = JSON.stringify(cities);

const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Citydle 城市库抽查</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Georgia','Songti SC',serif;background:#0d0905;color:#d8c5a0;padding:24px}
  h1{color:#e6c178;font-size:20px;margin-bottom:4px}
  .sub{color:#9a8762;font-size:13px;margin-bottom:18px}
  .legend{color:#9a8762;font-size:12px;margin-bottom:18px}
  .legend b{padding:1px 6px;border-radius:3px}
  .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
  .card{background:#120d08;border:1px solid #392c1b;border-radius:8px;padding:8px}
  canvas{display:block;width:100%;border-radius:4px;background:#14100c}
  .nm{color:#e6c178;font-size:12px;font-weight:700;margin-top:7px}
  .ct{color:#7e6c4c;font-size:11px;margin-top:2px}
  @media(max-width:900px){.grid{grid-template-columns:repeat(3,1fr)}}
</style></head>
<body>
<h1>Citydle 城市库抽查 · 真实 OSM 数据</h1>
<div class="sub">取景按城市声明 bbox(与游戏渲染一致)。看每座城形状是否真实可辨、干道层是否成形、水系海岸位置是否正确。</div>
<div class="legend"><b style="color:#e6c178">━ 干道</b>　<b style="color:#9a7d4e">━ 次干</b>　<b style="color:#5e4f37">━ 毛细</b>　<b style="color:#4a90c2">━ 水系</b>　<b style="color:#3fb6a8">━ 海岸线</b></div>
<div class="grid" id="grid"></div>
<script>
const CITIES = ${DATA};
function proj(bbox, W, H, pad){
  const cl=Math.cos((bbox.south+bbox.north)/2*Math.PI/180);
  const x0=bbox.west*cl, rx=(bbox.east*cl-x0)||1e-6, ry=(bbox.north-bbox.south)||1e-6;
  const s=Math.min((W-2*pad)/rx,(H-2*pad)/ry), ox=(W-rx*s)/2, oy=(H-ry*s)/2;
  return function(lat,lng){ return [ (lng*cl-x0)*s+ox, (bbox.north-lat)*s+oy ]; };
}
function line(ctx,pj,g,color,w){ ctx.beginPath(); for(let i=0;i<g.length;i++){ const p=pj(g[i][0],g[i][1]); if(i===0)ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); } ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineCap='round'; ctx.stroke(); }
function draw(cv, city){
  const W=cv.parentElement.clientWidth-16, H=Math.round(W*0.8);
  const dpr=window.devicePixelRatio||1; cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#14100c'; ctx.fillRect(0,0,W,H);
  const pj=proj(city.bbox,W,H,6);
  for(const w of city.water) line(ctx,pj,w,'rgba(74,144,194,0.5)',1.3);
  for(const c of city.coast) line(ctx,pj,c,'rgba(63,182,168,0.8)',1.5);
  for(const s of city.t3) line(ctx,pj,s,'rgba(94,79,55,0.7)',0.5);
  for(const s of city.t2) line(ctx,pj,s,'rgba(154,125,78,0.85)',0.8);
  for(const s of city.t1) line(ctx,pj,s,'rgba(230,193,120,0.95)',1.4);
}
const grid=document.getElementById('grid');
CITIES.forEach(function(city){
  const card=document.createElement('div'); card.className='card';
  const cv=document.createElement('canvas');
  const nm=document.createElement('div'); nm.className='nm'; nm.textContent=city.cn+' '+city.en;
  const t=city.counts.tiers||{};
  const ct=document.createElement('div'); ct.className='ct'; ct.textContent='街 '+city.counts.streets+' (干'+(t.t1||0)+'/次'+(t.t2||0)+'/毛'+(t.t3||0)+') · 水 '+city.counts.water+' · 岸 '+city.counts.coastline+' · '+city.feat;
  card.appendChild(cv); card.appendChild(nm); card.appendChild(ct); grid.appendChild(card);
  requestAnimationFrame(function(){ draw(cv, city); });
});
</script></body></html>`;

fs.writeFileSync(path.join(OUT, "inspect.html"), html);
console.log("✓ 生成 " + path.join(OUT, "inspect.html") + " (" + (Buffer.byteLength(html) / 1024 / 1024).toFixed(1) + " MB)");
