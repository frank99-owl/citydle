// make-prototype.mjs — 每日街图可玩单局交互原型生成器(Citydle 新玩法)。
// 读取 data/cities/*.json(30 城真实 OSM 数据),生成「刚好一屏、不滚动」的可玩 demo。
// 玩法:6 层真实线索递进 + 6 选 1。线索全部来自真实数据,没有的就不出现:
//   1 干道剪影 → 2 +水系海岸 → 3 +次干路网 → 4 +完整路网 → 5 +一条街名 → 6 +国家首字母
// (CONCEPT 里的「地标」线索暂缺 POI 数据,等管线补拉后再加,不编造。)
// 运行: node make-prototype.mjs  →  打开 prototype/index.html(data.js 同目录)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const citiesDir = path.join(__dirname, "data", "cities");
const outDir = path.join(__dirname, "prototype");
fs.mkdirSync(outDir, { recursive: true });

// 展示用元数据(国家是事实性信息,不属于几何数据;待管线拉 POI 时一并迁入城市 JSON)
const COUNTRY = {
  "new-york": "美国 USA", "london": "英国 UK", "hong-kong": "中国 China", "singapore": "新加坡 Singapore",
  "tokyo": "日本 Japan", "paris": "法国 France", "venice": "意大利 Italy", "barcelona": "西班牙 Spain",
  "washington-dc": "美国 USA", "san-francisco": "美国 USA", "chicago": "美国 USA", "amsterdam": "荷兰 Netherlands",
  "istanbul": "土耳其 Türkiye", "rome": "意大利 Italy", "sydney": "澳大利亚 Australia", "moscow": "俄罗斯 Russia",
  "beijing": "中国 China", "shanghai": "中国 China", "bangkok": "泰国 Thailand", "toronto": "加拿大 Canada",
  "boston": "美国 USA", "vienna": "奥地利 Austria", "berlin": "德国 Germany", "buenos-aires": "阿根廷 Argentina",
  "vancouver": "加拿大 Canada", "lisbon": "葡萄牙 Portugal", "kyoto": "日本 Japan",
  "rio-de-janeiro": "巴西 Brazil", "mumbai": "印度 India", "cape-town": "南非 South Africa",
};

const files = fs.readdirSync(citiesDir).filter((f) => f.endsWith(".json") && f !== "index.json");
const cities = {};
const index = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(citiesDir, f), "utf8"));
  const byTier = { 1: [], 2: [], 3: [] };
  for (const s of d.streets) for (const seg of s.segments) byTier[s.tier].push(seg);
  // 无干道的城市(如威尼斯全是步行巷):用最长的真实街道当骨架层,只是选取、不编造
  if (!byTier[1].length) {
    const n = Math.max(8, Math.round(d.streets.length * 0.04));
    const top = [...d.streets].sort((a, b) => b.km - a.km).slice(0, n);
    byTier[1] = top.flatMap((s) => s.segments);
  }
  // 线索 5 的街名:最长的干道(streets 已按 tier 升序、km 降序排好)
  const ns = d.streets[0];
  let nameStreet = null;
  if (ns) {
    const longest = [...ns.segments].sort((a, b) => b.length - a.length)[0];
    nameStreet = { name: ns.name, at: longest[Math.floor(longest.length / 2)] };
  }
  cities[d.id] = {
    bbox: d.bbox,
    t1: byTier[1], t2: byTier[2], t3: byTier[3],
    water: d.water, coast: d.coastline,
    nameStreet,
    country: COUNTRY[d.id] || "",
    initial: d.en[0],
  };
  index.push({ id: d.id, cn: d.cn, en: d.en });
}
index.sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(
  path.join(outDir, "data.js"),
  "window.CITYDLE = " + JSON.stringify({ cities, index }) + ";"
);

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>每日街图</title>
<style>
  :root{ color-scheme: dark; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html,body{ height:100%; }
  body{ font-family:'Georgia','Songti SC',serif; background:radial-gradient(circle at 30% -8%, #241a10, #0c0805 72%); color:#d8c5a0; overflow:hidden; }
  .app{ height:100vh; width:100%; max-width:540px; margin:0 auto; display:flex; flex-direction:column; padding:14px 16px 14px; }
  header{ flex:0 0 auto; display:flex; align-items:baseline; justify-content:space-between; }
  .brand{ font-size:19px; color:#e6c178; letter-spacing:1px; }
  .step{ font-size:13px; color:#a8946f; }
  #board{ flex:1 1 auto; position:relative; min-height:0; margin:10px 0 8px; border:1px solid #392c1b; border-radius:12px; overflow:hidden; background:#14100c; }
  #board canvas{ display:block; }
  .clue{ flex:0 0 auto; text-align:center; font-size:13px; color:#b89a63; min-height:18px; }
  .blocks{ flex:0 0 auto; text-align:center; font-size:16px; letter-spacing:2px; margin:6px 0 8px; }
  .choices{ flex:0 0 auto; display:grid; grid-template-columns:1fr 1fr; gap:7px; }
  .choices button{ background:#1c150d; color:#e2cda0; border:1px solid #4a3c26; border-radius:8px; padding:9px 8px; font-size:13px; font-family:inherit; cursor:pointer; text-align:center; line-height:1.3; }
  .choices button:hover{ border-color:#9a7d4e; }
  .choices button.wrong{ color:#6b4a3a; border-color:#5a3526; text-decoration:line-through; cursor:default; }
  .choices button:disabled{ cursor:default; }
  .choices button.wrong:hover, .choices button:disabled:hover{ border-color:#4a3c26; }
  .choices button.wrong:hover{ border-color:#5a3526; }
  .skip{ flex:0 0 auto; text-align:center; margin-top:8px; }
  .skip a{ color:#7e6c4c; font-size:12px; cursor:pointer; text-decoration:underline; }
  .overlay{ position:absolute; inset:0; background:rgba(8,5,3,.86); display:none; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; }
  .overlay.on{ display:flex; }
  .ovh{ font-size:22px; color:#e6c178; margin-bottom:6px; }
  .ova{ font-size:14px; color:#b6a37c; margin-bottom:14px; }
  .ovb{ font-size:24px; letter-spacing:3px; margin-bottom:18px; }
  .ovrow{ display:flex; gap:10px; }
  .ovrow button{ background:#b8862f; color:#1a1206; border:none; border-radius:8px; padding:10px 18px; font-size:15px; font-weight:700; font-family:inherit; cursor:pointer; }
  .ovrow button.ghost{ background:transparent; color:#9a8762; border:1px solid #4a3c26; font-weight:400; }
  textarea.copybuf{ position:absolute; left:-9999px; top:0; }
</style>
</head>
<body>
<div class="app">
  <header>
    <span class="brand">每日街图</span>
    <span class="step" id="step"></span>
  </header>
  <div id="board">
    <canvas id="cv"></canvas>
    <div class="overlay" id="ov">
      <div class="ovh" id="ovh"></div>
      <div class="ova" id="ova"></div>
      <div class="ovb" id="ovb"></div>
      <div class="ovrow">
        <button id="copy">复制成绩</button>
        <button class="ghost" id="again">换一题</button>
      </div>
    </div>
  </div>
  <div class="clue" id="clue"></div>
  <div class="blocks" id="blocks"></div>
  <div class="choices" id="choices"></div>
  <div class="skip"><a id="skip">不确定 · 看下一条线索 →</a></div>
  <textarea class="copybuf" id="copybuf"></textarea>
</div>
<script src="data.js"></script>
<script>
const CITIES = window.CITYDLE.cities, INDEX = window.CITYDLE.index;
const CLUE = ['干道剪影','+ 水系与海岸','+ 次干路网','+ 完整路网纹理','+ 一条街名','+ 国家与首字母'];
const C = { bg:'#14100c', faint:'rgba(94,79,55,0.75)', mid:'rgba(154,125,78,0.9)', bright:'#e6c178', glow:'#f4dca0', water:'rgba(74,144,194,0.55)', coast:'rgba(63,182,168,0.85)' };
const MAX = 6, WRONG_MAX = 5;

let answerId, candidates, level, done, won, wrongs;
const PNO = Math.floor(Date.now()/864e5) - 20000;

function projector(bbox, W, H, pad){
  const cl = Math.cos((bbox.south+bbox.north)/2*Math.PI/180);
  const x0 = bbox.west*cl, rx = (bbox.east*cl-x0)||1e-6, ry = (bbox.north-bbox.south)||1e-6;
  const s = Math.min((W-2*pad)/rx,(H-2*pad)/ry);
  const ox = (W-rx*s)/2, oy = (H-ry*s)/2;
  return function(lat,lng){ return [ (lng*cl-x0)*s+ox, (bbox.north-lat)*s+oy ]; };
}
function strokeSegs(ctx, proj, segs, color, w){
  ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineCap='round'; ctx.lineJoin='round';
  for(const seg of segs){
    ctx.beginPath();
    for(let i=0;i<seg.length;i++){ const pt=proj(seg[i][0],seg[i][1]); if(i===0)ctx.moveTo(pt[0],pt[1]); else ctx.lineTo(pt[0],pt[1]); }
    ctx.stroke();
  }
}
function draw(){
  const board=document.getElementById('board'), cv=document.getElementById('cv');
  const W=board.clientWidth, H=board.clientHeight;
  const dpr=window.devicePixelRatio||1;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
  const city=CITIES[answerId], proj=projector(city.bbox,W,H,14);
  const lv=Math.min(level,MAX);

  if(lv>=2){ strokeSegs(ctx,proj,city.water,C.water,1.4); strokeSegs(ctx,proj,city.coast,C.coast,1.6); }
  if(lv>=4) strokeSegs(ctx,proj,city.t3,C.faint,0.6);
  if(lv>=3) strokeSegs(ctx,proj,city.t2,C.mid,1.0);
  strokeSegs(ctx,proj,city.t1,C.bright,1.8);
  if(lv>=5 && city.nameStreet){
    const p=proj(city.nameStreet.at[0],city.nameStreet.at[1]);
    ctx.font='600 13px Georgia,serif'; ctx.textAlign='center'; ctx.lineWidth=3;
    ctx.strokeStyle='rgba(0,0,0,0.75)'; ctx.strokeText(city.nameStreet.name,p[0],p[1]-8);
    ctx.fillStyle=C.glow; ctx.fillText(city.nameStreet.name,p[0],p[1]-8);
  }
  if(lv>=6){
    ctx.font='600 14px Georgia,serif'; ctx.textAlign='center';
    const txt='提示:'+city.country+' · 首字母 '+city.initial;
    ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.strokeText(txt,W/2,26);
    ctx.fillStyle=C.glow; ctx.fillText(txt,W/2,26);
  }
}
function liveBlocks(){ let s=''; for(let i=1;i<=MAX;i++) s+=(i<level?'🟥':'⬜'); return s; }
function resultBlocks(){ let s=''; for(let i=1;i<=MAX;i++){ if(!won) s+='🟥'; else s+=(i<level?'🟥':(i===level?'🟩':'⬜')); } return s; }

function refresh(){
  document.getElementById('step').textContent='线索 '+Math.min(level,MAX)+' / '+MAX;
  document.getElementById('clue').textContent=CLUE[Math.min(level,MAX)-1];
  document.getElementById('blocks').textContent=done?resultBlocks():liveBlocks();
  draw();
}
function endGame(){
  done=true;
  for(const b of document.querySelectorAll('.choices button')) b.disabled=true;
  const city=CITIES[answerId], meta=INDEX.find(function(c){return c.id===answerId;});
  document.getElementById('ov').classList.add('on');
  document.getElementById('ovh').textContent = won ? ('猜中了!'+level+' / '+MAX) : '没猜中';
  document.getElementById('ova').textContent = '答案:'+meta.cn+' '+meta.en+(city.country?' · '+city.country:'');
  document.getElementById('ovb').textContent = resultBlocks();
  refresh();
}
function pick(id, btn){
  if(done||btn.classList.contains('wrong')) return;
  if(id===answerId){ won=true; endGame(); return; }
  btn.classList.add('wrong');
  wrongs++; level++;
  if(wrongs>=WRONG_MAX||level>MAX){ won=false; level=Math.min(level,MAX+1); endGame(); return; }
  refresh();
}
function skip(){
  if(done) return;
  level++;
  if(level>MAX){ won=false; endGame(); return; }
  refresh();
}
function renderChoices(){
  const box=document.getElementById('choices'); box.innerHTML='';
  for(const c of candidates){
    const b=document.createElement('button');
    b.textContent=c.cn+' '+c.en;
    b.onclick=function(){ pick(c.id,b); };
    box.appendChild(b);
  }
}
function newGame(){
  answerId=INDEX[Math.floor(Math.random()*INDEX.length)].id;
  const others=INDEX.filter(function(c){return c.id!==answerId;});
  for(let i=others.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=others[i];others[i]=others[j];others[j]=t; }
  candidates=others.slice(0,5).concat(INDEX.find(function(c){return c.id===answerId;}));
  for(let i=candidates.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=candidates[i];candidates[i]=candidates[j];candidates[j]=t; }
  level=1; done=false; won=false; wrongs=0;
  document.getElementById('ov').classList.remove('on');
  renderChoices();
  refresh();
}
function copy(){
  const share='每日街图 #'+PNO+'  '+(won?level:'X')+'/'+MAX+'\\n'+resultBlocks()+'\\n'+location.href;
  const ta=document.getElementById('copybuf'); ta.value=share; ta.select();
  let ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
  if(navigator.clipboard){ navigator.clipboard.writeText(share).catch(function(){}); ok=true; }
  document.getElementById('copy').textContent= ok ? '已复制 ✓' : 'Cmd+C 复制';
}

document.getElementById('skip').onclick=skip;
document.getElementById('again').onclick=newGame;
document.getElementById('copy').onclick=copy;
let rt; window.addEventListener('resize',function(){ clearTimeout(rt); rt=setTimeout(function(){ if(answerId) draw(); },120); });
requestAnimationFrame(function(){ newGame(); });
</script>
</body>
</html>`;

const outFile = path.join(outDir, "index.html");
fs.writeFileSync(outFile, html);
const dataKb = fs.statSync(path.join(outDir, "data.js")).size / 1024;
console.log("✓ 生成可玩 demo: " + outFile + " (" + index.length + " 城 · data.js " + (dataKb / 1024).toFixed(1) + " MB)");
